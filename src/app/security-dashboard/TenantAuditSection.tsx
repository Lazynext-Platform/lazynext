'use client';

import { useState, useMemo } from 'react';
import { Shield, ShieldAlert, AlertTriangle, FileSearch, Loader2, CheckCircle, Filter } from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types (mirror of src/lib/services/tenant-audit.ts) ──

type AuditSeverity = 'critical' | 'high' | 'medium' | 'low';

interface TenantFinding {
  service: string;
  model: string;
  method: string;
  issue: string;
  severity: AuditSeverity;
}

interface AuditSummary {
  totalServicesAudited: number;
  totalFindings: number;
  bySeverity: Record<AuditSeverity, number>;
  secureModels: number;
  atRiskModels: number;
}

interface AuditReport {
  findings: TenantFinding[];
  summary: AuditSummary;
  secureModels: string[];
  atRiskModels: string[];
  generatedAt: string;
}

const severityVariant: Record<AuditSeverity, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'default',
};

const severityIcon: Record<AuditSeverity, typeof Shield> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: Shield,
  low: CheckCircle,
};

type SeverityFilter = 'all' | AuditSeverity;

export function TenantAuditSection() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

  async function runAudit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/security/tenant-audit');
      const data = await res.json();
      if (res.ok && data.report) {
        setReport(data.report);
      } else {
        setError(data.error || 'audit_failed');
      }
    } catch {
      setError('audit_failed');
    } finally {
      setLoading(false);
    }
  }

  const filteredFindings = useMemo(() => {
    if (!report) return [];
    if (severityFilter === 'all') return report.findings;
    return report.findings.filter((f) => f.severity === severityFilter);
  }, [report, severityFilter]);

  const severityCards: Array<{ key: AuditSeverity; label: string; count: number }> = report
    ? [
        { key: 'critical', label: 'Critical', count: report.summary.bySeverity.critical },
        { key: 'high', label: 'High', count: report.summary.bySeverity.high },
        { key: 'medium', label: 'Medium', count: report.summary.bySeverity.medium },
        { key: 'low', label: 'Low', count: report.summary.bySeverity.low },
      ]
    : [];

  const filterOptions: SeverityFilter[] = ['all', 'critical', 'high', 'medium', 'low'];

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSearch className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Tenant Isolation Audit</h2>
          </div>
          <p className="text-xs text-fg-secondary">
            Static analysis of all services and API routes for missing workspace/organization tenant filters.
          </p>
        </div>
        <Button onClick={runAudit} disabled={loading} variant="secondary" size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
          {loading ? 'Auditing...' : 'Run Audit'}
        </Button>
      </div>

      {error && (
        <div className="mb-4 text-xs text-fg-secondary bg-bg-secondary rounded-lg p-3">
          Audit failed: {error}
        </div>
      )}

      {/* Summary stats */}
      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {severityCards.map((card) => {
              const Icon = severityIcon[card.key] || Shield;
              return (
                <Card key={card.key} className="p-3">
                  <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
                    <Icon className="h-3 w-3" /> {card.label}
                  </div>
                  <div className="text-xl font-semibold">{card.count}</div>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center gap-3 flex-wrap text-xs">
            <Badge variant="default">{report.summary.totalServicesAudited} services audited</Badge>
            <Badge variant={report.summary.totalFindings > 0 ? 'warning' : 'success'}>
              {report.summary.totalFindings} findings
            </Badge>
            <Badge variant="success">{report.summary.secureModels} secure models</Badge>
            <Badge variant={report.summary.atRiskModels > 0 ? 'warning' : 'default'}>
              {report.summary.atRiskModels} at-risk models
            </Badge>
          </div>

          {/* At-risk models */}
          {report.atRiskModels.length > 0 && (
            <div className="text-xs text-fg-secondary">
              <span className="font-medium">At-risk models (no direct tenant fields):</span>{' '}
              {report.atRiskModels.join(', ')}
            </div>
          )}

          {/* Severity filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-fg-secondary">
              <Filter className="h-3 w-3" /> Filter:
            </div>
            {filterOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => setSeverityFilter(opt)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  severityFilter === opt
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Findings list */}
          <div>
            <h3 className="heading-display text-xs mb-2 text-fg-secondary">
              Findings ({filteredFindings.length})
            </h3>
            {filteredFindings.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-fg-secondary bg-bg-secondary rounded-lg p-3">
                <CheckCircle className="h-3 w-3 text-fg-muted" />
                No findings for this filter.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredFindings.map((finding, idx) => (
                  <div
                    key={`${finding.service}-${finding.model}-${idx}`}
                    className="border border-border rounded-lg p-3"
                  >
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant={severityVariant[finding.severity]} className="text-xs">
                        {finding.severity}
                      </Badge>
                      <span className="text-xs font-mono text-fg-secondary">{finding.model}</span>
                      <span className="text-xs text-fg-muted">·</span>
                      <span className="text-xs text-fg-muted">{finding.method}</span>
                    </div>
                    <p className="text-xs text-fg-primary">{finding.issue}</p>
                    <p className="text-xs text-fg-muted mt-1 truncate">{finding.service}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-fg-muted">
            Generated: {new Date(report.generatedAt).toLocaleString()}
          </div>
        </div>
      )}

      {!report && !loading && !error && (
        <div className="flex items-center gap-2 text-xs text-fg-secondary">
          <Shield className="h-4 w-4 text-fg-muted" />
          Click “Run Audit” to scan all services and API routes for tenant isolation gaps.
        </div>
      )}
    </Card>
  );
}
