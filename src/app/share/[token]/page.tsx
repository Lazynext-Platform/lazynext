'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { FileText, Fish, Target, Sparkles, Package, Loader2, AlertCircle, Lock, Eye } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

const TYPE_ICONS: Record<string, typeof FileText> = {
  creative_package: Package, brief: FileText, hooks: Fish,
  angles: Target, script: FileText, storyboard: FileText,
  score: Sparkles, variants: Sparkles,
};

const TYPE_COLORS: Record<string, string> = {
  creative_package: 'text-brand-accent',
  brief: 'text-brand-accent',
  hooks: 'text-brand-accent',
  angles: 'text-brand-accent',
  script: 'text-fg',
  storyboard: 'text-fg',
  score: 'text-success',
  variants: 'text-brand-accent',
};

function parseMetadata(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

function parseTags(data: unknown): string[] {
  if (typeof data === 'string') {
    try { return JSON.parse(data) as string[]; } catch { return []; }
  }
  if (Array.isArray(data)) return data as string[];
  return [];
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { t } = useI18n();
  const { token } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [asset, setAsset] = useState<{
    id: string; type: string; name: string;
    tags: unknown; metadata: unknown; createdAt: string;
  } | null>(null);
  const [views, setViews] = useState(0);

  const fetchAsset = async (pwd?: string) => {
    setLoading(true);
    setError('');
    setPasswordError(false);
    try {
      const url = `/api/creative/share/${token}${pwd ? `?password=${encodeURIComponent(pwd)}` : ''}`;
      const res = await fetch(url);
      const j = await res.json();
      if (res.status === 403 && j.error === 'password_required') {
        setNeedPassword(true);
        setLoading(false);
        return;
      }
      if (res.status === 410) { setError(t('share.expired')); setLoading(false); return; }
      if (res.status === 404) { setError(t('share.notFound')); setLoading(false); return; }
      if (!res.ok) { setError(j.error || t('share.failedToLoad')); setLoading(false); return; }
      setAsset(j.asset);
      setViews(j.views);
      setNeedPassword(false);
    } catch {
      setError(t('share.networkError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const doFetch = async () => {
      setLoading(true);
      setError('');
      setPasswordError(false);
      try {
        const url = `/api/creative/share/${token}`;
        const res = await fetch(url);
        const j = await res.json();
        if (res.status === 403 && j.error === 'password_required') {
          setNeedPassword(true);
          setLoading(false);
          return;
        }
        if (res.status === 410) { setError(t('share.expired')); setLoading(false); return; }
        if (res.status === 404) { setError(t('share.notFound')); setLoading(false); return; }
        if (!res.ok) { setError(j.error || t('share.failedToLoad')); setLoading(false); return; }
        setAsset(j.asset);
        setViews(j.views);
        setNeedPassword(false);
      } catch {
        setError(t('share.networkError'));
      } finally {
        setLoading(false);
      }
    };
    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    fetchAsset(password.trim());
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-app pb-safe flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-accent" role="status" aria-label={t('share.loading')} />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-app pb-safe flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-danger/30 bg-danger/5 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-danger" />
          <p className="text-sm font-medium text-danger">{error}</p>
          <a href="/" className="mt-4 inline-block text-xs text-brand-accent hover:underline">
            {t('share.backToLazynext')}
          </a>
        </div>
      </div>
    );
  }

  // ── Password form ──
  if (needPassword && !asset) {
    return (
      <div className="min-h-screen bg-app pb-safe flex items-center justify-center px-4">
        <form
          onSubmit={handlePasswordSubmit}
          className="max-w-md w-full rounded-2xl border border-line bg-surface p-6"
        >
          <Lock className="mx-auto mb-3 h-10 w-10 text-brand-accent" />
          <h1 className="text-center text-lg font-bold text-fg">{t('share.passwordRequired')}</h1>
          <p className="mt-1 text-center text-xs text-fg-faint">
            {t('share.passwordSubtitle')}
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
            placeholder={t('share.passwordPlaceholder')}
            aria-label={t('share.passwordLabel')}
            className="mt-4 w-full rounded-xl border border-line bg-app px-4 py-2.5 text-sm text-fg placeholder:text-fg-placeholder focus:border-brand-accent focus:outline-none"
            autoFocus
          />
          {passwordError && (
            <p role="alert" className="mt-2 text-xs text-danger">{t('share.passwordError')}</p>
          )}
          <button
            type="submit"
            className="mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            {t('share.passwordSubmit')}
          </button>
        </form>
      </div>
    );
  }

  // ── Asset view ──
  if (!asset) return null;

  const Icon = TYPE_ICONS[asset.type] || FileText;
  const color = TYPE_COLORS[asset.type] || 'text-fg';
  const meta = parseMetadata(asset.metadata);
  const tags = parseTags(asset.tags);

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Icon className={`h-7 w-7 shrink-0 ${color}`} />
          <h1 className="text-2xl font-bold text-fg sm:text-3xl break-words">{asset.name}</h1>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-fg-faint">
          <span className="rounded bg-hover px-2 py-1 font-medium text-fg-faint">{asset.type}</span>
          <span>{t('share.createdAt')} {new Date(asset.createdAt).toLocaleDateString()}</span>
          <span className="flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {views} {t('share.views')}
          </span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-[#00b2fc]/10 px-2 py-0.5 text-[11px]"
                style={{ color: 'var(--color-brand-accent)' }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Metadata */}
        {meta && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-fg">{t('share.details')}</h2>
            <pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl border border-line bg-surface p-4 text-xs text-fg-faint">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-line pt-4">
          <a href="/" className="text-xs text-brand-accent hover:underline">
            {t('share.backToLazynext')}
          </a>
        </div>
      </div>
    </div>
  );
}
