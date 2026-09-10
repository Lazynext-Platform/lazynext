import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataExportService } from '@/lib/services/data-export-service';

/** POST /api/data/export/[id]/run — run an export */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const exportRecord = await DataExportService.runExport(id);
    if (!exportRecord) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ export: exportRecord });
  } catch (e) {
    console.error('[data/export] run error:', e);
    return NextResponse.json({ error: 'failed_to_run_export' }, { status: 500 });
  }
}
