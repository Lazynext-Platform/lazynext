import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { BUILTIN_TEMPLATES } from '@/lib/creative/templates';

/**
 * Seed built-in templates into D1 if they don't exist yet.
 * Called on first GET. Idempotent — skips templates that already exist.
 */
async function seedBuiltinTemplates(): Promise<void> {
  const existing = await prisma.creativeTemplate.count({ where: { userId: null } });
  if (existing >= BUILTIN_TEMPLATES.length) return;

  for (const tmpl of BUILTIN_TEMPLATES) {
    const found = await prisma.creativeTemplate.findFirst({
      where: { userId: null, name: tmpl.name, category: tmpl.category },
    });
    if (!found) {
      await prisma.creativeTemplate.create({
        data: {
          userId: null,
          category: tmpl.category,
          name: tmpl.name,
          description: tmpl.description,
          payloadJson: JSON.stringify(tmpl.payload),
          tagsJson: JSON.stringify(tmpl.tags),
        },
      });
    }
  }
}

/**
 * GET /api/creative/templates
 * Query params: ?category=brief&search=hook&favorites=true
 * Returns built-in (userId=null) + user-saved templates.
 * No credit cost — metadata only.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  // Seed built-in templates on first access
  await seedBuiltinTemplates().catch(() => {});

  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const favoritesOnly = url.searchParams.get('favorites') === 'true';

  const where: Record<string, unknown> = {
    OR: [{ userId: null }, { userId: uid }],
  };
  if (category) where.category = category;
  if (favoritesOnly) where.isFavorite = true;
  if (search) {
    where.OR = [
      { name: { contains: search }, userId: null },
      { name: { contains: search }, userId: uid },
      { description: { contains: search }, userId: null },
      { description: { contains: search }, userId: uid },
    ];
  }

  const templates = await prisma.creativeTemplate.findMany({
    where,
    orderBy: [{ isFavorite: 'desc' }, { createdAt: 'asc' }],
  });

  return NextResponse.json({ templates });
}

/**
 * POST /api/creative/templates
 * Body: { category, name, description, payload, tags }
 * Creates a user-saved template.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const category = String(body.category || '').trim();
  const name = String(body.name || '').trim();
  const description = String(body.description || '').trim();
  const payload = body.payload || {};
  const tags = Array.isArray(body.tags) ? body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20) : [];

  if (!category || !['brief', 'hooks', 'angles', 'script', 'skill-bundle'].includes(category)) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
  }
  if (!name || name.length > 100) {
    return NextResponse.json({ error: 'name_required', detail: 'Name must be 1-100 chars' }, { status: 400 });
  }

  const template = await prisma.creativeTemplate.create({
    data: {
      userId: uid,
      category,
      name,
      description: description.slice(0, 500),
      payloadJson: JSON.stringify(payload),
      tagsJson: JSON.stringify(tags),
    },
  });

  return NextResponse.json({ template });
}

/**
 * PUT /api/creative/templates?id=<id>
 * Body: { name?, description?, payload?, tags?, isFavorite? }
 * Updates a user-saved template (ownership verified).
 */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const existing = await prisma.creativeTemplate.findFirst({ where: { id, userId: uid } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim().slice(0, 100);
  if (typeof body.description === 'string') data.description = body.description.slice(0, 500);
  if (body.payload !== undefined) data.payloadJson = JSON.stringify(body.payload);
  if (Array.isArray(body.tags)) data.tagsJson = JSON.stringify(body.tags.filter((t: unknown) => typeof t === 'string').slice(0, 20));
  if (typeof body.isFavorite === 'boolean') data.isFavorite = body.isFavorite;

  const updated = await prisma.creativeTemplate.update({ where: { id }, data });
  return NextResponse.json({ template: updated });
}

/**
 * DELETE /api/creative/templates?id=<id>
 * Deletes a user-saved template (ownership verified). Built-ins cannot be deleted.
 */
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });

  const existing = await prisma.creativeTemplate.findFirst({ where: { id, userId: uid } });
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.creativeTemplate.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
