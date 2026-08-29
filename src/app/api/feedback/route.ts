import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/feedback
 * Submit user feedback for a feature.
 * Body: { feature: string, rating: number (1-5), comment?: string }
 *
 * Feedback is stored as a CreativeTemplate with category 'feedback'
 * to avoid adding a new Prisma model. The payloadJson contains the
 * rating and comment.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { feature, rating, comment } = body as { feature?: string; rating?: number; comment?: string };

  // Validate feature
  const validFeatures = [
    'team-collaboration', 'analytics-hub', 'ab-automation', 'workflow-builder',
    'creative-studio', 'clip-editor', 'media-services', 'creator-kits',
  ];
  if (!feature || !validFeatures.includes(feature)) {
    return NextResponse.json({ error: 'invalid_feature' }, { status: 400 });
  }

  // Validate rating
  const ratingNum = Number(rating);
  if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return NextResponse.json({ error: 'invalid_rating' }, { status: 400 });
  }

  const trimmedComment = typeof comment === 'string' ? comment.trim().slice(0, 500) : '';

  try {
    // Store feedback as a CreativeTemplate with category 'feedback'
    // This avoids adding a new Prisma model
    await prisma.creativeTemplate.create({
      data: {
        userId: uid,
        category: 'feedback',
        name: `feedback-${feature}-${Date.now()}`,
        description: trimmedComment,
        payloadJson: JSON.stringify({ feature, rating: ratingNum, comment: trimmedComment, timestamp: new Date().toISOString() }),
        tagsJson: JSON.stringify(['feedback', feature]),
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'failed_to_save_feedback' }, { status: 500 });
  }
}

/**
 * GET /api/feedback
 * Retrieve feedback summaries (admin only).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { email: true },
  }).catch(() => null);

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
  if (!user || !adminEmails.includes(user.email || '')) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    const feedback = await prisma.creativeTemplate.findMany({
      where: { category: 'feedback' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({
      feedback: feedback.map(f => {
        let payload: any = {};
        try { payload = JSON.parse(f.payloadJson || '{}'); } catch {}
        return {
          id: f.id,
          feature: payload.feature || 'unknown',
          rating: payload.rating || 0,
          comment: payload.comment || '',
          userId: f.userId,
          timestamp: payload.timestamp || f.createdAt.toISOString(),
        };
      }),
    });
  } catch {
    return NextResponse.json({ error: 'failed_to_load_feedback' }, { status: 500 });
  }
}
