import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateReferenceRemix,
  validateReferenceRemixInput,
  REFERENCE_REMIX_CREDIT_COST,
  type ReferenceRemixInput,
  type ReferenceType,
} from '@/lib/creative/reference-remix';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 90;

const VALID_REFERENCE_TYPES = new Set<ReferenceType>(['video', 'image', 'ad_copy']);

/**
 * GET /api/creative/reference-remix
 * Returns credit cost and schema info for the reference remix pipeline.
 */
export async function GET() {
  return NextResponse.json({
    feature: 'reference-remix',
    creditCost: REFERENCE_REMIX_CREDIT_COST,
    referenceTypes: Array.from(VALID_REFERENCE_TYPES),
    schema: {
      input: {
        referenceUrl: 'string (required)',
        referenceType: "'video' | 'image' | 'ad_copy' (optional)",
        targetProduct: 'string (optional)',
        targetAudience: 'string (optional)',
        platform: 'string (optional)',
        preserveElements: 'string[] (optional)',
        changeElements: 'string[] (optional)',
      },
      output: {
        evidence: 'EvidenceExtraction',
        analysis: 'CreativeAnalysis',
        remixBrief: 'RemixBrief',
        originalUrl: 'string',
        processingNotes: 'string',
      },
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const referenceUrl = typeof body.referenceUrl === 'string' ? body.referenceUrl.trim().slice(0, 2048) : '';
  if (!referenceUrl) return NextResponse.json({ error: 'reference_url_required' }, { status: 400 });

  // Validate URL format
  try {
    const parsed = new URL(referenceUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  const referenceType =
    typeof body.referenceType === 'string' && VALID_REFERENCE_TYPES.has(body.referenceType as ReferenceType)
      ? (body.referenceType as ReferenceType)
      : undefined;

  const preserveElements =
    Array.isArray(body.preserveElements)
      ? body.preserveElements
          .filter((x: unknown): x is string => typeof x === 'string')
          .map((x: string) => x.trim().slice(0, 200))
          .filter(Boolean)
      : undefined;
  const changeElements =
    Array.isArray(body.changeElements)
      ? body.changeElements
          .filter((x: unknown): x is string => typeof x === 'string')
          .map((x: string) => x.trim().slice(0, 200))
          .filter(Boolean)
      : undefined;

  const input: ReferenceRemixInput = {
    referenceUrl,
    referenceType,
    targetProduct: typeof body.targetProduct === 'string' ? body.targetProduct.trim().slice(0, 500) : undefined,
    targetAudience: typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, 500) : undefined,
    platform: typeof body.platform === 'string' ? body.platform.trim().slice(0, 100) : undefined,
    preserveElements,
    changeElements,
  };

  // Server-side validation
  const validation = validateReferenceRemixInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = REFERENCE_REMIX_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:reference-remix');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await generateReferenceRemix(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:reference-remix');
    const { error, status } = safeAtlasError(e, 'creative/reference-remix', 'remix_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
