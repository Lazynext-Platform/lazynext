import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { extractBrand, SSRFError } from '@/lib/brand/extract';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';
import { prisma } from '@/lib/prisma';

export const maxDuration = 90;

const BRAND_EXTRACT_COST = 5;

async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const url = typeof body.url === 'string' ? body.url.trim() : '';
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'url_required' }, { status: 400 });
  }

  // Charge credits
  try {
    await deductCredits(uid, BRAND_EXTRACT_COST, 'brand:extract');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const extraction = await extractBrand(url);

    // Save as a BrandKit (extends existing model — stores structured data in colors JSON)
    const brandKit = await prisma.brandKit.create({
      data: {
        userId: uid,
        name: extraction.company || extraction.domain,
        colors: {
          colors: extraction.colors,
          fonts: extraction.fonts,
          visualStyle: extraction.visualStyle,
          tone: extraction.tone,
          positioning: extraction.positioning,
          audience: extraction.audience,
          industry: extraction.industry,
          slogan: extraction.slogan,
          products: extraction.products,
          features: extraction.features,
          benefits: extraction.benefits,
          claims: extraction.claims,
          proofPoints: extraction.proofPoints,
          prohibitedClaims: extraction.prohibitedClaims,
          brandVocabulary: extraction.brandVocabulary,
          sourceUrls: extraction.sourceUrls,
          evidenceSnippets: extraction.evidenceSnippets,
          extractionTimestamp: extraction.extractionTimestamp,
        },
        fontNote: extraction.fonts.join(', '),
        toneNote: extraction.tone,
      },
    });

    return NextResponse.json({ extraction, brandKitId: brandKit.id });
  } catch (e) {
    await refundSync(uid, BRAND_EXTRACT_COST, 'brand:extract');
    if (e instanceof SSRFError) {
      return NextResponse.json({ error: 'url_blocked', reason: e.message }, { status: 400 });
    }
    console.error('[brand/extract] error:', String(e));
    return NextResponse.json({ error: 'extraction_failed', detail: String(e) }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
