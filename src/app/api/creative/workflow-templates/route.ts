import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import type { PipelineStage } from '@/lib/creative/pipeline';

const VALID_STAGES: PipelineStage[] = [
  'brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish', 'completed',
];
const BUILDER_STAGES: PipelineStage[] = [
  'brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish',
];
const MAX_NAME_LEN = 100;
const MAX_DESC_LEN = 500;
const MAX_STAGES = 20;

/**
 * GET /api/creative/workflow-templates
 * List the user's custom workflow templates (stored as CreativeTemplate with category 'workflow').
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  try {
    // Find the user's teams to include team-shared templates
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: uid },
      select: { teamId: true },
    }).catch(() => []);
    const teamIds = teamMemberships.map(m => m.teamId);

    // Build the query: user's own templates + built-in + team-shared
    // Team-shared templates use tagsJson containing "team:<teamId>"
    const teamTags = teamIds.map(tid => `team:${tid}`);

    const templates = await prisma.creativeTemplate.findMany({
      where: {
        category: 'workflow',
        OR: [
          { userId: uid },
          { userId: null },
          // Team-shared: templates with a "team:<teamId>" tag
          ...teamTags.map(tag => ({
            tagsJson: { contains: tag },
          })),
        ],
      },
      orderBy: [{ userId: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      templates: templates.map(t => {
        let stages: PipelineStage[] = [];
        let workflow: { stages: any[]; flags: Record<string, unknown> } | undefined;
        try {
          const parsed = JSON.parse(t.payloadJson || '{}');
          if (Array.isArray(parsed.stages)) {
            stages = parsed.stages.filter((s: unknown) => typeof s === 'string' && BUILDER_STAGES.includes(s as PipelineStage));
          }
          // Extract workflow definition if present (v2)
          if (parsed.workflow && Array.isArray(parsed.workflow.stages)) {
            workflow = parsed.workflow;
          }
        } catch {
          // malformed payloadJson — return empty stages
        }
        // Parse tags to detect team-shared templates
        let isTeamShared = false;
        try {
          const tags: string[] = JSON.parse(t.tagsJson || '[]');
          isTeamShared = tags.some(tag => typeof tag === 'string' && tag.startsWith('team:'));
        } catch {
          // malformed tagsJson — treat as not team-shared
        }
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          stages,
          workflow,
          isBuiltIn: t.userId === null,
          isTeamShared,
          ownerId: t.userId ?? undefined,
          isFavorite: t.isFavorite,
          createdAt: t.createdAt.toISOString(),
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: 'failed_to_load_templates' }, { status: 500 });
  }
}

/**
 * POST /api/creative/workflow-templates
 * Save a custom workflow template.
 * Body: { name: string, description?: string, stages: PipelineStage[] }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { name, description, stages, teamId, workflow } = body as { name?: string; description?: string; stages?: PipelineStage[]; teamId?: string; workflow?: { stages: any[]; flags: Record<string, unknown> } };

  // Validate name
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 });
  }
  if (trimmedName.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: 'name_too_long' }, { status: 400 });
  }

  // Validate stages
  if (!Array.isArray(stages) || stages.length === 0) {
    return NextResponse.json({ error: 'stages_required' }, { status: 400 });
  }
  if (stages.length > MAX_STAGES) {
    return NextResponse.json({ error: 'too_many_stages' }, { status: 400 });
  }

  const filteredStages = stages.filter(s => typeof s === 'string' && BUILDER_STAGES.includes(s as PipelineStage));
  if (filteredStages.length === 0) {
    return NextResponse.json({ error: 'no_valid_stages' }, { status: 400 });
  }

  const trimmedDesc = typeof description === 'string' ? description.trim().slice(0, MAX_DESC_LEN) : '';

  // If teamId is provided, verify the user is a member of that team
  let tags = ['workflow', 'custom'];
  if (teamId) {
    const membership = await prisma.teamMember.findFirst({
      where: { teamId, userId: uid },
    }).catch(() => null);
    if (!membership) {
      return NextResponse.json({ error: 'not_team_member' }, { status: 403 });
    }
    tags = ['workflow', 'custom', `team:${teamId}`];
  }

  // Build payload — include both simple stages and optional workflow definition
  const payload: { stages: PipelineStage[]; workflow?: { stages: any[]; flags: Record<string, unknown> } } = { stages: filteredStages };
  if (workflow && Array.isArray(workflow.stages) && workflow.stages.length > 0) {
    // Validate workflow stages
    const validWfStages = workflow.stages.filter((s: any) =>
      s && typeof s.stage === 'string' && BUILDER_STAGES.includes(s.stage as PipelineStage)
    );
    if (validWfStages.length > 0) {
      payload.workflow = { stages: validWfStages, flags: workflow.flags || {} };
    }
  }

  try {
    const template = await prisma.creativeTemplate.create({
      data: {
        userId: uid,
        category: 'workflow',
        name: trimmedName,
        description: trimmedDesc,
        payloadJson: JSON.stringify(payload),
        tagsJson: JSON.stringify(tags),
      },
    });

    return NextResponse.json({
      id: template.id,
      name: template.name,
      description: template.description,
      stages: filteredStages,
      createdAt: template.createdAt.toISOString(),
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'failed_to_save_template' }, { status: 500 });
  }
}

/**
 * PATCH /api/creative/workflow-templates?id=xxx
 * Update a custom workflow template (e.g. unshare from a team).
 * Body: { action: 'unshare' }
 */
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const action = body?.action;
  if (action !== 'unshare') {
    return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
  }

  try {
    // Only the owner can unshare a template
    const template = await prisma.creativeTemplate.findFirst({
      where: { id, userId: uid, category: 'workflow' },
    });
    if (!template) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Remove all "team:*" tags from tagsJson
    let tags: string[] = [];
    try {
      tags = JSON.parse(template.tagsJson || '[]');
    } catch {
      tags = [];
    }
    const filteredTags = tags.filter(tag => !(typeof tag === 'string' && tag.startsWith('team:')));
    await prisma.creativeTemplate.update({
      where: { id },
      data: { tagsJson: JSON.stringify(filteredTags) },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed_to_update_template' }, { status: 500 });
  }
}

/**
 * DELETE /api/creative/workflow-templates?id=xxx
 * Delete a custom workflow template (only if owned by the user).
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  try {
    const template = await prisma.creativeTemplate.findFirst({
      where: { id, userId: uid, category: 'workflow' },
    });
    if (!template) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    await prisma.creativeTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'failed_to_delete_template' }, { status: 500 });
  }
}

// Suppress unused variable warning for VALID_STAGES (used for reference)
void VALID_STAGES;
