/**
 * Creator Campaign Kits.
 *
 * Packages briefs, talking points, product info, dos/don'ts, delivery specs,
 * hooks, CTAs, visual guidelines, and compliance notes into a shareable kit
 * that human UGC creators can follow — enabling and managing human creator
 * partnerships at scale (distinct from AI-generated UGC).
 *
 * Inspired by the existing scene-analysis intelligence module — adapted for
 * LazyNext's e-commerce creative workflow to support human creator campaigns.
 */
import { atlasChat } from '@/lib/atlas';
import { getLLMModel } from '@/lib/providers/model-helpers';
import type { PlanTier } from '@/lib/plan-tier';

export const CREATOR_KIT_COST = 6;

// ── Types ──

export type KitPlatform =
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'facebook'
  | 'snapchat'
  | 'twitter';

export type CampaignGoal =
  | 'awareness'
  | 'consideration'
  | 'conversion'
  | 'engagement'
  | 'retention';

export interface TalkingPoint {
  priority: number;
  point: string;
  elaboration: string;
}

export interface DeliverySpec {
  videoLength: string;
  format: string;
  resolution: string;
  fileFormat: string;
  deadline: string;
  submissionMethod: string;
}

export interface ProductInfo {
  productName: string;
  keyFeatures: string[];
  usageInstructions: string;
  pricingContext: string;
}

export interface DosAndDonts {
  dos: string[];
  donts: string[];
}

export interface VisualGuidelines {
  setting: string;
  lighting: string;
  wardrobe: string;
  props: string[];
  background: string;
}

export interface ComplianceNotes {
  disclosureRequirements: string[];
  restrictedClaims: string[];
  platformSpecificRules: string[];
}

export interface CreatorBrief {
  overview: string;
  objective: string;
  keyMessage: string;
  toneStyle: string;
}

export interface CreatorKit {
  kitName: string;
  platform: KitPlatform;
  campaignGoal: CampaignGoal;
  estimatedDeliveryTime: string;
  brief: CreatorBrief;
  talkingPoints: TalkingPoint[];
  productInfo: ProductInfo;
  dosAndDonts: DosAndDonts;
  deliverySpecs: DeliverySpec;
  hookSuggestions: string[];
  ctaOptions: string[];
  visualGuidelines: VisualGuidelines;
  complianceNotes: ComplianceNotes;
}

export interface CreatorKitResult {
  kit: CreatorKit;
  estimatedReach: string;
  estimatedEngagement: string;
  creatorTips: string[];
}

// ── Lookup functions ──

export function getKitPlatforms(): Array<{ value: KitPlatform; name: string; description: string }> {
  return [
    { value: 'tiktok', name: 'TikTok', description: 'Short-form vertical video (9:16)' },
    { value: 'instagram', name: 'Instagram', description: 'Reels & Stories vertical video' },
    { value: 'youtube', name: 'YouTube', description: 'Shorts & long-form video' },
    { value: 'facebook', name: 'Facebook', description: 'Feed & Reels video' },
    { value: 'snapchat', name: 'Snapchat', description: 'Vertical Spotlight video' },
    { value: 'twitter', name: 'Twitter/X', description: 'In-feed short video' },
  ];
}

export function getCampaignGoals(): Array<{ value: CampaignGoal; name: string; description: string }> {
  return [
    { value: 'awareness', name: 'Awareness', description: 'Introduce product to new audiences' },
    { value: 'consideration', name: 'Consideration', description: 'Build interest and educate' },
    { value: 'conversion', name: 'Conversion', description: 'Drive purchases / sign-ups' },
    { value: 'engagement', name: 'Engagement', description: 'Spark comments, shares, saves' },
    { value: 'retention', name: 'Retention', description: 'Re-engage existing customers' },
  ];
}

// ── Pure helpers ──

export function sortTalkingPoints(points: TalkingPoint[]): TalkingPoint[] {
  return [...points].sort((a, b) => a.priority - b.priority);
}

export function normalizePlatform(input: string): KitPlatform {
  const lower = String(input || '').toLowerCase().trim();
  const valid: KitPlatform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'twitter'];
  return (valid as string[]).includes(lower) ? (lower as KitPlatform) : 'tiktok';
}

export function normalizeGoal(input: string): CampaignGoal {
  const lower = String(input || '').toLowerCase().trim();
  const valid: CampaignGoal[] = ['awareness', 'consideration', 'conversion', 'engagement', 'retention'];
  return (valid as string[]).includes(lower) ? (lower as CampaignGoal) : 'awareness';
}

export function platformDeliveryDefaults(platform: KitPlatform): DeliverySpec {
  switch (platform) {
    case 'tiktok':
      return { videoLength: '15-60s', format: '9:16 vertical', resolution: '1080x1920', fileFormat: 'MP4 (H.264)', deadline: '7 days', submissionMethod: 'Upload to shared drive folder' };
    case 'instagram':
      return { videoLength: '15-90s', format: '9:16 vertical', resolution: '1080x1920', fileFormat: 'MP4 (H.264)', deadline: '7 days', submissionMethod: 'Upload to shared drive folder' };
    case 'youtube':
      return { videoLength: '30-120s', format: '16:9 or 9:16', resolution: '1920x1080', fileFormat: 'MP4 (H.264)', deadline: '10 days', submissionMethod: 'Upload to shared drive folder' };
    case 'facebook':
      return { videoLength: '15-60s', format: '4:5 or 9:16', resolution: '1080x1350', fileFormat: 'MP4 (H.264)', deadline: '7 days', submissionMethod: 'Upload to shared drive folder' };
    case 'snapchat':
      return { videoLength: '10-60s', format: '9:16 vertical', resolution: '1080x1920', fileFormat: 'MP4 (H.264)', deadline: '7 days', submissionMethod: 'Upload to shared drive folder' };
    case 'twitter':
      return { videoLength: '15-45s', format: '16:9 or 1:1', resolution: '1280x720', fileFormat: 'MP4 (H.264)', deadline: '5 days', submissionMethod: 'Upload to shared drive folder' };
  }
}

export function estimateReach(platform: KitPlatform, goal: CampaignGoal): string {
  const base: Record<KitPlatform, number> = {
    tiktok: 50000, instagram: 40000, youtube: 30000, facebook: 25000, snapchat: 20000, twitter: 15000,
  };
  const multiplier: Record<CampaignGoal, number> = {
    awareness: 1.4, consideration: 1.0, conversion: 0.7, engagement: 1.1, retention: 0.6,
  };
  const est = Math.round(base[platform] * multiplier[goal]);
  return `${est.toLocaleString()} - ${(est * 2).toLocaleString()} impressions`;
}

export function estimateEngagementRate(platform: KitPlatform): string {
  const rates: Record<KitPlatform, string> = {
    tiktok: '5-12%', instagram: '3-8%', youtube: '2-6%', facebook: '1-4%', snapchat: '4-9%', twitter: '1-3%',
  };
  return rates[platform];
}

// ── Validation ──

export function validateCreatorKitRequest(input: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const productName = typeof input.productName === 'string' ? input.productName.trim() : '';
  const productDescription = typeof input.productDescription === 'string' ? input.productDescription.trim() : '';
  if (!productName) errors.push('productName is required');
  if (productName.length > 200) errors.push('productName must be 200 characters or fewer');
  if (!productDescription) errors.push('productDescription is required');
  if (productDescription.length > 4000) errors.push('productDescription must be 4000 characters or fewer');
  if (input.platform && typeof input.platform === 'string') {
    const valid: KitPlatform[] = ['tiktok', 'instagram', 'youtube', 'facebook', 'snapchat', 'twitter'];
    if (!(valid as string[]).includes(input.platform)) errors.push('platform is invalid');
  }
  if (input.campaignGoal && typeof input.campaignGoal === 'string') {
    const valid: CampaignGoal[] = ['awareness', 'consideration', 'conversion', 'engagement', 'retention'];
    if (!(valid as string[]).includes(input.campaignGoal)) errors.push('campaignGoal is invalid');
  }
  return { valid: errors.length === 0, errors };
}

// ── AI generation ──

export async function generateCreatorKit(params: {
  productName: string;
  productDescription: string;
  platform: KitPlatform;
  campaignGoal: CampaignGoal;
  targetAudience?: string;
  keySellingPoints?: string;
  brandGuidelines?: string;
  planTier: PlanTier;
}): Promise<CreatorKitResult> {
  const model = getLLMModel(params.planTier);
  const platform = normalizePlatform(params.platform);
  const goal = normalizeGoal(params.campaignGoal);

  const sys = `You are an expert UGC creator campaign strategist for e-commerce brands. Build a complete, shareable Creator Campaign Kit that a human UGC creator can follow to produce on-brand, high-performing content. Return JSON only.
{
  "kit": {
    "kitName": "...",
    "platform": "tiktok|instagram|youtube|facebook|snapchat|twitter",
    "campaignGoal": "awareness|consideration|conversion|engagement|retention",
    "estimatedDeliveryTime": "...",
    "brief": { "overview": "...", "objective": "...", "keyMessage": "...", "toneStyle": "..." },
    "talkingPoints": [{ "priority": 1, "point": "...", "elaboration": "..." }],
    "productInfo": { "productName": "...", "keyFeatures": ["..."], "usageInstructions": "...", "pricingContext": "..." },
    "dosAndDonts": { "dos": ["..."], "donts": ["..."] },
    "deliverySpecs": { "videoLength": "...", "format": "...", "resolution": "...", "fileFormat": "...", "deadline": "...", "submissionMethod": "..." },
    "hookSuggestions": ["..."],
    "ctaOptions": ["..."],
    "visualGuidelines": { "setting": "...", "lighting": "...", "wardrobe": "...", "props": ["..."], "background": "..." },
    "complianceNotes": { "disclosureRequirements": ["..."], "restrictedClaims": ["..."], "platformSpecificRules": ["..."] }
  },
  "estimatedReach": "...",
  "estimatedEngagement": "...",
  "creatorTips": ["..."]
}
Platform: ${platform}
Campaign goal: ${goal}`;

  try {
    const raw = await atlasChat(
      [
        { role: 'system', content: sys },
        {
          role: 'user',
          content: `Build a creator campaign kit.
Product name: ${params.productName.slice(0, 200)}
Product description: ${params.productDescription.slice(0, 4000)}
Target audience: ${(params.targetAudience || 'general e-commerce shoppers').slice(0, 500)}
Key selling points: ${(params.keySellingPoints || '').slice(0, 1000)}
Brand guidelines: ${(params.brandGuidelines || '').slice(0, 1000)}`,
        },
      ],
      model,
      4000,
    );
    const parsed = JSON.parse(raw);
    return normalizeKitResult(parsed, params);
  } catch {
    return generateFallbackCreatorKit(params);
  }
}

function normalizeKitResult(parsed: Record<string, unknown>, params: {
  productName: string; productDescription: string; platform: KitPlatform; campaignGoal: CampaignGoal;
}): CreatorKitResult {
  const kitRaw = (parsed.kit as Record<string, unknown>) || {};
  const briefRaw = (kitRaw.brief as Record<string, unknown>) || {};
  const productRaw = (kitRaw.productInfo as Record<string, unknown>) || {};
  const ddRaw = (kitRaw.dosAndDonts as Record<string, unknown>) || {};
  const deliveryRaw = (kitRaw.deliverySpecs as Record<string, unknown>) || {};
  const visualRaw = (kitRaw.visualGuidelines as Record<string, unknown>) || {};
  const complianceRaw = (kitRaw.complianceNotes as Record<string, unknown>) || {};

  const platform = normalizePlatform(String(kitRaw.platform || params.platform));
  const goal = normalizeGoal(String(kitRaw.campaignGoal || params.campaignGoal));

  const talkingPoints: TalkingPoint[] = Array.isArray(kitRaw.talkingPoints)
    ? (kitRaw.talkingPoints as Array<Record<string, unknown>>).map((tp, i) => ({
        priority: typeof tp.priority === 'number' ? tp.priority : i + 1,
        point: String(tp.point || '').slice(0, 300),
        elaboration: String(tp.elaboration || '').slice(0, 600),
      }))
    : [];

  const kit: CreatorKit = {
    kitName: String(kitRaw.kitName || `${params.productName} Creator Kit`).slice(0, 200),
    platform,
    campaignGoal: goal,
    estimatedDeliveryTime: String(kitRaw.estimatedDeliveryTime || platformDeliveryDefaults(platform).deadline).slice(0, 100),
    brief: {
      overview: String(briefRaw.overview || '').slice(0, 1000),
      objective: String(briefRaw.objective || '').slice(0, 500),
      keyMessage: String(briefRaw.keyMessage || '').slice(0, 300),
      toneStyle: String(briefRaw.toneStyle || '').slice(0, 300),
    },
    talkingPoints: sortTalkingPoints(talkingPoints).slice(0, 7),
    productInfo: {
      productName: String(productRaw.productName || params.productName).slice(0, 200),
      keyFeatures: Array.isArray(productRaw.keyFeatures) ? (productRaw.keyFeatures as unknown[]).map((f) => String(f).slice(0, 200)).slice(0, 10) : [],
      usageInstructions: String(productRaw.usageInstructions || '').slice(0, 1000),
      pricingContext: String(productRaw.pricingContext || '').slice(0, 300),
    },
    dosAndDonts: {
      dos: Array.isArray(ddRaw.dos) ? (ddRaw.dos as unknown[]).map((d) => String(d).slice(0, 300)).slice(0, 15) : [],
      donts: Array.isArray(ddRaw.donts) ? (ddRaw.donts as unknown[]).map((d) => String(d).slice(0, 300)).slice(0, 15) : [],
    },
    deliverySpecs: {
      videoLength: String(deliveryRaw.videoLength || platformDeliveryDefaults(platform).videoLength).slice(0, 50),
      format: String(deliveryRaw.format || platformDeliveryDefaults(platform).format).slice(0, 50),
      resolution: String(deliveryRaw.resolution || platformDeliveryDefaults(platform).resolution).slice(0, 50),
      fileFormat: String(deliveryRaw.fileFormat || platformDeliveryDefaults(platform).fileFormat).slice(0, 50),
      deadline: String(deliveryRaw.deadline || platformDeliveryDefaults(platform).deadline).slice(0, 50),
      submissionMethod: String(deliveryRaw.submissionMethod || platformDeliveryDefaults(platform).submissionMethod).slice(0, 200),
    },
    hookSuggestions: Array.isArray(kitRaw.hookSuggestions) ? (kitRaw.hookSuggestions as unknown[]).map((h) => String(h).slice(0, 300)).slice(0, 5) : [],
    ctaOptions: Array.isArray(kitRaw.ctaOptions) ? (kitRaw.ctaOptions as unknown[]).map((c) => String(c).slice(0, 300)).slice(0, 4) : [],
    visualGuidelines: {
      setting: String(visualRaw.setting || '').slice(0, 300),
      lighting: String(visualRaw.lighting || '').slice(0, 300),
      wardrobe: String(visualRaw.wardrobe || '').slice(0, 300),
      props: Array.isArray(visualRaw.props) ? (visualRaw.props as unknown[]).map((p) => String(p).slice(0, 200)).slice(0, 10) : [],
      background: String(visualRaw.background || '').slice(0, 300),
    },
    complianceNotes: {
      disclosureRequirements: Array.isArray(complianceRaw.disclosureRequirements) ? (complianceRaw.disclosureRequirements as unknown[]).map((d) => String(d).slice(0, 300)).slice(0, 10) : [],
      restrictedClaims: Array.isArray(complianceRaw.restrictedClaims) ? (complianceRaw.restrictedClaims as unknown[]).map((r) => String(r).slice(0, 300)).slice(0, 10) : [],
      platformSpecificRules: Array.isArray(complianceRaw.platformSpecificRules) ? (complianceRaw.platformSpecificRules as unknown[]).map((r) => String(r).slice(0, 300)).slice(0, 10) : [],
    },
  };

  return {
    kit,
    estimatedReach: String(parsed.estimatedReach || estimateReach(platform, goal)).slice(0, 200),
    estimatedEngagement: String(parsed.estimatedEngagement || estimateEngagementRate(platform)).slice(0, 100),
    creatorTips: Array.isArray(parsed.creatorTips) ? (parsed.creatorTips as unknown[]).map((tip) => String(tip).slice(0, 300)).slice(0, 10) : [],
  };
}

// ── Deterministic fallback (no AI) ──

export function generateFallbackCreatorKit(params: {
  productName: string;
  productDescription: string;
  platform: KitPlatform;
  campaignGoal: CampaignGoal;
  targetAudience?: string;
  keySellingPoints?: string;
  brandGuidelines?: string;
}): CreatorKitResult {
  const platform = normalizePlatform(params.platform);
  const goal = normalizeGoal(params.campaignGoal);
  const name = params.productName.slice(0, 200) || 'Your Product';
  const desc = params.productDescription.slice(0, 4000);
  const audience = (params.targetAudience || 'everyday shoppers').slice(0, 500);
  const sellingPoints = (params.keySellingPoints || '').slice(0, 1000);
  const delivery = platformDeliveryDefaults(platform);

  const goalObjective: Record<CampaignGoal, string> = {
    awareness: `Introduce ${name} to ${audience} and build top-of-mind recall.`,
    consideration: `Educate ${audience} on why ${name} is worth trying.`,
    conversion: `Drive ${audience} to purchase ${name} now.`,
    engagement: `Spark conversation and shares about ${name} among ${audience}.`,
    retention: `Re-engage existing ${name} customers with fresh use cases.`,
  };

  const goalTone: Record<CampaignGoal, string> = {
    awareness: 'Energetic, authentic, curiosity-driven',
    consideration: 'Informative, relatable, trustworthy',
    conversion: 'Confident, urgent, benefit-focused',
    engagement: 'Playful, conversational, community-driven',
    retention: 'Warm, nostalgic, value-additive',
  };

  const features = sellingPoints
    ? sellingPoints.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
    : ['Key benefit #1', 'Key benefit #2', 'Easy to use', 'Great value', 'Loved by customers'];

  const talkingPoints: TalkingPoint[] = features.map((f, i) => ({
    priority: i + 1,
    point: f.slice(0, 200),
    elaboration: `Explain how ${f} helps ${audience} and why it matters. Show, don't just tell.`,
  }));

  const hooks = [
    `I didn't believe ${name} would work until I tried it…`,
    `Stop scrolling if you've ever struggled with this…`,
    `Here's why ${name} is going viral right now`,
    `POV: you finally found the solution to ${desc.slice(0, 40) || 'your problem'}`,
    `Three reasons ${name} is worth every penny`,
  ].slice(0, 5);

  const ctas = [
    `Tap the link to shop ${name} now`,
    `Use code CREATOR10 for 10% off`,
    `Follow for more ${name} tips`,
    `Comment "INFO" and I'll send the link`,
  ].slice(0, 4);

  const kit: CreatorKit = {
    kitName: `${name} Creator Kit`,
    platform,
    campaignGoal: goal,
    estimatedDeliveryTime: delivery.deadline,
    brief: {
      overview: `Create an authentic, on-brand ${platform} video showcasing ${name} for ${audience}. The content should feel native to the platform and genuinely useful to viewers.`,
      objective: goalObjective[goal],
      keyMessage: `${name} solves a real problem for ${audience} — here's why it's worth it.`,
      toneStyle: goalTone[goal],
    },
    talkingPoints,
    productInfo: {
      productName: name,
      keyFeatures: features,
      usageInstructions: `Demonstrate ${name} being used naturally. Show the before/after or the problem/solution clearly.`,
      pricingContext: `Position ${name} as great value. Mention any current promo or discount if applicable.`,
    },
    dosAndDonts: {
      dos: [
        'Show the product in real use — authenticity beats polish',
        'Speak naturally as if talking to a friend',
        'Disclose the partnership clearly (#ad / #sponsored)',
        'Keep the first 3 seconds visually engaging',
        'Feature the product packaging or logo at least once',
      ],
      donts: [
        "Don't make claims you can't substantiate (medical, guaranteed results, etc.)",
        "Don't use competitor names or logos",
        "Don't read a script word-for-word — sound natural",
        "Don't use copyrighted music — use platform-native or royalty-free audio",
        "Don't forget the disclosure — it's legally required",
      ],
    },
    deliverySpecs: delivery,
    hookSuggestions: hooks,
    ctaOptions: ctas,
    visualGuidelines: {
      setting: `A relatable, real-life setting where ${name} would naturally be used (home, office, outdoors).`,
      lighting: 'Natural, well-lit. Avoid harsh shadows; face a window when possible.',
      wardrobe: 'Casual, on-brand, comfortable. Avoid logos of other brands.',
      props: [name, 'product packaging', 'phone or device showing the product/app'],
      background: 'Clean, uncluttered background that does not distract from the product.',
    },
    complianceNotes: {
      disclosureRequirements: [
        'Include #ad or #sponsored in the caption and verbally disclose in the video',
        'Follow platform-specific branded content tools (e.g., TikTok Branded Content toggle)',
        'Comply with FTC endorsement guidelines',
      ],
      restrictedClaims: [
        'No health or medical claims without substantiation',
        'No "guaranteed results" or absolute promises',
        'No comparative claims against named competitors',
      ],
      platformSpecificRules: [
        `${platform}: use original or licensed audio only`,
        `${platform}: keep within native length limits (${delivery.videoLength})`,
        `${platform}: avoid banned phrases and restricted hashtags`,
      ],
    },
  };

  return {
    kit,
    estimatedReach: estimateReach(platform, goal),
    estimatedEngagement: estimateEngagementRate(platform),
    creatorTips: [
      'Film multiple takes and pick the most natural one',
      'Hook viewers in the first 3 seconds — show the product or the problem immediately',
      'Keep it authentic; audiences can spot scripted ads',
      'Use trending platform audio where appropriate',
      'Reply to early comments to boost engagement',
    ],
  };
}
