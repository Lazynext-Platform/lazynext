import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PerformanceManagementService } from '@/lib/services/performance-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const goal = await PerformanceManagementService.missGoal(id, session.user.id);
  if (!goal) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ goal });
}
