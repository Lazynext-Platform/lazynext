import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CompanyBootstrapper, BOOTSTRAP_CREDIT_COST } from '@/lib/services/company-bootstrapper';
import { withAtlas } from '@/lib/request-context';
import { safeError } from '@/lib/security';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/company/bootstrap
 * Runs the wow-moment company bootstrap pipeline.
 *
 * Requires:
 *  - Authenticated user
 *  - User must own or be a member of the organization
 *  - Credits are deducted (10 credits)
 *  - Credits are refunded on failure
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { organizationId, name, description, industry, targetMarket } = body;

    if (!organizationId || !name || !description) {
      return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
    }

    // Verify the user has access to this organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, ownerId: true, defaultWorkspaceId: true },
    });

    if (!org) {
      return NextResponse.json({ error: 'organization_not_found' }, { status: 404 });
    }

    // Get the user's workspace in this organization
    const membership = await prisma.membership.findFirst({
      where: { userId: session.user.id },
      select: { workspace: { select: { id: true, organizationId: true } } },
    });

    if (!membership || membership.workspace.organizationId !== organizationId) {
      return NextResponse.json({ error: 'no_workspace_access' }, { status: 403 });
    }

    const workspaceId = membership.workspace.id;

    // Run the bootstrap with credit metering
    const result = await withAtlas(async () => {
      return CompanyBootstrapper.run({
        organizationId,
        workspaceId,
        userId: session.user.id,
        name,
        description,
        industry,
        targetMarket,
      });
    });

    return NextResponse.json({
      success: true,
      result,
      creditsUsed: BOOTSTRAP_CREDIT_COST,
    });
  } catch (e) {
    return NextResponse.json(safeError(e, 'company/bootstrap', 'bootstrap_failed'), { status: 500 });
  }
}
