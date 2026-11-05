# Unfumble

> **Your files. Your tools. Unfumbled.**

Unfumble is a production-oriented, 100% private web application and natural-language custom tool builder. All file processing runs directly on your device—your files and sensitive documents are never uploaded to any remote server or third-party cloud.

Unfumble unifies essential PDF, image, tabular, and file conversion utilities while introducing two transformative capabilities:
1. **Build My Tool:** An intelligent custom tool creator that interprets natural-language requests (*"I have 15 images. Convert them all to JPG, resize to 600x800 with white padding, make each smaller than 200 KB, and rename them Photo_1, Photo_2..."*), synthesizes typed workflow pipelines, and dynamically generates a working interface with live sliders and batch download.
2. **Smart Fix:** Intelligent diagnosis and 1-click automatic repair for website file rejection errors (government portals, visa uploads, job application ATS systems).

---

## 🌟 The Three Product Pillars

### 1. Build My Tool (Flagship Custom Tool Builder)
- **Natural-Language Understanding:** Describe any complex multi-step file operation in ordinary English.
  - *Example:* *"I have 15 images. Convert them all to JPG, resize them to 600 by 800 pixels with white padding, make each file smaller than 200 KB and rename them Photo_1, Photo_2, Photo_3."*
- **Dynamic Interface Generation:** Automatically renders a custom working application with tailored sliders, number inputs, format dropdowns, file dropzones, real-time pipeline step chips, and progress feedback.
- **Conversational Refinement:** Refine the tool iteratively (*"Actually, make max size 150 KB and add black padding instead"*) without losing uploaded files.
- **My Tools:** Save workflows to browser storage, duplicate, edit, export to JSON, or import from JSON.
- **Pre-Built Templates:** Ready-to-run templates including *Resize & Rename 100 Photos*, *Merge & Compress PDFs*, *Reduce File Size (KB)*, *Receipts to A4 PDF*, and *Visa / Passport Photo Maker*.

### 2. Smart Fix (Intelligent File Rejection Repair)
- **"File rejected? Let's find out why."**
- Upload a rejected document or photo, paste portal upload instructions or select from common presets (*US / Schengen Visa*, *Job Application Portal*, *Government Submission*, *Academic Journal*).
- Performs deep inspection of true format, MIME type, dimensions, file size, aspect ratio, and PDF page count.
- Outputs a color-coded diagnostic table with **PASS**, **FAIL**, and **CANNOT VERIFY** indicators.
- **"Fix Everything Possible"** button: Automatically executes format conversion, proportional padding/resizing, iterative binary-search compression, and re-validates the output against portal rules.
- Side-by-side comparison (Before vs After) with 100% compliance badge and download.

### 3. All-In-One File Tools
- **PDF Toolkit:**
  - Merge PDFs with drag-and-drop page/document reordering.
  - Split PDF (extract every page or custom ranges like `1-3, 5`).
  - Organize, rotate (90°/180°/270°), and delete pages.
  - Convert batch images to single PDF (A4, Letter, or Fit with customizable margins).
  - Compress PDF streams and optimize internal structure.
- **Image Toolkit:**
  - Resizing with 3 distinct strategies: **Pad** (add neutral background space without cropping), **Fit** (scale inside boundary), and **Fill** (crop to fill).
  - Iterative binary-search compression targeting exact maximum file size down to 1 KB.
  - Format conversions (JPG, PNG, WebP).
  - Batch processing with individual and ZIP package downloads.
- **Universal Converter:**
  - Bidirectional tabular conversions: CSV &harr; JSON &harr; TSV.
  - Automatic delimiter detection (comma, tab, semicolon).
  - Image format cross-conversions.
- **Batch Utilities:**
  - **Filename Fixer:** Pattern token replacement (`{name}`, `{ext}`, `{n}`, `{date}`), casing modifications, space replacements, and collision prevention.
  - **Duplicate Finder:** Cryptographic SHA-256 hash detection across uploaded files with wasted space calculation.
  - **File Inspector:** Magic byte hex signature inspection, MIME verification, dimensions, and metadata.

---

## 🔒 100% Private Architecture (Files Never Leave Your Device)

Unfumble was engineered around uncompromising user privacy:
- **Processed Privately on Your Device:** All PDF operations (`pdf-lib`), image manipulations (`HTML5 Canvas` / `OffscreenCanvas`), hashing (`Web Crypto API`), and ZIP packaging (`JSZip`) execute inside your browser on your computer or mobile phone.
- **Zero Document Retention:** Sensitive documents (passports, financial statements, IDs, photos) are never transmitted to any external server or third-party AI cloud.
- **Dual Engine:** Operates 100% offline with its local deterministic semantic parser. Users can optionally supply a Gemini API key in settings for live LLM reasoning without sending document contents over the wire.

---

## 📁 Project Structure

```
unfumble/
├── public/
│   ├── css/
│   │   └── styles.css              # Custom responsive stylesheet & executive design system
│   ├── js/
│   │   ├── app.js                  # Main UI controller & view orchestration
│   │   ├── operations/
│   │   │   ├── registry.js         # Typed registry of all supported operations
│   │   │   ├── pdf-ops.js          # PDF manipulation (pdf-lib)
│   │   │   ├── image-ops.js        # Canvas & Sharp image manipulation
│   │   │   ├── file-ops.js         # Hashing, renaming, ZIP creation, inspection
│   │   │   └── data-ops.js         # CSV, TSV, JSON tabular conversions
│   │   ├── workflow/
│   │   │   ├── engine.js           # Multi-step pipeline execution engine
│   │   │   ├── nlp-parser.js       # Natural language parser & Gemini integration
│   │   │   ├── templates.js        # Pre-built workflow specifications
│   │   │   └── share.js            # URL-safe state serialization & deep links
│   │   ├── smartfix/
│   │   │   └── smartfix.js         # Rejection diagnosis & automated repair
│   │   └── ui/
│   │       └── dynamic-tool.js     # Dynamic interface renderer for custom workflows
│   ├── vendor/                     # Vendored libraries
│   │   ├── pdf-lib.min.js
│   │   ├── jszip.min.js
│   │   └── lucide.min.js
│   ├── manifest.webmanifest        # PWA configuration
│   ├── sw.js                       # Offline Service Worker
│   └── index.html                  # Single-page application entry point
├── server/
│   └── server.mjs                  # Native Node.js HTTP server
├── tests/
│   └── test-runner.mjs             # Automated end-to-end tests
├── package.json
├── start.bat                       # Windows one-click launcher
├── start-server.ps1                # PowerShell launcher
├── wrangler.jsonc                  # Cloudflare Workers configuration
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Quick Start
To launch Unfumble locally:

**On Windows:**
Double-click `start.bat` or run in PowerShell:
```powershell
.\start-server.ps1
```

**Or using Node:**
```bash
node server/server.mjs
```

Open your browser to:
```
http://localhost:3000
```

---

## 🌐 Cloud & Edge Deployment

Unfumble is engineered for zero-maintenance edge deployment:

### 1. Cloudflare Workers / Static Assets
Configured with [`wrangler.jsonc`](wrangler.jsonc) serving the `./public` directory with zero backend compute charges:
```bash
npx wrangler deploy
```

### 2. Vercel
Includes a pre-configured [`vercel.json`](vercel.json) with security headers (CSP, nosniff, DENY framing):
```bash
vercel deploy --prod
```

### 3. Netlify
[`netlify.toml`](netlify.toml) points to `public` with instant CDN asset routing:
```bash
netlify deploy --prod
```

### 4. Docker & Container Hosting
Includes a lightweight Node 22 Alpine [`Dockerfile`](Dockerfile) and [`docker-compose.yml`](docker-compose.yml):
```bash
docker compose up -d --build
```

---

## 🔗 Deep Linking & Shareable Custom Tools

Every custom tool generated by "Build My Tool" can be shared instantly without requiring a database or cloud account:
- Click **"Share Tool Link"** in any generated tool interface.
- Unfumble compresses the entire pipeline schema into a URL-safe hash (e.g. `https://unfumble.shiwakshi.workers.dev/#tool=...`).
- When another user opens the URL, Unfumble restores the custom tool, configures all parameters, and displays the ready-to-run tool immediately.

---

## 📱 Progressive Web App (PWA) & Offline Mode

Unfumble is a fully compliant Progressive Web App:
- **Instant Offline Installation:** Click **"Install App"** in the top navigation bar to install Unfumble as a native desktop or mobile application on macOS, Windows, Linux, iOS, and Android.
- **Service Worker ([`sw.js`](public/sw.js)):** Uses cache strategies for PDF-Lib, JSZip, and app scripts so the toolkit works seamlessly even without an internet connection.
- **Web App Manifest ([`manifest.webmanifest`](public/manifest.webmanifest)):** High-resolution icons, teal theme branding, and desktop app shortcuts.

---

## 🧪 Automated Testing

Unfumble includes an automated test suite verifying all core operations:

To run the automated tests:
```powershell
node tests/test-runner.mjs
```

---

## 📋 Feature Status Checklist

- [x] **Homepage & Hero Experience:** Natural-language input, three primary action cards, smart drag-and-drop recommender, popular tools grid.
- [x] **Build My Tool (Flagship):** Natural-language parsing, operation pipeline assembly, dynamic form generation, conversational refinement, save & export.
- [x] **Smart Fix:** Rejection diagnosis against presets or custom text, diagnostic checklist (Pass/Fail/Cannot Verify), 1-click "Fix Everything Possible", side-by-side comparison.
- [x] **PDF Toolkit:** Merge, split, rotate, delete pages, images to PDF, stream optimization.
- [x] **Image Toolkit:** Fit, fill, and pad resizing, background color fill, target size binary-search compression, JPG/PNG/WebP conversions, batch processor.
- [x] **File Converter:** Tabular CSV &harr; JSON &harr; TSV, Image to Image, Image to PDF.
- [x] **Batch Utilities:** Filename Fixer with collision prevention, Duplicate Finder with SHA-256 hashes, Deep File Inspector.
- [x] **Privacy & Security:** 100% Private (files never leave your device), input sanitization, error boundaries.
