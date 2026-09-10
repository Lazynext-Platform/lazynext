import { NextRequest, NextResponse } from 'next/server';
import { LeadAttributionService } from '@/lib/services/lead-attribution-service';

/** GET /api/marketing-ops/attribution/[id] — get an attribution by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const attribution = await LeadAttributionService.get(id);
  if (!attribution) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ attribution });
}

/** DELETE /api/marketing-ops/attribution/[id] — delete an attribution */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const deleted = await LeadAttributionService.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ deleted: true });
}
