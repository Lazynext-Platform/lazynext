import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  analyzeCompetitors,
  validateCompetitorUrl,
  COMPETITOR_INTEL_COST,
} from '@/lib/creative/competitor-intel';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 120;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const market = typeof body.market === 'string' ? body.market.trim().slice(0, 200) : '';
  const competitorUrls: string[] = Array.isArray(body.competitorUrls)
    ? body.competitorUrls.filter((u: unknown) => typeof u === 'string').map((u: string) => u.trim()).filter(Boolean).slice(0, 10)
    : [];
  const yourMetrics: Record<string, number> = body.yourMetrics && typeof body.yourMetrics === 'object'
    ? Object.fromEntries(
        Object.entries(body.yourMetrics as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
          .map(([k, v]) => [k, v as number]),
      )
    : {};

  // SSRF protection on competitor URLs.
  for (const url of competitorUrls) {
    const check = validateCompetitorUrl(url);
    if (!check.valid) {
      return NextResponse.json(
        { error: 'invalid_competitor_url', detail: check.error, url },
        { status: 400 },
      );
    }
  }

  try {
    await deductCredits(uid, COMPETITOR_INTEL_COST, 'creative:competitor-intel');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await analyzeCompetitors({ market, competitorUrls, yourMetrics, planTier });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, COMPETITOR_INTEL_COST, 'creative:competitor-intel');
    console.error('[creative/competitor-intel] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
