import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getOrganizationPerformance, getAgentPerformance } from '@/lib/services/reward-engine';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/agent-performance
 * Returns agent performance stats for the user's organization.
 *
 * Query params:
 *  - agentId: if provided, returns stats for a single agent
 *  - without agentId: returns stats for all agents in the organization
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const agentId = url.searchParams.get('agentId');

  if (agentId) {
    const stats = await getAgentPerformance(agentId);
    return NextResponse.json({ agentId, stats });
  }

  // Get the user's organization ID from their membership
  const membership = await prisma.membership.findFirst({
    where: { userId: session.user.id },
    select: { workspace: { select: { organizationId: true } } },
  });

  if (!membership) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 404 });
  }

  const organizationId = membership.workspace.organizationId;
  const performance = await getOrganizationPerformance(organizationId);
  return NextResponse.json(performance);
}
