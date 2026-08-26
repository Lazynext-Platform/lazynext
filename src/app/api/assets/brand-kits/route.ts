import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const brandKits = await prisma.brandKit.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ brandKits });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });

  const logoUrl = typeof body.logoUrl === 'string' && /^https?:\/\//.test(body.logoUrl) ? body.logoUrl : null;
  const colors = Array.isArray(body.colors)
    ? body.colors.filter((c: unknown) => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c)).slice(0, 12)
    : [];
  const fontNote = typeof body.fontNote === 'string' ? body.fontNote.slice(0, 500) : null;
  const toneNote = typeof body.toneNote === 'string' ? body.toneNote.slice(0, 500) : null;

  const brandKit = await prisma.brandKit.create({
    data: {
      userId: session.user.id,
      name: name.slice(0, 120),
      logoUrl,
      colors,
      fontNote,
      toneNote,
    },
  });
  return NextResponse.json({ brandKit }, { status: 201 });
}
