/**
 * Google Analytics 4 (GA4) analytics abstraction.
 *
 * Provides a typed client for fetching GA4 property data: overview metrics,
 * traffic sources, conversions, audience demographics, and realtime data.
 *
 * Dry-run mode returns deterministic simulated data so the UI and tests can
 * exercise the full data shape without GA4 credentials. Real mode stubs
 * return a `pending_credentials` status when the required env vars
 * (GA4_PROPERTY_ID, GOOGLE_APPLICATION_CREDENTIALS) are not configured.
 *
 * The real implementation would call the Google Analytics Data API (v1beta):
 *   POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
 *   POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runRealtimeReport
 */

/** Inclusive date range (YYYY-MM-DD). */
export interface GA4DateRange {
  startDate: string;
  endDate: string;
}

/** Overview metrics for a GA4 property over a date range. */
export interface GA4Overview {
  propertyId: string;
  dateRange: GA4DateRange;
  sessions: number;
  users: number;
  pageviews: number;
  bounceRate: number; // 0–100
  avgSessionDurationSeconds: number;
  newUsers: number;
  screenPageViewsPerSession: number;
}

/** Traffic source / medium breakdown row. */
export interface GA4TrafficSource {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  conversions: number;
  bounceRate: number;
  revenue: number;
}

/** Traffic sources report. */
export interface GA4TrafficSourcesReport {
  propertyId: string;
  dateRange: GA4DateRange;
  sources: GA4TrafficSource[];
}

/** Conversion event row. */
export interface GA4Conversion {
  eventName: string;
  conversions: number;
  conversionRate: number; // 0–100
  revenue: number;
  users: number;
}

/** Conversions report. */
export interface GA4ConversionsReport {
  propertyId: string;
  dateRange: GA4DateRange;
  totalConversions: number;
  totalRevenue: number;
  overallConversionRate: number; // 0–100
  conversions: GA4Conversion[];
}

/** Demographic/interest/geo audience breakdown. */
export interface GA4AudienceDemographic {
  dimension: string; // e.g. 'age', 'gender', 'interest', 'country'
  value: string;
  users: number;
  sessions: number;
  revenue: number;
}

/** Audience overview report. */
export interface GA4AudienceData {
  propertyId: string;
  dateRange: GA4DateRange;
  demographics: GA4AudienceDemographic[];
  interests: GA4AudienceDemographic[];
  geo: GA4AudienceDemographic[];
}

/** Realtime event row. */
export interface GA4RealtimeEvent {
  eventName: string;
  eventCount: number;
}

/** Realtime report. */
export interface GA4RealtimeData {
  propertyId: string;
  timestamp: string;
  activeUsers: number;
  events: GA4RealtimeEvent[];
  screenPageViews: number;
}

/** Metric selector for the GA4 client. */
export type GA4Metric = 'overview' | 'traffic' | 'conversions' | 'audience' | 'realtime';

/** Union of all GA4 report payloads. */
export type GA4Report =
  | GA4Overview
  | GA4TrafficSourcesReport
  | GA4ConversionsReport
  | GA4AudienceData
  | GA4RealtimeData;

/** Structured response wrapper — real mode without credentials returns this. */
export interface GA4PendingCredentials {
  status: 'pending_credentials';
  message: string;
  propertyId: string;
  metric: GA4Metric;
}

/** Result of any GA4 client method — either data or a pending_credentials stub. */
export type GA4Result<T extends GA4Report> = T | GA4PendingCredentials;

function isRealModeConfigured(): boolean {
  return !!(process.env.GA4_PROPERTY_ID || process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

/**
 * GA4 analytics client.
 *
 * Construct with `{ dryRun: true }` (default) for simulated data, or
 * `{ dryRun: false }` to attempt real API calls. Real calls without
 * credentials return a structured `pending_credentials` response.
 */
export class GA4Client {
  private readonly dryRun: boolean;

  constructor(opts: { dryRun?: boolean } = {}) {
    this.dryRun = opts.dryRun !== false;
  }

  async getOverview(propertyId: string, dateRange: GA4DateRange): Promise<GA4Result<GA4Overview>> {
    if (this.dryRun) {
      return dryRunOverview(propertyId, dateRange);
    }
    // Real implementation:
    // POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport
    //   { dateRanges: [{ startDate, endDate }],
    //     metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'screenPageViews' },
    //                { name: 'bounceRate' }, { name: 'averageSessionDuration' }, { name: 'newUsers' }] }
    if (!isRealModeConfigured()) {
      return pendingCredentials(propertyId, 'overview');
    }
    return dryRunOverview(propertyId, dateRange);
  }

  async getTrafficSources(propertyId: string, dateRange: GA4DateRange): Promise<GA4Result<GA4TrafficSourcesReport>> {
    if (this.dryRun) {
      return dryRunTrafficSources(propertyId, dateRange);
    }
    // Real implementation: runReport with dimensions sessionDefaultChannelGroup,
    // sessionSource, sessionMedium.
    if (!isRealModeConfigured()) {
      return pendingCredentials(propertyId, 'traffic');
    }
    return dryRunTrafficSources(propertyId, dateRange);
  }

  async getConversions(propertyId: string, dateRange: GA4DateRange): Promise<GA4Result<GA4ConversionsReport>> {
    if (this.dryRun) {
      return dryRunConversions(propertyId, dateRange);
    }
    // Real implementation: runReport with dimension eventName and metrics
    // conversions, totalRevenue, sessionConversionRate.
    if (!isRealModeConfigured()) {
      return pendingCredentials(propertyId, 'conversions');
    }
    return dryRunConversions(propertyId, dateRange);
  }

  async getAudienceOverview(propertyId: string, dateRange: GA4DateRange): Promise<GA4Result<GA4AudienceData>> {
    if (this.dryRun) {
      return dryRunAudience(propertyId, dateRange);
    }
    // Real implementation: runReport with dimensions userAgeBracket,
    // userGender, interests, country.
    if (!isRealModeConfigured()) {
      return pendingCredentials(propertyId, 'audience');
    }
    return dryRunAudience(propertyId, dateRange);
  }

  async getRealtime(propertyId: string): Promise<GA4Result<GA4RealtimeData>> {
    if (this.dryRun) {
      return dryRunRealtime(propertyId);
    }
    // Real implementation:
    // POST https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runRealtimeReport
    //   { metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    //     dimensions: [{ name: 'eventName' }] }
    if (!isRealModeConfigured()) {
      return pendingCredentials(propertyId, 'realtime');
    }
    return dryRunRealtime(propertyId);
  }
}

/** Type guard: a value is a pending_credentials response. */
export function isPendingCredentials(v: unknown): v is GA4PendingCredentials {
  return typeof v === 'object' && v !== null && (v as GA4PendingCredentials).status === 'pending_credentials';
}

// ── Dry-run simulated data ──

function dryRunOverview(propertyId: string, dateRange: GA4DateRange): GA4Overview {
  return {
    propertyId,
    dateRange,
    sessions: 18420,
    users: 12380,
    newUsers: 8120,
    pageviews: 42100,
    bounceRate: 42.3,
    avgSessionDurationSeconds: 128,
    screenPageViewsPerSession: 2.29,
  };
}

function dryRunTrafficSources(propertyId: string, dateRange: GA4DateRange): GA4TrafficSourcesReport {
  const sources: GA4TrafficSource[] = [
    { source: 'google', medium: 'organic', sessions: 9200, users: 6100, conversions: 184, bounceRate: 38.1, revenue: 4320.5 },
    { source: '(direct)', medium: '(none)', sessions: 4100, users: 2900, conversions: 96, bounceRate: 45.0, revenue: 2210.0 },
    { source: 'facebook', medium: 'social', sessions: 2600, users: 1800, conversions: 52, bounceRate: 51.2, revenue: 1180.75 },
    { source: 'lazynext', medium: 'email', sessions: 1520, users: 1180, conversions: 73, bounceRate: 22.4, revenue: 3140.25 },
    { source: 'bing', medium: 'organic', sessions: 1000, users: 400, conversions: 8, bounceRate: 49.8, revenue: 180.0 },
  ];
  return { propertyId, dateRange, sources };
}

function dryRunConversions(propertyId: string, dateRange: GA4DateRange): GA4ConversionsReport {
  const conversions: GA4Conversion[] = [
    { eventName: 'purchase', conversions: 312, conversionRate: 1.69, revenue: 9840.0, users: 280 },
    { eventName: 'sign_up', conversions: 540, conversionRate: 2.93, revenue: 0, users: 540 },
    { eventName: 'add_to_cart', conversions: 1180, conversionRate: 6.41, revenue: 0, users: 920 },
    { eventName: 'begin_checkout', conversions: 620, conversionRate: 3.37, revenue: 0, users: 540 },
  ];
  const totalConversions = conversions.reduce((s, c) => s + c.conversions, 0);
  const totalRevenue = conversions.reduce((s, c) => s + c.revenue, 0);
  return {
    propertyId,
    dateRange,
    totalConversions,
    totalRevenue,
    overallConversionRate: 2.41,
    conversions,
  };
}

function dryRunAudience(propertyId: string, dateRange: GA4DateRange): GA4AudienceData {
  const demographics: GA4AudienceDemographic[] = [
    { dimension: 'age', value: '18-24', users: 2100, sessions: 3200, revenue: 980.0 },
    { dimension: 'age', value: '25-34', users: 4800, sessions: 7100, revenue: 4120.5 },
    { dimension: 'age', value: '35-44', users: 3100, sessions: 4600, revenue: 3010.25 },
    { dimension: 'age', value: '45-54', users: 1600, sessions: 2400, revenue: 1420.0 },
    { dimension: 'gender', value: 'female', users: 6900, sessions: 10200, revenue: 6210.75 },
    { dimension: 'gender', value: 'male', users: 5200, sessions: 7700, revenue: 4900.5 },
  ];
  const interests: GA4AudienceDemographic[] = [
    { dimension: 'interest', value: 'Shoppers', users: 4200, sessions: 6100, revenue: 3800.0 },
    { dimension: 'interest', value: 'Beauty & Fitness', users: 3100, sessions: 4500, revenue: 2210.25 },
    { dimension: 'interest', value: 'Food & Drink', users: 2400, sessions: 3600, revenue: 980.0 },
  ];
  const geo: GA4AudienceDemographic[] = [
    { dimension: 'country', value: 'United States', users: 6100, sessions: 9000, revenue: 5400.0 },
    { dimension: 'country', value: 'United Kingdom', users: 1800, sessions: 2700, revenue: 1610.5 },
    { dimension: 'country', value: 'Canada', users: 1400, sessions: 2100, revenue: 980.25 },
    { dimension: 'country', value: 'Australia', users: 900, sessions: 1300, revenue: 620.0 },
  ];
  return { propertyId, dateRange, demographics, interests, geo };
}

function dryRunRealtime(propertyId: string): GA4RealtimeData {
  return {
    propertyId,
    timestamp: new Date().toISOString(),
    activeUsers: 142,
    screenPageViews: 318,
    events: [
      { eventName: 'page_view', eventCount: 318 },
      { eventName: 'scroll', eventCount: 96 },
      { eventName: 'click', eventCount: 42 },
      { eventName: 'add_to_cart', eventCount: 8 },
    ],
  };
}

function pendingCredentials(propertyId: string, metric: GA4Metric): GA4PendingCredentials {
  return {
    status: 'pending_credentials',
    message:
      'GA4 real mode requires GA4_PROPERTY_ID and GOOGLE_APPLICATION_CREDENTIALS. ' +
      'Connect Google credentials to enable real analytics reporting.',
    propertyId,
    metric,
  };
}
