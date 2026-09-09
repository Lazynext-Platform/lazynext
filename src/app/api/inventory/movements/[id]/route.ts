import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

/** GET /api/inventory/movements/[id] — get a single movement */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const movement = await safePrisma(
    () => prisma.stockMovement.findUnique({ where: { id } }),
    null,
  );
  if (!movement) {
    return NextResponse.json({ error: 'movement_not_found' }, { status: 404 });
  }
  return NextResponse.json({ movement });
}
