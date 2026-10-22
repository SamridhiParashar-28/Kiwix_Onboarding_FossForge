# Kiwix Onboarding: Zero-to-Knowledge First-Run Experience

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Track](https://img.shields.io/badge/FOSS%20Forge%202.0-Build%20with%20Kiwix-0052cc)](https://github.com/)
[![Kiwix](https://img.shields.io/badge/Kiwix-Offline%20Knowledge-15803d)](https://kiwix.org)
[![Status](https://img.shields.io/badge/Status-Functional%20Prototype-darkgreen)]()
[![Stack](https://img.shields.io/badge/Stack-HTML5%20%2F%20Tailwind%20%2F%20Vanilla%20JS-38bdf8)]()

> A lightweight, zero-cloud first-run experience that transitions users from an empty Kiwix installation to curated, verified offline knowledge in minutes. Built for speed and simplicity during the 20-hour FOSS Forge 2.0 hackathon.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start & Running Locally](#quick-start--running-locally)
- [Optional FastAPI Backend Service](#optional-fastapi-backend-service)
- [Testing & Verification](#testing--verification)
- [Documentation & Guides](#documentation--guides)
  - [User & Developer Guide](docs/USER_AND_DEVELOPER_GUIDE.md)
  - [Project Status Report & Future Roadmap](docs/PROJECT_REPORT.md)
  - [Implementation History Log](docs/IMPLEMENTATION_HISTORY.md)
- [Team](#team)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## Problem Statement

When users first install Kiwix, they encounter an empty library coupled with an overwhelming catalog of tens of thousands of ZIM archives spanning hundreds of gigabytes. Without context or curation, users face severe decision paralysis, uncertain bandwidth and storage demands, and high cognitive load. Consequently, users frequently abandon the setup before completing their first download—leaving them without the offline knowledge Kiwix is built to deliver.

---

## Solution Overview

**Kiwix Onboarding** replaces the vacant starting state with an intelligent, self-contained first-run pipeline. Operating entirely client-side without runtime cloud dependencies, it:

1. **Profiles User Needs**: Captures language proficiencies and subject interests in an intuitive multi-step selector.
2. **Curates Starter Packages**: Dynamically ranks and suggests a balanced, high-utility bundle of compact ZIM packages tailored to the user's available storage quota.
3. **Transparently Estimates Resources**: Calculates total required storage against available disk space (with manual override fallback) and projects download durations using explicit, user-customizable network speed assumptions.
4. **Resumes & Recovers Seamlessly**: Simulates/executes chunked package retrieval with automated recovery logic to ensure dropped connections do not force restarted downloads.
5. **Confirms Offline-Readiness**: Directs the user to an immediately readable offline state with verified local content.

---

## Features

### Minimum Viable Product (MVP)

- [x] **Zero-Cloud Runtime**: Fully functional offline/local execution using a bundled static ZIM catalog snapshot—no telemetry or external backend dependencies required.
- [x] **Preference Profiling**: Multi-language and multi-topic selector covering high-demand domains (e.g., Medicine/Health, Encyclopedias, STEM, Language & Dictionaries, Literature, Programming).
- [x] **Dynamic Recommendation Engine**: Real-time scoring matrix that updates recommended ZIM packages as topic selections, language filters, or storage limits change.
- [x] **Storage Budgeting & Detection**: Automated disk space detection via `navigator.storage.estimate()` with an explicit manual fallback for unsupported environments or custom user ceilings.
- [x] **Explicit Bandwidth & Time Modeling**: Pre-calculated download ETA with clearly displayed connection assumptions (default: 10 Mbps, user-adjustable).
- [x] **Resumable Download Simulation**: Byte-level download progress tracking, pause/resume capability, and automated retry backoff upon simulated connection dropouts.
- [x] **Offline-Ready State Verification**: Visual indicator verifying that package archives have passed size and integrity checks and are ready for local reading.

### Stretch Goals (Optional Enhancements)

- [ ] **Direct OPDS Catalog Synchronization**: Optional live sync with Kiwix's online OPDS feed when an active connection is detected.
- [ ] **Native Storage Access Framework (SAF) Hook**: Direct disk persistence targeting custom offline directories on desktop or mobile.
- [ ] **Kiwix Hotspot / P2P Local Discovery**: Detection of local Kiwix server nodes over mDNS/LAN to download packages without WAN usage.
- [ ] **Delta Update Notifications**: Tracking version changes in existing ZIM packages to prompt lightweight differential updates.

---

## Tech Stack

Designed specifically for **maximum execution speed, zero build overhead, and pure simplicity** within a 20-hour hackathon environment. Heavy single-page frameworks (such as React or Next.js) and complex bundlers were intentionally bypassed in favor of native web standards.

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend Structure** | Semantic HTML5 | Clean document hierarchy, instant rendering, zero parsing overhead. |
| **Styling** | Tailwind CSS (CDN / Utility Classes) | Rapid, responsive UI construction without bulky CSS files or compile delays. |
| **Application Logic** | Vanilla JavaScript (ES6+ Modules) | Native browser execution, zero dependencies, effortless debugging, and high runtime performance. |
| **Data Store** | Static JSON (`data/catalog.json`) | Self-contained Kiwix ZIM catalog snapshot enabling 100% offline, zero-cloud execution. |
| **Storage & State** | Web Storage API (`localStorage` + `navigator.storage.estimate()`) | Native storage querying with persistent onboarding state across browser refreshes. |
| **Optional Backend** | Python FastAPI (`backend/main.py`) | *Optional microservice* for local OPDS catalog proxying or filesystem verification, only if extended server capabilities are required. |

---

---

## Quick Start & Running Locally

### Option 1: 1-Click Synchronized Launch (Windows)
Double-click `start.bat` (or `launch.bat`) to automatically synchronize and start both the optional FastAPI backend (port 8000) and frontend web server (port 3000), then open the application in your default browser at `http://localhost:3000`.

### Option 2: Python Static Server
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 3: Node.js Static Server
```bash
npx -y serve -l 3000
```

### Option 4: Direct Offline File (Zero Build / Zero Dependencies)
Open `index.html` directly in any modern browser (`file:///path/to/index.html`). The embedded catalog (`js/catalog-data.js`) guarantees 100% offline availability without needing an HTTP server.

---

## Optional FastAPI Backend Service

The application is local-first and functions autonomously without any running backend. For catalog schema validation, host disk space queries, and SHA-256 package verification, you can optionally launch the FastAPI microservice:

### Install Backend Dependencies
```bash
pip install -r backend/requirements.txt
```

### Run FastAPI Backend
```bash
# Option A: Helper script (Windows)
launch_backend.bat

# Option B: Direct uvicorn command
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

- API Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
- Interactive API Docs (Swagger UI): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Validated ZIM Catalog: [http://127.0.0.1:8000/api/catalog](http://127.0.0.1:8000/api/catalog)

---

## Testing & Verification

### Run Backend Unit & Integration Tests (Python)
```bash
python -m unittest tests/test_backend.py
```
*Tests health checks, catalog integrity, package size/checksum verification, storage metrics, and CORS boundaries.*

### Run Frontend Application Logic Tests (Node.js)
```bash
node --test tests/test_frontend_logic.js
```
*Tests catalog schemas, recommendation scoring algorithms, storage quota budgeting, download time calculations, and bounded exponential backoff.*

---

## Team

- **Samridhi Parashar** - [GitHub](https://github.com/SamridhiParashar-28)
- **Aaryaman Kapoor** - [GitHub](https://github.com/Aaryamann-Kapoor)

---

## Acknowledgments

- **[Kiwix Association](https://kiwix.org)**: For championing universal offline access to free knowledge and providing the open ZIM standards.
- **[USAR FOSS Club](https://github.com/)**: For fostering open-source development, community mentoring, and technical feedback.
- **FOSS Forge 2.0**: For organizing the hackathon track and setting challenging, high-impact problem statements.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.