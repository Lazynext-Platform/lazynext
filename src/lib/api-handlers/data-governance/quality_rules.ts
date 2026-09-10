import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/quality-rules — list quality rules */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ qualityRules: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const opts: { catalogEntryId?: string; type?: string; status?: string } = {};
  const catalogEntryId = url.searchParams.get('catalogEntryId');
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  if (catalogEntryId) opts.catalogEntryId = catalogEntryId;
  if (type) opts.type = type;
  if (status) opts.status = status;

  const qualityRules = await DataGovernanceService.listQualityRules(organizationId, opts as never);
  return NextResponse.json({ qualityRules });
}

/** POST /api/data-governance/quality-rules — create a quality rule */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim();
  const type = String(body.type || '').trim();
  const rule = String(body.rule || '').trim();
  if (!name || !type || !rule) {
    return NextResponse.json({ error: 'name_type_rule_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const ws = workspaces[0];
  try {
    const qualityRule = await DataGovernanceService.createQualityRule(
      ws.organizationId, ws.id,
      {
        name, type: type as never, rule,
        catalogEntryId: body.catalogEntryId, description: body.description,
        threshold: body.threshold, frequency: body.frequency, status: body.status,
        lastRun: body.lastRun, lastResult: body.lastResult, violations: body.violations,
      },
      session.user.id,
    );
    return NextResponse.json({ qualityRule }, { status: 201 });
  } catch (e) {
    console.error('[data-governance/quality-rules] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_quality_rule' }, { status: 500 });
  }
}
