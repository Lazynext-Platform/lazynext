import { withAtlas } from '@/lib/request-context';
import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import {
  AD_REF_CHARACTER_MODEL,
  submitAdRefCharacter,
} from '@/lib/ad-reference';
import { uploadInputMediaToAtlas } from '@/lib/ad-reference-media';
import { chargeAndSubmit, chargeErrorResponse } from '@/lib/lazynext-studio/gen-task';
import { videoCredits } from '@/lib/video-pricing';
import {
  NonPublicMediaUrlError,
  toAtlasMediaUrl,
} from '@/lib/public-media-url';
import { isUrlSafe } from '@/lib/security';

export const maxDuration = 60;

const WAN_IMAGE_LIMIT = 5_000_000;
const WAN_VIDEO_LIMIT = 200_000_000;
const MAX_VIDEO_SECONDS = 300;

// Wan-2.2 Character Swap doesn't reliably accept Workers/R2 URLs, so upload to Atlas temporary media URL first before submitting.
async function __byokPOST(req: Request) {
  const session = await auth();
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
  // SSRF: validate URLs before Atlas upload fetches them server-side.
  if (!isUrlSafe(videoUrl) || !isUrlSafe(avatarUrl)) {
    return NextResponse.json({ error: 'blocked_url' }, { status: 400 });
  }

  // omni video-edit bills by reference video seconds (same as /edit); frontend passes duration with body.videoSeconds, conservatively defaults to 30s.
  const videoSeconds = Math.min(Number(body.videoSeconds) > 0 ? Number(body.videoSeconds) : 30, MAX_VIDEO_SECONDS);

  try {
    const submit = await chargeAndSubmit({
      uid,
      cost: videoCredits(AD_REF_CHARACTER_MODEL, undefined, videoSeconds),
      ref: 'ad-reference:character',
      templateId: 'adref:character',
      model: AD_REF_CHARACTER_MODEL,
      prompt: 'Replace the presenter/person with the uploaded talent reference while preserving the video motion.',
      submit: async () => {
        const [atlasVideoUrl, atlasAvatarUrl] = await Promise.all([
          uploadInputMediaToAtlas(body.videoUrl, videoUrl, req, 'adref-character-video', WAN_VIDEO_LIMIT),
          uploadInputMediaToAtlas(body.avatarUrl, avatarUrl, req, 'adref-character-avatar', WAN_IMAGE_LIMIT),
        ]);
        return submitAdRefCharacter(atlasVideoUrl, atlasAvatarUrl);
      },
    });
    return NextResponse.json({ id: submit.id, getUrl: submit.getUrl });
  } catch (e) {
    return chargeErrorResponse(e, 'ad-reference/character');
  }
}

export const POST = withAtlas(__byokPOST);
