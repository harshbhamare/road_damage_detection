'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  Shield,
  FileText,
  AlertCircle,
  Camera,
  Layers,
  ExternalLink,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import DetectionCanvas from '@/components/DetectionCanvas';
import { VerificationBadge, ProvenanceBadge, DefectBadge } from '@/components/StatusBadge';
import { calculatePci } from '@/lib/pciEngine';

export default function RecordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [record, setRecord] = useState<any>(null);
  const [siblingDamages, setSiblingDamages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecord = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/records/${id}`);
      if (!res.ok) throw new Error('Record not found');
      const data = await res.json();
      setRecord(data.record);
      setSiblingDamages(data.siblingDamages || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, [id]);

  const handleStatusUpdate = async (newStatus: 'VERIFIED' | 'REJECTED') => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          verifiedBy: 'Civil Engineering Inspector'
        })
      });

      if (res.ok) {
        setRecord((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!confirm('Are you sure you want to delete this incident record? This action cannot be reversed.')) {
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch(`/api/records/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete record');
      router.push('/records');
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--outline)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '1rem' }} />
        <div>Loading Incident Telemetry...</div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div style={{ padding: '4rem 2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--error-container)', color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
          <AlertCircle size={24} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Record Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {error || 'The requested incident record does not exist or may have been removed.'}
        </p>
        <Link href="/records" className="md-btn-outlined">
          &larr; Return to Records Registry
        </Link>
      </div>
    );
  }

  const allBoxes = [];
  if (record.boundingBox) {
    allBoxes.push({
      ...record.boundingBox,
      class_code: record.damageType,
      class_name: record.damageCategory,
      confidence: record.confidence
    });
  }
  siblingDamages.forEach((s) => {
    if (s.boundingBox) {
      allBoxes.push({
        ...s.boundingBox,
        class_code: s.damageType,
        class_name: s.damageCategory,
        confidence: s.confidence
      });
    }
  });

  const pci = calculatePci([
    { class_code: record.damageType, confidence: record.confidence },
    ...siblingDamages.map((s) => ({ class_code: s.damageType, confidence: s.confidence }))
  ]);

  const imgUrl = record.mediaId?.publicUrl || record.media?.publicUrl || '/samples/sample-pothole-1.jpg';

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Top Breadcrumb & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <Link href="/records" className="md-btn-outlined" style={{ fontSize: '0.84rem', padding: '0.4rem 0.85rem' }}>
          <ArrowLeft size={14} /> Back to Records
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => handleStatusUpdate('VERIFIED')}
            disabled={updating || record.status === 'VERIFIED'}
            className="md-btn-filled"
            style={{ backgroundColor: 'var(--success)', fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
          >
            <Check size={14} /> Verify Incident
          </button>
          <button
            onClick={() => handleStatusUpdate('REJECTED')}
            disabled={updating || record.status === 'REJECTED'}
            className="md-btn-outlined"
            style={{ color: 'var(--error)', borderColor: 'var(--error)', fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
          >
            <X size={14} /> Mark False Alarm
          </button>
          <button
            onClick={handleDeleteRecord}
            disabled={updating}
            className="md-btn-icon"
            style={{ color: 'var(--error)' }}
            title="Delete Record"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Left: Canvas & Bounding Boxes */}
        <div className="md-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <DefectBadge code={record.damageType} name={record.damageCategory} />
              <VerificationBadge status={record.status} />
            </div>
            <ProvenanceBadge isDemo={record.isDemo} />
          </div>

          <DetectionCanvas
            imageUrl={imgUrl}
            boxes={allBoxes}
            isDemo={record.isDemo}
          />
        </div>

        {/* Right: Technical Specifications & PCI */}
        <div>
          {/* ASTM D6433 PCI Card */}
          <div className="md-card" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-surface-variant)', borderLeft: `4px solid ${pci.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  ASTM D6433 Distress Impact
                </span>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  PCI Impact: {pci.rating} ({pci.pciScore}/100)
                </div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: `${pci.hazardColor}20`,
                  color: pci.hazardColor
                }}
              >
                {pci.hazardLevel} Priority
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              {pci.recommendedAction}
            </p>
          </div>

          {/* Incident Metadata Card */}
          <div className="md-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              Survey & Geometric Details
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--outline)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Road Corridor:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{record.roadName || 'Unnamed Corridor'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--outline)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Detection Confidence:</span>
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{(record.confidence * 100).toFixed(1)}%</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--outline)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>GPS Coordinates:</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: record.hasLocation ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {record.latitude && record.longitude
                    ? `${record.latitude.toFixed(6)}, ${record.longitude.toFixed(6)}`
                    : 'Not geocoded'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--outline)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Bounding Proposal:</span>
                <code style={{ fontSize: '0.8rem' }}>
                  {record.boundingBox
                    ? `[${record.boundingBox.xmin}, ${record.boundingBox.ymin}, ${record.boundingBox.xmax}, ${record.boundingBox.ymax}]`
                    : 'N/A'}
                </code>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--outline)', paddingBottom: '0.6rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Survey Timestamp:</span>
                <span>{new Date(record.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {record.hasLocation && record.latitude && record.longitude && (
              <div style={{ marginTop: '1.5rem' }}>
                <Link
                  href={`/map?lat=${record.latitude}&lng=${record.longitude}`}
                  className="md-btn-outlined"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <MapPin size={15} /> Locate on GIS Spatial Map
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
