import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { prisma } from '@/lib/prisma';
import type { CreativeBrief, HookCandidate, CreativeAngle, ScriptCandidate } from '@/lib/creative/types';

export const maxDuration = 90;

const BRAND_CHECK_COST = 3;

function resolveCreativeModel(planTier?: PlanTier): string {
  return process.env.CREATIVE_MODEL || getLLMModel(planTier);
}

interface BrandCheckResult {
  overallScore: number; // 0-100
  toneScore: number;
  messagingScore: number;
  visualScore: number;
  vocabularyScore: number;
  deviations: Array<{
    category: string; // "tone", "messaging", "visual", "vocabulary"
    severity: string; // "high", "medium", "low"
    description: string;
    suggestion: string;
  }>;
  recommendations: string[];
  alignedElements: string[];
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  const hook = body.hook as HookCandidate | undefined;
  const angle = body.angle as CreativeAngle | undefined;
  const script = body.script as ScriptCandidate | undefined;
  const brandKitId = String(body.brandKitId || '');

  if (!brief || !hook || !angle || !script) {
    return NextResponse.json({ error: 'all_inputs_required' }, { status: 400 });
  }
  if (!brandKitId) {
    return NextResponse.json({ error: 'brand_kit_required' }, { status: 400 });
  }

  // Fetch the brand kit
  const brandKit = await prisma.brandKit.findFirst({ where: { id: brandKitId, userId: uid } });
  if (!brandKit) return NextResponse.json({ error: 'brand_kit_not_found' }, { status: 404 });

  // Parse brand kit data
  let brandData: Record<string, unknown> = {};
  if (typeof brandKit.colors === 'string') {
    try { brandData = JSON.parse(brandKit.colors); } catch { brandData = {}; }
  } else if (brandKit.colors && typeof brandKit.colors === 'object') {
    brandData = brandKit.colors as Record<string, unknown>;
  }

  const asStr = (v: unknown, fb = 'N/A') => (typeof v === 'string' && v.trim() ? v.trim() : fb);
  const asArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => asStr(x, '')).filter(Boolean) : []);

  try {
    await deductCredits(uid, BRAND_CHECK_COST, 'creative:brand-check');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const systemPrompt = `You are a brand consistency expert. Analyze the given creative against the brand guidelines and score how well it aligns.

Score each dimension 0-100:
- tone: Does the creative's tone match the brand's established tone?
- messaging: Does the creative use messaging that aligns with brand positioning and claims?
- visual: Does the visual direction match the brand's visual style?
- vocabulary: Does the creative use brand-appropriate vocabulary and avoid prohibited claims?

Output ONLY a JSON object — no markdown:
{
  "overallScore": number,
  "toneScore": number,
  "messagingScore": number,
  "visualScore": number,
  "vocabularyScore": number,
  "deviations": [
    {
      "category": "tone|messaging|visual|vocabulary",
      "severity": "high|medium|low",
      "description": "what deviates from the brand",
      "suggestion": "how to fix it"
    }
  ],
  "recommendations": ["actionable recommendations"],
  "alignedElements": ["what's already well-aligned"]
}`;

    const brandContext = `Brand: ${brandKit.name}
Tone: ${asStr(brandData.tone, brandKit.toneNote || 'N/A')}
Industry: ${asStr(brandData.industry)}
Positioning: ${asStr(brandData.positioning)}
Audience: ${asStr(brandData.audience)}
VisualStyle: ${asStr(brandData.visualStyle)}
Colors: ${asArr(brandData.colors).join(', ')}
Fonts: ${asArr(brandData.fonts).join(', ')}
Slogan: ${asStr(brandData.slogan)}
Prohibited Claims: ${asArr(brandData.prohibitedClaims).join(', ')}
Brand Vocabulary: ${asArr(brandData.brandVocabulary).join(', ')}
Key Benefits: ${asArr(brandData.benefits).join(', ')}
Key Claims: ${asArr(brandData.claims).join(', ')}`;

    const creativeContext = `Creative:
Product: ${brief.productName} — ${brief.audience}
Platform: ${brief.platform}
Hook: ${hook.text} (type: ${hook.type})
Angle: ${angle.name} — ${angle.description}
CTA: ${script.cta}
Visual Direction: ${brief.visualDirection}
Script Summary: ${script.scenes.map(s => s.voiceover.slice(0, 100)).join(' | ')}`;

    const raw = await atlasChat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: `${brandContext}\n\n${creativeContext}\n\nAnalyze brand consistency now. Output the JSON object.` }],
      resolveCreativeModel(planTier),
      3000,
      90_000,
    );

    const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('no_json_in_brand_check');
    const j = JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;

    const result: BrandCheckResult = {
      overallScore: typeof j.overallScore === 'number' ? j.overallScore : 0,
      toneScore: typeof j.toneScore === 'number' ? j.toneScore : 0,
      messagingScore: typeof j.messagingScore === 'number' ? j.messagingScore : 0,
      visualScore: typeof j.visualScore === 'number' ? j.visualScore : 0,
      vocabularyScore: typeof j.vocabularyScore === 'number' ? j.vocabularyScore : 0,
      deviations: Array.isArray(j.deviations) ? j.deviations as BrandCheckResult['deviations'] : [],
      recommendations: asArr(j.recommendations),
      alignedElements: asArr(j.alignedElements),
    };

    return NextResponse.json({ result, cost: BRAND_CHECK_COST });
  } catch (e) {
    await refundSync(uid, BRAND_CHECK_COST, 'creative:brand-check');
    console.error('[creative/brand-check] error:', String(e));
    return NextResponse.json({ error: 'brand_check_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
