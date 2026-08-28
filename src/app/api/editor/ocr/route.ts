import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { dryRunOCR, type OCRProvider } from '@/lib/providers/ocr';
import { deductCredits } from '@/lib/credits';
import { refundSync } from '@/lib/lazynext-studio/gen-task';

export const maxDuration = 60;

const OCR_COST = 1;
const OCR_MODEL = 'firered/firered-ocr';

/** Returns the OCR provider — currently only the dry-run stub. */
function getOCRProvider(): OCRProvider {
  return dryRunOCR;
}

/**
 * POST /api/editor/ocr
 * Body: { imageUrl: string, language?: string, structured?: boolean }
 * Returns extracted text from the image via OCR.
 * Cost: 1 credit.
 */
async function __byokPOST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : '';
  if (!imageUrl) {
    return NextResponse.json({ error: 'imageUrl_required' }, { status: 400 });
  }

  try {
    new URL(imageUrl);
  } catch {
    return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
  }

  const language = typeof body.language === 'string' ? body.language : undefined;
  const structured = body.structured === true;

  try {
    await deductCredits(uid, OCR_COST, 'editor:ocr');
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error && e.message === 'INSUFFICIENT_CREDITS' ? 'insufficient_credits' : 'charge_failed' },
      { status: 402 },
    );
  }

  try {
    const provider = getOCRProvider();
    const result = await provider.extract({ imageUrl, language, structured });

    // Derive average confidence from structured regions if available
    let confidence: number | undefined;
    if (result.regions && result.regions.length > 0) {
      confidence = result.regions.reduce((sum, r) => sum + r.confidence, 0) / result.regions.length;
    }

    return NextResponse.json({
      text: result.text,
      confidence,
      regions: result.regions,
      language: result.language,
      model: OCR_MODEL,
      cost: OCR_COST,
      dryRun: provider.id === 'dryrun',
    });
  } catch (e) {
    await refundSync(uid, OCR_COST, 'editor:ocr');
    const message = e instanceof Error ? e.message : String(e);
    console.error('[editor/ocr] error:', message);
    return NextResponse.json({ error: 'ocr_failed', detail: message }, { status: 500 });
  }
}

export const POST = withAtlas(__byokPOST);
