/**
 * Plan guard — checks plan limits before allowing an operation.
 * Used by internal CRUD APIs to enforce tier-based limits.
 */

import { prisma } from '@/lib/prisma';
import { getUserPlanTier } from '@/lib/plan-tier';
import { getPlanLimits, withinLimit, type PlanLimits } from '@/lib/plan-limits';

export interface PlanGuardResult {
  ok: boolean;
  limit?: number;
  current?: number;
  reason?: string;
  limits: PlanLimits;
  tier: string;
}

/**
 * Check if a workspace can create a new project.
 */
export async function canCreateProject(workspaceId: string, userId: string): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  const count = await prisma.project.count({ where: { workspaceId, deletedAt: null } });
  if (!withinLimit(count, limits.maxProjects)) {
    return { ok: false, limit: limits.maxProjects, current: count, reason: 'max_projects_reached', limits, tier };
  }
  return { ok: true, limits, tier };
}

/**
 * Check if a workspace can create a new document.
 */
export async function canCreateDocument(workspaceId: string, userId: string): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  const count = await prisma.document.count({ where: { workspaceId, deletedAt: null } });
  if (!withinLimit(count, limits.maxDocuments)) {
    return { ok: false, limit: limits.maxDocuments, current: count, reason: 'max_documents_reached', limits, tier };
  }
  return { ok: true, limits, tier };
}

/**
 * Check if a workspace can create a new automation.
 */
export async function canCreateAutomation(workspaceId: string, userId: string): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  const count = await prisma.automation.count({ where: { workspaceId } });
  if (!withinLimit(count, limits.maxAutomations)) {
    return { ok: false, limit: limits.maxAutomations, current: count, reason: 'max_automations_reached', limits, tier };
  }
  return { ok: true, limits, tier };
}

/**
 * Check if a workspace can create a new agent.
 */
export async function canCreateAgent(workspaceId: string, userId: string): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  const count = await prisma.agentDef.count({ where: { workspaceId } });
  if (!withinLimit(count, limits.maxAgents)) {
    return { ok: false, limit: limits.maxAgents, current: count, reason: 'max_agents_reached', limits, tier };
  }
  return { ok: true, limits, tier };
}

/**
 * Check if a workspace can upload a file of a given size.
 */
export async function canUploadFile(workspaceId: string, userId: string, fileSize: number): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  if (fileSize > limits.maxFileUploadBytes) {
    return { ok: false, limit: limits.maxFileUploadBytes, current: fileSize, reason: 'file_too_large', limits, tier };
  }
  const count = await prisma.fileStore.count({ where: { workspaceId, deletedAt: null } });
  if (!withinLimit(count, limits.maxFiles)) {
    return { ok: false, limit: limits.maxFiles, current: count, reason: 'max_files_reached', limits, tier };
  }
  return { ok: true, limits, tier };
}

/**
 * Check if a user can create API keys.
 */
export async function canCreateApiKey(userId: string): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  if (!limits.apiAccess) {
    return { ok: false, reason: 'api_access_requires_paid_plan', limits, tier };
  }
  return { ok: true, limits, tier };
}

/**
 * Check if a user can invite team members.
 */
export async function canInviteMembers(workspaceId: string, userId: string): Promise<PlanGuardResult> {
  const tier = await getUserPlanTier(userId);
  const limits = getPlanLimits(tier);
  if (!limits.teamInvites) {
    return { ok: false, reason: 'team_invites_require_paid_plan', limits, tier };
  }
  const count = await prisma.membership.count({ where: { workspaceId } });
  if (!withinLimit(count, limits.maxMembers)) {
    return { ok: false, limit: limits.maxMembers, current: count, reason: 'max_members_reached', limits, tier };
  }
  return { ok: true, limits, tier };
}
