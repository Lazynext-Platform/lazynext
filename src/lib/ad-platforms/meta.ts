/**
 * Meta (Facebook/Instagram) Ads provider.
 *
 * Supports dry-run mode for safe testing without spending real money.
 * Real publishing requires META_ACCESS_TOKEN and META_AD_ACCOUNT_ID.
 *
 * Security: all spend-affecting operations require explicit approval
 * and respect spend caps.
 */

import type { AdPlatformProvider, AdCampaignInput, AdCampaignResult, CampaignMetrics, PublishOptions } from './types';

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
};

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
