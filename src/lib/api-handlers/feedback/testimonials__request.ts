import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { TestimonialService } from '@/lib/services/testimonial-service';

/** POST /api/feedback/testimonials/request — generate a testimonial request email */
export async function POST(req: NextRequest) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const customerName = String(body.customerName || '').trim();
  const customerEmail = String(body.customerEmail || '').trim();
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: 'customerName_and_email_required' }, { status: 400 });
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) {
    return NextResponse.json({ error: 'no_workspace' }, { status: 400 });
  }

  const organizationId = workspaces[0].organizationId;
  const emailTemplate = await TestimonialService.requestTestimonial(organizationId, {
    customerName,
    customerEmail,
    productName: body.productName,
  });
  return NextResponse.json({ emailTemplate });
}
