'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  CheckCircle2, XCircle, MessageSquare, Loader2, AlertCircle,
  Clock, Package, Megaphone, ArrowLeft,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import { MultiStageApproval } from '@/components/MultiStageApproval';

type PendingItem = {
  id: string;
  name: string;
  type: 'campaign' | 'creative';
  platform?: string;
  budgetDaily?: number | null;
  createdAt: string;
};

type ApprovalResult = {
  ok: boolean;
  id: string;
  type: string;
  action: string;
  newStatus: string;
  note: string;
};

export default function ApprovalQueuePage() {
  const { status } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<{ campaigns: PendingItem[]; assets: PendingItem[]; stats: { totalPending: number; pendingCampaigns: number; pendingCreatives: number } } | null>(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (status !== 'authenticated') { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/creative/approvals', { cache: 'no-store' });
      if (!res.ok) throw new Error('load_failed');
      const j = await res.json();
      setItems(j);
    } catch {
      setError('Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (type: 'campaign' | 'creative', id: string, action: 'approve' | 'reject' | 'request_changes') => {
    setActionLoading(`${type}:${id}:${action}`);
    try {
      const res = await fetch('/api/creative/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, action, note: showNote === `${type}:${id}` ? note : '' }),
      });
      if (!res.ok) throw new Error('action_failed');
      // Remove from list
      if (items) {
        setItems({
          ...items,
          campaigns: type === 'campaign' ? items.campaigns.filter(c => c.id !== id) : items.campaigns,
          assets: type === 'creative' ? items.assets.filter(a => a.id !== id) : items.assets,
          stats: {
            ...items.stats,
            totalPending: items.stats.totalPending - 1,
            pendingCampaigns: type === 'campaign' ? items.stats.pendingCampaigns - 1 : items.stats.pendingCampaigns,
            pendingCreatives: type === 'creative' ? items.stats.pendingCreatives - 1 : items.stats.pendingCreatives,
          },
        });
      }
      setNote('');
      setShowNote(null);
    } catch {
      setError('Action failed');
    } finally {
      setActionLoading(null);
    }
  }, [items, note, showNote]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-fg-faint">{t('approvals.signInRequired')}</p>
          <button onClick={() => setAuthOpen(true)} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-white">
            {t('approvals.signIn')}
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </div>
    );
  }

  const allItems: PendingItem[] = [
    ...(items?.campaigns || []).map(c => ({ ...c, type: 'campaign' as const })),
    ...(items?.assets || []).map(a => ({ ...a, type: 'creative' as const })),
  ];

  return (
    <div id="main-content" className="min-h-screen bg-app pb-20">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/dashboard" className="text-fg-faint hover:text-fg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Clock className="h-6 w-6 text-brand-accent" />
          <h1 className="text-2xl font-bold text-fg">{t('approvals.title')}</h1>
          {items && items.stats.totalPending > 0 && (
            <span className="rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
              {items.stats.totalPending} {t('approvals.pending')}
            </span>
          )}
        </div>

        <p className="mb-6 text-sm text-fg-faint">{t('approvals.description')}</p>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-danger/70 hover:text-danger">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-brand-accent" />
          </div>
        )}

        {/* Empty state */}
        {!loading && allItems.length === 0 && (
          <div className="rounded-2xl border border-line bg-surface p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" />
            <p className="text-sm font-medium text-fg">{t('approvals.empty')}</p>
            <p className="mt-1 text-xs text-fg-faint">{t('approvals.emptyDesc')}</p>
          </div>
        )}

        {/* Approval items */}
        {!loading && allItems.length > 0 && (
          <div className="space-y-4">
            {allItems.map((item) => {
              const itemKey = `${item.type}:${item.id}`;
              const isShowingNote = showNote === itemKey;
              return (
                <div key={itemKey} className="rounded-xl border border-line bg-surface p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${
                        item.type === 'campaign' ? 'bg-brand-accent/15 text-brand-accent' : 'bg-success/15 text-success'
                      }`}>
                        {item.type === 'campaign' ? <Megaphone className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-fg">{item.name}</h3>
                        <div className="mt-1 flex items-center gap-2 text-xs text-fg-faint">
                          <span className="rounded bg-app border border-line px-1.5 py-0.5">
                            {item.type === 'campaign' ? (item.platform || 'campaign') : 'creative'}
                          </span>
                          {item.budgetDaily && (
                            <span>${item.budgetDaily}/day</span>
                          )}
                          <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Note input (collapsible) */}
                  {isShowingNote && (
                    <div className="mt-3">
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={t('approvals.notePlaceholder')}
                        rows={2}
                        className="w-full rounded-lg border border-line bg-app px-3 py-2 text-xs text-fg placeholder:text-fg-faint/50 focus:border-brand-accent focus:outline-none"
                        aria-label={t('approvals.noteLabel')}
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleAction(item.type, item.id, 'approve')}
                      disabled={actionLoading === itemKey + ':approve'}
                      className="flex items-center gap-1.5 rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success transition hover:bg-success/25 disabled:opacity-40"
                    >
                      {actionLoading === itemKey + ':approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      {t('approvals.approve')}
                    </button>
                    <button
                      onClick={() => handleAction(item.type, item.id, 'reject')}
                      disabled={actionLoading === itemKey + ':reject'}
                      className="flex items-center gap-1.5 rounded-lg bg-danger/15 px-3 py-1.5 text-xs font-bold text-danger transition hover:bg-danger/25 disabled:opacity-40"
                    >
                      {actionLoading === itemKey + ':reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      {t('approvals.reject')}
                    </button>
                    <button
                      onClick={() => {
                        setShowNote(isShowingNote ? null : itemKey);
                        if (isShowingNote) setNote('');
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-line bg-app px-3 py-1.5 text-xs font-medium text-fg-faint transition hover:text-fg"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {t('approvals.requestChanges')}
                    </button>
                    {isShowingNote && (
                      <button
                        onClick={() => handleAction(item.type, item.id, 'request_changes')}
                        disabled={actionLoading === itemKey + ':request_changes' || !note.trim()}
                        className="rounded-lg bg-warning/15 px-3 py-1.5 text-xs font-bold text-warning transition hover:bg-warning/25 disabled:opacity-40"
                      >
                        {actionLoading === itemKey + ':request_changes' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('approvals.submitNote')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Multi-Stage Approval Workflow */}
        <div className="mt-8">
          <MultiStageApproval />
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
