import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import {
  publishContent,
  publishToMultiple,
  PUBLISH_CREDIT_COST,
} from '@/lib/publishing/publisher';
import { getPlatformCapabilities } from '@/lib/publishing/platforms';
import type { PublishRequest, PublishResult } from '@/lib/publishing/types';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const request = body.request as PublishRequest | undefined;
  if (!request || !request.platform || !request.mediaUrl || !request.caption) {
    return NextResponse.json({ error: 'platform_media_caption_required' }, { status: 400 });
  }

  // Validate against platform capabilities before charging.
  const caps = getPlatformCapabilities(request.platform);
  const { valid, errors } = validateRequest(request, caps);
  if (!valid) {
    return NextResponse.json({ error: 'validation_failed', errors }, { status: 400 });
  }

  // Determine total platform count for credit cost (primary + cross-post targets).
  const platformCount = 1 + (request.crossPostTo?.length ?? 0);
  const cost = PUBLISH_CREDIT_COST * platformCount;
  const ref = `publish:${request.platform}:${Date.now()}`;

  try {
    await deductCredits(uid, cost, 'publish', ref);
  } catch (e) {
    if (e instanceof Error && e.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'insufficient_credits' }, { status: 402 });
    }
    return NextResponse.json({ error: 'charge_failed', detail: String(e) }, { status: 500 });
  }

  const planTier = await getUserPlanTier(uid).catch(() => 'free' as const);

  let results: PublishResult[];
  try {
    if (request.crossPostTo && request.crossPostTo.length > 0) {
      results = await publishToMultiple([request], planTier);
    } else {
      const single = await publishContent(request, planTier);
      results = [single];
    }
  } catch (e) {
    // Publish failed → refund the full charge.
    await refundSync(uid, cost, ref).catch(() => {});
    console.error('[publish] error:', String(e));
    return NextResponse.json({ error: 'publish_failed', detail: String(e) }, { status: 500 });
  }

  // Refund for any per-platform failures (failed status) within the batch.
  const failedCount = results.filter((r) => r.status === 'failed').length;
  if (failedCount > 0) {
    const refundAmount = PUBLISH_CREDIT_COST * failedCount;
    await refundSync(uid, refundAmount, `${ref}:partial_refund`).catch(() => {});
  }

  return NextResponse.json({ results });
}

function validateRequest(
  request: PublishRequest,
  caps: ReturnType<typeof getPlatformCapabilities>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.platform) errors.push('platform_required');
  if (!request.mediaUrl?.trim()) errors.push('media_url_required');
  if (!request.caption?.trim()) errors.push('caption_required');
  if (request.caption && request.caption.length > caps.maxCaptionLength) {
    errors.push(`caption_exceeds_max_${caps.maxCaptionLength}`);
  }
  if (request.crossPostTo && request.crossPostTo.length > 0 && !caps.allowsCrossPosting) {
    errors.push('cross_posting_not_supported');
  }
  return { valid: errors.length === 0, errors };
}

export const POST = withAtlas(__byokPOST);
