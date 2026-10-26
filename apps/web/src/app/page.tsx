'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  UploadCloud,
  Layers,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileImage,
  Activity,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Zap,
  Wrench
} from 'lucide-react';
import { VerificationBadge, ProvenanceBadge, DefectBadge } from '@/components/StatusBadge';
import { SAMPLE_ROAD_PRESETS } from '@/lib/sampleImages';
import { calculatePci } from '@/lib/pciEngine';

interface StatsData {
  totalRecords: number;
  totalMedia: number;
  categories: {
    D00: number;
    D10: number;
    D20: number;
    D40: number;
  };
  status: {
    verified: number;
    unverified: number;
    rejected: number;
  };
  spatial: {
    withLocation: number;
    withoutLocation: number;
  };
  provenance: {
    realModel: number;
    demoFallback: number;
  };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentRecords(data.recentRecords || []);
      }
    } catch (err) {
      console.warn('Dashboard fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute overall network PCI from recorded distress counts
  const totalDefects = stats?.totalRecords ?? 0;
  const mockDefectList = [
    ...Array(stats?.categories?.D40 || 0).fill({ class_code: 'D40', confidence: 0.85 }),
    ...Array(stats?.categories?.D20 || 0).fill({ class_code: 'D20', confidence: 0.8 }),
    ...Array(stats?.categories?.D10 || 0).fill({ class_code: 'D10', confidence: 0.75 }),
    ...Array(stats?.categories?.D00 || 0).fill({ class_code: 'D00', confidence: 0.75 })
  ];
  const networkPci = calculatePci(mockDefectList);

  return (
    <div className="mesh-ambient-hero" style={{ padding: '2rem 2.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Material Hero & Action Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          zIndex: 1
        }}
      >
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
              marginBottom: '0.6rem'
            }}
          >
            <Sparkles size={14} />
            <span>Automated Pavement Distress & Health Intelligence</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Infrastructure Health Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '680px' }}>
            Computer vision telemetry detecting potholes and linear cracking with ASTM D6433 Pavement Condition Index (PCI) analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchData}
            disabled={loading}
            className="md-btn-outlined"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link href="/upload" className="md-btn-filled">
            <UploadCloud size={16} />
            <span>New Road Survey</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI & Health Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}
      >
        {/* Card 1: Network PCI Score */}
        <div className="md-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Network PCI Health Score
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-container)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: networkPci.color, letterSpacing: '-0.02em' }}>
              {networkPci.pciScore}
            </span>
            <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>/ 100</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                backgroundColor: `${networkPci.color}20`,
                color: networkPci.color
              }}
            >
              {networkPci.rating}
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            ASTM D6433 rating across all surveyed road corridors
          </p>
        </div>

        {/* Card 2: Total Detected Defects */}
        <div className="md-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Total Distress Items
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--primary-container)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {stats?.totalRecords ?? 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Identified across {stats?.totalMedia ?? 0} photographic road surveys
          </p>
        </div>

        {/* Card 3: Critical Potholes (D40) */}
        <div className="md-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Critical Potholes (D40)
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-d40-container)',
                color: 'var(--color-d40)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-d40)', letterSpacing: '-0.02em' }}>
            {stats?.categories?.D40 ?? 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            High severity cavities requiring rapid cold/hot patch backfill
          </p>
        </div>

        {/* Card 4: GIS Mapped Locations */}
        <div className="md-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Mapped GIS Hotspots
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--success-container)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MapPin size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.02em' }}>
            {stats?.spatial?.withLocation ?? 0}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Spatial coordinates pinned on interactive GIS satellite map
          </p>
        </div>
      </div>

      {/* ASTM D6433 PCI Maintenance Recommendation Banner */}
      <div
        className="md-card"
        style={{
          marginBottom: '2rem',
          backgroundColor: 'var(--bg-surface-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.25rem',
          padding: '1.25rem 1.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--primary-container)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Wrench size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Maintenance Recommendation &bull; {networkPci.urgency}
            </div>
            <div style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
              {networkPci.recommendedAction}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Cost Benchmark</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {networkPci.estimatedCostPerSqm.usd} / m² ({networkPci.estimatedCostPerSqm.inr}/sqm)
            </div>
          </div>
          <Link href="/records" className="md-btn-tonal" style={{ fontSize: '0.84rem', padding: '0.45rem 1rem' }}>
            <span>Review Distress Register</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* 1-Click Sample Testing Strip */}
      <div className="md-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="var(--primary)" /> Quick 1-Click Road Inspection Samples
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Instantly test computer vision detection on real road distress benchmarks without uploading
            </p>
          </div>
          <Link href="/upload" className="md-btn-outlined" style={{ fontSize: '0.8rem', padding: '0.35rem 0.85rem' }}>
            <span>Open Inspection Studio &rarr;</span>
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem'
          }}
        >
          {SAMPLE_ROAD_PRESETS.map((sample) => (
            <Link
              key={sample.id}
              href={`/upload?sample=${sample.id}`}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                display: 'block'
              }}
            >
              <div
                className="md-card-interactive"
                style={{
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--outline)',
                  backgroundColor: 'var(--bg-surface)'
                }}
              >
                <div style={{ width: '100%', height: '115px', borderRadius: 'var(--radius-sm)', overflow: 'hidden', marginBottom: '0.65rem', position: 'relative' }}>
                  <img
                    src={sample.url}
                    alt={sample.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: sample.tagColor,
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.25)'
                    }}
                  >
                    {sample.classCode}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      right: '6px',
                      padding: '0.15rem 0.45rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(4px)',
                      color: '#ffffff',
                      fontSize: '0.65rem',
                      fontWeight: 600
                    }}
                  >
                    1-Click Test
                  </span>
                </div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sample.title}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{sample.category}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Inspect &rarr;</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Distress Category Breakdown Grid */}
      <div className="md-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
          IEEE RDD Damage Taxonomy Distribution
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* D40 Pothole */}
          <div className="md-card-flat" style={{ borderLeft: '4px solid var(--color-d40)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="md-chip md-chip-d40" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                D40 &bull; Pothole
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {totalDefects > 0 ? Math.round(((stats?.categories?.D40 || 0) / totalDefects) * 100) : 0}%
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-d40)' }}>
              {stats?.categories?.D40 ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Surface cavities & depressions
            </div>
          </div>

          {/* D20 Alligator */}
          <div className="md-card-flat" style={{ borderLeft: '4px solid var(--color-d20)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="md-chip md-chip-d20" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                D20 &bull; Alligator
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {totalDefects > 0 ? Math.round(((stats?.categories?.D20 || 0) / totalDefects) * 100) : 0}%
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-d20)' }}>
              {stats?.categories?.D20 ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Fatigue mesh fissures
            </div>
          </div>

          {/* D10 Transverse */}
          <div className="md-card-flat" style={{ borderLeft: '4px solid var(--color-d10)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="md-chip md-chip-d10" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                D10 &bull; Transverse
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {totalDefects > 0 ? Math.round(((stats?.categories?.D10 || 0) / totalDefects) * 100) : 0}%
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-d10)' }}>
              {stats?.categories?.D10 ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Lateral thermal cracks
            </div>
          </div>

          {/* D00 Longitudinal */}
          <div className="md-card-flat" style={{ borderLeft: '4px solid var(--color-d00)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span className="md-chip md-chip-d00" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                D00 &bull; Longitudinal
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {totalDefects > 0 ? Math.round(((stats?.categories?.D00 || 0) / totalDefects) * 100) : 0}%
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-d00)' }}>
              {stats?.categories?.D00 ?? 0}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Linear wheelpath joints
            </div>
          </div>
        </div>
      </div>

      {/* Recent Road Surveys Table */}
      <div className="md-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>Recent Distress Records</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Processed roadway images and detected distresses
            </p>
          </div>
          <Link href="/records" className="md-btn-outlined" style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
            <span>View Full Registry &rarr;</span>
          </Link>
        </div>

        {recentRecords.length === 0 ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No records found. <Link href="/upload" style={{ color: 'var(--primary)', fontWeight: 600 }}>Start your first inspection scan</Link>.
          </div>
        ) : (
          <div className="md-table-container">
            <table className="md-table">
              <thead>
                <tr>
                  <th>Thumbnail</th>
                  <th>Defect Code</th>
                  <th>Road Corridor</th>
                  <th>Confidence</th>
                  <th>GPS Coordinates</th>
                  <th>Inference</th>
                  <th>Audit Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentRecords.slice(0, 6).map((rec) => (
                  <tr key={rec._id}>
                    <td>
                      {rec.mediaId?.publicUrl ? (
                        <img
                          src={rec.mediaId.publicUrl}
                          alt="Distress preview"
                          style={{
                            width: '52px',
                            height: '38px',
                            objectFit: 'cover',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--outline)'
                          }}
                        />
                      ) : (
                        <div style={{ width: '52px', height: '38px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-surface-variant)' }} />
                      )}
                    </td>
                    <td>
                      <DefectBadge code={rec.damageType} name={rec.damageCategory} />
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {rec.roadName || 'Unnamed Highway'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {(rec.confidence * 100).toFixed(1)}%
                    </td>
                    <td style={{ fontSize: '0.82rem', color: rec.hasLocation ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {rec.hasLocation && rec.latitude && rec.longitude
                        ? `${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}`
                        : 'No GPS'}
                    </td>
                    <td>
                      <ProvenanceBadge isDemo={rec.isDemo} />
                    </td>
                    <td>
                      <VerificationBadge status={rec.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        href={`/map?lat=${rec.latitude || 19.8762}&lng=${rec.longitude || 75.3433}`}
                        className="md-btn-outlined"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                      >
                        <MapPin size={12} />
                        <span>Map</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
