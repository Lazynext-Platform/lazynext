import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Drama creation folder structured asset update. Frontend holds complete assets (single source of truth),
// at key milestones (all look images complete / each shot complete / final video complete) overwrites the latest full assets into Creation.
// Overwrite rather than deep merge: drama is single-user single-session sequential operation, frontend state is complete, overwrite is simplest and most reliable. Only allowed for owner.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const assets = body.assets;
  if (!assets || typeof assets !== 'object' || Array.isArray(assets)) {
    return NextResponse.json({ error: 'bad_assets' }, { status: 400 });
  }

  const { id } = await params;
  const c = await prisma.creation.findUnique({ where: { id } });
  if (!c || c.userId !== session.user.id) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  await prisma.creation.update({ where: { id: c.id }, data: { assets } });
  return NextResponse.json({ ok: true });
}
