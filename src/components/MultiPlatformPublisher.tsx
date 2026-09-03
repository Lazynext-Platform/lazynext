'use client';

import { useState, useCallback, useEffect } from 'react';
import { Send, Loader2, AlertCircle, Calendar, CheckCircle2, XCircle, Clock, Share2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { PublishPlatform, PublishResult, PlatformCapabilities } from '@/lib/publishing/types';

const PLATFORM_LABELS: Record<PublishPlatform, string> = {
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  instagram_reels: 'Instagram Reels',
  facebook: 'Facebook',
  twitter: 'Twitter/X',
  linkedin: 'LinkedIn',
};

export function MultiPlatformPublisher() {
  const { t } = useI18n();
  const [mediaUrl, setMediaUrl] = useState('');
  const [platform, setPlatform] = useState<PublishPlatform>('tiktok');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState('public');
  const [scheduleAt, setScheduleAt] = useState('');
  const [crossPost, setCrossPost] = useState<PublishPlatform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<PublishResult[]>([]);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities[]>([]);

  useEffect(() => {
    fetch('/api/publish/capabilities').then((r) => r.json()).then((d) => setCapabilities(d.platforms || [])).catch(() => {});
  }, []);

  const currentCap = capabilities.find((c) => c.platform === platform);

  const publish = useCallback(async (schedule: boolean) => {
    if (!mediaUrl.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const endpoint = schedule ? '/api/publish/schedule' : '/api/publish';
      const body: Record<string, unknown> = {
        platform,
        mediaUrl,
        caption,
        hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
        description: description || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        privacyLevel,
        crossPostTo: crossPost.length > 0 ? crossPost : undefined,
      };
      if (schedule && scheduleAt) body.scheduleAt = scheduleAt;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResults(Array.isArray(data.results) ? data.results : [data.result]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [mediaUrl, platform, caption, hashtags, description, thumbnailUrl, privacyLevel, crossPost, scheduleAt]);

  const toggleCrossPost = (p: PublishPlatform) => {
    setCrossPost((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const statusIcon = (status: PublishResult['status']) => {
    if (status === 'published') return <CheckCircle2 className="w-4 h-4 text-success" />;
    if (status === 'dry_run') return <AlertCircle className="w-4 h-4 text-warning" />;
    if (status === 'scheduled') return <Clock className="w-4 h-4 text-warning" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-danger" />;
    return <Clock className="w-4 h-4 text-fg-muted" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Send className="w-5 h-5" />
          {t('publish.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('publish.subtitle')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="mediaUrl" className="block text-sm font-medium mb-1">{t('publish.mediaUrl')}</label>
          <input
            id="mediaUrl"
            type="url"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder={t('publish.phMediaUrl')}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('publish.platform')}</label>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('publish.platform')}>
            {(Object.keys(PLATFORM_LABELS) as PublishPlatform[]).map((p) => (
              <button
                key={p}
                role="radio"
                aria-checked={platform === p}
                onClick={() => setPlatform(p)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${platform === p ? 'border-brand-accent bg-brand-accent/10 text-brand-accent' : 'border-border hover:bg-bg-secondary'}`}
              >
                {PLATFORM_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="caption" className="block text-sm font-medium mb-1">
            {t('publish.caption')} {currentCap && <span className="text-xs text-fg-muted">({caption.length}/{currentCap.maxCaptionLength})</span>}
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            rows={3}
            maxLength={currentCap?.maxCaptionLength}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="hashtags" className="block text-sm font-medium mb-1">{t('publish.hashtags')}</label>
          <input
            id="hashtags"
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder={t('publish.phHashtags')}
            className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            disabled={loading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="privacy" className="block text-sm font-medium mb-1">{t('publish.privacy')}</label>
            <select
              id="privacy"
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
              <option value="unlisted">Unlisted</option>
              <option value="followers">Followers</option>
            </select>
          </div>
          <div>
            <label htmlFor="schedule" className="block text-sm font-medium mb-1">{t('publish.scheduleAt')}</label>
            <input
              id="schedule"
              type="datetime-local"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">{t('publish.crossPost')}</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(PLATFORM_LABELS) as PublishPlatform[]).filter((p) => p !== platform).map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={crossPost.includes(p)}
                  onChange={() => toggleCrossPost(p)}
                  disabled={loading}
                />
                {PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => publish(false)}
            disabled={loading || !mediaUrl.trim()}
            className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('publish.publishNow')} (3 {t('publish.credits')})
          </button>
          {scheduleAt && (
            <button
              onClick={() => publish(true)}
              disabled={loading || !mediaUrl.trim()}
              className="rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-4 py-2 text-sm font-medium text-brand-accent hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              {t('publish.schedule')} (1 {t('publish.credits')})
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">{t('publish.results')}</h3>
          {results.map((r, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-card p-3 flex items-center gap-3">
              {statusIcon(r.status)}
              <div className="flex-1">
                <p className="text-sm font-medium">{PLATFORM_LABELS[r.platform]}</p>
                <p className="text-xs text-fg-muted capitalize">{r.status}</p>
                {r.postUrl && /^https?:\/\//i.test(r.postUrl) && <a href={r.postUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-accent hover:underline">{r.postUrl}</a>}
                {r.error && <p className="text-xs text-danger">{r.error}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
