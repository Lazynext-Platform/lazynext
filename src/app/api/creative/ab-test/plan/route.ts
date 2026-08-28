import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import { getUserPlanTier } from '@/lib/plan-tier';
import type { PlanTier } from '@/lib/plan-tier';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import type { CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate } from '@/lib/creative/types';

export const maxDuration = 90;

const PLAN_COST = 5;

function resolveCreativeModel(planTier?: PlanTier): string {
  return process.env.CREATIVE_MODEL || getLLMModel(planTier);
}

interface TestVariant {
  label: string; // "A", "B", "C"
  variable: string; // "hook", "cta", "angle"
  change: string; // description of what changed
  hook: string;
  cta: string;
  angle: string;
  scriptSummary: string;
  hypothesis: string;
}

interface ABTestPlan {
  testName: string;
  controlVariant: TestVariant;
  testVariants: TestVariant[];
  primaryMetric: string; // "roas", "ctr", "cvr"
  hypothesis: string;
  sampleSizePerVariant: number;
  estimatedDurationDays: number;
  confidenceLevel: number;
  variables: string[];
  notes: string;
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  const script = body.script as ScriptCandidate | undefined;
  const hook = body.hook as HookCandidate | undefined;
  const angle = body.angle as CreativeAngle | undefined;

  if (!brief || !script || !hook || !angle) {
    return NextResponse.json({ error: 'all_inputs_required', detail: 'brief, script, hook, and angle are required' }, { status: 400 });
  }

  const primaryMetric = String(body.primaryMetric || 'roas');
  if (!['roas', 'ctr', 'cvr'].includes(primaryMetric)) {
    return NextResponse.json({ error: 'invalid_metric' }, { status: 400 });
  }

  const dailyBudget = typeof body.dailyBudget === 'number' ? body.dailyBudget : 50;
  const expectedCvr = typeof body.expectedCvr === 'number' ? body.expectedCvr : 0.02;

  try {
    await deductCredits(uid, PLAN_COST, 'creative:ab-test-plan');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const systemPrompt = `You are an expert at designing A/B tests for ad creatives. Create a controlled test plan with exactly one variable changed per variant.

Rules:
- The control variant is the original creative (labeled "A")
- Each test variant changes exactly ONE variable (hook, CTA, or angle)
- Generate 2-3 test variants (labeled "B", "C", optionally "D")
- Each variant must have a clear hypothesis
- The control variant's hypothesis is "baseline"

Output ONLY a JSON object — no markdown:
{
  "testName": "descriptive test name",
  "controlVariant": { "label": "A", "variable": "baseline", "change": "original", "hook": "...", "cta": "...", "angle": "...", "scriptSummary": "...", "hypothesis": "baseline" },
  "testVariants": [
    { "label": "B", "variable": "hook", "change": "description of change", "hook": "new hook", "cta": "same cta", "angle": "same angle", "scriptSummary": "adjusted summary", "hypothesis": "Changing the hook to X will improve Y because Z" }
  ],
  "primaryMetric": "roas|ctr|cvr",
  "hypothesis": "overall test hypothesis",
  "variables": ["hook", "cta"],
  "notes": "recommendations for running the test"
}`;

    const userPrompt = `Original Creative:
Product: ${brief.productName} — ${brief.audience}
Platform: ${brief.platform}
Hook: ${hook.text} (type: ${hook.type})
Angle: ${angle.name} — ${angle.description}
CTA: ${script.cta}
Script: ${script.title} (${script.totalDurationSec}s)
Script Summary: ${script.scenes.map(s => s.voiceover.slice(0, 80)).join(' | ')}

Primary metric to optimize: ${primaryMetric}
Daily budget: $${dailyBudget}

Create a controlled A/B test plan with 2-3 variants. Output the JSON object.`;

    const raw = await atlasChat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      resolveCreativeModel(planTier),
      3000,
      90_000,
    );

    const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('no_json_in_ab_test_plan');
    const j = JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;

    // Sample size estimation using simplified formula
    // For a two-proportion test: n = 16 * p * (1-p) / (delta)^2
    // where p is the expected conversion rate and delta is the minimum detectable effect
    const p = expectedCvr;
    const delta = p * 0.2; // 20% relative improvement (minimum detectable effect)
    const sampleSizePerVariant = Math.ceil(16 * p * (1 - p) / (delta * delta));
    const estimatedDurationDays = Math.ceil(sampleSizePerVariant / (dailyBudget * 1000 / 2)); // rough CPM-based estimate

    const asStr = (v: unknown, fb = '') => (typeof v === 'string' && v.trim() ? v.trim() : fb);
    const asArr = (v: unknown) => (Array.isArray(v) ? v : []);

    const plan: ABTestPlan = {
      testName: asStr(j.testName, 'A/B Test'),
      controlVariant: j.controlVariant as TestVariant,
      testVariants: asArr(j.testVariants).map((v) => v as TestVariant),
      primaryMetric: asStr(j.primaryMetric, primaryMetric),
      hypothesis: asStr(j.hypothesis),
      sampleSizePerVariant,
      estimatedDurationDays,
      confidenceLevel: 95,
      variables: asArr(j.variables).map((v) => asStr(v)),
      notes: asStr(j.notes),
    };

    return NextResponse.json({ plan, cost: PLAN_COST });
  } catch (e) {
    await refundSync(uid, PLAN_COST, 'creative:ab-test-plan');
    console.error('[creative/ab-test/plan] error:', String(e));
    return NextResponse.json({ error: 'plan_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
