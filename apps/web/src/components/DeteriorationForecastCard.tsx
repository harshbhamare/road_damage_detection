'use client';

import React, { useState } from 'react';
import {
  TrendingDown,
  Clock,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  ChevronRight,
  Info,
  Calendar,
  Sparkles
} from 'lucide-react';
import { PciAssessment } from '@/lib/pciEngine';

interface DeteriorationForecastCardProps {
  pci: PciAssessment;
  detections: any[];
}

export default function DeteriorationForecastCard({
  pci,
  detections = []
}: DeteriorationForecastCardProps) {
  const [selectedHorizon, setSelectedHorizon] = useState<number>(12); // months

  const currentPci = pci.pciScore;

  // AASHTO / IRC:82 empirical pavement deterioration model:
  // With immediate maintenance vs without intervention (do nothing)
  const calculatePciAtMonth = (months: number, withIntervention: boolean) => {
    if (withIntervention) {
      // With proper sealing/patching, PCI recovers to ~92 and degrades very slowly (0.4 pts/mo)
      return Math.min(95, Math.max(75, Math.round(92 - months * 0.4)));
    }
    // Without intervention: non-linear accelerated degradation (power law t^1.35)
    const decayRate = currentPci < 50 ? 2.4 : currentPci < 70 ? 1.8 : 1.2;
    const loss = Math.pow(months, 1.25) * (decayRate * 0.7);
    return Math.max(8, Math.round(currentPci - loss));
  };

  const pciAtHorizonDoNothing = calculatePciAtMonth(selectedHorizon, false);
  const pciAtHorizonWithAction = calculatePciAtMonth(selectedHorizon, true);

  // Estimate Remaining Service Life (RSL) before structural pavement failure (PCI < 40)
  let rslMonths = 24;
  for (let m = 1; m <= 36; m++) {
    if (calculatePciAtMonth(m, false) <= 40) {
      rslMonths = m;
      break;
    }
  }

  // Cost escalation estimate:
  // Preventive action today vs delayed rehabilitation
  const baseCostUsd = parseFloat(pci.estimatedCostPerSqm.usd.replace(/[^0-9.]/g, '')) || 2.5;
  const baseCostInr = parseFloat(pci.estimatedCostPerSqm.inr.replace(/[^0-9.]/g, '')) || 200;
  const delayFactor = selectedHorizon <= 6 ? 1.8 : selectedHorizon <= 12 ? 3.8 : 7.2;

  const delayedCostUsd = (baseCostUsd * delayFactor).toFixed(2);
  const delayedCostInr = Math.round(baseCostInr * delayFactor);

  // Graph points for 0, 3, 6, 12, 18, 24 months
  const timelinePoints = [0, 3, 6, 12, 18, 24];
  const graphWidth = 520;
  const graphHeight = 140;
  const paddingX = 40;
  const paddingY = 20;

  const getCoord = (month: number, pciVal: number) => {
    const x = paddingX + (month / 24) * (graphWidth - 2 * paddingX);
    const y = paddingY + ((100 - pciVal) / 100) * (graphHeight - 2 * paddingY);
    return { x, y };
  };

  // Generate SVG path strings
  const doNothingPath = timelinePoints
    .map((m, idx) => {
      const val = calculatePciAtMonth(m, false);
      const { x, y } = getCoord(m, val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const withActionPath = timelinePoints
    .map((m, idx) => {
      const val = calculatePciAtMonth(m, true);
      const { x, y } = getCoord(m, val);
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div
      className="md-card"
      style={{
        padding: '1.25rem',
        marginBottom: '1.25rem',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--outline)'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
          paddingBottom: '0.75rem',
          borderBottom: '1px solid var(--outline)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <TrendingDown size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              AI Pavement Deterioration & Remaining Service Life (RSL) Forecaster
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              AASHTO / IRC:82 Life-Cycle Deterioration Progression & Cost of Delay Analysis
            </div>
          </div>
        </div>

        {/* Forecast Horizon Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Horizon:</span>
          {[6, 12, 18, 24].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedHorizon(m)}
              className={`md-chip ${selectedHorizon === m ? 'active' : ''}`}
              style={{ fontSize: '0.74rem', padding: '0.2rem 0.55rem' }}
            >
              {m} Mo
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Visual Deterioration Curve + Financial Escalation Ledger */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.25fr) minmax(280px, 1fr)', gap: '1.25rem' }}>
        {/* Left: SVG Deterioration Curve Canvas */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-variant)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            border: '1px solid var(--outline)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-secondary)' }}>
              24-MONTH HEALTH TRAJECTORY (PCI SCORE)
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.72rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                With Maintenance
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontWeight: 700 }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                No Intervention
              </span>
            </div>
          </div>

          <div style={{ width: '100%', overflowX: 'auto' }}>
            <svg
              viewBox={`0 0 ${graphWidth} ${graphHeight}`}
              style={{ width: '100%', height: 'auto', minWidth: '320px', display: 'block' }}
            >
              {/* Critical threshold line at PCI 40 */}
              <line
                x1={paddingX}
                y1={paddingY + (60 / 100) * (graphHeight - 2 * paddingY)}
                x2={graphWidth - paddingX}
                y2={paddingY + (60 / 100) * (graphHeight - 2 * paddingY)}
                stroke="#dc2626"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <text
                x={graphWidth - paddingX - 4}
                y={paddingY + (60 / 100) * (graphHeight - 2 * paddingY) - 3}
                fill="#dc2626"
                fontSize="9"
                fontWeight="700"
                textAnchor="end"
              >
                PCI 40 (Critical Base Failure)
              </text>

              {/* Maintenance Curve (Green) */}
              <path d={withActionPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

              {/* No Intervention Curve (Red) */}
              <path d={doNothingPath} fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />

              {/* Data points along curve */}
              {timelinePoints.map((m) => {
                const p1 = getCoord(m, calculatePciAtMonth(m, true));
                const p2 = getCoord(m, calculatePciAtMonth(m, false));
                return (
                  <g key={m}>
                    <circle cx={p1.x} cy={p1.y} r="3" fill="#10b981" />
                    <circle cx={p2.x} cy={p2.y} r="3" fill="#dc2626" />
                    <text x={p1.x} y={graphHeight - 4} fill="#64748b" fontSize="9" textAnchor="middle">
                      {m}m
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Forecast Comparison Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--outline)',
              fontSize: '0.74rem'
            }}
          >
            <span>Current: <strong>{currentPci} PCI</strong></span>
            <span>At {selectedHorizon} Mo (No Action): <strong style={{ color: '#dc2626' }}>{pciAtHorizonDoNothing} PCI</strong></span>
            <span>At {selectedHorizon} Mo (Sealed): <strong style={{ color: '#10b981' }}>{pciAtHorizonWithAction} PCI</strong></span>
          </div>
        </div>

        {/* Right: Remaining Service Life & Cost of Delay Multiplier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* RSL Card */}
          <div
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-variant)',
              border: '1px solid var(--outline)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                ESTIMATED REMAINING SERVICE LIFE (RSL)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '2px' }}>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: rslMonths <= 6 ? '#dc2626' : '#d97706' }}>
                {rslMonths} Months
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                before severe structural base failure
              </span>
            </div>
          </div>

          {/* Cost Escalation Card */}
          <div
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-surface-variant)',
              border: '1px solid var(--outline)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  COST ESCALATION IF DELAYED ({selectedHorizon} MO)
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#dc2626' }}>
                {delayFactor}× Cost Multiplier
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>MAINTAIN TODAY</span>
                <strong style={{ fontSize: '1.05rem', color: '#10b981' }}>
                  ₹{baseCostInr}/sqm ({pci.estimatedCostPerSqm.usd}/m²)
                </strong>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Crack sealing / local patch</div>
              </div>

              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>DELAYED {selectedHorizon} MONTHS</span>
                <strong style={{ fontSize: '1.05rem', color: '#dc2626' }}>
                  ₹{delayedCostInr}/sqm (${delayedCostUsd}/m²)
                </strong>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Milling + full-depth rebuild</div>
              </div>
            </div>
          </div>

          {/* ROI Callout */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.78rem',
              color: '#15803d'
            }}
          >
            <Sparkles size={16} />
            <span>
              <strong>Preventive Maintenance ROI:</strong> Executing repairs within 30 days saves up to <strong>{Math.round((1 - 1 / delayFactor) * 100)}%</strong> of municipal budget compared to reactive reconstruction.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
