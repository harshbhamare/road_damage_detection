import { Request, Response } from 'express';
import { DamageRecord, DamageCode } from '../models/DamageRecord';

/**
 * Retrieve damage records within a geographic bounding box (for map viewport queries)
 * Returns a standard GeoJSON FeatureCollection.
 */
export async function getSpatialDamages(req: Request, res: Response): Promise<void> {
  try {
    const { bbox, types, minConfidence, verificationStatus } = req.query;

    const filter: any = {};

    // Geospatial Bounding Box Filter
    if (typeof bbox === 'string') {
      const parts = bbox.split(',').map(Number);
      if (parts.length === 4 && parts.every(n => !isNaN(n))) {
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

    // Damage Type Filter (e.g. D00, D40)
    if (typeof types === 'string') {
      const typeList = types.split(',').map(t => t.trim().toUpperCase());
      filter.damageType = { $in: typeList };
    }

    // Minimum Confidence Score Filter
    if (typeof minConfidence === 'string') {
      const conf = parseFloat(minConfidence);
      if (!isNaN(conf)) {
        filter.confidence = { $gte: conf };
      }
    }

    // Verification Status Filter
    if (typeof verificationStatus === 'string') {
      filter.verificationStatus = verificationStatus.toUpperCase();
    }

    const records = await DamageRecord.find(filter)
      .populate('mediaId', 'originalFilename storagePath uploadTimestamp')
      .populate('modelVersionId', 'modelName versionTag')
      .limit(1000)
      .lean();

    // Transform into standard GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: records.map(rec => ({
        type: 'Feature',
        id: rec._id,
        geometry: rec.location,
        properties: {
          id: rec._id,
          mediaId: rec.mediaId,
          damageType: rec.damageType,
          damageCategory: rec.damageCategory,
          confidence: rec.confidence,
          boundingBox: rec.boundingBox,
          normalizedBoundingBox: rec.normalizedBoundingBox,
          verificationStatus: rec.verificationStatus,
          verifiedBy: rec.verifiedBy,
          verifiedAt: rec.verifiedAt,
          modelVersion: rec.modelVersionId,
          createdAt: rec.createdAt
        }
      }))
    };

    res.json(featureCollection);
  } catch (error: any) {
    console.error('[Damage Query Error]', error);
    res.status(500).json({ error: 'Failed to retrieve spatial damage records', details: error.message });
  }
}

/**
 * Retrieve a specific damage record by its ID
 */
export async function getDamageById(req: Request, res: Response): Promise<void> {
  try {
    const record = await DamageRecord.findById(req.params.id)
      .populate('mediaId')
      .populate('modelVersionId');

    if (!record) {
      res.status(404).json({ error: 'Damage record not found' });
      return;
    }

    res.json(record);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Human-in-the-loop verification endpoint
 */
export async function verifyDamage(req: Request, res: Response): Promise<void> {
  try {
    const { status, verifiedBy } = req.body;

    if (!['VERIFIED', 'REJECTED', 'UNVERIFIED'].includes(status)) {
      res.status(400).json({ error: 'Invalid verification status. Must be VERIFIED, REJECTED, or UNVERIFIED.' });
      return;
    }

    const updated = await DamageRecord.findByIdAndUpdate(
      req.params.id,
      {
        verificationStatus: status,
        verifiedBy: verifiedBy || 'anonymous_verifier',
        verifiedAt: new Date()
      },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ error: 'Damage record not found' });
      return;
    }

    res.json({
      success: true,
      message: `Damage record marked as ${status}`,
      record: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
