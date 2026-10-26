'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Download,
  Crosshair,
  Ruler,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Flame,
  Layers
} from 'lucide-react';

export interface BoundingBoxItem {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
  class_code?: string;
  class_name?: string;
  confidence?: number;
  metrics?: any;
}

interface DetectionCanvasProps {
  imageUrl: string;
  boxes?: BoundingBoxItem[];
  isDemo?: boolean;
  highlightIndex?: number | null;
  onSelectBox?: (index: number) => void;
}

const DEFECT_COLORS: Record<string, { stroke: string; fill: string; badge: string; text: string }> = {
  D40: { stroke: '#dc2626', fill: 'rgba(220, 38, 38, 0.22)', badge: '#dc2626', text: '#ffffff' }, // Pothole
  D20: { stroke: '#d97706', fill: 'rgba(217, 119, 6, 0.22)', badge: '#d97706', text: '#ffffff' }, // Alligator
  D10: { stroke: '#0284c7', fill: 'rgba(2, 132, 199, 0.22)', badge: '#0284c7', text: '#ffffff' }, // Transverse
  D00: { stroke: '#2563eb', fill: 'rgba(37, 99, 235, 0.22)', badge: '#2563eb', text: '#ffffff' }  // Longitudinal
};

export default function DetectionCanvas({
  imageUrl,
  boxes = [],
  isDemo = false,
  highlightIndex = null,
  onSelectBox
}: DetectionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showBoxes, setShowBoxes] = useState(true);
  const [displayMode, setDisplayMode] = useState<'boxes' | 'depthHeatmap' | 'ruler'>('boxes');
  const [showReticles, setShowReticles] = useState(true);
  const [showCivilMetrics, setShowCivilMetrics] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [naturalDim, setNaturalDim] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;

    img.onload = () => {
      const w = img.naturalWidth || 640;
      const h = img.naturalHeight || 640;
      canvas.width = w;
      canvas.height = h;
      setNaturalDim({ w, h });

      // Draw base pavement image
      ctx.drawImage(img, 0, 0, w, h);

      // Render aesthetic bounding boxes / depth heatmaps / rulers
      if (showBoxes && boxes.length > 0) {
        boxes.forEach((b, idx) => {
          const isHighlighted = highlightIndex === idx;
          const code = b.class_code || 'D40';
          const scheme = DEFECT_COLORS[code] || DEFECT_COLORS.D40;
          const metrics = b.metrics;

          // Integer pixel snapping
          const xmin = Math.round(b.xmin);
          const ymin = Math.round(b.ymin);
          const xmax = Math.round(b.xmax);
          const ymax = Math.round(b.ymax);
          const bw = Math.max(1, xmax - xmin);
          const bh = Math.max(1, ymax - ymin);
          const cx = Math.round(xmin + bw / 2);
          const cy = Math.round(ymin + bh / 2);

          // MODE 1 & 2: Depth Heatmap Mode
          if (displayMode === 'depthHeatmap') {
            const depthMm = metrics?.depth_max_mm || 20;
            // Depth Color Ramp: Green (<15mm) -> Yellow/Amber (15-35mm) -> Red (>35mm)
            let coreColor = '#10b981';
            let midColor = 'rgba(16, 185, 129, 0.4)';
            if (depthMm > 35) {
              coreColor = '#dc2626';
              midColor = 'rgba(220, 38, 38, 0.55)';
            } else if (depthMm > 15) {
              coreColor = '#f59e0b';
              midColor = 'rgba(245, 158, 11, 0.45)';
            }

            // Radial gradient inside box representing depth crater/fissure
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(bw, bh) * 0.6);
            grad.addColorStop(0, midColor);
            grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.2)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');

            ctx.fillStyle = grad;
            ctx.fillRect(xmin, ymin, bw, bh);

            // Thermal Contour Ring
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = Math.max(2.5, Math.round(w / 300));
            ctx.strokeRect(xmin, ymin, bw, bh);

            // Floating Depth HUD Pill
            const hudText = `⚡ Depth: ${depthMm}mm ${metrics?.crack_width_mm ? `| W: ${metrics.crack_width_mm}mm` : ''}`;
            ctx.font = `bold ${Math.max(11, Math.round(w / 65))}px sans-serif`;
            const tw = ctx.measureText(hudText).width;
            const hudX = Math.max(xmin, Math.min(w - tw - 16, cx - tw / 2));
            const hudY = Math.max(20, ymin - 8);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.beginPath();
            ctx.roundRect(hudX - 6, hudY - 14, tw + 12, 18, 4);
            ctx.fill();
            ctx.strokeStyle = coreColor;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(hudText, hudX, hudY - 1);
            return;
          }

          // MODE 3: Measurement Ruler Mode
          if (displayMode === 'ruler') {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.strokeRect(xmin, ymin, bw, bh);

            // Dimension labels
            const widthCm = metrics?.metric_width_cm ? `${metrics.metric_width_cm} cm` : `${bw}px`;
            const lengthCm = metrics?.metric_length_cm ? `${metrics.metric_length_cm} cm` : `${bh}px`;
            const depthMm = metrics?.depth_max_mm ? `D: ${metrics.depth_max_mm}mm` : '';

            ctx.font = `bold ${Math.max(10, Math.round(w / 70))}px monospace`;
            ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';

            // Top width ruler
            const tw = ctx.measureText(widthCm).width;
            ctx.fillRect(cx - tw / 2 - 4, ymin - 16, tw + 8, 14);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(widthCm, cx - tw / 2, ymin - 5);

            // Right length ruler
            ctx.fillStyle = 'rgba(2, 132, 199, 0.9)';
            const tl = ctx.measureText(lengthCm).width;
            ctx.fillRect(xmax + 4, cy - 7, tl + 8, 14);
            ctx.fillStyle = '#ffffff';
            ctx.fillText(lengthCm, xmax + 8, cy + 4);

            // Center depth callout
            if (depthMm) {
              const td = ctx.measureText(depthMm).width;
              ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
              ctx.fillRect(cx - td / 2 - 4, cy - 7, td + 8, 14);
              ctx.fillStyle = '#38bdf8';
              ctx.fillText(depthMm, cx - td / 2, cy + 4);
            }
            return;
          }

          // STANDARD BOXES MODE
          // Translucent fill
          ctx.fillStyle = isHighlighted ? 'rgba(37, 99, 235, 0.35)' : scheme.fill;
          ctx.fillRect(xmin, ymin, bw, bh);

          // Box border
          ctx.strokeStyle = isHighlighted ? '#1a73e8' : scheme.stroke;
          ctx.lineWidth = isHighlighted
            ? Math.max(3.5, Math.round(w / 200))
            : Math.max(2, Math.round(w / 350));
          ctx.strokeRect(xmin, ymin, bw, bh);

          // Precision corner targeting reticles
          if (showReticles) {
            const cornerLen = Math.min(18, Math.max(6, Math.round(bw * 0.18), Math.round(bh * 0.18)));
            ctx.strokeStyle = isHighlighted ? '#2563eb' : '#ffffff';
            ctx.lineWidth = Math.max(2.5, Math.round(w / 280));

            // Top-Left corner
            ctx.beginPath();
            ctx.moveTo(xmin, ymin + cornerLen);
            ctx.lineTo(xmin, ymin);
            ctx.lineTo(xmin + cornerLen, ymin);
            ctx.stroke();

            // Top-Right corner
            ctx.beginPath();
            ctx.moveTo(xmax - cornerLen, ymin);
            ctx.lineTo(xmax, ymin);
            ctx.lineTo(xmax, ymin + cornerLen);
            ctx.stroke();

            // Bottom-Left corner
            ctx.beginPath();
            ctx.moveTo(xmin, ymax - cornerLen);
            ctx.lineTo(xmin, ymax);
            ctx.lineTo(xmin + cornerLen, ymax);
            ctx.stroke();

            // Bottom-Right corner
            ctx.beginPath();
            ctx.moveTo(xmax - cornerLen, ymax);
            ctx.lineTo(xmax, ymax);
            ctx.lineTo(xmax, ymax - cornerLen);
            ctx.stroke();
          }

          // Main Header Label Pill: Distress Code + Category + Confidence %
          const confPct = b.confidence ? Math.round(b.confidence * 100) : 80;
          const labelText = `#${idx + 1} ${code} • ${b.class_name || 'Distress'} • ${confPct}%`;
          const baseFontSize = Math.max(11, Math.min(16, Math.round(w / 58)));
          ctx.font = `bold ${baseFontSize}px sans-serif`;
          const textMetrics = ctx.measureText(labelText);
          const badgeWidth = textMetrics.width + 14;
          const badgeHeight = baseFontSize + 10;

          // Position pill above box (or inside if near top edge)
          let badgeX = xmin;
          let badgeY = ymin - badgeHeight - 3;
          if (badgeY < 4) {
            badgeY = ymin + 4;
          }
          if (badgeX + badgeWidth > w) {
            badgeX = Math.max(4, w - badgeWidth - 4);
          }

          // Draw Header Pill
          ctx.fillStyle = scheme.badge;
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
          ctx.fill();

          ctx.fillStyle = scheme.text;
          ctx.fillText(labelText, badgeX + 7, badgeY + baseFontSize + 1);

          // Secondary Civil Metrics Ribbon: Depth, Real Width, Length, Patch Mass
          if (showCivilMetrics && metrics) {
            const depthText = `${metrics.depth_max_mm}mm Depth`;
            const sizeText = `${metrics.metric_width_cm}×${metrics.metric_length_cm}cm`;
            const actionText = metrics.asphalt_patch_mass_kg > 0 ? `${metrics.asphalt_patch_mass_kg}kg Patch` : `${metrics.crack_sealant_mass_kg || 0.85}kg Sealant`;
            const metricRibbonText = `⚡ ${depthText} | ${sizeText} | ${actionText}`;

            const ribbonFontSize = Math.max(9, Math.round(baseFontSize * 0.82));
            ctx.font = `600 ${ribbonFontSize}px monospace`;
            const ribbonMetrics = ctx.measureText(metricRibbonText);
            const ribbonWidth = ribbonMetrics.width + 12;
            const ribbonHeight = ribbonFontSize + 8;

            let ribbonX = xmin;
            let ribbonY = badgeY + badgeHeight + 2;
            if (badgeY === ymin + 4) {
              ribbonY = badgeY + badgeHeight + 2;
            }
            if (ribbonX + ribbonWidth > w) {
              ribbonX = Math.max(4, w - ribbonWidth - 4);
            }

            // Draw Ribbon Pill
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.beginPath();
            ctx.roundRect(ribbonX, ribbonY, ribbonWidth, ribbonHeight, 4);
            ctx.fill();

            ctx.strokeStyle = scheme.stroke;
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(metricRibbonText, ribbonX + 6, ribbonY + ribbonFontSize + 1);
          }
        });
      }
    };
  }, [imageUrl, boxes, showBoxes, displayMode, showReticles, showCivilMetrics, highlightIndex]);

  // Click handler to select bounding box
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSelectBox || !canvasRef.current || boxes.length === 0) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Find clicked box
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (clickX >= b.xmin && clickX <= b.xmax && clickY >= b.ymin && clickY <= b.ymax) {
        onSelectBox(i);
        return;
      }
    }
  };

  const handleDownloadAnnotated = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `annotated-road-survey-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  const handleZoomReset = () => setZoomLevel(1);

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {/* Canvas Viewport Frame */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--outline)',
          backgroundColor: 'var(--bg-surface-variant)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          minHeight: '360px',
          maxHeight: '560px'
        }}
      >
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            style={{
              maxWidth: '100%',
              maxHeight: '540px',
              objectFit: 'contain',
              display: 'block',
              cursor: boxes.length > 0 ? 'crosshair' : 'default'
            }}
          />
        </div>

        {isDemo && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              backgroundColor: 'var(--warning-container)',
              color: 'var(--warning-text)',
              border: '1px solid var(--warning)',
              padding: '0.25rem 0.65rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
          >
            SIMULATION PREVIEW
          </div>
        )}

        {/* Floating Zoom Bar inside Canvas (Top Left) */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--outline)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 4px',
            boxShadow: 'var(--elevation-1)',
            zIndex: 10
          }}
        >
          <button
            type="button"
            onClick={handleZoomIn}
            className="md-btn-icon"
            style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="md-btn-icon"
            style={{ width: '28px', height: '28px', border: 'none', background: 'transparent' }}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
          {zoomLevel !== 1 && (
            <button
              type="button"
              onClick={handleZoomReset}
              className="md-btn-icon"
              style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', fontSize: '0.7rem', fontWeight: 600 }}
              title="Reset Zoom"
            >
              1x
            </button>
          )}
        </div>
      </div>

      {/* Clean Material Precision Toolbar */}
      <div
        style={{
          marginTop: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          padding: '0.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className={`md-chip ${showBoxes ? 'active' : ''}`}
          >
            {showBoxes ? <Eye size={13} /> : <EyeOff size={13} />}
            <span>{showBoxes ? 'Overlays Visible' : 'Overlays Hidden'} ({boxes.length})</span>
          </button>

          {showBoxes && (
            <>
              {/* Display Mode Switcher (Boxes / Heatmap / Ruler) */}
              <div className="md-segmented" style={{ transform: 'scale(0.92)', transformOrigin: 'left center' }}>
                <button
                  type="button"
                  onClick={() => setDisplayMode('boxes')}
                  className={`md-segmented-btn ${displayMode === 'boxes' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', gap: '4px' }}
                >
                  <Crosshair size={12} />
                  <span>Reticles</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('depthHeatmap')}
                  className={`md-segmented-btn ${displayMode === 'depthHeatmap' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', gap: '4px' }}
                >
                  <Flame size={12} />
                  <span>3D Depth Heatmap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('ruler')}
                  className={`md-segmented-btn ${displayMode === 'ruler' ? 'active' : ''}`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', gap: '4px' }}
                >
                  <Ruler size={12} />
                  <span>Metric Ruler</span>
                </button>
              </div>

              {displayMode === 'boxes' && (
                <button
                  type="button"
                  onClick={() => setShowCivilMetrics(!showCivilMetrics)}
                  className={`md-chip ${showCivilMetrics ? 'active' : ''}`}
                  style={{
                    backgroundColor: showCivilMetrics ? 'var(--primary-container)' : undefined,
                    borderColor: showCivilMetrics ? 'var(--primary)' : undefined,
                    color: showCivilMetrics ? 'var(--primary)' : undefined,
                    fontWeight: 600
                  }}
                  title="Display depth and civil dimensions on bounding boxes"
                >
                  <Sparkles size={13} />
                  <span>Depth HUD Ribbons</span>
                </button>
              )}
            </>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {naturalDim && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {naturalDim.w} &times; {naturalDim.h} px
            </span>
          )}
          <button
            type="button"
            onClick={handleDownloadAnnotated}
            title="Download annotated image with bounding boxes"
            className="md-btn-outlined"
            style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
          >
            <Download size={13} /> Export Annotated Image
          </button>
        </div>
      </div>
    </div>
  );
}
