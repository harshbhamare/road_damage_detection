import { IInferenceService, InferenceServiceResponse, DetectionItem } from './types';

export class FastApiInferenceService implements IInferenceService {
  name = 'Python FastAPI YOLOv8 Microservice';
  private baseUrl: string;

  constructor(baseUrl: string = process.env.ML_SERVICE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async checkStatus(): Promise<{ available: boolean; mode: string; details: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return {
          available: false,
          mode: 'real',
          details: `Service returned HTTP status ${res.status}`
        };
      }

      const data = await res.json();
      return {
        available: data.model_loaded === true,
        mode: 'real',
        details: data.model_loaded
          ? `Model Active (${data.weights_path}) on ${data.device}`
          : 'Service online but no model weights loaded'
      };
    } catch (err: any) {
      return {
        available: false,
        mode: 'real',
        details: `Python ML service offline (${err.message || 'connection refused'})`
      };
    }
  }

  async runInference(
    imageBuffer: Buffer,
    filename: string,
    confThreshold?: number,
    precisionMode?: 'high' | 'balanced' | 'sensitive'
  ): Promise<InferenceServiceResponse> {
    const formData = new FormData();
    const uint8 = new Uint8Array(imageBuffer);
    const lowerName = filename.toLowerCase();
    const mime = lowerName.endsWith('.png')
      ? 'image/png'
      : lowerName.endsWith('.webp')
      ? 'image/webp'
      : 'image/jpeg';
    const blob = new Blob([uint8], { type: mime });
    formData.append('file', blob, filename);
    if (confThreshold !== undefined) {
      formData.append('conf_threshold', confThreshold.toString());
    }
    if (precisionMode) {
      formData.append('precision_mode', precisionMode);
    }
    formData.append('iou_threshold', '0.40');


    const res = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `ML Service failed with status ${res.status}`);
    }

    const data = await res.json();

    return {
      mode: 'real',
      isDemo: false,
      modelVersion: data.model_version || 'v1.0.0-trained',
      inferenceTimeMs: data.inference_time_ms || 0,
      detections: data.detections || [],
      statusMessage: `Detected ${data.detections_count || 0} damage instance(s) using trained YOLOv8 model`
    };
  }
}
