import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getLearningsContext } from '@/lib/creative/learning';

export const maxDuration = 90;

const CREATIVE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const BRIEF_ASSISTANT_COST = 2;

interface BriefAssistantSuggestion {
  toneRecommendations: { tone: string; rationale: string }[];
  angleIdeas: { name: string; description: string; emotionalTrigger: string }[];
  hookSuggestions: { type: string; text: string; rationale: string }[];
  ctaOptimizations: { cta: string; rationale: string }[];
  overallAssessment: string;
  improvements: string[];
}

function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const product = typeof body.product === 'string' ? body.product.trim().slice(0, 2000) : '';
  const audience = typeof body.audience === 'string' ? body.audience.trim().slice(0, 500) : '';
  const platform = typeof body.platform === 'string' ? body.platform : '';
  const format = typeof body.format === 'string' ? body.format : '';
  const currentBrief = body.currentBrief;

  if (!product) return NextResponse.json({ error: 'product_required' }, { status: 400 });

  try {
    await deductCredits(uid, BRIEF_ASSISTANT_COST, 'creative:brief-assistant');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  const learnings = await getLearningsContext(uid).catch(() => '');

  const systemPrompt = `You are an expert creative strategist for e-commerce advertising. Analyze the provided product and audience information, then suggest improvements to the creative brief.

Output ONLY a JSON object — no markdown, no explanation:
{
  "toneRecommendations": [
    { "tone": "string", "rationale": "string" }
  ],
  "angleIdeas": [
    { "name": "string", "description": "string", "emotionalTrigger": "string" }
  ],
  "hookSuggestions": [
    { "type": "string", "text": "string", "rationale": "string" }
  ],
  "ctaOptimizations": [
    { "cta": "string", "rationale": "string" }
  ],
  "overallAssessment": "string",
  "improvements": ["string"]
}

Provide 3-4 tone recommendations, 3-4 angle ideas, 3-5 hook suggestions, and 2-3 CTA optimizations.
All text should be in English (it will be localized by the UI layer).`;

  const userParts = [
    `Product: ${product}`,
    audience && `Audience: ${audience}`,
    platform && `Platform: ${platform}`,
    format && `Format: ${format}`,
    currentBrief && `Current Brief: ${JSON.stringify(currentBrief)}`,
    learnings && `Performance Learnings: ${learnings.slice(0, 1000)}`,
  ].filter(Boolean);

  try {
    const raw = await atlasChat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userParts.join('\n') }],
      resolveCreativeModel(planTier),
      3000,
      CREATIVE_TIMEOUT_MS,
    );

    const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('no_json_in_assistant_output');
    const j = JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;

    const asStr = (v: unknown, fb = '') => (typeof v === 'string' && v.trim() ? v.trim() : fb);
    const asArr = (v: unknown) => (Array.isArray(v) ? v : []);

    const suggestion: BriefAssistantSuggestion = {
      toneRecommendations: asArr(j.toneRecommendations).map((item) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return { tone: asStr(o.tone), rationale: asStr(o.rationale) };
      }).slice(0, 4),
      angleIdeas: asArr(j.angleIdeas).map((item) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return { name: asStr(o.name), description: asStr(o.description), emotionalTrigger: asStr(o.emotionalTrigger) };
      }).slice(0, 4),
      hookSuggestions: asArr(j.hookSuggestions).map((item) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return { type: asStr(o.type), text: asStr(o.text), rationale: asStr(o.rationale) };
      }).slice(0, 5),
      ctaOptimizations: asArr(j.ctaOptimizations).map((item) => {
        const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return { cta: asStr(o.cta), rationale: asStr(o.rationale) };
      }).slice(0, 3),
      overallAssessment: asStr(j.overallAssessment),
      improvements: asArr(j.improvements).map((x) => asStr(x)).slice(0, 10),
    };

    return NextResponse.json({ suggestion });
  } catch (e) {
    await refundCredits(uid, BRIEF_ASSISTANT_COST, 'creative:brief-assistant');
    console.error('[creative/brief-assistant] error:', String(e));
    return NextResponse.json({ error: 'assistant_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
