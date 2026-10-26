'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Layers,
  RefreshCw,
  MapPin,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Navigation,
  Sparkles,
  Compass,
  AlertTriangle,
  UploadCloud,
  Crosshair
} from 'lucide-react';
import { DefectBadge } from '@/components/StatusBadge';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100%', height: 'calc(100vh - 65px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-variant)', color: 'var(--text-secondary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: '28px', height: '28px', border: '3px solid var(--outline)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: '0.75rem' }} />
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Loading GIS Spatial Engine...</div>
      </div>
    </div>
  )
});

function MapContent() {
  const searchParams = useSearchParams();
  const targetLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null;
  const targetLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null;

  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [mapStyle, setMapStyle] = useState<'street' | 'clean' | 'satellite' | 'topo'>('street');
  const [showHazardZones, setShowHazardZones] = useState<boolean>(true);
  const [activeTypes, setActiveTypes] = useState<Record<string, boolean>>({
    D00: true,
    D10: true,
    D20: true,
    D40: true
  });
  const [showIncidentsList, setShowIncidentsList] = useState<boolean>(true);
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(
    targetLat && targetLng ? [targetLat, targetLng] : null
  );
  const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(null);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    const typesParam = Object.keys(activeTypes).filter((k) => activeTypes[k]).join(',');

    try {
      const res = await fetch(`/api/map-records?type=${typesParam}`);
      if (res.ok) {
        const data = await res.json();
        setFeatures(data.features || []);
      }
    } catch (err) {
      console.warn('Map query error:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTypes]);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  useEffect(() => {
    if (targetLat && targetLng) {
      setSelectedLocation([targetLat, targetLng]);
    }
  }, [targetLat, targetLng]);

  const toggleType = (code: string) => {
    setActiveTypes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleLocationSelect = (lat: number, lng: number) => {
    setPickedLocation([lat, lng]);
  };

  const handleResetView = () => {
    setSelectedLocation(null);
    setPickedLocation(null);
    fetchMapData();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 65px)', overflow: 'hidden' }}>
      {/* Floating Material Filter & Control Card (Top Left) */}
      <div
        className="md-card"
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          zIndex: 1000,
          padding: '1.25rem',
          maxWidth: '320px',
          width: 'calc(100vw - 32px)',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--elevation-3)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              GIS Map Layers
            </h2>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={handleResetView}
              title="Reset View"
              className="md-btn-icon"
              style={{ width: '28px', height: '28px' }}
            >
              <Maximize2 size={13} />
            </button>
            <button
              onClick={fetchMapData}
              disabled={loading}
              title="Refresh Incidents"
              className="md-btn-icon"
              style={{ width: '28px', height: '28px' }}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Base Map Switcher */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label className="md-label" style={{ margin: 0 }}>FREE BASE MAP STYLE</label>
            <span style={{ fontSize: '0.68rem', color: '#16a34a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              &bull; No Key Needed
            </span>
          </div>
          <div className="md-segmented" style={{ width: '100%' }}>
            <button
              onClick={() => setMapStyle('street')}
              className={`md-segmented-btn ${mapStyle === 'street' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
              title="OpenStreetMap Standard (Free, Open-Source)"
            >
              OSM
            </button>
            <button
              onClick={() => setMapStyle('clean')}
              className={`md-segmented-btn ${mapStyle === 'clean' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
              title="Esri Light Gray Canvas (Clean, Minimalist)"
            >
              Light
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`md-segmented-btn ${mapStyle === 'satellite' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
              title="Esri World Imagery (Satellite Photos)"
            >
              Satellite
            </button>
            <button
              onClick={() => setMapStyle('topo')}
              className={`md-segmented-btn ${mapStyle === 'topo' ? 'active' : ''}`}
              style={{ flex: 1, justifyContent: 'center', padding: '0.35rem 0.25rem', fontSize: '0.75rem' }}
              title="Esri World Topographic (Terrain & Contours)"
            >
              Topo
            </button>
          </div>
        </div>

        {/* Distress Class Filters */}
        <div style={{ marginBottom: '1rem' }}>
          <label className="md-label" style={{ marginBottom: '0.4rem' }}>FILTER DEFECT CODES</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              onClick={() => toggleType('D40')}
              className={`md-chip ${activeTypes.D40 ? 'md-chip-d40' : ''}`}
              style={{ justifyContent: 'center' }}
            >
              <span>D40 Pothole</span>
            </button>
            <button
              onClick={() => toggleType('D20')}
              className={`md-chip ${activeTypes.D20 ? 'md-chip-d20' : ''}`}
              style={{ justifyContent: 'center' }}
            >
              <span>D20 Alligator</span>
            </button>
            <button
              onClick={() => toggleType('D10')}
              className={`md-chip ${activeTypes.D10 ? 'md-chip-d10' : ''}`}
              style={{ justifyContent: 'center' }}
            >
              <span>D10 Transverse</span>
            </button>
            <button
              onClick={() => toggleType('D00')}
              className={`md-chip ${activeTypes.D00 ? 'md-chip-d00' : ''}`}
              style={{ justifyContent: 'center' }}
            >
              <span>D00 Longitudinal</span>
            </button>
          </div>
        </div>

        {/* Hazard Zone Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--outline)' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Pothole Danger Zones (35m)
          </span>
          <input
            type="checkbox"
            checked={showHazardZones}
            onChange={(e) => setShowHazardZones(e.target.checked)}
            style={{ accentColor: 'var(--primary)', cursor: 'pointer' }}
          />
        </div>

        {/* Coords summary */}
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Displaying {features.length} pinned road distress hotspots
        </div>
      </div>

      {/* Click-to-Pick Coordinate Floating Banner */}
      {pickedLocation && (
        <div
          className="md-card"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            backgroundColor: 'var(--bg-surface)',
            boxShadow: 'var(--elevation-3)',
            borderRadius: 'var(--radius-full)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Crosshair size={16} color="var(--primary)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
              Pinned: {pickedLocation[0].toFixed(5)}, {pickedLocation[1].toFixed(5)}
            </span>
          </div>
          <Link
            href={`/upload?sample=sample-pothole-deep`}
            className="md-btn-filled"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            <UploadCloud size={13} />
            <span>Scan This Location</span>
          </Link>
          <button
            onClick={() => setPickedLocation(null)}
            className="md-btn-icon"
            style={{ width: '24px', height: '24px' }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Collapsible Distress Hotspot Drawer (Bottom Right) */}
      <div
        className="md-card"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          width: '320px',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--bg-surface)',
          boxShadow: 'var(--elevation-3)'
        }}
      >
        <div
          onClick={() => setShowIncidentsList(!showIncidentsList)}
          style={{
            padding: '0.85rem 1.15rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor: 'var(--bg-surface-variant)',
            borderBottom: showIncidentsList ? '1px solid var(--outline)' : 'none'
          }}
        >
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Distress Hotspots ({features.length})
          </span>
          {showIncidentsList ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>

        {showIncidentsList && (
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '0.5rem' }}>
            {features.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No incidents in active filter.
              </div>
            ) : (
              features.slice(0, 10).map((f) => {
                const [lng, lat] = f.geometry.coordinates;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedLocation([lat, lng])}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--outline)',
                      fontSize: '0.8rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{f.properties.damageType} &bull; {f.properties.damageCategory}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{f.properties.roadName || 'Road Corridor'}</div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {Math.round(f.properties.confidence * 100)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Leaflet GIS Map Viewport */}
      <MapComponent
        features={features}
        mapStyle={mapStyle}
        showHazardZones={showHazardZones}
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
      />
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading GIS Spatial Viewport...
        </div>
      }
    >
      <MapContent />
    </Suspense>
  );
}
