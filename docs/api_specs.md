# REST API Specifications

This document outlines the API endpoints for both the Express Backend Gateway and the Python ML Microservice.

---

## 1. Express Backend Gateway (`services/backend`)

Base URL: `http://localhost:5000/api`

### 1.1 Media Endpoints

#### `POST /media/upload`
Uploads road imagery for damage processing.
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Image file (JPEG, PNG)
  - `latitude` (optional): User-pinned latitude if EXIF is missing
  - `longitude` (optional): User-pinned longitude if EXIF is missing
- **Response `201 Created`**:
```json
{
  "success": true,
  "mediaId": "664fa1e2b4...",
  "filename": "IMG_9102.jpg",
  "hasExifGps": true,
  "location": {
    "type": "Point",
    "coordinates": [77.5946, 12.9716]
  },
  "jobId": "664fa1e2b8..."
}
```

#### `GET /media/:id`
Fetches metadata and image details for a specific upload.

---

### 1.2 Damage Records Endpoints

#### `GET /damage/spatial`
Retrieves damage records within a geographic bounding box (for map viewport queries).
- **Query Parameters**:
  - `bbox`: `minLng,minLat,maxLng,maxLat` (e.g. `77.58,12.95,77.62,12.99`)
  - `types`: Optional comma-separated filter (`D00,D40`)
  - `minConfidence`: Optional minimum confidence threshold (`0.5`)
- **Response `200 OK`**: GeoJSON `FeatureCollection`:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [77.5946, 12.9716]
      },
      "properties": {
        "id": "664fa2...",
        "mediaId": "664fa1...",
        "damageType": "D40",
        "damageCategory": "Pothole",
        "confidence": 0.89,
        "verificationStatus": "UNVERIFIED",
        "createdAt": "2026-09-22T09:10:05Z"
      }
    }
  ]
}
```

#### `PATCH /damage/:id/verify`
Allows human operators to verify or reject a model-detected damage record.
- **Request Body**:
```json
{
  "status": "VERIFIED", // "VERIFIED" | "REJECTED"
  "verifiedBy": "operator_1"
}
```

---

### 1.3 Processing Jobs Endpoints

#### `GET /jobs/:id`
Polls the inference status of an uploaded image.
- **Response `200 OK`**:
```json
{
  "jobId": "664fa1e2b8...",
  "status": "COMPLETED", // "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED"
  "mediaId": "664fa1e2b4...",
  "damageCount": 2,
  "executionTimeMs": 320
}
```

---

## 2. Python ML Microservice (`services/ml-service`)

Base URL: `http://localhost:8000`

### 2.1 Inference Endpoint

#### `POST /predict`
Executes forward inference over an uploaded road image using the active model weights.
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `file`: Image file (raw bytes)
  - `conf_threshold`: Float (default `0.25`)
  - `iou_threshold`: Float (default `0.45`)
- **Response `200 OK`**:
```json
{
  "model_version": "v1.0.0",
  "inference_time_ms": 42.5,
  "detections_count": 2,
  "detections": [
    {
      "class_id": 3,
      "class_code": "D40",
      "class_name": "Pothole",
      "confidence": 0.892,
      "box_xyxy": [145.2, 320.1, 410.5, 580.4],
      "box_normalized": [0.385, 0.625, 0.368, 0.361]
    }
  ]
}
```

### 2.2 Health & Metadata Endpoints

#### `GET /health`
Returns microservice status, active model version, and device type (CPU / CUDA).

#### `GET /model-info`
Returns loaded model architecture, supported damage classes, and input image size.
