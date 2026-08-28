'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  lastFiredAt: string | null;
  lastStatus: number | null;
  createdAt: string;
}

const EVENT_KEYS: Record<string, string> = {
  'creative.generated': 'webhooks.eventCreativeGenerated',
  'creative.scored': 'webhooks.eventCreativeScored',
  'campaign.deployed': 'webhooks.eventCampaignDeployed',
  'campaign.metrics_updated': 'webhooks.eventCampaignMetricsUpdated',
  'pipeline.completed': 'webhooks.eventPipelineCompleted',
  'performance.recorded': 'webhooks.eventPerformanceRecorded',
};

const ALL_EVENTS = Object.keys(EVENT_KEYS);

export function WebhooksSection() {
  const { t } = useI18n();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setEndpoints(data.endpoints || []);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleCreate = async () => {
    setError('');
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      setError(t('webhooks.invalidUrl'));
      return;
    }
    if (selectedEvents.length === 0) {
      setError(t('webhooks.selectEvents'));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, events: selectedEvents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create webhook');
      } else {
        setNewSecret(data.secret);
        setUrl('');
        setSelectedEvents([]);
        await load();
      }
    } catch {
      setError('Network error');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await fetch(`/api/webhooks?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      await load();
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
      await load();
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-2 font-semibold text-fg">{t('webhooks.title')}</h2>
      <p className="mb-4 text-sm text-fg-faint">{t('webhooks.description')}</p>

      {/* Secret alert (shown once after creation) */}
      {newSecret && (
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-line bg-app p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-sm font-semibold text-fg">{t('webhooks.secret')}</p>
            <code className="block break-all text-xs text-fg-secondary">{newSecret}</code>
          </div>
          <button
            onClick={() => setNewSecret(null)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-fg-secondary transition hover:bg-line"
            aria-label={t('common.close')}
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Create form */}
      <div className="mb-6 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-fg-secondary" htmlFor="webhook-url">
            {t('webhooks.url')}
          </label>
          <input
            id="webhook-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t('webhooks.urlPlaceholder')}
            className="w-full rounded-xl border border-line bg-app px-3 py-2 text-sm text-fg outline-none focus:border-fg-secondary"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-fg-secondary">{t('webhooks.events')}</p>
          <div className="flex flex-wrap gap-2">
            {ALL_EVENTS.map((event) => (
              <label
                key={event}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-fg-secondary transition hover:bg-line"
              >
                <input
                  type="checkbox"
                  checked={selectedEvents.includes(event)}
                  onChange={() => toggleEvent(event)}
                  className="h-3.5 w-3.5"
                />
                {t(EVENT_KEYS[event])}
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
          style={{ background: '#0064d9' }}
        >
          {creating ? '…' : t('webhooks.create')}
        </button>
      </div>

      {/* Existing endpoints list */}
      {loading ? (
        <p className="text-sm text-fg-faint">{t('common.loadingDots')}</p>
      ) : endpoints.length === 0 ? (
        <p className="text-sm text-fg-faint">{t('webhooks.noWebhooks')}</p>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <div key={ep.id} className="rounded-xl border border-line bg-app p-4">
              <div className="mb-2 flex items-start justify-between gap-3">
                <code className="min-w-0 flex-1 break-all text-sm text-fg">{ep.url}</code>
                <button
                  onClick={() => handleDelete(ep.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-danger transition hover:bg-line"
                >
                  {t('webhooks.delete')}
                </button>
              </div>

              <div className="mb-2 flex flex-wrap gap-1.5">
                {ep.events.map((event) => (
                  <span
                    key={event}
                    className="rounded-md border border-line px-2 py-0.5 text-xs text-fg-secondary"
                  >
                    {t(EVENT_KEYS[event] || event)}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-faint">
                <button
                  onClick={() => handleToggle(ep.id, ep.active)}
                  className={`rounded-md px-2 py-0.5 font-medium transition ${
                    ep.active
                      ? 'bg-success/10 text-success'
                      : 'bg-line text-fg-secondary'
                  }`}
                >
                  {ep.active ? t('webhooks.active') : t('webhooks.inactive')}
                </button>
                <span>
                  {t('webhooks.lastFired')}: {ep.lastFiredAt ? new Date(ep.lastFiredAt).toLocaleString() : t('webhooks.never')}
                </span>
                {ep.lastStatus !== null && (
                  <span>
                    {t('webhooks.lastStatus')}: {ep.lastStatus === 0 ? 'Error' : ep.lastStatus}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
