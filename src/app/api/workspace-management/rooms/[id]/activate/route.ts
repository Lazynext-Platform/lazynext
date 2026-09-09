import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceManagementService } from '@/lib/services/workspace-management-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const room = await WorkspaceManagementService.activateRoom(id, session.user.id);
  if (!room) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ room });
}
