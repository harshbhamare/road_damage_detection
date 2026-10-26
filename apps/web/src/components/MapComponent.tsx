'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import Link from 'next/link';

export interface DamageFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: {
    id: string;
    mediaId?: string;
    imageUrl?: string;
    roadName?: string;
    damageType: 'D00' | 'D10' | 'D20' | 'D40';
    damageCategory: string;
    confidence: number;
    status?: string;
    verificationStatus?: string;
    modelVersion?: string;
    isDemo?: boolean;
    createdAt: string;
  };
}

interface MapProps {
  features: DamageFeature[];
  onViewportChange?: (bbox: [number, number, number, number]) => void;
  selectedLocation?: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  mapStyle?: 'street' | 'clean' | 'satellite' | 'topo';
  showHazardZones?: boolean;
}

// Custom Material Marker Pin
function createCustomPin(color: string, code: string) {
  return L.divIcon({
    className: 'custom-road-pin',
    html: `
      <div style="
        position: relative;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          inset: 0;
          background: ${color};
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
        "></div>
        <span style="
          position: relative;
          z-index: 2;
          color: #ffffff;
          font-size: 8.5px;
          font-weight: 800;
          font-family: var(--font-sans, system-ui, sans-serif);
          letter-spacing: -0.01em;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          transform: translateY(-2px);
        ">${code}</span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
}

const PIN_COLORS = {
  D00: '#2563eb', // Longitudinal Crack: Blue
  D10: '#0284c7', // Transverse Crack: Cyan
  D20: '#d97706', // Alligator Crack: Amber
  D40: '#dc2626'  // Pothole: Crimson Red
};

// 100% Free Public GIS Tile Providers (No API key needed)
const TILE_PROVIDERS = {
  street: {
    // OpenStreetMap Standard - 100% Free, worldwide street & road network
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  clean: {
    // Esri Light Gray Canvas - Clean, modern, minimalist base map without watermarks
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16
  },
  satellite: {
    // Esri World Imagery - High-resolution aerial & satellite imagery
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, GeoEye',
    maxZoom: 19
  },
  topo: {
    // Esri World Topographic - Contours and detailed terrain topography
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, FAO, NPS',
    maxZoom: 19
  }
};

function AutoFitBounds({
  features,
  selectedLocation
}: {
  features: DamageFeature[];
  selectedLocation?: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedLocation) {
      map.flyTo(selectedLocation, 16, { duration: 1.2 });
      return;
    }

    if (features && features.length > 0) {
      const validPoints: [number, number][] = features
        .map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number])
        .filter(([lat, lng]) => typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng));

      if (validPoints.length > 0) {
        if (validPoints.length === 1) {
          map.flyTo(validPoints[0], 15, { duration: 1 });
        } else {
          const bounds = L.latLngBounds(validPoints);
          map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
      }
    }
  }, [features, selectedLocation, map]);

  return null;
}

function MapEventHandler({
  onViewportChange,
  onLocationSelect
}: {
  onViewportChange?: (bbox: [number, number, number, number]) => void;
  onLocationSelect?: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      if (onViewportChange) {
        const bounds = map.getBounds();
        onViewportChange([
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        ]);
      }
    },
    click: (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function MapComponent({
  features,
  onViewportChange,
  selectedLocation,
  onLocationSelect,
  mapStyle = 'street',
  showHazardZones = true
}: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-surface-variant)', color: 'var(--text-secondary)' }}>
        Loading GIS Spatial Viewport...
      </div>
    );
  }

  const initialCenter: [number, number] = selectedLocation
    ? selectedLocation
    : features.length > 0
    ? [features[0].geometry.coordinates[1], features[0].geometry.coordinates[0]]
    : [19.8762, 75.3433];

  const currentTile = TILE_PROVIDERS[mapStyle] || TILE_PROVIDERS.street;

  return (
    <MapContainer
      center={initialCenter}
      zoom={14}
      scrollWheelZoom={true}
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      <TileLayer
        key={mapStyle}
        attribution={currentTile.attribution}
        url={currentTile.url}
        maxZoom={currentTile.maxZoom}
      />

      <AutoFitBounds features={features} selectedLocation={selectedLocation} />
      <MapEventHandler onViewportChange={onViewportChange} onLocationSelect={onLocationSelect} />

      {/* Render Hazard Proximity Radius for Potholes */}
      {showHazardZones &&
        features
          .filter((f) => f.properties.damageType === 'D40')
          .map((f) => {
            const [lng, lat] = f.geometry.coordinates;
            return (
              <Circle
                key={`hazard-${f.id}`}
                center={[lat, lng]}
                radius={35} // 35-meter caution zone
                pathOptions={{
                  color: '#dc2626',
                  fillColor: '#dc2626',
                  fillOpacity: 0.18,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              />
            );
          })}

      {/* Render Damage Detections */}
      {features.map((feature) => {
        const [lng, lat] = feature.geometry.coordinates;
        const code = feature.properties.damageType;
        const color = PIN_COLORS[code] || '#dc2626';
        const icon = createCustomPin(color, code);
        const recordId = feature.properties.id || feature.id;

        return (
          <Marker key={feature.id} position={[lat, lng]} icon={icon}>
            <Popup>
              <div style={{ color: '#0f172a', fontSize: '0.84rem', minWidth: '230px', maxWidth: '280px', padding: '2px' }}>
                {feature.properties.imageUrl && (
                  <div style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', height: '115px' }}>
                    <img
                      src={feature.properties.imageUrl}
                      alt="Road Damage"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span
                    style={{
                      backgroundColor: color,
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}
                  >
                    {code}
                  </span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>
                    {feature.properties.damageCategory}
                  </span>
                </div>

                <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.8rem', marginBottom: '6px' }}>
                  {feature.properties.roadName || 'Unnamed Road Corridor'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '6px' }}>
                  <span>Confidence:</span>
                  <strong style={{ color: '#0f172a' }}>{Math.round(feature.properties.confidence * 100)}%</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '10px' }}>
                  <span>Coordinates:</span>
                  <code>{lat.toFixed(4)}, {lng.toFixed(4)}</code>
                </div>

                <Link
                  href={`/upload?sample=sample-pothole-deep`}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem'
                  }}
                >
                  Scan Corridor Area &rarr;
                </Link>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
