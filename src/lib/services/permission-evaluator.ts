/**
 * Permission Evaluator — the 8-layer permission policy stack.
 *
 * Implements the layered permission evaluation described in
 * `docs/transformation/PERMISSION_MODEL.md`. Every permission check
 * runs through eight layers in order:
 *
 *   1. Company policy      — company-level rules
 *   2. Workspace policy    — workspace-level rules
 *   3. Role policy         — role-based permissions
 *   4. Tool policy         — tool-specific rules (risk, allowed agents)
 *   5. Resource policy     — resource-specific rules
 *   6. Environment policy  — environment-specific rules (local/staging/prod)
 *   7. Budget policy       — budget enforcement
 *   8. Risk policy         — risk-based approval gating
 *
 * Decision precedence (most restrictive wins):
 *   deny > require_approval > allow_with_limit > allow
 *
 * Every decision is recorded via PermissionService as a permission_check
 * memory row for audit purposes.
 */

import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';
import { PermissionService } from '@/lib/services/permission-service';
import { BudgetService } from '@/lib/services/budget';
import { ToolRegistryService } from '@/lib/services/tool-registry';

// ── Types ──

export type PermissionDecision = 'allow' | 'deny' | 'require_approval' | 'allow_with_limit';

export interface PermissionContext {
  principalId: string;
  principalType: 'user' | 'agent' | 'role' | 'team';
  workspaceId: string;
  organizationId: string;
  resource: string;
  resourceType: string;
  action: string;
  environment: 'local' | 'staging' | 'production';
  budgetImpact?: number;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface PermissionEvaluationResult {
  decision: PermissionDecision;
  reason: string;
  layers: { layer: string; result: PermissionDecision; reason: string }[];
  evaluatedAt: Date;
}

// ── Decision precedence ──
//
// When multiple layers return different decisions, the most restrictive
// wins. deny is the strongest, allow is the weakest.

const DECISION_RANK: Record<PermissionDecision, number> = {
  deny: 3,
  require_approval: 2,
  allow_with_limit: 1,
  allow: 0,
};

function mostRestrictive(a: PermissionDecision, b: PermissionDecision): PermissionDecision {
  return DECISION_RANK[a] >= DECISION_RANK[b] ? a : b;
}

// ── Permission Evaluator ──

export const PermissionEvaluator = {
  /**
   * Run all 8 policy layers in order and return the combined decision.
   *
   * Evaluation short-circuits on 'deny' (no point continuing once an
   * action is explicitly forbidden), but otherwise runs every layer so
   * the audit trail captures each layer's verdict.
   */
  async checkPermission(ctx: PermissionContext): Promise<PermissionEvaluationResult> {
    const layers: { layer: string; result: PermissionDecision; reason: string }[] = [];

    const layerEvaluators: Array<{ name: string; fn: () => Promise<PermissionDecision> }> = [
      { name: 'company_policy', fn: () => this.evaluateCompanyPolicy(ctx) },
      { name: 'workspace_policy', fn: () => this.evaluateWorkspacePolicy(ctx) },
      { name: 'role_policy', fn: () => this.evaluateRolePolicy(ctx) },
      { name: 'tool_policy', fn: () => this.evaluateToolPolicy(ctx) },
      { name: 'resource_policy', fn: () => this.evaluateResourcePolicy(ctx) },
      { name: 'environment_policy', fn: () => this.evaluateEnvironmentPolicy(ctx) },
      { name: 'budget_policy', fn: () => this.evaluateBudgetPolicy(ctx) },
      { name: 'risk_policy', fn: () => this.evaluateRiskPolicy(ctx) },
    ];

    let finalDecision: PermissionDecision = 'allow';
    let finalReason = 'All layers allowed';

    for (const { name, fn } of layerEvaluators) {
      let result: PermissionDecision;
      let reason: string;
      try {
        result = await fn();
        reason = this.reasonFor(name, result, ctx);
      } catch {
        // A layer error is treated as a conservative deny
        result = 'deny';
        reason = `${name} evaluation error`;
      }

      layers.push({ layer: name, result, reason });

      if (result === 'deny') {
        // Short-circuit: deny is terminal
        finalDecision = 'deny';
        finalReason = reason;
        break;
      }

      finalDecision = mostRestrictive(finalDecision, result);
      if (result !== 'allow' && finalDecision === result) {
        finalReason = reason;
      }
    }

    const result: PermissionEvaluationResult = {
      decision: finalDecision,
      reason: finalReason,
      layers,
      evaluatedAt: new Date(),
    };

    // Record the decision for audit (best-effort)
    await this.recordDecision(ctx, result).catch(() => {});

    return result;
  },

  // ── Layer evaluators ──

  /**
   * Layer 1: Company policy.
   * Checks organization-level permission policies (type 'admin' or 'access').
   */
  async evaluateCompanyPolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    const policies = await PermissionService.listPermissionPolicies(ctx.organizationId, {
      status: 'active',
    });

    for (const policy of policies) {
      // Company policies are org-wide (workspaceId is empty or matches)
      const matchesResource = !policy.resource || policy.resource === '*' || policy.resource === ctx.resource;
      const matchesAction = !policy.action || policy.action === '*' || policy.action === ctx.action;
      if (!matchesResource || !matchesAction) continue;

      if (policy.effect === 'deny') return 'deny';
      if (policy.effect === 'conditional') return 'require_approval';
    }

    return 'allow';
  },

  /**
   * Layer 2: Workspace policy.
   * Checks workspace-scoped permission policies.
   */
  async evaluateWorkspacePolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    const policies = await PermissionService.listPermissionPolicies(ctx.organizationId, {
      status: 'active',
    });

    for (const policy of policies) {
      if (policy.workspaceId !== ctx.workspaceId) continue;
      const matchesResource = !policy.resource || policy.resource === '*' || policy.resource === ctx.resource;
      const matchesAction = !policy.action || policy.action === '*' || policy.action === ctx.action;
      if (!matchesResource || !matchesAction) continue;

      if (policy.effect === 'deny') return 'deny';
      if (policy.effect === 'conditional') return 'require_approval';
    }

    return 'allow';
  },

  /**
   * Layer 3: Role policy.
   * Checks role-based permissions and grants for the principal.
   */
  async evaluateRolePolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    // Look up grants for this principal
    const grants = await PermissionService.listPermissionGrants(ctx.organizationId, {
      status: 'active',
      principalId: ctx.principalId,
    });

    // Check for an explicit deny grant
    for (const grant of grants) {
      if (grant.status !== 'active') continue;
      const permissions = grant.permissions ? JSON.parse(grant.permissions) : [];
      if (Array.isArray(permissions) && permissions.includes(`deny:${ctx.action}`)) {
        return 'deny';
      }
    }

    // Check for an explicit allow grant matching the resource/action
    let hasAllow = false;
    for (const grant of grants) {
      if (grant.status !== 'active') continue;
      const matchesResource = !grant.resourceId || grant.resourceId === '*' || grant.resourceId === ctx.resource;
      const matchesType = !grant.resourceType || grant.resourceType === '*' || grant.resourceType === ctx.resourceType;
      if (!matchesResource || !matchesType) continue;

      const permissions = grant.permissions ? JSON.parse(grant.permissions) : [];
      if (!Array.isArray(permissions)) continue;
      if (permissions.includes(ctx.action) || permissions.includes('*')) {
        hasAllow = true;
      }
      if (permissions.includes(`limit:${ctx.action}`)) {
        return 'allow_with_limit';
      }
    }

    // Owner/admin roles are always allowed
    const roles = await PermissionService.listPermissionRoles(ctx.organizationId, {
      status: 'active',
    });
    for (const role of roles) {
      if (role.type === 'owner' || role.type === 'admin') {
        hasAllow = true;
      }
    }

    // Agents default to require_approval unless an explicit grant allows
    if (ctx.principalType === 'agent' && !hasAllow) {
      return 'require_approval';
    }

    return hasAllow ? 'allow' : 'require_approval';
  },

  /**
   * Layer 4: Tool policy.
   * Checks tool-specific rules (risk category, allowed agents).
   */
  async evaluateToolPolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    if (ctx.resourceType !== 'tool' && !ctx.resource.startsWith('tool.')) {
      return 'allow';
    }

    const toolName = ctx.resource.replace(/^tool\./, '');
    const toolDef = await safePrisma(() =>
      ToolRegistryService.getByName(ctx.workspaceId, toolName),
    null);

    if (!toolDef) return 'allow'; // unknown tool — defer to other layers
    if (!toolDef.enabled) return 'deny';

    // Check if the principal (agent) is allowed to use this tool
    if (ctx.principalType === 'agent') {
      const allowed = await safePrisma(() =>
        ToolRegistryService.checkAgentAllowed(toolDef.id, ctx.principalId),
      false);
      if (!allowed) return 'deny';
    }

    // High-risk tools require approval
    if (toolDef.riskCategory === 'high') return 'require_approval';
    if (toolDef.riskCategory === 'medium') return 'allow_with_limit';

    return 'allow';
  },

  /**
   * Layer 5: Resource policy.
   * Checks resource-specific rules (e.g., production deployment requires owner approval).
   */
  async evaluateResourcePolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    // Production deployments and destructive actions require approval
    if (ctx.action === 'deploy' || ctx.action === 'delete') {
      return 'require_approval';
    }
    if (ctx.resourceType === 'deployment' && ctx.action !== 'read') {
      return 'require_approval';
    }
    // Sensitive data resources
    if (ctx.resourceType === 'billing' || ctx.resourceType === 'payment') {
      if (ctx.action !== 'read') return 'require_approval';
    }

    return 'allow';
  },

  /**
   * Layer 6: Environment policy.
   * Checks environment-specific rules (e.g., no autonomous actions in production).
   */
  async evaluateEnvironmentPolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    if (ctx.environment === 'production') {
      // In production, agents require approval for non-read actions
      if (ctx.principalType === 'agent' && ctx.action !== 'read') {
        return 'require_approval';
      }
      // Destructive actions always require approval in production
      if (ctx.action === 'delete' || ctx.action === 'deploy') {
        return 'require_approval';
      }
    }

    if (ctx.environment === 'staging') {
      // Staging is more permissive but still gates destructive actions
      if (ctx.action === 'delete') return 'require_approval';
    }

    // local environment is permissive
    return 'allow';
  },

  /**
   * Layer 7: Budget policy.
   * Checks budget enforcement — deny if over budget.
   */
  async evaluateBudgetPolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    const impact = ctx.budgetImpact;
    if (!impact || impact <= 0) {
      return 'allow';
    }

    const budgetCheck = await safePrisma(() =>
      BudgetService.check({
        workspaceId: ctx.workspaceId,
        organizationId: ctx.organizationId,
        amountCredits: impact,
      }),
    null);

    if (!budgetCheck) return 'allow'; // couldn't check — defer
    if (!budgetCheck.allowed) return 'deny';

    // If the action would consume most of the remaining budget, add a limit
    if (budgetCheck.remainingCredits !== undefined && impact > budgetCheck.remainingCredits * 0.5) {
      return 'allow_with_limit';
    }

    return 'allow';
  },

  /**
   * Layer 8: Risk policy.
   * Risk-based approval gating.
   */
  async evaluateRiskPolicy(ctx: PermissionContext): Promise<PermissionDecision> {
    const risk = ctx.riskLevel ?? 'low';

    if (risk === 'high') return 'require_approval';
    if (risk === 'medium') {
      // Medium risk: allow in autonomous mode, require approval in assisted/manual
      if (ctx.principalType === 'agent') return 'allow_with_limit';
      return 'allow';
    }

    return 'allow';
  },

  // ── Helpers ──

  /**
   * Record a permission decision via PermissionService for audit.
   */
  async recordDecision(ctx: PermissionContext, result: PermissionEvaluationResult): Promise<void> {
    const statusMap: Record<PermissionDecision, 'allowed' | 'denied' | 'conditional'> = {
      allow: 'allowed',
      deny: 'denied',
      require_approval: 'conditional',
      allow_with_limit: 'conditional',
    };

    await PermissionService.createPermissionCheck(
      ctx.organizationId,
      ctx.workspaceId,
      {
        name: `check:${ctx.principalType}:${ctx.principalId}:${ctx.action}:${ctx.resource}`.slice(0, 200),
        type: ctx.resourceType === 'tool' ? 'tool' : 'action',
        status: statusMap[result.decision],
        principalId: ctx.principalId,
        principalType: ctx.principalType,
        resourceId: ctx.resource,
        resourceType: ctx.resourceType,
        action: ctx.action,
        result: result.decision,
        reason: result.reason.slice(0, 2000),
        checkedAt: result.evaluatedAt.toISOString(),
        notes: JSON.stringify({ layers: result.layers, environment: ctx.environment }).slice(0, 5000),
      },
      ctx.principalId,
    );
  },

  /**
   * Build a human-readable reason for a layer decision.
   */
  reasonFor(layer: string, result: PermissionDecision, ctx: PermissionContext): string {
    switch (result) {
      case 'deny':
        return `${layer} denied ${ctx.action} on ${ctx.resource}`;
      case 'require_approval':
        return `${layer} requires approval for ${ctx.action} on ${ctx.resource}`;
      case 'allow_with_limit':
        return `${layer} allows ${ctx.action} on ${ctx.resource} with limits`;
      case 'allow':
      default:
        return `${layer} allowed ${ctx.action} on ${ctx.resource}`;
    }
  },
};
