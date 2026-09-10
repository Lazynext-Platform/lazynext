import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { BrandManagementService } from '@/lib/services/brand-management-service';

export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ guidelines: [] });
  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: Record<string, string> = {};
  for (const k of ['category', 'status']) { const v = url.searchParams.get(k); if (v) opts[k] = v; }
  const guidelines = await BrandManagementService.listGuidelines(organizationId, opts as never);
  return NextResponse.json({ guidelines });
}

export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const category = String(body.category || '').trim();
  if (!title || !category) return NextResponse.json({ error: 'title_category_required' }, { status: 400 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  const ws = workspaces[0];
  try {
    const guideline = await BrandManagementService.createGuideline(ws.organizationId, ws.id, {
      title, category: category as never,
      description: body.description, guidelines: body.guidelines,
      version: body.version, status: body.status,
      effectiveDate: body.effectiveDate, reviewedBy: body.reviewedBy, notes: body.notes,
    }, session.user.id);
    return NextResponse.json({ guideline }, { status: 201 });
  } catch (e) {
    console.error('[brand-management/guidelines] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_guideline' }, { status: 500 });
  }
}
