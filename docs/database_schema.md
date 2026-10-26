# Database Schema Documentation (MongoDB & Mongoose)

This document specifies the collections, fields, types, and indexes for the Road Damage Detection & Mapping Platform. All spatial fields strictly adhere to the **GeoJSON** standard to enable spatial indexing via MongoDB `2dsphere`.

---

## 1. `media` Collection

Stores records of uploaded road imagery/video and extracted metadata.

```typescript
interface IMedia {
  _id: Types.ObjectId;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  hasExifGps: boolean;
  location?: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  exifData?: {
    captureTimestamp?: Date;
    cameraMake?: string;
    cameraModel?: string;
    altitudeMeters?: number;
  };
  locationSource: "EXIF" | "USER_PINNED" | "UNKNOWN";
  uploadTimestamp: Date;
  status: "PENDING" | "PROCESSED" | "FAILED";
}
```

### Indexes:
- `location`: `2dsphere` (geospatial index)
- `fileHashSha256`: `1` (duplicate file prevention)
- `uploadTimestamp`: `-1` (chronological sorting)

---

## 2. `damagerecords` Collection

Stores individual road damage detections identified by ML inference or human review.

```typescript
interface IDamageRecord {
  _id: Types.ObjectId;
  mediaId: Types.ObjectId; // Reference to Media
  location: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  damageType: "D00" | "D10" | "D20" | "D40";
  damageCategory: string; // e.g., "Longitudinal Crack", "Transverse Crack", "Alligator Crack", "Pothole"
  confidence: number; // 0.0 to 1.0 (from ML inference)
  boundingBox: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  normalizedBoundingBox: {
    xCenter: number;
    yCenter: number;
    width: number;
    height: number;
  };
  verificationStatus: "UNVERIFIED" | "VERIFIED" | "REJECTED";
  verifiedBy?: string;
  verifiedAt?: Date;
  modelVersionId: Types.ObjectId; // Reference to ModelVersion
  createdAt: Date;
}
```

### Indexes:
- `location`: `2dsphere` (crucial for map bounding-box viewport queries)
- `damageType`: `1` (for category-based map filtering)
- `mediaId`: `1` (for fetching all damages in a specific image)
- `verificationStatus`: `1` (for QA/validation queues)

---

## 3. `modelversions` Collection

Maintains a rigorous audit trail of all deployed ML models and their empirical validation benchmarks.

```typescript
interface IModelVersion {
  _id: Types.ObjectId;
  modelName: string;
  versionTag: string; // e.g., "v1.0.0"
  framework: string; // e.g., "ultralytics-yolov8"
  weightsPath: string;
  classesSupported: Array<{
    code: string;
    name: string;
  }>;
  datasetUsed: string;
  metrics: {
    mAP50: number;
    mAP50_95: number;
    precision: number;
    recall: number;
  };
  trainingDetails: {
    epochs: number;
    batchSize: number;
    imageResolution: number;
    trainedOn: string;
    trainingDate: Date;
  };
  isActive: boolean;
}
```

---

## 4. `processingjobs` Collection

Orchestrates asynchronous ML batch inference jobs.

```typescript
interface IProcessingJob {
  _id: Types.ObjectId;
  mediaId: Types.ObjectId;
  modelVersionId?: Types.ObjectId;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  errorMessage?: string;
}
```

### Indexes:
- `status`: `1`
- `mediaId`: `1`
