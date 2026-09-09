import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';
import type { MaintenancePriority, MaintenanceCategory, MaintenanceStatus } from '@/lib/services/facilities-service';

/** GET /api/facilities/maintenance/[id] — get a maintenance request by ID */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = await FacilitiesService.getMaintenanceRequest(id);
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ request });
}

/** PATCH /api/facilities/maintenance/[id] — update a maintenance request */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const request = await FacilitiesService.updateMaintenanceRequest(id, {
      title: body.title,
      description: body.description,
      priority: body.priority as MaintenancePriority | undefined,
      category: body.category as MaintenanceCategory | undefined,
      status: body.status as MaintenanceStatus | undefined,
      assignedTo: body.assignedTo,
    });
    if (!request) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (e) {
    console.error('[facilities/maintenance] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_maintenance_request' }, { status: 500 });
  }
}
