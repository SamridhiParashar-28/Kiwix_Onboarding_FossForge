"""
Unit and Integration Tests for Kiwix Onboarding Backend Service
Tests health endpoints, catalog validation, verification logic, and safety boundaries.
"""

import unittest
from starlette.testclient import TestClient
from backend.main import app, compute_deterministic_hash


class TestBackendAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_root_endpoint(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("docsUrl", data)

    def test_health_endpoint(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "kiwix-onboarding-backend")
        self.assertGreater(data["catalogItemsCount"], 0)
        self.assertIn("timestamp", data)

    def test_catalog_endpoint(self):
        response = self.client.get("/api/catalog")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("packages", data)
        self.assertEqual(data["total"], len(data["packages"]))
        self.assertGreaterEqual(data["total"], 18)

        # Validate structure of first package
        pkg = data["packages"][0]
        self.assertIn("id", pkg)
        self.assertIn("name", pkg)
        self.assertIn("filename", pkg)
        self.assertIn("sizeMB", pkg)
        self.assertGreater(pkg["sizeMB"], 0)
        self.assertIn("sha256", pkg)
        self.assertIn("downloadSource", pkg)
        self.assertTrue(pkg["downloadSource"].startswith("https://"))

    def test_package_verification_success(self):
        # Fetch actual package from catalog
        cat_res = self.client.get("/api/catalog")
        pkg = cat_res.json()["packages"][0]

        expected_bytes = pkg["sizeMB"] * 1024 * 1024
        verify_payload = {
            "packageId": pkg["id"],
            "expectedSizeMB": pkg["sizeMB"],
            "downloadedBytes": expected_bytes,
            "sha256": pkg["sha256"]
        }

        response = self.client.post("/api/verify-package", json=verify_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["verified"])
        self.assertTrue(data["sizeValid"])
        self.assertTrue(data["checksumValid"])
        self.assertEqual(data["status"], "verified")

    def test_package_verification_size_mismatch(self):
        cat_res = self.client.get("/api/catalog")
        pkg = cat_res.json()["packages"][0]

        # Provide truncated downloaded bytes
        truncated_bytes = 500 * 1024  # only 500 KB
        verify_payload = {
            "packageId": pkg["id"],
            "expectedSizeMB": pkg["sizeMB"],
            "downloadedBytes": truncated_bytes
        }

        response = self.client.post("/api/verify-package", json=verify_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["verified"])
        self.assertFalse(data["sizeValid"])
        self.assertEqual(data["status"], "failed")

    def test_package_verification_checksum_mismatch(self):
        cat_res = self.client.get("/api/catalog")
        pkg = cat_res.json()["packages"][0]

        expected_bytes = pkg["sizeMB"] * 1024 * 1024
        verify_payload = {
            "packageId": pkg["id"],
            "expectedSizeMB": pkg["sizeMB"],
            "downloadedBytes": expected_bytes,
            "sha256": "bad_checksum_hash_value_123456"
        }

        response = self.client.post("/api/verify-package", json=verify_payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["verified"])
        self.assertFalse(data["checksumValid"])
        self.assertEqual(data["status"], "failed")

    def test_package_verification_not_found(self):
        verify_payload = {
            "packageId": "non-existent-zim-id-9999",
            "downloadedBytes": 1000
        }
        response = self.client.post("/api/verify-package", json=verify_payload)
        self.assertEqual(response.status_code, 404)

    def test_storage_info_endpoint(self):
        response = self.client.get("/api/storage-info")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("totalBytes", data)
        self.assertIn("freeBytes", data)
        self.assertIn("usedBytes", data)
        self.assertGreater(data["totalBytes"], 0)
        self.assertGreater(data["freeBytes"], 0)
        self.assertIn("safeLocation", data)
        # Verify no path traversal leak in safeLocation
        self.assertNotIn("\\", data["safeLocation"])
        self.assertNotIn("/", data["safeLocation"])

    def test_cors_headers(self):
        response = self.client.get("/api/health", headers={"Origin": "http://localhost:3000"})
        self.assertEqual(response.status_code, 200)
        self.assertIn("access-control-allow-origin", response.headers)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:3000")


if __name__ == "__main__":
    unittest.main()
