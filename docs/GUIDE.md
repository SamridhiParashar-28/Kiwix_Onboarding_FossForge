# Kiwix Onboarding: User & Developer Guide

Welcome to the **Kiwix Onboarding: Zero-to-Knowledge First-Run Experience** guide!  
This guide is designed to be **accessible, clear, and easy for everyone**—whether you are a user looking to set up an offline library, an evaluator or hackathon judge reviewing the prototype, or a developer contributing code.

---

## Table of Contents

1. [Quick Start (Get Running in 10 Seconds)](#1-quick-start-get-running-in-10-seconds)
2. [End-User Walkthrough: The 5-Step Pipeline](#2-end-user-walkthrough-the-5-step-pipeline)
   - [Step 1: Welcome & ZIM Overview](#step-1-welcome--zim-overview)
   - [Step 2: Selecting Areas of Interest](#step-2-selecting-areas-of-interest)
   - [Step 3: Choosing Languages](#step-3-choosing-languages)
   - [Step 4: Storage Budgeting & Adaptive Recommendations](#step-4-storage-budgeting--adaptive-recommendations)
   - [Step 5: Resumable Download, Verification & Offline Readiness](#step-5-resumable-download-verification--offline-readiness)
3. [Special Features & How to Use Them](#3-special-features--how-to-use-them)
   - [1-Click Demo Login](#1-click-demo-login)
   - [Network Interruption & Resumable Recovery Simulation](#network-interruption--resumable-recovery-simulation)
   - [Creating Custom ZIM Archives (Web URL or Local Files)](#creating-custom-zim-archives-web-url-or-local-files)
   - [Interactive Offline Library Reader](#interactive-offline-library-reader)
   - [Exporting Library Configuration to JSON](#exporting-library-configuration-to-json)
   - [Dark & Light Theme Switching](#dark--light-theme-switching)
4. [Developer & Evaluator Guide](#4-developer--evaluator-guide)
   - [Architecture & Tech Stack](#architecture--tech-stack)
   - [Optional FastAPI Microservice Backend](#optional-fastapi-microservice-backend)
   - [Running the Automated Test Suites](#running-the-automated-test-suites)
5. [Troubleshooting & FAQs](#5-troubleshooting--faqs)

---

## 1. Quick Start (Get Running in 10 Seconds)

### Option A: Windows 1-Click Synchronized Launcher (Easiest)
Simply double-click [`start.bat`](file:///d:/Aaryamann%20Kapoor/code/Kiwix_Onboarding_FossForge/start.bat) in the root directory.  
It automatically starts both the optional FastAPI backend (at `http://127.0.0.1:8000`) and the frontend web server (at `http://localhost:3000`) synchronized, opening the application directly in your default browser.

### Option B: Python Command Line
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option C: Node.js Command Line
```bash
npx -y serve -l 3000
```

### Option D: Zero-Server Mode (Direct File System)
Double-click [`index.html`](file:///d:/Aaryamann%20Kapoor/code/Kiwix_Onboarding_FossForge/index.html) to open it directly (`file:///.../index.html`). The embedded catalog fallback ([`js/catalog-data.js`](file:///d:/Aaryamann%20Kapoor/code/Kiwix_Onboarding_FossForge/js/catalog-data.js)) guarantees 100% functionality without needing any runtime server.

---

## 2. End-User Walkthrough: The 5-Step Pipeline

### Step 1: Welcome & ZIM Overview
- **What you see:** A clean landing page explaining Kiwix's mission and offline capabilities.
- **Actions available:**
  - Click **"What is a ZIM file and how does it work?"** to read about the open-standard compressed archive format.
  - Click **"Start Onboarding"** to begin step-by-step customization.
  - Or click **"Quick Auto-Curate (Recommended 5GB)"** to instantly pre-select a popular, balanced offline collection.

### Step 2: Selecting Areas of Interest
- **What you see:** 6 high-impact domain cards:
  - *Health & Medicine* (WikiMed, emergency care)
  - *Disaster Preparedness* (off-grid survival, crisis guides)
  - *Wikipedia Reference* (Vital 10k articles, top 100k curated)
  - *Science & Technology* (PhET simulations, STEM)
  - *Coding & Development* (DevDocs API references, Stack Overflow)
  - *Education & Literature* (Gutenberg classics, Wikivoyage)
  - *History & Culture* (World History Encyclopedia, ancient civilizations)
- **Actions available:** Select one or more cards (or click **"Select All"** / **"Clear"**). The counter badge updates in real time. Click **"Continue to Languages"**.

### Step 3: Choosing Languages
- **What you see:** Language cards covering English, Hindi, Spanish, French, German, Arabic, Chinese, and Russian, plus an instant search box to filter languages.
- **Actions available:** Select all languages you can read. Kiwix packages will be prioritized accordingly. Click **"Proceed to Storage & Packages"**.

### Step 4: Storage Budgeting & Adaptive Recommendations
- **Storage Quota:**
  - Click preset buttons (**1 GB**, **2 GB**, **5 GB**, **10 GB**, **20 GB**, **50 GB**) or enter a custom amount.
  - Click **"Detect Device Storage"** to automatically query your browser's available storage quota.
- **Adaptive Recommendations:**
  - The scoring algorithm instantly ranks packages matching your interests and languages at the top.
  - Individual file sizes (`MB` / `GB`), article counts, and match tags (`★ Top Match`) are displayed on each card.
  - **Budget Overload Protection:** If an unselected package exceeds your remaining space, an amber badge displays: `Exceeds Budget (+X MB)`. If your total selection exceeds your budget, a red warning banner appears and the proceed button is safely disabled until you balance your selection.
  - Click **"Smart Fit to Budget"** to have the system automatically select the highest-utility combination that fits your disk quota.
- Click **"Download & Offline Ready"** to proceed.

### Step 5: Resumable Download, Verification & Offline Readiness
- **What you see:** An active download and integrity verification dashboard.
- **Real-Time Bandwidth & ETA:** The top-right dropdown lets you select assumed network speeds (5, 10, 25, 50, 100 Mbps). The ETA accurately updates in real time.
- **Sequential Queue:** Progress bars for each selected package reflect downloaded chunks and completion.
- **Offline Ready State:** Once all packages reach 100% and pass size and checksum validation, the dashboard celebrates with verified summary metrics and ready-to-read cards.

---

## 3. Special Features & How to Use Them

### ⚡ 1-Click Demo Login
- On both [`index.html`](file:///d:/Aaryamann%20Kapoor/code/Kiwix_Onboarding_FossForge/index.html) and [`signin.html`](file:///d:/Aaryamann%20Kapoor/code/Kiwix_Onboarding_FossForge/signin.html), you can click **"⚡ Quick Demo Access (1-Click)"** to log in instantly as `demo@kiwix.org` without filling in forms.

### 🌐 Network Interruption & Resumable Recovery Simulation
- In Step 5, click **"Simulate Network Drop"**.
- An alert banner simulates a dropped internet connection with automatic exponential backoff retry (attempts 1 of 3, 2 of 3, 3 of 3).
- Notice that all downloaded chunks are **strictly preserved**—progress never restarts from zero!
- You can let the countdown auto-reconnect, or click **"Retry Now"** to resume immediately.

### 📦 Creating Custom ZIM Archives
- Click **"+ Create Custom ZIM"** in the top navigation header at any time.
- **Tab 1 (Web URL):** Enter a documentation URL (e.g. `https://docs.python.org/3/`) to define a crawler target.
- **Tab 2 (File Upload):** Drag and drop local source code or notes (`.md`, `.py`, `.txt`, `.js`, `.json`). The archive size and word count are automatically calculated.
- Submitting adds your custom ZIM archive into the active recommendation catalog and library queue.

### 📖 Interactive Offline Library Reader
- When downloads are verified, click **"Launch Offline Library Reader"**.
- A full-screen reader modal opens, showcasing your local offline index.
- Browse packages in the left sidebar, click any article title to read verified offline text and emergency protocols, and use the search box to filter articles.

### 💾 Exporting Library Configuration to JSON
- On the Offline Ready screen, click **"Export Catalog (.json)"**.
- This downloads a clean JSON configuration file containing your storage budget, selected preferences, and list of verified offline packages, ready to import into official Kiwix Desktop, Kiwix Android, or `kiwix-serve` installations.

### 🌓 Dark & Light Theme Switching
- Click the sun/moon icon (`#theme-toggle-btn`) in the top navigation bar to toggle between the Dark Charcoal Theme and the Soft Light Gray Theme. Your preference is remembered across sessions.

---

## 4. Developer & Evaluator Guide

### Architecture & Tech Stack

| Layer | Implementation | Notes |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 Semantic Elements | Zero framework overhead, instantaneous first paint. |
| **Styling** | Tailwind CSS (CDN) + Custom Tokens | Consistent dark charcoal and soft light gray themes in `css/styles.css`. |
| **Application State** | Vanilla JS (ES6+) | Centralized reactive state store in `js/app.js`. |
| **Session & Auth** | Client-side `localStorage` (`js/auth.js`) | Zero-cloud, off-grid persistence across browser reloads. |
| **Data Snapshot** | `data/catalog.json` + `js/catalog-data.js` | 18 curated packages with verified SHA-256 hashes and download sources. |
| **Optional Microservice**| Python FastAPI (`backend/main.py`) | Schema validation, checksum verification, host storage queries. |

### Optional FastAPI Microservice Backend

The application is local-first and does not require the backend to run. To test the optional companion microservice:

1. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```
2. **Start the FastAPI server:**
   ```bash
   # Windows launcher (backend only):
   start.bat backend
   # Or directly:
   python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
   ```
3. **Explore endpoints:**
   - Swagger Documentation: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
   - Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)
   - Validated Catalog: [http://127.0.0.1:8000/api/catalog](http://127.0.0.1:8000/api/catalog)
   - Package Verification: `POST /api/verify-package`
   - Disk Space Query: `GET /api/storage-info`

### Running the Automated Test Suites

#### 1. Backend Automated Tests (Python)
```bash
python -m unittest tests/test_backend.py
```
*Validates API health, catalog schemas, SHA-256 package verification, size mismatch detection, storage security, and CORS headers (9/9 passing).*

#### 2. Frontend Logic Tests (Node.js)
```bash
node --test tests/test_frontend_logic.js
```
*Validates catalog consistency, multi-factor recommendation ranking algorithms, storage quota calculations, download speed/time conversions, and bounded backoff logic (5/5 passing).*

---

## 5. Troubleshooting & FAQs

**Q: Does this application require an active internet connection to evaluate?**  
**A:** No! It is designed specifically for zero-cloud offline execution. All catalog packages, images, and logic are bundled locally.

**Q: Why does the download progress say "Simulation"?**  
**A:** In standard web browsers, web security restrictions prevent client-side JavaScript from silently writing multi-gigabyte files (e.g. 4.2 GB Wikipedia) directly to arbitrary operating system directories without explicit user file prompts. To provide a completely smooth, authentic onboarding experience, Kiwix Onboarding accurately simulates chunked retrieval, bandwidth modeling, network drop recovery, and SHA-256 validation, while providing the optional FastAPI microservice for host disk interactions.

**Q: How do I reset my progress to test from the beginning?**  
**A:** Click the circular restart icon in the top navigation bar (`#btn-restart-onboarding`). This clears your saved state and returns you to Step 1.

**Q: Can I adjust the download speed assumption?**  
**A:** Yes. In Step 5, use the "Assumed Speed" dropdown to switch between 5, 10, 25, 50, and 100 Mbps. The remaining ETA and progress rates adapt instantly.
