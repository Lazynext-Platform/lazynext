import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { AuditStatus } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/audits — list audits */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const audits = await QualityManagementService.listAudits(organizationId, {
    status: (sp.get('status') as AuditStatus) || undefined,
    standardId: sp.get('standardId') || undefined,
  });

  return NextResponse.json({ audits });
}

/** POST /api/quality-management/audits — create an audit */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const auditor = String(body.auditor || '').trim();
  const date = String(body.date || '').trim();
  const scope = String(body.scope || '').trim();
  if (!title) {
    return NextResponse.json({ error: 'title_required' }, { status: 400 });
  }
  if (!auditor) {
    return NextResponse.json({ error: 'auditor_required' }, { status: 400 });
  }
  if (!date) {
    return NextResponse.json({ error: 'date_required' }, { status: 400 });
  }
  if (!scope) {
    return NextResponse.json({ error: 'scope_required' }, { status: 400 });
  }

  try {
    const audit = await QualityManagementService.createAudit(
      organizationId,
      body.workspaceId || organizationId,
      {
        standardId: body.standardId,
        title,
        auditor,
        date,
        scope,
        criteria: body.criteria,
        status: body.status as AuditStatus | undefined,
      },
      userId,
    );
    return NextResponse.json({ audit }, { status: 201 });
  } catch (e) {
    console.error('[quality-management] create audit error:', e);
    return NextResponse.json({ error: 'failed_to_create_audit' }, { status: 500 });
  }
}
