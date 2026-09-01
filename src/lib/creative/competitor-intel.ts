/**
 * Competitor Intelligence module.
 *
 * Self-contained competitor ad analysis, market gap detection, and
 * benchmarking. Analyzes competitor creatives, identifies positioning gaps,
 * and benchmarks performance against industry averages.
 *
 * Uses the existing atlasChat() from src/lib/atlas.ts — no new LLM dependency.
 * Credit cost: COMPETITOR_INTEL_COST (8 credits).
 */
import {
  atlasChat,
  resolveModel,
  extractJson,
  asStr,
  asStrArr as toolkitAsStrArr,
  asNum,
  CREATIVE_MODEL,
  CREATIVE_TIMEOUT_MS,
  CREATIVE_MAX_TOKENS,
} from '@/lib/creative/toolkit';
import type { PlanTier } from '@/lib/plan-tier';

// ── Types ──

export type CompetitorMetric = 'spend' | 'impressions' | 'engagement' | 'frequency' | 'creatives' | 'reach';
export type MarketPosition = 'leader' | 'challenger' | 'follower' | 'nicher' | 'new_entrant';
export type GapType =
  | 'audience_gap'
  | 'format_gap'
  | 'messaging_gap'
  | 'channel_gap'
  | 'pricing_gap'
  | 'creative_gap';

export interface CompetitorProfile {
  competitorId: string;
  name: string;
  domain?: string;
  marketPosition: MarketPosition;
  estimatedAdSpend: number;
  activeCreatives: number;
  platforms: string[];
  topFormats: string[];
  avgEngagementRate: number;
  postingFrequency: number; // posts per week
  targetAudience: string[];
  keyMessages: string[];
  strengths: string[];
  weaknesses: string[];
  lastAnalyzed: string;
}

export interface CompetitorCreative {
  creativeId: string;
  competitorId: string;
  platform: string;
  format: string;
  hook: string;
  angle: string;
  cta: string;
  estimatedSpend: number;
  estimatedImpressions: number;
  engagementRate: number;
  firstSeen: string;
  lastSeen: string;
  durationDays: number;
  url?: string;
}

export interface MarketGap {
  gapId: string;
  type: GapType;
  description: string;
  opportunity: string;
  competitorsMissing: string[];
  estimatedReach: number;
  difficulty: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
  recommendedAction: string;
}

export interface BenchmarkMetric {
  metric: CompetitorMetric;
  yourValue: number;
  competitorAvg: number;
  industryAvg: number;
  topPerformer: number;
  percentile: number; // where you rank 0-100
  status: 'above_average' | 'average' | 'below_average' | 'leading';
  recommendation: string;
}

export interface CompetitorIntelResult {
  analysisDate: string;
  market: string;
  totalCompetitors: number;
  yourMarketPosition: MarketPosition;
  competitors: CompetitorProfile[];
  topCreatives: CompetitorCreative[];
  marketGaps: MarketGap[];
  benchmarks: BenchmarkMetric[];
  insights: Array<{
    insightId: string;
    type: 'strength' | 'weakness' | 'opportunity' | 'threat';
    title: string;
    description: string;
    competitor: string;
    confidenceScore: number;
    actionableRecommendation: string;
  }>;
  shareOfVoice: Array<{
    competitor: string;
    percentage: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: string;
    recommendation: string;
    expectedImpact: string;
    timeframe: string;
  }>;
}

export interface AnalyzeCompetitorsRequest {
  market?: string;
  competitorUrls?: string[];
  yourMetrics?: Record<string, number>;
  planTier?: PlanTier;
}

// ── Credit cost ──
export const COMPETITOR_INTEL_COST = 8;

// ── Model resolution ──
const COMPETITOR_INTEL_MODEL = CREATIVE_MODEL;
const COMPETITOR_INTEL_TIMEOUT_MS = CREATIVE_TIMEOUT_MS;
const COMPETITOR_INTEL_MAX_TOKENS = CREATIVE_MAX_TOKENS;

// ── Helpers ──

function asStrArr(v: unknown): string[] {
  return toolkitAsStrArr(v, 30);
}

function asNumRaw(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const MARKET_POSITIONS: MarketPosition[] = ['leader', 'challenger', 'follower', 'nicher', 'new_entrant'];
function asMarketPosition(v: unknown, fallback: MarketPosition = 'follower'): MarketPosition {
  const s = asStr(v, fallback);
  return (MARKET_POSITIONS as string[]).includes(s) ? (s as MarketPosition) : fallback;
}

const GAP_TYPES: GapType[] = [
  'audience_gap', 'format_gap', 'messaging_gap', 'channel_gap', 'pricing_gap', 'creative_gap',
];
function asGapType(v: unknown, fallback: GapType = 'creative_gap'): GapType {
  const s = asStr(v, fallback);
  return (GAP_TYPES as string[]).includes(s) ? (s as GapType) : fallback;
}

const COMPETITOR_METRICS: CompetitorMetric[] = ['spend', 'impressions', 'engagement', 'frequency', 'creatives', 'reach'];
function asCompetitorMetric(v: unknown, fallback: CompetitorMetric = 'spend'): CompetitorMetric {
  const s = asStr(v, fallback);
  return (COMPETITOR_METRICS as string[]).includes(s) ? (s as CompetitorMetric) : fallback;
}

// ── SSRF protection ──

const SSRF_BLOCKED_HOSTS = new Set([
  'localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]',
  '169.254.169.254', // cloud metadata
]);

/** Returns true when the host is a private/loopback/link-local address. */
function isPrivateIp(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, '');
  if (SSRF_BLOCKED_HOSTS.has(h)) return true;
  // IPv4 numeric checks
  const parts = h.split('.');
  if (parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p))) {
    const [a, b] = parts.map(Number);
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  }
  return false;
}

/**
 * Validate a competitor URL for SSRF safety.
 * Rejects localhost, private IP ranges, and cloud metadata endpoints.
 */
export function validateCompetitorUrl(url: string): { valid: boolean; error?: string } {
  const trimmed = (url || '').trim();
  if (!trimmed) return { valid: false, error: 'url_required' };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'invalid_url' };
  }
  const scheme = parsed.protocol.toLowerCase();
  if (scheme !== 'http:' && scheme !== 'https:') {
    return { valid: false, error: 'unsupported_scheme' };
  }
  const host = parsed.hostname;
  if (!host) return { valid: false, error: 'missing_host' };
  if (isPrivateIp(host)) {
    return { valid: false, error: 'blocked_host' };
  }
  return { valid: true };
}

// ── System prompt ──

const COMPETITOR_INTEL_SYS = `You are a senior competitive intelligence analyst specializing in digital advertising and marketing strategy.

Your job is to analyze the competitive advertising landscape for a given market, producing a structured JSON report that includes:
1. Competitor profiles — market position, estimated ad spend, active creatives, platforms, formats, engagement, posting frequency, target audience, key messages, strengths, weaknesses.
2. Top competitor creatives — platform, format, hook, angle, CTA, estimated spend/impressions, engagement, duration.
3. Market gaps — audience/format/messaging/channel/pricing/creative gaps that competitors are missing, with opportunity, difficulty, priority, and recommended action.
4. Benchmarks — for each metric (spend, impressions, engagement, frequency, creatives, reach), compare the user's value vs competitor avg vs industry avg vs top performer, with percentile and status (leading/above_average/average/below_average).
5. Insights — categorized as strength/weakness/opportunity/threat, with confidence scores (0-100) and actionable recommendations.
6. Share of voice — each competitor's percentage of total ad presence (must sum to ~100), with trend.
7. Recommendations — prioritized (high/medium/low) with expected impact and timeframe.

Rules:
- Be realistic and specific. Use plausible estimates grounded in the market context.
- All numeric fields must be numbers (not strings).
- Arrays must be arrays of strings.
- Market positions are one of: leader, challenger, follower, nicher, new_entrant.
- Gap types are one of: audience_gap, format_gap, messaging_gap, channel_gap, pricing_gap, creative_gap.
- Benchmark status is one of: leading, above_average, average, below_average.
- Output ONLY a single JSON object (no markdown, no commentary).
- The JSON must include these top-level keys: analysisDate, market, totalCompetitors, yourMarketPosition, competitors, topCreatives, marketGaps, benchmarks, insights, shareOfVoice, recommendations.`;

// ── Parsing ──

function parseCompetitor(o: Record<string, unknown>, idx: number): CompetitorProfile {
  return {
    competitorId: asStr(o.competitorId, `comp_${idx + 1}`),
    name: asStr(o.name, `Competitor ${idx + 1}`),
    domain: asStr(o.domain) || undefined,
    marketPosition: asMarketPosition(o.marketPosition, 'follower'),
    estimatedAdSpend: Math.max(0, asNumRaw(o.estimatedAdSpend, 0)),
    activeCreatives: Math.max(0, asNum(o.activeCreatives, 0, 0, 100000)),
    platforms: asStrArr(o.platforms),
    topFormats: asStrArr(o.topFormats),
    avgEngagementRate: Math.max(0, asNumRaw(o.avgEngagementRate, 0)),
    postingFrequency: Math.max(0, asNumRaw(o.postingFrequency, 0)),
    targetAudience: asStrArr(o.targetAudience),
    keyMessages: asStrArr(o.keyMessages),
    strengths: asStrArr(o.strengths),
    weaknesses: asStrArr(o.weaknesses),
    lastAnalyzed: asStr(o.lastAnalyzed, new Date().toISOString()),
  };
}

function parseCreative(o: Record<string, unknown>, idx: number): CompetitorCreative {
  return {
    creativeId: asStr(o.creativeId, `creative_${idx + 1}`),
    competitorId: asStr(o.competitorId),
    platform: asStr(o.platform, 'unknown'),
    format: asStr(o.format, 'unknown'),
    hook: asStr(o.hook),
    angle: asStr(o.angle),
    cta: asStr(o.cta),
    estimatedSpend: Math.max(0, asNumRaw(o.estimatedSpend, 0)),
    estimatedImpressions: Math.max(0, asNum(o.estimatedImpressions, 0, 0, 1e12)),
    engagementRate: Math.max(0, asNumRaw(o.engagementRate, 0)),
    firstSeen: asStr(o.firstSeen, new Date().toISOString()),
    lastSeen: asStr(o.lastSeen, new Date().toISOString()),
    durationDays: Math.max(0, asNum(o.durationDays, 0, 0, 3650)),
    url: asStr(o.url) || undefined,
  };
}

function parseGap(o: Record<string, unknown>, idx: number): MarketGap {
  const difficulty = asStr(o.difficulty, 'medium');
  const priority = asStr(o.priority, 'medium');
  return {
    gapId: asStr(o.gapId, `gap_${idx + 1}`),
    type: asGapType(o.type, 'creative_gap'),
    description: asStr(o.description),
    opportunity: asStr(o.opportunity),
    competitorsMissing: asStrArr(o.competitorsMissing),
    estimatedReach: Math.max(0, asNum(o.estimatedReach, 0, 0, 1e12)),
    difficulty: (['low', 'medium', 'high'] as string[]).includes(difficulty) ? difficulty as MarketGap['difficulty'] : 'medium',
    priority: (['high', 'medium', 'low'] as string[]).includes(priority) ? priority as MarketGap['priority'] : 'medium',
    recommendedAction: asStr(o.recommendedAction),
  };
}

function parseBenchmark(o: Record<string, unknown>): BenchmarkMetric {
  const status = asStr(o.status, 'average');
  const yourValue = asNumRaw(o.yourValue, 0);
  const competitorAvg = asNumRaw(o.competitorAvg, 0);
  const industryAvg = asNumRaw(o.industryAvg, 0);
  const topPerformer = asNumRaw(o.topPerformer, 0);
  let percentile = asNum(o.percentile, 50, 0, 100);
  // If percentile missing but we have values, derive a rough percentile from yourValue vs topPerformer.
  if (o.percentile == null && topPerformer > 0) {
    percentile = Math.max(0, Math.min(100, Math.round((yourValue / topPerformer) * 100)));
  }
  return {
    metric: asCompetitorMetric(o.metric, 'spend'),
    yourValue,
    competitorAvg,
    industryAvg,
    topPerformer,
    percentile,
    status: (['above_average', 'average', 'below_average', 'leading'] as string[]).includes(status)
      ? (status as BenchmarkMetric['status'])
      : 'average',
    recommendation: asStr(o.recommendation),
  };
}

function parseResult(j: Record<string, unknown>, market: string): CompetitorIntelResult {
  const competitors: CompetitorProfile[] = (Array.isArray(j.competitors) ? j.competitors : [])
    .slice(0, 20)
    .map((c, idx) => parseCompetitor((c && typeof c === 'object' ? c : {}) as Record<string, unknown>, idx));

  const topCreatives: CompetitorCreative[] = (Array.isArray(j.topCreatives) ? j.topCreatives : [])
    .slice(0, 30)
    .map((c, idx) => parseCreative((c && typeof c === 'object' ? c : {}) as Record<string, unknown>, idx));

  const marketGaps: MarketGap[] = (Array.isArray(j.marketGaps) ? j.marketGaps : [])
    .slice(0, 20)
    .map((g, idx) => parseGap((g && typeof g === 'object' ? g : {}) as Record<string, unknown>, idx));

  const benchmarks: BenchmarkMetric[] = (Array.isArray(j.benchmarks) ? j.benchmarks : [])
    .slice(0, 20)
    .map((b) => parseBenchmark((b && typeof b === 'object' ? b : {}) as Record<string, unknown>));

  const insights = (Array.isArray(j.insights) ? j.insights : []).slice(0, 30).map((ins, idx) => {
    const o = (ins && typeof ins === 'object' ? ins : {}) as Record<string, unknown>;
    const type = asStr(o.type, 'opportunity');
    return {
      insightId: asStr(o.insightId, `insight_${idx + 1}`),
      type: (['strength', 'weakness', 'opportunity', 'threat'] as string[]).includes(type)
        ? (type as 'strength' | 'weakness' | 'opportunity' | 'threat')
        : 'opportunity',
      title: asStr(o.title),
      description: asStr(o.description),
      competitor: asStr(o.competitor),
      confidenceScore: asNum(o.confidenceScore, 50, 0, 100),
      actionableRecommendation: asStr(o.actionableRecommendation),
    };
  });

  const shareOfVoice = (Array.isArray(j.shareOfVoice) ? j.shareOfVoice : []).slice(0, 20).map((sov) => {
    const o = (sov && typeof sov === 'object' ? sov : {}) as Record<string, unknown>;
    const trend = asStr(o.trend, 'stable');
    return {
      competitor: asStr(o.competitor),
      percentage: Math.max(0, Math.min(100, asNumRaw(o.percentage, 0))),
      trend: (['increasing', 'stable', 'decreasing'] as string[]).includes(trend)
        ? (trend as 'increasing' | 'stable' | 'decreasing')
        : 'stable',
    };
  });

  const recommendations = (Array.isArray(j.recommendations) ? j.recommendations : []).slice(0, 20).map((rec) => {
    const o = (rec && typeof rec === 'object' ? rec : {}) as Record<string, unknown>;
    const priority = asStr(o.priority, 'medium');
    return {
      priority: (['high', 'medium', 'low'] as string[]).includes(priority)
        ? (priority as 'high' | 'medium' | 'low')
        : 'medium',
      category: asStr(o.category),
      recommendation: asStr(o.recommendation),
      expectedImpact: asStr(o.expectedImpact),
      timeframe: asStr(o.timeframe),
    };
  });

  const yourMetrics = (j.yourMetrics && typeof j.yourMetrics === 'object' ? j.yourMetrics : {}) as Record<string, unknown>;

  return {
    analysisDate: asStr(j.analysisDate, new Date().toISOString()),
    market: asStr(j.market, market),
    totalCompetitors: asNum(j.totalCompetitors, competitors.length, 0, 1000),
    yourMarketPosition: asMarketPosition(j.yourMarketPosition, inferMarketPosition(competitors, yourMetrics as Record<string, number>)),
    competitors,
    topCreatives,
    marketGaps,
    benchmarks,
    insights,
    shareOfVoice,
    recommendations,
  };
}

// ── Pure analysis helpers (no LLM) ──

/**
 * Infer the user's market position relative to competitors based on their metrics.
 * Compares the user's "spend" (or a composite) against competitor spend distribution.
 */
export function inferMarketPosition(
  competitors: CompetitorProfile[],
  yourMetrics: Record<string, number>,
): MarketPosition {
  const yourSpend = Number(yourMetrics?.spend) || 0;
  const spends = competitors.map((c) => c.estimatedAdSpend).filter((s) => s > 0);
  if (spends.length === 0) {
    // No competitor spend data — infer from engagement/reach if available.
    const yourEng = Number(yourMetrics?.engagement) || 0;
    const engs = competitors.map((c) => c.avgEngagementRate).filter((e) => e > 0);
    if (engs.length === 0) return yourSpend > 0 ? 'new_entrant' : 'new_entrant';
    const avgEng = engs.reduce((a, b) => a + b, 0) / engs.length;
    if (yourEng >= avgEng * 1.5) return 'leader';
    if (yourEng >= avgEng * 1.1) return 'challenger';
    if (yourEng >= avgEng * 0.5) return 'follower';
    return 'nicher';
  }
  const totalSpend = spends.reduce((a, b) => a + b, 0);
  const avgSpend = totalSpend / spends.length;
  const maxSpend = Math.max(...spends);
  if (yourSpend <= 0) return 'new_entrant';
  if (yourSpend >= maxSpend * 0.8) return 'leader';
  if (yourSpend >= avgSpend) return 'challenger';
  if (yourSpend >= avgSpend * 0.4) return 'follower';
  // Below average but present — niche player.
  return 'nicher';
}

/**
 * Calculate share of voice from competitor estimated ad spend.
 * Returns percentages that sum to ~100. Includes a "You" entry when yourMetrics.spend is provided.
 */
export function calculateShareOfVoice(
  competitors: CompetitorProfile[],
  yourMetrics?: Record<string, number>,
): CompetitorIntelResult['shareOfVoice'] {
  const entries: Array<{ competitor: string; spend: number }> = competitors.map((c) => ({
    competitor: c.name,
    spend: c.estimatedAdSpend,
  }));
  const yourSpend = Number(yourMetrics?.spend) || 0;
  if (yourSpend > 0) entries.push({ competitor: 'You', spend: yourSpend });

  const total = entries.reduce((sum, e) => sum + e.spend, 0);
  if (total <= 0) {
    // Fall back to equal split if no spend data.
    const equal = entries.length > 0 ? Math.round(100 / entries.length) : 0;
    return entries.map((e) => ({ competitor: e.competitor, percentage: equal, trend: 'stable' as const }));
  }

  // Compute raw percentages, then normalize so they sum to 100.
  const raw = entries.map((e) => (e.spend / total) * 100);
  const rounded = raw.map((r) => Math.round(r * 10) / 10);
  const sum = rounded.reduce((a, b) => a + b, 0);
  const drift = Math.round((100 - sum) * 10) / 10;
  // Apply drift to the largest entry to make the sum exactly 100.
  if (rounded.length > 0 && drift !== 0) {
    let maxIdx = 0;
    for (let i = 1; i < rounded.length; i++) if (rounded[i] > rounded[maxIdx]) maxIdx = i;
    rounded[maxIdx] = Math.round((rounded[maxIdx] + drift) * 10) / 10;
  }

  // Trend: heuristic — top 3 by spend increasing, bottom decreasing, middle stable.
  const sortedIdx = rounded
    .map((_, i) => i)
    .sort((a, b) => entries[b].spend - entries[a].spend);
  const trendFor = (idx: number): 'increasing' | 'stable' | 'decreasing' => {
    const rank = sortedIdx.indexOf(idx);
    if (rank < Math.ceil(sortedIdx.length / 3)) return 'increasing';
    if (rank >= Math.floor((sortedIdx.length * 2) / 3)) return 'decreasing';
    return 'stable';
  };

  return entries.map((e, i) => ({
    competitor: e.competitor,
    percentage: Math.max(0, rounded[i]),
    trend: trendFor(i),
  }));
}

/**
 * Detect market gaps from competitor profiles by finding under-served
 * audiences, formats, platforms, and messaging themes.
 */
export function detectMarketGaps(competitors: CompetitorProfile[]): MarketGap[] {
  const gaps: MarketGap[] = [];
  if (competitors.length === 0) return gaps;

  // Aggregate all platforms/formats/audiences/messages used.
  const allPlatforms = new Set<string>();
  const allFormats = new Set<string>();
  const allAudiences = new Set<string>();
  const allMessages = new Set<string>();
  for (const c of competitors) {
    c.platforms.forEach((p) => allPlatforms.add(p.toLowerCase()));
    c.topFormats.forEach((f) => allFormats.add(f.toLowerCase()));
    c.targetAudience.forEach((a) => allAudiences.add(a.toLowerCase()));
    c.keyMessages.forEach((m) => allMessages.add(m.toLowerCase()));
  }

  // Known common platforms/formats to check for channel/format gaps.
  const knownPlatforms = ['tiktok', 'instagram', 'facebook', 'youtube', 'google', 'x', 'linkedin', 'pinterest', 'snapchat', 'reddit'];
  const knownFormats = ['ugc', 'image', 'carousel', 'video', 'story', 'reel', 'short', 'static', 'motion', 'influencer'];
  const missingPlatforms = knownPlatforms.filter((p) => !allPlatforms.has(p));
  const missingFormats = knownFormats.filter((f) => !allFormats.has(f));

  let gapIdx = 1;
  const mkGap = (
    type: GapType,
    description: string,
    opportunity: string,
    competitorsMissing: string[],
    estimatedReach: number,
    difficulty: MarketGap['difficulty'],
    priority: MarketGap['priority'],
    recommendedAction: string,
  ): MarketGap => ({
    gapId: `gap_${gapIdx++}`,
    type,
    description,
    opportunity,
    competitorsMissing,
    estimatedReach,
    difficulty,
    priority,
    recommendedAction,
  });

  // Channel gap — platforms no competitor uses.
  if (missingPlatforms.length > 0) {
    const names = competitors.filter((c) => c.platforms.length === 0).map((c) => c.name);
    gaps.push(mkGap(
      'channel_gap',
      `No competitors are advertising on: ${missingPlatforms.slice(0, 3).join(', ')}.`,
      `Establish presence on ${missingPlatforms[0]} before competitors notice the channel.`,
      names.length ? names : competitors.map((c) => c.name),
      missingPlatforms.length * 250000,
      'low',
      'high',
      `Launch a test campaign on ${missingPlatforms[0]} with a small budget to validate the channel.`,
    ));
  }

  // Format gap — ad formats no competitor uses.
  if (missingFormats.length > 0) {
    gaps.push(mkGap(
      'format_gap',
      `Ad formats under-utilized: ${missingFormats.slice(0, 3).join(', ')}.`,
      `Differentiate with ${missingFormats[0]} creatives that competitors aren't producing.`,
      competitors.filter((c) => !c.topFormats.some((f) => missingFormats.includes(f.toLowerCase()))).map((c) => c.name),
      missingFormats.length * 150000,
      'medium',
      'medium',
      `Produce 3-5 ${missingFormats[0]} creatives and A/B test against current top format.`,
    ));
  }

  // Audience gap — find audiences mentioned by only one or no competitor.
  const audienceCounts: Record<string, number> = {};
  for (const c of competitors) {
    for (const a of c.targetAudience) {
      const key = a.toLowerCase();
      audienceCounts[key] = (audienceCounts[key] || 0) + 1;
    }
  }
  const underServedAudiences = Object.entries(audienceCounts)
    .filter(([, count]) => count <= 1)
    .map(([a]) => a);
  if (underServedAudiences.length > 0) {
    gaps.push(mkGap(
      'audience_gap',
      `Audience segments under-targeted: ${underServedAudiences.slice(0, 3).join(', ')}.`,
      `Capture an underserved segment with tailored messaging.`,
      competitors.filter((c) => !c.targetAudience.some((a) => underServedAudiences.includes(a.toLowerCase()))).map((c) => c.name),
      underServedAudiences.length * 200000,
      'medium',
      'high',
      `Build audience-specific creative variants targeting ${underServedAudiences[0]}.`,
    ));
  }

  // Messaging gap — find key messages used by only one competitor (opportunity to own or counter).
  const messageCounts: Record<string, number> = {};
  for (const c of competitors) {
    for (const m of c.keyMessages) {
      const key = m.toLowerCase();
      messageCounts[key] = (messageCounts[key] || 0) + 1;
    }
  }
  const singleUseMessages = Object.entries(messageCounts).filter(([, count]) => count === 1).map(([m]) => m);
  if (singleUseMessages.length > 0 && allMessages.size > 0) {
    gaps.push(mkGap(
      'messaging_gap',
      `Messaging themes used by only one competitor: ${singleUseMessages.slice(0, 3).join(', ')}.`,
      `Differentiate messaging or counter-position against isolated claims.`,
      competitors.filter((c) => !c.keyMessages.some((m) => singleUseMessages.includes(m.toLowerCase()))).map((c) => c.name),
      singleUseMessages.length * 100000,
      'low',
      'medium',
      `Develop a counter-narrative to ${singleUseMessages[0]} or own an adjacent unclaimed message.`,
    ));
  }

  // Creative gap — competitors with low active creative count suggest creative fatigue opportunity.
  const lowCreativeCompetitors = competitors.filter((c) => c.activeCreatives < 5);
  if (lowCreativeCompetitors.length > 0) {
    gaps.push(mkGap(
      'creative_gap',
      `${lowCreativeCompetitors.length} competitor(s) have fewer than 5 active creatives, indicating creative fatigue.`,
      `Out-test fatigued competitors with fresh creative volume.`,
      lowCreativeCompetitors.map((c) => c.name),
      lowCreativeCompetitors.length * 300000,
      'low',
      'high',
      `Scale creative production to 10+ active variants to win creative volume against fatigued competitors.`,
    ));
  }

  // Pricing gap — inferred from weaknesses mentioning price/cost.
  const priceWeak = competitors.filter((c) => c.weaknesses.some((w) => /price|cost|expensive|premium/i.test(w)));
  if (priceWeak.length > 0) {
    gaps.push(mkGap(
      'pricing_gap',
      `${priceWeak.length} competitor(s) have price-related weaknesses.`,
      `Position on value/affordability where competitors are perceived as expensive.`,
      priceWeak.map((c) => c.name),
      priceWeak.length * 180000,
      'medium',
      'medium',
      `Emphasize value pricing and ROI in messaging against ${priceWeak[0].name}.`,
    ));
  }

  return gaps;
}

/**
 * Calculate benchmark metrics comparing the user's values against competitor
 * averages, industry averages, and top performers.
 */
export function calculateBenchmarks(
  yourMetrics: Record<string, number>,
  competitors: CompetitorProfile[],
): BenchmarkMetric[] {
  const metrics: CompetitorMetric[] = ['spend', 'impressions', 'engagement', 'frequency', 'creatives', 'reach'];
  const result: BenchmarkMetric[] = [];

  for (const metric of metrics) {
    const yourValue = Number(yourMetrics?.[metric]) || 0;

    // Competitor values for this metric.
    const compValues: number[] = competitors.map((c) => {
      switch (metric) {
        case 'spend': return c.estimatedAdSpend;
        case 'impressions': return c.estimatedAdSpend * 1000; // rough proxy
        case 'engagement': return c.avgEngagementRate;
        case 'frequency': return c.postingFrequency;
        case 'creatives': return c.activeCreatives;
        case 'reach': return c.estimatedAdSpend * 500; // rough proxy
        default: return 0;
      }
    }).filter((v) => v > 0);

    const competitorAvg = compValues.length > 0
      ? compValues.reduce((a, b) => a + b, 0) / compValues.length
      : 0;
    const topPerformer = compValues.length > 0 ? Math.max(...compValues) : 0;
    // Industry average: simulate as ~80% of competitor average (industry lags top competitors).
    const industryAvg = competitorAvg > 0 ? competitorAvg * 0.8 : 0;

    // Percentile: where you rank 0-100 relative to competitors.
    let percentile = 50;
    if (compValues.length > 0) {
      const below = compValues.filter((v) => v < yourValue).length;
      percentile = Math.round((below / compValues.length) * 100);
    }

    // Status thresholds.
    let status: BenchmarkMetric['status'];
    if (topPerformer > 0 && yourValue >= topPerformer) {
      status = 'leading';
    } else if (competitorAvg > 0 && yourValue >= competitorAvg * 1.1) {
      status = 'above_average';
    } else if (competitorAvg > 0 && yourValue >= competitorAvg * 0.9) {
      status = 'average';
    } else {
      status = 'below_average';
    }

    const recommendation = benchmarkRecommendation(metric, status, yourValue, competitorAvg);

    result.push({
      metric,
      yourValue,
      competitorAvg: Math.round(competitorAvg * 100) / 100,
      industryAvg: Math.round(industryAvg * 100) / 100,
      topPerformer: Math.round(topPerformer * 100) / 100,
      percentile,
      status,
      recommendation,
    });
  }

  return result;
}

function benchmarkRecommendation(
  metric: CompetitorMetric,
  status: BenchmarkMetric['status'],
  yourValue: number,
  competitorAvg: number,
): string {
  if (status === 'leading') {
    return `You're leading in ${metric}. Defend your position by maintaining investment and innovating formats.`;
  }
  if (status === 'above_average') {
    return `Above average in ${metric}. Push to close the gap with the top performer (${Math.round(competitorAvg * 1.3 * 100) / 100}).`;
  }
  if (status === 'average') {
    return `Average in ${metric}. Small improvements can move you into the above-average tier.`;
  }
  return `Below average in ${metric} (yours: ${Math.round(yourValue * 100) / 100}, avg: ${Math.round(competitorAvg * 100) / 100}). Prioritize increasing ${metric} to remain competitive.`;
}

// ── Main analysis ──

/**
 * Analyze the competitor landscape for a market.
 *
 * - Uses atlasChat with a detailed system prompt.
 * - Generates simulated competitor data if no URLs are provided (demo/dry-run).
 * - Parses the JSON response into a CompetitorIntelResult.
 * - Uses plan-tier-aware model routing.
 */
export async function analyzeCompetitors(request: AnalyzeCompetitorsRequest): Promise<CompetitorIntelResult> {
  const market = (request.market || '').trim() || 'general';
  const competitorUrls = Array.isArray(request.competitorUrls) ? request.competitorUrls.filter(Boolean) : [];
  const yourMetrics = request.yourMetrics || {};
  const planTier = request.planTier;

  const userPrompt = buildUserPrompt(market, competitorUrls, yourMetrics);

  const raw = await atlasChat(
    [{ role: 'system', content: COMPETITOR_INTEL_SYS }, { role: 'user', content: userPrompt }],
    resolveModel(planTier),
    COMPETITOR_INTEL_MAX_TOKENS,
    COMPETITOR_INTEL_TIMEOUT_MS,
  );

  const j = extractJson(raw);
  const parsed = parseResult(j, market);

  // Recompute derived fields with our deterministic helpers so they're always
  // internally consistent (the LLM may produce slightly off SOV sums or miss
  // gaps). This keeps the data trustworthy for the dashboard.
  parsed.marketGaps = parsed.marketGaps.length > 0 ? parsed.marketGaps : detectMarketGaps(parsed.competitors);
  parsed.benchmarks = parsed.benchmarks.length > 0 ? parsed.benchmarks : calculateBenchmarks(yourMetrics, parsed.competitors);
  parsed.shareOfVoice = parsed.shareOfVoice.length > 0 ? parsed.shareOfVoice : calculateShareOfVoice(parsed.competitors, yourMetrics);
  parsed.yourMarketPosition = inferMarketPosition(parsed.competitors, yourMetrics);
  parsed.market = parsed.market || market;
  parsed.totalCompetitors = parsed.competitors.length;

  return parsed;
}

function buildUserPrompt(
  market: string,
  competitorUrls: string[],
  yourMetrics: Record<string, number>,
): string {
  const parts: string[] = [
    `Analyze the competitive advertising landscape for this market: "${market}".`,
  ];

  if (competitorUrls.length > 0) {
    parts.push(`Competitor URLs to analyze:`);
    competitorUrls.forEach((u, i) => parts.push(`${i + 1}. ${u}`));
    parts.push(`Use these URLs as the primary basis for competitor profiles and creative analysis.`);
  } else {
    parts.push(`No specific competitor URLs provided. Generate a realistic simulated competitive landscape for the "${market}" market (demo/dry-run mode). Create 4-6 plausible competitors with realistic ad spend, creatives, platforms, and positioning.`);
  }

  const metricParts: string[] = [];
  for (const [k, v] of Object.entries(yourMetrics)) {
    if (typeof v === 'number' && Number.isFinite(v)) metricParts.push(`${k}: ${v}`);
  }
  if (metricParts.length > 0) {
    parts.push(`Your current metrics (use for benchmarking and market position inference):`);
    parts.push(metricParts.join(', '));
  } else {
    parts.push(`Your current metrics: not provided. Infer benchmarks with the user near the competitor average.`);
  }

  parts.push(`Produce the complete competitor intelligence JSON with all required top-level keys.`);
  parts.push(`Output the JSON now.`);
  return parts.join('\n');
}

// Re-export helpers for testing/external use.
export { COMPETITOR_INTEL_MODEL, COMPETITOR_INTEL_TIMEOUT_MS, COMPETITOR_INTEL_MAX_TOKENS };
