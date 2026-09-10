import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/governance/retention/[id] — update a retention rule.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let body: {
    retentionDays?: number;
    action?: string;
    enabled?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  try {
    const rule = await GovernanceService.updateRetentionRule(id, {
      retentionDays: body.retentionDays,
      action: body.action,
      enabled: body.enabled,
    });
    if (!rule) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ rule });
  } catch (e) {
    console.error('[governance/retention] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_retention_rule' }, { status: 500 });
  }
}

/**
 * DELETE /api/governance/retention/[id] — delete a retention rule.
 */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;

  try {
    await prisma.retentionRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[governance/retention] delete error:', e);
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
