import { Schema, model, Document, Types } from 'mongoose';

export interface IModelVersion extends Document {
  _id: Types.ObjectId;
  modelName: string;
  versionTag: string;
  framework: string;
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

const ModelVersionSchema = new Schema<IModelVersion>(
  {
    modelName: { type: String, required: true },
    versionTag: { type: String, required: true, unique: true },
    framework: { type: String, default: 'ultralytics-yolov8' },
    weightsPath: { type: String, required: true },
    classesSupported: [
      {
        code: { type: String, required: true },
        name: { type: String, required: true }
      }
    ],
    datasetUsed: { type: String, required: true },
    metrics: {
      mAP50: { type: Number, required: true },
      mAP50_95: { type: Number, required: true },
      precision: { type: Number, required: true },
      recall: { type: Number, required: true }
    },
    trainingDetails: {
      epochs: { type: Number, required: true },
      batchSize: { type: Number, required: true },
      imageResolution: { type: Number, default: 640 },
      trainedOn: { type: String, default: 'Google Colab' },
      trainingDate: { type: Date, default: Date.now }
    },
    isActive: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

export const ModelVersion = model<IModelVersion>('ModelVersion', ModelVersionSchema);
