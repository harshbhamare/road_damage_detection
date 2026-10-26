import React from 'react';

interface StatusBadgeProps {
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED' | string;
}

export function VerificationBadge({ status }: StatusBadgeProps) {
  let bg = 'var(--bg-surface-variant)';
  let color = 'var(--text-muted)';
  let border = 'var(--outline)';
  let dotColor = 'var(--text-muted)';
  let label = 'Pending Review';

  if (status === 'VERIFIED') {
    bg = 'var(--success-container)';
    color = 'var(--success-text)';
    border = 'rgba(22, 163, 74, 0.3)';
    dotColor = 'var(--success)';
    label = 'Verified';
  } else if (status === 'REJECTED') {
    bg = 'var(--error-container)';
    color = 'var(--error-text)';
    border = 'rgba(239, 68, 68, 0.3)';
    dotColor = 'var(--error)';
    label = 'Rejected';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.2rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          display: 'inline-block'
        }}
      />
      {label}
    </span>
  );
}

export function ProvenanceBadge({ isDemo }: { isDemo: boolean }) {
  if (isDemo) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.2rem 0.65rem',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          backgroundColor: 'var(--warning-container)',
          color: 'var(--warning-text)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          whiteSpace: 'nowrap'
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--warning)',
            display: 'inline-block'
          }}
        />
        Simulation Mode
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.2rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor: 'var(--success-container)',
        color: 'var(--success-text)',
        border: '1px solid rgba(22, 163, 74, 0.3)',
        whiteSpace: 'nowrap'
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'var(--success)',
          display: 'inline-block'
        }}
      />
      YOLOv8 Engine
    </span>
  );
}

export function DefectBadge({ code, name }: { code: string; name?: string }) {
  const upper = (code || 'D40').toUpperCase();
  let bg = 'var(--color-d40-container)';
  let color = 'var(--color-d40-text)';
  let border = 'rgba(220, 38, 38, 0.3)';
  let defaultName = 'Pothole';

  if (upper === 'D20') {
    bg = 'var(--color-d20-container)';
    color = 'var(--color-d20-text)';
    border = 'rgba(217, 119, 6, 0.3)';
    defaultName = 'Alligator Crack';
  } else if (upper === 'D10') {
    bg = 'var(--color-d10-container)';
    color = 'var(--color-d10-text)';
    border = 'rgba(2, 132, 199, 0.3)';
    defaultName = 'Transverse Crack';
  } else if (upper === 'D00') {
    bg = 'var(--color-d00-container)';
    color = 'var(--color-d00-text)';
    border = 'rgba(37, 99, 235, 0.3)';
    defaultName = 'Longitudinal Crack';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '0.22rem 0.65rem',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.75rem',
        fontWeight: 700,
        backgroundColor: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap'
      }}
    >
      <span style={{ opacity: 0.85 }}>{upper}</span>
      <span>•</span>
      <span>{name || defaultName}</span>
    </span>
  );
}
