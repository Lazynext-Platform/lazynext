/**
 * Google Ads Safety Layer.
 *
 * Adds safety controls (dry-run mode, approval workflows, spend caps, and an
 * audit log) on top of the existing Google Ads integration. Mirrors the
 * Meta Ads Safety Layer (src/lib/ads/meta-safety.ts) with Google-specific
 * action names and defaults.
 *
 * This module is self-contained and uses in-memory storage for the audit log
 * and pending approval requests (Map-based). It is safe to import in both the
 * API route layer and in tests — there are no database or external API
 * dependencies.
 *
 * Patterns follow src/lib/ads/meta-safety.ts (dry-run + spend-cap guards),
 * src/lib/security.ts (safeError), and src/lib/creative/product-image.ts
 * (validation + resilient fallbacks).
 */

/** Safety config is free — no credits are charged for reading/updating it. */
export const GOOGLE_SAFETY_CREDIT_COST = 0;

// ── Types ──

export interface SafetyConfig {
  /** If true, simulate all mutations without executing. */
  dryRun: boolean;
  /** If true, mutations need explicit approval before executing. */
  requireApproval: boolean;
  /** Max daily spend in account currency (0 = unlimited). */
  maxDailyBudget: number;
  /** Max per-campaign budget (0 = unlimited). */
  maxCampaignBudget: number;
  /** Max mutations per day (0 = unlimited). */
  maxDailyMutations: number;
  /** Whitelist of allowed actions (empty = all allowed). */
  allowedActions: string[];
  /** Blacklist of actions. */
  blockedActions: string[];
  /** Warn when spend reaches this % of cap (0-100). */
  warningThreshold: number;
}

export interface SafetyCheckResult {
  allowed: boolean;
  reason: string;
  requiresApproval: boolean;
  dryRun: boolean;
  warnings: string[];
}

export interface ApprovalRequest {
  id: string;
  action: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  dryRun: boolean;
  approved: boolean;
  payload: Record<string, unknown>;
  result: 'success' | 'failure' | 'simulated';
  spendDelta?: number;
}

export interface SpendCaps {
  dailySpend: number;
  campaignSpend: number;
  dailyBudget: number;
  campaignBudget: number;
  exceededDaily: boolean;
  exceededCampaign: boolean;
  /** 0-100, % of cap reached. */
  warningLevel: number;
}

/** Context passed to checkAction describing the action being gated. */
export interface SafetyContext {
  /** The actor (user id or system) performing the action. */
  actor?: string;
  /** Current daily spend for the account. */
  dailySpend?: number;
  /** Current spend for the campaign being mutated. */
  campaignSpend?: number;
  /** Proposed budget for a budget-affecting action (if any). */
  proposedBudget?: number;
  /** Number of mutations already performed today. */
  mutationsToday?: number;
  /** Payload of the action (for audit/approval records). */
  payload?: Record<string, unknown>;
}

// ── Default config ──

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  dryRun: true, // default to dry-run for safety
  requireApproval: true, // require approval by default for Google Ads
  maxDailyBudget: 200, // $200 default
  maxCampaignBudget: 100, // $100 default
  maxDailyMutations: 20,
  allowedActions: [],
  blockedActions: ['delete_campaign', 'delete_adgroup', 'delete_ad', 'delete_budget'],
  warningThreshold: 80, // warn at 80% of cap
};

// ── In-memory storage ──

const auditLog: AuditEntry[] = [];
const approvalRequests = new Map<string, ApprovalRequest>();

/** Default approval request TTL in milliseconds (24h). */
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000;

// ── Validation ──

/**
 * Validate a SafetyConfig. Returns { valid, errors } — never throws.
 */
export function validateSafetyConfig(
  config: unknown,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['config_required'] };
  }

  const c = config as Partial<SafetyConfig>;

  if (typeof c.dryRun !== 'boolean') {
    errors.push('dryRun_must_be_boolean');
  }
  if (typeof c.requireApproval !== 'boolean') {
    errors.push('requireApproval_must_be_boolean');
  }
  if (typeof c.maxDailyBudget !== 'number' || !Number.isFinite(c.maxDailyBudget) || c.maxDailyBudget < 0) {
    errors.push('maxDailyBudget_must_be_non_negative_number');
  }
  if (typeof c.maxCampaignBudget !== 'number' || !Number.isFinite(c.maxCampaignBudget) || c.maxCampaignBudget < 0) {
    errors.push('maxCampaignBudget_must_be_non_negative_number');
  }
  if (typeof c.maxDailyMutations !== 'number' || !Number.isFinite(c.maxDailyMutations) || c.maxDailyMutations < 0) {
    errors.push('maxDailyMutations_must_be_non_negative_number');
  }
  if (!Array.isArray(c.allowedActions) || c.allowedActions.some((a) => typeof a !== 'string')) {
    errors.push('allowedActions_must_be_string_array');
  }
  if (!Array.isArray(c.blockedActions) || c.blockedActions.some((a) => typeof a !== 'string')) {
    errors.push('blockedActions_must_be_string_array');
  }
  if (
    typeof c.warningThreshold !== 'number' ||
    !Number.isFinite(c.warningThreshold) ||
    c.warningThreshold < 0 ||
    c.warningThreshold > 100
  ) {
    errors.push('warningThreshold_must_be_between_0_and_100');
  }

  return { valid: errors.length === 0, errors };
}

// ── Safety check ──

/** Actions that affect spend/budget and should be checked against caps. */
const BUDGET_ACTIONS = new Set([
  'create_campaign',
  'create_budget',
  'update_budget',
  'update_campaign',
  'resume_campaign',
]);

/**
 * Pre-action safety check. Returns whether the action is allowed, whether it
 * requires approval, whether it would be simulated (dry-run), and any warnings
 * (e.g. approaching spend thresholds).
 */
export function checkAction(
  action: string,
  config: SafetyConfig,
  context: SafetyContext = {},
): SafetyCheckResult {
  const warnings: string[] = [];

  // 1. Blocked actions are always denied.
  if (config.blockedActions.includes(action)) {
    return {
      allowed: false,
      reason: 'action_blocked',
      requiresApproval: false,
      dryRun: false,
      warnings,
    };
  }

  // 2. Whitelist (if non-empty, action must be in it).
  if (config.allowedActions.length > 0 && !config.allowedActions.includes(action)) {
    return {
      allowed: false,
      reason: 'action_not_allowed',
      requiresApproval: false,
      dryRun: false,
      warnings,
    };
  }

  // 3. Daily mutation cap.
  if (config.maxDailyMutations > 0 && (context.mutationsToday ?? 0) >= config.maxDailyMutations) {
    return {
      allowed: false,
      reason: 'max_daily_mutations_exceeded',
      requiresApproval: false,
      dryRun: false,
      warnings,
    };
  }

  // 4. Spend caps for budget-affecting actions.
  if (BUDGET_ACTIONS.has(action)) {
    const proposed = context.proposedBudget ?? 0;
    if (config.maxDailyBudget > 0 && proposed > config.maxDailyBudget) {
      return {
        allowed: false,
        reason: 'proposed_budget_exceeds_daily_cap',
        requiresApproval: false,
        dryRun: false,
        warnings,
      };
    }
    if (config.maxCampaignBudget > 0 && proposed > config.maxCampaignBudget) {
      return {
        allowed: false,
        reason: 'proposed_budget_exceeds_campaign_cap',
        requiresApproval: false,
        dryRun: false,
        warnings,
      };
    }

    // Threshold warnings for current spend.
    const caps = checkSpendCaps(
      { dailySpend: context.dailySpend ?? 0, campaignSpend: context.campaignSpend ?? 0 },
      { dailyBudget: config.maxDailyBudget, campaignBudget: config.maxCampaignBudget, warningThreshold: config.warningThreshold },
    );
    if (caps.exceededDaily) {
      return {
        allowed: false,
        reason: 'daily_spend_cap_exceeded',
        requiresApproval: false,
        dryRun: false,
        warnings,
      };
    }
    if (caps.exceededCampaign) {
      return {
        allowed: false,
        reason: 'campaign_spend_cap_exceeded',
        requiresApproval: false,
        dryRun: false,
        warnings,
      };
    }
    if (caps.warningLevel >= config.warningThreshold && config.warningThreshold > 0) {
      warnings.push(`spend_at_${Math.round(caps.warningLevel)}_percent_of_cap`);
    }
  }

  // 5. Dry-run mode: allow but mark as simulated.
  if (config.dryRun) {
    return {
      allowed: true,
      reason: 'dry_run_mode',
      requiresApproval: false,
      dryRun: true,
      warnings,
    };
  }

  // 6. Approval gate.
  if (config.requireApproval) {
    return {
      allowed: false,
      reason: 'approval_required',
      requiresApproval: true,
      dryRun: false,
      warnings,
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    requiresApproval: false,
    dryRun: false,
    warnings,
  };
}

// ── Spend caps ──

/**
 * Check current spend against configured caps. Returns exceeded flags and a
 * warning level (0-100) representing the highest % of any cap reached.
 */
export function checkSpendCaps(
  currentSpend: { dailySpend: number; campaignSpend: number },
  caps: { dailyBudget: number; campaignBudget: number; warningThreshold: number },
): SpendCaps {
  const { dailySpend, campaignSpend } = currentSpend;
  const { dailyBudget, campaignBudget } = caps;

  const exceededDaily = dailyBudget > 0 && dailySpend >= dailyBudget;
  const exceededCampaign = campaignBudget > 0 && campaignSpend >= campaignBudget;

  // Warning level = highest % of any active cap reached.
  const dailyPct = dailyBudget > 0 ? (dailySpend / dailyBudget) * 100 : 0;
  const campaignPct = campaignBudget > 0 ? (campaignSpend / campaignBudget) * 100 : 0;
  const warningLevel = Math.min(100, Math.max(dailyPct, campaignPct));

  return {
    dailySpend,
    campaignSpend,
    dailyBudget,
    campaignBudget,
    exceededDaily,
    exceededCampaign,
    warningLevel,
  };
}

// ── Config accessors ──

let currentConfig: SafetyConfig = { ...DEFAULT_SAFETY_CONFIG };

/** Read the active safety config. */
export function getSafetyConfig(): SafetyConfig {
  return { ...currentConfig };
}

/** Update the active safety config. Returns the new config. */
export function updateSafetyConfig(config: SafetyConfig): SafetyConfig {
  currentConfig = { ...config };
  return getSafetyConfig();
}

// ── Audit log ──

/**
 * Record an audit entry. Returns the recorded entry (with an id/timestamp
 * assigned if not provided).
 */
export function recordAuditEntry(entry: Partial<AuditEntry> & { action: string; actor: string }): AuditEntry {
  const id = entry.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const full: AuditEntry = {
    id,
    action: entry.action,
    actor: entry.actor,
    timestamp: entry.timestamp || new Date().toISOString(),
    dryRun: entry.dryRun ?? false,
    approved: entry.approved ?? false,
    payload: entry.payload ?? {},
    result: entry.result ?? 'success',
    spendDelta: entry.spendDelta,
  };
  auditLog.push(full);
  return full;
}

/** Return a copy of the current audit log (newest last). */
export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}

/** Return a summary of the audit log (counts by result). */
export function getAuditSummary(): {
  total: number;
  successes: number;
  failures: number;
  simulated: number;
} {
  const log = getAuditLog();
  return {
    total: log.length,
    successes: log.filter((e) => e.result === 'success').length,
    failures: log.filter((e) => e.result === 'failure').length,
    simulated: log.filter((e) => e.result === 'simulated').length,
  };
}

/** Clear the audit log (primarily for tests). */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

// ── Approval workflow ──

/**
 * Create a pending approval request for an action. Returns the created request.
 */
export function requestApproval(
  action: string,
  config: SafetyConfig,
  payload: Record<string, unknown> = {},
): ApprovalRequest {
  const id = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS).toISOString();
  const req: ApprovalRequest = {
    id,
    action,
    payload,
    status: 'pending',
    createdAt,
    expiresAt,
  };
  approvalRequests.set(id, req);
  return req;
}

/** Return all pending approval requests. */
export function getPendingApprovals(): ApprovalRequest[] {
  const now = Date.now();
  const out: ApprovalRequest[] = [];
  for (const req of approvalRequests.values()) {
    if (req.status === 'pending') {
      // Auto-expire if past TTL.
      if (new Date(req.expiresAt).getTime() < now) {
        req.status = 'expired';
      } else {
        out.push(req);
      }
    }
  }
  return out;
}

/** Return a single approval request by id (any status). */
export function getApprovalRequest(id: string): ApprovalRequest | undefined {
  return approvalRequests.get(id);
}

/** Approve a pending request. Returns the updated request or undefined if not found/not pending. */
export function approveRequest(id: string, approver: string): ApprovalRequest | undefined {
  const req = approvalRequests.get(id);
  if (!req || req.status !== 'pending') return undefined;
  req.status = 'approved';
  req.approvedBy = approver;
  req.approvedAt = new Date().toISOString();
  return req;
}

/** Reject a pending request. Returns the updated request or undefined if not found/not pending. */
export function rejectRequest(id: string, approver: string): ApprovalRequest | undefined {
  const req = approvalRequests.get(id);
  if (!req || req.status !== 'pending') return undefined;
  req.status = 'rejected';
  req.approvedBy = approver;
  req.approvedAt = new Date().toISOString();
  return req;
}

/** Clear all approval requests (primarily for tests). */
export function clearApprovals(): void {
  approvalRequests.clear();
}
