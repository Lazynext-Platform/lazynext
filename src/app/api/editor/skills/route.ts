import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { listSkills, getSkill, recommendSkills, type ContentType, type EditingSkill, type EditStep } from '@/lib/editor/skills';

/**
 * GET /api/editor/skills
 * Query params: ?contentType=talking-head&platform=tiktok&tag=captions
 * Or: ?recommend=true&contentType=talking-head&platform=tiktok
 * Or: ?id=fast-paced-hook-cut
 * Returns the list of editing skills (built-in and user-created from D1).
 * No credit cost — this is metadata only.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  const contentType = url.searchParams.get('contentType') as ContentType | null;
  const platform = url.searchParams.get('platform');
  const tag = url.searchParams.get('tag');
  const recommend = url.searchParams.get('recommend') === 'true';

  // Get a single skill by ID (check built-in first, then D1)
  if (id) {
    const builtin = getSkill(id);
    if (builtin) return NextResponse.json({ skill: builtin });

    const persisted = await prisma.editingSkill.findFirst({ where: { id, userId: uid } });
    if (!persisted) return NextResponse.json({ error: 'skill_not_found' }, { status: 404 });
    return NextResponse.json({ skill: persistedToSkill(persisted) });
  }

  // Load user-created skills from D1
  const userSkillsRaw = await prisma.editingSkill.findMany({ where: { userId: uid } });
  const userSkills = userSkillsRaw.map(persistedToSkill);

  // Recommend skills for content type + platform
  if (recommend && contentType) {
    const builtin = recommendSkills(contentType, platform || undefined);
    const matching = userSkills.filter(s => s.contentTypes.includes(contentType) && (!platform || s.platforms.includes(platform)));
    const skills = [...builtin, ...matching].sort((a, b) => b.tags.length - a.tags.length);
    return NextResponse.json({ skills, count: skills.length });
  }

  // List built-in with optional filters
  const builtin = listSkills({
    contentType: contentType || undefined,
    platform: platform || undefined,
    tag: tag || undefined,
  });

  // Apply same filters to user skills
  let filteredUser = userSkills;
  if (contentType) filteredUser = filteredUser.filter(s => s.contentTypes.includes(contentType));
  if (platform) filteredUser = filteredUser.filter(s => s.platforms.includes(platform));
  if (tag) filteredUser = filteredUser.filter(s => s.tags.includes(tag));

  const skills = [...builtin, ...filteredUser];
  return NextResponse.json({ skills, count: skills.length });
}

/**
 * POST /api/editor/skills
 * Create a new user-created editing skill, persisted to D1.
 * Body: { name, description, contentTypes, platforms, steps, estimatedTimeMin, tags }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 200) : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  const description = typeof body.description === 'string' ? body.description.slice(0, 2000) : '';
  const contentTypes = Array.isArray(body.contentTypes) ? body.contentTypes.filter((t: unknown) => typeof t === 'string') : [];
  const platforms = Array.isArray(body.platforms) ? body.platforms.filter((t: unknown) => typeof t === 'string') : [];
  const steps = Array.isArray(body.steps) ? body.steps.filter((s: unknown) => s && typeof s === 'object') : [];
  const estimatedTimeMin = Math.max(1, Math.min(120, Number(body.estimatedTimeMin) || 5));
  const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string') : [];

  const created = await prisma.editingSkill.create({
    data: {
      userId: uid,
      name,
      description,
      contentTypesJson: JSON.stringify(contentTypes),
      platformsJson: JSON.stringify(platforms),
      stepsJson: JSON.stringify(steps),
      estimatedTimeMin,
      tagsJson: JSON.stringify(tags),
    },
  });

  return NextResponse.json({ skill: persistedToSkill(created) });
}

/**
 * PUT /api/editor/skills?id=xxx
 * Update a user-created editing skill.
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  // Verify ownership
  const existing = await prisma.editingSkill.findFirst({ where: { id, userId: uid } });
  if (!existing) return NextResponse.json({ error: 'skill_not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.name === 'string') updates.name = body.name.trim().slice(0, 200);
  if (typeof body.description === 'string') updates.description = body.description.slice(0, 2000);
  if (Array.isArray(body.contentTypes)) updates.contentTypesJson = JSON.stringify(body.contentTypes.filter((t: unknown) => typeof t === 'string'));
  if (Array.isArray(body.platforms)) updates.platformsJson = JSON.stringify(body.platforms.filter((t: unknown) => typeof t === 'string'));
  if (Array.isArray(body.steps)) updates.stepsJson = JSON.stringify(body.steps.filter((s: unknown) => s && typeof s === 'object'));
  if (typeof body.estimatedTimeMin === 'number') updates.estimatedTimeMin = Math.max(1, Math.min(120, body.estimatedTimeMin));
  if (Array.isArray(body.tags)) updates.tagsJson = JSON.stringify(body.tags.filter((t: unknown) => typeof t === 'string'));

  const updated = await prisma.editingSkill.update({ where: { id }, data: updates });
  return NextResponse.json({ skill: persistedToSkill(updated) });
}

/**
 * DELETE /api/editor/skills?id=xxx
 * Delete a user-created editing skill.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  // Verify ownership before delete
  const existing = await prisma.editingSkill.findFirst({ where: { id, userId: uid } });
  if (!existing) return NextResponse.json({ error: 'skill_not_found' }, { status: 404 });

  await prisma.editingSkill.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}

/** Convert a persisted EditingSkill row to the EditingSkill interface. */
function persistedToSkill(row: {
  id: string;
  userId: string;
  name: string;
  description: string;
  contentTypesJson: string;
  platformsJson: string;
  stepsJson: string;
  estimatedTimeMin: number;
  tagsJson: string;
  createdAt: Date;
  updatedAt: Date;
}): EditingSkill {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    contentTypes: safeParse(row.contentTypesJson, []) as ContentType[],
    platforms: safeParse(row.platformsJson, []) as string[],
    steps: safeParse(row.stepsJson, []) as EditStep[],
    estimatedTimeMin: row.estimatedTimeMin,
    tags: safeParse(row.tagsJson, []) as string[],
    source: 'user',
    createdBy: row.userId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function safeParse<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}
