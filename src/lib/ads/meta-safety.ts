/**
 * Meta Ads Safety Layer.
 *
 * Adds safety controls (dry-run mode, approval workflows, spend caps, and an
 * audit log) on top of the existing ad platform integration. Inspired by
 * meta-ads-mcp (#29, MIT).
 *
 * This module is self-contained and uses in-memory storage for the audit log
 * and pending approval requests (Map-based). It is safe to import in both the
 * API route layer and in tests — there are no database or external API
 * dependencies.
 *
 * Patterns follow src/lib/ad-platforms/meta.ts (dry-run + spend-cap guards),
 * src/lib/security.ts (safeError), and src/lib/creative/product-image.ts
 * (validation + resilient fallbacks).
 */

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

/** Context passed to checkSafety describing the action being gated. */
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
  requireApproval: false,
  maxDailyBudget: 100, // $100 default
  maxCampaignBudget: 50, // $50 default
  maxDailyMutations: 20,
  allowedActions: [],
  blockedActions: ['delete_campaign', 'delete_ad_set', 'delete_ad'],
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
  'update_budget',
  'update_campaign_budget',
  'resume_campaign',
]);

/**
 * Pre-action safety check. Returns whether the action is allowed, whether it
 * requires approval, whether it would be simulated (dry-run), and any warnings
 * (e.g. approaching spend thresholds).
 */
export function checkSafety(
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

/** Clear the audit log (primarily for tests). */
export function clearAuditLog(): void {
  auditLog.length = 0;
}

// ── Approval workflow ──

/**
 * Create a pending approval request for an action. Returns the created request.
 */
export function createApprovalRequest(
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

// ── D1 persistence (optional) ──
//
// The functions below mirror the in-memory audit/approval helpers but persist
// to Cloudflare D1 via Prisma. They are designed to be *optional*: if Prisma
// or D1 is unavailable (e.g. in the Node test runner or dry-run mode), every
// call fails gracefully and the caller can fall back to the in-memory path.
//
// Prisma is imported lazily (dynamic `await import`) so this module remains
// importable in environments that do not have a database bound (tests, dry
// runs). All D1 operations are wrapped in try/catch and never throw.

/** Lazily resolve the Prisma client. Returns null when unavailable. */
async function getPrisma(): Promise<import('@prisma/client').PrismaClient | null> {
  try {
    const mod = await import('@/lib/prisma');
    return (mod as { prisma: import('@prisma/client').PrismaClient }).prisma;
  } catch {
    return null;
  }
}

/**
 * Persist an audit entry to D1. Resolves silently (no throw) if D1 is
 * unavailable — callers should also keep the in-memory copy as a fallback.
 */
export async function persistAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    const p = await getPrisma();
    if (!p) return;
    await p.metaSafetyAudit.create({
      data: {
        id: entry.id,
        action: entry.action,
        actor: entry.actor,
        timestamp: new Date(entry.timestamp),
        dryRun: entry.dryRun,
        approved: entry.approved,
        payload: JSON.stringify(entry.payload ?? {}),
        result: entry.result,
        spendDelta: entry.spendDelta ?? 0,
      },
    });
  } catch {
    // D1 unavailable — fall back to in-memory (already recorded by caller).
  }
}

/**
 * Read audit entries from D1 (newest first). Returns an empty array if D1 is
 * unavailable so callers can fall back to `getAuditLog()`.
 */
export async function getAuditLogFromDB(limit = 100): Promise<AuditEntry[]> {
  try {
    const p = await getPrisma();
    if (!p) return [];
    const rows = await p.metaSafetyAudit.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      actor: r.actor,
      timestamp: r.timestamp.toISOString(),
      dryRun: r.dryRun,
      approved: r.approved,
      payload: safeParseJson(r.payload),
      result: r.result as AuditEntry['result'],
      spendDelta: r.spendDelta,
    }));
  } catch {
    return [];
  }
}

/**
 * Aggregate audit summary from D1. Returns an all-zero summary if D1 is
 * unavailable so callers can fall back to the in-memory summary.
 */
export async function getAuditSummaryFromDB(): Promise<{
  total: number;
  successes: number;
  failures: number;
  simulated: number;
}> {
  const empty = { total: 0, successes: 0, failures: 0, simulated: 0 };
  try {
    const p = await getPrisma();
    if (!p) return empty;
    const [total, successes, failures, simulated] = await Promise.all([
      p.metaSafetyAudit.count(),
      p.metaSafetyAudit.count({ where: { result: 'success' } }),
      p.metaSafetyAudit.count({ where: { result: 'failure' } }),
      p.metaSafetyAudit.count({ where: { result: 'simulated' } }),
    ]);
    return { total, successes, failures, simulated };
  } catch {
    return empty;
  }
}

/**
 * Persist a pending approval request to D1. Resolves silently (no throw) if
 * D1 is unavailable.
 */
export async function persistApprovalRequest(req: ApprovalRequest): Promise<void> {
  try {
    const p = await getPrisma();
    if (!p) return;
    await p.metaSafetyApproval.create({
      data: {
        id: req.id,
        action: req.action,
        payload: JSON.stringify(req.payload ?? {}),
        status: req.status,
        createdAt: new Date(req.createdAt),
        expiresAt: new Date(req.expiresAt),
        approvedBy: req.approvedBy ?? null,
        approvedAt: req.approvedAt ? new Date(req.approvedAt) : null,
      },
    });
  } catch {
    // D1 unavailable — fall back to in-memory (already stored by caller).
  }
}

/**
 * Update the status of an approval request in D1. Resolves silently (no
 * throw) if D1 is unavailable.
 */
export async function updateApprovalStatusInDB(
  id: string,
  status: string,
  approvedBy: string,
): Promise<void> {
  try {
    const p = await getPrisma();
    if (!p) return;
    await p.metaSafetyApproval.update({
      where: { id },
      data: {
        status,
        approvedBy,
        approvedAt: new Date(),
      },
    });
  } catch {
    // D1 unavailable — fall back to in-memory (already updated by caller).
  }
}

/**
 * Read pending (non-expired) approval requests from D1. Returns an empty
 * array if D1 is unavailable so callers can fall back to
 * `getPendingApprovals()`.
 */
export async function getPendingApprovalsFromDB(): Promise<ApprovalRequest[]> {
  try {
    const p = await getPrisma();
    if (!p) return [];
    const now = new Date();
    const rows = await p.metaSafetyApproval.findMany({
      where: {
        status: 'pending',
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      payload: safeParseJson(r.payload),
      status: r.status as ApprovalRequest['status'],
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      approvedBy: r.approvedBy ?? undefined,
      approvedAt: r.approvedAt ? r.approvedAt.toISOString() : undefined,
    }));
  } catch {
    return [];
  }
}

/** Parse a JSON string into an object, returning {} on failure. */
function safeParseJson(raw: string): Record<string, unknown> {
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
