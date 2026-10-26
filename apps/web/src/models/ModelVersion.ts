import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IModelVersion extends Document {
  _id: mongoose.Types.ObjectId;
  modelName: string;
  versionTag: string;
  status: 'not_configured' | 'baseline' | 'trained';
  framework: string;
  weightsPath?: string;
  classesSupported: Array<{
    code: string;
    name: string;
  }>;
  datasetUsed?: string;
  metrics?: {
    mAP50?: number;
    mAP50_95?: number;
    precision?: number;
    recall?: number;
  };
  isActive: boolean;
  notes?: string;
  createdAt: Date;
}

const ModelVersionSchema = new Schema<IModelVersion>(
  {
    modelName: { type: String, required: true },
    versionTag: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['not_configured', 'baseline', 'trained'],
      default: 'not_configured'
    },
    framework: { type: String, default: 'ultralytics-yolov8' },
    weightsPath: { type: String },
    classesSupported: [
      {
        code: { type: String, required: true },
        name: { type: String, required: true }
      }
    ],
    datasetUsed: { type: String },
    metrics: {
      mAP50: { type: Number },
      mAP50_95: { type: Number },
      precision: { type: Number },
      recall: { type: Number }
    },
    isActive: { type: Boolean, default: true },
    notes: { type: String }
  },
  { timestamps: true }
);

export const ModelVersion: Model<IModelVersion> =
  mongoose.models.ModelVersion || mongoose.model<IModelVersion>('ModelVersion', ModelVersionSchema);
