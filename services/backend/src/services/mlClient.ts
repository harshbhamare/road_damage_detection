import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

export interface MLInferenceDetection {
  class_id: number;
  class_code: 'D00' | 'D10' | 'D20' | 'D40';
  class_name: string;
  confidence: number;
  box_xyxy: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
  box_normalized: [number, number, number, number]; // [xCenter, yCenter, width, height]
}

export interface MLInferenceResponse {
  model_version: string;
  inference_time_ms: number;
  detections_count: number;
  detections: MLInferenceDetection[];
}

export class MLClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.ML_SERVICE_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Health check for Python ML inference service
   */
  async checkHealth(): Promise<{ status: string; model_loaded: boolean; device: string }> {
    const response = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
    return response.data;
  }

  /**
   * Sends an image file to Python ML microservice for real object detection
   */
  async runInference(
    filePath: string,
    confThreshold: number = 0.25,
    iouThreshold: number = 0.45
  ): Promise<MLInferenceResponse> {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found at path: ${absolutePath}`);
    }

    const fileStream = fs.createReadStream(absolutePath);
    const form = new FormData();
    form.append('file', fileStream, path.basename(absolutePath));
    form.append('conf_threshold', confThreshold.toString());
    form.append('iou_threshold', iouThreshold.toString());

    const response = await axios.post<MLInferenceResponse>(`${this.baseUrl}/predict`, form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 30000 // 30s timeout for model forward pass
    });

    return response.data;
  }
}

export const mlClient = new MLClient();
