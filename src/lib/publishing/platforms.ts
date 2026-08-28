/**
 * Platform capabilities and format adapters for multi-platform publishing.
 *
 * Each platform has distinct constraints (video duration, caption length,
 * hashtag limits, aspect ratios) and conventions (caption style, hashtag
 * placement). The adapters normalize content for a target platform while
 * the capabilities describe the hard limits used for validation.
 */

import type {
  PublishPlatform,
  PlatformCapabilities,
  PlatformFormatAdapter,
} from './types';

// ── Platform capabilities ──

export const PLATFORM_CAPABILITIES: Record<PublishPlatform, PlatformCapabilities> = {
  tiktok: {
    platform: 'tiktok',
    maxVideoDurationSec: 600,
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportedAspectRatios: ['9:16'],
    supportedMediaTypes: ['video', 'image'],
    allowsScheduling: true,
    allowsCrossPosting: true,
    privacyOptions: ['public', 'private', 'followers'],
    thumbnailRequired: false,
  },
  youtube_shorts: {
    platform: 'youtube_shorts',
    maxVideoDurationSec: 60,
    maxCaptionLength: 5000,
    maxHashtags: 15,
    supportedAspectRatios: ['9:16'],
    supportedMediaTypes: ['video'],
    allowsScheduling: true,
    allowsCrossPosting: true,
    privacyOptions: ['public', 'unlisted', 'private'],
    thumbnailRequired: false,
  },
  instagram_reels: {
    platform: 'instagram_reels',
    maxVideoDurationSec: 90,
    maxCaptionLength: 2200,
    maxHashtags: 30,
    supportedAspectRatios: ['9:16'],
    supportedMediaTypes: ['video'],
    allowsScheduling: true,
    allowsCrossPosting: true,
    privacyOptions: ['public', 'private', 'followers'],
    thumbnailRequired: false,
  },
  facebook: {
    platform: 'facebook',
    maxVideoDurationSec: 240,
    maxCaptionLength: 63206,
    maxHashtags: 10,
    supportedAspectRatios: ['16:9', '9:16'],
    supportedMediaTypes: ['video', 'image'],
    allowsScheduling: true,
    allowsCrossPosting: true,
    privacyOptions: ['public', 'private', 'followers'],
    thumbnailRequired: false,
  },
  twitter: {
    platform: 'twitter',
    maxVideoDurationSec: 140,
    maxCaptionLength: 280,
    maxHashtags: 0, // inline only — no separate hashtag block
    supportedAspectRatios: ['16:9'],
    supportedMediaTypes: ['video', 'image'],
    allowsScheduling: false,
    allowsCrossPosting: true,
    privacyOptions: ['public', 'private'],
    thumbnailRequired: false,
  },
  linkedin: {
    platform: 'linkedin',
    maxVideoDurationSec: 600,
    maxCaptionLength: 3000,
    maxHashtags: 5,
    supportedAspectRatios: ['16:9'],
    supportedMediaTypes: ['video', 'image'],
    allowsScheduling: true,
    allowsCrossPosting: true,
    privacyOptions: ['public', 'private', 'followers'],
    thumbnailRequired: false,
  },
};

// ── Platform-specific hashtag suggestion banks ──

const HASHTAG_BANKS: Record<PublishPlatform, string[]> = {
  tiktok: ['fyp', 'foryou', 'viral', 'trending', 'tiktok', 'creator', 'smallbusiness', 'musttry', 'hack', 'tutorial'],
  youtube_shorts: ['shorts', 'youtubeshorts', 'short', 'subscribe', 'viral', 'trending', 'howto', 'tutorial', 'creator', 'youtube'],
  instagram_reels: ['reels', 'reelsinstagram', 'instagood', 'viral', 'trending', 'explore', 'reelitfeelit', 'instadaily', 'smallbusiness', 'creator'],
  facebook: ['facebook', 'video', 'trending', 'community', 'smallbusiness', 'marketing', 'viral', 'share', 'follow', 'content'],
  twitter: ['trending', 'viral', 'news', 'update', 'today', 'breaking', 'thread', 'video', 'share', 'retweet'],
  linkedin: ['linkedin', 'professional', 'business', 'networking', 'career', 'industry', 'leadership', 'growth', 'marketing', 'strategy'],
};

// ── Platform format adapters ──

function makeAdapter(platform: PublishPlatform): PlatformFormatAdapter {
  const caps = PLATFORM_CAPABILITIES[platform];

  return {
    platform,
    adaptCaption(caption: string): string {
      return optimizeCaptionForPlatform(platform, caption);
    },
    adaptHashtags(hashtags: string[]): string[] {
      const cleaned = hashtags
        .map((h) => h.trim().replace(/^#+/, ''))
        .filter(Boolean);
      if (caps.maxHashtags === 0) return []; // inline-only platforms
      if (cleaned.length <= caps.maxHashtags) return cleaned;
      return cleaned.slice(0, caps.maxHashtags);
    },
    validateMedia(mediaUrl: string, durationSec?: number): { valid: boolean; errors: string[] } {
      const errors: string[] = [];
      if (!mediaUrl || !mediaUrl.trim()) {
        errors.push('media_url_required');
      }
      if (typeof durationSec === 'number' && durationSec > caps.maxVideoDurationSec) {
        errors.push(`duration_exceeds_max_${caps.maxVideoDurationSec}s`);
      }
      return { valid: errors.length === 0, errors };
    },
    getOptimalAspectRatio(): string {
      return caps.supportedAspectRatios[0];
    },
  };
}

export const PLATFORM_ADAPTERS: Record<PublishPlatform, PlatformFormatAdapter> = {
  tiktok: makeAdapter('tiktok'),
  youtube_shorts: makeAdapter('youtube_shorts'),
  instagram_reels: makeAdapter('instagram_reels'),
  facebook: makeAdapter('facebook'),
  twitter: makeAdapter('twitter'),
  linkedin: makeAdapter('linkedin'),
};

// ── Accessors ──

export function getPlatformCapabilities(platform: PublishPlatform): PlatformCapabilities {
  return PLATFORM_CAPABILITIES[platform];
}

export function getPlatformAdapter(platform: PublishPlatform): PlatformFormatAdapter {
  return PLATFORM_ADAPTERS[platform];
}

export function getAllPlatforms(): PlatformCapabilities[] {
  return Object.values(PLATFORM_CAPABILITIES);
}

// ── Content generation helpers ──

/**
 * Generate platform-specific hashtag suggestions based on the content.
 * Extracts keywords from the content and combines them with the platform's
 * hashtag bank, deduplicating and respecting the platform's hashtag limit.
 */
export function generatePlatformHashtags(platform: PublishPlatform, content: string): string[] {
  const caps = PLATFORM_CAPABILITIES[platform];
  if (caps.maxHashtags === 0) return [];

  const bank = HASHTAG_BANKS[platform] ?? [];
  // Extract candidate keywords from content (alphanumeric runs >= 4 chars).
  const keywords = (content.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [])
    .filter((w) => !['this', 'that', 'with', 'from', 'have', 'your', 'will', 'about'].includes(w));

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const k of [...keywords, ...bank]) {
    const tag = k.replace(/[^a-z0-9]/g, '');
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    merged.push(tag);
    if (merged.length >= caps.maxHashtags) break;
  }
  return merged;
}

/**
 * Optimize a caption for a specific platform: truncate to the platform's
 * caption limit and apply platform conventions (e.g. emoji suffixes for
 * TikTok/Instagram, professional tone marker for LinkedIn).
 */
export function optimizeCaptionForPlatform(platform: PublishPlatform, caption: string): string {
  const caps = PLATFORM_CAPABILITIES[platform];
  let s = caption.trim();

  // Platform-specific emoji conventions (only when not already present).
  if (platform === 'tiktok' && !s.includes('#fyp')) {
    s = `${s} #fyp #foryou`.trim();
  } else if (platform === 'instagram_reels' && !s.includes('#reels')) {
    s = `${s} #reels`.trim();
  } else if (platform === 'youtube_shorts' && !s.includes('#shorts')) {
    s = `${s} #shorts`.trim();
  }

  // Truncate to the platform caption limit, preserving a trailing ellipsis.
  if (s.length > caps.maxCaptionLength) {
    s = `${s.slice(0, Math.max(0, caps.maxCaptionLength - 1))}\u2026`;
  }
  return s;
}
