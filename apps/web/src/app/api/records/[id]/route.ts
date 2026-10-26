import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { DamageRecord } from '@/models/DamageRecord';
import { resilientStore } from '@/lib/resilientStore';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const conn = await connectToDatabase().catch(() => null);
    if (conn) {
      const record = await DamageRecord.findById(id).populate('mediaId').lean();
      if (record) {
        const siblingDamages = await DamageRecord.find({ mediaId: record.mediaId, _id: { $ne: record._id } }).lean();
        return NextResponse.json({
          success: true,
          record,
          siblingDamages
        });
      }
    }
  } catch {}

  // Resilient store fallback
  const all = resilientStore.getAll();
  const found = all.find((r) => r._id === id);
  if (found) {
    return NextResponse.json({
      success: true,
      record: {
        ...found,
        mediaId: found.media
      },
      siblingDamages: []
    });
  }

  return NextResponse.json({ error: 'Record not found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { status, verifiedBy, notes, roadName } = body;

  try {
    const conn = await connectToDatabase().catch(() => null);
    if (conn) {
      const updateData: any = {};
      if (status && ['UNVERIFIED', 'VERIFIED', 'REJECTED'].includes(status)) {
        updateData.status = status;
        updateData.verifiedAt = new Date();
        if (verifiedBy) updateData.verifiedBy = verifiedBy;
      }
      if (notes !== undefined) updateData.notes = notes;
      if (roadName) updateData.roadName = roadName;

      const updated = await DamageRecord.findByIdAndUpdate(id, updateData, { new: true });
      if (updated) {
        return NextResponse.json({ success: true, record: updated });
      }
    }
  } catch {}

  // Resilient fallback
  if (status) {
    resilientStore.updateStatus(id, status, notes);
  }

  return NextResponse.json({ success: true, message: `Record ${id} updated` });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const conn = await connectToDatabase().catch(() => null);
    if (conn) {
      const deleted = await DamageRecord.findByIdAndDelete(id);
      if (deleted) {
        return NextResponse.json({ success: true, message: 'Record deleted' });
      }
    }
  } catch {}

  resilientStore.deleteById(id);
  return NextResponse.json({ success: true, message: 'Record deleted from store' });
}
