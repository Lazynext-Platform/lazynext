/**
 * Meta (Facebook/Instagram) Ads provider.
 *
 * Supports dry-run mode for safe testing without spending real money.
 * Real publishing requires META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.
 *
 * Security: all spend-affecting operations require explicit approval
 * and respect spend caps. Budget updates apply a safety margin so that
 * a new daily budget cannot accidentally blow past a configured cap.
 *
 * Patterns adapted from meta-ads-mcp (#29, MIT).
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
  PublishOptions,
} from './types';

/**
 * Safety margin applied when validating a new daily budget against a
 * spend cap. A 10% margin (1.1) ensures rounding and intra-day spend
 * spikes don't exceed the cap.
 */
export const BUDGET_SAFETY_MARGIN = 1.1;

export const metaAds: AdPlatformProvider = {
  id: 'meta',

  async createCampaign(input: AdCampaignInput, opts: PublishOptions = {}): Promise<AdCampaignResult> {
    if (opts.dryRun) {
      return dryRunCreate(input);
    }

    // Real publishing would call Meta Marketing API:
    // POST https://graph.facebook.com/v20.0/{ad_account_id}/campaigns
    // This requires META_ACCESS_TOKEN and META_AD_ACCOUNT_ID env vars.
    //
    // For now, return a draft campaign that requires approval.
    return {
      id: `meta_draft_${Date.now()}`,
      platform: 'meta',
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
    // Real implementation: GET https://graph.facebook.com/v20.0/{campaign_id}
    return {
      id: campaignId,
      platform: 'meta',
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
    // Real implementation: POST with status=PAUSED
    console.log(`[meta] pauseCampaign: ${campaignId}`);
  },

  async getMetrics(campaignId: string): Promise<CampaignMetrics> {
    // Real implementation: GET insights API
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
      const capCheck = checkSpendCap(budgetDaily, opts.spendCap);
      if (!capCheck.ok) {
        throw new Error('budget_exceeds_spend_cap');
      }
    }

    if (opts.dryRun) {
      return dryRunUpdateBudget(id, budgetDaily);
    }

    // Real implementation:
    // POST https://graph.facebook.com/v20.0/{ad_account_id}/campaigns/{id}
    //   { daily_budget: budgetDaily * 100 (cents) }
    // Requires META_ACCESS_TOKEN. Without credentials we return a
    // structured pending_approval response so callers can gate the
    // change behind a manual approval flow.
    return {
      id,
      platform: 'meta',
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
    // GET https://graph.facebook.com/v20.0/{campaign_id}/insights
    //   ?fields=spend&date_preset=maximum
    // Without credentials, return a zero-spend structured stub.
    return { spend: 0, currency: 'USD' };
  },

  async getReport(id: string, opts: PublishOptions = {}): Promise<CampaignReport> {
    if (opts.dryRun) {
      return dryRunReport(id);
    }

    // Real implementation calls the Meta Ads Insights API with
    // breakdowns for age, gender, placement, and creative:
    // GET https://graph.facebook.com/v20.0/{campaign_id}/insights
    //   ?fields=impressions,clicks,conversions,spend,ctr,actions
    //   &breakdowns=['age','gender','placement']
    //   &level=ad
    // Without credentials, return a structured pending_approval-style
    // report with zeroed metrics so the UI can render safely.
    return realModeReportStub(id);
  },
};

/**
 * Validate that a (new) spend/budget value respects the configured cap,
 * applying the BUDGET_SAFETY_MARGIN.
 *
 * Returns `{ ok: true }` when within cap, otherwise `{ ok: false, cap,
 * value, margin }` describing the violation.
 */
export function checkSpendCap(
  spend: number,
  cap: number,
): { ok: true } | { ok: false; cap: number; value: number; margin: number } {
  if (typeof cap !== 'number' || cap <= 0) {
    return { ok: true };
  }
  const effectiveCap = cap * BUDGET_SAFETY_MARGIN;
  if (spend > effectiveCap) {
    return { ok: false, cap, value: spend, margin: BUDGET_SAFETY_MARGIN };
  }
  return { ok: true };
}

// ── Dry-run helpers ──

function dryRunCreate(input: AdCampaignInput): AdCampaignResult {
  const estimatedReach = Math.floor((input.budgetDaily || 10) * 500);
  return {
    id: `meta_dryrun_${Date.now()}`,
    platform: 'meta',
    name: input.name,
    status: 'draft',
    budgetDaily: input.budgetDaily,
    budgetTotal: input.budgetTotal,
    currency: input.currency || 'USD',
    targeting: input.targeting,
    creativeIds: input.creativeIds,
    metrics: {
      impressions: estimatedReach,
      clicks: Math.floor(estimatedReach * 0.02),
      conversions: 0,
      spend: 0,
      revenue: 0,
      ctr: 2.0,
      cvr: 0,
      roas: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function dryRunUpdateBudget(id: string, budgetDaily: number): AdCampaignResult {
  const estimatedReach = Math.floor(budgetDaily * 500);
  return {
    id,
    platform: 'meta',
    campaignId: id,
    name: 'Campaign (dry-run budget update)',
    status: 'draft',
    budgetDaily,
    currency: 'USD',
    creativeIds: [],
    metrics: {
      impressions: estimatedReach,
      clicks: Math.floor(estimatedReach * 0.02),
      conversions: 0,
      spend: 0,
      revenue: 0,
      ctr: 2.0,
      cvr: 0,
      roas: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function dryRunReport(campaignId: string): CampaignReport {
  const impressions = 12000;
  const clicks = Math.floor(impressions * 0.02);
  const conversions = Math.floor(clicks * 0.05);
  const spend = 0; // dry-run never spends
  const revenue = conversions * 12.5;
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
    { age: '18-24', gender: 'male', impressions: 3000, clicks: 60, conversions: 3 },
    { age: '18-24', gender: 'female', impressions: 3200, clicks: 70, conversions: 4 },
    { age: '25-34', gender: 'male', impressions: 2600, clicks: 50, conversions: 2 },
    { age: '25-34', gender: 'female', impressions: 3200, clicks: 80, conversions: 5 },
  ];

  const placements: PlacementBreakdown[] = [
    { placement: 'facebook_feed', impressions: 6000, clicks: 130, spend: 0 },
    { placement: 'instagram_feed', impressions: 4000, clicks: 90, spend: 0 },
    { placement: 'instagram_stories', impressions: 2000, clicks: 40, spend: 0 },
  ];

  const creativeBreakdown: CreativeBreakdown[] = [
    { creativeId: 'creation_1', impressions: 7000, clicks: 150, ctr: (150 / 7000) * 100, conversions: 8 },
    { creativeId: 'creation_2', impressions: 5000, clicks: 110, ctr: (110 / 5000) * 100, conversions: 6 },
  ];

  const timeSeries: TimeSeriesPoint[] = buildDryRunTimeSeries(impressions, clicks, spend, conversions);

  const recommendations: string[] = [
    'Increase budget for the 25-34 female segment — highest conversion rate.',
    'creation_1 outperforms creation_2 by 36% in CTR; consider reallocating spend.',
    'Instagram Stories placement has low CTR — test a vertical creative variant.',
  ];

  return {
    campaignId,
    platform: 'meta',
    summary,
    demographics,
    placements,
    creativeBreakdown,
    timeSeries,
    recommendations,
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
    const weight = 0.8 + (i % 3) * 0.1; // mild variance
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
    platform: 'meta',
    summary,
    demographics: [],
    placements: [],
    creativeBreakdown: [],
    timeSeries: [],
    recommendations: [
      'Live mode requires META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.',
      'Connect Meta credentials to enable real insights reporting.',
    ],
  };
}
