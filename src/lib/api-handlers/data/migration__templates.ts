import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { MigrationService } from '@/lib/services/migration-service';

/** GET /api/data/migration/templates — get mapping templates */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const templates = await MigrationService.getMappingTemplates();
  return NextResponse.json({ templates });
}
