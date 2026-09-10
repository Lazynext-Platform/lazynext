import { NextRequest, NextResponse } from 'next/server';
import { FacilitiesService } from '@/lib/services/facilities-service';

/** POST /api/facilities/maintenance/[id]/complete — complete a maintenance request */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json().catch(() => ({}));

  const request = await FacilitiesService.completeMaintenanceRequest(id, body.notes);
  if (!request) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ request });
}
