import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MigrationService } from '@/lib/services/migration-service';

/** POST /api/data/migration/[id]/execute — execute a migration */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const migration = await MigrationService.executeMigration(id);
    if (!migration) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ migration });
  } catch (e) {
    console.error('[data/migration] execute error:', e);
    return NextResponse.json({ error: 'failed_to_execute_migration' }, { status: 500 });
  }
}
