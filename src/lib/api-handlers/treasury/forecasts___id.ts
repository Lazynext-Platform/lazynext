import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TreasuryService } from '@/lib/services/treasury-service';

/** GET /api/treasury/forecasts/[id] — get a forecast */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const forecast = await TreasuryService.getForecast(id);
  if (!forecast) {
    return NextResponse.json({ error: 'forecast_not_found' }, { status: 404 });
  }
  return NextResponse.json({ forecast });
}

/** DELETE /api/treasury/forecasts/[id] — delete a forecast */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const ok = await TreasuryService.deleteForecast(id);
  if (!ok) {
    return NextResponse.json({ error: 'forecast_not_found' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
