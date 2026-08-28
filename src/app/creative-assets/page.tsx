'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  FileText, Fish, Target, Sparkles, Package, Loader2, AlertCircle,
  ChevronDown, ChevronRight, Coins,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

type Asset = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  tags: unknown;
  metadata: unknown;
  createdAt: string;
};

const TYPE_ICONS: Record<string, typeof FileText> = {
  creative_package: Package,
  brief: FileText,
  hooks: Fish,
  angles: Target,
  script: FileText,
  storyboard: FileText,
  score: Sparkles,
  variants: Sparkles,
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

export default function CreativeAssetsPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!session?.user) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const res = await fetch(`/api/creative/assets${params}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error('auth');
        if (res.status === 402) throw new Error('credits');
        if (res.status >= 500) throw new Error('server');
        throw new Error('failed');
      }
      const j = await res.json().catch(() => ({}));
      setAssets(j?.assets || []);
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      if (code === 'auth') setError(t('common.errUnauthorized'));
      else if (code === 'credits') setError(t('common.errPaymentRequired'));
      else if (code === 'server') setError(t('common.errServer'));
      else if (e instanceof TypeError) setError(t('common.errNetwork'));
      else setError(t('cassets.errFailed'));
    }
    setLoading(false);
  }, [session, filter, t]);

  useEffect(() => { load(); }, [load]);

  // Group assets: parent packages with their children
  const packages = assets.filter((a) => a.type === 'creative_package');
  const standalone = assets.filter((a) => a.type !== 'creative_package' && !a.parentId);
  const childrenOf = (parentId: string) => assets.filter((a) => a.parentId === parentId);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-app pb-safe">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-bold text-fg sm:text-3xl">
            <Package className="mr-2 inline h-7 w-7 text-brand-accent" />
            {t('cassets.title')}
          </h1>
          <p className="mt-2 text-sm text-fg-faint">{t('cassets.signInPrompt')}</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-4 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: '#0064d9' }}
          >
            {t('cassets.signIn')}
          </button>
          <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app pb-safe">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8" aria-busy={loading}>
        <h1 className="text-2xl font-bold text-fg sm:text-3xl">
          <Package className="mr-2 inline h-7 w-7 text-brand-accent" />
          {t('cassets.title')}
        </h1>
        <p className="mt-2 text-sm text-fg-faint">
          {t('cassets.subtitle')}
        </p>

        {/* Filter */}
        <div className="mt-4 flex gap-2">
          {['all', 'creative_package', 'brief', 'hooks', 'angles', 'script', 'variants'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filter === f
                  ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                  : 'text-fg-faint hover:bg-hover hover:text-fg'
              }`}
            >
              {f === 'all' ? t('cassets.filterAll') : f === 'creative_package' ? t('cassets.filterPackages') : f === 'brief' ? t('cassets.filterBrief') : f === 'hooks' ? t('cassets.filterHooks') : f === 'angles' ? t('cassets.filterAngles') : f === 'script' ? t('cassets.filterScript') : f === 'variants' ? t('cassets.filterVariants') : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading && <Loader2 className="mt-6 h-6 w-6 animate-spin text-brand-accent" role="status" aria-label={t('common.loadingDots')} />}

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
            <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          </div>
        )}

        {!loading && assets.length === 0 && (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
            <Package className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
            <p className="text-sm text-fg-faint">{t('cassets.noData')}</p>
            <p className="mt-1 text-xs text-fg-faint">{t('cassets.noDataHint')}</p>
          </div>
        )}

        {/* Packages */}
        {packages.length > 0 && (
          <div className="mt-6 space-y-3">
            {packages.map((pkg) => {
              const meta = parseMetadata(pkg.metadata);
              const children = childrenOf(pkg.id);
              const isExpanded = expandedId === pkg.id;
              return (
                <div key={pkg.id} className="rounded-2xl border border-line bg-surface p-4">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : pkg.id)}
                    className="flex w-full items-center justify-between text-left"
                    aria-expanded={isExpanded}
                    aria-label={pkg.name}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-faint" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-faint" />}
                      <Package className="h-4 w-4 shrink-0 text-brand-accent" />
                      <span className="text-sm font-bold text-fg truncate">{pkg.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fg-faint">
                      {meta?.totalCreditsSpent !== undefined && (
                        <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {String(meta.totalCreditsSpent)}cr</span>
                      )}
                      <span>{new Date(pkg.createdAt).toLocaleDateString()}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-3 space-y-2 border-t border-line pt-3">
                      {children.length === 0 && (
                        <p className="text-xs text-fg-faint">{t('cassets.noChildren')}</p>
                      )}
                      {children.map((child) => {
                        const childMeta = parseMetadata(child.metadata);
                        const Icon = TYPE_ICONS[child.type] || FileText;
                        const color = TYPE_COLORS[child.type] || 'text-fg';
                        const tags = parseTags(child.tags);
                        return (
                          <div key={child.id} className="rounded-xl bg-app p-3">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-3.5 w-3.5 ${color}`} />
                              <span className="text-xs font-bold text-fg truncate">{child.name}</span>
                              <span className="rounded bg-hover px-1.5 py-0.5 text-[10px] text-fg-faint">{child.type}</span>
                              {tags.length > 0 && tags.map((tag) => (
                                <span key={tag} className="rounded bg-[#00b2fc]/10 px-1.5 py-0.5 text-[10px]" style={{ color: 'var(--color-brand-accent)' }}>{tag}</span>
                              ))}
                            </div>
                            {childMeta && (
                              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-surface p-2 text-[10px] text-fg-faint">
                                {JSON.stringify(childMeta, null, 2)}
                              </pre>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Standalone assets (not part of a package) */}
        {standalone.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-bold text-fg">{t('cassets.standaloneAssets')}</h2>
            <div className="mt-3 space-y-2">
              {standalone.map((asset) => {
                const meta = parseMetadata(asset.metadata);
                const Icon = TYPE_ICONS[asset.type] || FileText;
                return (
                  <div key={asset.id} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-brand-accent" />
                      <span className="text-xs font-bold text-fg truncate">{asset.name}</span>
                      <span className="rounded bg-hover px-1.5 py-0.5 text-[10px] text-fg-faint">{asset.type}</span>
                    </div>
                    {meta && (
                      <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-app p-2 text-[10px] text-fg-faint">
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
