import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';
import { getUserPlanTier } from '@/lib/plan-tier';
import { deductCredits, refundCredits } from '@/lib/credits';
import { prisma } from '@/lib/prisma';

export const maxDuration = 60;

const TAG_COST = 1;

function resolveCreativeModel(planTier?: PlanTier): string {
  return process.env.CREATIVE_MODEL || getLLMModel(planTier);
}

interface AutoTagResult {
  tags: string[];
  category: string;
  mood: string;
  colorPalette: string[];
  sceneType: string;
  productType: string;
  description: string;
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const assetId = String(body.assetId || '');
  if (!assetId) return NextResponse.json({ error: 'asset_id_required' }, { status: 400 });

  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: uid } });
  if (!asset) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Parse existing metadata
  let metadata: Record<string, unknown> = {};
  if (typeof asset.metadata === 'string') {
    try { metadata = JSON.parse(asset.metadata); } catch { metadata = {}; }
  } else if (asset.metadata && typeof asset.metadata === 'object') {
    metadata = asset.metadata as Record<string, unknown>;
  }

  // Parse existing tags
  let existingTags: string[] = [];
  if (typeof asset.tags === 'string') {
    try { existingTags = JSON.parse(asset.tags); } catch { existingTags = []; }
  } else if (Array.isArray(asset.tags)) {
    existingTags = asset.tags as string[];
  }

  try {
    await deductCredits(uid, TAG_COST, 'assets:auto-tag');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const systemPrompt = `You are an expert at analyzing creative assets for e-commerce advertising. Based on the asset name, type, and any available metadata, generate intelligent tags.

Output ONLY a JSON object — no markdown:
{
  "tags": ["relevant", "searchable", "tags"],
  "category": "product|lifestyle|background|logo|texture|model|scene",
  "mood": "energetic|calm|luxurious|playful|professional|minimal|bold",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "sceneType": "studio|outdoor|indoor|lifestyle|abstract",
  "productType": "skincare|fashion|tech|food|fitness|home|other",
  "description": "one-sentence description of the asset"
}

Generate 5-10 relevant tags. Tags should be lowercase, single words or short phrases.`;

    const userPrompt = `Asset:
Name: ${asset.name}
Type: ${asset.type}
Source URL: ${asset.sourceUrl || 'N/A'}
Existing Tags: ${existingTags.join(', ') || 'none'}
Metadata: ${JSON.stringify(metadata).slice(0, 500)}

Generate intelligent tags for this asset. Output the JSON object.`;

    const raw = await atlasChat(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      resolveCreativeModel(planTier),
      1500,
      60_000,
    );

    const s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    if (a < 0 || b < 0) throw new Error('no_json_in_auto_tag');
    const j = JSON.parse(s.slice(a, b + 1)) as Record<string, unknown>;

    const asStr = (v: unknown, fb = '') => (typeof v === 'string' && v.trim() ? v.trim() : fb);
    const asArr = (v: unknown) => (Array.isArray(v) ? v.map((x) => asStr(x)).filter(Boolean) : []);

    const tagResult: AutoTagResult = {
      tags: asArr(j.tags),
      category: asStr(j.category, 'other'),
      mood: asStr(j.mood, 'neutral'),
      colorPalette: asArr(j.colorPalette),
      sceneType: asStr(j.sceneType, 'unknown'),
      productType: asStr(j.productType, 'other'),
      description: asStr(j.description),
    };

    // Merge new tags with existing
    const mergedTags = [...new Set([...existingTags, ...tagResult.tags])];

    // Update the asset with new tags and metadata
    const newMetadata = {
      ...metadata,
      autoTag: {
        category: tagResult.category,
        mood: tagResult.mood,
        colorPalette: tagResult.colorPalette,
        sceneType: tagResult.sceneType,
        productType: tagResult.productType,
        description: tagResult.description,
        taggedAt: new Date().toISOString(),
      },
    };

    await prisma.asset.update({
      where: { id: assetId },
      data: {
        tags: JSON.parse(JSON.stringify(mergedTags)),
        metadata: JSON.parse(JSON.stringify(newMetadata)),
      },
    });

    return NextResponse.json({ result: tagResult, mergedTags, cost: TAG_COST });
  } catch (e) {
    await refundCredits(uid, TAG_COST, 'assets:auto-tag');
    console.error('[assets/auto-tag] error:', String(e));
    return NextResponse.json({ error: 'auto_tag_failed' }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
