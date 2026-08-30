import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  SMART_CALENDAR_COST,
  generateSmartCalendar,
  validateSmartCalendarInput,
  VALID_PLATFORMS,
  VALID_FORMATS,
  type SmartCalendarInput,
  type CalendarCreative,
  type Platform,
  type ContentFormat,
} from '@/lib/creative/smart-calendar';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';
import { safeError } from '@/lib/security';

export const maxDuration = 60;

/**
 * GET /api/creative/smart-calendar
 * Returns the credit cost and the input/output schema (no auth required for
 * catalog metadata — same pattern as other creative catalog endpoints).
 */
export async function GET() {
  return NextResponse.json({
    creditCost: SMART_CALENDAR_COST,
    schema: {
      input: {
        creatives: 'CalendarCreative[] (required)',
        startDate: 'string YYYY-MM-DD (required)',
        endDate: 'string YYYY-MM-DD (required)',
        timezone: 'string (optional)',
        dryRun: 'boolean (optional)',
      },
      output: {
        schedule: 'ScheduledPost[]',
        timezone: 'string',
        totalPosts: 'number',
        averageConfidence: 'number',
        platformBreakdown: 'Record<string, number>',
        dryRun: 'boolean',
      },
      platforms: VALID_PLATFORMS,
      formats: VALID_FORMATS,
    },
  });
}

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  const startDate =
    typeof body.startDate === 'string' ? body.startDate.trim().slice(0, 20) : '';
  const endDate =
    typeof body.endDate === 'string' ? body.endDate.trim().slice(0, 20) : '';
  const timezone =
    typeof body.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim().slice(0, 100)
      : undefined;
  const dryRun =
    typeof body.dryRun === 'boolean' ? body.dryRun : undefined;

  let creatives: CalendarCreative[] = [];
  if (Array.isArray(body.creatives)) {
    creatives = body.creatives.slice(0, 100).map((c: Record<string, unknown>, i: number) => ({
      id: typeof c.id === 'string' ? c.id.trim().slice(0, 200) : '',
      platform: (typeof c.platform === 'string' ? c.platform : '') as Platform,
      format: (typeof c.format === 'string' ? c.format : '') as ContentFormat,
      audience: typeof c.audience === 'string' ? c.audience.trim().slice(0, 500) : undefined,
      title: typeof c.title === 'string' ? c.title.trim().slice(0, 200) : undefined,
    })).filter((c: CalendarCreative) => c.id);
  }

  const input: SmartCalendarInput = {
    creatives,
    startDate,
    endDate,
    timezone,
    dryRun,
  };

  const validation = validateSmartCalendarInput(input);
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'invalid_request', detail: validation.errors.join(', ') },
      { status: 400 },
    );
  }

  try {
    await deductCredits(uid, SMART_CALENDAR_COST, 'creative:smart-calendar');
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
    const result = await generateSmartCalendar(input, uid, planTier);
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, SMART_CALENDAR_COST, 'creative:smart-calendar').catch(() => {});
    return NextResponse.json(safeError(e, 'creative/smart-calendar', 'smart_calendar_failed'), {
      status: 500,
    });
  }
}

export const POST = withAtlas(__byokPOST);
