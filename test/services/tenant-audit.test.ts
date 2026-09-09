import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock node:fs/promises so the source-scanning methods are deterministic.
// ─────────────────────────────────────────────────────────────────────────────

interface MockFile {
  path: string; // absolute path the audit would scan
  content: string;
}

let mockFiles: MockFile[] = [];
let readdirShouldFail = false;

// Use the real process.cwd() so the audit's scan paths match our mock files.
const CWD = process.cwd();

// A virtual filesystem: directories are derived from file paths.
function virtualReaddir(dir: string): string[] {
  const entries = new Set<string>();
  for (const f of mockFiles) {
    if (f.path.startsWith(dir + '/')) {
      const rest = f.path.slice(dir.length + 1);
      const firstSeg = rest.split('/')[0];
      entries.add(firstSeg);
    }
  }
  return [...entries];
}

function virtualStat(p: string): { isDirectory(): boolean } {
  // It's a directory if any file is under it
  const isDir = mockFiles.some((f) => f.path.startsWith(p + '/'));
  return { isDirectory: () => isDir };
}

mock.module('node:fs/promises', {
  namedExports: {
    readdir: async (dir: string) => {
      if (readdirShouldFail) throw new Error('fs unavailable');
      return virtualReaddir(dir);
    },
    readFile: async (filePath: string) => {
      const f = mockFiles.find((mf) => mf.path === filePath);
      if (!f) throw new Error(`ENOENT: ${filePath}`);
      return f.content;
    },
    stat: async (p: string) => virtualStat(p),
  },
});

function resetMock(): void {
  mockFiles = [];
  readdirShouldFail = false;
}

const { TenantAuditService } = await import('@/lib/services/tenant-audit');

// ─────────────────────────────────────────────────────────────────────────────
// auditService (synchronous, model-registry based)
// ─────────────────────────────────────────────────────────────────────────────

describe('TenantAuditService.auditService', () => {
  beforeEach(() => resetMock());

  it('returns a medium finding for user-data models lacking tenant fields', () => {
    const findings = TenantAuditService.auditService('crm', 'Task');
    assert.ok(findings.length > 0);
    assert.ok(findings.some((f) => f.severity === 'medium'));
    assert.equal(findings[0].model, 'Task');
  });

  it('returns no findings for global models that do not hold user data', () => {
    const findings = TenantAuditService.auditService('auth', 'User');
    assert.equal(findings.length, 0);
  });

  it('returns no findings for properly tenant-scoped models', () => {
    const findings = TenantAuditService.auditService('crm', 'Customer');
    // Customer has workspaceId + organizationId — no registry-level finding
    assert.equal(findings.length, 0);
  });

  it('returns a low finding for unknown models', () => {
    const findings = TenantAuditService.auditService('crm', 'NonexistentModel');
    assert.equal(findings.length, 1);
    assert.equal(findings[0].severity, 'low');
    assert.ok(findings[0].issue.includes('unknown_model'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getSecureModels / getAtRiskModels
// ─────────────────────────────────────────────────────────────────────────────

describe('TenantAuditService.getSecureModels', () => {
  it('includes tenant-scoped models that hold user data', () => {
    const secure = TenantAuditService.getSecureModels();
    assert.ok(secure.includes('Customer'));
    assert.ok(secure.includes('Deal'));
    assert.ok(secure.includes('Project'));
    assert.ok(secure.includes('SandboxRun'));
  });

  it('excludes models without tenant fields', () => {
    const secure = TenantAuditService.getSecureModels();
    assert.ok(!secure.includes('Task'));
    assert.ok(!secure.includes('Creation'));
  });

  it('excludes global models that do not hold user data', () => {
    const secure = TenantAuditService.getSecureModels();
    assert.ok(!secure.includes('User'));
    assert.ok(!secure.includes('Session'));
  });
});

describe('TenantAuditService.getAtRiskModels', () => {
  it('includes user-data models lacking tenant fields', () => {
    const atRisk = TenantAuditService.getAtRiskModels();
    assert.ok(atRisk.includes('Task'));
    assert.ok(atRisk.includes('Creation'));
    assert.ok(atRisk.includes('AdCampaign'));
  });

  it('excludes properly tenant-scoped models', () => {
    const atRisk = TenantAuditService.getAtRiskModels();
    assert.ok(!atRisk.includes('Customer'));
    assert.ok(!atRisk.includes('Deal'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// auditAllServices (async, uses mocked fs)
// ─────────────────────────────────────────────────────────────────────────────

describe('TenantAuditService.auditAllServices', () => {
  beforeEach(() => resetMock());

  it('returns a comprehensive list of findings including registry-level ones', async () => {
    // Provide a service file with a missing-filter finding
    mockFiles = [
      {
        path: `${CWD}/src/lib/services/crm.ts`,
        content: `
          async list(workspaceId) {
            return prisma.customer.findMany({ where: { status: 'active' } });
          }
        `,
      },
    ];

    const findings = await TenantAuditService.auditAllServices();
    // Registry-level findings for at-risk models (Task, Creation, etc.)
    assert.ok(findings.length > 0);
    // Should include the source-scan finding for customer.findMany without workspaceId
    const customerFinding = findings.find(
      (f) => f.model === 'Customer' && f.issue.includes('missing workspace filter'),
    );
    assert.ok(customerFinding, 'expected a missing-workspace-filter finding for Customer');
  });

  it('detects ID-only findUnique without tenant check as critical', async () => {
    mockFiles = [
      {
        path: `${CWD}/src/lib/services/crm.ts`,
        content: `
          async get(id) {
            return prisma.customer.findUnique({ where: { id } });
          }
        `,
      },
    ];

    const findings = await TenantAuditService.auditAllServices();
    const idOnly = findings.find(
      (f) => f.model === 'Customer' && f.severity === 'critical',
    );
    assert.ok(idOnly, 'expected a critical ID-only-lookup finding for Customer');
    assert.ok(idOnly.issue.includes('ID-only lookup'));
  });

  it('does not flag findUnique that includes workspaceId filter', async () => {
    mockFiles = [
      {
        path: `${CWD}/src/lib/services/safe.ts`,
        content: `
          async get(id, workspaceId) {
            return prisma.customer.findUnique({ where: { id, workspaceId } });
          }
        `,
      },
    ];

    const findings = await TenantAuditService.auditAllServices();
    const customerFindings = findings.filter(
      (f) => f.model === 'Customer' && f.service.includes('safe.ts'),
    );
    assert.equal(customerFindings.length, 0);
  });

  it('handles fs failures gracefully', async () => {
    readdirShouldFail = true;
    const findings = await TenantAuditService.auditAllServices();
    // Should still return registry-level findings even if fs scan fails
    assert.ok(findings.length > 0);
    readdirShouldFail = false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getAuditReport
// ─────────────────────────────────────────────────────────────────────────────

describe('TenantAuditService.getAuditReport', () => {
  beforeEach(() => resetMock());

  it('returns a report with summary stats', async () => {
    mockFiles = [];
    const report = await TenantAuditService.getAuditReport();

    assert.ok(report.findings);
    assert.ok(report.summary);
    assert.ok(report.generatedAt);

    assert.equal(typeof report.summary.totalFindings, 'number');
    assert.equal(typeof report.summary.totalServicesAudited, 'number');
    assert.ok(report.summary.bySeverity);
    assert.equal(typeof report.summary.bySeverity.critical, 'number');
    assert.equal(typeof report.summary.bySeverity.high, 'number');
    assert.equal(typeof report.summary.bySeverity.medium, 'number');
    assert.equal(typeof report.summary.bySeverity.low, 'number');
  });

  it('summary counts match findings', async () => {
    mockFiles = [
      {
        path: '/cwd/src/lib/services/crm.ts',
        content: `async get(id) { return prisma.deal.findUnique({ where: { id } }); }`,
      },
    ];

    const report = await TenantAuditService.getAuditReport();
    const totalFromSeverity =
      report.summary.bySeverity.critical +
      report.summary.bySeverity.high +
      report.summary.bySeverity.medium +
      report.summary.bySeverity.low;
    assert.equal(totalFromSeverity, report.summary.totalFindings);
    assert.equal(totalFromSeverity, report.findings.length);
  });

  it('includes secureModels and atRiskModels arrays', async () => {
    const report = await TenantAuditService.getAuditReport();
    assert.ok(Array.isArray(report.secureModels));
    assert.ok(Array.isArray(report.atRiskModels));
    assert.ok(report.secureModels.includes('Customer'));
    assert.ok(report.atRiskModels.includes('Task'));
    assert.equal(report.summary.secureModels, report.secureModels.length);
    assert.equal(report.summary.atRiskModels, report.atRiskModels.length);
  });
});
