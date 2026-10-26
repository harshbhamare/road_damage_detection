import { Schema, model, Document, Types } from 'mongoose';

export interface IProcessingJob extends Document {
  _id: Types.ObjectId;
  mediaId: Types.ObjectId;
  modelVersionId?: Types.ObjectId;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  startedAt: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  errorMessage?: string;
}

const ProcessingJobSchema = new Schema<IProcessingJob>(
  {
    mediaId: { type: Schema.Types.ObjectId, ref: 'Media', required: true, index: true },
    modelVersionId: { type: Schema.Types.ObjectId, ref: 'ModelVersion' },
    status: {
      type: String,
      enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'QUEUED',
      index: true
    },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    executionTimeMs: { type: Number },
    errorMessage: { type: String }
  },
  { timestamps: true }
);

export const ProcessingJob = model<IProcessingJob>('ProcessingJob', ProcessingJobSchema);
