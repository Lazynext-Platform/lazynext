import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PlanManagementService } from '@/lib/services/plan-management-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const enrollment = await PlanManagementService.terminateEnrollment(id, session.user.id);
  if (!enrollment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ enrollment });
}
