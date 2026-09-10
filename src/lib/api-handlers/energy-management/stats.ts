import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { EnergyManagementService } from '@/lib/services/energy-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { meterCount: 0, readingCount: 0, targetCount: 0, tariffCount: 0, byMeterType: {}, byMeterStatus: {}, byReadingType: {}, byReadingStatus: {}, byTargetType: {}, byTargetStatus: {}, byTariffType: {}, byTariffStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await EnergyManagementService.getEnergyManagementStats(organizationId);
  return NextResponse.json({ stats });
}
