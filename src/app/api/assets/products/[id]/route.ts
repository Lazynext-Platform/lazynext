import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

// Update a product (owner only). Only mutates fields that are present.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.name === 'string') data.name = body.name.trim().slice(0, 120);
  if (typeof body.description === 'string') data.description = body.description.trim().slice(0, 2000);
  if (typeof body.imageUrl === 'string') data.imageUrl = /^https?:\/\//.test(body.imageUrl) ? body.imageUrl : null;
  if (typeof body.sourceUrl === 'string') data.sourceUrl = /^https?:\/\//.test(body.sourceUrl) ? body.sourceUrl : null;

  // updateMany with userId filter enforces ownership and reports count.
  const res = await prisma.adProduct.updateMany({
    where: { id, userId: session.user.id },
    data,
  });
  if (res.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const product = await prisma.adProduct.findUnique({ where: { id } });
  return NextResponse.json({ product });
}

// Delete a product (owner only).
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const res = await prisma.adProduct.deleteMany({ where: { id, userId: session.user.id } });
  if (res.count === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
