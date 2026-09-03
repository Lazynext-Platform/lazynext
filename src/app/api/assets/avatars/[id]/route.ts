import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { isUrlSafe } from '@/lib/security';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim().slice(0, 120);
  if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 2000);
  if (typeof body.imageUrl === 'string') data.imageUrl = body.imageUrl.length <= 2048 && isUrlSafe(body.imageUrl) ? body.imageUrl : null;

  const res = await prisma.adAvatar.updateMany({
    where: { id, userId: session.user.id },
    data,
  });
  if (res.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const avatar = await prisma.adAvatar.findUnique({ where: { id } });
  return NextResponse.json({ avatar });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const res = await prisma.adAvatar.deleteMany({ where: { id, userId: session.user.id } });
  if (res.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
