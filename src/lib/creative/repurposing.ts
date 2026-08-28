/**
 * Creative Repurposing Engine.
 *
 * Transforms one creative into multiple formats intelligently:
 * video→image carousel, long-form→short-form clips, horizontal→vertical,
 * script→social posts. Content extraction and reassembly across platforms.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const REPURPOSING_COST = 6;

// ── Types ──

export type SourceFormat =
  | 'video'
  | 'image'
  | 'script'
  | 'carousel'
  | 'story'
  | 'long_form_video';

export type TargetFormat =
  | 'short_form_video'
  | 'image_carousel'
  | 'single_image'
  | 'story_set'
  | 'social_post'
  | 'email_creative'
  | 'display_ad'
  | 'vertical_video'
  | 'horizontal_video'
  | 'square_video';

export type Platform =
  | 'meta'
  | 'google'
  | 'tiktok'
  | 'youtube'
  | 'instagram'
  | 'x'
  | 'linkedin'
  | 'pinterest'
  | 'snapchat';

export type RepurposeStrategy =
  | 'extract_highlights'
  | 'split_segments'
  | 'reformat_aspect'
  | 'summarize_keypoints'
  | 'create_variants'
  | 'cross_post';

// ── Interfaces ──

export interface ContentSegment {
  segmentId: string;
  startTime?: number;
  endTime?: number;
  title: string;
  content: string;
  hook: string;
  cta: string;
  suggestedVisual: string;
}

export interface RepurposePlan {
  sourceFormat: SourceFormat;
  targetFormat: TargetFormat;
  platform: Platform;
  strategy: RepurposeStrategy;
  segments: ContentSegment[];
  adaptations: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  qualityRetention: number;
}

export interface RepurposeResult {
  plans: RepurposePlan[];
  totalVariants: number;
  insights: string[];
  recommendations: string[];
  contentMap: Array<{
    planIndex: number;
    segments: ContentSegment[];
    adaptedContent: string;
    platformOptimizations: string[];
  }>;
}

// ── Lookup functions ──

export function getSourceFormats(): Array<{ format: SourceFormat; name: string; description: string }> {
  return [
    { format: 'video', name: 'Video', description: 'A video creative (horizontal or square)' },
    { format: 'image', name: 'Image', description: 'A single image creative' },
    { format: 'script', name: 'Script', description: 'A text script or ad copy' },
    { format: 'carousel', name: 'Carousel', description: 'A multi-image carousel ad' },
    { format: 'story', name: 'Story', description: 'A vertical story format creative' },
    { format: 'long_form_video', name: 'Long-form Video', description: 'A long-form video (>60s)' },
  ];
}

export function getTargetFormats(): Array<{ format: TargetFormat; name: string; description: string; aspectRatio: string; maxDuration?: number }> {
  return [
    { format: 'short_form_video', name: 'Short-form Video', description: '9-15s vertical clip', aspectRatio: '9:16', maxDuration: 15 },
    { format: 'image_carousel', name: 'Image Carousel', description: '3-5 image swipe set', aspectRatio: '1:1' },
    { format: 'single_image', name: 'Single Image', description: 'One static image ad', aspectRatio: '1:1' },
    { format: 'story_set', name: 'Story Set', description: 'Vertical story sequence', aspectRatio: '9:16' },
    { format: 'social_post', name: 'Social Post', description: 'Text + image social post', aspectRatio: '1.91:1' },
    { format: 'email_creative', name: 'Email Creative', description: 'HTML email creative block', aspectRatio: 'flexible' },
    { format: 'display_ad', name: 'Display Ad', description: 'Banner display ad', aspectRatio: '300x250' },
    { format: 'vertical_video', name: 'Vertical Video', description: '9:16 video', aspectRatio: '9:16' },
    { format: 'horizontal_video', name: 'Horizontal Video', description: '16:9 video', aspectRatio: '16:9' },
    { format: 'square_video', name: 'Square Video', description: '1:1 video', aspectRatio: '1:1' },
  ];
}

export function getPlatforms(): Array<{ platform: Platform; name: string; icon: string }> {
  return [
    { platform: 'meta', name: 'Meta (Facebook/Instagram)', icon: 'facebook' },
    { platform: 'google', name: 'Google Ads', icon: 'google' },
    { platform: 'tiktok', name: 'TikTok', icon: 'tiktok' },
    { platform: 'youtube', name: 'YouTube', icon: 'youtube' },
    { platform: 'instagram', name: 'Instagram', icon: 'instagram' },
    { platform: 'x', name: 'X (Twitter)', icon: 'x' },
    { platform: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
    { platform: 'pinterest', name: 'Pinterest', icon: 'pinterest' },
    { platform: 'snapchat', name: 'Snapchat', icon: 'snapchat' },
  ];
}

export function getRepurposeStrategies(): Array<{ strategy: RepurposeStrategy; name: string; description: string }> {
  return [
    { strategy: 'extract_highlights', name: 'Extract Highlights', description: 'Pull key moments from long content' },
    { strategy: 'split_segments', name: 'Split Segments', description: 'Break content into standalone segments' },
    { strategy: 'reformat_aspect', name: 'Reformat Aspect Ratio', description: 'Change dimensions while preserving content' },
    { strategy: 'summarize_keypoints', name: 'Summarize Key Points', description: 'Condense to essential messaging' },
    { strategy: 'create_variants', name: 'Create Variants', description: 'Generate angle/format variations' },
    { strategy: 'cross_post', name: 'Cross-post', description: 'Adapt for a different platform with minimal changes' },
  ];
}

// ── Strategy determination ──

export function determineStrategy(source: SourceFormat, target: TargetFormat): RepurposeStrategy {
  const map: Record<string, RepurposeStrategy> = {
    'long_form_video|short_form_video': 'extract_highlights',
    'long_form_video|vertical_video': 'split_segments',
    'long_form_video|image_carousel': 'summarize_keypoints',
    'video|short_form_video': 'split_segments',
    'video|vertical_video': 'reformat_aspect',
    'video|horizontal_video': 'reformat_aspect',
    'video|square_video': 'reformat_aspect',
    'video|image_carousel': 'extract_highlights',
    'video|single_image': 'extract_highlights',
    'video|story_set': 'split_segments',
    'video|social_post': 'summarize_keypoints',
    'script|short_form_video': 'create_variants',
    'script|social_post': 'create_variants',
    'script|email_creative': 'create_variants',
    'script|display_ad': 'create_variants',
    'image|image_carousel': 'create_variants',
    'image|single_image': 'cross_post',
    'image|display_ad': 'reformat_aspect',
    'image|social_post': 'cross_post',
    'carousel|single_image': 'extract_highlights',
    'carousel|story_set': 'cross_post',
    'story|short_form_video': 'cross_post',
    'story|vertical_video': 'cross_post',
  };
  return map[`${source}|${target}`] || 'create_variants';
}

export function estimateQualityRetention(source: SourceFormat, target: TargetFormat): number {
  // Same-medium transfers retain more quality
  const videoTargets: TargetFormat[] = ['short_form_video', 'vertical_video', 'horizontal_video', 'square_video', 'story_set'];
  const imageTargets: TargetFormat[] = ['image_carousel', 'single_image', 'display_ad', 'social_post'];
  const textTargets: TargetFormat[] = ['social_post', 'email_creative'];

  if ((source === 'video' || source === 'long_form_video') && videoTargets.includes(target)) return 85;
  if ((source === 'video' || source === 'long_form_video') && imageTargets.includes(target)) return 60;
  if (source === 'image' && imageTargets.includes(target)) return 90;
  if (source === 'image' && videoTargets.includes(target)) return 45;
  if (source === 'script' && textTargets.includes(target)) return 88;
  if (source === 'script' && videoTargets.includes(target)) return 70;
  if (source === 'carousel' && imageTargets.includes(target)) return 82;
  if (source === 'story' && videoTargets.includes(target)) return 88;
  return 65;
}

export function estimateEffort(source: SourceFormat, target: TargetFormat, segmentCount: number): 'low' | 'medium' | 'high' {
  if (segmentCount > 5) return 'high';
  const videoSources: SourceFormat[] = ['video', 'long_form_video'];
  const videoTargets: TargetFormat[] = ['short_form_video', 'vertical_video', 'horizontal_video', 'square_video', 'story_set'];
  if (videoSources.includes(source) && videoTargets.includes(target)) return 'medium';
  if (videoSources.includes(source) && !videoTargets.includes(target)) return 'high';
  if (source === 'script') return 'low';
  if (source === 'image') return 'low';
  return 'medium';
}

// ── Validation ──

export function validateRepurposingRequest(request: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!request.sourceContent || typeof request.sourceContent !== 'string' || !request.sourceContent.trim()) {
    errors.push('sourceContent is required');
  }
  const validSources: SourceFormat[] = ['video', 'image', 'script', 'carousel', 'story', 'long_form_video'];
  if (!request.sourceFormat || typeof request.sourceFormat !== 'string') {
    errors.push('sourceFormat is required');
  } else if (!validSources.includes(request.sourceFormat as SourceFormat)) {
    errors.push(`sourceFormat must be one of: ${validSources.join(', ')}`);
  }
  if (!Array.isArray(request.targetFormats) || request.targetFormats.length === 0) {
    errors.push('targetFormats must be a non-empty array');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI repurposing ──

export async function repurposeCreative(params: {
  sourceContent: string;
  sourceFormat: SourceFormat;
  targetFormats: TargetFormat[];
  platforms?: Platform[];
  brandContext?: string;
  planTier: PlanTier;
}): Promise<RepurposeResult> {
  const model = getLLMModel(params.planTier);
  const targets = params.targetFormats.join(', ');
  const platforms = (params.platforms || ['meta', 'tiktok', 'instagram']).join(', ');

  const sys = `You are a creative repurposing expert for e-commerce ads. Analyze the source creative content and generate repurposing plans for each target format. Return JSON only.
{
  "plans": [{
    "sourceFormat": "${params.sourceFormat}",
    "targetFormat": "<target>",
    "platform": "<platform>",
    "strategy": "<strategy>",
    "segments": [{"segmentId":"s1","title":"...","content":"...","hook":"...","cta":"...","suggestedVisual":"..."}],
    "adaptations": ["..."],
    "estimatedEffort": "low|medium|high",
    "qualityRetention": 0-100
  }],
  "insights": ["..."],
  "recommendations": ["..."],
  "contentMap": [{"planIndex":0,"segments":[...],"adaptedContent":"...","platformOptimizations":["..."]}]
}
Target formats: ${targets}. Platforms: ${platforms}. Brand context: ${params.brandContext || 'N/A'}.`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: `Source content (${params.sourceFormat}):\n${params.sourceContent.slice(0, 8000)}` },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);
    const plans: RepurposePlan[] = (parsed.plans || []).map((p: Record<string, unknown>) => ({
      sourceFormat: (p.sourceFormat as SourceFormat) || params.sourceFormat,
      targetFormat: p.targetFormat as TargetFormat,
      platform: (p.platform as Platform) || 'meta',
      strategy: (p.strategy as RepurposeStrategy) || 'create_variants',
      segments: Array.isArray(p.segments) ? p.segments.map((s: Record<string, unknown>, i: number) => ({
        segmentId: (s.segmentId as string) || `s${i + 1}`,
        startTime: typeof s.startTime === 'number' ? s.startTime : undefined,
        endTime: typeof s.endTime === 'number' ? s.endTime : undefined,
        title: String(s.title || `Segment ${i + 1}`),
        content: String(s.content || ''),
        hook: String(s.hook || ''),
        cta: String(s.cta || ''),
        suggestedVisual: String(s.suggestedVisual || ''),
      })) : [],
      adaptations: Array.isArray(p.adaptations) ? p.adaptations.map(String) : [],
      estimatedEffort: (p.estimatedEffort as 'low' | 'medium' | 'high') || 'medium',
      qualityRetention: typeof p.qualityRetention === 'number' ? p.qualityRetention : estimateQualityRetention(params.sourceFormat, p.targetFormat as TargetFormat),
    }));
    const contentMap = Array.isArray(parsed.contentMap) ? parsed.contentMap.map((c: Record<string, unknown>, i: number) => ({
      planIndex: typeof c.planIndex === 'number' ? c.planIndex : i,
      segments: Array.isArray(c.segments) ? c.segments.map((s: Record<string, unknown>, j: number) => ({
        segmentId: String(s.segmentId || `s${j + 1}`),
        title: String(s.title || ''),
        content: String(s.content || ''),
        hook: String(s.hook || ''),
        cta: String(s.cta || ''),
        suggestedVisual: String(s.suggestedVisual || ''),
      })) : [],
      adaptedContent: String(c.adaptedContent || ''),
      platformOptimizations: Array.isArray(c.platformOptimizations) ? c.platformOptimizations.map(String) : [],
    })) : [];
    return {
      plans,
      totalVariants: plans.length,
      insights: Array.isArray(parsed.insights) ? parsed.insights.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
      contentMap,
    };
  } catch {
    // Deterministic fallback
    return generateFallbackRepurpose(params);
  }
}

function generateFallbackRepurpose(params: {
  sourceContent: string;
  sourceFormat: SourceFormat;
  targetFormats: TargetFormat[];
  platforms?: Platform[];
}): RepurposeResult {
  const platforms = params.platforms || ['meta'];
  const plans: RepurposePlan[] = [];
  const contentMap: RepurposeResult['contentMap'] = [];

  for (const tf of params.targetFormats.slice(0, 5)) {
    for (const plat of platforms.slice(0, 3)) {
      const strategy = determineStrategy(params.sourceFormat, tf);
      const retention = estimateQualityRetention(params.sourceFormat, tf);
      const segments: ContentSegment[] = [
        {
          segmentId: 's1',
          title: 'Opening Hook',
          content: params.sourceContent.slice(0, 200),
          hook: 'Discover why this matters',
          cta: 'Shop now',
          suggestedVisual: 'Product hero shot',
        },
        {
          segmentId: 's2',
          title: 'Key Value',
          content: params.sourceContent.slice(200, 400),
          hook: 'Here\'s what makes it different',
          cta: 'Learn more',
          suggestedVisual: 'Feature comparison',
        },
      ];
      plans.push({
        sourceFormat: params.sourceFormat,
        targetFormat: tf,
        platform: plat,
        strategy,
        segments,
        adaptations: ['Adjusted aspect ratio', 'Optimized for platform specs', 'Simplified messaging'],
        estimatedEffort: estimateEffort(params.sourceFormat, tf, segments.length),
        qualityRetention: retention,
      });
      contentMap.push({
        planIndex: plans.length - 1,
        segments,
        adaptedContent: params.sourceContent.slice(0, 500),
        platformOptimizations: ['Native format compliance', 'Platform-specific CTA'],
      });
    }
  }

  return {
    plans,
    totalVariants: plans.length,
    insights: [
      `Generated ${plans.length} repurpose variants across ${params.targetFormats.length} target formats.`,
      'Quality retention varies by format conversion — same-medium transfers retain best.',
    ],
    recommendations: [
      'Prioritize high quality-retention variants for initial launch.',
      'A/B test different platform adaptations to find best performers.',
    ],
    contentMap,
  };
}
