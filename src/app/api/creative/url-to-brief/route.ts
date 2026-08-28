import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { urlToBrief, URL_TO_BRIEF_COST, SSRFError } from '@/lib/creative/url-to-brief';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url) return NextResponse.json({ error: 'url_required' }, { status: 400 });

  // Validate URL (must be valid http/https URL)
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  // Charge credits (URL fetch + AI extraction + brief generation = 5 credits)
  try {
    await deductCredits(uid, URL_TO_BRIEF_COST, 'creative:url-to-brief');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await urlToBrief(url, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, URL_TO_BRIEF_COST, 'creative:url-to-brief');
    // SSRF errors are client errors (bad URL), not server failures
    if (e instanceof SSRFError) {
      return NextResponse.json({ error: 'invalid_url', detail: e.message }, { status: 400 });
    }
    console.error('[creative/url-to-brief] error:', String(e));
    return NextResponse.json({ error: 'url_to_brief_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
