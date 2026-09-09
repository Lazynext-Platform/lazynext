import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { HealthSafetyService } from '@/lib/services/health-safety-service';

/** POST /api/health-safety/inspections/[id]/complete — complete an inspection */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const results = String(body.results || '').trim();

  try {
    const inspection = await HealthSafetyService.completeInspection(id, results);
    if (!inspection) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ inspection });
  } catch (e) {
    console.error('[health-safety/inspections/complete] error:', e);
    return NextResponse.json({ error: 'failed_to_complete_inspection' }, { status: 500 });
  }
}
