import { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { Media } from '../models/Media';
import { DamageRecord, DamageCode } from '../models/DamageRecord';
import { ProcessingJob } from '../models/ProcessingJob';
import { ModelVersion } from '../models/ModelVersion';
import { extractExifMetadata } from '../services/exifService';
import { mlClient } from '../services/mlClient';

// Map RDD damage codes to human-readable categories
const DAMAGE_CATEGORY_MAP: Record<DamageCode, string> = {
  D00: 'Longitudinal Crack',
  D10: 'Transverse Crack',
  D20: 'Alligator Crack',
  D40: 'Pothole'
};

/**
 * Handle road media upload, EXIF extraction, and trigger ML processing pipeline
 */
export async function uploadMedia(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No image file provided in upload' });
      return;
    }

    const file = req.file;
    const filePath = file.path;

    // Calculate SHA-256 for integrity and duplicate prevention
    const fileBuffer = await fs.promises.readFile(filePath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Extract EXIF data (strictly real metadata; no mock coordinates)
    const exif = await extractExifMetadata(filePath);

    let locationSource: 'EXIF' | 'USER_PINNED' | 'UNKNOWN' = 'UNKNOWN';
    let coordinates: [number, number] | undefined = undefined;

    if (exif.hasGps && exif.longitude !== undefined && exif.latitude !== undefined) {
      locationSource = 'EXIF';
      coordinates = [exif.longitude, exif.latitude];
    } else if (req.body.longitude && req.body.latitude) {
      const userLng = parseFloat(req.body.longitude);
      const userLat = parseFloat(req.body.latitude);
      if (!isNaN(userLng) && !isNaN(userLat) && userLng >= -180 && userLng <= 180 && userLat >= -90 && userLat <= 90) {
        locationSource = 'USER_PINNED';
        coordinates = [userLng, userLat];
      }
    }

    // Create Media record in MongoDB
    const mediaDoc = await Media.create({
      originalFilename: file.originalname,
      storagePath: filePath,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      fileHashSha256: hash,
      hasExifGps: exif.hasGps,
      location: coordinates ? { type: 'Point', coordinates } : undefined,
      exifData: {
        captureTimestamp: exif.captureTimestamp,
        cameraMake: exif.cameraMake,
        cameraModel: exif.cameraModel,
        altitudeMeters: exif.altitude
      },
      locationSource,
      uploadTimestamp: new Date(),
      status: 'PENDING'
    });

    // Create ProcessingJob
    const jobDoc = await ProcessingJob.create({
      mediaId: mediaDoc._id,
      status: 'QUEUED',
      startedAt: new Date()
    });

    // Respond immediately to client with accepted job
    res.status(202).json({
      success: true,
      message: 'Media uploaded successfully. Inference job queued.',
      mediaId: mediaDoc._id,
      jobId: jobDoc._id,
      hasLocation: !!coordinates,
      locationSource,
      coordinates
    });

    // Trigger asynchronous ML processing (fire and manage via job state)
    processMediaInference(mediaDoc._id.toString(), filePath, coordinates).catch(err => {
      console.error(`[Inference Pipeline] Error processing media ${mediaDoc._id}:`, err);
    });

  } catch (error: any) {
    console.error('[Media Upload Error]', error);
    res.status(500).json({ error: 'Failed to process media upload', details: error.message });
  }
}

/**
 * Background pipeline runner for invoking ML microservice and persisting damage records
 */
async function processMediaInference(
  mediaIdStr: string,
  filePath: string,
  coordinates?: [number, number]
): Promise<void> {
  const startTime = Date.now();
  const job = await ProcessingJob.findOne({ mediaId: mediaIdStr, status: 'QUEUED' });

  try {
    if (job) {
      job.status = 'PROCESSING';
      await job.save();
    }

    // Fetch active model version if registered
    const activeModel = await ModelVersion.findOne({ isActive: true });

    // Call Python FastAPI ML Service
    const mlResult = await mlClient.runInference(filePath);

    // Save each detected damage
    if (mlResult.detections && mlResult.detections.length > 0) {
      for (const detection of mlResult.detections) {
        // If media has valid coordinates, associate damage with the location
        if (coordinates) {
          await DamageRecord.create({
            mediaId: mediaIdStr,
            location: {
              type: 'Point',
              coordinates
            },
            damageType: detection.class_code,
            damageCategory: DAMAGE_CATEGORY_MAP[detection.class_code] || detection.class_name,
            confidence: detection.confidence,
            boundingBox: {
              xmin: detection.box_xyxy[0],
              ymin: detection.box_xyxy[1],
              xmax: detection.box_xyxy[2],
              ymax: detection.box_xyxy[3]
            },
            normalizedBoundingBox: {
              xCenter: detection.box_normalized[0],
              yCenter: detection.box_normalized[1],
              width: detection.box_normalized[2],
              height: detection.box_normalized[3]
            },
            verificationStatus: 'UNVERIFIED',
            modelVersionId: activeModel ? activeModel._id : undefined
          });
        }
      }
    }

    // Complete Job
    if (job) {
      job.status = 'COMPLETED';
      job.completedAt = new Date();
      job.executionTimeMs = Date.now() - startTime;
      job.modelVersionId = activeModel ? activeModel._id : undefined;
      await job.save();
    }

    await Media.findByIdAndUpdate(mediaIdStr, { status: 'PROCESSED' });
    console.log(`[Inference Pipeline] Successfully processed media ${mediaIdStr} with ${mlResult.detections.length} detections.`);

  } catch (error: any) {
    console.error(`[Inference Pipeline] Job failed for media ${mediaIdStr}:`, error.message);
    if (job) {
      job.status = 'FAILED';
      job.completedAt = new Date();
      job.executionTimeMs = Date.now() - startTime;
      job.errorMessage = error.message;
      await job.save();
    }
    await Media.findByIdAndUpdate(mediaIdStr, { status: 'FAILED' });
  }
}

/**
 * Fetch media details by ID
 */
export async function getMediaById(req: Request, res: Response): Promise<void> {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) {
      res.status(404).json({ error: 'Media not found' });
      return;
    }
    res.json(media);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
