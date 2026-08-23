import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const TYPES = new Set(['lazynext-studio', 'drama-studio', 'ad-reference']);

// On "generate" click creates a "creation placeholder" (status=processing), so the "My Creations" page immediately shows this "generating" creation,
// instead of "clicked generate but creations page still empty for a long time". On completion, save-reel / ad-reference/save uses the returned id to update to final video;
// On interrupt/failure, /api/creations/[id] POST marks it failed.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const type = TYPES.has(body.type) ? body.type : 'lazynext-studio';
  const title = (typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '生成中的作品').slice(0, 500);
  // Drama passes structured asset skeleton (kind/characters/scenes) to build a "creation folder"; other types don't pass it, assets stays null using original logic.
  const assets = body.assets && typeof body.assets === 'object' && !Array.isArray(body.assets) ? body.assets : undefined;
  const creation = await prisma.creation.create({
    data: {
      userId: session.user.id,
      templateId: type,
      model: type,
      prompt: title,
      status: 'processing',
      outputs: [],
      ...(assets ? { assets } : {}),
    },
  });
  return NextResponse.json({ id: creation.id });
}
