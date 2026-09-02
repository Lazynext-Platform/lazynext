import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    // Only return "deliverable final videos": exclude per-shot/intermediate tasks (templateId containing ':' like adref:edit, sku:asset, or ending with '-shot' like mk-shot/drama-shot).
    // Intermediate tasks are numerous; if not excluded server-side, the take limit would be filled by them, causing real final videos to be pushed out and silently missing from the creations page.
    const creations = await prisma.creation.findMany({
      where: {
        userId: session.user.id,
        NOT: [{ templateId: { contains: ':' } }, { templateId: { endsWith: '-shot' } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    // creations already includes "generating/failed placeholders" (status=processing/failed): placeholder written on generate click, creations page displays "generating/failed/final" three states based on this.
    return NextResponse.json({ creations });
  } catch {
    // D1 cold-start — return empty data
    return NextResponse.json({ creations: [] });
  }
}
