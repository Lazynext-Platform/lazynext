import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { VendorPerformanceService } from '@/lib/services/vendor-performance-service';

/** GET /api/vendors/performance — list performance reviews */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ reviews: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const sp = req.nextUrl.searchParams;

  const dateRange: { start?: string; end?: string } | undefined =
    sp.get('dateStart') || sp.get('dateEnd')
      ? { start: sp.get('dateStart') || undefined, end: sp.get('dateEnd') || undefined }
      : undefined;

  const reviews = await VendorPerformanceService.list(organizationId, {
    vendorId: sp.get('vendorId') || undefined,
    dateRange,
    minRating: sp.get('minRating') ? Number(sp.get('minRating')) : undefined,
  });

  return NextResponse.json({ reviews });
}

/** POST /api/vendors/performance — create a performance review */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.vendorId || body.rating == null) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;

  try {
    const review = await VendorPerformanceService.create(organizationId, {
      vendorId: body.vendorId,
      rating: Number(body.rating),
      qualityScore: body.qualityScore != null ? Number(body.qualityScore) : undefined,
      deliveryScore: body.deliveryScore != null ? Number(body.deliveryScore) : undefined,
      costScore: body.costScore != null ? Number(body.costScore) : undefined,
      serviceScore: body.serviceScore != null ? Number(body.serviceScore) : undefined,
      comments: body.comments,
      reviewDate: body.reviewDate,
      reviewerId: body.reviewerId,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ review }, { status: 201 });
  } catch (e) {
    console.error('[vendors/performance] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_review' }, { status: 500 });
  }
}
