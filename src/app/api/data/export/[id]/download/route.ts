import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataExportService } from '@/lib/services/data-export-service';

/** GET /api/data/export/[id]/download — download export data */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const exportRecord = await DataExportService.getExport(id);
  if (!exportRecord) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const contentType = exportRecord.format === 'csv'
    ? 'text/csv'
    : exportRecord.format === 'sql'
      ? 'application/sql'
      : 'application/json';

  const filename = `export-${id}.${exportRecord.format}`;

  return new NextResponse(exportRecord.data || '', {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
