import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PatentManagementService } from '@/lib/services/patent-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const application = await PatentManagementService.officeAction(id, session.user.id);
  if (!application) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ application });
}
