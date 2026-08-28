import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import type { CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate } from '@/lib/creative/types';

export const maxDuration = 90;

const CREATIVE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const REGENERATION_COST = 3;

function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

type ElementType = 'hook' | 'angle' | 'script' | 'brief';

interface RegenerationResult {
  type: ElementType;
  original: Record<string, unknown>;
  regenerated: Record<string, unknown>;
  changes: string[];
  improvementNote: string;
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  if (!brief || !brief.product) return NextResponse.json({ error: 'brief_required' }, { status: 400 });

  const type = String(body.type || '') as ElementType;
  if (!['hook', 'angle', 'script', 'brief'].includes(type)) {
    return NextResponse.json({ error: 'invalid_type' }, { status: 400 });
  }

  const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
  if (!instruction) return NextResponse.json({ error: 'instruction_required' }, { status: 400 });
  if (instruction.length > 1000) return NextResponse.json({ error: 'instruction_too_long' }, { status: 400 });

  const element = body.element;
  if (!element || typeof element !== 'object') return NextResponse.json({ error: 'element_required' }, { status: 400 });

  try {
    await deductCredits(uid, REGENERATION_COST, 'creative:regenerate');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const systemPrompt = `You are an expert creative strategist. Regenerate the given creative element based on the user's instruction. Preserve what works, change what is requested.

Output ONLY a JSON object — no markdown, no explanation:
{
  "regenerated": { /* the regenerated element with the same structure as the input */ },
  "changes": ["list of specific changes made"],
  "improvementNote": "brief explanation of why these changes improve the creative"
}

The regenerated element must have the SAME field structure as the input element.`;

    const userPrompt = `Product: ${brief.productName} — ${brief.audience}
Platform: ${brief.platform}
Format: ${brief.format}
Current Hook: ${brief.hook}
Current Angle: ${brief.angle}
Current CTA: ${brief.cta}

Element Type: ${type}
Current Element: ${JSON.stringify(element)}

User Instruction: ${instruction}

Regenerate this element now. Output the JSON object.`;

    const raw = await atlasChat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      resolveCreativeModel(planTier),
      3000,
      CREATIVE_TIMEOUT_MS,
    );

    const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('no_json_in_regeneration_output');
    const j = JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;

    const asStr = (v: unknown, fb = '') => (typeof v === 'string' && v.trim() ? v.trim() : fb);
    const asArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean) : []);

    const result: RegenerationResult = {
      type,
      original: element as Record<string, unknown>,
      regenerated: (j.regenerated && typeof j.regenerated === 'object' ? j.regenerated : element) as Record<string, unknown>,
      changes: asArr(j.changes).slice(0, 10),
      improvementNote: asStr(j.improvementNote),
    };

    return NextResponse.json({ result: result, cost: REGENERATION_COST });
  } catch (e) {
    await refundSync(uid, REGENERATION_COST, 'creative:regenerate');
    console.error('[creative/regenerate] error:', String(e));
    return NextResponse.json({ error: 'regeneration_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
