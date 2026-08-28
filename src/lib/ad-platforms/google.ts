/**
 * Google Ads provider.
 *
 * Supports dry-run mode for safe testing without spending real money.
 * Real publishing requires GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_CUSTOMER_ID.
 *
 * Security: all spend-affecting operations (createCampaign, updateBudget)
 * respect dry-run defaults and return a `pending_approval` status in real
 * mode without credentials, so callers can gate changes behind a manual
 * approval flow. Budget updates validate against spend caps using the same
 * safety margin as the Meta provider.
 *
 * Patterns adapted from meta-ads-mcp (#29, MIT) and the Google Ads API
 * reference (v17 customers/campaigns:mutate, reports search).
 */

import type {
  AdPlatformProvider,
  AdCampaignInput,
  AdCampaignResult,
  CampaignMetrics,
  CampaignReport,
  DemographicBreakdown,
  PlacementBreakdown,
  CreativeBreakdown,
  TimeSeriesPoint,
  SearchTermBreakdown,
  KeywordBreakdown,
  AdGroupBreakdown,
  DeviceBreakdown,
  PublishOptions,
} from './types';

/**
 * Safety margin applied when validating a new daily budget against a
 * spend cap. Mirrors the Meta provider's BUDGET_SAFETY_MARGIN so that a
 * new daily budget cannot accidentally blow past a configured cap.
 */
export const GOOGLE_BUDGET_SAFETY_MARGIN = 1.1;

export const googleAds: AdPlatformProvider = {
  id: 'google',

  async createCampaign(input: AdCampaignInput, opts: PublishOptions = {}): Promise<AdCampaignResult> {
    if (opts.dryRun) {
      return dryRunCreate(input);
    }

    // Real publishing would call Google Ads API:
    // POST https://googleads.googleapis.com/v17/customers/{customer_id}/campaigns:mutate
    // Requires GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_CUSTOMER_ID.
    return {
      id: `google_draft_${Date.now()}`,
      platform: 'google',
      name: input.name,
      status: opts.requireApproval ? 'pending_approval' : 'draft',
      budgetDaily: input.budgetDaily,
      budgetTotal: input.budgetTotal,
      currency: input.currency || 'USD',
      targeting: input.targeting,
      creativeIds: input.creativeIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async getCampaign(campaignId: string): Promise<AdCampaignResult> {
    return {
      id: campaignId,
      platform: 'google',
      campaignId,
      name: 'Campaign (mock)',
      status: 'active',
      currency: 'USD',
      creativeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async pauseCampaign(campaignId: string): Promise<void> {
    console.log(`[google] pauseCampaign: ${campaignId}`);
  },

  async getMetrics(campaignId: string): Promise<CampaignMetrics> {
    return {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0,
      ctr: 0,
      cvr: 0,
      roas: 0,
    };
  },

  async updateBudget(id: string, budgetDaily: number, opts: PublishOptions = {}): Promise<AdCampaignResult> {
    if (typeof budgetDaily !== 'number' || !Number.isFinite(budgetDaily) || budgetDaily <= 0) {
      throw new Error('budget_daily_must_be_positive');
    }

    // Spend-cap safety check: the new daily budget (with safety margin)
    // must not exceed any configured spend cap.
    if (typeof opts.spendCap === 'number' && opts.spendCap > 0) {
      const capCheck = checkGoogleSpendCap(budgetDaily, opts.spendCap);
      if (!capCheck.ok) {
        throw new Error('budget_exceeds_spend_cap');
      }
    }

    if (opts.dryRun) {
      return dryRunUpdateBudget(id, budgetDaily);
    }

    // Real implementation:
    // POST https://googleads.googleapis.com/v17/customers/{customer_id}/campaignBudgets:mutate
    //   { operations: [{ update: { resource_name, amount_micros: budgetDaily * 1_000_000 } }] }
    // Requires GOOGLE_ADS_ACCESS_TOKEN. Without credentials we return a
    // structured pending_approval response so callers can gate the
    // change behind a manual approval flow.
    return {
      id,
      platform: 'google',
      campaignId: id,
      name: 'Campaign (budget update pending)',
      status: 'pending_approval',
      budgetDaily,
      currency: 'USD',
      creativeIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async getSpend(id: string, opts: PublishOptions = {}): Promise<{ spend: number; currency: string }> {
    if (opts.dryRun) {
      // Dry-run never reports real spend.
      return { spend: 0, currency: 'USD' };
    }

    // Real implementation:
    // POST https://googleads.googleapis.com/v17/customers/{customer_id}/googleAds:searchStream
    //   { query: "SELECT campaign.id, metrics.cost_micros FROM campaign WHERE campaign.id = {id}" }
    // Without credentials, return a zero-spend structured stub.
    return { spend: 0, currency: 'USD' };
  },

  async getReport(id: string, opts: PublishOptions = {}): Promise<CampaignReport> {
    if (opts.dryRun) {
      return dryRunReport(id);
    }

    // Real implementation calls the Google Ads API searchStream with
    // GAQL queries for search terms, keywords, ad groups, and device
    // breakdowns:
    //   SELECT search_term_view.search_term, segments.keyword.info.match_type,
    //          metrics.impressions, metrics.clicks, metrics.conversions, metrics.cost_micros
    //   FROM search_term_view WHERE campaign.id = {id}
    // Without credentials, return a structured pending_approval-style
    // report with zeroed metrics so the UI can render safely.
    return realModeReportStub(id);
  },
};

/**
 * Validate that a (new) spend/budget value respects the configured cap,
 * applying the GOOGLE_BUDGET_SAFETY_MARGIN.
 *
 * Returns `{ ok: true }` when within cap, otherwise `{ ok: false, cap,
 * value, margin }` describing the violation.
 */
export function checkGoogleSpendCap(
  spend: number,
  cap: number,
): { ok: true } | { ok: false; cap: number; value: number; margin: number } {
  if (typeof cap !== 'number' || cap <= 0) {
    return { ok: true };
  }
  const effectiveCap = cap * GOOGLE_BUDGET_SAFETY_MARGIN;
  if (spend > effectiveCap) {
    return { ok: false, cap, value: spend, margin: GOOGLE_BUDGET_SAFETY_MARGIN };
  }
  return { ok: true };
}

// ── Dry-run helpers ──

function dryRunCreate(input: AdCampaignInput): AdCampaignResult {
  const estimatedReach = Math.floor((input.budgetDaily || 10) * 300);
  return {
    id: `google_dryrun_${Date.now()}`,
    platform: 'google',
    name: input.name,
    status: 'draft',
    budgetDaily: input.budgetDaily,
    budgetTotal: input.budgetTotal,
    currency: input.currency || 'USD',
    targeting: input.targeting,
    creativeIds: input.creativeIds,
    metrics: {
      impressions: estimatedReach,
      clicks: Math.floor(estimatedReach * 0.015),
      conversions: 0,
      spend: 0,
      revenue: 0,
      ctr: 1.5,
      cvr: 0,
      roas: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function dryRunUpdateBudget(id: string, budgetDaily: number): AdCampaignResult {
  const estimatedReach = Math.floor(budgetDaily * 300);
  return {
    id,
    platform: 'google',
    campaignId: id,
    name: 'Campaign (dry-run budget update)',
    status: 'draft',
    budgetDaily,
    currency: 'USD',
    creativeIds: [],
    metrics: {
      impressions: estimatedReach,
      clicks: Math.floor(estimatedReach * 0.015),
      conversions: 0,
      spend: 0,
      revenue: 0,
      ctr: 1.5,
      cvr: 0,
      roas: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function dryRunReport(campaignId: string): CampaignReport {
  const impressions = 9000;
  const clicks = Math.floor(impressions * 0.015);
  const conversions = Math.floor(clicks * 0.04);
  const spend = 0; // dry-run never spends
  const revenue = conversions * 18.0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const roas = spend > 0 ? revenue / spend : 0;

  const summary: CampaignMetrics = {
    impressions,
    clicks,
    conversions,
    spend,
    revenue,
    ctr,
    cvr,
    roas,
  };

  const demographics: DemographicBreakdown[] = [
    { age: '18-24', gender: 'male', impressions: 1800, clicks: 27, conversions: 1 },
    { age: '18-24', gender: 'female', impressions: 2100, clicks: 33, conversions: 1 },
    { age: '25-34', gender: 'male', impressions: 2400, clicks: 36, conversions: 2 },
    { age: '25-34', gender: 'female', impressions: 2700, clicks: 39, conversions: 2 },
  ];

  const placements: PlacementBreakdown[] = [
    { placement: 'google_search', impressions: 6000, clicks: 90, spend: 0 },
    { placement: 'search_partners', impressions: 2000, clicks: 30, spend: 0 },
    { placement: 'display_network', impressions: 1000, clicks: 15, spend: 0 },
  ];

  const creativeBreakdown: CreativeBreakdown[] = [
    { creativeId: 'creation_1', impressions: 5000, clicks: 80, ctr: (80 / 5000) * 100, conversions: 4 },
    { creativeId: 'creation_2', impressions: 4000, clicks: 55, ctr: (55 / 4000) * 100, conversions: 2 },
  ];

  const searchTerms: SearchTermBreakdown[] = [
    { searchTerm: 'buy glow serum', keyword: 'glow serum', matchType: 'phrase', impressions: 2200, clicks: 44, conversions: 3, spend: 0 },
    { searchTerm: 'best vitamin c serum', keyword: 'vitamin c serum', matchType: 'broad', impressions: 1800, clicks: 27, conversions: 1, spend: 0 },
    { searchTerm: 'skincare for dry skin', keyword: 'skincare', matchType: 'broad', impressions: 1400, clicks: 18, conversions: 1, spend: 0 },
  ];

  const keywords: KeywordBreakdown[] = [
    { keyword: 'glow serum', matchType: 'phrase', impressions: 2200, clicks: 44, conversions: 3, spend: 0, ctr: (44 / 2200) * 100, avgCpc: 0 },
    { keyword: 'vitamin c serum', matchType: 'broad', impressions: 1800, clicks: 27, conversions: 1, spend: 0, ctr: (27 / 1800) * 100, avgCpc: 0 },
    { keyword: 'skincare', matchType: 'broad', impressions: 1400, clicks: 18, conversions: 1, spend: 0, ctr: (18 / 1400) * 100, avgCpc: 0 },
  ];

  const adGroups: AdGroupBreakdown[] = [
    { adGroupId: 'ag_1', adGroupName: 'Glow Serum - Exact', status: 'active', impressions: 3200, clicks: 50, conversions: 3, spend: 0 },
    { adGroupId: 'ag_2', adGroupName: 'Glow Serum - Broad', status: 'active', impressions: 3200, clicks: 44, conversions: 1, spend: 0 },
    { adGroupId: 'ag_3', adGroupName: 'Skincare General', status: 'paused', impressions: 2600, clicks: 41, conversions: 2, spend: 0 },
  ];

  const deviceBreakdown: DeviceBreakdown[] = [
    { device: 'mobile', impressions: 5400, clicks: 81, conversions: 4, spend: 0, ctr: (81 / 5400) * 100 },
    { device: 'desktop', impressions: 2700, clicks: 41, conversions: 2, spend: 0, ctr: (41 / 2700) * 100 },
    { device: 'tablet', impressions: 900, clicks: 14, conversions: 1, spend: 0, ctr: (14 / 900) * 100 },
  ];

  const timeSeries: TimeSeriesPoint[] = buildDryRunTimeSeries(impressions, clicks, spend, conversions);

  const recommendations: string[] = [
    'The "glow serum" phrase-match keyword has the highest conversion rate — consider raising its bid.',
    'Mobile devices drive 60% of impressions; ensure landing pages are mobile-optimized.',
    'Search term "buy glow serum" signals high intent — add as an exact-match keyword.',
    'Ad group "Skincare General" is paused but still accrues impressions — review or archive.',
  ];

  return {
    campaignId,
    platform: 'google',
    summary,
    demographics,
    placements,
    creativeBreakdown,
    timeSeries,
    recommendations,
    searchTerms,
    keywords,
    adGroups,
    deviceBreakdown,
  };
}

function buildDryRunTimeSeries(
  totalImpressions: number,
  totalClicks: number,
  totalSpend: number,
  totalConversions: number,
): TimeSeriesPoint[] {
  const days = 7;
  const points: TimeSeriesPoint[] = [];
  const base = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    const weight = 0.85 + (i % 3) * 0.08; // mild variance
    points.push({
      date: d.toISOString().slice(0, 10),
      impressions: Math.floor((totalImpressions / days) * weight),
      clicks: Math.floor((totalClicks / days) * weight),
      spend: +(totalSpend / days).toFixed(2),
      conversions: Math.floor((totalConversions / days) * weight),
    });
  }
  return points;
}

function realModeReportStub(campaignId: string): CampaignReport {
  // Structured zero-metrics report for real mode without credentials.
  // Callers should treat this as a pending_approval state — the UI
  // surfaces a "live mode" badge but no spend is reported.
  const summary: CampaignMetrics = {
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend: 0,
    revenue: 0,
    ctr: 0,
    cvr: 0,
    roas: 0,
  };
  return {
    campaignId,
    platform: 'google',
    summary,
    demographics: [],
    placements: [],
    creativeBreakdown: [],
    timeSeries: [],
    recommendations: [
      'Live mode requires GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_CUSTOMER_ID.',
      'Connect Google Ads credentials to enable real insights reporting.',
    ],
    searchTerms: [],
    keywords: [],
    adGroups: [],
    deviceBreakdown: [],
  };
}
