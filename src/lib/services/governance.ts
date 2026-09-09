import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PolicyType =
  | 'operational'
  | 'financial'
  | 'security'
  | 'privacy'
  | 'data_retention'
  | 'approval'
  | 'spending';

export type PolicyStatus = 'active' | 'draft' | 'archived' | 'superseded';

export type CheckStatus = 'pending' | 'passed' | 'failed' | 'warning' | 'not_applicable';

export type CheckSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ComplianceCheckType =
  | 'token_security'
  | 'workspace_isolation'
  | 'audit_coverage'
  | 'data_retention';

export interface PolicyRecord {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  version: number;
  rules: string;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceCheckRecord {
  id: string;
  organizationId: string;
  workspaceId: string | null;
  policyId: string | null;
  checkName: string;
  description: string | null;
  status: string;
  severity: string;
  details: string;
  remediation: string | null;
  checkedAt: Date;
  createdAt: Date;
}

export interface RetentionRuleRecord {
  id: string;
  organizationId: string;
  dataType: string;
  retentionDays: number;
  action: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyInput {
  workspaceId?: string | null;
  title: string;
  description?: string | null;
  type?: PolicyType;
  status?: PolicyStatus;
  rules?: unknown[];
  effectiveFrom?: Date;
  effectiveUntil?: Date | null;
  createdBy?: string | null;
}

export interface PolicyUpdateInput {
  workspaceId?: string | null;
  title?: string;
  description?: string | null;
  type?: PolicyType;
  status?: PolicyStatus;
  rules?: unknown[];
  effectiveFrom?: Date;
  effectiveUntil?: Date | null;
}

export interface CheckInput {
  workspaceId?: string | null;
  policyId?: string | null;
  checkName: string;
  description?: string | null;
  status?: CheckStatus;
  severity?: CheckSeverity;
  details?: Record<string, unknown>;
  remediation?: string | null;
}

export interface CheckUpdateInput {
  status?: CheckStatus;
  severity?: CheckSeverity;
  details?: Record<string, unknown>;
  remediation?: string | null;
}

export interface RetentionRuleInput {
  dataType: string;
  retentionDays?: number;
  action?: string;
  enabled?: boolean;
}

export interface RetentionRuleUpdateInput {
  retentionDays?: number;
  action?: string;
  enabled?: boolean;
}

export interface ListPoliciesOpts {
  type?: PolicyType;
  status?: PolicyStatus;
  workspaceId?: string;
  limit?: number;
}

export interface ListChecksOpts {
  status?: CheckStatus;
  severity?: CheckSeverity;
  workspaceId?: string;
  limit?: number;
}

export interface CheckResult {
  status: CheckStatus;
  details: Record<string, unknown>;
  remediation?: string | null;
}

export interface ComplianceSummary {
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
  total: number;
  passRate: number;
}

export interface RetentionItem {
  dataType: string;
  ruleId: string;
  retentionDays: number;
  action: string;
  count: number;
  oldestDate: Date | null;
}

export interface GovernanceDashboard {
  policies: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
  compliance: ComplianceSummary;
  retention: {
    rulesCount: number;
    itemsNeedingAction: number;
    items: RetentionItem[];
  };
  recentAudit: Array<{
    id: string;
    action: string;
    createdAt: Date;
  }>;
}

const VALID_POLICY_TYPES: PolicyType[] = [
  'operational',
  'financial',
  'security',
  'privacy',
  'data_retention',
  'approval',
  'spending',
];

const VALID_POLICY_STATUSES: PolicyStatus[] = ['active', 'draft', 'archived', 'superseded'];

const VALID_CHECK_STATUSES: CheckStatus[] = [
  'pending',
  'passed',
  'failed',
  'warning',
  'not_applicable',
];

const VALID_CHECK_SEVERITIES: CheckSeverity[] = ['low', 'medium', 'high', 'critical'];

function isEncryptedToken(token: string): boolean {
  return token.startsWith('v2:') || token.startsWith('plain:');
}

// ── Governance Service ──

export const GovernanceService = {
  // ── Policies ──

  /**
   * List policies for an organization, optionally filtered by type/status/workspace.
   */
  async listPolicies(organizationId: string, opts?: ListPoliciesOpts): Promise<PolicyRecord[]> {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.type) where.type = opts.type;
    if (opts?.status) where.status = opts.status;
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    return safePrisma(
      () =>
        prisma.policy.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: opts?.limit ?? 50,
        }) as Promise<PolicyRecord[]>,
      [] as PolicyRecord[],
    );
  },

  /**
   * Get a single policy by ID.
   */
  async getPolicy(id: string): Promise<PolicyRecord | null> {
    return safePrisma(
      () => prisma.policy.findUnique({ where: { id } }) as Promise<PolicyRecord | null>,
      null,
    );
  },

  /**
   * Create a new policy.
   */
  async createPolicy(organizationId: string, input: PolicyInput): Promise<PolicyRecord | null> {
    const type = input.type && VALID_POLICY_TYPES.includes(input.type) ? input.type : 'operational';
    const status =
      input.status && VALID_POLICY_STATUSES.includes(input.status) ? input.status : 'active';
    try {
      return (await prisma.policy.create({
        data: {
          organizationId,
          workspaceId: input.workspaceId || null,
          title: input.title,
          description: input.description || null,
          type,
          status,
          rules: input.rules ? JSON.stringify(input.rules) : '[]',
          effectiveFrom: input.effectiveFrom || new Date(),
          effectiveUntil: input.effectiveUntil || null,
          createdBy: input.createdBy || null,
        },
      })) as PolicyRecord;
    } catch {
      return null;
    }
  },

  /**
   * Update a policy. Increments the version number on each update.
   */
  async updatePolicy(id: string, input: PolicyUpdateInput): Promise<PolicyRecord | null> {
    const existing = await this.getPolicy(id);
    if (!existing) return null;

    const data: Record<string, unknown> = { version: { increment: 1 } };
    if (input.workspaceId !== undefined) data.workspaceId = input.workspaceId || null;
    if (input.title !== undefined) data.title = input.title;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.type !== undefined && VALID_POLICY_TYPES.includes(input.type)) data.type = input.type;
    if (input.status !== undefined && VALID_POLICY_STATUSES.includes(input.status))
      data.status = input.status;
    if (input.rules !== undefined) data.rules = JSON.stringify(input.rules);
    if (input.effectiveFrom !== undefined) data.effectiveFrom = input.effectiveFrom;
    if (input.effectiveUntil !== undefined) data.effectiveUntil = input.effectiveUntil || null;

    try {
      return (await prisma.policy.update({ where: { id }, data })) as PolicyRecord;
    } catch {
      return null;
    }
  },

  /**
   * Archive a policy (set status to 'archived').
   */
  async archivePolicy(id: string): Promise<PolicyRecord | null> {
    try {
      return (await prisma.policy.update({
        where: { id },
        data: { status: 'archived', version: { increment: 1 } },
      })) as PolicyRecord;
    } catch {
      return null;
    }
  },

  // ── Compliance Checks ──

  /**
   * List compliance checks for an organization.
   */
  async listChecks(organizationId: string, opts?: ListChecksOpts): Promise<ComplianceCheckRecord[]> {
    const where: Record<string, unknown> = { organizationId };
    if (opts?.status) where.status = opts.status;
    if (opts?.severity) where.severity = opts.severity;
    if (opts?.workspaceId) where.workspaceId = opts.workspaceId;
    return safePrisma(
      () =>
        prisma.complianceCheck.findMany({
          where,
          orderBy: { checkedAt: 'desc' },
          take: opts?.limit ?? 50,
        }) as Promise<ComplianceCheckRecord[]>,
      [] as ComplianceCheckRecord[],
    );
  },

  /**
   * Create a compliance check record.
   */
  async createCheck(organizationId: string, input: CheckInput): Promise<ComplianceCheckRecord | null> {
    const status =
      input.status && VALID_CHECK_STATUSES.includes(input.status) ? input.status : 'pending';
    const severity =
      input.severity && VALID_CHECK_SEVERITIES.includes(input.severity) ? input.severity : 'medium';
    try {
      return (await prisma.complianceCheck.create({
        data: {
          organizationId,
          workspaceId: input.workspaceId || null,
          policyId: input.policyId || null,
          checkName: input.checkName,
          description: input.description || null,
          status,
          severity,
          details: input.details ? JSON.stringify(input.details) : '{}',
          remediation: input.remediation || null,
        },
      })) as ComplianceCheckRecord;
    } catch {
      return null;
    }
  },

  /**
   * Update a compliance check's status and details.
   */
  async updateCheck(id: string, input: CheckUpdateInput): Promise<ComplianceCheckRecord | null> {
    const data: Record<string, unknown> = { checkedAt: new Date() };
    if (input.status !== undefined && VALID_CHECK_STATUSES.includes(input.status))
      data.status = input.status;
    if (input.severity !== undefined && VALID_CHECK_SEVERITIES.includes(input.severity))
      data.severity = input.severity;
    if (input.details !== undefined) data.details = JSON.stringify(input.details);
    if (input.remediation !== undefined) data.remediation = input.remediation || null;
    try {
      return (await prisma.complianceCheck.update({ where: { id }, data })) as ComplianceCheckRecord;
    } catch {
      return null;
    }
  },

  /**
   * Run a specific compliance check by type.
   * Returns { status, details, remediation? }.
   */
  async runComplianceCheck(
    organizationId: string,
    checkType: ComplianceCheckType,
  ): Promise<CheckResult> {
    switch (checkType) {
      case 'token_security':
        return this._checkTokenSecurity(organizationId);
      case 'workspace_isolation':
        return this._checkWorkspaceIsolation(organizationId);
      case 'audit_coverage':
        return this._checkAuditCoverage(organizationId);
      case 'data_retention':
        return this._checkDataRetention(organizationId);
      default:
        return {
          status: 'not_applicable',
          details: { checkType, message: 'Unknown check type' },
        };
    }
  },

  /**
   * Check that all PlatformConnection tokens are encrypted.
   */
  async _checkTokenSecurity(organizationId: string): Promise<CheckResult> {
    // PlatformConnection is user-scoped, not org-scoped. We check all connections
    // for users belonging to this organization's workspaces.
    const workspaces = await safePrisma(
      () =>
        prisma.workspace.findMany({
          where: { organizationId },
          select: { id: true },
        }) as Promise<Array<{ id: string }>>,
      [] as Array<{ id: string }>,
    );

    const workspaceIds = workspaces.map((w) => w.id);
    if (workspaceIds.length === 0) {
      return {
        status: 'not_applicable',
        details: { message: 'No workspaces found for organization' },
      };
    }

    // Get memberships to find user IDs, then check their connections
    const memberships = await safePrisma(
      () =>
        prisma.membership.findMany({
          where: { workspaceId: { in: workspaceIds } },
          select: { userId: true },
          distinct: ['userId'],
        }) as Promise<Array<{ userId: string }>>,
      [] as Array<{ userId: string }>,
    );

    const userIds = memberships.map((m) => m.userId);
    if (userIds.length === 0) {
      return {
        status: 'passed',
        details: { total: 0, plaintext: 0, message: 'No platform connections to check' },
      };
    }

    const connections = await safePrisma(
      () =>
        prisma.platformConnection.findMany({
          where: { userId: { in: userIds } },
          select: { id: true, platform: true, accessToken: true },
        }) as Promise<Array<{ id: string; platform: string; accessToken: string }>>,
      [] as Array<{ id: string; platform: string; accessToken: string }>,
    );

    const plaintext = connections.filter((c) => !isEncryptedToken(c.accessToken));
    if (plaintext.length === 0) {
      return {
        status: 'passed',
        details: { total: connections.length, plaintext: 0, message: 'All tokens encrypted' },
      };
    }
    return {
      status: 'failed',
      details: {
        total: connections.length,
        plaintext: plaintext.length,
        platforms: plaintext.map((c) => c.platform),
      },
      remediation: `${plaintext.length} platform connection(s) have plaintext tokens. Run token migration to encrypt them.`,
    };
  },

  /**
   * Check workspace isolation — verify that workspaces have quota limits set.
   */
  async _checkWorkspaceIsolation(organizationId: string): Promise<CheckResult> {
    const workspaces = await safePrisma(
      () =>
        prisma.workspace.findMany({
          where: { organizationId },
          select: { id: true, name: true },
        }) as Promise<Array<{ id: string; name: string }>>,
      [] as Array<{ id: string; name: string }>,
    );

    if (workspaces.length === 0) {
      return {
        status: 'not_applicable',
        details: { message: 'No workspaces found' },
      };
    }

    const workspaceIds = workspaces.map((w) => w.id);
    const quotas = await safePrisma(
      () =>
        prisma.workspaceQuota.findMany({
          where: { workspaceId: { in: workspaceIds } },
          select: { workspaceId: true },
        }) as Promise<Array<{ workspaceId: string }>>,
      [] as Array<{ workspaceId: string }>,
    );

    const quotaWorkspaceIds = new Set(quotas.map((q) => q.workspaceId));
    const missing = workspaces.filter((w) => !quotaWorkspaceIds.has(w.id));

    if (missing.length === 0) {
      return {
        status: 'passed',
        details: { total: workspaces.length, missingQuotas: 0, message: 'All workspaces have quotas' },
      };
    }
    return {
      status: 'warning',
      details: {
        total: workspaces.length,
        missingQuotas: missing.length,
        workspaces: missing.map((w) => w.name),
      },
      remediation: `${missing.length} workspace(s) are missing quota limits. Set workspace quotas to enforce isolation.`,
    };
  },

  /**
   * Check audit coverage — verify recent audit events exist.
   */
  async _checkAuditCoverage(organizationId: string): Promise<CheckResult> {
    const workspaces = await safePrisma(
      () =>
        prisma.workspace.findMany({
          where: { organizationId },
          select: { id: true },
        }) as Promise<Array<{ id: string }>>,
      [] as Array<{ id: string }>,
    );

    const workspaceIds = workspaces.map((w) => w.id);
    if (workspaceIds.length === 0) {
      return {
        status: 'not_applicable',
        details: { message: 'No workspaces found' },
      };
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
    const recentAudit = await safePrisma(
      () =>
        prisma.auditEvent.findMany({
          where: { workspaceId: { in: workspaceIds }, createdAt: { gte: since } },
          select: { id: true, action: true },
          take: 100,
        }) as Promise<Array<{ id: string; action: string }>>,
      [] as Array<{ id: string; action: string }>,
    );

    if (recentAudit.length === 0) {
      return {
        status: 'warning',
        details: { recentCount: 0, message: 'No audit events in the last 24 hours' },
        remediation: 'No audit events recorded in the last 24 hours. Verify audit logging is active.',
      };
    }
    return {
      status: 'passed',
      details: { recentCount: recentAudit.length, message: 'Audit events present' },
    };
  },

  /**
   * Check data retention — verify no data exceeds retention rules.
   */
  async _checkDataRetention(organizationId: string): Promise<CheckResult> {
    const items = await this.checkRetention(organizationId);
    if (items.length === 0) {
      return {
        status: 'passed',
        details: { itemsNeedingAction: 0, message: 'No data exceeds retention periods' },
      };
    }
    return {
      status: 'warning',
      details: {
        itemsNeedingAction: items.length,
        items: items.map((i) => ({ dataType: i.dataType, count: i.count })),
      },
      remediation: `${items.length} data type(s) have records exceeding retention periods. Review and archive/delete.`,
    };
  },

  /**
   * Run all compliance checks and create records for each.
   */
  async runAllChecks(organizationId: string): Promise<ComplianceCheckRecord[]> {
    const checkTypes: ComplianceCheckType[] = [
      'token_security',
      'workspace_isolation',
      'audit_coverage',
      'data_retention',
    ];
    const results: ComplianceCheckRecord[] = [];
    for (const checkType of checkTypes) {
      const result = await this.runComplianceCheck(organizationId, checkType);
      const severity: CheckSeverity =
        result.status === 'failed' ? 'high' : result.status === 'warning' ? 'medium' : 'low';
      const record = await this.createCheck(organizationId, {
        checkName: checkType,
        description: `Automated compliance check: ${checkType}`,
        status: result.status,
        severity,
        details: result.details,
        remediation: result.remediation || null,
      });
      if (record) results.push(record);
    }
    return results;
  },

  /**
   * Get a compliance summary: counts by status, by severity, pass rate.
   */
  async getComplianceSummary(organizationId: string): Promise<ComplianceSummary> {
    const checks = await safePrisma(
      () =>
        prisma.complianceCheck.findMany({
          where: { organizationId },
          orderBy: { checkedAt: 'desc' },
          take: 200,
        }) as Promise<ComplianceCheckRecord[]>,
      [] as ComplianceCheckRecord[],
    );

    const byStatus: Record<string, number> = {
      pending: 0,
      passed: 0,
      failed: 0,
      warning: 0,
      not_applicable: 0,
    };
    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const c of checks) {
      if (byStatus[c.status] !== undefined) byStatus[c.status]++;
      if (bySeverity[c.severity] !== undefined) bySeverity[c.severity]++;
    }

    const total = checks.length;
    const evaluated = total - byStatus.pending - byStatus.not_applicable;
    const passRate = evaluated > 0 ? Math.round((byStatus.passed / evaluated) * 100) : 0;

    return { byStatus, bySeverity, total, passRate };
  },

  // ── Retention Rules ──

  /**
   * List retention rules for an organization.
   */
  async listRetentionRules(organizationId: string): Promise<RetentionRuleRecord[]> {
    return safePrisma(
      () =>
        prisma.retentionRule.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
        }) as Promise<RetentionRuleRecord[]>,
      [] as RetentionRuleRecord[],
    );
  },

  /**
   * Create a retention rule.
   */
  async createRetentionRule(
    organizationId: string,
    input: RetentionRuleInput,
  ): Promise<RetentionRuleRecord | null> {
    const validActions = ['archive', 'delete', 'anonymize'];
    const action = input.action && validActions.includes(input.action) ? input.action : 'archive';
    const retentionDays = input.retentionDays ?? 365;
    try {
      return (await prisma.retentionRule.create({
        data: {
          organizationId,
          dataType: input.dataType,
          retentionDays,
          action,
          enabled: input.enabled ?? true,
        },
      })) as RetentionRuleRecord;
    } catch {
      return null;
    }
  },

  /**
   * Update a retention rule.
   */
  async updateRetentionRule(
    id: string,
    input: RetentionRuleUpdateInput,
  ): Promise<RetentionRuleRecord | null> {
    const data: Record<string, unknown> = {};
    if (input.retentionDays !== undefined) data.retentionDays = input.retentionDays;
    if (input.action !== undefined) data.action = input.action;
    if (input.enabled !== undefined) data.enabled = input.enabled;
    try {
      return (await prisma.retentionRule.update({ where: { id }, data })) as RetentionRuleRecord;
    } catch {
      return null;
    }
  },

  /**
   * Check for data exceeding retention periods.
   * Returns a list of items needing action (archive/delete/anonymize).
   */
  async checkRetention(organizationId: string): Promise<RetentionItem[]> {
    const rules = await this.listRetentionRules(organizationId);
    const enabledRules = rules.filter((r) => r.enabled);
    if (enabledRules.length === 0) return [];

    const items: RetentionItem[] = [];
    const now = new Date();

    for (const rule of enabledRules) {
      const cutoff = new Date(now.getTime() - rule.retentionDays * 24 * 60 * 60 * 1000);
      const count = await this._countOldRecords(organizationId, rule.dataType, cutoff);
      if (count > 0) {
        items.push({
          dataType: rule.dataType,
          ruleId: rule.id,
          retentionDays: rule.retentionDays,
          action: rule.action,
          count,
          oldestDate: null,
        });
      }
    }
    return items;
  },

  /**
   * Count records older than the cutoff for a given data type.
   */
  async _countOldRecords(
    organizationId: string,
    dataType: string,
    cutoff: Date,
  ): Promise<number> {
    // Map data types to their Prisma models and date fields.
    // All use organizationId or workspaceId (via org's workspaces) as the scope.
    const workspaces = await safePrisma(
      () =>
        prisma.workspace.findMany({
          where: { organizationId },
          select: { id: true },
        }) as Promise<Array<{ id: string }>>,
      [] as Array<{ id: string }>,
    );
    const workspaceIds = workspaces.map((w) => w.id);

    switch (dataType) {
      case 'audit_events': {
        const records = await safePrisma(
          () =>
            prisma.auditEvent.findMany({
              where: { workspaceId: { in: workspaceIds }, createdAt: { lt: cutoff } },
              select: { id: true },
            }) as Promise<Array<{ id: string }>>,
          [] as Array<{ id: string }>,
        );
        return records.length;
      }
      case 'events': {
        const records = await safePrisma(
          () =>
            prisma.event.findMany({
              where: { organizationId, createdAt: { lt: cutoff } },
              select: { id: true },
            }) as Promise<Array<{ id: string }>>,
          [] as Array<{ id: string }>,
        );
        return records.length;
      }
      case 'tickets': {
        const records = await safePrisma(
          () =>
            prisma.ticket.findMany({
              where: { organizationId, createdAt: { lt: cutoff } },
              select: { id: true },
            }) as Promise<Array<{ id: string }>>,
          [] as Array<{ id: string }>,
        );
        return records.length;
      }
      case 'sandbox_runs': {
        const records = await safePrisma(
          () =>
            prisma.sandboxRun.findMany({
              where: { workspaceId: { in: workspaceIds }, createdAt: { lt: cutoff } },
              select: { id: true },
            }) as Promise<Array<{ id: string }>>,
          [] as Array<{ id: string }>,
        );
        return records.length;
      }
      default:
        // Unsupported data type — no records to count
        return 0;
    }
  },

  // ── Dashboard ──

  /**
   * Get a combined governance dashboard: policies count, compliance summary,
   * retention status, and recent audit events.
   */
  async getGovernanceDashboard(organizationId: string): Promise<GovernanceDashboard> {
    const [policies, compliance, retentionItems, retentionRules, workspaces] = await Promise.all([
      this.listPolicies(organizationId, { limit: 200 }),
      this.getComplianceSummary(organizationId),
      this.checkRetention(organizationId),
      this.listRetentionRules(organizationId),
      safePrisma(
        () =>
          prisma.workspace.findMany({
            where: { organizationId },
            select: { id: true },
          }) as Promise<Array<{ id: string }>>,
        [] as Array<{ id: string }>,
      ),
    ]);

    const active = policies.filter((p) => p.status === 'active').length;
    const draft = policies.filter((p) => p.status === 'draft').length;
    const archived = policies.filter((p) => p.status === 'archived').length;

    const workspaceIds = workspaces.map((w) => w.id);
    const recentAudit = await safePrisma(
      () =>
        prisma.auditEvent.findMany({
          where: { workspaceId: { in: workspaceIds } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, action: true, createdAt: true },
        }) as Promise<Array<{ id: string; action: string; createdAt: Date }>>,
      [] as Array<{ id: string; action: string; createdAt: Date }>,
    );

    return {
      policies: {
        total: policies.length,
        active,
        draft,
        archived,
      },
      compliance,
      retention: {
        rulesCount: retentionRules.length,
        itemsNeedingAction: retentionItems.length,
        items: retentionItems,
      },
      recentAudit: recentAudit.map((a) => ({
        id: a.id,
        action: a.action,
        createdAt: a.createdAt,
      })),
    };
  },
};
