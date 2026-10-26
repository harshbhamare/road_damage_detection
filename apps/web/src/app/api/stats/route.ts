import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DamageRecord } from '@/models/DamageRecord';
import { Media } from '@/models/Media';
import { resilientStore } from '@/lib/resilientStore';

export async function GET() {
  try {
    const conn = await connectToDatabase().catch(() => null);

    if (conn) {
      const [
        totalRecords,
        totalMedia,
        d00Count,
        d10Count,
        d20Count,
        d40Count,
        verifiedCount,
        unverifiedCount,
        rejectedCount,
        withLocationCount,
        withoutLocationCount,
        realModelCount,
        demoFallbackCount,
        recentRecords
      ] = await Promise.all([
        DamageRecord.countDocuments(),
        Media.countDocuments(),
        DamageRecord.countDocuments({ damageType: 'D00' }),
        DamageRecord.countDocuments({ damageType: 'D10' }),
        DamageRecord.countDocuments({ damageType: 'D20' }),
        DamageRecord.countDocuments({ damageType: 'D40' }),
        DamageRecord.countDocuments({ status: 'VERIFIED' }),
        DamageRecord.countDocuments({ status: 'UNVERIFIED' }),
        DamageRecord.countDocuments({ status: 'REJECTED' }),
        DamageRecord.countDocuments({ hasLocation: true }),
        DamageRecord.countDocuments({ hasLocation: false }),
        DamageRecord.countDocuments({ isDemo: false }),
        DamageRecord.countDocuments({ isDemo: true }),
        DamageRecord.find()
          .populate('mediaId', 'publicUrl originalFilename')
          .sort({ createdAt: -1 })
          .limit(5)
          .lean()
      ]);

      if (totalRecords > 0) {
        return NextResponse.json({
          success: true,
          source: 'mongodb',
          stats: {
            totalRecords,
            totalMedia,
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
            }
          },
          recentRecords
        });
      }
    }
  } catch (error: any) {
    console.warn('[API Stats DB Notice] Using resilient fallback store:', error?.message);
  }

  // Graceful fallback to resilient store
  const fallbackStats = resilientStore.getStats();
  return NextResponse.json({
    success: true,
    source: 'resilient_store',
    stats: fallbackStats,
    recentRecords: fallbackStats.recentRecords
  });
}
