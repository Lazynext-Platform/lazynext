import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/retention — list retention rules for an organization.
 * Query params: organizationId (required)
 */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const organizationId = url.searchParams.get('organizationId');
  if (!organizationId) {
    return NextResponse.json({ error: 'organization_id_required' }, { status: 400 });
  }

  try {
    const rules = await GovernanceService.listRetentionRules(organizationId);
    return NextResponse.json({ rules });
  } catch (e) {
    console.error('[governance/retention] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_retention_rules' }, { status: 500 });
  }
}

/**
 * POST /api/governance/retention — create a retention rule.
 * Body: { organizationId, dataType, retentionDays?, action?, enabled? }
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    dataType?: string;
    retentionDays?: number;
    action?: string;
    enabled?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.organizationId || !body.dataType) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  try {
    const rule = await GovernanceService.createRetentionRule(body.organizationId, {
      dataType: body.dataType,
      retentionDays: body.retentionDays,
      action: body.action,
      enabled: body.enabled,
    });
    if (!rule) {
      return NextResponse.json({ error: 'failed_to_create_retention_rule' }, { status: 500 });
    }
    return NextResponse.json({ rule }, { status: 201 });
  } catch (e) {
    console.error('[governance/retention] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_retention_rule' }, { status: 500 });
  }
}
