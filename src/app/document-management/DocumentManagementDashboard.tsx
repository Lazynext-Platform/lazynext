'use client';

import { useState } from 'react';
import {
  FileText, PenLine, ShieldCheck, Archive, LayoutDashboard, FileStack, Clock,
} from 'lucide-react';
import { Card, Badge, EmptyState } from '@/components/ui';

interface Template {
  id: string; name: string; category: string; description: string; version: number; createdAt: Date;
}
interface Document {
  id: string; title: string; category: string; description: string; classification: string;
  tags: string[]; version: number; expiresAt: Date | null; createdAt: Date;
}
interface ESignRequest {
  id: string; title: string; status: string; signers: Array<{ name: string; email: string }>;
  expiresAt: Date | null; createdAt: Date;
}
interface ClassRule {
  id: string; name: string; classification: string; criteria: string; autoClassify: boolean;
}
interface RetentionPolicy {
  id: string; name: string; category: string; retentionDays: number; action: string; description: string;
}
interface Stats {
  templateCount: number; documentCount: number; esignRequestCount: number; pendingEsignCount: number;
  completedEsignCount: number; classRuleCount: number; retentionPolicyCount: number; expiredDocumentCount: number;
  byCategory: Record<string, number>; byClassification: Record<string, number>;
}

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'default',
  expired: 'danger',
};

const classificationVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  public: 'success',
  internal: 'info',
  confidential: 'warning',
  restricted: 'danger',
};

export function DocumentManagementDashboard({
  organizationId,
  templates,
  documents,
  esignRequests,
  classifications,
  retentionPolicies,
  expiredDocuments,
  stats,
}: {
  organizationId: string;
  templates: Template[];
  documents: Document[];
  esignRequests: ESignRequest[];
  classifications: ClassRule[];
  retentionPolicies: RetentionPolicy[];
  expiredDocuments: Document[];
  stats: Stats;
}) {
  void organizationId;
  const [tab, setTab] = useState<'overview' | 'templates' | 'documents' | 'esign' | 'classifications' | 'retention'>('overview');

  const tabs: { id: typeof tab; label: string; icon: typeof FileText }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'templates', label: 'Templates', icon: FileStack },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'esign', label: 'E-Sign', icon: PenLine },
    { id: 'classifications', label: 'Classifications', icon: ShieldCheck },
    { id: 'retention', label: 'Retention', icon: Archive },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileStack className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Templates</span>
          </div>
          <p className="text-2xl font-semibold">{stats.templateCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Documents</span>
          </div>
          <p className="text-2xl font-semibold">{stats.documentCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">E-Sign Requests</span>
          </div>
          <p className="text-2xl font-semibold">{stats.esignRequestCount}</p>
          {stats.pendingEsignCount > 0 && (
            <p className="text-xs text-warning mt-1">{stats.pendingEsignCount} pending</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Archive className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Retention Policies</span>
          </div>
          <p className="text-2xl font-semibold">{stats.retentionPolicyCount}</p>
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
          {expiredDocuments.length > 0 && (
            <Card className="p-4 border-danger/30">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-danger" />
                <h2 className="heading-display text-lg text-danger">Expired Documents ({expiredDocuments.length})</h2>
              </div>
              <div className="space-y-2">
                {expiredDocuments.slice(0, 5).map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                    <span className="text-sm font-medium truncate">{d.title}</span>
                    <span className="text-xs text-fg-muted shrink-0">
                      {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">By Category</h3>
              {Object.keys(stats.byCategory).length === 0 ? (
                <p className="text-xs text-fg-muted">No documents yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{cat}</span>
                      <Badge variant="default">{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-3">By Classification</h3>
              {Object.keys(stats.byClassification).length === 0 ? (
                <p className="text-xs text-fg-muted">No documents yet.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats.byClassification).map(([cls, count]) => (
                    <div key={cls} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{cls}</span>
                      <Badge variant={classificationVariant[cls] || 'default'}>{count}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Recent E-Sign Requests</h3>
            {esignRequests.length === 0 ? (
              <EmptyState icon={PenLine} title="No e-sign requests" description="E-signature requests will appear here." />
            ) : (
              <div className="space-y-2">
                {esignRequests.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt p-2">
                    <span className="text-sm font-medium truncate">{r.title}</span>
                    <Badge variant={statusVariant[r.status] || 'default'} className="text-xs shrink-0">{r.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'templates' && (
        <div>
          {templates.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={FileStack} title="No templates" description="Document templates will appear here." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{t.name}</span>
                    <Badge variant="info" className="text-xs shrink-0">v{t.version}</Badge>
                  </div>
                  <div className="text-xs text-fg-muted mb-2">
                    <Badge variant="default" className="text-xs capitalize">{t.category}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-fg-secondary line-clamp-2">{t.description}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div>
          {documents.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={FileText} title="No documents" description="Documents will appear here." />
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((d) => (
                <Card key={d.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-semibold block truncate pr-2">{d.title}</span>
                    <Badge variant={classificationVariant[d.classification] || 'default'} className="text-xs shrink-0 capitalize">
                      {d.classification}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-fg-muted mb-1">
                    <Badge variant="default" className="text-xs capitalize">{d.category}</Badge>
                    <span>v{d.version}</span>
                  </div>
                  {d.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {d.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-xs text-fg-muted">#{tag}</span>
                      ))}
                    </div>
                  )}
                  {d.expiresAt && (
                    <div className="text-xs text-warning mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Expires {new Date(d.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'esign' && (
        <div>
          {esignRequests.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={PenLine} title="No e-sign requests" description="E-signature requests will appear here." />
            </Card>
          ) : (
            <div className="space-y-2">
              {esignRequests.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-sm font-semibold truncate">{r.title}</span>
                    <Badge variant={statusVariant[r.status] || 'default'} className="text-xs shrink-0">{r.status}</Badge>
                  </div>
                  <div className="text-xs text-fg-muted">
                    {r.signers.length} signer(s): {r.signers.map((s) => s.name).join(', ')}
                  </div>
                  {r.expiresAt && (
                    <div className="text-xs text-fg-secondary mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Expires {new Date(r.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'classifications' && (
        <div>
          {classifications.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={ShieldCheck} title="No classification rules" description="Classification rules will appear here." />
            </Card>
          ) : (
            <div className="space-y-2">
              {classifications.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{c.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={classificationVariant[c.classification] || 'default'} className="text-xs capitalize">
                        {c.classification}
                      </Badge>
                      {c.autoClassify && <Badge variant="accent" className="text-xs">Auto</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-fg-secondary truncate">{c.criteria}</p>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'retention' && (
        <div>
          {retentionPolicies.length === 0 ? (
            <Card className="p-6">
              <EmptyState icon={Archive} title="No retention policies" description="Retention policies will appear here." />
            </Card>
          ) : (
            <div className="space-y-2">
              {retentionPolicies.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold truncate">{p.name}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="default" className="text-xs capitalize">{p.category}</Badge>
                      <Badge variant={p.action === 'delete' ? 'danger' : 'info'} className="text-xs capitalize">{p.action}</Badge>
                    </div>
                  </div>
                  <div className="text-xs text-fg-muted">{p.retentionDays} days</div>
                  {p.description && <p className="text-xs text-fg-secondary mt-1 truncate">{p.description}</p>}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
