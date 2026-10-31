# FileFix

> **Your files. Your tools. Your way.**

FileFix is a production-oriented, privacy-first web application and AI-powered custom tool creator. It unifies essential PDF, image, tabular, and file conversion utilities while introducing two transformative capabilities: **Smart Fix** (intelligent diagnosis and 1-click repair of website file rejection errors) and **Build My Tool** (an AI custom tool creator that interprets natural-language requests, synthesizes typed workflow pipelines, and dynamically generates working interactive user interfaces).

---

## 🌟 The Three Product Pillars

### 1. Build My Tool (Flagship AI Custom Tool Builder)
- **Natural-Language Understanding:** Describe any complex multi-step file operation in ordinary English.
  - *Example:* *"I have 15 images. Convert them all to JPG, resize them to 600 by 800 pixels with white padding, make each file smaller than 200 KB and rename them Photo_1, Photo_2, Photo_3."*
- **Dynamic Interface Generation:** Automatically renders a custom working application with tailored sliders, number inputs, format dropdowns, file dropzones, real-time pipeline step chips, and progress feedback.
- **Conversational Refinement:** Refine the tool iteratively (*"Actually, make max size 150 KB and add black padding instead"*) without losing uploaded files.
- **My Tools:** Save workflows to browser local storage, duplicate, edit, export to JSON, or import from JSON.
- **Pre-Built Templates:** Six ready-to-run templates including *Resize & Rename 100 Photos*, *Merge & Compress PDFs*, *Receipts to A4 PDF*, and *Visa / Passport Photo Maker*.

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
  - Iterative binary-search compression targeting exact maximum file size in KB.
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

## 🔒 Privacy-First Architecture

FileFix was engineered around uncompromising user privacy:
- **100% Client-Side Processing:** All PDF operations (`pdf-lib`), image manipulations (`HTML5 Canvas` / `OffscreenCanvas`), hashing (`Web Crypto API`), and ZIP packaging (`JSZip`) execute inside the user's browser.
- **Zero Document Retention:** Sensitive documents (passports, financial statements, medical records) are never transmitted to external servers or third-party AI models.
- **Dual AI Engine:** Operates completely offline with its local deterministic semantic parser. Users can optionally supply a Gemini API key in settings for live LLM reasoning without sending document contents over the wire.

---

## 📁 Project Structure

```
filefix/
├── public/
│   ├── css/
│   │   └── styles.css              # Custom responsive stylesheet & utility classes
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
│   │   │   └── templates.js        # Pre-built workflow specifications
│   │   ├── smartfix/
│   │   │   └── smartfix.js         # Rejection diagnosis & automated repair
│   │   └── ui/
│   │       └── dynamic-tool.js     # Dynamic interface renderer for custom workflows
│   ├── vendor/                     # Vendored client-side libraries
│   │   ├── pdf-lib.min.js
│   │   ├── jszip.min.js
│   │   └── lucide.min.js
│   └── index.html                  # Single-page application entry point
├── server/
│   └── server.mjs                  # Native Node.js HTTP server
├── tests/
│   └── test-runner.mjs             # 43 automated end-to-end tests
├── package.json
├── start.bat                       # Windows one-click launcher
├── start-server.ps1                # PowerShell launcher
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)

### Quick Start
To launch FileFix locally, simply run:

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

## 🌐 Public Production & Cloud Deployment

FileFix is engineered for zero-maintenance edge and cloud deployment:

### 1. Vercel
FileFix includes a pre-configured [`vercel.json`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/vercel.json) with security headers (CSP, nosniff, DENY framing) and 1-year immutable caching for vendored WebAssembly binaries:
```bash
vercel deploy --prod
```

### 2. Netlify
[`netlify.toml`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/netlify.toml) points to `public` with instant CDN asset routing:
```bash
netlify deploy --prod
```

### 3. Cloudflare Pages
[`public/_headers`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/public/_headers) configures Cloudflare edge cache rules and security policies out of the box.

### 4. Docker & Container Hosting
FileFix includes a lightweight Node 22 Alpine [`Dockerfile`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/Dockerfile) and [`docker-compose.yml`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/docker-compose.yml):
```bash
docker compose up -d --build
```

---

## 🔗 Deep Linking & Shareable Custom Tools

Every custom tool generated by "Build My Tool" can be shared instantly without requiring a database or cloud account:
- Click **"Share Tool Link"** in any generated tool interface.
- FileFix compresses the entire pipeline schema into a URL-safe hash (e.g. `https://filefix.app/#tool=...`).
- When another user opens the URL, FileFix restores the custom tool, configures all parameters, and displays the ready-to-run tool immediately.

---

## 📱 Progressive Web App (PWA) & Offline Mode

FileFix is a fully compliant Progressive Web App:
- **Instant Offline Installation:** Click **"Install App"** in the top navigation bar to install FileFix as a native desktop or mobile application on macOS, Windows, Linux, iOS, and Android.
- **Service Worker ([`sw.js`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/public/sw.js)):** Uses cache-first strategies for PDF-Lib, JSZip, and app scripts so the toolkit works seamlessly even without an internet connection.
- **Web App Manifest ([`manifest.webmanifest`](file:///C:/Users/HP/.gemini/antigravity/scratch/filefix/public/manifest.webmanifest)):** High-resolution 192x192 and 512x512 icons, teal theme branding, and desktop app shortcuts.

---

## 🧪 Automated Testing

FileFix includes a comprehensive automated test suite verifying all 16 requirements specified in Part 14 of the Master Build Prompt:

To run the automated tests:
```powershell
$env:NODE_PATH = "C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules"
node tests/test-runner.mjs
```

### Test Suite Results:
```
======================================================
  FileFix Automated Test Suite
======================================================

[Suite 1] PDF Operations:
  ✓ PASS: Merged PDF has exactly 6 pages (2+1+3), got 6
  ✓ PASS: Split range produced result
  ✓ PASS: Split extracted exactly 3 pages (1-2, 4), got 3
  ✓ PASS: Split 'all' produced 5 individual files, got 5
  ✓ PASS: Page 2 deleted, 3 pages remain, got 3
  ✓ PASS: Page 1 rotated by 90 degrees, got 90

[Suite 2] Image Operations:
  ✓ PASS: Padded image dimensions match 600×800 exactly, got 600×800
  ✓ PASS: Fitted image fits inside boundary, got 600×300
  ✓ PASS: Filled image cropped to exactly 500×500, got 500×500
  ✓ PASS: Image compressed below 100 KB target, got 7.2 KB
  ✓ PASS: Converted image is genuine JPEG format, got jpeg
  ✓ PASS: Images converted into 2-page PDF, got 2

[Suite 3] Batch & Utility Operations:
  ✓ PASS: First file renamed to Photo_1.jpg, got Photo_1.jpg
  ✓ PASS: Second file renamed to Photo_2.jpg, got Photo_2.jpg
  ✓ PASS: Third file renamed to Photo_3.jpg, got Photo_3.jpg
  ✓ PASS: Duplicate names resolved without collision
  ✓ PASS: ZIP contains all packaged files
  ✓ PASS: Detected exactly 1 duplicate group, got 1
  ✓ PASS: Duplicate group contains 2 matching files
  ✓ PASS: CSV parsed into JSON correctly
  ✓ PASS: JSON converted back to CSV

[Suite 4] Smart Fix & AI Custom Builder:
  ✓ PASS: Initial file correctly diagnosed as failing portal requirements
  ✓ PASS: Suggested fixes generated: convert_format, resize
  ✓ PASS: Repaired file achieves 100% compliance with requirements
  ✓ PASS: Repaired dimensions exactly 600×600 px
  ✓ PASS: Workflow title: "Custom Image Processor"
  ✓ PASS: Workflow assembled 4 pipeline operations, got 4
  ✓ PASS: Operation 1: resize_image with mode "pad"
  ✓ PASS: Operation 2: convert_image to JPG
  ✓ PASS: Operation 3: compress_image
  ✓ PASS: Operation 4: rename_file with pattern Image_{n}
  ✓ PASS: Workflow produced 5 output files, got 5
  ✓ PASS: First output renamed to Image_1.jpg, got Image_1.jpg
  ✓ PASS: Fifth output renamed to Image_5.jpg, got Image_5.jpg
  ✓ PASS: Output image has exact 600×800 padded dimensions, got 600×800
  ✓ PASS: Output format is genuine JPEG
  ✓ PASS: PDF workflow includes merge_pdf
  ✓ PASS: PDF workflow includes delete_pdf_pages
  ✓ PASS: PDF workflow includes rotate_pdf
  ✓ PASS: Merged result produced single output
  ✓ PASS: Output PDF has 5 pages after deleting page 3 (6 - 1 = 5), got 5

[Suite 5] Security & Safeguards:
  ✓ PASS: Corrupted file safely rejected with clear exception
  ✓ PASS: Safeguard prevents deleting all pages from a document

[Suite 6] Public Deployment & Deep Linking:
  ✓ PASS: Workflow encoded to URL-safe hash string
  ✓ PASS: Decoded workflow preserved title: "Passport Photo 600x600 Maker"
  ✓ PASS: Decoded operations matched original
  ✓ PASS: Decoded parameters preserved

======================================================
  Test Results Summary:
  Total Tests:  47
  Passed Tests: 47
  Failed Tests: 0
======================================================
```

---

## ⚙️ Environment Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | Local server port | `3000` |
| `GEMINI_API_KEY` | Optional API key for live conversational AI tool generation | `None (uses local NLP planner)` |

---

## 📋 Feature Status Checklist

- [x] **Homepage & Hero Experience:** Natural-language input, three primary action cards, smart drag-and-drop recommender, popular tools grid.
- [x] **Build My Tool (Flagship):** Natural-language parsing, operation pipeline assembly, dynamic form generation, conversational refinement, save & export.
- [x] **Smart Fix:** Rejection diagnosis against presets or custom text, diagnostic checklist (Pass/Fail/Cannot Verify), 1-click "Fix Everything Possible", side-by-side comparison.
- [x] **PDF Toolkit:** Merge, split, rotate, delete pages, images to PDF, stream optimization.
- [x] **Image Toolkit:** Fit, fill, and pad resizing, background color fill, target size binary-search compression, JPG/PNG/WebP conversions, batch processor.
- [x] **File Converter:** Tabular CSV &harr; JSON &harr; TSV, Image to Image, Image to PDF.
- [x] **Batch Utilities:** Filename Fixer with collision prevention, Duplicate Finder with SHA-256 hashes, Deep File Inspector.
- [x] **Privacy & Security:** 100% client-side privacy, input sanitization, error boundaries.
