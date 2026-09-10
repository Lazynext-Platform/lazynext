import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/lib/api-helpers';
import { FacilitiesService } from '@/lib/services/facilities-service';
import type { MaintenancePriority, MaintenanceCategory, MaintenanceStatus } from '@/lib/services/facilities-service';

/** GET /api/facilities/maintenance — list maintenance requests */
export async function GET(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId } = resolved;
  const sp = req.nextUrl.searchParams;

  const requests = await FacilitiesService.listMaintenanceRequests(organizationId, {
    facilityId: sp.get('facilityId') || undefined,
    status: (sp.get('status') as MaintenanceStatus) || undefined,
    priority: (sp.get('priority') as MaintenancePriority) || undefined,
  });

  return NextResponse.json({ requests });
}

/** POST /api/facilities/maintenance — create a maintenance request */
export async function POST(req: NextRequest) {
  const resolved = await resolveOrg();
  if (!resolved.ok) return resolved.response;
  const { organizationId, userId } = resolved;

  const body = await req.json().catch(() => ({}));
  const facilityId = String(body.facilityId || '').trim();
  const title = String(body.title || '').trim();
  const requestedBy = String(body.requestedBy || '').trim();
  if (!facilityId || !title || !requestedBy) {
    return NextResponse.json({ error: 'facility_title_requestedBy_required' }, { status: 400 });
  }

  try {
    const request = await FacilitiesService.createMaintenanceRequest(
      organizationId,
      body.workspaceId || organizationId,
      {
        facilityId,
        title,
        description: body.description,
        priority: body.priority as MaintenancePriority | undefined,
        category: body.category as MaintenanceCategory | undefined,
        requestedBy,
        assignedTo: body.assignedTo,
      },
      userId,
    );
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    console.error('[facilities/maintenance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_maintenance_request' }, { status: 500 });
  }
}
