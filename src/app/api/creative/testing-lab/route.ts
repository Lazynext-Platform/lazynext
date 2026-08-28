import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  runTestAnalysis,
  validateTestConfig,
  TESTING_LAB_COST,
  type TestConfig,
} from '@/lib/creative/testing-lab';
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
  const testConfig = body.testConfig as TestConfig | undefined;
  const variantMetrics = Array.isArray(body.variantMetrics) ? body.variantMetrics : [];

  if (!testConfig) {
    return NextResponse.json({ error: 'invalid_request', detail: 'testConfig is required' }, { status: 400 });
  }

  const validation = validateTestConfig(testConfig as unknown as Record<string, unknown>);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join('; ') },
      { status: 400 },
    );
  }

  if (variantMetrics.length < 2) {
    return NextResponse.json(
      { error: 'invalid_request', detail: 'At least 2 variants are required' },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, TESTING_LAB_COST, 'creative:testing-lab');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await runTestAnalysis({ testConfig, variantMetrics, planTier });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, TESTING_LAB_COST, 'creative:testing-lab');
    console.error('[creative/testing-lab] error:', String(e));
    return NextResponse.json({ error: 'analysis_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
