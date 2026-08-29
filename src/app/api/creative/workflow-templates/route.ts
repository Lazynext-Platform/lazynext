import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import type { PipelineStage } from '@/lib/creative/pipeline';

/**
 * GET /api/creative/workflow-templates
 * List the user's custom workflow templates (stored as CreativeTemplate with category 'workflow').
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const templates = await prisma.creativeTemplate.findMany({
    where: {
      category: 'workflow',
      OR: [{ userId: uid }, { userId: null }],
    },
    orderBy: [{ userId: 'desc' }, { createdAt: 'desc' }],
  }).catch(() => []);

  return NextResponse.json({
    templates: templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      stages: JSON.parse(t.payloadJson || '{}').stages || [],
      isBuiltIn: t.userId === null,
      isFavorite: t.isFavorite,
      createdAt: t.createdAt.toISOString(),
    })),
  });
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

  const body = await req.json().catch(() => ({}));
  const { name, description, stages } = body as { name?: string; description?: string; stages?: PipelineStage[] };
  if (!name || !Array.isArray(stages) || stages.length === 0) {
    return NextResponse.json({ error: 'name_and_stages_required' }, { status: 400 });
  }

  const validStages: PipelineStage[] = [
    'brief', 'script', 'storyboard', 'media_generation', 'audio', 'edit', 'compliance', 'publish', 'completed',
  ];
  const filteredStages = stages.filter(s => validStages.includes(s));
  if (filteredStages.length === 0) {
    return NextResponse.json({ error: 'no_valid_stages' }, { status: 400 });
  }

  const template = await prisma.creativeTemplate.create({
    data: {
      userId: uid,
      category: 'workflow',
      name: String(name).slice(0, 100),
      description: String(description || '').slice(0, 500),
      payloadJson: JSON.stringify({ stages: filteredStages }),
      tagsJson: JSON.stringify(['workflow', 'custom']),
    },
  });

  return NextResponse.json({
    id: template.id,
    name: template.name,
    description: template.description,
    stages: filteredStages,
    createdAt: template.createdAt.toISOString(),
  }, { status: 201 });
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

  const template = await prisma.creativeTemplate.findFirst({
    where: { id, userId: uid, category: 'workflow' },
  });
  if (!template) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.creativeTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
