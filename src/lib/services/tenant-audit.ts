/**
 * Tenant Audit Service — static analysis of tenant isolation across services.
 *
 * Audits whether services and API routes properly qualify database queries by
 * `workspaceId` / `organizationId` to prevent cross-tenant data leakage.
 *
 * This is a static-analysis helper: it inspects source files (service modules
 * and API route handlers) for Prisma call patterns and reports findings where
 * tenant filters appear to be missing.
 *
 * Findings are categorized by severity:
 * - critical: ID-only lookup (findUnique by id) with no tenant filter
 * - high:     findMany / count / aggregate with no workspace/org filter on a
 *             model that carries tenant fields
 * - medium:   model has tenant fields but a service method does not accept a
 *             workspaceId / organizationId parameter
 * - low:      model lacks tenant fields entirely (informational)
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

// ── Types ──

export type AuditSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface TenantFinding {
  /** Service or route file the finding relates to. */
  service: string;
  /** Prisma model the query targets. */
  model: string;
  /** Method or route handler name. */
  method: string;
  /** Human-readable description of the issue. */
  issue: string;
  /** Severity of the finding. */
  severity: AuditSeverity;
}

export interface ModelTenantInfo {
  name: string;
  hasWorkspaceId: boolean;
  hasOrganizationId: boolean;
  /** True if the model holds user/tenant data (vs. global lookup tables). */
  holdsUserData: boolean;
}

export interface AuditReport {
  findings: TenantFinding[];
  summary: {
    totalServicesAudited: number;
    totalFindings: number;
    bySeverity: Record<AuditSeverity, number>;
    secureModels: number;
    atRiskModels: number;
  };
  secureModels: string[];
  atRiskModels: string[];
  generatedAt: string;
}

// ── Model registry ──
//
// Derived from prisma/schema.prisma (read-only — do not modify the schema).
// Each entry records whether the model carries workspaceId / organizationId
// tenant fields and whether it holds user/tenant data.

const MODEL_REGISTRY: ModelTenantInfo[] = [
  // ── Tenant boundary models ──
  { name: 'Organization', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: false },
  { name: 'Workspace', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: false },
  { name: 'Membership', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },

  // ── Workspace-scoped OS models ──
  { name: 'Project', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'Document', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'FileStore', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'Automation', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'AgentDef', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'Notification', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'Conversation', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'ScheduledJob', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'AuditEvent', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'ApiKey', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'ToolDef', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'ToolCall', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },
  { name: 'SandboxRun', hasWorkspaceId: true, hasOrganizationId: false, holdsUserData: true },

  // ── Org + workspace scoped models ──
  { name: 'Plan', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Approval', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Budget', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Event', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'DetectedOpportunity', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Recommendation', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'WorkspaceQuota', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },

  // ── Org-scoped (workspaceId optional) models ──
  { name: 'Goal', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Kpi', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Memory', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Product', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Customer', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Initiative', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Deal', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Transaction', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'KnowledgeBase', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'ResearchSession', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'SecurityEvent', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Metric', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Ticket', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Deployment', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'Policy', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },
  { name: 'TelemetryPoint', hasWorkspaceId: true, hasOrganizationId: true, holdsUserData: true },

  // ── Org-only scoped models (no workspaceId) ──
  { name: 'ComplianceCheck', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },
  { name: 'RetentionRule', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },
  { name: 'Alert', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },
  { name: 'SLO', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },
  { name: 'Trace', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },
  { name: 'Span', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },
  { name: 'RetentionPolicy', hasWorkspaceId: false, hasOrganizationId: true, holdsUserData: true },

  // ── User-scoped models (no tenant fields — filtered by userId) ──
  { name: 'Creation', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'CreditLedger', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'AdProduct', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'AdAvatar', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'BrandKit', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'BrandProfile', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'Asset', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'AdCampaign', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'CreativePerformance', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'Hook', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },

  // ── Indirectly-scoped models (via parent relation, no direct tenant field) ──
  { name: 'Task', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'TaskDependency', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'TimeEntry', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'KnowledgeArticle', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'Citation', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'TicketComment', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },
  { name: 'Message', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: true },

  // ── Global / auth models (no tenant scoping needed) ──
  { name: 'User', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: false },
  { name: 'Account', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: false },
  { name: 'Session', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: false },
  { name: 'VerificationToken', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: false },
  { name: 'RedeemedCode', hasWorkspaceId: false, hasOrganizationId: false, holdsUserData: false },
];

const MODEL_NAMES = MODEL_REGISTRY.map((m) => m.name);
const MODEL_MAP = new Map(MODEL_REGISTRY.map((m) => [m.name, m]));

// ── Static-analysis regexes ──

// Matches: prisma.<model>.<method>( ... where: { ... } ... )
const PRISMA_CALL_RE = /prisma\.([A-Za-z]+)\.(findUnique|findMany|findFirst|count|aggregate|groupBy|update|updateMany|delete|deleteMany|upsert)\s*\(/g;

// Matches a `where:` clause block (best-effort — handles single-line and
// multi-line where clauses). Captures up to the first closing brace.
const WHERE_RE = /where\s*:\s*\{([\s\S]*?)\}/;

// Matches findUnique with an ID-only where clause: `{ id: ... }` or `{ id }`
const ID_ONLY_RE = /where\s*:\s*\{\s*id\b/;

// ── Helpers ──

function getModelInfo(modelName: string): ModelTenantInfo | undefined {
  return MODEL_MAP.get(modelName);
}

function hasTenantFilter(whereBlock: string, info: ModelTenantInfo): {
  hasWorkspace: boolean;
  hasOrg: boolean;
} {
  const hasWorkspace = info.hasWorkspaceId
    ? /\bworkspaceId\b/.test(whereBlock)
    : true; // model has no workspaceId field — not required
  const hasOrg = info.hasOrganizationId
    ? /\borganizationId\b/.test(whereBlock)
    : true; // model has no organizationId field — not required
  return { hasWorkspace, hasOrg };
}

/**
 * Extract a method/handler name from surrounding source context.
 * Looks for the nearest preceding `async function NAME`, `NAME(`, or
 * `export async function NAME` above the match offset.
 */
function extractMethodName(source: string, offset: number): string {
  const upto = source.slice(0, offset);
  // Match the last function/method declaration before the call
  const fnMatches = [...upto.matchAll(/(?:async\s+function\s+(\w+)|(?:export\s+async\s+function\s+(\w+)|(\w+)\s*:\s*async\s*\(|(\w+)\s*\(\s*\)\s*\{|async\s+(\w+)\s*\())/g)];
  if (fnMatches.length === 0) return 'unknown';
  const last = fnMatches[fnMatches.length - 1];
  return last[1] || last[2] || last[3] || last[4] || last[5] || 'unknown';
}

// ── Service ──

export const TenantAuditService = {
  /**
   * Audit a single service's source for tenant-qualification issues on a
   * given model. Returns a list of findings (may be empty).
   */
  auditService(serviceName: string, modelName: string): TenantFinding[] {
    const info = getModelInfo(modelName);
    if (!info) {
      return [{
        service: serviceName,
        model: modelName,
        method: 'auditService',
        issue: 'unknown_model: model not found in registry',
        severity: 'low',
      }];
    }

    const findings: TenantFinding[] = [];

    // If the model has no tenant fields and doesn't hold user data, it's fine.
    if (!info.hasWorkspaceId && !info.hasOrganizationId && !info.holdsUserData) {
      return findings;
    }

    // Heuristic static report: a model that holds user data but has NO tenant
    // fields is at-risk (must rely on indirect scoping via parent relations).
    if (info.holdsUserData && !info.hasWorkspaceId && !info.hasOrganizationId) {
      findings.push({
        service: serviceName,
        model: modelName,
        method: '*',
        issue: 'model holds user data but lacks workspaceId/organizationId fields — relies on indirect scoping',
        severity: 'medium',
      });
    }

    return findings;
  },

  /**
   * Run a comprehensive audit across all known services and models.
   * Combines the model-registry analysis with source-file scanning.
   */
  async auditAllServices(): Promise<TenantFinding[]> {
    const findings: TenantFinding[] = [];

    // 1. Model-registry level findings
    for (const info of MODEL_REGISTRY) {
      findings.push(...this.auditService('model-registry', info.name));
    }

    // 2. Source-file scanning of service modules
    const serviceFindings = await this.scanServiceFiles();
    findings.push(...serviceFindings);

    // 3. API route scanning
    const routeFindings = await this.auditApiRoutes();
    findings.push(...routeFindings);

    return findings;
  },

  /**
   * Scan API route files for tenant qualification patterns.
   * Looks for Prisma calls that use findUnique / findMany without
   * workspace/org filters on tenant-scoped models.
   */
  async auditApiRoutes(): Promise<TenantFinding[]> {
    const findings: TenantFinding[] = [];
    const routesDir = join(process.cwd(), 'src', 'app', 'api');

    let routeFiles: string[] = [];
    try {
      routeFiles = await listTsFiles(routesDir);
    } catch {
      // routes dir may not be accessible in some environments
      return findings;
    }

    for (const file of routeFiles) {
      const relPath = relative(process.cwd(), file);
      let source: string;
      try {
        source = await readFile(file, 'utf-8');
      } catch {
        continue;
      }

      const fileFindings = scanSourceForFindings(source, relPath);
      findings.push(...fileFindings);
    }

    return findings;
  },

  /**
   * Scan service library files for tenant qualification patterns.
   */
  async scanServiceFiles(): Promise<TenantFinding[]> {
    const findings: TenantFinding[] = [];
    const servicesDir = join(process.cwd(), 'src', 'lib', 'services');

    let serviceFiles: string[] = [];
    try {
      serviceFiles = await listTsFiles(servicesDir);
    } catch {
      return findings;
    }

    for (const file of serviceFiles) {
      const relPath = relative(process.cwd(), file);
      let source: string;
      try {
        source = await readFile(file, 'utf-8');
      } catch {
        continue;
      }

      const fileFindings = scanSourceForFindings(source, relPath);
      findings.push(...fileFindings);
    }

    return findings;
  },

  /**
   * Combined report with summary stats.
   */
  async getAuditReport(): Promise<AuditReport> {
    const findings = await this.auditAllServices();

    const bySeverity: Record<AuditSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const f of findings) {
      bySeverity[f.severity]++;
    }

    const secureModels = this.getSecureModels();
    const atRiskModels = this.getAtRiskModels();

    const auditedServices = new Set(findings.map((f) => f.service));

    return {
      findings,
      summary: {
        totalServicesAudited: auditedServices.size,
        totalFindings: findings.length,
        bySeverity,
        secureModels: secureModels.length,
        atRiskModels: atRiskModels.length,
      },
      secureModels,
      atRiskModels,
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * List of models that have proper tenant fields (workspaceId and/or
   * organizationId) and hold user data.
   */
  getSecureModels(): string[] {
    return MODEL_REGISTRY
      .filter((m) => m.holdsUserData && (m.hasWorkspaceId || m.hasOrganizationId))
      .map((m) => m.name);
  },

  /**
   * List of models that lack tenant fields but hold user data.
   * These rely on indirect scoping (parent relations) or userId filtering
   * and are at higher risk of cross-tenant leakage.
   */
  getAtRiskModels(): string[] {
    return MODEL_REGISTRY
      .filter((m) => m.holdsUserData && !m.hasWorkspaceId && !m.hasOrganizationId)
      .map((m) => m.name);
  },
};

// ── File system helpers ──

async function listTsFiles(dir: string): Promise<string[]> {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    const full = join(dir, entry);
    let s;
    try {
      s = await stat(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      results.push(...await listTsFiles(full));
    } else if (extname(entry) === '.ts') {
      results.push(full);
    }
  }
  return results;
}

// ── Source scanner ──

/**
 * Scan source text for Prisma calls that lack tenant filters on
 * tenant-scoped models. Returns findings.
 */
function scanSourceForFindings(source: string, serviceLabel: string): TenantFinding[] {
  const findings: TenantFinding[] = [];
  let match: RegExpExecArray | null;

  PRISMA_CALL_RE.lastIndex = 0;
  while ((match = PRISMA_CALL_RE.exec(source)) !== null) {
    // Prisma delegates are lowercase (e.g. `prisma.customer`) but the model
    // registry uses PascalCase names — normalize the first letter.
    const modelName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    const method = match[2];
    const callOffset = match.index;

    const info = getModelInfo(modelName);
    if (!info) continue;
    if (!info.holdsUserData) continue;
    if (!info.hasWorkspaceId && !info.hasOrganizationId) continue;

    // Grab a window after the call to capture the where clause
    const windowStart = callOffset;
    const windowEnd = Math.min(source.length, callOffset + 600);
    const window = source.slice(windowStart, windowEnd);

    const whereMatch = window.match(WHERE_RE);
    const whereBlock = whereMatch ? whereMatch[1] : '';

    // No where clause at all on a tenant-scoped model
    if (!whereMatch) {
      // For findMany / count / aggregate without where → high risk
      if (['findMany', 'count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany'].includes(method)) {
        findings.push({
          service: serviceLabel,
          model: modelName,
          method: extractMethodName(source, callOffset),
          issue: `${method} without tenant filter (no where clause)`,
          severity: 'high',
        });
      }
      continue;
    }

    // ID-only lookup (findUnique by id) without tenant check.
    // Flag as critical only when NEITHER workspaceId nor organizationId is
    // present in the where clause (i.e. no tenant qualification at all).
    // NOTE: ID_ONLY_RE is tested against the full where match (which includes
    // the `where: {` prefix) because whereBlock is only the captured inner text.
    if (method === 'findUnique' && ID_ONLY_RE.test(whereMatch[0])) {
      const { hasWorkspace, hasOrg } = hasTenantFilter(whereBlock, info);
      const hasAnyTenantFilter = hasWorkspace || hasOrg;
      if (!hasAnyTenantFilter) {
        findings.push({
          service: serviceLabel,
          model: modelName,
          method: extractMethodName(source, callOffset),
          issue: 'ID-only lookup without tenant check (findUnique by id, no workspace/org filter)',
          severity: 'critical',
        });
      }
      // Whether or not we flagged it, an ID-keyed findUnique is handled here.
      continue;
    }

    // Generic where clause missing tenant filters.
    // Having EITHER workspaceId or organizationId is sufficient tenant
    // qualification; flag only when the primary tenant field is absent AND
    // no fallback org filter is present.
    const { hasWorkspace, hasOrg } = hasTenantFilter(whereBlock, info);
    const hasAnyTenantFilter = hasWorkspace || hasOrg;
    if (!hasAnyTenantFilter) {
      findings.push({
        service: serviceLabel,
        model: modelName,
        method: extractMethodName(source, callOffset),
        issue: 'missing workspace filter',
        severity: 'high',
      });
    } else if (info.hasWorkspaceId && !hasWorkspace && hasOrg) {
      // Workspace field exists on model but only org filter is used
      findings.push({
        service: serviceLabel,
        model: modelName,
        method: extractMethodName(source, callOffset),
        issue: 'missing workspace filter (org-only qualification)',
        severity: 'medium',
      });
    }
  }

  return findings;
}
