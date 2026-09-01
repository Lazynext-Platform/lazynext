'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PenLine, Loader2, AlertCircle, Sparkles, Copy, Check } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';
import type { AdCopyResult, AdCopyPlatform } from '@/lib/creative/ad-copy-generator';

const CREDIT_COST = 3;

const PLATFORMS: AdCopyPlatform[] = ['tiktok', 'instagram', 'youtube'];

function CopyButton({ text, label }: { text: string; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }, [text]);
  if (!text) return null;
  return (
    <button
      onClick={onCopy}
      aria-label={`${t('adCopyGenerator.copy')} ${label}`}
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-secondary px-2 py-1 text-xs font-medium text-fg-muted hover:text-fg hover:bg-hover transition"
    >
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
      {copied ? t('adCopyGenerator.copied') : t('adCopyGenerator.copy')}
    </button>
  );
}

export default function AdCopyGeneratorPage() {
  const { t } = useI18n();
  const { data: session } = useSession();

  const [source, setSource] = useState('');
  const [platform, setPlatform] = useState<AdCopyPlatform>('tiktok');
  const [brandName, setBrandName] = useState('');
  const [tone, setTone] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AdCopyResult | null>(null);

  const generate = useCallback(async () => {
    if (!source.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const brandKit = {
        brandName: brandName.trim() || undefined,
        tone: tone.trim() ? tone.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        keywords: keywords.trim() ? keywords.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      };
      const res = await fetch('/api/creative/ad-copy-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          platform,
          brandKit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('adCopyGenerator.generate'));
      setResult(data.result as AdCopyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [source, platform, brandName, tone, keywords, t]);

  if (!session?.user) {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><PenLine className="w-6 h-6" /> {t('adCopyGenerator.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCopyGenerator.signInPrompt')}</p>
        </div>
        <AuthModal open={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-bold flex items-center gap-2"><PenLine className="w-6 h-6" /> {t('adCopyGenerator.title')}</h1>
          <p className="text-sm text-fg-muted mt-2">{t('adCopyGenerator.subtitle')}</p>
        </header>

        <div className="space-y-4">
          <div>
            <label htmlFor="acgSource" className="block text-sm font-medium mb-1">{t('adCopyGenerator.productUrl')} / {t('adCopyGenerator.briefText')}</label>
            <textarea id="acgSource" value={source} onChange={(e) => setSource(e.target.value)} placeholder={t('adCopyGenerator.briefPlaceholder')} rows={4} className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-y" disabled={loading} />
          </div>

          <div>
            <label htmlFor="acgPlatform" className="block text-sm font-medium mb-1">{t('adCopyGenerator.platform')}</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  disabled={loading}
                  aria-pressed={platform === p}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    platform === p
                      ? 'border-brand-accent bg-brand-accent/15 text-brand-accent'
                      : 'border-border bg-bg-card text-fg-muted hover:text-fg hover:bg-hover'
                  }`}
                >
                  {t(`adCopyGenerator.${p}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold">{t('adCopyGenerator.brandKit')}</h2>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="acgBrandName" className="block text-sm font-medium mb-1">{t('adCopyGenerator.brandName')}</label>
                <input id="acgBrandName" type="text" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g., Acme" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="acgTone" className="block text-sm font-medium mb-1">{t('adCopyGenerator.tone')}</label>
                <input id="acgTone" type="text" value={tone} onChange={(e) => setTone(e.target.value)} placeholder="e.g., playful, bold" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
              <div>
                <label htmlFor="acgKeywords" className="block text-sm font-medium mb-1">{t('adCopyGenerator.keywords')}</label>
                <input id="acgKeywords" type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g., quality, affordable" className="w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent" disabled={loading} />
              </div>
            </div>
          </div>

          <button onClick={generate} disabled={loading || !source.trim()} className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? t('adCopyGenerator.generating') : `${t('adCopyGenerator.generate')} (${CREDIT_COST} credits)`}
          </button>
        </div>

        {error && <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2"><AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}</div>}

        {!loading && !result && !error && (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-fg-muted">
            {t('adCopyGenerator.noResults')}
          </div>
        )}

        {loading && (
          <div className="rounded-lg border border-border bg-bg-card p-6 flex items-center justify-center gap-2 text-sm text-fg-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> {t('adCopyGenerator.generating')}
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adCopyGenerator.headline')}</h3>
                <CopyButton text={result.headline} label={t('adCopyGenerator.headline')} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.headline}</p>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adCopyGenerator.bodyCopy')}</h3>
                <CopyButton text={result.bodyCopy} label={t('adCopyGenerator.bodyCopy')} />
              </div>
              <p className="text-sm whitespace-pre-wrap">{result.bodyCopy}</p>
            </div>

            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{t('adCopyGenerator.cta')}</h3>
                <CopyButton text={result.cta} label={t('adCopyGenerator.cta')} />
              </div>
              <p className="text-sm">{result.cta}</p>
            </div>

            {result.hashtags.length > 0 && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{t('adCopyGenerator.hashtags')}</h3>
                  <CopyButton text={result.hashtags.join(' ')} label={t('adCopyGenerator.hashtags')} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((h, i) => (
                    <span key={i} className="inline-block rounded-full bg-bg-secondary px-2 py-0.5 text-xs text-brand-accent">{h}</span>
                  ))}
                </div>
              </div>
            )}

            {result.description && (
              <div className="rounded-lg border border-border bg-bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{t('adCopyGenerator.description')}</h3>
                  <CopyButton text={result.description} label={t('adCopyGenerator.description')} />
                </div>
                <p className="text-sm whitespace-pre-wrap">{result.description}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
