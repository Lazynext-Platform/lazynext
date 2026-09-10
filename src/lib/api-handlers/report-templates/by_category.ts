import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { ReportTemplateService } from '@/lib/services/report-template-service';

/** GET /api/report-templates/by-category?category=... — get templates by category */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const category = req.nextUrl.searchParams.get('category');
  if (!category) {
    return NextResponse.json({ error: 'category_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ templates: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const templates = await ReportTemplateService.getByCategory(organizationId, category);
  return NextResponse.json({ templates });
}
