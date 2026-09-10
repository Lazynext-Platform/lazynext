import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GovernanceService } from '@/lib/services/governance';

/**
 * GET /api/governance/checks — list compliance checks for an organization.
 * Query params: organizationId (required), status, severity, workspaceId, limit
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

  const status = url.searchParams.get('status') || undefined;
  const severity = url.searchParams.get('severity') || undefined;
  const workspaceId = url.searchParams.get('workspaceId') || undefined;
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50;

  try {
    const checks = await GovernanceService.listChecks(organizationId, {
      status: status as 'pending' | 'passed' | 'failed' | 'warning' | 'not_applicable' | undefined,
      severity: severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
      workspaceId: workspaceId || undefined,
      limit,
    });
    return NextResponse.json({ checks });
  } catch (e) {
    console.error('[governance/checks] list error:', e);
    return NextResponse.json({ error: 'failed_to_list_checks' }, { status: 500 });
  }
}

/**
 * POST /api/governance/checks — create a compliance check (and optionally run it).
 * Body: { organizationId, workspaceId?, checkName, run?: boolean, ... }
 * If run is true, runs the check and stores the result.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    organizationId?: string;
    workspaceId?: string | null;
    policyId?: string | null;
    checkName?: string;
    description?: string | null;
    status?: string;
    severity?: string;
    details?: Record<string, unknown>;
    remediation?: string | null;
    run?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.organizationId || !body.checkName) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  try {
    // If run is true, execute the check and store the result
    if (body.run) {
      const result = await GovernanceService.runComplianceCheck(
        body.organizationId,
        body.checkName as 'token_security' | 'workspace_isolation' | 'audit_coverage' | 'data_retention',
      );
      const severity =
        result.status === 'failed' ? 'high' : result.status === 'warning' ? 'medium' : 'low';
      const check = await GovernanceService.createCheck(body.organizationId, {
        workspaceId: body.workspaceId || null,
        checkName: body.checkName,
        description: body.description || `Compliance check: ${body.checkName}`,
        status: result.status,
        severity: severity as 'low' | 'medium' | 'high' | 'critical',
        details: result.details,
        remediation: result.remediation || null,
      });
      if (!check) {
        return NextResponse.json({ error: 'failed_to_create_check' }, { status: 500 });
      }
      return NextResponse.json({ check, result }, { status: 201 });
    }

    // Otherwise just create a manual check record
    const check = await GovernanceService.createCheck(body.organizationId, {
      workspaceId: body.workspaceId || null,
      policyId: body.policyId || null,
      checkName: body.checkName,
      description: body.description || null,
      status: body.status as 'pending' | 'passed' | 'failed' | 'warning' | 'not_applicable' | undefined,
      severity: body.severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
      details: body.details,
      remediation: body.remediation || null,
    });
    if (!check) {
      return NextResponse.json({ error: 'failed_to_create_check' }, { status: 500 });
    }
    return NextResponse.json({ check }, { status: 201 });
  } catch (e) {
    console.error('[governance/checks] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_check' }, { status: 500 });
  }
}
