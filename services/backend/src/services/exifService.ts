import exifr from 'exifr';
import fs from 'fs';

export interface ExifExtractionResult {
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  captureTimestamp?: Date;
  cameraMake?: string;
  cameraModel?: string;
}

/**
 * Extracts real GPS coordinates and metadata from image EXIF data.
 * Does not generate or mock fake GPS coordinates.
 */
export async function extractExifMetadata(filePath: string): Promise<ExifExtractionResult> {
  try {
    const fileBuffer = await fs.promises.readFile(filePath);
    const parsed = await exifr.parse(fileBuffer, {
      gps: true,
      tiff: true,
      exif: true
    });

    if (!parsed) {
      return { hasGps: false };
    }

    const hasGps = typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number';

    let captureTimestamp: Date | undefined;
    if (parsed.DateTimeOriginal) {
      captureTimestamp = new Date(parsed.DateTimeOriginal);
    } else if (parsed.CreateDate) {
      captureTimestamp = new Date(parsed.CreateDate);
    }

    return {
      hasGps,
      latitude: hasGps ? parsed.latitude : undefined,
      longitude: hasGps ? parsed.longitude : undefined,
      altitude: typeof parsed.GPSAltitude === 'number' ? parsed.GPSAltitude : undefined,
      captureTimestamp,
      cameraMake: parsed.Make,
      cameraModel: parsed.Model
    };
  } catch (error) {
    console.warn(`[EXIF] Failed to parse EXIF for ${filePath}:`, error);
    return { hasGps: false };
  }
}
