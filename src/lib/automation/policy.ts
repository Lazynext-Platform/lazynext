import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Automation Policy Service ──
//
// Execution policies for automations: concurrency limits, rate limits
// (per hour / per day), action allowlists/blocklists, and retry policy.
//
// Uses the existing `Policy` model with `type = 'automation'` and stores
// the policy configuration in the `rules` JSON field. No schema changes.

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface AutomationPolicyConfig {
  maxConcurrentRuns: number;
  maxRunsPerHour: number;
  maxRunsPerDay: number;
  enabledActions: string[];
  blockedActions: string[];
  retryPolicy: RetryPolicy;
}

export interface PolicyInput {
  name: string;
  maxConcurrentRuns?: number;
  maxRunsPerHour?: number;
  maxRunsPerDay?: number;
  enabledActions?: string[];
  blockedActions?: string[];
  retryPolicy?: Partial<RetryPolicy>;
}

export interface AutomationPolicyRecord {
  id: string;
  organizationId: string;
  name: string;
  status: string;
  config: AutomationPolicyConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface PolicySummary {
  total: number;
  active: number;
  currentConcurrentRuns: number;
  runsLastHour: number;
  runsLastDay: number;
  policies: AutomationPolicyRecord[];
}

const DEFAULT_CONFIG: AutomationPolicyConfig = {
  maxConcurrentRuns: 10,
  maxRunsPerHour: 100,
  maxRunsPerDay: 1000,
  enabledActions: [],
  blockedActions: [],
  retryPolicy: {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
  },
};

function normalizeConfig(input: PolicyInput): AutomationPolicyConfig {
  return {
    maxConcurrentRuns: input.maxConcurrentRuns ?? DEFAULT_CONFIG.maxConcurrentRuns,
    maxRunsPerHour: input.maxRunsPerHour ?? DEFAULT_CONFIG.maxRunsPerHour,
    maxRunsPerDay: input.maxRunsPerDay ?? DEFAULT_CONFIG.maxRunsPerDay,
    enabledActions: input.enabledActions ?? DEFAULT_CONFIG.enabledActions,
    blockedActions: input.blockedActions ?? DEFAULT_CONFIG.blockedActions,
    retryPolicy: {
      maxAttempts: input.retryPolicy?.maxAttempts ?? DEFAULT_CONFIG.retryPolicy.maxAttempts,
      initialDelayMs: input.retryPolicy?.initialDelayMs ?? DEFAULT_CONFIG.retryPolicy.initialDelayMs,
      maxDelayMs: input.retryPolicy?.maxDelayMs ?? DEFAULT_CONFIG.retryPolicy.maxDelayMs,
      backoffMultiplier: input.retryPolicy?.backoffMultiplier ?? DEFAULT_CONFIG.retryPolicy.backoffMultiplier,
    },
  };
}

function toRecord(p: {
  id: string;
  organizationId: string;
  title: string;
  status: string;
  rules: string;
  createdAt: Date;
  updatedAt: Date;
}): AutomationPolicyRecord {
  let config: AutomationPolicyConfig;
  try {
    const parsed = JSON.parse(p.rules) as AutomationPolicyConfig | AutomationPolicyConfig[];
    config = Array.isArray(parsed) ? parsed[0] ?? DEFAULT_CONFIG : parsed;
    if (!config || typeof config !== 'object') config = DEFAULT_CONFIG;
  } catch {
    config = DEFAULT_CONFIG;
  }
  return {
    id: p.id,
    organizationId: p.organizationId,
    name: p.title,
    status: p.status,
    config,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export const AutomationPolicyService = {
  /**
   * Create an automation execution policy.
   */
  async createPolicy(organizationId: string, input: PolicyInput): Promise<AutomationPolicyRecord> {
    const name = input.name?.trim();
    if (!name) throw new Error('policy_name_required');

    const config = normalizeConfig(input);

    const policy = await prisma.policy.create({
      data: {
        organizationId,
        title: name.slice(0, 200),
        description: 'Automation execution policy',
        type: 'automation',
        status: 'active',
        rules: JSON.stringify(config),
      },
    });

    return toRecord(policy);
  },

  /**
   * List all automation policies for an organization.
   */
  async listPolicies(organizationId: string): Promise<AutomationPolicyRecord[]> {
    const policies = await safePrisma(() =>
      prisma.policy.findMany({
        where: { organizationId, type: 'automation' },
        orderBy: { createdAt: 'desc' },
      }),
    []);

    return policies.map(toRecord);
  },

  /**
   * Get a single policy by id.
   */
  async getPolicy(id: string): Promise<AutomationPolicyRecord | null> {
    const policy = await safePrisma(() =>
      prisma.policy.findUnique({
        where: { id },
      }),
    null);

    if (!policy || policy.type !== 'automation') return null;
    return toRecord(policy);
  },

  /**
   * Update a policy. Only provided fields are updated.
   */
  async updatePolicy(id: string, input: Partial<PolicyInput>): Promise<AutomationPolicyRecord> {
    const existing = await safePrisma(() =>
      prisma.policy.findUnique({ where: { id } }),
    null);

    if (!existing || existing.type !== 'automation') {
      throw new Error('policy_not_found');
    }

    const currentConfig = toRecord(existing).config;
    const merged: AutomationPolicyConfig = {
      maxConcurrentRuns: input.maxConcurrentRuns ?? currentConfig.maxConcurrentRuns,
      maxRunsPerHour: input.maxRunsPerHour ?? currentConfig.maxRunsPerHour,
      maxRunsPerDay: input.maxRunsPerDay ?? currentConfig.maxRunsPerDay,
      enabledActions: input.enabledActions ?? currentConfig.enabledActions,
      blockedActions: input.blockedActions ?? currentConfig.blockedActions,
      retryPolicy: {
        maxAttempts: input.retryPolicy?.maxAttempts ?? currentConfig.retryPolicy.maxAttempts,
        initialDelayMs: input.retryPolicy?.initialDelayMs ?? currentConfig.retryPolicy.initialDelayMs,
        maxDelayMs: input.retryPolicy?.maxDelayMs ?? currentConfig.retryPolicy.maxDelayMs,
        backoffMultiplier: input.retryPolicy?.backoffMultiplier ?? currentConfig.retryPolicy.backoffMultiplier,
      },
    };

    const data: Record<string, unknown> = { rules: JSON.stringify(merged) };
    if (input.name?.trim()) data.title = input.name.trim().slice(0, 200);

    const policy = await prisma.policy.update({ where: { id }, data });
    return toRecord(policy);
  },

  /**
   * Delete a policy.
   */
  async deletePolicy(id: string): Promise<{ ok: boolean }> {
    await prisma.policy.delete({ where: { id } });
    return { ok: true };
  },

  /**
   * Check whether an automation can run under the current policy.
   * Checks concurrent run count, hourly/daily run limits, and the
   * action allowlist/blocklist (against the automation's definition).
   */
  async checkPolicy(organizationId: string, automationId: string): Promise<PolicyCheckResult> {
    const policies = await this.listPolicies(organizationId);
    // Use the most recently created active policy (listPolicies is desc).
    const policy = policies.find((p) => p.status === 'active') ?? policies[0];

    // If no policy exists, allow by default.
    if (!policy) return { allowed: true };

    const config = policy.config;

    // 1. Concurrent run count.
    const concurrentRuns = await safePrisma(() =>
      prisma.automationRun.count({
        where: {
          automationId,
          status: 'running',
        },
      }),
    0);

    if (concurrentRuns >= config.maxConcurrentRuns) {
      return { allowed: false, reason: 'max_concurrent_runs_exceeded' };
    }

    // 2. Hourly run limit.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const runsLastHour = await safePrisma(() =>
      prisma.automationRun.count({
        where: { automationId, startedAt: { gte: oneHourAgo } },
      }),
    0);

    if (runsLastHour >= config.maxRunsPerHour) {
      return { allowed: false, reason: 'hourly_rate_limit_exceeded' };
    }

    // 3. Daily run limit.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const runsLastDay = await safePrisma(() =>
      prisma.automationRun.count({
        where: { automationId, startedAt: { gte: oneDayAgo } },
      }),
    0);

    if (runsLastDay >= config.maxRunsPerDay) {
      return { allowed: false, reason: 'daily_rate_limit_exceeded' };
    }

    // 4. Action allowlist / blocklist.
    const automation = await safePrisma(() =>
      prisma.automation.findUnique({
        where: { id: automationId },
        select: { definition: true },
      }),
    null);

    if (automation?.definition) {
      let actions: { type?: string }[] = [];
      try {
        const def = JSON.parse(automation.definition) as { actions?: { type?: string }[] };
        actions = Array.isArray(def.actions) ? def.actions : [];
      } catch {
        // ignore parse errors
      }

      for (const a of actions) {
        const type = a.type ?? '';
        if (config.blockedActions.length > 0 && config.blockedActions.includes(type)) {
          return { allowed: false, reason: `action_blocked:${type}` };
        }
        if (config.enabledActions.length > 0 && !config.enabledActions.includes(type)) {
          return { allowed: false, reason: `action_not_allowed:${type}` };
        }
      }
    }

    return { allowed: true };
  },

  /**
   * Summary of policies and current usage for an organization.
   */
  async getPolicySummary(organizationId: string): Promise<PolicySummary> {
    const policies = await this.listPolicies(organizationId);
    const active = policies.filter((p) => p.status === 'active').length;

    // Current usage across all automations in the org.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [currentConcurrentRuns, runsLastHour, runsLastDay] = await Promise.all([
      safePrisma(() =>
        prisma.automationRun.count({
          where: { status: 'running', automation: { workspace: { organizationId } } },
        }),
      0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: { startedAt: { gte: oneHourAgo }, automation: { workspace: { organizationId } } },
        }),
      0),
      safePrisma(() =>
        prisma.automationRun.count({
          where: { startedAt: { gte: oneDayAgo }, automation: { workspace: { organizationId } } },
        }),
      0),
    ]);

    return {
      total: policies.length,
      active,
      currentConcurrentRuns,
      runsLastHour,
      runsLastDay,
      policies,
    };
  },
};
