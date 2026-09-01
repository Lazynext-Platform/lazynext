import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  CREATIVE_SCENE_GENERATOR_CREDIT_COST,
  generateScenes,
  validateCreativeSceneGeneratorInput,
  VALID_PLATFORMS,
  VALID_SHOT_TYPES,
  VALID_CAMERA_ANGLES,
  VALID_LIGHTING,
  VALID_LOCATIONS,
  MAX_PRODUCT_LENGTH,
  MAX_CONCEPT_LENGTH,
  MIN_SCENE_COUNT,
  MAX_SCENE_COUNT,
  DEFAULT_SCENE_COUNT,
  type CreativeSceneGeneratorInput,
  type Location,
} from '@/lib/creative/creative-scene-generator';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError, safeAtlasError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/creative-scene-generator
 * Returns the credit cost, schema info, and supported platforms/shot types/
 * camera angles/lighting/locations (no auth required for catalog metadata —
 * same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    feature: 'creative-scene-generator',
    creditCost: CREATIVE_SCENE_GENERATOR_CREDIT_COST,
    schema: {
      input: {
        productOrBrand: `string (required, max ${MAX_PRODUCT_LENGTH} chars)`,
        platform: 'string (required: tiktok, instagram, youtube, facebook)',
        concept: `string (required, max ${MAX_CONCEPT_LENGTH} chars)`,
        sceneCount: `number (optional, ${MIN_SCENE_COUNT}-${MAX_SCENE_COUNT}, default ${DEFAULT_SCENE_COUNT})`,
        location: 'string (optional: studio, outdoor, home, office, retail)',
        dryRun: 'boolean (optional)',
      },
      output: {
        scenes: 'SceneDescription[]',
        totalDuration: 'number (seconds)',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      shotTypes: VALID_SHOT_TYPES,
      cameraAngles: VALID_CAMERA_ANGLES,
      lighting: VALID_LIGHTING,
      locations: VALID_LOCATIONS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const productOrBrand =
    typeof body.productOrBrand === 'string' ? body.productOrBrand.trim().slice(0, MAX_PRODUCT_LENGTH) : '';

  const platform =
    typeof body.platform === 'string' && VALID_PLATFORMS.includes(body.platform)
      ? body.platform
      : '';

  const concept =
    typeof body.concept === 'string' ? body.concept.trim().slice(0, MAX_CONCEPT_LENGTH) : '';

  const sceneCount =
    typeof body.sceneCount === 'number' && Number.isFinite(body.sceneCount)
      ? Math.max(MIN_SCENE_COUNT, Math.min(MAX_SCENE_COUNT, Math.round(body.sceneCount)))
      : undefined;

  const location =
    typeof body.location === 'string' && VALID_LOCATIONS.includes(body.location as Location)
      ? (body.location as Location)
      : undefined;

  const dryRun = typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  const input: CreativeSceneGeneratorInput = {
    productOrBrand,
    platform,
    concept,
    sceneCount,
    location,
    dryRun,
  };

  const validation = validateCreativeSceneGeneratorInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  const cost = CREATIVE_SCENE_GENERATOR_CREDIT_COST;

  try {
    await deductCredits(uid, cost, 'creative:creative-scene-generator');
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error && e.message === 'INSUFFICIENT_CREDITS'
            ? 'insufficient_credits'
            : 'charge_failed',
      },
      { status: 402 },
    );
  }

  try {
    const result = await generateScenes(input, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, cost, 'creative:creative-scene-generator').catch(() => {});
    const { error, status } = safeAtlasError(e, 'creative/creative-scene-generator', 'generate_failed');
    return NextResponse.json({ error }, { status });
  }
}

export const POST = withAtlas(__byokPOST);
