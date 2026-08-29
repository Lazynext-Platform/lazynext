import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits, refundCredits } from '@/lib/credits';
import type { CreativeBrief, ScriptCandidate } from '@/lib/creative/types';

export const maxDuration = 90;

const CREATIVE_MODEL = process.env.CREATIVE_MODEL || getLLMModel();
const CREATIVE_TIMEOUT_MS = Number(process.env.CREATIVE_TIMEOUT_MS || 90_000);
const ADAPT_COST = 4;

function resolveCreativeModel(planTier?: PlanTier): string {
  if (process.env.CREATIVE_MODEL) return process.env.CREATIVE_MODEL;
  return getLLMModel(planTier);
}

interface PlatformAdaptation {
  platform: string;
  format: string;
  aspectRatio: string;
  maxDurationSec: number;
  hook: string;
  scriptSummary: string;
  cta: string;
  visualDirection: string;
  platformSpecificNotes: string;
}

interface AdaptationResult {
  adaptations: PlatformAdaptation[];
  originalPlatform: string;
  notes: string;
}

const PLATFORM_SPECS: Record<string, { aspectRatio: string; maxDuration: number; format: string }> = {
  tiktok: { aspectRatio: '9:16', maxDuration: 60, format: 'ugc' },
  instagram: { aspectRatio: '9:16', maxDuration: 90, format: 'ugc' },
  youtube: { aspectRatio: '9:16', maxDuration: 60, format: 'commercial' },
  facebook: { aspectRatio: '1:1', maxDuration: 120, format: 'commercial' },
};

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const brief = body.brief as CreativeBrief | undefined;
  const script = body.script as ScriptCandidate | undefined;
  if (!brief || !script) return NextResponse.json({ error: 'brief_script_required' }, { status: 400 });

  const targetPlatforms = Array.isArray(body.targetPlatforms) ? body.targetPlatforms : [];
  if (targetPlatforms.length === 0) return NextResponse.json({ error: 'target_platforms_required' }, { status: 400 });

  // Validate platforms
  const validPlatforms = targetPlatforms.filter((p: string) => p in PLATFORM_SPECS);
  if (validPlatforms.length === 0) return NextResponse.json({ error: 'invalid_platforms' }, { status: 400 });

  // Exclude the original platform
  const platformsToAdapt = validPlatforms.filter((p: string) => p !== brief.platform);
  if (platformsToAdapt.length === 0) {
    return NextResponse.json({ error: 'no_platforms_to_adapt', detail: 'All target platforms are the same as the original' }, { status: 400 });
  }

  try {
    await deductCredits(uid, ADAPT_COST * platformsToAdapt.length, 'creative:adapt-platform');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const systemPrompt = `You are an expert at adapting ad creatives for different social media platforms. Each platform has unique conventions, audience expectations, and technical requirements.

Adapt the given creative for each target platform. Output ONLY a JSON object — no markdown, no explanation:
{
  "adaptations": [
    {
      "platform": "tiktok|instagram|youtube|facebook",
      "format": "the recommended format for this platform",
      "aspectRatio": "the recommended aspect ratio",
      "maxDurationSec": number,
      "hook": "platform-optimized hook text",
      "scriptSummary": "platform-optimized script summary",
      "cta": "platform-optimized CTA",
      "visualDirection": "platform-specific visual guidance",
      "platformSpecificNotes": "key differences and platform-specific considerations"
    }
  ],
  "notes": "overall notes about the adaptations"
}

Platform conventions:
- TikTok: 9:16, max 60s, UGC style, hook in first 3 seconds, trending sounds, native feel
- Instagram Reels: 9:16, max 90s, polished but authentic, music-driven, visual-first
- YouTube Shorts: 9:16, max 60s, higher production value, clear value proposition, subscribe CTA
- Facebook Feed: 1:1 or 4:5, max 120s, broader audience, captions essential, clear CTA

All text should be in English.`;

    const platformList = platformsToAdapt.map((p: string) => `${p} (${PLATFORM_SPECS[p].aspectRatio}, max ${PLATFORM_SPECS[p].maxDuration}s)`).join(', ');

    const userPrompt = `Original Creative:
Product: ${brief.productName} — ${brief.audience}
Platform: ${brief.platform}
Format: ${brief.format}
Hook: ${brief.hook}
Angle: ${brief.angle}
CTA: ${brief.cta}
Visual Direction: ${brief.visualDirection}
Script: ${script.title} (${script.totalDurationSec}s, ${script.scenes.length} scenes)
Script Scenes: ${script.scenes.map(s => `(${s.durationSec}s) ${s.voiceover.slice(0, 100)}`).join(' | ')}

Target Platforms: ${platformList}

Adapt this creative for each target platform now. Output the JSON object.`;

    const raw = await atlasChat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      resolveCreativeModel(planTier),
      4000,
      CREATIVE_TIMEOUT_MS,
    );

    const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('no_json_in_adaptation_output');
    const j = JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;

    const asStr = (v: unknown, fb = '') => (typeof v === 'string' && v.trim() ? v.trim() : fb);
    const asArr = (v: unknown) => (Array.isArray(v) ? v : []);

    const adaptations: PlatformAdaptation[] = asArr(j.adaptations).map((item) => {
      const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
      const platform = asStr(o.platform);
      const specs = PLATFORM_SPECS[platform] || { aspectRatio: '9:16', maxDuration: 60, format: 'ugc' };
      return {
        platform,
        format: asStr(o.format, specs.format),
        aspectRatio: asStr(o.aspectRatio, specs.aspectRatio),
        maxDurationSec: typeof o.maxDurationSec === 'number' ? o.maxDurationSec : specs.maxDuration,
        hook: asStr(o.hook),
        scriptSummary: asStr(o.scriptSummary),
        cta: asStr(o.cta),
        visualDirection: asStr(o.visualDirection),
        platformSpecificNotes: asStr(o.platformSpecificNotes),
      };
    }).filter((a) => platformsToAdapt.includes(a.platform));

    const result: AdaptationResult = {
      adaptations,
      originalPlatform: brief.platform,
      notes: asStr(j.notes),
    };

    return NextResponse.json({ result: result, cost: ADAPT_COST * adaptations.length });
  } catch (e) {
    await refundCredits(uid, ADAPT_COST * platformsToAdapt.length, 'creative:adapt-platform');
    console.error('[creative/adapt-platform] error:', String(e));
    return NextResponse.json({ error: 'adaptation_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
