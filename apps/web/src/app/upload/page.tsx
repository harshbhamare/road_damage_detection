'use client';

import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  UploadCloud,
  MapPin,
  Compass,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Layers,
  Sparkles,
  Map,
  FileText,
  RotateCcw,
  Sliders,
  Check,
  X,
  Zap,
  TrendingUp,
  Download,
  FolderArchive
} from 'lucide-react';
import DetectionCanvas from '@/components/DetectionCanvas';
import { VerificationBadge, ProvenanceBadge, DefectBadge } from '@/components/StatusBadge';
import { SAMPLE_ROAD_PRESETS, SampleImagePreset } from '@/lib/sampleImages';
import { calculatePci, PciAssessment } from '@/lib/pciEngine';
import DepthProfileCard from '@/components/DepthProfileCard';
import DeteriorationForecastCard from '@/components/DeteriorationForecastCard';
import WorkOrderModal from '@/components/WorkOrderModal';

function UploadContent() {
  const searchParams = useSearchParams();
  const sampleParam = searchParams.get('sample');

  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [roadName, setRoadName] = useState<string>('Jalna Road Highway Corridor');
  const [userLat, setUserLat] = useState<string>('19.8762');
  const [userLng, setUserLng] = useState<string>('75.3433');
  const [hasCustomLocation, setHasCustomLocation] = useState<boolean>(true);
  const [precisionMode, setPrecisionMode] = useState<'high' | 'balanced' | 'sensitive'>('balanced');
  const [confThreshold, setConfThreshold] = useState<number>(0.25);
  const [uploading, setUploading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [verifiedMap, setVerifiedMap] = useState<Record<number, 'VERIFIED' | 'REJECTED'>>({});
  const [showWorkOrder, setShowWorkOrder] = useState<boolean>(false);

  // Batch survey states
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [batchResults, setBatchResults] = useState<any[]>([]);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  // Auto-load sample preset if URL param present
  useEffect(() => {
    if (sampleParam) {
      const preset = SAMPLE_ROAD_PRESETS.find((p) => p.id === sampleParam);
      if (preset) {
        handleSelectPreset(preset);
      }
    }
  }, [sampleParam]);

  const handleSelectPreset = async (preset: SampleImagePreset) => {
    try {
      setUploading(true);
      setErrorMsg(null);
      setRoadName(preset.roadName);
      setUserLat(preset.latitude);
      setUserLng(preset.longitude);
      setHasCustomLocation(true);
      setPreviewUrl(preset.url);

      // Fetch sample as blob to create real File object
      const res = await fetch(preset.url);
      const blob = await res.blob();
      const ext = preset.url.split('.').pop() || 'jpg';
      const sampleFile = new File([blob], `${preset.id}.${ext}`, { type: blob.type || 'image/jpeg' });
      setFile(sampleFile);
      setResult(null);
      setVerifiedMap({});
    } catch (err: any) {
      console.warn('Sample preset load error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setResult(null);
      setErrorMsg(null);
      setVerifiedMap({});
    }
  };

  const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const list = Array.from(e.target.files);
      setBatchFiles(list);
      setBatchResults([]);
      setBatchProgress(0);
    }
  };

  const handleFetchCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude.toFixed(6));
          setUserLng(pos.coords.longitude.toFixed(6));
          setHasCustomLocation(true);
        },
        (err) => {
          setErrorMsg(`Unable to fetch device GPS: ${err.message}`);
        }
      );
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setErrorMsg('Please select or drag a roadway image to inspect.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roadName', roadName.trim() || 'Highway Road');

    if (hasCustomLocation && userLat && userLng) {
      formData.append('latitude', userLat.trim());
      formData.append('longitude', userLng.trim());
    }

    formData.append('confThreshold', confThreshold.toString());
    formData.append('precisionMode', precisionMode);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.details || 'Analysis failed');
      }

      setResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Inspection failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRunBatch = async () => {
    if (batchFiles.length === 0) return;
    setBatchProcessing(true);
    setBatchResults([]);
    const results: any[] = [];

    for (let i = 0; i < batchFiles.length; i++) {
      const curFile = batchFiles[i];
      const formData = new FormData();
      formData.append('file', curFile);
      formData.append('roadName', `${roadName} (Survey Point ${i + 1})`);
      if (hasCustomLocation && userLat && userLng) {
        // Offset coords slightly for corridor simulation
        const latOffset = (parseFloat(userLat) + i * 0.0015).toFixed(6);
        const lngOffset = (parseFloat(userLng) + i * 0.0015).toFixed(6);
        formData.append('latitude', latOffset);
        formData.append('longitude', lngOffset);
      }
      formData.append('confThreshold', confThreshold.toString());
      formData.append('precisionMode', precisionMode);

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          results.push(data);
        }
      } catch (err) {

        console.warn('Batch item error:', err);
      }
      setBatchProgress(Math.round(((i + 1) / batchFiles.length) * 100));
    }

    setBatchResults(results);
    setBatchProcessing(false);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setErrorMsg(null);
    setHighlightIndex(null);
    setVerifiedMap({});
  };

  const handleVerifyDefect = async (idx: number, status: 'VERIFIED' | 'REJECTED') => {
    setVerifiedMap((prev) => ({ ...prev, [idx]: status }));
    const record = result?.records?.[idx];
    if (record?._id) {
      try {
        await fetch('/api/records', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: record._id, status })
        });
      } catch (err) {
        console.warn('Status patch notice:', err);
      }
    }
  };

  const detections = result?.inference?.detections || [];
  const pci: PciAssessment | null = result?.pci || (detections.length > 0 ? calculatePci(detections) : null);

  const boxesForCanvas = detections.map((d: any) => ({
    xmin: d.box_xyxy[0],
    ymin: d.box_xyxy[1],
    xmax: d.box_xyxy[2],
    ymax: d.box_xyxy[3],
    class_code: d.class_code,
    class_name: d.class_name,
    confidence: d.confidence,
    metrics: d.metrics
  }));

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
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
            <span>AI Automated Pavement Inspection Studio</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
            Road Survey & Detection Studio
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Upload roadway imagery for instant computer vision distress localization, ASTM D6433 health index calculation, and GIS tagging.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Mode Switcher */}
          <div className="md-segmented">
            <button
              onClick={() => setActiveTab('single')}
              className={`md-segmented-btn ${activeTab === 'single' ? 'active' : ''}`}
            >
              <FileImage size={15} />
              <span>Single Scan</span>
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`md-segmented-btn ${activeTab === 'batch' ? 'active' : ''}`}
            >
              <FolderArchive size={15} />
              <span>Batch Survey</span>
            </button>
          </div>

          {result && (
            <button
              onClick={handleReset}
              className="md-btn-outlined"
            >
              <RotateCcw size={15} />
              <span>Scan Another</span>
            </button>
          )}
        </div>
      </div>

      {/* 1-Click Sample Preset Strip */}
      <div className="md-card" style={{ marginBottom: '1.75rem', padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              1-Click Sample Distress Benchmarks
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              (Click to test detection immediately)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {SAMPLE_ROAD_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className="md-chip"
              style={{
                flexShrink: 0,
                padding: '0.4rem 0.85rem',
                backgroundColor: 'var(--bg-surface-variant)',
                border: '1px solid var(--outline)'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: p.tagColor
                }}
              />
              <span style={{ fontWeight: 600 }}>{p.classCode}</span>
              <span>&bull;</span>
              <span>{p.title.split('(')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Single Inspection Layout */}
      {activeTab === 'single' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 420px) 1fr',
            gap: '1.75rem',
            alignItems: 'start'
          }}
        >
          {/* Left Column: Setup & Survey Parameters */}
          <div className="md-card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileImage size={18} color="var(--primary)" />
              <span>Survey Configuration</span>
            </h2>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--outline)',
                borderRadius: 'var(--radius-md)',
                padding: file ? '1.25rem' : '2.25rem 1.25rem',
                textAlign: 'center',
                backgroundColor: 'var(--bg-surface-variant)',
                cursor: 'pointer',
                marginBottom: '1.25rem',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {previewUrl ? (
                <div>
                  <img
                    src={previewUrl}
                    alt="Inspection preview"
                    style={{
                      maxHeight: '160px',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '0.75rem',
                      boxShadow: 'var(--elevation-1)'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {file?.name || 'Sample Image Loaded'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px' }}>
                    Click to change road photo
                  </div>
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--primary-container)',
                      color: 'var(--primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem'
                    }}
                  >
                    <UploadCloud size={24} />
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Click or drag & drop road image
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    JPEG, PNG or WebP &bull; Up to 50MB
                  </div>
                </div>
              )}
            </div>

            {/* Road Corridor Name */}
            <div className="md-input-group">
              <label className="md-label">Road Corridor Identification</label>
              <input
                type="text"
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                placeholder="e.g. Jalna Road Highway Corridor KM 4"
                className="md-input"
              />
            </div>

            {/* Geospatial GPS Coordinates */}
            <div className="md-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="md-label" style={{ margin: 0 }}>Spatial Coordinates (GPS)</label>
                <button
                  type="button"
                  onClick={handleFetchCurrentLocation}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Compass size={13} /> Fetch Current Device GPS
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <input
                  type="text"
                  placeholder="Latitude (e.g. 19.8762)"
                  value={userLat}
                  onChange={(e) => setUserLat(e.target.value)}
                  className="md-input"
                />
                <input
                  type="text"
                  placeholder="Longitude (e.g. 75.3433)"
                  value={userLng}
                  onChange={(e) => setUserLng(e.target.value)}
                  className="md-input"
                />
              </div>
            </div>

            {/* Precision Calibration Mode */}
            <div className="md-input-group">
              <label className="md-label">Precision Calibration Preset</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPrecisionMode('high');
                    setConfThreshold(0.35);
                  }}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: precisionMode === 'high' ? '2px solid var(--primary)' : '1px solid var(--outline)',
                    backgroundColor: precisionMode === 'high' ? 'var(--primary-container)' : 'transparent',
                    color: precisionMode === 'high' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>🎯 High Precision</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>Audits (35%)</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrecisionMode('balanced');
                    setConfThreshold(0.25);
                  }}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: precisionMode === 'balanced' ? '2px solid var(--primary)' : '1px solid var(--outline)',
                    backgroundColor: precisionMode === 'balanced' ? 'var(--primary-container)' : 'transparent',
                    color: precisionMode === 'balanced' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>⚖️ Balanced</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>Surveys (25%)</div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrecisionMode('sensitive');
                    setConfThreshold(0.15);
                  }}
                  style={{
                    padding: '0.6rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: precisionMode === 'sensitive' ? '2px solid var(--primary)' : '1px solid var(--outline)',
                    backgroundColor: precisionMode === 'sensitive' ? 'var(--primary-container)' : 'transparent',
                    color: precisionMode === 'sensitive' ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>🔍 Sensitive</div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 500, opacity: 0.85, marginTop: '2px' }}>Hairlines (15%)</div>
                </button>
              </div>
            </div>

            {/* Confidence Threshold Slider */}
            <div className="md-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="md-label" style={{ margin: 0 }}>
                  <Sliders size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Fine-Tuning Confidence Threshold
                </label>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--font-mono)' }}>
                  {Math.round(confThreshold * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.85"
                step="0.05"
                value={confThreshold}
                onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
                className="md-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>5% (High Sensitivity)</span>
                <span>85% (Ultra Precision)</span>
              </div>
            </div>


            {errorMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--error-container)',
                  color: 'var(--error-text)',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '1rem'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Execute Button */}
            <button
              onClick={handleSubmit}
              disabled={uploading || !file}
              className="md-btn-filled"
              style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Executing YOLOv8 Vision Pipeline...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Execute Computer Vision Scan</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Interactive Detection Canvas & Telemetry */}
          <div>
            {result ? (
              <div>
                {/* Result Summary Bar */}
                <div
                  className="md-card"
                  style={{
                    marginBottom: '1.25rem',
                    padding: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--success-container)',
                        color: 'var(--success)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Scan Complete: {detections.length} Distress Items Found
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Inference Time: {result.inference?.inferenceTimeMs || 42}ms &bull; {result.inference?.modelVersion || 'YOLOv8'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <ProvenanceBadge isDemo={result.inference?.isDemo} />
                    <button
                      type="button"
                      onClick={() => setShowWorkOrder(true)}
                      className="md-btn-filled"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', gap: '6px' }}
                    >
                      <FileText size={14} /> Generate Work-Order
                    </button>
                    <Link
                      href={`/map?lat=${result.media?.latitude || userLat}&lng=${result.media?.longitude || userLng}`}
                      className="md-btn-outlined"
                      style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
                    >
                      <Map size={14} /> View on GIS Map
                    </Link>
                  </div>
                </div>

                {/* ASTM D6433 PCI Assessment Card */}
                {pci && (
                  <div
                    className="md-card"
                    style={{
                      marginBottom: '1.25rem',
                      padding: '1.25rem',
                      backgroundColor: 'var(--bg-surface-variant)',
                      borderLeft: `4px solid ${pci.color}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <div
                          style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: pci.color,
                            color: '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'var(--elevation-2)'
                          }}
                        >
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1 }}>{pci.pciScore}</span>
                          <span style={{ fontSize: '0.62rem', fontWeight: 600, opacity: 0.9 }}>PCI</span>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                              Pavement Condition: {pci.rating}
                            </span>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: `${pci.hazardColor}20`,
                                color: pci.hazardColor
                              }}
                            >
                              Hazard: {pci.hazardLevel}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {pci.recommendedAction}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Repair Benchmark</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {pci.estimatedCostPerSqm.usd} / m² ({pci.estimatedCostPerSqm.inr}/sqm)
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{pci.urgency}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Detection Canvas with Bounding Boxes */}
                <div className="md-card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                  <DetectionCanvas
                    imageUrl={result.media?.publicUrl || previewUrl || ''}
                    boxes={boxesForCanvas}
                    isDemo={result.inference?.isDemo}
                    highlightIndex={highlightIndex}
                    onSelectBox={(idx) => setHighlightIndex(idx)}
                  />
                </div>

                {/* 3D Topographic Elevation & Volumetric Material Takeoff Card */}
                {detections.length > 0 && (() => {
                  const activeIdx = highlightIndex !== null && detections[highlightIndex] ? highlightIndex : 0;
                  const activeDefect = detections[activeIdx];
                  if (!activeDefect?.metrics) return null;
                  return (
                    <DepthProfileCard
                      metrics={activeDefect.metrics}
                      classCode={activeDefect.class_code}
                      distressNumber={activeIdx + 1}
                      allDetections={detections}
                      activeIndex={activeIdx}
                      onSelectIndex={(idx) => setHighlightIndex(idx)}
                    />
                  );
                })()}

                {/* AI Pavement Deterioration Life-Cycle Forecaster */}
                {pci && detections.length > 0 && (
                  <DeteriorationForecastCard
                    pci={pci}
                    detections={detections}
                  />
                )}

                {/* In-Studio Defect Validation Drawer */}
                <div className="md-card">
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                    Detected Distress Registry & Human-in-the-Loop Validation
                  </h3>

                  {detections.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                      No road distresses detected in this image. Pavement appears clear.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {detections.map((d: any, idx: number) => {
                        const isSelected = highlightIndex === idx;
                        const auditStatus = verifiedMap[idx] || 'UNVERIFIED';

                        return (
                          <div
                            key={idx}
                            onClick={() => setHighlightIndex(isSelected ? null : idx)}
                            style={{
                              padding: '0.85rem 1.15rem',
                              borderRadius: 'var(--radius-md)',
                              border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--outline)'}`,
                              backgroundColor: isSelected ? 'var(--primary-container)' : 'var(--bg-surface-variant)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '0.75rem',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--outline)',
                                  color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 700
                                }}
                              >
                                {idx + 1}
                              </span>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                  <DefectBadge code={d.class_code} name={d.class_name} />
                                  <span style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                    {Math.round(d.confidence * 100)}% Confidence
                                  </span>
                                  {d.consensus && (
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 700,
                                        backgroundColor: 'var(--secondary-container)',
                                        color: 'var(--secondary)',
                                        padding: '0.12rem 0.45rem',
                                        borderRadius: 'var(--radius-full)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '2px'
                                      }}
                                      title="Cross-validated by dual-model agreement"
                                    >
                                      ★ Ensemble Verified
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  Bounding Box: [{d.box_xyxy.map((v: number) => Math.round(v)).join(', ')}]
                                </div>

                                {d.metrics && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.78rem' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                      📐 {d.metrics.metric_width_cm} × {d.metrics.metric_length_cm} cm
                                    </span>
                                    <span>&bull;</span>
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: d.metrics.depth_severity === 'High' ? '#dc2626' : d.metrics.depth_severity === 'Medium' ? '#d97706' : '#16a34a'
                                      }}
                                    >
                                      ⬇ Depth: {d.metrics.depth_max_mm} mm ({d.metrics.depth_severity})
                                    </span>
                                    <span>&bull;</span>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      🛢 Vol: {d.metrics.cavity_volume_liters} L ({d.metrics.asphalt_patch_mass_kg} kg patch)
                                    </span>
                                    <span>&bull;</span>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                      Distance Z: {d.metrics.ground_distance_m}m
                                    </span>
                                  </div>
                                )}

                              </div>
                            </div>

                            {/* Verification Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <VerificationBadge status={auditStatus} />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyDefect(idx, 'VERIFIED');
                                }}
                                className="md-btn-icon"
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  backgroundColor: auditStatus === 'VERIFIED' ? 'var(--success-container)' : 'transparent',
                                  color: auditStatus === 'VERIFIED' ? 'var(--success)' : 'var(--text-muted)'
                                }}
                                title="Mark as Verified (True Positive)"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleVerifyDefect(idx, 'REJECTED');
                                }}
                                className="md-btn-icon"
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  backgroundColor: auditStatus === 'REJECTED' ? 'var(--error-container)' : 'transparent',
                                  color: auditStatus === 'REJECTED' ? 'var(--error)' : 'var(--text-muted)'
                                }}
                                title="Reject as False Alarm"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Empty Standby State */
              <div
                className="md-card"
                style={{
                  minHeight: '480px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '3rem 2rem'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: 'var(--radius-xl)',
                    backgroundColor: 'var(--bg-surface-variant)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}
                >
                  <Layers size={32} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                  Awaiting Road Survey Imagery
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', maxWidth: '420px', marginBottom: '1.5rem' }}>
                  Upload a roadway photo on the left or click any 1-Click Sample above to localize potholes, alligator cracks, and linear fractures.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    onClick={() => handleSelectPreset(SAMPLE_ROAD_PRESETS[0])}
                    className="md-btn-tonal"
                    style={{ fontSize: '0.84rem' }}
                  >
                    Load Sample Pothole (D40)
                  </button>
                  <button
                    onClick={() => handleSelectPreset(SAMPLE_ROAD_PRESETS[1])}
                    className="md-btn-tonal"
                    style={{ fontSize: '0.84rem' }}
                  >
                    Load Alligator Crack (D20)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Batch Corridor Survey Mode */
        <div className="md-card" style={{ maxWidth: '840px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderArchive size={20} color="var(--primary)" />
            <span>Corridor Batch Survey Processor</span>
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Queue multiple consecutive highway photos (e.g. from an inspection vehicle or dashcam) for automated sequential computer vision distress processing.
          </p>

          {/* Batch Dropzone */}
          <div
            onClick={() => batchInputRef.current?.click()}
            style={{
              border: '2px dashed var(--outline)',
              borderRadius: 'var(--radius-md)',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-surface-variant)',
              cursor: 'pointer',
              marginBottom: '1.5rem'
            }}
          >
            <input
              ref={batchInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handleBatchFilesChange}
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--primary-container)',
                color: 'var(--primary)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem'
              }}
            >
              <UploadCloud size={26} />
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Select Multiple Road Survey Images
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {batchFiles.length > 0
                ? `${batchFiles.length} images queued for processing`
                : 'Select 2 to 20 road photos to survey an entire road corridor'}
            </div>
          </div>

          {batchFiles.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <span>Processing Progress</span>
                <span>{batchProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--outline)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${batchProgress}%`,
                    height: '100%',
                    backgroundColor: 'var(--primary)',
                    transition: 'width 0.2s ease'
                  }}
                />
              </div>

              <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  onClick={() => setBatchFiles([])}
                  disabled={batchProcessing}
                  className="md-btn-outlined"
                >
                  Clear Queue
                </button>
                <button
                  onClick={handleRunBatch}
                  disabled={batchProcessing}
                  className="md-btn-filled"
                >
                  {batchProcessing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Processing Corridor Queue...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Process {batchFiles.length} Road Survey Images</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Batch Results Summary */}
          {batchResults.length > 0 && (
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--outline)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>
                Batch Processing Results ({batchResults.length} Survey Points Processed)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {batchResults.map((bRes, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.85rem 1.15rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface-variant)',
                      border: '1px solid var(--outline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <CheckCircle2 size={18} color="var(--success)" />
                      <div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{bRes.media?.roadName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {bRes.inference?.detections_count || 0} defects &bull; PCI: {bRes.pci?.pciScore || 95}/100 ({bRes.pci?.rating || 'Good'})
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/map?lat=${bRes.media?.latitude || userLat}&lng=${bRes.media?.longitude || userLng}`}
                      className="md-btn-outlined"
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.78rem' }}
                    >
                      <MapPin size={12} />
                      <span>View Map</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Official Municipal Work-Order Ticket Modal */}
      {pci && (
        <WorkOrderModal
          isOpen={showWorkOrder}
          onClose={() => setShowWorkOrder(false)}
          roadName={result?.media?.roadName || roadName}
          latitude={result?.media?.latitude || userLat}
          longitude={result?.media?.longitude || userLng}
          pci={pci}
          detections={detections}
        />
      )}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Inspection Studio...
        </div>
      }
    >
      <UploadContent />
    </Suspense>
  );
}
