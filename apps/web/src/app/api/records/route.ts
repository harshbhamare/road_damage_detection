import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DamageRecord } from '@/models/DamageRecord';
import { resilientStore } from '@/lib/resilientStore';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const damageType = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';
  const hasLocation = searchParams.get('hasLocation') || '';
  const isDemo = searchParams.get('isDemo');

  try {
    const conn = await connectToDatabase().catch(() => null);

    if (conn) {
      const filter: any = {};
      if (damageType) {
        if (damageType.includes(',')) {
          filter.damageType = { $in: damageType.split(',').map(s => s.trim().toUpperCase()) };
        } else {
          filter.damageType = damageType;
        }
      }
      if (status) filter.status = status;
      if (hasLocation === 'true') filter.hasLocation = true;
      if (hasLocation === 'false') filter.hasLocation = false;
      if (isDemo === 'true') filter.isDemo = true;
      if (isDemo === 'false') filter.isDemo = false;

      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        DamageRecord.find(filter)
          .populate('mediaId', 'originalFilename publicUrl uploadTimestamp roadName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        DamageRecord.countDocuments(filter)
      ]);

      if (total > 0) {
        return NextResponse.json({
          success: true,
          source: 'mongodb',
          records,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        });
      }
    }
  } catch (error: any) {
    console.warn('[API Records DB Notice] Using resilient store:', error?.message);
  }

  // Resilient store fallback
  const result = resilientStore.getFiltered({
    type: damageType,
    status,
    hasLocation,
    page,
    limit
  });

  return NextResponse.json({
    success: true,
    source: 'resilient_store',
    records: result.records,
    pagination: result.pagination
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, notes } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Record id and status are required' }, { status: 400 });
    }

    try {
      const conn = await connectToDatabase().catch(() => null);
      if (conn) {
        const updated = await DamageRecord.findByIdAndUpdate(
          id,
          {
            status,
            ...(notes ? { notes } : {}),
            verifiedAt: status === 'VERIFIED' ? new Date() : undefined
          },
          { new: true }
        );
        if (updated) {
          return NextResponse.json({ success: true, record: updated });
        }
      }
    } catch {}

    resilientStore.updateStatus(id, status, notes);
    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    try {
      const conn = await connectToDatabase().catch(() => null);
      if (conn) {
        if (body.all === true) {
          const res = await DamageRecord.deleteMany({});
          return NextResponse.json({
            success: true,
            message: `All damage records (${res.deletedCount}) deleted successfully`
          });
        }

        if (Array.isArray(body.ids) && body.ids.length > 0) {
          const res = await DamageRecord.deleteMany({ _id: { $in: body.ids } });
          return NextResponse.json({
            success: true,
            message: `Deleted ${res.deletedCount} damage record(s)`
          });
        }
      }
    } catch {}

    // Resilient fallback
    if (body.all === true) {
      resilientStore.clearAll();
      return NextResponse.json({ success: true, message: 'All records cleared' });
    }

    if (Array.isArray(body.ids) && body.ids.length > 0) {
      const count = resilientStore.deleteMany(body.ids);
      return NextResponse.json({ success: true, message: `Deleted ${count} record(s)` });
    }

    return NextResponse.json({ error: 'No record IDs provided for deletion' }, { status: 400 });
  } catch (error: any) {
    console.error('[API Delete Records Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to delete records' }, { status: 500 });
  }
}
