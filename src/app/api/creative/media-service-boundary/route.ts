import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  dispatchMediaService,
  validateMediaServiceRequest,
  MEDIA_SERVICE_COST,
  getServiceRegistry,
  type MediaCapability,
} from '@/lib/creative/media-service-boundary';
import { deductCredits, refundCredits } from '@/lib/credits';
import { getUserPlanTier } from '@/lib/plan-tier';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;
  const planTier = await getUserPlanTier(uid);

  const body = await req.json().catch(() => ({}));

  // Bound inputs
  const capabilityRaw = typeof body.capability === 'string' ? body.capability.slice(0, 50) : '';
  const input = {
    url: typeof body.input?.url === 'string' ? body.input.url.slice(0, 2048) : undefined,
    text: typeof body.input?.text === 'string' ? body.input.text.slice(0, 8000) : undefined,
    voiceId: typeof body.input?.voiceId === 'string' ? body.input.voiceId.slice(0, 100) : undefined,
    editInstruction: typeof body.input?.editInstruction === 'string' ? body.input.editInstruction.slice(0, 1000) : undefined,
    language: typeof body.input?.language === 'string' ? body.input.language.slice(0, 20) : undefined,
    options: body.input?.options && typeof body.input.options === 'object' ? body.input.options : undefined,
  };

  const validation = validateMediaServiceRequest(input);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_request', detail: validation.errors.join('; ') }, { status: 400 });
  }

  try {
    await deductCredits(uid, MEDIA_SERVICE_COST, 'creative:media-service-boundary');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const result = await dispatchMediaService({ capability: capabilityRaw as MediaCapability, input, planTier });
    return NextResponse.json({ result });
  } catch (e) {
    await refundCredits(uid, MEDIA_SERVICE_COST, 'creative:media-service-boundary');
    console.error('[creative/media-service-boundary] error:', String(e));
    return NextResponse.json({ error: 'service_failed', detail: String(e) }, { status: 500 });
  }
}

// GET returns the service registry (public capability manifest)
async function __byokGET() {
  return NextResponse.json({ registry: getServiceRegistry() });
}

export const POST = withAtlas(__byokPOST);
export const GET = withAtlas(__byokGET);
