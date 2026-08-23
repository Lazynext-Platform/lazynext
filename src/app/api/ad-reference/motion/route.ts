import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { submitAdRefMotion, AD_REF_MOTION_MODEL } from '@/lib/ad-reference';
import { chargeAndSubmit, chargeErrorResponse } from '@/lib/lazynext-studio/gen-task';
import { videoCredits } from '@/lib/video-pricing';
import { NonPublicMediaUrlError, toAtlasMediaUrl } from '@/lib/public-media-url';
import { uploadInputMediaToAtlas } from '@/lib/ad-reference-media';

export const maxDuration = 60;

// kling motion-control fallback person swap: on-camera person image + original reference video (motion source video) → let your person do the original video's motions.
// Used as degradation when omni real-person swap hits 1010002 (deepfake). kling input image/video both ≤10MB;
// same-origin R2 media is first read directly from bucket and uploaded to Atlas temporary URL (bypassing Worker self-fetch → otherwise Atlas can't fetch and reports invalid params).
const KLING_MEDIA_LIMIT = 10_000_000;

async function __byokPOST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const uid = session.user.id;

  const body = await req.json().catch(() => ({}));
  let videoUrl = '';
  let avatarUrl = '';
  try {
    videoUrl = toAtlasMediaUrl(body.videoUrl, req);
    avatarUrl = toAtlasMediaUrl(body.avatarUrl, req);
  } catch (e) {
    if (e instanceof NonPublicMediaUrlError) {
      return NextResponse.json({ error: 'media_url_not_public', detail: e.value }, { status: 400 });
    }
    throw e;
  }
  if (!videoUrl) return NextResponse.json({ error: 'video_url_required' }, { status: 400 });
  if (!avatarUrl) return NextResponse.json({ error: 'avatar_url_required' }, { status: 400 });

  // kling motion-control bills by driving video seconds; frontend passes reference video duration with body.videoSeconds, conservatively defaults to 30s.
  const videoSeconds = Number(body.videoSeconds) > 0 ? Number(body.videoSeconds) : 30;

  try {
    const submit = await chargeAndSubmit({
      uid,
      cost: videoCredits(AD_REF_MOTION_MODEL, undefined, videoSeconds),
      ref: 'ad-reference:motion',
      templateId: 'adref:motion',
      model: AD_REF_MOTION_MODEL,
      prompt: 'Motion transfer: animate the uploaded talent photo with the motion of the reference video.',
      submit: async () => {
        // image=on-camera person image, video=original reference video (motion source); upload to Atlas first (kling ≤10MB, over limit throws media_too_large here)
        const [atlasImage, atlasVideo] = await Promise.all([
          uploadInputMediaToAtlas(body.avatarUrl, avatarUrl, req, 'adref-motion-image', KLING_MEDIA_LIMIT),
          uploadInputMediaToAtlas(body.videoUrl, videoUrl, req, 'adref-motion-video', KLING_MEDIA_LIMIT),
        ]);
        return submitAdRefMotion(atlasImage, atlasVideo);
      },
    });
    return NextResponse.json({ id: submit.id, getUrl: submit.getUrl });
  } catch (e) {
    return chargeErrorResponse(e, 'ad-reference/motion');
  }
}

export const POST = withAtlas(__byokPOST);
