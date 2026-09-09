import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CustomerSuccessService } from '@/lib/services/customer-success-service';

/** GET /api/customer-success/expansions/[id] — get a single expansion */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const expansion = await CustomerSuccessService.getExpansion(id);
  if (!expansion) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ expansion });
}

/** PATCH /api/customer-success/expansions/[id] — update an expansion */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    const expansion = await CustomerSuccessService.updateExpansion(id, {
      type: body.type, opportunity: body.opportunity, estimatedValue: body.estimatedValue,
      probability: body.probability, expectedCloseDate: body.expectedCloseDate,
      status: body.status, notes: body.notes,
    });
    if (!expansion) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ expansion });
  } catch (e) {
    console.error('[customer-success/expansions] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_expansion' }, { status: 500 });
  }
}
