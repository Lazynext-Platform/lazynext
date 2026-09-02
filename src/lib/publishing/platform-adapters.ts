/**
 * Platform-specific publishing adapters.
 *
 * Each adapter implements the actual API call to publish content to a
 * social media platform. These are called by the publisher when real
 * OAuth credentials are available.
 *
 * Currently implements:
 *   - TikTok: Post Video API (v2)
 *   - YouTube: Data API v3 (videos.insert)
 *   - Instagram: Content Publishing API
 *   - Facebook: Graph API (page feed)
 *   - LinkedIn: Posts API
 *
 * All adapters follow the same pattern:
 *   1. Upload media to the platform
 *   2. Create the post with caption + media
 *   3. Return { postId, postUrl }
 */

export interface PublishPayload {
  mediaUrl: string;
  caption: string;
  hashtags: string[];
  privacyLevel?: string;
}

export interface PublishAdapterResult {
  postId: string;
  postUrl: string;
}

/**
 * Publish to TikTok using the Post Video API.
 * Requires scope: video.publish, video.upload
 */
async function publishTiktok(accessToken: string, payload: PublishPayload): Promise<PublishAdapterResult> {
  // Step 1: Initialize upload
  const initRes = await fetch('https://open-api.tiktok.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'PULL_FROM_URL',
      video_url: payload.mediaUrl,
    }),
  });
  if (!initRes.ok) throw new Error(`tiktok_init_failed: ${initRes.status}`);
  const init = await initRes.json() as { publish_id?: string; data?: { publish_id?: string } };
  const publishId = init.publish_id || init.data?.publish_id;
  if (!publishId) throw new Error('tiktok_no_publish_id');

  // Step 2: Publish with caption
  const pubRes = await fetch('https://open-api.tiktok.com/v2/post/publish/status/fetch/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      publish_id: publishId,
      title: payload.caption,
      privacy_level: payload.privacyLevel || 'PUBLIC_TO_EVERYONE',
    }),
  });
  if (!pubRes.ok) throw new Error(`tiktok_publish_failed: ${pubRes.status}`);

  return {
    postId: publishId,
    postUrl: `https://www.tiktok.com/@user/video/${publishId}`,
  };
}

/**
 * Publish to YouTube using the Data API v3.
 * Requires scope: youtube.upload
 */
async function publishYoutube(accessToken: string, payload: PublishPayload): Promise<PublishAdapterResult> {
  // Fetch the video from the media URL
  const videoRes = await fetch(payload.mediaUrl);
  if (!videoRes.ok) throw new Error('youtube_video_fetch_failed');
  const videoBlob = await videoRes.blob();

  // Upload via videos.insert
  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=media&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'video/*',
      },
      body: videoBlob,
    },
  );
  if (!uploadRes.ok) throw new Error(`youtube_upload_failed: ${uploadRes.status}`);
  const video = await uploadRes.json() as { id?: string };
  if (!video.id) throw new Error('youtube_no_video_id');

  return {
    postId: video.id,
    postUrl: `https://www.youtube.com/watch?v=${video.id}`,
  };
}

/**
 * Publish to Instagram using the Content Publishing API.
 * Requires scope: instagram_content_publish
 */
async function publishInstagram(accessToken: string, payload: PublishPayload): Promise<PublishAdapterResult> {
  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v18.0/me/media?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: payload.mediaUrl,
        caption: `${payload.caption} ${payload.hashtags.map(h => `#${h}`).join(' ')}`,
      }),
    },
  );
  if (!containerRes.ok) throw new Error(`instagram_container_failed: ${containerRes.status}`);
  const container = await containerRes.json() as { id?: string };
  if (!container.id) throw new Error('instagram_no_container_id');

  // Step 2: Publish the container
  const pubRes = await fetch(
    `https://graph.facebook.com/v18.0/me/media_publish?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: container.id }),
    },
  );
  if (!pubRes.ok) throw new Error(`instagram_publish_failed: ${pubRes.status}`);
  const pub = await pubRes.json() as { id?: string };
  if (!pub.id) throw new Error('instagram_no_post_id');

  return {
    postId: pub.id,
    postUrl: `https://www.instagram.com/p/${pub.id}`,
  };
}

/**
 * Publish to Facebook using the Graph API (page feed).
 * Requires scope: pages_manage_posts, pages_read_engagement
 */
async function publishFacebook(accessToken: string, payload: PublishPayload): Promise<PublishAdapterResult> {
  const pubRes = await fetch(
    `https://graph.facebook.com/v18.0/me/feed?access_token=${accessToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `${payload.caption} ${payload.hashtags.map(h => `#${h}`).join(' ')}`,
        link: payload.mediaUrl,
      }),
    },
  );
  if (!pubRes.ok) throw new Error(`facebook_publish_failed: ${pubRes.status}`);
  const pub = await pubRes.json() as { id?: string };
  if (!pub.id) throw new Error('facebook_no_post_id');

  return {
    postId: pub.id,
    postUrl: `https://www.facebook.com/${pub.id}`,
  };
}

/**
 * Publish to LinkedIn using the Posts API.
 * Requires scope: w_member_social
 */
async function publishLinkedin(accessToken: string, payload: PublishPayload): Promise<PublishAdapterResult> {
  // Get user ID from the userinfo endpoint
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { 'Authorization': `Bearer ${accessToken}` },
  });
  if (!userRes.ok) throw new Error('linkedin_userinfo_failed');
  const user = await userRes.json() as { sub?: string };
  if (!user.sub) throw new Error('linkedin_no_user_id');

  const pubRes = await fetch('https://api.linkedin.com/v2/posts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      author: `urn:li:person:${user.sub}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: `${payload.caption} ${payload.hashtags.map(h => `#${h}`).join(' ')}` },
          shareMediaCategory: 'ARTICLE',
          media: [{ status: 'READY', originalUrl: payload.mediaUrl }],
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }),
  });
  if (!pubRes.ok) throw new Error(`linkedin_publish_failed: ${pubRes.status}`);
  const pub = await pubRes.json() as { id?: string };
  if (!pub.id) throw new Error('linkedin_no_post_id');

  return {
    postId: pub.id,
    postUrl: `https://www.linkedin.com/feed/update/${pub.id}`,
  };
}

/**
 * Dispatch to the correct platform adapter.
 */
export async function publishToPlatform(
  platform: string,
  accessToken: string,
  payload: PublishPayload,
): Promise<PublishAdapterResult> {
  switch (platform) {
    case 'tiktok':
      return publishTiktok(accessToken, payload);
    case 'youtube_shorts':
      return publishYoutube(accessToken, payload);
    case 'instagram_reels':
      return publishInstagram(accessToken, payload);
    case 'facebook':
      return publishFacebook(accessToken, payload);
    case 'linkedin':
      return publishLinkedin(accessToken, payload);
    default:
      throw new Error(`unsupported_platform: ${platform}`);
  }
}
