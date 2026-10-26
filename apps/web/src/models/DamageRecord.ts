import mongoose, { Schema, Document, Model } from 'mongoose';

export type DamageCode = 'D00' | 'D10' | 'D20' | 'D40';

export interface IDamageRecord extends Document {
  _id: mongoose.Types.ObjectId;
  mediaId: mongoose.Types.ObjectId;
  roadName: string;
  damageType: DamageCode;
  damageCategory: string;
  confidence: number;
  boundingBox?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  normalizedBoundingBox?: {
    xCenter: number;
    yCenter: number;
    width: number;
    height: number;
  };
  hasLocation: boolean;
  latitude?: number;
  longitude?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  locationSource: 'EXIF' | 'MANUAL' | 'UNAVAILABLE';
  modelVersion: string;
  isDemo: boolean;
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
  metrics?: any;
  createdAt: Date;
  updatedAt: Date;
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
      required: true
    }
  },
  { _id: false }
);

const DamageRecordSchema = new Schema<IDamageRecord>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    roadName: { type: String, default: 'Unspecified Road', index: true },
    damageType: {
      type: String,
      enum: ['D00', 'D10', 'D20', 'D40'],
      required: true,
      index: true
    },
    damageCategory: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0.0, max: 1.0 },
    boundingBox: {
      xmin: { type: Number },
      ymin: { type: Number },
      xmax: { type: Number },
      ymax: { type: Number }
    },
    normalizedBoundingBox: {
      xCenter: { type: Number },
      yCenter: { type: Number },
      width: { type: Number },
      height: { type: Number }
    },
    hasLocation: { type: Boolean, default: false, index: true },
    latitude: { type: Number },
    longitude: { type: Number },
    location: { type: PointSchema, default: undefined },
    locationSource: {
      type: String,
      enum: ['EXIF', 'MANUAL', 'UNAVAILABLE'],
      default: 'UNAVAILABLE'
    },
    modelVersion: { type: String, default: 'unconfigured' },
    isDemo: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'REJECTED'],
      default: 'UNVERIFIED',
      index: true
    },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    notes: { type: String },
    metrics: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

DamageRecordSchema.index({ location: '2dsphere' }, { sparse: true });

if (process.env.NODE_ENV !== 'production' && mongoose.models.DamageRecord) {
  delete (mongoose.models as any).DamageRecord;
}

export const DamageRecord: Model<IDamageRecord> =
  mongoose.models.DamageRecord || mongoose.model<IDamageRecord>('DamageRecord', DamageRecordSchema);
