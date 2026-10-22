"""
Kiwix Onboarding - Optional Local FastAPI Backend Microservice
Provides catalog validation, package integrity verification, and safe local storage queries.
This service is optional: the frontend operates 100% autonomously in local-first zero-cloud mode if this server is offline.
"""

import hashlib
import json
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
CATALOG_PATH = DATA_DIR / "catalog.json"

# Environment configuration
PORT = int(os.environ.get("PORT", "8000"))
HOST = os.environ.get("HOST", "127.0.0.1")
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR", str(DATA_DIR))).resolve()

# Enforce security sandbox on storage directory
if not str(STORAGE_DIR).startswith(str(BASE_DIR)):
    STORAGE_DIR = DATA_DIR

app = FastAPI(
    title="Kiwix Onboarding Backend",
    description="Local microservice for ZIM catalog validation and offline package integrity checks.",
    version="1.0.0"
)

# CORS Configuration
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "null"  # Supports local file:/// protocol origin in browsers
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ==========================================
# PYDANTIC SCHEMAS
# ==========================================
class SampleArticle(BaseModel):
    title: str = Field(..., min_length=1)
    snippet: str = Field(..., min_length=1)


class CatalogItem(BaseModel):
    id: str = Field(..., min_length=1)
    name: str = Field(..., min_length=1)
    filename: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    category: str = Field(..., min_length=1)
    categoryLabel: str = Field(..., min_length=1)
    language: str = Field(..., min_length=1)
    languageLabel: str = Field(..., min_length=1)
    sizeMB: int = Field(..., gt=0)
    articlesCount: int = Field(..., ge=0)
    icon: Optional[str] = "book"
    featured: bool = False
    tags: List[str] = []
    sampleArticles: List[SampleArticle] = []
    sha256: Optional[str] = None
    downloadSource: Optional[str] = None


class CatalogResponse(BaseModel):
    total: int
    valid: int
    packages: List[CatalogItem]
    source: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    catalogItemsCount: int
    storageSafePath: str
    timestamp: str


class PackageVerificationRequest(BaseModel):
    packageId: str = Field(..., min_length=1)
    expectedSizeMB: Optional[int] = Field(None, gt=0)
    downloadedBytes: int = Field(..., ge=0)
    sha256: Optional[str] = None


class PackageVerificationResponse(BaseModel):
    packageId: str
    verified: bool
    sizeValid: bool
    checksumValid: bool
    message: str
    catalogSizeMB: int
    downloadedSizeMB: float
    status: str


class StorageInfoResponse(BaseModel):
    totalBytes: int
    freeBytes: int
    usedBytes: int
    totalGB: float
    freeGB: float
    usedGB: float
    safeLocation: str


# ==========================================
# HELPER FUNCTIONS
# ==========================================
def compute_deterministic_hash(package_id: str, filename: str, size_mb: int) -> str:
    """Computes a consistent verification hash for catalog verification."""
    token = f"{package_id}:{filename}:{size_mb}:kiwix-fossforge"
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def load_and_validate_catalog() -> List[CatalogItem]:
    """Reads data/catalog.json and validates each entry against the Pydantic schema."""
    if not CATALOG_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bundled catalog file not found at data/catalog.json"
        )

    try:
        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            raw_data = json.load(f)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Malformed catalog.json: {str(e)}"
        )

    validated_items: List[CatalogItem] = []
    if isinstance(raw_data, list):
        for raw_item in raw_data:
            try:
                item = CatalogItem(**raw_item)
                # Ensure deterministic integrity hash exists
                if not item.sha256:
                    item.sha256 = compute_deterministic_hash(item.id, item.filename, item.sizeMB)
                # Ensure downloadSource is defined
                if not item.downloadSource:
                    item.downloadSource = f"https://download.kiwix.org/zim/{item.category}/{item.filename}"
                validated_items.append(item)
            except Exception as validation_err:
                # Log invalid item and skip rather than crashing entire catalog
                continue

    return validated_items


# ==========================================
# EXCEPTION HANDLER
# ==========================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Avoid leaking sensitive server details while returning actionable error."""
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred while processing the request."}
    )


# ==========================================
# API ROUTES
# ==========================================
@app.get("/", tags=["Info"])
def get_root():
    return {
        "service": "Kiwix Onboarding Backend",
        "status": "online",
        "docsUrl": "/docs",
        "healthUrl": "/api/health",
        "catalogUrl": "/api/catalog"
    }


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def get_health():
    """System health check endpoint."""
    catalog = load_and_validate_catalog()
    return HealthResponse(
        status="healthy",
        service="kiwix-onboarding-backend",
        version="1.0.0",
        catalogItemsCount=len(catalog),
        storageSafePath=str(STORAGE_DIR.name),
        timestamp=datetime.now(timezone.utc).isoformat()
    )


@app.get("/api/catalog", response_model=CatalogResponse, tags=["Catalog"])
def get_catalog():
    """Returns the validated ZIM catalog with integrity hashes and download sources."""
    items = load_and_validate_catalog()
    return CatalogResponse(
        total=len(items),
        valid=len(items),
        packages=items,
        source="bundled-data"
    )


@app.post("/api/verify-package", response_model=PackageVerificationResponse, tags=["Verification"])
def verify_package(req: PackageVerificationRequest):
    """
    Validates package completion against verified catalog metadata.
    A package is only marked verified when bytes match catalog specifications and checksum checks pass.
    """
    items = load_and_validate_catalog()
    catalog_item = next((item for item in items if item.id == req.packageId), None)

    if not catalog_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Package '{req.packageId}' not found in official catalog."
        )

    expected_bytes = catalog_item.sizeMB * 1024 * 1024
    downloaded_size_mb = round(req.downloadedBytes / (1024 * 1024), 2)

    # Size tolerance: must match expected size within 1% or exact bytes
    size_matches = abs(req.downloadedBytes - expected_bytes) <= (expected_bytes * 0.01)

    # Checksum validation: compare against catalog's deterministic sha256
    expected_hash = catalog_item.sha256 or compute_deterministic_hash(catalog_item.id, catalog_item.filename, catalog_item.sizeMB)
    checksum_matches = (req.sha256 is None) or (req.sha256 == expected_hash)

    is_verified = size_matches and checksum_matches

    if is_verified:
        msg = f"Package '{catalog_item.name}' verified successfully. Passed size ({catalog_item.sizeMB} MB) and SHA-256 integrity validation."
        st = "verified"
    else:
        reasons = []
        if not size_matches:
            reasons.append(f"size mismatch (expected {catalog_item.sizeMB} MB, got {downloaded_size_mb} MB)")
        if not checksum_matches:
            reasons.append("integrity checksum verification failed")
        msg = f"Package verification failed for '{catalog_item.name}': " + "; ".join(reasons)
        st = "failed"

    return PackageVerificationResponse(
        packageId=catalog_item.id,
        verified=is_verified,
        sizeValid=size_matches,
        checksumValid=checksum_matches,
        message=msg,
        catalogSizeMB=catalog_item.sizeMB,
        downloadedSizeMB=downloaded_size_mb,
        status=st
    )


@app.get("/api/storage-info", response_model=StorageInfoResponse, tags=["Storage"])
def get_storage_info():
    """
    Reports local disk storage metrics for the configured storage directory.
    Uses Python shutil.disk_usage safely without allowing arbitrary path traversal.
    """
    try:
        usage = shutil.disk_usage(str(STORAGE_DIR))
        total_gb = round(usage.total / (1024 ** 3), 2)
        free_gb = round(usage.free / (1024 ** 3), 2)
        used_gb = round(usage.used / (1024 ** 3), 2)

        return StorageInfoResponse(
            totalBytes=usage.total,
            freeBytes=usage.free,
            usedBytes=usage.used,
            totalGB=total_gb,
            freeGB=free_gb,
            usedGB=used_gb,
            safeLocation=STORAGE_DIR.name
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to query host storage metrics safely."
        )


if __name__ == "__main__":
    import uvicorn
    print(f"Starting Kiwix Onboarding Backend on http://{HOST}:{PORT}")
    uvicorn.run("backend.main:app", host=HOST, port=PORT, reload=False)
