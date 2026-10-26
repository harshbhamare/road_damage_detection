import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMedia extends Document {
  _id: mongoose.Types.ObjectId;
  originalFilename: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  hasExifGps: boolean;
  roadName?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  exifData?: {
    captureTimestamp?: Date;
    cameraMake?: string;
    cameraModel?: string;
    altitudeMeters?: number;
  };
  locationSource: 'EXIF' | 'MANUAL' | 'UNAVAILABLE';
  uploadTimestamp: Date;
  status: 'PROCESSED' | 'FAILED';
}

const PointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) => {
          return (
            coords &&
            coords.length === 2 &&
            coords[0] >= -180 && coords[0] <= 180 &&
            coords[1] >= -90 && coords[1] <= 90
          );
        },
        message: 'Coordinates must be [longitude, latitude] within valid WGS84 ranges.'
      }
    }
  },
  { _id: false }
);

const MediaSchema = new Schema<IMedia>(
  {
    originalFilename: { type: String, required: true },
    storagePath: { type: String, required: true },
    publicUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    fileHashSha256: { type: String, required: true, index: true },
    hasExifGps: { type: Boolean, default: false },
    roadName: { type: String, default: 'Unspecified Road' },
    location: { type: PointSchema, default: undefined },
    exifData: {
      captureTimestamp: { type: Date },
      cameraMake: { type: String },
      cameraModel: { type: String },
      altitudeMeters: { type: Number }
    },
    locationSource: {
      type: String,
      enum: ['EXIF', 'MANUAL', 'UNAVAILABLE'],
      default: 'UNAVAILABLE'
    },
    uploadTimestamp: { type: Date, default: Date.now, index: true },
    status: {
      type: String,
      enum: ['PROCESSED', 'FAILED'],
      default: 'PROCESSED',
      index: true
    }
  },
  { timestamps: true }
);

MediaSchema.index({ location: '2dsphere' }, { sparse: true });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Media) {
  delete (mongoose.models as any).Media;
}

export const Media: Model<IMedia> =
  mongoose.models.Media || mongoose.model<IMedia>('Media', MediaSchema);
