/**
 * Multi-platform publishing types.
 *
 * Direct publishing to TikTok, YouTube Shorts, Instagram Reels, Facebook,
 * Twitter, and LinkedIn. Platform-specific format adaptation, caption
 * generation, hashtag suggestions, and scheduling.
 *
 * This extends the existing ad-platform abstraction with a publishing layer
 * focused on organic content distribution rather than paid campaigns.
 */

export type PublishPlatform =
  | 'tiktok'
  | 'youtube_shorts'
  | 'instagram_reels'
  | 'facebook'
  | 'twitter'
  | 'linkedin';

export interface PublishRequest {
  platform: PublishPlatform;
  /** Video or image URL. */
  mediaUrl: string;
  caption: string;
  hashtags: string[];
  description?: string;
  thumbnailUrl?: string;
  /** ISO timestamp for scheduled publishing. */
  scheduleAt?: string;
  privacyLevel?: 'public' | 'private' | 'unlisted' | 'followers';
  /** Cross-post to additional platforms. */
  crossPostTo?: PublishPlatform[];
}

export interface PublishResult {
  platform: PublishPlatform;
  status: 'published' | 'scheduled' | 'failed' | 'pending_approval';
  postId?: string;
  postUrl?: string;
  scheduledAt?: string;
  error?: string;
  metadata: {
    platformSpecificId?: string;
    publishedAt?: string;
    engagementMetrics?: {
      views?: number;
      likes?: number;
      comments?: number;
      shares?: number;
    };
  };
}

export interface PlatformCapabilities {
  platform: PublishPlatform;
  maxVideoDurationSec: number;
  maxCaptionLength: number;
  maxHashtags: number;
  supportedAspectRatios: string[];
  supportedMediaTypes: ('video' | 'image')[];
  allowsScheduling: boolean;
  allowsCrossPosting: boolean;
  privacyOptions: string[];
  thumbnailRequired: boolean;
}

export interface PlatformFormatAdapter {
  platform: PublishPlatform;
  adaptCaption(caption: string): string;
  adaptHashtags(hashtags: string[]): string[];
  validateMedia(
    mediaUrl: string,
    durationSec?: number,
  ): { valid: boolean; errors: string[] };
  getOptimalAspectRatio(): string;
}
