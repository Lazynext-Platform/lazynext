import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim().slice(0, 120);
  if (typeof body.logoUrl === 'string') data.logoUrl = /^https?:\/\//.test(body.logoUrl) ? body.logoUrl : null;
  if (Array.isArray(body.colors))
    data.colors = body.colors.filter((c: unknown) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c)).slice(0, 12);
  if (typeof body.fontNote === 'string') data.fontNote = body.fontNote.slice(0, 500);
  if (typeof body.toneNote === 'string') data.toneNote = body.toneNote.slice(0, 500);

  const res = await prisma.brandKit.updateMany({
    where: { id, userId: session.user.id },
    data,
  });
  if (res.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const brandKit = await prisma.brandKit.findUnique({ where: { id } });
  return NextResponse.json({ brandKit });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const res = await prisma.brandKit.deleteMany({ where: { id, userId: session.user.id } });
  if (res.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
