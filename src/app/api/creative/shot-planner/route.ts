import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  planVideoShots,
  validateShotPlanRequest,
  SHOT_PLANNER_COST,
  type VideoFormat,
  type ProductionStyle,
  type BudgetTier,
} from '@/lib/creative/shot-planner';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

const VALID_FORMATS: VideoFormat[] = ['vertical_9_16', 'horizontal_16_9', 'square_1_1', 'story_9_16', 'reel_9_16'];
const VALID_STYLES: ProductionStyle[] = ['studio', 'lifestyle', 'ugc', 'animated', 'mixed', 'minimal'];
const VALID_BUDGETS: BudgetTier[] = ['shoestring', 'low', 'medium', 'high', 'premium'];

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const sourceContent = typeof body.sourceContent === 'string' ? body.sourceContent.slice(0, 8000) : '';
  const sourceType = typeof body.sourceType === 'string' ? body.sourceType.slice(0, 50) : undefined;
  const format = typeof body.format === 'string' && VALID_FORMATS.includes(body.format as VideoFormat) ? body.format as VideoFormat : undefined;
  const productionStyle = typeof body.productionStyle === 'string' && VALID_STYLES.includes(body.productionStyle as ProductionStyle) ? body.productionStyle as ProductionStyle : undefined;
  const budgetTier = typeof body.budgetTier === 'string' && VALID_BUDGETS.includes(body.budgetTier as BudgetTier) ? body.budgetTier as BudgetTier : undefined;
  const targetDuration = typeof body.targetDuration === 'number' ? Math.min(Math.max(body.targetDuration, 5), 180) : undefined;

  const validation = validateShotPlanRequest({ sourceContent });
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, SHOT_PLANNER_COST, 'creative:shot-planner');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await planVideoShots({
      sourceContent,
      sourceType: sourceType as 'brief' | 'angle' | 'script' | 'storyboard' | undefined,
      format,
      productionStyle,
      budgetTier,
      targetDuration,
      planTier,
    });
    return NextResponse.json({ result });
  } catch (e) {
    await refundSync(uid, SHOT_PLANNER_COST, 'creative:shot-planner');
    console.error('[creative/shot-planner] error:', String(e));
    return NextResponse.json({ error: 'planning_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
