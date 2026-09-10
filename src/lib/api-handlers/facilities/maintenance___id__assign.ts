import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** POST /api/facilities/maintenance/[id]/assign — assign a maintenance request */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const assignedTo = String(body.assignedTo || '').trim();
  if (!assignedTo) {
    return NextResponse.json({ error: 'assignedTo_required' }, { status: 400 });
  }

  const request = await FacilitiesService.assignMaintenanceRequest(id, assignedTo);
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ request });
}
