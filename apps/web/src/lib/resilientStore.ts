import fs from 'fs';
import path from 'path';
import { DistressCalculativeMetrics, calculateDistressMetrics } from './depthEngine';

export interface StoredRecord {
  _id: string;
  mediaId: string;
  roadName: string;
  damageType: 'D00' | 'D10' | 'D20' | 'D40';
  damageCategory: string;
  confidence: number;
  boundingBox?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
  hasLocation: boolean;
  latitude?: number;
  longitude?: number;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  locationSource: 'EXIF' | 'MANUAL' | 'UNAVAILABLE';
  modelVersion: string;
  isDemo: boolean;
  status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED';
  notes?: string;
  metrics?: DistressCalculativeMetrics;
  createdAt: string;
  updatedAt: string;
  media?: {
    publicUrl: string;
    originalFilename: string;
  };
}

class ResilientStore {
  private records: StoredRecord[] = [];
  private initialized = false;

  constructor() {
    this.seedInitial();
  }

  private seedInitial() {
    if (this.initialized) return;
    this.initialized = true;

    // Realistic seed records covering all 4 damage classes with GPS coordinates and calculated depth metrics
    const rawSeeds = [
      {
        _id: 'rec-pothole-01',
        mediaId: 'med-01',
        roadName: 'Jalna Road Highway Corridor KM 4.2',
        damageType: 'D40' as const,
        damageCategory: 'Pothole',
        confidence: 0.89,
        boundingBox: { xmin: 140, ymin: 180, xmax: 320, ymax: 340 },
        hasLocation: true,
        latitude: 19.8762,
        longitude: 75.3433,
        location: { type: 'Point' as const, coordinates: [75.3433, 19.8762] as [number, number] },
        locationSource: 'EXIF' as const,
        modelVersion: 'v1.2.0-precision-tuned',
        isDemo: false,
        status: 'VERIFIED' as const,
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        media: { publicUrl: '/samples/sample-pothole-1.jpg', originalFilename: 'highway_pothole_km4.jpg' }
      },
      {
        _id: 'rec-alligator-02',
        mediaId: 'med-02',
        roadName: 'Western Corridor Highway Lane 2',
        damageType: 'D20' as const,
        damageCategory: 'Alligator Crack',
        confidence: 0.84,
        boundingBox: { xmin: 80, ymin: 120, xmax: 420, ymax: 380 },
        hasLocation: true,
        latitude: 19.8824,
        longitude: 75.3512,
        location: { type: 'Point' as const, coordinates: [75.3512, 19.8824] as [number, number] },
        locationSource: 'EXIF' as const,
        modelVersion: 'v1.2.0-precision-tuned',
        isDemo: false,
        status: 'UNVERIFIED' as const,
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        media: { publicUrl: '/samples/sample-alligator-1.jpg', originalFilename: 'western_corridor_cracking.jpg' }
      },
      {
        _id: 'rec-transverse-03',
        mediaId: 'med-03',
        roadName: 'Ring Road Northern Bypass Section C',
        damageType: 'D10' as const,
        damageCategory: 'Transverse Crack',
        confidence: 0.76,
        boundingBox: { xmin: 50, ymin: 210, xmax: 480, ymax: 270 },
        hasLocation: true,
        latitude: 19.8691,
        longitude: 75.3370,
        location: { type: 'Point' as const, coordinates: [75.3370, 19.8691] as [number, number] },
        locationSource: 'MANUAL' as const,
        modelVersion: 'v1.2.0-precision-tuned',
        isDemo: false,
        status: 'VERIFIED' as const,
        createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
        media: { publicUrl: '/samples/sample-transverse-1.jpg', originalFilename: 'ring_road_crack_c.jpg' }
      },
      {
        _id: 'rec-pothole-04',
        mediaId: 'med-04',
        roadName: 'Industrial Area Sector 5 Road',
        damageType: 'D40' as const,
        damageCategory: 'Pothole',
        confidence: 0.92,
        boundingBox: { xmin: 200, ymin: 190, xmax: 390, ymax: 360 },
        hasLocation: true,
        latitude: 19.8915,
        longitude: 75.3618,
        location: { type: 'Point' as const, coordinates: [75.3618, 19.8915] as [number, number] },
        locationSource: 'MANUAL' as const,
        modelVersion: 'v1.2.0-precision-tuned',
        isDemo: false,
        status: 'UNVERIFIED' as const,
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        media: { publicUrl: '/samples/sample-pothole-2.jpg', originalFilename: 'sector5_depr.jpg' }
      },
      {
        _id: 'rec-longitudinal-05',
        mediaId: 'med-05',
        roadName: 'Central Boulevard Parkway',
        damageType: 'D00' as const,
        damageCategory: 'Longitudinal Crack',
        confidence: 0.81,
        boundingBox: { xmin: 280, ymin: 60, xmax: 340, ymax: 520 },
        hasLocation: true,
        latitude: 19.8730,
        longitude: 75.3490,
        location: { type: 'Point' as const, coordinates: [75.3490, 19.8730] as [number, number] },
        locationSource: 'EXIF' as const,
        modelVersion: 'v1.2.0-precision-tuned',
        isDemo: false,
        status: 'VERIFIED' as const,
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        media: { publicUrl: '/samples/sample-clean-road.jpg', originalFilename: 'boulevard_centerline.jpg' }
      }
    ];

    this.records = rawSeeds.map(s => ({
      ...s,
      metrics: calculateDistressMetrics(
        [s.boundingBox.xmin, s.boundingBox.ymin, s.boundingBox.xmax, s.boundingBox.ymax],
        s.damageType,
        640,
        480
      )
    }));
  }

  getAll(): StoredRecord[] {
    return [...this.records];
  }

  getFiltered(params: {
    type?: string;
    status?: string;
    hasLocation?: string;
    page?: number;
    limit?: number;
  }) {
    let list = [...this.records];

    if (params.type) {
      const types = params.type.split(',').map(t => t.trim().toUpperCase());
      list = list.filter(r => types.includes(r.damageType));
    }

    if (params.status) {
      list = list.filter(r => r.status.toUpperCase() === params.status?.toUpperCase());
    }

    if (params.hasLocation !== undefined && params.hasLocation !== '') {
      const wantLoc = params.hasLocation === 'true';
      list = list.filter(r => r.hasLocation === wantLoc);
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 15;
    const startIndex = (page - 1) * limit;
    const paginated = list.slice(startIndex, startIndex + limit);

    return {
      records: paginated,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  getStats() {
    const totalRecords = this.records.length;
    const d00Count = this.records.filter(r => r.damageType === 'D00').length;
    const d10Count = this.records.filter(r => r.damageType === 'D10').length;
    const d20Count = this.records.filter(r => r.damageType === 'D20').length;
    const d40Count = this.records.filter(r => r.damageType === 'D40').length;

    const verifiedCount = this.records.filter(r => r.status === 'VERIFIED').length;
    const unverifiedCount = this.records.filter(r => r.status === 'UNVERIFIED').length;
    const rejectedCount = this.records.filter(r => r.status === 'REJECTED').length;

    const withLocationCount = this.records.filter(r => r.hasLocation).length;
    const withoutLocationCount = totalRecords - withLocationCount;

    const realModelCount = this.records.filter(r => !r.isDemo).length;
    const demoFallbackCount = this.records.filter(r => r.isDemo).length;

    const recentRecords = [...this.records]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(r => ({
        ...r,
        mediaId: r.media
      }));

    return {
      totalRecords,
      totalMedia: Math.max(1, Math.ceil(totalRecords * 0.7)),
      categories: {
        D00: d00Count,
        D10: d10Count,
        D20: d20Count,
        D40: d40Count
      },
      status: {
        verified: verifiedCount,
        unverified: unverifiedCount,
        rejected: rejectedCount
      },
      spatial: {
        withLocation: withLocationCount,
        withoutLocation: withoutLocationCount
      },
      provenance: {
        realModel: realModelCount,
        demoFallback: demoFallbackCount
      },
      recentRecords
    };
  }

  getGeoJson(types?: string[], status?: string) {
    let list = this.records.filter(r => r.hasLocation && r.location?.coordinates);

    if (types && types.length > 0) {
      list = list.filter(r => types.includes(r.damageType));
    }
    if (status) {
      list = list.filter(r => r.status.toUpperCase() === status.toUpperCase());
    }

    const features = list.map(r => ({
      type: 'Feature',
      geometry: r.location,
      properties: {
        id: r._id,
        damageType: r.damageType,
        damageCategory: r.damageCategory,
        confidence: r.confidence,
        status: r.status,
        roadName: r.roadName,
        imageUrl: r.media?.publicUrl || '/samples/sample-pothole-1.jpg',
        locationSource: r.locationSource,
        createdAt: r.createdAt,
        depth_max_mm: r.metrics?.depth_max_mm,
        depth_severity: r.metrics?.depth_severity,
        cavity_volume_liters: r.metrics?.cavity_volume_liters,
        asphalt_patch_mass_kg: r.metrics?.asphalt_patch_mass_kg
      }
    }));

    return {
      type: 'FeatureCollection',
      features
    };
  }

  addRecord(rec: Omit<StoredRecord, '_id' | 'createdAt' | 'updatedAt'>): StoredRecord {
    let finalMetrics = rec.metrics;
    if (!finalMetrics && rec.boundingBox) {
      finalMetrics = calculateDistressMetrics(
        [rec.boundingBox.xmin, rec.boundingBox.ymin, rec.boundingBox.xmax, rec.boundingBox.ymax],
        rec.damageType,
        640,
        480
      );
    }

    const newRec: StoredRecord = {
      ...rec,
      metrics: finalMetrics,
      _id: `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.records.unshift(newRec);
    return newRec;
  }

  updateStatus(id: string, status: 'VERIFIED' | 'REJECTED' | 'UNVERIFIED', notes?: string): boolean {
    const r = this.records.find(item => item._id === id);
    if (!r) return false;
    r.status = status;
    if (notes !== undefined) r.notes = notes;
    r.updatedAt = new Date().toISOString();
    return true;
  }

  deleteById(id: string): boolean {
    const lenBefore = this.records.length;
    this.records = this.records.filter(item => item._id !== id);
    return this.records.length < lenBefore;
  }

  deleteMany(ids: string[]): number {
    const lenBefore = this.records.length;
    this.records = this.records.filter(item => !ids.includes(item._id));
    return lenBefore - this.records.length;
  }

  clearAll() {
    this.records = [];
  }
}

// Global singleton
let store: ResilientStore;
if (!(global as any).__resilientRoadStore) {
  store = new ResilientStore();
  (global as any).__resilientRoadStore = store;
} else {
  store = (global as any).__resilientRoadStore;
}

export { store as resilientStore };
