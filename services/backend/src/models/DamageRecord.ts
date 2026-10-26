import { Schema, model, Document, Types } from 'mongoose';

export type DamageCode = 'D00' | 'D10' | 'D20' | 'D40';

export interface IDamageRecord extends Document {
  _id: Types.ObjectId;
  mediaId: Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  damageType: DamageCode;
  damageCategory: string;
  confidence: number;
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
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: Date;
  modelVersionId?: Types.ObjectId;
  createdAt: Date;
}

const DamageRecordSchema = new Schema<IDamageRecord>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: (coords: number[]) => {
            return (
              coords.length === 2 &&
              coords[0] >= -180 && coords[0] <= 180 &&
              coords[1] >= -90 && coords[1] <= 90
            );
          },
          message: 'Location coordinates must be valid [longitude, latitude] format.'
        }
      }
    },
    damageType: {
      type: String,
      enum: ['D00', 'D10', 'D20', 'D40'],
      required: true,
      index: true
    },
    damageCategory: { type: String, required: true },
    confidence: { type: Number, required: true, min: 0.0, max: 1.0 },
    boundingBox: {
      xmin: { type: Number, required: true },
      ymin: { type: Number, required: true },
      xmax: { type: Number, required: true },
      ymax: { type: Number, required: true }
    },
    normalizedBoundingBox: {
      xCenter: { type: Number, required: true },
      yCenter: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true }
    },
    verificationStatus: {
      type: String,
      enum: ['UNVERIFIED', 'VERIFIED', 'REJECTED'],
      default: 'UNVERIFIED',
      index: true
    },
    verifiedBy: { type: String },
    verifiedAt: { type: Date },
    modelVersionId: { type: Schema.Types.ObjectId, ref: 'ModelVersion' },
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

DamageRecordSchema.index({ location: '2dsphere' });

export const DamageRecord = model<IDamageRecord>('DamageRecord', DamageRecordSchema);
