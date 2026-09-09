import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TestimonialService } from '@/lib/services/testimonial-service';

/** GET /api/feedback/testimonials — list testimonials */
export async function GET(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ testimonials: [] });
  }

  const organizationId = workspaces[0].organizationId;
  const url = new URL(req.url);
  const approved = url.searchParams.get('approved');
  const rating = url.searchParams.get('rating');
  const search = url.searchParams.get('search') || undefined;
  const tagsParam = url.searchParams.get('tags');

  const opts: Record<string, unknown> = {};
  if (approved !== null) opts.approved = approved === 'true';
  if (rating) opts.rating = parseInt(rating, 10);
  if (search) opts.search = search;
  if (tagsParam) opts.tags = tagsParam.split(',');

  const testimonials = await TestimonialService.list(organizationId, opts);
  return NextResponse.json({ testimonials });
}

/** POST /api/feedback/testimonials — create a testimonial */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerName = String(body.customerName || '').trim();
  const content = String(body.content || '').trim();
  if (!customerName || !content) {
    return NextResponse.json({ error: 'customerName_and_content_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  try {
    const testimonial = await TestimonialService.create(organizationId, {
      customerName,
      customerCompany: body.customerCompany,
      customerTitle: body.customerTitle,
      content,
      rating: body.rating,
      source: body.source,
      approved: body.approved,
      tags: body.tags,
      workspaceId: body.workspaceId,
      createdBy: session.user.id,
    });
    return NextResponse.json({ testimonial }, { status: 201 });
  } catch (e) {
    console.error('[feedback/testimonials] create error:', e);
    return NextResponse.json({ error: 'failed_to_create_testimonial' }, { status: 500 });
  }
}
