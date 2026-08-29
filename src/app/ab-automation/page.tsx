'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Zap, Play, RefreshCw, Trophy, Loader2, AlertCircle, TrendingUp,
  Eye, MousePointerClick, DollarSign, Target,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

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
  const [createMsg, setCreateMsg] = useState<string | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/creative/ab-automation');
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch {
      setJobs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (session?.user) loadJobs();
    else setLoading(false);
  }, [session, loadJobs]);

  const handleCreate = async () => {
    const ids = creationIds.split(/[,\n\s]+/).filter(Boolean);
    if (ids.length < 2 || !testName) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await fetch('/api/creative/ab-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creationIds: ids,
          platform,
          testName,
          primaryMetric,
          budgetDaily,
          dryRun,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateMsg(t('abAutomation.jobCreated'));
        setCreationIds('');
        setTestName('');
        loadJobs();
      } else {
        setCreateMsg(data.error || t('abAutomation.createFailed'));
      }
    } catch {
      setCreateMsg(t('abAutomation.createFailed'));
    }
    setCreating(false);
  };

  const handleCheckJob = async (jobId: string) => {
    try {
      const res = await fetch('/api/creative/ab-automation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) loadJobs();
    } catch {
      // silent
    }
  };

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('abAutomation.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('abAutomation.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" /> {t('abAutomation.title')}
          </h1>
          <p className="text-sm text-fg-muted mt-2">{t('abAutomation.subtitle')}</p>
        </header>

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
                <option value="meta">Meta (Facebook/Instagram)</option>
                <option value="google">Google Ads</option>
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
                <option value="roas">ROAS (Return on Ad Spend)</option>
                <option value="ctr">CTR (Click-Through Rate)</option>
                <option value="cvr">CVR (Conversion Rate)</option>
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
              disabled={creating || !testName || creationIds.split(/[,\n\s]+/).filter(Boolean).length < 2}
              className="ml-auto rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('abAutomation.start')}
            </button>
          </div>
          {createMsg && <p role="status" className="text-xs text-fg-muted">{createMsg}</p>}
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
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border hover:bg-hover"
                      >
                        <RefreshCw className="w-3 h-3" /> {t('abAutomation.check')}
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
                  <div className="flex items-center gap-2 rounded-md bg-danger/10 p-2 text-danger">
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
                        <th scope="col" className="py-2 pr-3">Variant</th>
                        <th scope="col" className="py-2 pr-3 text-right"><Eye className="w-3 h-3 inline" /></th>
                        <th scope="col" className="py-2 pr-3 text-right"><MousePointerClick className="w-3 h-3 inline" /></th>
                        <th scope="col" className="py-2 pr-3 text-right"><Target className="w-3 h-3 inline" /></th>
                        <th scope="col" className="py-2 pr-3 text-right"><DollarSign className="w-3 h-3 inline" /></th>
                        <th scope="col" className="py-2 text-right"><TrendingUp className="w-3 h-3 inline" /></th>
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
    </div>
  );
}
