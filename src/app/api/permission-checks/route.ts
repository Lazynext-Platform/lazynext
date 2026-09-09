import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import {
  PermissionEvaluator,
  type PermissionContext,
} from '@/lib/services/permission-evaluator';
import { safeError } from '@/lib/security';
import { RateLimiter, RateLimits } from '@/lib/services/rate-limit';

/**
 * POST /api/permission-checks
 * Check a permission against the 8-layer policy stack.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const limited = await RateLimiter.check(req, RateLimits.API_V1);
  if (limited) return limited;

  let body: Partial<PermissionContext>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const required: (keyof PermissionContext)[] = [
    'principalId',
    'principalType',
    'workspaceId',
    'organizationId',
    'resource',
    'resourceType',
    'action',
    'environment',
  ];
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return NextResponse.json({ error: `${field}_required` }, { status: 400 });
    }
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    const wsIds = workspaces.map((w) => w.id);
    if (!wsIds.includes(body.workspaceId!)) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Not a member of this workspace' },
        { status: 403 },
      );
    }

    const ctx: PermissionContext = {
      principalId: body.principalId!,
      principalType: body.principalType!,
      workspaceId: body.workspaceId!,
      organizationId: body.organizationId!,
      resource: body.resource!,
      resourceType: body.resourceType!,
      action: body.action!,
      environment: body.environment!,
      budgetImpact: body.budgetImpact,
      riskLevel: body.riskLevel,
    };

    const result = await PermissionEvaluator.checkPermission(ctx);
    return NextResponse.json({ result }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      safeError(e, 'permission-checks', 'check_failed'),
      { status: 500 },
    );
  }
}
