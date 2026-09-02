'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Zap, Play, RefreshCw, Trophy, Loader2, AlertCircle, TrendingUp,
  Eye, MousePointerClick, DollarSign, Target, Workflow, Award,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { FeedbackWidget } from '@/components/FeedbackWidget';

interface AutomationVariant {
  creationId: string;
  label: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  revenue: number;
  ctr: number;
  cvr: number;
  roas: number;
}

interface AutomationJob {
  jobId: string;
  status: 'planning' | 'launching' | 'monitoring' | 'completed' | 'failed';
  testName: string;
  platform: string;
  primaryMetric: string;
  variants: AutomationVariant[];
  winner?: string;
  confidenceLevel: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

const STATUS_COLORS: Record<string, string> = {
  planning: 'text-warning',
  launching: 'text-accent',
  monitoring: 'text-accent',
  completed: 'text-success',
  failed: 'text-danger',
};

export default function ABAutomationPage() {
  const { t } = useI18n();
  const { data: session } = useSession();
  const [jobs, setJobs] = useState<AutomationJob[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creationIds, setCreationIds] = useState('');
  const [testName, setTestName] = useState('');
  const [platform, setPlatform] = useState('meta');
  const [primaryMetric, setPrimaryMetric] = useState('roas');
  const [budgetDaily, setBudgetDaily] = useState(10);
  const [dryRun, setDryRun] = useState(true);
  const [createMsg, setCreateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [checkingJobId, setCheckingJobId] = useState<string | null>(null);
  const [workflowTemplates, setWorkflowTemplates] = useState<Array<{ id: string; name: string; stages: string[] }>>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [winners, setWinners] = useState<Array<{ id: string; testName?: string; winnerAt?: string }>>([]);
  const [loadingWinners, setLoadingWinners] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/creative/ab-automation');
      if (!res.ok) {
        setError(t('abAutomation.error'));
        setJobs([]);
      } else {
        const data = await res.json();
        setJobs(data.jobs || []);
        setError(null);
      }
    } catch {
      setError(t('abAutomation.error'));
      setJobs([]);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (session?.user) {
      loadJobs();
      // Load workflow templates for the selector
      fetch('/api/creative/workflow-templates')
        .then(res => res.ok ? res.json() : { templates: [] })
        .then(data => setWorkflowTemplates(data.templates || []))
        .catch(() => setWorkflowTemplates([]));
      // Load winning variants (creations tagged with abTestWinner)
      setLoadingWinners(true);
      fetch('/api/creative/ab-automation?winners=true')
        .then(res => res.ok ? res.json() : { winners: [] })
        .then(data => setWinners(data.winners || []))
        .catch(() => setWinners([]))
        .finally(() => setLoadingWinners(false));
    } else {
      setLoading(false);
    }
  }, [session, loadJobs]);

  const handleCreate = async () => {
    const ids = [...new Set(creationIds.split(/[,\n\s]+/).filter(Boolean))];
    const trimmedName = testName.trim();
    if (ids.length < 2 || !trimmedName) return;
    if (!Number.isFinite(budgetDaily) || budgetDaily < 1) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch('/api/creative/ab-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creationIds: ids,
          platform,
          testName: trimmedName,
          primaryMetric,
          budgetDaily: Math.max(1, Math.floor(budgetDaily)),
          dryRun,
          workflowTemplateId: selectedWorkflowId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateMsg({ type: 'success', text: t('abAutomation.jobCreated') });
        setCreationIds('');
        setTestName('');
        loadJobs();
      } else {
        setCreateMsg({ type: 'error', text: data.error || t('abAutomation.createFailed') });
      }
    } catch {
      setCreateMsg({ type: 'error', text: t('abAutomation.createFailed') });
    }
    setCreating(false);
  };

  const handleCheckJob = async (jobId: string) => {
    setCheckingJobId(jobId);
    try {
      const res = await fetch('/api/creative/ab-automation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) loadJobs();
    } catch {
      // silent — UI will show stale data
    }
    setCheckingJobId(null);
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" aria-hidden="true" /> {t('abAutomation.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('abAutomation.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  const parsedIds = [...new Set(creationIds.split(/[,\n\s]+/).filter(Boolean))];
  const canSubmit = testName.trim().length > 0 && parsedIds.length >= 2 && Number.isFinite(budgetDaily) && budgetDaily >= 1;

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" aria-hidden="true" /> {t('abAutomation.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('abAutomation.subtitle')}</p>
        </header>

        {error && (
          <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 p-4 flex items-center gap-2 text-danger">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">{error}</p>
            <button onClick={() => loadJobs()} className="ml-auto text-xs underline">
              {t('abAutomation.retry')}
            </button>
          </div>
        )}

        {/* Create new automation */}
        <section className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Play className="w-4 h-4" /> {t('abAutomation.newJob')}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-fg-muted" htmlFor="ab-test-name">{t('abAutomation.testName')}</label>
              <input
                id="ab-test-name"
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder={t('abAutomation.testNamePlaceholder')}
                className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="text-xs text-fg-muted" htmlFor="ab-platform">{t('abAutomation.platform')}</label>
              <select
                id="ab-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="meta">{t('ads.platformMeta')}</option>
                <option value="google">{t('ads.platformGoogle')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-muted" htmlFor="ab-metric">{t('abAutomation.primaryMetric')}</label>
              <select
                id="ab-metric"
                value={primaryMetric}
                onChange={(e) => setPrimaryMetric(e.target.value)}
                className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="roas">{t('abAutomation.metricRoasFull')}</option>
                <option value="ctr">{t('abAutomation.metricCtrFull')}</option>
                <option value="cvr">{t('abAutomation.metricCvrFull')}</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-muted" htmlFor="ab-budget">{t('abAutomation.dailyBudget')}</label>
              <input
                id="ab-budget"
                type="number"
                value={budgetDaily}
                onChange={(e) => setBudgetDaily(Number(e.target.value))}
                min="1"
                className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-fg-muted" htmlFor="ab-creation-ids">{t('abAutomation.creationIds')}</label>
            <textarea
              id="ab-creation-ids"
              value={creationIds}
              onChange={(e) => setCreationIds(e.target.value)}
              placeholder={t('abAutomation.creationIdsPlaceholder')}
              rows={2}
              className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          {workflowTemplates.length > 0 && (
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-fg-muted" aria-hidden="true" />
              <label className="text-xs text-fg-muted" htmlFor="ab-workflow-select">{t('abAutomation.useWorkflowTemplate')}</label>
              <select
                id="ab-workflow-select"
                value={selectedWorkflowId}
                onChange={(e) => {
                  setSelectedWorkflowId(e.target.value);
                  const tmpl = workflowTemplates.find(t => t.id === e.target.value);
                  if (tmpl) {
                    setTestName(tmpl.name + ' A/B Test');
                  }
                }}
                className="text-xs rounded-md border border-border bg-input px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">{t('abAutomation.selectWorkflow')}</option>
                {workflowTemplates.map(tmpl => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
              {selectedWorkflowId && (
                <span className="text-xs text-accent">{t('abAutomation.workflowWillRunPerVariant')}</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="rounded"
              />
              {t('abAutomation.dryRun')}
            </label>
            <button
              onClick={handleCreate}
              disabled={creating || !canSubmit}
              aria-busy={creating}
              className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('abAutomation.start')}
            </button>
          </div>
          {parsedIds.length > 0 && parsedIds.length < 2 && (
            <p role="status" className="text-xs text-warning">{t('abAutomation.needTwoVariants')}</p>
          )}
          {createMsg && (
            <p
              role={createMsg.type === 'error' ? 'alert' : 'status'}
              className={`text-xs ${createMsg.type === 'error' ? 'text-danger' : 'text-success'}`}
            >
              {createMsg.text}
            </p>
          )}
        </section>

        {/* Jobs list */}
        {loading ? (
          <div className="grid place-items-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
          </div>
        ) : !jobs || jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-12 text-center">
            <Zap className="w-8 h-8 mx-auto text-fg-muted mb-2" />
            <p className="text-sm text-fg-muted">{t('abAutomation.noJobs')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <section key={job.jobId} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-sm font-bold">{job.testName}</h3>
                    <p className="text-xs text-fg-muted">
                      {job.platform} · {t(`abAutomation.metric.${job.primaryMetric}`)} · {new Date(job.startedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${STATUS_COLORS[job.status]}`}>
                      {t(`abAutomation.status.${job.status}`)}
                    </span>
                    {job.status === 'monitoring' && (
                      <button
                        onClick={() => handleCheckJob(job.jobId)}
                        disabled={checkingJobId === job.jobId}
                        aria-busy={checkingJobId === job.jobId}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-hover disabled:opacity-50"
                      >
                        {checkingJobId === job.jobId ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} {t('abAutomation.check')}
                      </button>
                    )}
                  </div>
                </div>

                {job.winner && (
                  <div className="flex items-center gap-2 rounded-md bg-success/10 p-2 text-success">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {t('abAutomation.winner')}: Variant {job.variants.find(v => v.creationId === job.winner)?.label}
                    </span>
                  </div>
                )}

                {job.error && (
                  <div role="alert" className="flex items-center gap-2 rounded-md bg-danger/10 p-2 text-danger">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{job.error}</span>
                  </div>
                )}

                {/* Variants table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t('abAutomation.variants')}</caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-fg-muted">
                        <th scope="col" className="py-2 pr-3">{t('abAutomation.variant')}</th>
                        <th scope="col" className="py-2 pr-3 text-right"><span className="flex items-center justify-end gap-1"><Eye className="w-3 h-3" aria-hidden="true" /> <span className="sr-only">{t('abAutomation.impressions')}</span></span></th>
                        <th scope="col" className="py-2 pr-3 text-right"><span className="flex items-center justify-end gap-1"><MousePointerClick className="w-3 h-3" aria-hidden="true" /> <span className="sr-only">{t('abAutomation.clicks')}</span></span></th>
                        <th scope="col" className="py-2 pr-3 text-right"><span className="flex items-center justify-end gap-1"><Target className="w-3 h-3" aria-hidden="true" /> <span className="sr-only">{t('abAutomation.conversions')}</span></span></th>
                        <th scope="col" className="py-2 pr-3 text-right"><span className="flex items-center justify-end gap-1"><DollarSign className="w-3 h-3" aria-hidden="true" /> <span className="sr-only">{t('abAutomation.spend')}</span></span></th>
                        <th scope="col" className="py-2 text-right"><span className="flex items-center justify-end gap-1"><TrendingUp className="w-3 h-3" aria-hidden="true" /> <span className="sr-only">ROAS</span></span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {job.variants.map((v) => (
                        <tr key={v.creationId} className={`border-b border-border last:border-0 ${job.winner === v.creationId ? 'bg-success/5' : ''}`}>
                          <td className="py-2 pr-3 font-medium">
                            {job.winner === v.creationId && <Trophy className="w-3 h-3 inline text-success mr-1" />}
                            {v.label}
                          </td>
                          <td className="py-2 pr-3 text-right">{v.impressions.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right">{v.clicks.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right">{v.conversions.toLocaleString()}</td>
                          <td className="py-2 pr-3 text-right">${v.spend.toFixed(2)}</td>
                          <td className="py-2 text-right font-medium">{v.roas.toFixed(2)}x</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Winning Variants Gallery */}
      <section className="mt-6 rounded-lg border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-warning" aria-hidden="true" /> {t('abAutomation.winningVariants')}
        </h2>
        {loadingWinners ? (
          <div className="grid place-items-center py-4" aria-busy="true">
            <Loader2 className="h-5 w-5 animate-spin text-fg-muted" />
          </div>
        ) : winners.length === 0 ? (
          <p className="text-xs text-fg-muted">{t('abAutomation.noWinnersYet')}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {winners.map((w) => (
              <div key={w.id} className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <Trophy className="w-4 h-4 text-warning flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{w.testName || w.id}</p>
                  {w.winnerAt && (
                    <p className="text-xs text-fg-muted">{new Date(w.winnerAt).toLocaleDateString()}</p>
                  )}
                </div>
                <a
                  href={`/my-work/${w.id}`}
                  className="text-xs px-2 py-1 rounded border border-border hover:bg-hover"
                  aria-label={t('abAutomation.viewWinner')}
                >
                  {t('abAutomation.view')}
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      <FeedbackWidget feature="ab-automation" />
    </div>
  );
}
