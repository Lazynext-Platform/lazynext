import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TestimonialService } from '@/lib/services/testimonial-service';

/** POST /api/feedback/testimonials/[id]/reject — reject a testimonial */
export async function POST(
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
    const testimonial = await TestimonialService.reject(id, body.reason);
    return NextResponse.json({ testimonial });
  } catch (e) {
    console.error('[feedback/testimonials/[id]/reject] error:', e);
    return NextResponse.json({ error: 'failed_to_reject' }, { status: 500 });
  }
}
