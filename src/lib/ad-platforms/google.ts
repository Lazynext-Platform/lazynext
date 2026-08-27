/**
 * Google Ads provider.
 *
 * Supports dry-run mode for safe testing without spending real money.
 * Real publishing requires GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_CUSTOMER_ID.
 */

import type { AdPlatformProvider, AdCampaignInput, AdCampaignResult, CampaignMetrics, PublishOptions } from './types';

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
};

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
