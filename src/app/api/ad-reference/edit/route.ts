import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildEditRequest, submitAdRefEdit, cleanRefText, AD_REF_EDIT_MODEL } from '@/lib/ad-reference';
import { chargeAndSubmit, chargeErrorResponse } from '@/lib/lazynext-studio/gen-task';
import { videoCredits } from '@/lib/video-pricing';
import { NonPublicMediaUrlError, toAtlasMediaUrl } from '@/lib/public-media-url';
import { uploadInputMediaToAtlas, ADREF_VIDEO_UPLOAD_LIMIT, ADREF_IMAGE_UPLOAD_LIMIT } from '@/lib/ad-reference-media';

export const maxDuration = 60;

// gemini-omni-flash/video-edit swaps person + product in one step (pure omni, person swap also goes here since 2026-07-16).
// Person swap occasional async failure (1010002) is automatically retried as fallback by frontend submit+poll.
async function __byokPOST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  let videoUrl = '';
  let avatarUrl = '';
  let productUrl = '';
  try {
    videoUrl = toAtlasMediaUrl(body.videoUrl, req);
    avatarUrl = toAtlasMediaUrl(body.avatarUrl, req);
    productUrl = toAtlasMediaUrl(body.productUrl, req);
  } catch (e) {
    if (e instanceof NonPublicMediaUrlError) {
      return NextResponse.json({ error: 'media_url_not_public', detail: e.value }, { status: 400 });
    }
    throw e;
  }
  if (!videoUrl) return NextResponse.json({ error: 'video_url_required' }, { status: 400 });
  // Pure omni: one video-edit swaps person + product simultaneously, at least one of avatar / product required.
  if (!avatarUrl && !productUrl) return NextResponse.json({ error: 'avatar_or_product_required' }, { status: 400 });

  // omni video-edit bills by reference video seconds; frontend reads duration on upload and passes with body.videoSeconds, conservatively defaults to 30s.
  const videoSeconds = Number(body.videoSeconds) > 0 ? Number(body.videoSeconds) : 30;

  const { prompt } = buildEditRequest({
    videoUrl,
    avatarUrl: avatarUrl || undefined,
    productUrl: productUrl || undefined,
    productNote: cleanRefText(body.productNote, '', 300),
    extraNote: cleanRefText(body.extraNote, '', 500),
  });

  try {
    const submit = await chargeAndSubmit({
      uid,
      cost: videoCredits(AD_REF_EDIT_MODEL, undefined, videoSeconds),
      ref: 'ad-reference:edit',
      templateId: 'adref:edit',
      model: AD_REF_EDIT_MODEL,
      prompt,
      submit: async () => {
        // Same-origin R2 media can't let Atlas self-fetch via Worker (would 404→"invalid params"); first read directly from bucket and upload to Atlas temporary URL then submit.
        // images order must match buildEditRequest's "reference image N": portrait (avatar) first, then product.
        const atlasVideo = await uploadInputMediaToAtlas(body.videoUrl, videoUrl, req, 'adref-edit-video', ADREF_VIDEO_UPLOAD_LIMIT);
        const atlasImages: string[] = [];
        if (avatarUrl) atlasImages.push(await uploadInputMediaToAtlas(body.avatarUrl, avatarUrl, req, 'adref-edit-avatar', ADREF_IMAGE_UPLOAD_LIMIT));
        if (productUrl) atlasImages.push(await uploadInputMediaToAtlas(body.productUrl, productUrl, req, 'adref-edit-product', ADREF_IMAGE_UPLOAD_LIMIT));
        return submitAdRefEdit(atlasVideo, prompt, atlasImages);
      },
    });
    return NextResponse.json({ id: submit.id, getUrl: submit.getUrl, prompt });
  } catch (e) {
    return chargeErrorResponse(e, 'ad-reference/edit');
  }
}

export const POST = withAtlas(__byokPOST);
