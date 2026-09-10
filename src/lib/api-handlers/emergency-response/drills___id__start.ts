import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { EmergencyResponseService } from '@/lib/services/emergency-response-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const drill = await EmergencyResponseService.startEmergencyDrill(id, session.user.id);
  if (!drill) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ drill });
}
