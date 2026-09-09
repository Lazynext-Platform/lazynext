import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { PermissionService } from '@/lib/services/permission-service';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const role = await PermissionService.deprecatePermissionRole(id, session.user.id);
  if (!role) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  return NextResponse.json({ role });
}
