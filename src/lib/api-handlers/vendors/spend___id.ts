import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { VendorSpendService } from '@/lib/services/vendor-spend-service';

/** GET /api/vendors/spend/[id] — get a spend record by ID */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const spend = await VendorSpendService.get(id);
  if (!spend) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ spend });
}
