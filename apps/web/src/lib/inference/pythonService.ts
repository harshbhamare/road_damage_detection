import { IInferenceService, InferenceServiceResponse, DetectionItem } from './types';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export class PythonDirectInferenceService implements IInferenceService {
  name = 'Direct Python YOLO Micro-Runner (Local Venv)';

  private findMlServiceDir(): string {
    const candidates = [
      path.join(process.cwd(), 'services', 'ml-service'),
      path.resolve(process.cwd(), '..', '..', 'services', 'ml-service'),
      path.resolve(process.cwd(), '..', 'services', 'ml-service')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }
    return path.resolve(process.cwd(), 'services', 'ml-service');
  }

  private getPythonPath(): string {
    const mlDir = this.findMlServiceDir();
    const winPath = path.join(mlDir, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(winPath)) {
      return winPath;
    }
    const unixPath = path.join(mlDir, '.venv', 'bin', 'python');
    if (fs.existsSync(unixPath)) {
      return unixPath;
    }
    return 'python';
  }

  private getScriptPath(): string {
    const mlDir = this.findMlServiceDir();
    return path.join(mlDir, 'run_inference_cli.py');
  }

  async checkStatus(): Promise<{ available: boolean; mode: string; details: string }> {
    const pythonPath = this.getPythonPath();
    const scriptPath = this.getScriptPath();
    const hasPython = fs.existsSync(pythonPath);
    const hasScript = fs.existsSync(scriptPath);

    return {
      available: hasPython && hasScript,
      mode: 'real',
      details: hasPython && hasScript
        ? `Direct Python runner available at ${pythonPath}`
        : 'Python venv or CLI runner script missing'
    };
  }

  async runInference(
    imageBuffer: Buffer,
    filename: string,
    confThreshold?: number,
    precisionMode: 'high' | 'balanced' | 'sensitive' = 'balanced'
  ): Promise<InferenceServiceResponse> {
    const pythonPath = this.getPythonPath();
    const scriptPath = this.getScriptPath();

    if (!fs.existsSync(pythonPath) || !fs.existsSync(scriptPath)) {
      throw new Error(`Python direct runner unavailable: python=${fs.existsSync(pythonPath)}, script=${fs.existsSync(scriptPath)}`);
    }

    // Write buffer to temporary file for the CLI to read
    const tempDir = os.tmpdir();
    const ext = path.extname(filename) || '.jpg';
    const tempFile = path.join(tempDir, `road-inf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    await fs.promises.writeFile(tempFile, imageBuffer);

    const args = [scriptPath, tempFile, '--precision', precisionMode];
    if (confThreshold !== undefined && confThreshold > 0) {
      args.push('--conf', confThreshold.toString());
    }

    return new Promise<InferenceServiceResponse>((resolve, reject) => {
      const proc = spawn(pythonPath, args, {
        cwd: path.dirname(scriptPath)
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', async (code) => {
        // Clean up temp file
        try {
          if (fs.existsSync(tempFile)) {
            await fs.promises.unlink(tempFile);
          }
        } catch {}

        if (code !== 0) {
          return reject(new Error(`Python inference exited with code ${code}: ${stderr || stdout}`));
        }

        try {
          const startMarker = '___JSON_OUTPUT_START___';
          const endMarker = '___JSON_OUTPUT_END___';
          const startIdx = stdout.indexOf(startMarker);
          const endIdx = stdout.indexOf(endMarker);

          let jsonStr = '';
          if (startIdx !== -1 && endIdx !== -1) {
            jsonStr = stdout.substring(startIdx + startMarker.length, endIdx).trim();
          } else {
            // Fallback: take last line of stdout
            const lines = stdout.trim().split('\n');
            jsonStr = lines[lines.length - 1];
          }

          const parsed = JSON.parse(jsonStr);
          if (parsed.error) {
            return reject(new Error(parsed.error));
          }

          resolve({
            mode: 'real',
            isDemo: false,
            modelVersion: parsed.model_version || 'v1.2.0-precision-tuned',
            inferenceTimeMs: Math.round(parsed.inference_time_ms || 0),
            precisionMode: parsed.precision_mode || precisionMode,
            detections: parsed.detections || [],
            statusMessage: `Processed via Precision-Tuned YOLO Runner (${parsed.detections_count || 0} defects found, ${precisionMode} mode)`
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse Python inference JSON output: ${err.message}. Raw: ${stdout}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to launch Python process: ${err.message}`));
      });
    });
  }
}
