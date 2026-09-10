import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RecruitmentService } from '@/lib/services/recruitment-service';
import { prisma } from '@/lib/prisma';

/** GET /api/recruitment/offers/[id] — get a single offer */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const offer = await RecruitmentService.getOffer(id);
  if (!offer) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ offer });
}

/** PATCH /api/recruitment/offers/[id] — update an offer */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json().catch(() => ({}));
  try {
    const offer = await RecruitmentService.updateOffer(id, {
      salary: body.salary !== undefined ? Number(body.salary) : undefined,
      currency: body.currency,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      benefits: body.benefits,
      terms: body.terms,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      status: body.status,
    });
    return NextResponse.json({ offer });
  } catch (e) {
    console.error('[recruitment/offers] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_offer' }, { status: 500 });
  }
}

/** DELETE /api/recruitment/offers/[id] — delete an offer */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await prisma.jobOffer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[recruitment/offers] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_offer' }, { status: 500 });
  }
}
