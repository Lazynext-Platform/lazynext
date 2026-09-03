import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/settings/profile — update the current user's profile.
 */
export async function PATCH(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: { name?: string; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.name?.trim()) data.name = body.name.trim().slice(0, 200);
  if (body.image !== undefined) data.image = typeof body.image === 'string' ? body.image.slice(0, 2000) : null;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'no_fields_to_update' }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { id: true, name: true, email: true, image: true },
  });

  return NextResponse.json({ user });
}
