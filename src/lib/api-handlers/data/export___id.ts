import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataExportService } from '@/lib/services/data-export-service';

/** GET /api/data/export/[id] — get a single export */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const exportRecord = await DataExportService.getExport(id);
  if (!exportRecord) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ export: exportRecord });
}

/** DELETE /api/data/export/[id] — delete an export */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await DataExportService.deleteExport(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data/export] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_export' }, { status: 500 });
  }
}
