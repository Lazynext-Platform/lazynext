import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { ReportBuilderService } from '@/lib/services/report-builder-service';
import { ReportExportService } from '@/lib/services/report-export-service';

/** GET /api/reports/[id]/export?format=csv|json|excel|html|markdown — export a report */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const format = (req.nextUrl.searchParams.get('format') as 'csv' | 'json' | 'excel' | 'html' | 'markdown') || 'csv';

  const report = await ReportBuilderService.get(id);
  if (!report) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const result = await ReportBuilderService.execute(id, session.user.id);
  if (!result) {
    return NextResponse.json({ error: 'execution_failed' }, { status: 500 });
  }

  const data = {
    columns: result.columns,
    rows: result.rows,
  };

  const filename = ReportExportService.generateFilename(report.name, format);

  let content: string;
  let contentType: string;

  switch (format) {
    case 'json':
      content = ReportExportService.toJSON(data);
      contentType = 'application/json';
      break;
    case 'excel':
      content = ReportExportService.toExcelXML(data);
      contentType = 'application/vnd.ms-excel';
      break;
    case 'html':
      content = ReportExportService.toHTML(data);
      contentType = 'text/html';
      break;
    case 'markdown':
      content = ReportExportService.toMarkdown(data);
      contentType = 'text/markdown';
      break;
    case 'csv':
    default:
      content = ReportExportService.toCSV(data);
      contentType = 'text/csv';
      break;
  }

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
