import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AssetTrackingService } from '@/lib/services/asset-tracking-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const assignment = await AssetTrackingService.returnAssignment(id, session.user.id);
  if (!assignment) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ assignment });
}
