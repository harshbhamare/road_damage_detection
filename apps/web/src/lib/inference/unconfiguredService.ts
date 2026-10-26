import { IInferenceService, InferenceServiceResponse } from './types';

export class ModelNotConfiguredService implements IInferenceService {
  name = 'Model Not Configured';

  async checkStatus(): Promise<{ available: boolean; mode: string; details: string }> {
    return {
      available: false,
      mode: 'unconfigured',
      details: 'No trained model weights installed. Python ML microservice offline.'
    };
  }

  async runInference(
    imageBuffer?: Buffer,
    filename?: string,
    confThreshold?: number,
    precisionMode?: 'high' | 'balanced' | 'sensitive'
  ): Promise<InferenceServiceResponse> {
    return {
      mode: 'unconfigured',
      isDemo: false,
      modelVersion: 'none',
      inferenceTimeMs: 0,
      detections: [],
      statusMessage: 'Inference skipped: Model is not configured.',
      disclaimer:
        'Model training pending. Train model on Colab using ml/notebooks/02_colab_training_pipeline.ipynb or enable demo mode in settings.'
    };
  }
}
