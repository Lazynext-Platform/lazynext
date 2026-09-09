import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { FranchiseService } from '@/lib/services/franchise-service';

/** GET /api/franchise/franchisees/[id] — get a single franchisee */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const franchisee = await FranchiseService.getFranchisee(id);
  if (!franchisee) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ franchisee });
}

/** PATCH /api/franchise/franchisees/[id] — update a franchisee */
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
    const franchisee = await FranchiseService.updateFranchisee(id, {
      name: body.name, contactName: body.contactName, contactEmail: body.contactEmail,
      contactPhone: body.contactPhone, territory: body.territory,
      franchiseFee: body.franchiseFee, royaltyRate: body.royaltyRate,
      status: body.status, location: body.location,
      joinedDate: body.joinedDate, experience: body.experience,
      financialStatus: body.financialStatus, notes: body.notes,
    });
    if (!franchisee) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ franchisee });
  } catch (e) {
    console.error('[franchise/franchisees] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_franchisee' }, { status: 500 });
  }
}
