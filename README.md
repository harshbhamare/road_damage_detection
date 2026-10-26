# RoadVision AI — Road Distress Detection & Geospatial Platform

An enterprise-grade computer vision and geospatial intelligence platform for automatic detection, classification, and mapping of pavement distresses (**Potholes, Alligator Cracks, Transverse Cracks, and Longitudinal Cracks**) compliant with **IEEE Global Road Damage Detection (RDD)** benchmarks and **ASTM D6433 Pavement Condition Index (PCI)** civil engineering standards.

---

## Key Highlights & Features

- **Material Design 3 (M3) Interface**: Tactile surfaces, authentic elevation layers, accessible high-contrast typography, and a seamless **Light / Dark Theme Switcher**.
- **Photometric Crack Aperture & Depth Engine**: Compliant with **ASTM D6433** and **IRC:82**, extracts fissure aperture width ($W_{\text{mm}}$) and fracture mechanics penetration depth ($D_{\text{max}}$ in mm) into the wearing course using sub-pixel photometric extinction and contour morphology.
- **Dual-Mode 3D Elevation Cross-Section**:
  - **For Cracks**: Renders the **Asphalt Fracture Mechanics V-Notch Cross-Section** showing the 40mm Bituminous Concrete wearing course, crack aperture, penetration depth, ASTM severity badge, and sealant fill line.
  - **For Potholes**: Renders the **Cavity Crater Topographic Depression** showing 25mm / 50mm ASTM thresholds, cavity volume in liters, and compacted asphalt repair mass in kg.
- **ASTM D6690 Sealant & Routing Takeoff**: Automatically generates contractor specifications for ASTM D6690 Type II hot-poured rubberized sealant mass (kg), sealant volume (L), $15\text{mm} \times 15\text{mm}$ saw-cut reservoir routing specs, and Hot Compressed Air (HCA) lance prep length.
- **AI Pavement Deterioration & Lifecycle Forecaster**: Visualizes a 24-month pavement condition trajectory (PCI vs Time) comparing **Preventive Maintenance** vs **No Intervention**, with Remaining Service Life (RSL) and Cost-of-Delay escalation multipliers ($2.4\times$ to $4.8\times$).
- **Official Municipal Work-Order Ticket Generator**: One-click generation of printable civil engineering work-order tickets with unique Work-Order #, Itemized Bill of Quantities (BOQ), contractor machinery checklist, and budget estimates in INR (₹) and USD ($).
- **Interactive Multi-Mode Inspection Canvas**: Toggle between **Precision Reticles**, **3D Depth Pseudo-Color Heatmap** (thermal stress overlay with floating HUD pills), and **Metric Dimension Ruler** with real-time zoom controls (+ / - / Reset).
- **ASTM D6433 Pavement Condition Index (PCI) Engine**: Evaluates road health scores (0–100), hazard priority, deductible deduct curve, recommended engineering intervention, and estimated repair cost bracket ($/m² & ₹/sqm).
- **1-Click Distress Sample Benchmarks**: Instantly test potholes (D40), alligator mesh (D20), transverse cracks (D10), and longitudinal cracks (D00) with 1 click without needing to upload files.
- **Corridor Batch Survey Mode**: Queue and process multiple roadway photos consecutively (e.g. from dashcam drives) with live progress tracking.
- **Reporting & GIS Data Hub**: Export records to **CSV** (with crack depth, aperture, and sealant metrics), export standard RFC 7946 **GeoJSON** for QGIS/ArcGIS/Google Earth, and generate a **Print-Ready Official Municipal Road Condition Audit Report**.
- **Interactive GIS Map**: Leaflet geospatial map with base layer switcher (*CartoDB Clean, OpenStreetMap Standard, Esri Satellite Imagery*), defect filtering, coordinate picker, and 35-meter hazard danger zones.
- **Dual-Model YOLOv8 Ensemble**: PyTorch multi-model detection uniting specialized pothole weights (`pothole_peterhdd.pt`) with RDD multiclass weights (`rdd_yolov8.pt`) via calibrated non-destructive merging.
- **Zero-Friction Resilient Architecture**: Connects to MongoDB when active, with automatic, transparent fallback to local persistent storage if MongoDB is stopped.

---

## System Architecture

```text
Road Damage/
├── apps/
│   └── web/                   # Next.js 15 App Router Frontend & Full-Stack API
│       ├── public/            # Static assets, uploads, and sample images
│       └── src/
│           ├── app/           # App Router pages (/, /upload, /records, /map, /model-info)
│           ├── components/    # Material Navbar, DetectionCanvas, MapComponent, StatusBadge
│           ├── lib/           # PCI Engine, Sample presets, Resilient store, ML inference
│           └── models/        # Mongoose database models (DamageRecord, Media, ModelVersion)
├── services/
│   ├── backend/               # Node.js / Express API microservice
│   └── ml-service/            # Python FastAPI YOLOv8 inference daemon & CLI runner
│       ├── .venv/             # PyTorch & Ultralytics environment
│       ├── weights/           # Trained model weights (pothole_peterhdd.pt, rdd_yolov8.pt)
│       └── run_inference_cli.py # Direct Python CLI runner for Next.js
└── ml/                        # Training notebooks, dataset scripts, and pipelines
```

---

## IEEE RDD Distress Taxonomy

| Code | Distress Classification | Physical Description | Hazard Level & Action |
|:---:|:---|:---|:---|
| **D40** | **Pothole / Depression** | Localized bowl-shaped asphalt cavity with missing aggregate | **Critical** (Immediate Patching / Cold-mix) |
| **D20** | **Alligator / Fatigue Crack** | Interconnected crocodile-skin mesh from repeated heavy axle loads | **Elevated** (Milling & Hot-mix Overlay) |
| **D10** | **Transverse Crack** | Linear fracture perpendicular to traffic flow from thermal shrinkage | **Moderate** (Rubberized Crack Seal) |
| **D00** | **Longitudinal Crack** | Linear fracture along wheel paths or longitudinal construction joints | **Moderate** (Joint Sealant / Routine Monitoring) |

---

## How to Run This Project

### 1. Prerequisites

- **Node.js**: v18.x or later (`node -v`)
- **Python**: v3.9 to v3.13 (`python --version`) with PyTorch & Ultralytics (already configured in `services/ml-service/.venv`)
- **MongoDB** *(Optional)*: MongoDB running locally on port 27017. *(Note: If MongoDB is not running, the application automatically uses the built-in resilient fallback store without crashing).*

---

### 2. Quickstart: Running the Web Application (Recommended)

To run the complete full-stack web application with the new Materialistic UI, GIS map, and AI inference:

```powershell
# From the repository root (e:\Road Damage)
npm run dev:web
```

Open your browser and navigate to:
👉 **`http://localhost:3000`**

The web app is completely self-contained with integrated API routes (`/api/stats`, `/api/upload`, `/api/records`, `/api/map-records`, `/api/model-info`) and automatically invokes the Python YOLOv8 model in `services/ml-service/.venv`.

---

### 3. Running the Python FastAPI ML Microservice (Optional)

If you want to run the standalone high-speed FastAPI inference microservice daemon on port `8000`:

```powershell
# Windows PowerShell
npm run dev:ml

# Or activate the venv directly:
services\ml-service\.venv\Scripts\Activate.ps1
cd services\ml-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- API Documentation: **`http://localhost:8000/docs`**
- Health Check: **`http://localhost:8000/health`**

---

### 4. Running the Express Backend Service (Optional)

If you wish to run the standalone Node.js Express backend service on port `5000`:

```powershell
# From the repository root
npm run dev:backend
```

Backend API will be live at:
👉 **`http://localhost:5000/api`**

---

### 5. Running All Services Simultaneously

You can open separate terminal windows for each service:

| Terminal | Service | Command | URL |
|:---|:---|:---|:---|
| **Terminal 1** | **Web Frontend & App APIs** | `npm run dev:web` | `http://localhost:3000` |
| **Terminal 2** | **Python YOLOv8 ML Daemon** | `npm run dev:ml` | `http://localhost:8000` |
| **Terminal 3** | **Express API Gateway** | `npm run dev:backend` | `http://localhost:5000` |

---

## Step-by-Step Feature Walkthrough

### 1. Health Overview Dashboard (`/`)
- Review overall network **Pavement Condition Index (PCI)** health gauge.
- Inspect distress distribution across D40, D20, D10, and D00.
- Switch between **Light & Dark Material 3 Themes** using the sun/moon icon in the top app bar.
- Click any **1-Click Sample Benchmark** to launch instant road inspection.

### 2. Inspection Studio (`/upload`)
- **Single Scan**: Select a photo, or choose a sample preset. Adjust the **Confidence Threshold slider** (5% - 85%) and click **Execute Computer Vision Scan**.
- **Detection Canvas**: Inspect bounding boxes with corner reticles and pixel measurements. Use the **Zoom In / Zoom Out / 1x** controls or click **Export Annotated Image**.
- **ASTM D6433 Card**: Review calculated PCI score, hazard urgency, and recommended civil repair action.
- **Corridor Batch Survey**: Switch to the **Batch Survey** tab to drop multiple roadway photos and watch sequential batch processing.

### 3. Distress Records & Audit Reports (`/records`)
- Filter records with pill chips (*D40, D20, D10, D00, Verified, Pending*).
- Search records by corridor name.
- Select records for batch deletion or review individual records in the detail modal.
- Click **Export CSV** for spreadsheets, or **GeoJSON** for QGIS / ArcGIS.
- Click **Audit Report** to view and print the official municipal road condition report.

### 4. GIS Spatial Map (`/map`)
- View geographic distribution of road distress hotspots.
- Switch map styles between **Clean CartoDB, OpenStreetMap, and Satellite Imagery**.
- Toggle **35m Hazard Proximity Zones** around dangerous potholes.
- Click anywhere on the map to pin coordinates and launch a survey for that location.
- Use the **Distress Hotspots drawer** to click and fly to any detected incident.

### 5. Precision Tuning & Training Pipeline (`/model-info` & `ml/`)
- **Precision Calibration Presets**:
  - **🎯 High Precision (35%)**: Audits and civil defect tenders. Completely eliminates false positive horizon specks, shadow lines, and hood glare.
  - **⚖️ Balanced (25%)**: Standard municipal road survey baseline.
  - **🔍 Sensitive (15%)**: Diagnostic scan for nascent hairline fractures.
- **Cross-Class Conflict Resolution**: Resolves overlapping predictions between different distress classes (e.g., D40 vs D20) so no two conflicting boxes occupy the same spot.
- **Dual-Model Ensemble Consensus**: When both the specialized pothole detector (`pothole_peterhdd.pt`) and multiclass model (`rdd_yolov8.pt`) agree on a defect, confidence is boosted by **+0.12** and tagged with `★ Ensemble Verified`.
- **Training on More Data**:
  - **Google Colab (Free GPU)**: Open [`ml/notebooks/02_colab_training_pipeline.ipynb`](file:///e:/Road%20Damage/ml/notebooks/02_colab_training_pipeline.ipynb) on Colab and run all cells.
  - **Local Preparation**: `services\ml-service\.venv\Scripts\python.exe ml/scripts/download_and_prep_data.py --source ./ml/data/raw`
  - **Data Augmentation**: `services\ml-service\.venv\Scripts\python.exe ml/scripts/augment_dataset.py --dataset ./ml/data/rdd_dataset --multiplier 3`
  - **Local YOLOv8 Training**: `services\ml-service\.venv\Scripts\python.exe ml/scripts/train_yolo.py --data ./ml/data/rdd_dataset/data.yaml --epochs 50 --deploy`

