import React from 'react';
import Link from 'next/link';
import { Shield, BookOpen, Layers, CheckCircle2, ArrowRight } from 'lucide-react';

export default function BenchmarkPage() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
          Road Damage Detection Benchmarks
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Standardized criteria, evaluation methodology, and performance specifications for automated road distress recognition.
        </p>
      </div>

      {/* Dataset & Standards Card */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} color="#3b82f6" /> Dataset Standards & Specifications
        </h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          The detection models are grounded in the IEEE Road Damage Dataset (RDD) benchmark standards, capturing real-world urban and highway imagery under varied weather conditions, wet asphalt, low angles, and vehicle shadows.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>4</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Standard Distress Classes</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Pascal VOC & YOLO</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Annotation Formats</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>mAP@0.5</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Primary Benchmark Metric</div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>Multi-Scale Tiling</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Ensemble Inference Strategy</div>
          </div>
        </div>
      </div>

      {/* Evaluation Protocols */}
      <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Layers size={18} color="#10b981" /> Quality Assurance & Validation Protocols
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '3px' }} />
            <div>
              <strong style={{ color: '#f1f5f9', fontSize: '0.88rem' }}>Ensemble Confidence Verification:</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Combines high-detail pothole detection weights with general RDD crack detection weights to maximize recall while suppressing false positives.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '3px' }} />
            <div>
              <strong style={{ color: '#f1f5f9', fontSize: '0.88rem' }}>Non-Maximum Suppression (NMS):</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Automated bounding box deduplication via PyTorch torchvision NMS (IoU 0.45) merges overlapping slice windows cleanly.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0, marginTop: '3px' }} />
            <div>
              <strong style={{ color: '#f1f5f9', fontSize: '0.88rem' }}>Real EXIF Geolocation Extraction:</strong>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '2px 0 0 0' }}>
                Directly extracts GPS coordinates from mobile camera metadata and maps incidents to the interactive GIS heatmap.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link href="/upload" className="btn-primary" style={{ textDecoration: 'none', padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
          Start An Inspection <ArrowRight size={14} />
        </Link>
        <Link href="/records" className="btn-secondary" style={{ textDecoration: 'none', padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
          Browse Incidents
        </Link>
      </div>
    </div>
  );
}
