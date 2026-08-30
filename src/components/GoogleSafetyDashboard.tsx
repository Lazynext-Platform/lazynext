'use client';

import { useState, useCallback, useEffect } from 'react';
import { Shield, Loader2, AlertCircle, Save, CheckCircle, Clock, Check, X } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface SafetyConfig {
  dryRun?: boolean;
  requireApproval?: boolean;
  maxDailyBudget?: number;
  maxCampaignBudget?: number;
  maxDailyMutations?: number;
  warningThreshold?: number;
  allowedActions?: string[];
  blockedActions?: string[];
}

interface AuditSummary {
  total?: number;
  successes?: number;
  failures?: number;
  simulated?: number;
}

interface PendingApproval {
  id?: string;
  action?: string;
  description?: string;
  requestedAt?: string;
}

interface GoogleSafetyState {
  config?: SafetyConfig;
  auditSummary?: AuditSummary;
  pendingApprovals?: PendingApproval[];
}

export function GoogleSafetyDashboard() {
  const { t } = useI18n();
  const [dryRun, setDryRun] = useState(true);
  const [requireApproval, setRequireApproval] = useState(true);
  const [maxDailyBudget, setMaxDailyBudget] = useState('');
  const [maxCampaignBudget, setMaxCampaignBudget] = useState('');
  const [maxDailyMutations, setMaxDailyMutations] = useState('');
  const [warningThreshold, setWarningThreshold] = useState('');
  const [allowedActions, setAllowedActions] = useState('');
  const [blockedActions, setBlockedActions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [state, setState] = useState<GoogleSafetyState | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    setLoadingState(true);
    try {
      const res = await fetch('/api/ads/google-safety');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setState(data);
      const cfg = data.config || {};
      setDryRun(cfg.dryRun ?? true);
      setRequireApproval(cfg.requireApproval ?? true);
      setMaxDailyBudget(cfg.maxDailyBudget != null ? String(cfg.maxDailyBudget) : '');
      setMaxCampaignBudget(cfg.maxCampaignBudget != null ? String(cfg.maxCampaignBudget) : '');
      setMaxDailyMutations(cfg.maxDailyMutations != null ? String(cfg.maxDailyMutations) : '');
      setWarningThreshold(cfg.warningThreshold != null ? String(cfg.warningThreshold) : '');
      setAllowedActions(Array.isArray(cfg.allowedActions) ? cfg.allowedActions.join(', ') : '');
      setBlockedActions(Array.isArray(cfg.blockedActions) ? cfg.blockedActions.join(', ') : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  const save = useCallback(async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const splitList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
      const res = await fetch('/api/ads/google-safety', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          requireApproval,
          maxDailyBudget: maxDailyBudget ? Number(maxDailyBudget) : undefined,
          maxCampaignBudget: maxCampaignBudget ? Number(maxCampaignBudget) : undefined,
          maxDailyMutations: maxDailyMutations ? Number(maxDailyMutations) : undefined,
          warningThreshold: warningThreshold ? Number(warningThreshold) : undefined,
          allowedActions: splitList(allowedActions),
          blockedActions: splitList(blockedActions),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess(t('googleSafety.configSaved'));
      await loadState();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [dryRun, requireApproval, maxDailyBudget, maxCampaignBudget, maxDailyMutations, warningThreshold, allowedActions, blockedActions, loadState, t]);

  const handleApproval = useCallback(async (id: string, approved: boolean) => {
    setApprovingId(id);
    setError('');
    try {
      const res = await fetch('/api/ads/google-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, approved }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      await loadState();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setApprovingId(null);
    }
  }, [loadState]);

  const audit = state?.auditSummary;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="w-5 h-5" /> {t('googleSafety.title')}</h2>
        <p className="text-sm text-fg-muted mt-1">{t('googleSafety.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm">
            <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={saving} className="w-4 h-4" />
            {t('googleSafety.dryRun')}
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm">
            <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} disabled={saving} className="w-4 h-4" />
            {t('googleSafety.requireApproval')}
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="gsMaxDailyBudget" className="block text-sm font-medium mb-1">{t('googleSafety.maxDailyBudget')}</label>
            <input id="gsMaxDailyBudget" type="number" value={maxDailyBudget} onChange={(e) => setMaxDailyBudget(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={saving} />
          </div>
          <div>
            <label htmlFor="gsMaxCampaignBudget" className="block text-sm font-medium mb-1">{t('googleSafety.maxCampaignBudget')}</label>
            <input id="gsMaxCampaignBudget" type="number" value={maxCampaignBudget} onChange={(e) => setMaxCampaignBudget(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={saving} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="gsMaxDailyMutations" className="block text-sm font-medium mb-1">{t('googleSafety.maxDailyMutations')}</label>
            <input id="gsMaxDailyMutations" type="number" value={maxDailyMutations} onChange={(e) => setMaxDailyMutations(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={saving} />
          </div>
          <div>
            <label htmlFor="gsWarningThreshold" className="block text-sm font-medium mb-1">{t('googleSafety.warningThreshold')}</label>
            <input id="gsWarningThreshold" type="number" min={0} max={100} value={warningThreshold} onChange={(e) => setWarningThreshold(e.target.value)} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={saving} />
          </div>
        </div>

        <div>
          <label htmlFor="gsAllowedActions" className="block text-sm font-medium mb-1">{t('googleSafety.allowedActions')}</label>
          <input id="gsAllowedActions" type="text" value={allowedActions} onChange={(e) => setAllowedActions(e.target.value)} placeholder="create_campaign, update_budget, pause_campaign" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={saving} />
        </div>

        <div>
          <label htmlFor="gsBlockedActions" className="block text-sm font-medium mb-1">{t('googleSafety.blockedActions')}</label>
          <input id="gsBlockedActions" type="text" value={blockedActions} onChange={(e) => setBlockedActions(e.target.value)} placeholder="delete_campaign, delete_adgroup, delete_ad, delete_budget" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={saving} />
        </div>

        <button onClick={save} disabled={saving} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('googleSafety.save')}
        </button>
      </div>

      {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}
      {success && <div role="status" className="rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-sm text-success flex items-center gap-2"><CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}</div>}

      {audit && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><Shield className="w-4 h-4" /> {t('googleSafety.auditSummary')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xs text-fg-muted">{t('googleSafety.totalEntries')}</div>
              <div className="text-lg font-bold">{audit.total ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fg-muted">{t('googleSafety.successes')}</div>
              <div className="text-lg font-bold text-success">{audit.successes ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fg-muted">{t('googleSafety.failures')}</div>
              <div className="text-lg font-bold text-danger">{audit.failures ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-fg-muted">{t('googleSafety.simulated')}</div>
              <div className="text-lg font-bold text-warning">{audit.simulated ?? 0}</div>
            </div>
          </div>
        </div>
      )}

      {state?.pendingApprovals && state.pendingApprovals.length > 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <h3 className="font-medium flex items-center gap-2 mb-3"><Clock className="w-4 h-4" /> {t('googleSafety.pendingApprovals')} ({state.pendingApprovals.length})</h3>
          <div className="space-y-2">
            {state.pendingApprovals.map((p, i) => (
              <div key={p.id || i} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div>
                  {p.action && <p className="text-sm font-medium">{p.action}</p>}
                  {p.description && <p className="text-xs text-fg-muted">{p.description}</p>}
                  {p.requestedAt && <p className="text-xs text-fg-muted">{p.requestedAt}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => p.id && handleApproval(p.id, true)} disabled={approvingId === p.id} className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                    <Check className="w-3 h-3" /> {t('googleSafety.approve')}
                  </button>
                  <button onClick={() => p.id && handleApproval(p.id, false)} disabled={approvingId === p.id} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
                    <X className="w-3 h-3" /> {t('googleSafety.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {state?.pendingApprovals && state.pendingApprovals.length === 0 && (
        <div className="rounded-lg border border-border bg-bg-card p-4 text-sm text-fg-muted">
          {t('googleSafety.noApprovals')}
        </div>
      )}

      {loadingState && <div className="flex items-center gap-2 text-sm text-fg-muted"><Loader2 className="w-4 h-4 animate-spin" /> {t('googleSafety.loading')}</div>}
    </div>
  );
}
