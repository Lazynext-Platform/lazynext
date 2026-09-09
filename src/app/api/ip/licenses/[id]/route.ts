import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { IPService } from '@/lib/services/ip-service';

/** GET /api/ip/licenses/[id] — get a single IP license */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const license = await IPService.getLicense(id);
  if (!license) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ license });
}

/** PATCH /api/ip/licenses/[id] — update an IP license */
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
    const license = await IPService.updateLicense(id, {
      licensee: body.licensee, type: body.type, territory: body.territory,
      fieldOfUse: body.fieldOfUse, startDate: body.startDate, endDate: body.endDate,
      royaltyRate: body.royaltyRate, minimumRoyalty: body.minimumRoyalty,
      upfrontFee: body.upfrontFee, status: body.status, terms: body.terms,
      restrictions: body.restrictions, signedDate: body.signedDate,
    });
    if (!license) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    return NextResponse.json({ license });
  } catch (e) {
    console.error('[ip/licenses] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_license' }, { status: 500 });
  }
}
