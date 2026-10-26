import { NextRequest, NextResponse } from 'next/server';
import { getInferenceService, getInferenceModeOverride, setInferenceModeOverride } from '@/lib/inference/service';
import { FastApiInferenceService } from '@/lib/inference/realService';

export async function GET() {
  try {
    const realService = new FastApiInferenceService();
    const realStatus = await realService.checkStatus();
    const activeService = await getInferenceService();
    const currentMode = getInferenceModeOverride();

    return NextResponse.json({
      success: true,
      serviceName: activeService.name,
      activeMode: currentMode,
      realMlService: {
        endpoint: process.env.ML_SERVICE_URL || 'http://localhost:8000',
        online: realStatus.available,
        details: realStatus.details
      },
      supportedClasses: [
        { code: 'D00', name: 'Longitudinal Crack', id: 0 },
        { code: 'D10', name: 'Transverse Crack', id: 1 },
        { code: 'D20', name: 'Alligator Crack', id: 2 },
        { code: 'D40', name: 'Pothole', id: 3 }
      ],
      trainingDetails: {
        framework: 'YOLOv8 Small (Ultralytics)',
        trainingEnvironment: 'Google Colab GPU',
        scriptLocation: 'ml/notebooks/02_colab_training_pipeline.ipynb',
        recommendedDataset: 'IEEE RDD2022 (India / Global)',
        inputResolution: '640x640'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;
    if (!['auto', 'real', 'demo', 'unconfigured'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
    }

    setInferenceModeOverride(mode);
    return NextResponse.json({ success: true, activeMode: mode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
