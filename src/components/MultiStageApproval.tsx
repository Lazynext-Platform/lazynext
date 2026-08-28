'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, MessageSquare,
  Clock, GitBranch, ArrowRight, RefreshCw, Send,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type StageName = 'creative_review' | 'brand_review' | 'legal_review' | 'final_approval';
type StageStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';

type StageRecord = {
  id: string;
  type: 'campaign' | 'creative';
  stage: string;
  status: string;
  reviewerId?: string | null;
  note?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  // type-specific
  assetId?: string | null;
  assetName?: string;
  campaignId?: string | null;
  campaignName?: string;
};

type StagesResponse = {
  assetStages: StageRecord[];
  campaignStages: StageRecord[];
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    changesRequested: number;
  };
};

const STAGE_ORDER: StageName[] = ['creative_review', 'brand_review', 'legal_review', 'final_approval'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-success/15 text-success border-success/30',
  rejected: 'bg-danger/15 text-danger border-danger/30',
  changes_requested: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
};

const NODE_COLORS: Record<string, string> = {
  pending: 'border-warning bg-warning/10',
  approved: 'border-success bg-success/10',
  rejected: 'border-danger bg-danger/10',
  changes_requested: 'border-orange-500 bg-orange-500/10',
  untouched: 'border-line bg-surface',
};

export function MultiStageApproval() {
  const { status } = useSession();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StagesResponse | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitType, setSubmitType] = useState<'campaign' | 'creative'>('campaign');
  const [submitId, setSubmitId] = useState('');
  const [submitError, setSubmitError] = useState('');

  const load = useCallback(async () => {
    if (status !== 'authenticated') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/approvals/stages', { cache: 'no-store' });
      if (!res.ok) throw new Error('load_failed');
      const j: StagesResponse = await res.json();
      setData(j);
    } catch {
      setError(t('multiStageApproval.error'));
    } finally {
      setLoading(false);
    }
  }, [status, t]);

  useEffect(() => { load(); }, [load]);

  // Group stage records by item (asset or campaign) to build pipelines
  const pipelines = useMemo(() => {
    if (!data) return [];
    const all: StageRecord[] = [...data.assetStages, ...data.campaignStages];
    const groups = new Map<string, { key: string; type: 'campaign' | 'creative'; name: string; stages: StageRecord[] }>();
    for (const s of all) {
      const key = s.type === 'campaign' ? `campaign:${s.campaignId}` : `creative:${s.assetId}`;
      const name = s.type === 'campaign' ? (s.campaignName || 'Unknown') : (s.assetName || 'Unknown');
      const existing = groups.get(key);
      if (existing) {
        existing.stages.push(s);
      } else {
        groups.set(key, { key, type: s.type, name, stages: [s] });
      }
    }
    // Sort stages within each pipeline by stage order, then submittedAt
    return Array.from(groups.values()).map(g => ({
      ...g,
      stages: g.stages.sort((a, b) => {
        const ai = STAGE_ORDER.indexOf(a.stage as StageName);
        const bi = STAGE_ORDER.indexOf(b.stage as StageName);
        if (ai !== bi) return ai - bi;
        return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
      }),
    }));
  }, [data]);

  // For a pipeline, determine the status of each of the 4 stage nodes
  const getStageNodeStatus = (stages: StageRecord[], stageName: StageName): string => {
    const records = stages.filter(s => s.stage === stageName);
    if (records.length === 0) return 'untouched';
    // Use the latest record for this stage
    const latest = records[records.length - 1];
    return latest.status;
  };

  const handleReview = useCallback(async (stageId: string, decision: 'approve' | 'reject' | 'request_changes') => {
    setActionLoading(`${stageId}:${decision}`);
    try {
      const res = await fetch('/api/creative/approvals/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review',
          stageId,
          decision,
          note: showNote === stageId ? note : '',
        }),
      });
      if (!res.ok) throw new Error('action_failed');
      setNote('');
      setShowNote(null);
      await load();
    } catch {
      setError(t('multiStageApproval.error'));
    } finally {
      setActionLoading(null);
    }
  }, [showNote, note, load, t]);

  const handleSubmit = useCallback(async () => {
    if (!submitId.trim()) {
      setSubmitError(t('multiStageApproval.error'));
      return;
    }
    setActionLoading('submit');
    setSubmitError('');
    try {
      const res = await fetch('/api/creative/approvals/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit', type: submitType, id: submitId.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'submit_failed');
      }
      setSubmitId('');
      setSubmitOpen(false);
      await load();
    } catch (e) {
      setSubmitError(t('multiStageApproval.error'));
    } finally {
      setActionLoading(null);
    }
  }, [submitId, submitType, load, t]);

  const stageLabel = (stage: string): string => {
    switch (stage) {
      case 'creative_review': return t('multiStageApproval.stageCreativeReview');
      case 'brand_review': return t('multiStageApproval.stageBrandReview');
      case 'legal_review': return t('multiStageApproval.stageLegalReview');
      case 'final_approval': return t('multiStageApproval.stageFinalApproval');
      default: return stage;
    }
  };

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'pending': return t('multiStageApproval.statusPending');
      case 'approved': return t('multiStageApproval.statusApproved');
      case 'rejected': return t('multiStageApproval.statusRejected');
      case 'changes_requested': return t('multiStageApproval.statusChangesRequested');
      default: return status;
    }
  };

  if (status !== 'authenticated') {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-sm text-fg-faint">{t('multiStageApproval.signInRequired')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-brand-accent" />
        <h2 className="text-lg font-bold text-fg">{t('multiStageApproval.title')}</h2>
        <button
          onClick={() => load()}
          disabled={loading}
          className="ml-auto flex items-center gap-1 rounded-lg border border-line bg-app px-2.5 py-1 text-xs font-medium text-fg-faint transition hover:text-fg disabled:opacity-40"
          aria-label={t('multiStageApproval.retry')}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('multiStageApproval.retry')}
        </button>
      </div>
      <p className="mb-4 text-xs text-fg-faint">{t('multiStageApproval.description')}</p>

      {/* Error */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-danger/70 hover:text-danger" aria-label="dismiss">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-accent" />
          <span className="ml-2 text-sm text-fg-faint">{t('multiStageApproval.loading')}</span>
        </div>
      )}

      {/* Submit for Approval toggle */}
      {!loading && (
        <div className="mb-5">
          <button
            onClick={() => setSubmitOpen(!submitOpen)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-accent/90"
          >
            <Send className="h-3.5 w-3.5" />
            {t('multiStageApproval.submit')}
          </button>
          {submitOpen && (
            <div className="mt-3 rounded-lg border border-line bg-app p-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={submitType}
                  onChange={(e) => setSubmitType(e.target.value as 'campaign' | 'creative')}
                  className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-fg focus:border-brand-accent focus:outline-none"
                  aria-label={t('multiStageApproval.type')}
                >
                  <option value="campaign">Campaign</option>
                  <option value="creative">Creative</option>
                </select>
                <input
                  type="text"
                  value={submitId}
                  onChange={(e) => setSubmitId(e.target.value)}
                  placeholder={`${submitType} ID`}
                  className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs text-fg placeholder:text-fg-faint/50 focus:border-brand-accent focus:outline-none"
                  aria-label={t('multiStageApproval.name')}
                />
                <button
                  onClick={handleSubmit}
                  disabled={actionLoading === 'submit' || !submitId.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-accent px-3 py-1.5 text-xs font-bold text-white transition hover:bg-brand-accent/90 disabled:opacity-40"
                >
                  {actionLoading === 'submit' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {t('multiStageApproval.submit')}
                </button>
              </div>
              {submitError && (
                <p className="mt-2 text-xs text-danger" role="alert">{submitError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pipelines */}
      {!loading && pipelines.length === 0 && (
        <div className="rounded-xl border border-line bg-app p-6 text-center">
          <Clock className="mx-auto mb-2 h-8 w-8 text-fg-faint" />
          <p className="text-sm text-fg-faint">{t('multiStageApproval.noStages')}</p>
        </div>
      )}

      {!loading && pipelines.length > 0 && (
        <div className="space-y-5">
          {pipelines.map((pipeline) => {
            // Find the current pending stage (the actionable one)
            const pendingStage = pipeline.stages.find(s => s.status === 'pending');
            const isRejected = pipeline.stages.some(s => s.status === 'rejected');
            const isFullyApproved = STAGE_ORDER.every(stageName =>
              pipeline.stages.some(s => s.stage === stageName && s.status === 'approved')
            );
            return (
              <div key={pipeline.key} className="rounded-xl border border-line bg-app p-4">
                {/* Pipeline header */}
                <div className="mb-4 flex items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${pipeline.type === 'campaign' ? 'bg-brand-accent/15 text-brand-accent' : 'bg-success/15 text-success'}`}>
                    {pipeline.type}
                  </span>
                  <h3 className="text-sm font-bold text-fg">{pipeline.name}</h3>
                  {isFullyApproved && (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-bold text-success">
                      {t('multiStageApproval.finalApproved')}
                    </span>
                  )}
                </div>

                {/* Pipeline visualization */}
                <div className="mb-4 flex items-center gap-1 overflow-x-auto pb-2">
                  {STAGE_ORDER.map((stageName, idx) => {
                    const nodeStatus = getStageNodeStatus(pipeline.stages, stageName);
                    const nodeColor = NODE_COLORS[nodeStatus] || NODE_COLORS.untouched;
                    return (
                      <div key={stageName} className="flex items-center shrink-0">
                        <div className="flex flex-col items-center" style={{ minWidth: '90px' }}>
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${nodeColor}`}>
                            {nodeStatus === 'approved' ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : nodeStatus === 'rejected' ? (
                              <XCircle className="h-5 w-5 text-danger" />
                            ) : nodeStatus === 'changes_requested' ? (
                              <MessageSquare className="h-5 w-5 text-orange-500" />
                            ) : nodeStatus === 'pending' ? (
                              <Clock className="h-5 w-5 text-warning" />
                            ) : (
                              <span className="text-xs font-bold text-fg-faint">{idx + 1}</span>
                            )}
                          </div>
                          <span className="mt-1.5 text-center text-[10px] font-medium text-fg-faint leading-tight">
                            {stageLabel(stageName)}
                          </span>
                          {nodeStatus !== 'untouched' && (
                            <span className={`mt-1 rounded border px-1.5 py-0.5 text-[9px] font-bold ${STATUS_COLORS[nodeStatus]}`}>
                              {statusLabel(nodeStatus)}
                            </span>
                          )}
                        </div>
                        {idx < STAGE_ORDER.length - 1 && (
                          <ArrowRight className="mx-1 h-4 w-4 shrink-0 text-fg-faint" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Review history */}
                <div className="mb-3">
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-faint">
                    {t('multiStageApproval.reviewHistory')}
                  </h4>
                  <div className="space-y-1.5">
                    {pipeline.stages.map((s) => (
                      <div key={s.id} className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2 text-xs">
                        <div className="flex shrink-0 flex-col gap-1">
                          <span className="font-medium text-fg">{stageLabel(s.stage)}</span>
                          <span className={`inline-block w-fit rounded border px-1.5 py-0.5 text-[10px] font-bold ${STATUS_COLORS[s.status] || ''}`}>
                            {statusLabel(s.status)}
                          </span>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-0.5 text-fg-faint">
                          <span>{t('multiStageApproval.submittedAt')}: {new Date(s.submittedAt).toLocaleDateString()}</span>
                          {s.reviewedAt && (
                            <span>{t('multiStageApproval.reviewedAt')}: {new Date(s.reviewedAt).toLocaleDateString()}</span>
                          )}
                          {s.note && (
                            <span className="mt-1 max-w-[200px] truncate text-fg" title={s.note}>
                              &ldquo;{s.note}&rdquo;
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons for the pending stage */}
                {pendingStage && !isRejected && (
                  <div className="border-t border-line pt-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleReview(pendingStage.id, 'approve')}
                        disabled={actionLoading === `${pendingStage.id}:approve`}
                        className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success transition hover:bg-success/25 disabled:opacity-40"
                      >
                        {actionLoading === `${pendingStage.id}:approve` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {t('multiStageApproval.approve')}
                      </button>
                      <button
                        onClick={() => handleReview(pendingStage.id, 'reject')}
                        disabled={actionLoading === `${pendingStage.id}:reject`}
                        className="flex items-center gap-1.5 rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger/25 disabled:opacity-40"
                      >
                        {actionLoading === `${pendingStage.id}:reject` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        {t('multiStageApproval.reject')}
                      </button>
                      <button
                        onClick={() => {
                          setShowNote(showNote === pendingStage.id ? null : pendingStage.id);
                          if (showNote === pendingStage.id) setNote('');
                        }}
                        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg-faint transition hover:text-fg"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        {t('multiStageApproval.requestChanges')}
                      </button>
                    </div>
                    {showNote === pendingStage.id && (
                      <div className="mb-2">
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder={t('multiStageApproval.notePlaceholder')}
                          rows={2}
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-fg placeholder:text-fg-faint/50 focus:border-brand-accent focus:outline-none"
                          aria-label={t('multiStageApproval.note')}
                        />
                        <button
                          onClick={() => handleReview(pendingStage.id, 'request_changes')}
                          disabled={actionLoading === `${pendingStage.id}:request_changes` || !note.trim()}
                          className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-orange-500/15 px-3 py-1.5 text-xs font-bold text-orange-500 transition hover:bg-orange-500/25 disabled:opacity-40"
                        >
                          {actionLoading === `${pendingStage.id}:request_changes` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                          {t('multiStageApproval.requestChanges')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Rejected notice */}
                {isRejected && (
                  <div className="border-t border-line pt-3">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-danger">
                      <XCircle className="h-4 w-4" />
                      {t('multiStageApproval.rejected')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MultiStageApproval;
