import { Schema, model, Document, Types } from 'mongoose';

export interface IMedia extends Document {
  _id: Types.ObjectId;
  originalFilename: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  fileHashSha256: string;
  hasExifGps: boolean;
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
  locationSource: 'EXIF' | 'USER_PINNED' | 'UNKNOWN';
  uploadTimestamp: Date;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
}

const MediaSchema = new Schema<IMedia>(
  {
    originalFilename: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSizeBytes: { type: Number, required: true },
    fileHashSha256: { type: String, required: true, index: true },
    hasExifGps: { type: Boolean, default: false },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        validate: {
          validator: (coords: number[]) => {
            if (!coords || coords.length === 0) return true;
            return (
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&
              coords[1] >= -90 && coords[1] <= 90
            );
        type: [Number]
      }
    },
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

export const Media = model<IMedia>('Media', MediaSchema);
