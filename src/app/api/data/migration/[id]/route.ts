import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { MigrationService } from '@/lib/services/migration-service';

/** GET /api/data/migration/[id] — get a single migration */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const migration = await MigrationService.getMigration(id);
  if (!migration) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ migration });
}

/** DELETE /api/data/migration/[id] — delete a migration */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    await prisma.memory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[data/migration] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_migration' }, { status: 500 });
  }
}
