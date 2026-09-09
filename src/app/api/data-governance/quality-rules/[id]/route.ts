import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DataGovernanceService } from '@/lib/services/data-governance-service';

/** GET /api/data-governance/quality-rules/[id] — get a single quality rule */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const qualityRule = await DataGovernanceService.getQualityRule(id);
  if (!qualityRule) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ qualityRule });
}

/** PATCH /api/data-governance/quality-rules/[id] — update a quality rule */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const qualityRule = await DataGovernanceService.updateQualityRule(id, {
      name: body.name, catalogEntryId: body.catalogEntryId, type: body.type,
      description: body.description, rule: body.rule, threshold: body.threshold,
      frequency: body.frequency, status: body.status,
    });
    if (!qualityRule) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ qualityRule });
  } catch (e) {
    console.error('[data-governance/quality-rules] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_quality_rule' }, { status: 500 });
  }
}

/** DELETE /api/data-governance/quality-rules/[id] — delete a quality rule */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const ok = await DataGovernanceService.deleteQualityRule(id);
    if (!ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data-governance/quality-rules] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_quality_rule' }, { status: 500 });
  }
}
