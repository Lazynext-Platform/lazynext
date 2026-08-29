import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { listSkills, getSkill, executeSkill } from '@/lib/creative/skill-library';
import type { SkillCategory } from '@/lib/creative/skill-library';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 60;

const VALID_CATEGORIES: SkillCategory[] = [
  'hook', 'angle', 'script', 'storyboard', 'visual', 'audio',
  'platform', 'strategy', 'analysis', 'optimization',
];

// ── GET: list all skills (optional ?category filter) ──

async function __byokGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const category = url.searchParams.get('category') || '';

  let skills = listSkills();
  if (category) {
    if (!VALID_CATEGORIES.includes(category as SkillCategory)) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
    }
    skills = skills.filter((s) => s.category === category);
  }

  return NextResponse.json({ skills });
}

export const GET = withAtlas(__byokGET);

// ── POST: execute a single skill ──

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));
  const skillId = typeof body.skillId === 'string' ? body.skillId : '';
  const inputs = (body.inputs && typeof body.inputs === 'object' ? body.inputs : {}) as Record<string, unknown>;

  if (!skillId) return NextResponse.json({ error: 'skill_id_required' }, { status: 400 });

  const skill = getSkill(skillId);
  if (!skill) {
    return NextResponse.json({ error: 'skill_not_found', detail: `Unknown skill: ${skillId}` }, { status: 404 });
  }

  // Validate required inputs are present.
  for (const inp of skill.inputs) {
    if (inp.required && (inputs[inp.name] === undefined || inputs[inp.name] === null || inputs[inp.name] === '')) {
      return NextResponse.json(
        { error: 'missing_required_input', detail: inp.name },
        { status: 400 },
      );
    }
  }

  // Deduct credits based on the skill's estimated cost.
  const cost = skill.estimatedCredits;
  if (cost > 0) {
    try {
      await deductCredits(uid, cost, `creative:skill:${skillId}`);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed',
        },
        { status: 402 },
      );
    }
  }

  try {
    const result = await executeSkill(skillId, inputs, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    if (cost > 0) await refundCredits(uid, cost, `creative:skill:${skillId}`);
    const message = e instanceof Error ? e.message : String(e);
    console.error(`[creative/skills] execute ${skillId} error:`, message);
    return NextResponse.json({ error: 'skill_execution_failed', detail: message }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
