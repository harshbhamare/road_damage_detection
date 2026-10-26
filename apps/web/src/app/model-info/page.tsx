'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  ExternalLink,
  BookOpen,
  RefreshCw,
  Sparkles,
  Zap,
  Activity,
  HardDrive
} from 'lucide-react';
import { ProvenanceBadge } from '@/components/StatusBadge';

export default function ModelInfoPage() {
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modeSwitching, setModeSwitching] = useState(false);

  const fetchInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/model-info');
      if (res.ok) {
        const data = await res.json();
        setModelInfo(data);
      }
    } catch (err) {
      console.warn('Failed to load model info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handleModeChange = async (newMode: string) => {
    setModeSwitching(true);
    try {
      const res = await fetch('/api/model-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      if (res.ok) {
        await fetchInfo();
      }
    } catch (err) {
      alert('Failed to update inference mode');
    } finally {
      setModeSwitching(false);
    }
  };

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.25rem 0.75rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '0.5rem'
            }}
          >
            <Sparkles size={14} />
            <span>Computer Vision & Deep Learning Engine</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Vision Engine Status & Architecture
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Inference engine specification, active YOLOv8 ensemble weights, and IEEE RDD benchmark taxonomy.
          </p>
        </div>

        <button
          onClick={fetchInfo}
          disabled={loading}
          className="md-btn-outlined"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Primary Inference Service Card */}
      <div className="md-card" style={{ marginBottom: '1.75rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem', fontWeight: 600 }}>
              Runtime Model Architecture
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="var(--primary)" />
              {modelInfo?.serviceName || 'Active Dual-Model YOLO Ensemble'}
            </h2>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Active Configuration: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--primary)', backgroundColor: 'var(--primary-container)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{modelInfo?.activeMode || 'auto'}</code>
            </div>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Override Engine Mode:</span>
            <div className="md-segmented">
              <button
                onClick={() => handleModeChange('auto')}
                disabled={modeSwitching}
                className={`md-segmented-btn ${modelInfo?.activeMode === 'auto' ? 'active' : ''}`}
              >
                Auto Detect
              </button>
              <button
                onClick={() => handleModeChange('real')}
                disabled={modeSwitching}
                className={`md-segmented-btn ${modelInfo?.activeMode === 'real' ? 'active' : ''}`}
              >
                YOLOv8 Only
              </button>
              <button
                onClick={() => handleModeChange('demo')}
                disabled={modeSwitching}
                className={`md-segmented-btn ${modelInfo?.activeMode === 'demo' ? 'active' : ''}`}
              >
                Demo Fallback
              </button>
            </div>
          </div>
        </div>

        {/* Status Callout Box */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-surface-variant)',
            border: '1px solid var(--outline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="var(--success)" />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {modelInfo?.statusMessage || 'Computer vision detection pipeline is active and calibrated.'}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Supports IEEE RDD multi-defect categorization and contour-tightened bounding proposals.
              </div>
            </div>
          </div>
          <Link href="/upload" className="md-btn-filled" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}>
            <span>Test Inference Studio</span>
          </Link>
        </div>
      </div>

      {/* Model Specifications Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Spec 1: Specialized Pothole Weights */}
        <div className="md-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <Shield size={18} color="var(--color-d40)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pothole Specialist</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            High-precision detector tuned for pavement cavities, dark asphalt recession boundaries, and rim-damage depressions.
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--outline)', paddingTop: '0.75rem' }}>
            Weight File: <code>pothole_peterhdd.pt</code> (22.5MB)
          </div>
        </div>

        {/* Spec 2: RDD Multiclass YOLOv8 */}
        <div className="md-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <Layers size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>RDD Multiclass Ensemble</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Trained on IEEE Global Road Damage Dataset for longitudinal joints (D00), transverse fractures (D10), and alligator mesh (D20).
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--outline)', paddingTop: '0.75rem' }}>
            Weight File: <code>rdd_yolov8.pt</code> (22.5MB)
          </div>
        </div>

        {/* Spec 3: PyTorch Acceleration */}
        <div className="md-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
            <Cpu size={18} color="var(--success)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>Compute & Acceleration</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            PyTorch 2.14 / Ultralytics 8.4 runtime with automated CUDA GPU offload and CPU multi-threaded fallback.
          </p>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--outline)', paddingTop: '0.75rem' }}>
            Average Latency: <strong>35ms - 80ms</strong> per frame
          </div>
        </div>
      </div>

      {/* Precision Tuning & False Positive Suppression Card */}
      <div className="md-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <Shield size={20} color="var(--primary)" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            High-Precision Post-Processing Pipeline
          </h3>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          To ensure reliable municipal inspections and eliminate phantom alarms, the engine executes a multi-stage precision filter:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              🎯 Calibrated Thresholds
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Preset options: <strong>High Precision (35%)</strong> for contractual audits, <strong>Balanced (25%)</strong> for municipal surveys, and <strong>Sensitive (15%)</strong> for hairline crack research.
            </div>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              🔀 Cross-Class NMS
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Resolves conflicting label overlaps (e.g. D40 Pothole vs D20 Alligator Crack) on the same pavement patch at IoU &ge; 0.28, retaining the dominant defect.
            </div>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              ⭐ Dual-Model Consensus
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              When both the pothole specialist and RDD multiclass models agree on a pothole, confidence is boosted by +0.12 and flagged as <code>Ensemble Verified</code>.
            </div>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              🌅 Horizon & Hood Filter
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Filters out detections in the upper 12% (sky, trees, oncoming trucks) and bottom 3% (car hood and wiper blade tips) of dashcam footage.
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Expansion & Training Hub Card */}
      <div className="md-card" style={{ marginBottom: '2rem', padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Dataset Expansion & Training Hub
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--primary-container)', color: 'var(--primary)' }}>
            Local & Google Colab GPU Ready
          </span>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Expand the model&apos;s capabilities by training on more road distress images using the automated data pipeline tools in <code>ml/</code>:
        </p>

        {/* Step-by-Step Training Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Step 1 */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              1. Download & Validate Raw Datasets
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Convert Pascal VOC XML or YOLO labels into stratified 70/20/10 train/val/test splits:
            </p>
            <pre style={{ margin: 0, padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--outline)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: 'var(--text-primary)' }}>
              services\ml-service\.venv\Scripts\python.exe ml/scripts/download_and_prep_data.py --source ./ml/data/raw --output ./ml/data/rdd_dataset
            </pre>
          </div>

          {/* Step 2 */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              2. Synthetic Road Distress Augmentation (Multiply 3x - 5x)
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Synthesize tree shadows, wet pavement puddle glares, camera motion blur, and horizontal flips:
            </p>
            <pre style={{ margin: 0, padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--outline)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: 'var(--text-primary)' }}>
              services\ml-service\.venv\Scripts\python.exe ml/scripts/augment_dataset.py --dataset ./ml/data/rdd_dataset --multiplier 3
            </pre>
          </div>

          {/* Step 3 */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-variant)', border: '1px solid var(--outline)' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              3. Train YOLOv8 & Auto-Deploy Weights
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Train with AdamW optimizer, cosine learning rate schedule, and auto-deploy best weights:
            </p>
            <pre style={{ margin: 0, padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--outline)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', overflowX: 'auto', color: 'var(--text-primary)' }}>
              services\ml-service\.venv\Scripts\python.exe ml/scripts/train_yolo.py --data ./ml/data/rdd_dataset/data.yaml --model yolov8s.pt --epochs 50 --batch 16 --deploy
            </pre>
          </div>

          {/* Colab Notebook Callout */}
          <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-container)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--on-primary-container)' }}>
                🚀 Free GPU Training on Google Colab
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--on-primary-container)', opacity: 0.9 }}>
                Use <code>ml/notebooks/02_colab_training_pipeline.ipynb</code> with free T4 or A100 GPU acceleration.
              </div>
            </div>
            <a
              href="https://colab.research.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="md-btn-filled"
              style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
            >
              <ExternalLink size={14} /> Open in Google Colab
            </a>
          </div>
        </div>
      </div>

      {/* IEEE Taxonomy Reference Table */}
      <div className="md-card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
          IEEE Global Road Damage Detection Taxonomy Reference
        </h3>
        <div className="md-table-container">
          <table className="md-table">
            <thead>
              <tr>
                <th>Class Code</th>
                <th>Distress Name</th>
                <th>Physical Characterization</th>
                <th>Civil Hazard Rating</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="md-chip md-chip-d40" style={{ fontWeight: 700 }}>D40</span></td>
                <td style={{ fontWeight: 600 }}>Pothole / Depression</td>
                <td>Localized surface bowl-shaped cavity with missing asphalt material</td>
                <td><span style={{ color: 'var(--color-d40)', fontWeight: 700 }}>Critical (Immediate Patch)</span></td>
              </tr>
              <tr>
                <td><span className="md-chip md-chip-d20" style={{ fontWeight: 700 }}>D20</span></td>
                <td style={{ fontWeight: 600 }}>Alligator / Fatigue Crack</td>
                <td>Interconnected polygonal mesh of cracks caused by repeated heavy vehicular loads</td>
                <td><span style={{ color: 'var(--color-d20)', fontWeight: 700 }}>Elevated (Structural Base)</span></td>
              </tr>
              <tr>
                <td><span className="md-chip md-chip-d10" style={{ fontWeight: 700 }}>D10</span></td>
                <td style={{ fontWeight: 600 }}>Transverse Linear Crack</td>
                <td>Perpendicular fracture across lane width caused by thermal contraction</td>
                <td><span style={{ color: 'var(--color-d10)', fontWeight: 700 }}>Moderate (Crack Seal)</span></td>
              </tr>
              <tr>
                <td><span className="md-chip md-chip-d00" style={{ fontWeight: 700 }}>D00</span></td>
                <td style={{ fontWeight: 600 }}>Longitudinal Joint Crack</td>
                <td>Linear fracture parallel to pavement centerline along construction joints</td>
                <td><span style={{ color: 'var(--color-d00)', fontWeight: 700 }}>Moderate (Joint Seal)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

