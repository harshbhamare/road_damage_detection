import exifr from 'exifr';

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
 * Extracts real GPS coordinates and metadata from an image buffer.
 * Strictly avoids generating or mocking fake GPS coordinates.
 */
export async function extractExifFromBuffer(buffer: Buffer): Promise<ExifExtractionResult> {
  try {
    const parsed = await exifr.parse(buffer, {
      gps: true,
      tiff: true,
      exif: true
    });

    if (!parsed) {
      return { hasGps: false };
    }

    const hasGps =
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      !isNaN(parsed.latitude) &&
      !isNaN(parsed.longitude);

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
  } catch (err) {
    console.warn('[EXIF] Failed to parse buffer metadata:', err);
    return { hasGps: false };
  }
}
