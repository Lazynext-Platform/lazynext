'use client';

import { useState } from 'react';
import {
  ShieldCheck, ClipboardCheck, FlaskConical, AlertTriangle, FileSearch, FileBarChart,
  LayoutDashboard, BookOpen, Clock,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';

interface Framework {
  id: string; name: string; standard: string; description: string; version: string;
  status: string; requirements: Array<{ id: string; title: string }>; createdAt: Date;
}
interface Control {
  id: string; frameworkId: string; controlId: string; title: string; description: string;
  category: string; frequency: string; owner: string; status: string; createdAt: Date;
}
interface ControlTest {
  id: string; controlId: string; testDate: Date; tester: string; method: string;
  result: string; notes: string; createdAt: Date;
}
interface Finding {
  id: string; title: string; description: string; severity: string; status: string;
  recommendation: string; dueDate: Date | null; remediatedAt: Date | null; createdAt: Date;
}
interface Evidence {
  id: string; name: string; type: string; description: string; collectedBy: string;
  collectedDate: Date; createdAt: Date;
}
interface AuditReport {
  id: string; title: string; auditor: string; startDate: Date; endDate: Date | null;
  scope: string; summary: string; status: string; conclusion: string; createdAt: Date;
}
interface ComplianceScore {
  totalControls: number; passingControls: number; score: number;
  byFramework: Array<{ frameworkId: string; frameworkName: string; totalControls: number; passingControls: number; score: number }>;
}
interface Stats {
  frameworkCount: number; controlCount: number; testCount: number; findingCount: number;
  openFindingCount: number; evidenceCount: number; auditReportCount: number; complianceScore: number;
  byControlStatus: Record<string, number>; byFindingSeverity: Record<string, number>;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success', inactive: 'default', archived: 'default',
  implemented: 'success', not_implemented: 'danger', gap: 'warning', in_progress: 'info', deprecated: 'default',
  pass: 'success', fail: 'danger', exception: 'warning',
  open: 'danger', remediated: 'success', accepted: 'warning', closed: 'default',
  draft: 'default', in_review: 'info', finalized: 'success',
};

const severityVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default', medium: 'info', high: 'warning', critical: 'danger',
};

export function ComplianceAuditDashboard({
  organizationId,
  frameworks,
  controls,
  tests,
  findings,
  evidence,
  reports,
  gaps,
  score,
  stats,
}: {
  organizationId: string;
  frameworks: Framework[];
  controls: Control[];
  tests: ControlTest[];
  findings: Finding[];
  evidence: Evidence[];
  reports: AuditReport[];
  gaps: Control[];
  score: ComplianceScore;
  stats: Stats;
}) {
  void organizationId;
  const [tab, setTab] = useState<'overview' | 'frameworks' | 'controls' | 'tests' | 'findings' | 'evidence' | 'reports'>('overview');

  const tabs: { id: typeof tab; label: string; icon: typeof ShieldCheck }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'frameworks', label: 'Frameworks', icon: BookOpen },
    { id: 'controls', label: 'Controls', icon: ClipboardCheck },
    { id: 'tests', label: 'Tests', icon: FlaskConical },
    { id: 'findings', label: 'Findings', icon: AlertTriangle },
    { id: 'evidence', label: 'Evidence', icon: FileSearch },
    { id: 'reports', label: 'Audit Reports', icon: FileBarChart },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Frameworks</span>
          </div>
          <p className="text-2xl font-semibold">{stats.frameworkCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Controls</span>
          </div>
          <p className="text-2xl font-semibold">{stats.controlCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Compliance Score</span>
          </div>
          <p className="text-2xl font-semibold">{stats.complianceScore}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Open Findings</span>
          </div>
          <p className="text-2xl font-semibold text-danger">{stats.openFindingCount}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Compliance Score */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-accent-primary" />
              <h2 className="heading-display text-lg">Compliance Score</h2>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-4xl font-bold text-accent-primary">{score.score}%</div>
              <div className="text-sm text-fg-secondary">
                {score.passingControls} of {score.totalControls} controls passing
              </div>
            </div>
            {score.byFramework.length > 0 && (
              <div className="space-y-2">
                {score.byFramework.map((f) => (
                  <div key={f.frameworkId} className="flex items-center justify-between text-xs">
                    <span className="truncate">{f.frameworkName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-fg-muted">{f.passingControls}/{f.totalControls}</span>
                      <Badge variant={f.score >= 80 ? 'success' : f.score >= 50 ? 'warning' : 'danger'}>{f.score}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Gap Analysis */}
          {gaps.length > 0 && (
            <Card className="p-4 border-warning/30">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h2 className="heading-display text-lg text-warning">Gap Analysis ({gaps.length})</h2>
              </div>
              <div className="space-y-2">
                {gaps.slice(0, 10).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                    <span className="text-sm font-medium truncate">{c.title}</span>
                    <Badge variant={statusVariant[c.status] || 'default'} className="text-xs shrink-0">{c.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Controls by Status</h3>
              {Object.keys(stats.byControlStatus).length === 0 ? (
                <p className="text-xs text-fg-muted">No controls yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.byControlStatus).map(([s, count]) => (
                    <div key={s} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{s.replace(/_/g, ' ')}</span>
                      <Badge variant={statusVariant[s] || 'default'}>{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">Findings by Severity</h3>
              {Object.keys(stats.byFindingSeverity).length === 0 ? (
                <p className="text-xs text-fg-muted">No findings yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.byFindingSeverity).map(([s, count]) => (
                    <div key={s} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{s}</span>
                      <Badge variant={severityVariant[s] || 'default'}>{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {tab === 'frameworks' && (
        <div>
          {frameworks.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={BookOpen} title="No frameworks" description="Compliance frameworks will appear here." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {frameworks.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{f.name}</span>
                    <Badge variant={statusVariant[f.status] || 'default'} className="text-xs shrink-0">{f.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-fg-muted mb-2">
                    <Badge variant="accent" className="text-xs">{f.standard}</Badge>
                    <span>v{f.version}</span>
                  </div>
                  {f.description && <p className="text-xs text-fg-secondary line-clamp-2">{f.description}</p>}
                  {f.requirements.length > 0 && (
                    <div className="text-xs text-fg-muted mt-2">{f.requirements.length} requirement(s)</div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'controls' && (
        <div>
          {controls.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={ClipboardCheck} title="No controls" description="Compliance controls will appear here." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {controls.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{c.title}</span>
                    <Badge variant={statusVariant[c.status] || 'default'} className="text-xs shrink-0 capitalize">{c.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-xs text-fg-muted font-mono mb-1">{c.controlId}</div>
                  <div className="flex items-center gap-2 text-xs text-fg-secondary">
                    {c.category && <Badge variant="default" className="text-xs">{c.category}</Badge>}
                    <span className="capitalize">{c.frequency}</span>
                  </div>
                  {c.owner && <div className="text-xs text-fg-muted mt-1">Owner: {c.owner}</div>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'tests' && (
        <div>
          {tests.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={FlaskConical} title="No control tests" description="Control test results will appear here." />
            </Card>
          ) : (
            <div className="space-y-2">
              {tests.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{t.tester}</span>
                    <Badge variant={statusVariant[t.result] || 'default'} className="text-xs shrink-0 capitalize">{t.result}</Badge>
                  </div>
                  <div className="text-xs text-fg-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(t.testDate).toLocaleDateString()}
                  </div>
                  {t.method && <div className="text-xs text-fg-secondary mt-1">Method: {t.method}</div>}
                  {t.notes && <p className="text-xs text-fg-secondary mt-1 line-clamp-2">{t.notes}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'findings' && (
        <div>
          {findings.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={AlertTriangle} title="No findings" description="Audit findings will appear here." />
            </Card>
          ) : (
            <div className="space-y-2">
              {findings.map((f) => (
                <Card key={f.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{f.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={severityVariant[f.severity] || 'default'} className="text-xs capitalize">{f.severity}</Badge>
                      <Badge variant={statusVariant[f.status] || 'default'} className="text-xs capitalize">{f.status}</Badge>
                    </div>
                  </div>
                  {f.description && <p className="text-xs text-fg-secondary line-clamp-2">{f.description}</p>}
                  {f.dueDate && (
                    <div className="text-xs text-warning mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Due {new Date(f.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  {f.remediatedAt && (
                    <div className="text-xs text-success mt-1">Remediated {new Date(f.remediatedAt).toLocaleDateString()}</div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'evidence' && (
        <div>
          {evidence.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={FileSearch} title="No evidence" description="Compliance evidence will appear here." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {evidence.map((e) => (
                <Card key={e.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{e.name}</span>
                    <Badge variant="default" className="text-xs shrink-0 capitalize">{e.type}</Badge>
                  </div>
                  <div className="text-xs text-fg-muted">
                    Collected by {e.collectedBy} on {new Date(e.collectedDate).toLocaleDateString()}
                  </div>
                  {e.description && <p className="text-xs text-fg-secondary mt-1 line-clamp-2">{e.description}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reports' && (
        <div>
          {reports.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={FileBarChart} title="No audit reports" description="Audit reports will appear here." />
            </Card>
          ) : (
            <div className="space-y-2">
              {reports.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{r.title}</span>
                    <Badge variant={statusVariant[r.status] || 'default'} className="text-xs shrink-0 capitalize">{r.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div className="text-xs text-fg-muted">
                    Auditor: {r.auditor} — {new Date(r.startDate).toLocaleDateString()}
                    {r.endDate && ` to ${new Date(r.endDate).toLocaleDateString()}`}
                  </div>
                  {r.scope && <p className="text-xs text-fg-secondary mt-1 line-clamp-2">Scope: {r.scope}</p>}
                  {r.conclusion && <p className="text-xs text-fg-secondary mt-1 line-clamp-2">{r.conclusion}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
