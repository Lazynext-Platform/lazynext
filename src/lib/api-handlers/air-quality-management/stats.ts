import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { AirQualityManagementService } from '@/lib/services/air-quality-management-service';

export async function GET(_req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return NextResponse.json({ stats: { sensorCount: 0, readingCount: 0, thresholdCount: 0, alertCount: 0, bySensorType: {}, bySensorStatus: {}, byReadingType: {}, byReadingStatus: {}, byThresholdType: {}, byThresholdStatus: {}, byAlertType: {}, byAlertStatus: {} } });
  const organizationId = workspaces[0].organizationId;
  const stats = await AirQualityManagementService.getAirQualityManagementStats(organizationId);
  return NextResponse.json({ stats });
}
