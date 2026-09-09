import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { AuditStatus } from '@/lib/services/quality-management-service';

/** GET /api/quality-management/audits/[id] — get an audit by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const audit = await QualityManagementService.getAudit(id);
  if (!audit) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ audit });
}

/** PATCH /api/quality-management/audits/[id] — update an audit */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const audit = await QualityManagementService.updateAudit(id, {
      standardId: body.standardId,
      title: body.title,
      auditor: body.auditor,
      date: body.date,
      scope: body.scope,
      criteria: body.criteria,
      status: body.status as AuditStatus | undefined,
    });
    if (!audit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ audit });
  } catch (e) {
    console.error('[quality-management] update audit error:', e);
    return NextResponse.json({ error: 'failed_to_update_audit' }, { status: 500 });
  }
}
