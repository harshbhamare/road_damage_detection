import { IInferenceService } from './types';
import { FastApiInferenceService } from './realService';
import { PythonDirectInferenceService } from './pythonService';
import { DemoModeService } from './demoService';
import { ModelNotConfiguredService } from './unconfiguredService';

let activeOverride: 'auto' | 'real' | 'demo' | 'unconfigured' = 'auto';

export function setInferenceModeOverride(mode: 'auto' | 'real' | 'demo' | 'unconfigured') {
  activeOverride = mode;
}

export function getInferenceModeOverride() {
  return activeOverride;
}

export async function getInferenceService(): Promise<IInferenceService> {
  const modeSetting = process.env.INFERENCE_MODE || activeOverride;

  if (modeSetting === 'real') {
    const fastApiService = new FastApiInferenceService();
    const status = await fastApiService.checkStatus();
    if (status.available) {
      return fastApiService;
    }
    // If FastAPI was requested but not running, use the direct Python runner
    return new PythonDirectInferenceService();
  }

  if (modeSetting === 'demo') {
    return new DemoModeService();
  }

  if (modeSetting === 'unconfigured') {
    return new ModelNotConfiguredService();
  }

  // 'auto' mode:
  // Priority 1: High-speed FastAPI microservice daemon
  const fastApiService = new FastApiInferenceService();
  const fastApiStatus = await fastApiService.checkStatus();
  if (fastApiStatus.available) {
    return fastApiService;
  }

  // Priority 2: Direct Python YOLO CLI runner using local venv & weights
  const pythonDirectService = new PythonDirectInferenceService();
  const directStatus = await pythonDirectService.checkStatus();
  if (directStatus.available) {
    return pythonDirectService;
  }

  // Priority 3: Demo fallback only if neither FastAPI nor Python is available
  return new DemoModeService();
}
