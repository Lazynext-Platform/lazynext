import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DisasterRecoveryService } from '@/lib/services/disaster-recovery-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const backup = await DisasterRecoveryService.pauseBackupStrategy(id, session.user.id);
  if (!backup) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ backup });
}
