/**
 * Plan-based feature limits for the Lazynext OS platform.
 *
 * Plans are inferred from credit purchase history (see src/lib/plan-tier.ts).
 * These limits are enforced by the planGuard middleware below.
 */

import type { PlanTier } from '@/lib/plan-tier';

export interface PlanLimits {
  /** Maximum number of projects per workspace */
  maxProjects: number;
  /** Maximum number of documents per workspace */
  maxDocuments: number;
  /** Maximum number of automations per workspace */
  maxAutomations: number;
  /** Maximum number of agents per workspace */
  maxAgents: number;
  /** Maximum file upload size in bytes */
  maxFileUploadBytes: number;
  /** Maximum number of files per workspace */
  maxFiles: number;
  /** Whether API key creation is allowed */
  apiAccess: boolean;
  /** Whether MCP access is allowed */
  mcpAccess: boolean;
  /** Monthly AI generation credit cap (0 = unlimited) */
  monthlyCreditCap: number;
  /** Whether team members can be invited */
  teamInvites: boolean;
  /** Maximum team members */
  maxMembers: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    maxProjects: 3,
    maxDocuments: 10,
    maxAutomations: 2,
    maxAgents: 1,
    maxFileUploadBytes: 5 * 1024 * 1024, // 5 MB
    maxFiles: 20,
    apiAccess: false,
    mcpAccess: false,
    monthlyCreditCap: 50,
    teamInvites: false,
    maxMembers: 1,
  },
  starter: {
    maxProjects: 10,
    maxDocuments: 50,
    maxAutomations: 10,
    maxAgents: 3,
    maxFileUploadBytes: 10 * 1024 * 1024, // 10 MB
    maxFiles: 100,
    apiAccess: true,
    mcpAccess: true,
    monthlyCreditCap: 200,
    teamInvites: true,
    maxMembers: 5,
  },
  pro: {
    maxProjects: 50,
    maxDocuments: 200,
    maxAutomations: 50,
    maxAgents: 10,
    maxFileUploadBytes: 25 * 1024 * 1024, // 25 MB
    maxFiles: 500,
    apiAccess: true,
    mcpAccess: true,
    monthlyCreditCap: 1000,
    teamInvites: true,
    maxMembers: 20,
  },
  elite: {
    maxProjects: -1, // unlimited
    maxDocuments: -1,
    maxAutomations: -1,
    maxAgents: -1,
    maxFileUploadBytes: 100 * 1024 * 1024, // 100 MB
    maxFiles: -1,
    apiAccess: true,
    mcpAccess: true,
    monthlyCreditCap: 0, // unlimited
    teamInvites: true,
    maxMembers: -1,
  },
};

export function getPlanLimits(tier: PlanTier): PlanLimits {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
}

/**
 * Check if a count is within the plan limit.
 * A limit of -1 means unlimited.
 */
export function withinLimit(currentCount: number, limit: number): boolean {
  if (limit === -1) return true;
  return currentCount < limit;
}

/**
 * Get a human-readable description of a plan tier.
 */
export const PLAN_DESCRIPTIONS: Record<PlanTier, { label: string; description: string; priceUsd: number }> = {
  free: { label: 'Free', description: 'For individuals getting started', priceUsd: 0 },
  starter: { label: 'Starter', description: 'For solo creators and small projects', priceUsd: 9 },
  pro: { label: 'Pro', description: 'For growing teams and power users', priceUsd: 39 },
  elite: { label: 'Elite', description: 'For agencies and enterprises', priceUsd: 99 },
};
