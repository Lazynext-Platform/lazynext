import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TestimonialService } from '@/lib/services/testimonial-service';

/** GET /api/feedback/testimonials/[id] — get a testimonial */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const testimonial = await TestimonialService.get(id);
  if (!testimonial) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ testimonial });
}

/** PATCH /api/feedback/testimonials/[id] — update a testimonial */
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
    const testimonial = await TestimonialService.update(id, {
      customerName: body.customerName,
      customerCompany: body.customerCompany,
      customerTitle: body.customerTitle,
      content: body.content,
      rating: body.rating,
      tags: body.tags,
    });
    return NextResponse.json({ testimonial });
  } catch (e) {
    console.error('[feedback/testimonials/[id]] update error:', e);
    return NextResponse.json({ error: 'failed_to_update_testimonial' }, { status: 500 });
  }
}

/** DELETE /api/feedback/testimonials/[id] — delete a testimonial */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    await TestimonialService.delete(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[feedback/testimonials/[id]] delete error:', e);
    return NextResponse.json({ error: 'failed_to_delete_testimonial' }, { status: 500 });
  }
}
