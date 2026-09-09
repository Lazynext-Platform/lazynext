import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CreativeIntegrationService } from '@/lib/services/creative-integration';
import { WorkspaceService } from '@/lib/services/workspace';

/**
 * POST /api/creative-integration/campaign-plan — create a Plan + Tasks for a creative campaign.
 */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    workspaceId?: string;
    campaignId?: string;
    title?: string;
    objective?: string;
    tasks?: Array<{ title: string; description?: string; priority?: string }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const campaignId = body.campaignId?.trim();
  const title = body.title?.trim();
  const objective = body.objective?.trim();
  if (!campaignId || !title || !objective) {
    return NextResponse.json({ error: 'campaignId_title_and_objective_required' }, { status: 400 });
  }

  try {
    const workspaces = await WorkspaceService.listForUser(session.user.id);
    if (workspaces.length === 0) {
      return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
    }

    let wsId = body.workspaceId?.trim();
    let orgId: string;
    if (wsId) {
      const ws = workspaces.find((w) => w.id === wsId);
      if (!ws) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      orgId = ws.organizationId;
    } else {
      wsId = workspaces[0].id;
      orgId = workspaces[0].organizationId;
    }

    const result = await CreativeIntegrationService.createCampaignPlan(wsId, orgId, {
      campaignId,
      title,
      objective,
      tasks: body.tasks || [],
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    console.error('[creative-integration/campaign-plan] error:', e);
    return NextResponse.json({ error: 'failed_to_create_campaign_plan' }, { status: 500 });
  }
}
