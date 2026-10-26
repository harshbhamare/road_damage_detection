export interface RawBoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface NormalizedBoundingBox {
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

import { DistressCalculativeMetrics } from '../depthEngine';

export interface DetectionItem {
  class_id: number;
  class_code: 'D00' | 'D10' | 'D20' | 'D40';
  class_name: string;
  confidence: number;
  consensus?: boolean;
  box_xyxy: [number, number, number, number];
  box_normalized: [number, number, number, number];
  metrics?: DistressCalculativeMetrics;
}

export interface InferenceServiceResponse {
  mode: 'real' | 'demo' | 'unconfigured';
  isDemo: boolean;
  modelVersion: string;
  inferenceTimeMs: number;
  precisionMode?: 'high' | 'balanced' | 'sensitive';
  detections: DetectionItem[];
  statusMessage: string;
  disclaimer?: string;
}

export interface IInferenceService {
  name: string;
  runInference(
    imageBuffer: Buffer,
    filename: string,
    confThreshold?: number,
    precisionMode?: 'high' | 'balanced' | 'sensitive'
  ): Promise<InferenceServiceResponse>;
  checkStatus(): Promise<{ available: boolean; mode: string; details: string }>;
}
