# System Architecture & Technical Design

## 1. System Overview

The Road Damage Detection and Mapping Platform is an academic GIS-enabled computer vision platform. It automates the extraction of road anomalies (potholes and cracks) from digital imagery and maps them with high spatial accuracy.

## 2. Core Components

```
+-------------------------------------------------------------+
|                      Client Browser                         |
|  (Next.js App: Leaflet GIS Map, Upload Canvas, Dashboard)   |
+------------------------------+------------------------------+
                               |
                        HTTPS / REST
                               |
                               v
+-------------------------------------------------------------+
|               API Gateway / Backend Service                 |
|              (Node.js + Express + TypeScript)               |
|                                                             |
|  - File Upload Handling (Multer)                            |
|  - Metadata & EXIF GPS Extraction (exiftool / exif-parser)  |
|  - Job Orchestration & Verification Management              |
|  - Geospatial Query Engine (GeoJSON + Mongoose)             |
+---------------+-----------------------------+---------------+
                |                             |
          Mongoose / 2dsphere           HTTP / REST
                |                             |
                v                             v
+-------------------------------+  +--------------------------+
|      MongoDB Database         |  |   Python ML Service      |
|                               |  |       (FastAPI)          |
|  - Media Collection           |  |                          |
|  - DamageRecord Collection    |  |  - PyTorch / YOLOv8 /    |
|  - ModelVersion Collection    |  |    ONNX Runtime          |
|  - ProcessingJob Collection   |  |  - NMS & Tensor Ops      |
+-------------------------------+  |  - Confidence Filtering  |
                                   +--------------------------+
                                              ^
                                              | Trained Weights (.pt / .onnx)
                                              |
                                   +--------------------------+
                                   |  Google Colab GPU Env    |
                                   |  (Training on RDD2022)   |
                                   +--------------------------+
```

## 3. Communication Protocols

### 3.1 Web Frontend <-> Backend API
- **Transport**: Standard REST over HTTP/HTTPS.
- **Payload Format**: `application/json` for data queries; `multipart/form-data` for file uploads.
- **Spatial Queries**: Uses GeoJSON FeatureCollection conventions for seamless rendering in Leaflet / Mapbox.

### 3.2 Backend API <-> Python ML Service
- **Transport**: Internal HTTP REST (microservice pattern).
- **Endpoint**: `POST http://localhost:8000/predict`
- **Request**: Multipart image payload or local file path reference, along with confidence and IoU thresholds.
- **Response**: JSON array of detected bounding boxes with class identifiers (`D00`, `D10`, `D20`, `D40`) and confidence values.

### 3.3 Backend API <-> MongoDB
- **Driver**: Mongoose ODM with native MongoDB 2dsphere geospatial indexing.
- **Coordinate System**: WGS 84 (`EPSG:4326`), represented as GeoJSON `Point` (`[longitude, latitude]`).

## 4. End-to-End Processing Lifecycle

1. **Ingestion**: User selects road photo(s) on the Next.js web application. If the photo lacks GPS EXIF tags, the user is prompted to pin the capture point on the interactive map.
2. **Upload & Verification**: The photo is uploaded to Express (`POST /api/media/upload`). Express verifies MIME type, calculates SHA-256 hash, parses EXIF headers (timestamp, GPS coordinates, camera model), and writes the file to disk or object storage.
3. **Database Registration**: Express saves the `Media` record and spawns a `ProcessingJob` marked `QUEUED`.
4. **Model Inference**: Express invokes the Python FastAPI `/predict` endpoint. The ML service reads the image into memory, runs forward pass on the loaded YOLOv8 model, applies Non-Maximum Suppression (NMS), and returns bounding boxes.
5. **Persistence**: For each detected damage with confidence >= threshold, Express creates a `DamageRecord` referencing the `Media` ID, geospatial `Point`, damage class, and bounding box coordinates.
6. **Spatial Indexing & Visualization**: The frontend queries damages within the current map viewport (`$geoWithin` polygon bounding box) and renders interactive markers and overlays.
