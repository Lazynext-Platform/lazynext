import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    const avatars = await prisma.adAvatar.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ avatars });
  } catch {
    // D1 cold-start — return empty data
    return NextResponse.json({ avatars: [] });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'description_required' }, { status: 400 });
  const imageUrl = typeof body.imageUrl === 'string' && /^https?:\/\//.test(body.imageUrl) ? body.imageUrl : null;

  const avatar = await prisma.adAvatar.create({
    data: {
      userId: session.user.id,
      name: name.slice(0, 120),
      description: description.slice(0, 2000),
      imageUrl,
    },
  });
  return NextResponse.json({ avatar }, { status: 201 });
}
