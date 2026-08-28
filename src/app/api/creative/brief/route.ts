import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { generateBrief, CREATIVE_COSTS, type BriefInput } from '@/lib/creative/intelligence';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { prisma } from '@/lib/prisma';
import { getLearningsContext } from '@/lib/creative/learning';

export const maxDuration = 90;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const product = typeof body.product === 'string' ? body.product.trim().slice(0, 2000) : '';
  if (!product) return NextResponse.json({ error: 'product_required' }, { status: 400 });

  // Optionally load brand profile from BrandKit
  let brandData: Record<string, unknown> | null = null;
  if (typeof body.brandKitId === 'string' && body.brandKitId) {
    const kit = await prisma.brandKit.findFirst({ where: { id: body.brandKitId, userId: uid } });
    if (kit) {
      const colors = (kit.colors && typeof kit.colors === 'object' ? kit.colors : {}) as Record<string, unknown>;
      brandData = { ...colors, company: kit.name, tone: kit.toneNote, fontNote: kit.fontNote };
    }
  }

  try {
    await deductCredits(uid, CREATIVE_COSTS.brief, 'creative:brief');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  const input: BriefInput = {
    product,
    productName: typeof body.productName === 'string' ? body.productName.trim().slice(0, 200) : undefined,
    brand: brandData as BriefInput['brand'],
    platform: typeof body.platform === 'string' ? body.platform : undefined,
    format: typeof body.format === 'string' ? body.format : undefined,
    audience: typeof body.audience === 'string' ? body.audience : undefined,
    learnings: await getLearningsContext(uid).catch(() => ''),
  };

  try {
    const brief = await generateBrief(input);
    return NextResponse.json({ brief });
  } catch (e) {
    await refundSync(uid, CREATIVE_COSTS.brief, 'creative:brief');
    console.error('[creative/brief] error:', String(e));
    return NextResponse.json({ error: 'brief_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
