import { NextRequest, NextResponse } from 'next/server';
import { QualityManagementService } from '@/lib/services/quality-management-service';
import type { AuditStatus } from '@/lib/services/quality-management-service';

/** POST /api/quality-management/audits/[id]/complete — complete an audit */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  try {
    const audit = await QualityManagementService.completeAudit(id, {
      findings: Array.isArray(body.findings) ? body.findings : undefined,
      status: body.status as AuditStatus | undefined,
    });
    if (!audit) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ audit });
  } catch (e) {
    console.error('[quality-management] complete audit error:', e);
    return NextResponse.json({ error: 'failed_to_complete_audit' }, { status: 500 });
  }
}
