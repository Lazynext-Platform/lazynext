import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GHGEmissionsManagementService } from '@/lib/services/ghg-emissions-management-service';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = params;
  const emission = await GHGEmissionsManagementService.calculateGHGEmission(id, session.user.id);
  if (!emission) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ emission });
}
