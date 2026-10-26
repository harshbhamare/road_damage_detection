import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { connectToDatabase } from '@/lib/mongodb';
import { Media } from '@/models/Media';
import { DamageRecord, DamageCode } from '@/models/DamageRecord';
import { extractExifFromBuffer } from '@/lib/exif';
import { getInferenceService } from '@/lib/inference/service';
import { resilientStore } from '@/lib/resilientStore';
import { calculatePci } from '@/lib/pciEngine';
import { calculateDistressMetrics } from '@/lib/depthEngine';

const DAMAGE_CATEGORIES: Record<DamageCode, string> = {
  D00: 'Longitudinal Crack',
  D10: 'Transverse Crack',
  D20: 'Alligator Crack',
  D40: 'Pothole'
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const roadName = (formData.get('roadName') as string) || 'Unspecified Road';
    const manualLatStr = formData.get('latitude') as string | null;
    const manualLngStr = formData.get('longitude') as string | null;
    const confThresholdStr = formData.get('confThreshold') as string | null;
    const precisionModeRaw = (formData.get('precisionMode') as string) || 'balanced';
    const precisionMode: 'high' | 'balanced' | 'sensitive' = (['high', 'balanced', 'sensitive'].includes(precisionModeRaw)
      ? precisionModeRaw
      : 'balanced') as any;

    const parsedConf = confThresholdStr ? parseFloat(confThresholdStr) : undefined;
    const confThreshold = (parsedConf !== undefined && !isNaN(parsedConf) && parsedConf >= 0.01 && parsedConf <= 0.95)
      ? parsedConf
      : undefined;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided in upload' }, { status: 400 });
    }


    // Validate MIME type
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid image format (${file.type}). Supported: JPEG, PNG, WebP` },
        { status: 400 }
      );
    }

    // Validate size (50MB limit)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Image file exceeds maximum allowable size of 50MB` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // File hash for deduplication and audit trail
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    // Save to public/uploads directory for direct web serving
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(file.name) || '.jpg';
    const uniqueFilename = `road-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    const filePath = path.join(uploadDir, uniqueFilename);
    await fs.promises.writeFile(filePath, buffer);
    const publicUrl = `/uploads/${uniqueFilename}`;

    // Extract real EXIF metadata (strictly no fake coordinates)
    const exif = await extractExifFromBuffer(buffer);

    let locationSource: 'EXIF' | 'MANUAL' | 'UNAVAILABLE' = 'UNAVAILABLE';
    let coordinates: [number, number] | undefined = undefined;
    let latitude: number | undefined = undefined;
    let longitude: number | undefined = undefined;

    if (exif.hasGps && exif.longitude !== undefined && exif.latitude !== undefined) {
      locationSource = 'EXIF';
      latitude = exif.latitude;
      longitude = exif.longitude;
      coordinates = [exif.longitude, exif.latitude];
    } else if (manualLatStr && manualLngStr) {
      const parsedLat = parseFloat(manualLatStr);
      const parsedLng = parseFloat(manualLngStr);
      if (
        !isNaN(parsedLat) &&
        !isNaN(parsedLng) &&
        parsedLat >= -90 &&
        parsedLat <= 90 &&
        parsedLng >= -180 &&
        parsedLng <= 180
      ) {
        locationSource = 'MANUAL';
        latitude = parsedLat;
        longitude = parsedLng;
        coordinates = [parsedLng, parsedLat];
      }
    }

    // Attempt MongoDB connection
    const conn = await connectToDatabase().catch(() => null);
    let mediaDoc: any = null;

    if (conn) {
      try {
        const mediaPayload: any = {
          originalFilename: file.name,
          storagePath: filePath,
          publicUrl,
          mimeType: file.type,
          fileSizeBytes: file.size,
          fileHashSha256: sha256,
          hasExifGps: exif.hasGps,
          roadName,
          exifData: {
            captureTimestamp: exif.captureTimestamp,
            cameraMake: exif.cameraMake,
            cameraModel: exif.cameraModel,
            altitudeMeters: exif.altitude
          },
          locationSource,
          uploadTimestamp: new Date(),
          status: 'PROCESSED'
        };

        if (coordinates && coordinates.length === 2) {
          mediaPayload.location = { type: 'Point', coordinates };
        }

        mediaDoc = await Media.create(mediaPayload);
      } catch (dbErr: any) {
        console.warn('[DB Notice] Media save fallback to local:', dbErr?.message);
      }
    }

    const fallbackMediaId = `med-${Date.now()}`;
    const mediaId = mediaDoc ? mediaDoc._id.toString() : fallbackMediaId;

    // Execute Inference via Modular Service Interface (FastAPI -> Direct Python YOLO -> Fallback)
    const inferenceService = await getInferenceService();
    const inferenceResult = await inferenceService.runInference(buffer, file.name, confThreshold, precisionMode);

    const savedRecords: any[] = [];

    // Save DamageRecords for all detected items
    if (inferenceResult.detections && inferenceResult.detections.length > 0) {
      for (const item of inferenceResult.detections) {
        const metrics = item.metrics || calculateDistressMetrics(
          item.box_xyxy,
          item.class_code,
          640,
          480
        );
        item.metrics = metrics;

        const damagePayload: any = {
          mediaId,
          roadName,
          damageType: item.class_code,
          damageCategory: DAMAGE_CATEGORIES[item.class_code as DamageCode] || item.class_name,
          confidence: item.confidence,
          boundingBox: {
            xmin: item.box_xyxy[0],
            ymin: item.box_xyxy[1],
            xmax: item.box_xyxy[2],
            ymax: item.box_xyxy[3]
          },
          normalizedBoundingBox: {
            xCenter: item.box_normalized[0],
            yCenter: item.box_normalized[1],
            width: item.box_normalized[2],
            height: item.box_normalized[3]
          },
          hasLocation: !!coordinates,
          latitude,
          longitude,
          locationSource,
          modelVersion: inferenceResult.modelVersion,
          isDemo: inferenceResult.isDemo,
          metrics,
          status: 'UNVERIFIED'
        };

        if (coordinates && coordinates.length === 2) {
          damagePayload.location = { type: 'Point', coordinates };
        }

        // Save in MongoDB if active
        if (conn && mediaDoc) {
          try {
            const damageDoc = await DamageRecord.create(damagePayload);
            savedRecords.push(damageDoc);
          } catch {}
        }

        // Always sync with resilient store for instant responsiveness
        const stored = resilientStore.addRecord({
          ...damagePayload,
          media: {
            publicUrl,
            originalFilename: file.name
          }
        });

        if (savedRecords.length < inferenceResult.detections.length && (!conn || !mediaDoc)) {
          savedRecords.push(stored);
        }
      }
    }

    // Calculate official ASTM D6433 Pavement Condition Index (PCI)
    const pci = calculatePci(
      (inferenceResult.detections || []).map(d => ({
        class_code: d.class_code,
        confidence: d.confidence
      }))
    );

    return NextResponse.json({
      success: true,
      media: {
        id: mediaId,
        filename: file.name,
        publicUrl,
        roadName,
        hasLocation: !!coordinates,
        latitude,
        longitude,
        locationSource,
        exifData: exif
      },
      inference: inferenceResult,
      recordsCreated: savedRecords.length,
      records: savedRecords,
      pci
    });
  } catch (error: any) {
    console.error('[API Upload Error]', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
