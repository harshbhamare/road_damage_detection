import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DamageRecord } from '@/models/DamageRecord';
import { resilientStore } from '@/lib/resilientStore';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const type = searchParams.get('type');
  const status = searchParams.get('status');
  const minConfidence = parseFloat(searchParams.get('minConfidence') || '0');
  const bbox = searchParams.get('bbox'); // minLng,minLat,maxLng,maxLat

  try {
    const conn = await connectToDatabase().catch(() => null);

    if (conn) {
      const filter: any = {
        hasLocation: true,
        latitude: { $ne: null },
        longitude: { $ne: null }
      };

      if (type) {
        const types = type.split(',').map((t) => t.trim().toUpperCase());
        filter.damageType = { $in: types };
      }

      if (status) {
        filter.status = status.toUpperCase();
      }

      if (minConfidence > 0) {
        filter.confidence = { $gte: minConfidence };
      }

      if (bbox) {
        const parts = bbox.split(',').map(Number);
        if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
          const [minLng, minLat, maxLng, maxLat] = parts;
          filter.location = {
            $geoWithin: {
              $box: [
                [minLng, minLat],
                [maxLng, maxLat]
              ]
            }
          };
        }
      }

      const records = await DamageRecord.find(filter)
        .populate('mediaId', 'publicUrl originalFilename uploadTimestamp roadName')
        .limit(1000)
        .lean();

      if (records.length > 0) {
        const featureCollection = {
          type: 'FeatureCollection',
          features: records
            .filter((r) => r.longitude !== undefined && r.latitude !== undefined)
            .map((r) => ({
              type: 'Feature',
              id: r._id.toString(),
              geometry: {
                type: 'Point',
                coordinates: [r.longitude, r.latitude]
              },
              properties: {
                id: r._id.toString(),
                mediaId: (r.mediaId as any)?._id?.toString() || r.mediaId?.toString(),
                imageUrl: (r.mediaId as any)?.publicUrl || '/samples/sample-pothole-1.jpg',
                roadName: r.roadName,
                damageType: r.damageType,
                damageCategory: r.damageCategory,
                confidence: r.confidence,
                boundingBox: r.boundingBox,
                normalizedBoundingBox: r.normalizedBoundingBox,
                locationSource: r.locationSource,
                modelVersion: r.modelVersion,
                isDemo: r.isDemo,
                status: r.status,
                createdAt: r.createdAt
              }
            }))
        };

        return NextResponse.json(featureCollection);
      }
    }
  } catch (error: any) {
    console.warn('[API Map Records DB Notice] Using resilient store:', error?.message);
  }

  // Resilient fallback
  const typesArr = type ? type.split(',').map(t => t.trim().toUpperCase()) : undefined;
  const fallbackCollection = resilientStore.getGeoJson(typesArr, status || undefined);
  return NextResponse.json(fallbackCollection);
}
