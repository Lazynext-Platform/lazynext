import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { TestimonialService } from '@/lib/services/testimonial-service';

/** POST /api/feedback/testimonials/[id]/approve — approve a testimonial */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = params;
  try {
    const testimonial = await TestimonialService.approve(id);
    return NextResponse.json({ testimonial });
  } catch (e) {
    console.error('[feedback/testimonials/[id]/approve] error:', e);
    return NextResponse.json({ error: 'failed_to_approve' }, { status: 500 });
  }
}
