import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WasteManagementService } from '@/lib/services/waste-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const stream = await WasteManagementService.deactivateWasteStream(id, session.user.id);
  if (!stream) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ stream });
}
