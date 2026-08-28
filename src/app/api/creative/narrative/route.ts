import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  generateNarrativeAd,
  NARRATIVE_COST,
  validateNarrativeRequest,
  type NarrativeStructure,
  type Genre,
  type NarrativeAdRequest,
} from '@/lib/creative/narrative';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const VALID_STRUCTURES: NarrativeStructure[] = [
  'three_act', 'heros_journey', 'problem_solution', 'before_after',
  'testimony', 'suspense_reveal', 'emotional_arc', 'documentary',
];
const VALID_GENRES: Genre[] = [
  'drama', 'comedy', 'inspirational', 'educational',
  'lifestyle', 'documentary', 'fantasy', 'realistic',
];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  // Validate productName (required)
  const productName = typeof body.productName === 'string' ? body.productName.trim() : '';
  if (!productName) {
    return NextResponse.json({ error: 'product_name_required' }, { status: 400 });
  }
  if (productName.length > 300) {
    return NextResponse.json({ error: 'product_name_too_long' }, { status: 400 });
  }

  // Validate structure
  const structure = body.structure as NarrativeStructure | undefined;
  if (!structure || !VALID_STRUCTURES.includes(structure)) {
    return NextResponse.json(
      { error: 'invalid_structure', detail: `structure must be one of: ${VALID_STRUCTURES.join(', ')}` },
      { status: 400 },
    );
  }

  // Validate genre
  const genre = body.genre as Genre | undefined;
  if (!genre || !VALID_GENRES.includes(genre)) {
    return NextResponse.json(
      { error: 'invalid_genre', detail: `genre must be one of: ${VALID_GENRES.join(', ')}` },
      { status: 400 },
    );
  }

  // Optional fields
  const productDescription =
    typeof body.productDescription === 'string' ? body.productDescription.trim().slice(0, 2000) : undefined;
  const brandName =
    typeof body.brandName === 'string' ? body.brandName.trim().slice(0, 200) : undefined;
  const targetAudience =
    typeof body.targetAudience === 'string' ? body.targetAudience.trim().slice(0, 300) : undefined;
  const keyMessage =
    typeof body.keyMessage === 'string' ? body.keyMessage.trim().slice(0, 500) : undefined;
  const tone =
    typeof body.tone === 'string' ? body.tone.trim().slice(0, 200) : undefined;
  const durationSec =
    typeof body.durationSec === 'number'
      ? Math.max(30, Math.min(180, Math.round(body.durationSec)))
      : undefined;
  const characters = Array.isArray(body.characters)
    ? (body.characters as unknown[])
        .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
        .map((c) => ({
          name: typeof c.name === 'string' ? c.name.trim().slice(0, 100) : '',
          role: typeof c.role === 'string' ? c.role.trim().slice(0, 50) : '',
          description: typeof c.description === 'string' ? c.description.trim().slice(0, 500) : '',
        }))
        .filter((c) => c.name)
        .slice(0, 12)
    : undefined;

  const request: NarrativeAdRequest = {
    productName,
    structure,
    genre,
    ...(productDescription ? { productDescription } : {}),
    ...(brandName ? { brandName } : {}),
    ...(targetAudience ? { targetAudience } : {}),
    ...(keyMessage ? { keyMessage } : {}),
    ...(tone ? { tone } : {}),
    ...(durationSec ? { durationSec } : {}),
    ...(characters && characters.length ? { characters } : {}),
  };

  // Double-check validation from the module (defense in depth)
  const { valid, errors } = validateNarrativeRequest(request);
  if (!valid) {
    return NextResponse.json({ error: 'invalid_request', detail: errors.join(', ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, NARRATIVE_COST, 'creative:narrative');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await generateNarrativeAd(request, planTier);
    return NextResponse.json({ result, cost: NARRATIVE_COST });
  } catch (e) {
    await refundSync(uid, NARRATIVE_COST, 'creative:narrative');
    console.error('[creative/narrative] error:', String(e));
    return NextResponse.json({ error: 'narrative_generation_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
