/**
 * Ad platform integration types.
 *
 * Supports Meta (Facebook/Instagram) and Google Ads publishing with
 * dry-run mode, approval gates, spend caps, and audit logs.
 */

export type Platform = 'meta' | 'google';

export type CampaignStatus = 'draft' | 'pending_approval' | 'active' | 'paused' | 'completed' | 'rejected';

export interface AdCampaignInput {
  platform: Platform;
  name: string;
  budgetDaily?: number;
  budgetTotal?: number;
  currency?: string;
  targeting?: CampaignTargeting;
  creativeIds: string[]; // Creation IDs
}

export interface CampaignTargeting {
  // Meta
  ageMin?: number;
  ageMax?: number;
  genders?: ('all' | 'male' | 'female')[];
  locations?: string[]; // ISO country codes
  interests?: string[];
  customAudiences?: string[];
  // Google
  keywords?: string[];
  placements?: string[];
}

export interface AdCampaignResult {
  id: string;
  platform: Platform;
  campaignId?: string; // external platform ID
  name: string;
  status: CampaignStatus;
  budgetDaily?: number;
  budgetTotal?: number;
  currency: string;
  targeting?: CampaignTargeting;
  creativeIds: string[];
  metrics?: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number; // click-through rate
  cvr: number; // conversion rate
  roas: number; // return on ad spend
}

export interface AdPlatformProvider {
  id: Platform;
  /** Create a campaign (dry-run mode returns a simulated result). */
  createCampaign(input: AdCampaignInput, opts: PublishOptions): Promise<AdCampaignResult>;
  /** Get campaign status and metrics. */
  getCampaign(campaignId: string): Promise<AdCampaignResult>;
  /** Pause a campaign. */
  pauseCampaign(campaignId: string): Promise<void>;
  /** Get performance metrics for a campaign. */
  getMetrics(campaignId: string): Promise<CampaignMetrics>;
  /** Update a campaign's daily budget (dry-run returns a simulated result). */
  updateBudget?(id: string, budgetDaily: number, opts?: PublishOptions): Promise<AdCampaignResult>;
  /** Get a detailed performance report (demographics, placements, creatives). */
  getReport?(id: string, opts?: PublishOptions): Promise<CampaignReport>;
  /** Get the current spend for a campaign. */
  getSpend?(id: string, opts?: PublishOptions): Promise<{ spend: number; currency: string }>;
}

export interface PublishOptions {
  dryRun?: boolean;
  /** Require manual approval before going live. */
  requireApproval?: boolean;
  /** Maximum spend before auto-pausing (safety cap). */
  spendCap?: number;
}

/** Dry-run result — simulates a campaign without spending real money. */
export interface DryRunResult {
  dryRun: true;
  estimatedReach: number;
  estimatedCpc: number;
  estimatedDailySpend: number;
  warnings: string[];
}

/** Demographics breakdown row. */
export interface DemographicBreakdown {
  age: string;
  gender: string;
  impressions: number;
  clicks: number;
  conversions: number;
}

/** Placement breakdown row. */
export interface PlacementBreakdown {
  placement: string;
  impressions: number;
  clicks: number;
  spend: number;
}

/** Creative breakdown row. */
export interface CreativeBreakdown {
  creativeId: string;
  impressions: number;
  clicks: number;
  ctr: number;
  conversions: number;
}

/** Time-series datapoint. */
export interface TimeSeriesPoint {
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}

/** Detailed performance report for a campaign. */
export interface CampaignReport {
  campaignId: string;
  platform: string;
  summary: CampaignMetrics;
  demographics: DemographicBreakdown[];
  placements: PlacementBreakdown[];
  creativeBreakdown: CreativeBreakdown[];
  timeSeries: TimeSeriesPoint[];
  recommendations: string[];
}
