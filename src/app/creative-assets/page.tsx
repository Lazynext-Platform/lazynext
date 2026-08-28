'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  FileText, Fish, Target, Sparkles, Package, Loader2, AlertCircle,
  ChevronDown, ChevronRight, Coins, Search, X, Check, ArrowUpDown,
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

const TYPE_FILTERS = [
  'creative_package',
  'brief',
  'hooks',
  'angles',
  'script',
  'storyboard',
  'score',
  'variants',
] as const;

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

function typeLabel(type: string, t: (k: string) => string): string {
  switch (type) {
    case 'creative_package': return t('cassets.filterPackages');
    case 'brief': return t('cassets.filterBrief');
    case 'hooks': return t('cassets.filterHooks');
    case 'angles': return t('cassets.filterAngles');
    case 'script': return t('cassets.filterScript');
    case 'variants': return t('cassets.filterVariants');
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
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

  // Gallery features
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Asset | null>(null);
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Compare mode
  const router = useRouter();
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState<string[]>([]);

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

  // Escape to close lightbox
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreview(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [preview]);

  // Client-side filtering by search + typeFilter
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      if (typeFilter && a.type !== typeFilter) return false;
      if (q && !a.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [assets, search, typeFilter]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleCompare = (id: string) => {
    setCompareSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareSelected([]);
  };

  const goCompare = () => {
    if (compareSelected.length !== 2) return;
    router.push(`/creative-diff?a=${compareSelected[0]}&b=${compareSelected[1]}`);
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const confirmed = window.confirm(t('cassets.galleryDeleteConfirm', { '0': ids.length }));
    if (!confirmed) return;
    setBulkDeleting(true);
    setBulkStatus('');
    try {
      const results = await Promise.allSettled(
        ids.map((id) => fetch(`/api/creative/assets?id=${id}`, { method: 'DELETE' })),
      );
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      setBulkStatus(t('cassets.galleryDeleteSuccess', { '0': successCount, '1': ids.length }));
      setSelected(new Set());
      setSelectMode(false);
      await load();
    } finally {
      setBulkDeleting(false);
    }
  };

  // Group assets: parent packages with their children
  const packages = filteredAssets.filter((a) => a.type === 'creative_package');
  const standalone = filteredAssets.filter((a) => a.type !== 'creative_package' && !a.parentId);
  const childrenOf = (parentId: string) => filteredAssets.filter((a) => a.parentId === parentId);

  const hasResults = packages.length > 0 || standalone.length > 0;

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

        {/* Search bar */}
        <div className="mt-4 relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('cassets.gallerySearch')}
            aria-label={t('cassets.gallerySearch')}
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-9 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-[#00b2fc]/40"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-faint hover:text-fg"
              aria-label={t('cassets.galleryClose')}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              typeFilter === null
                ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                : 'text-fg-faint hover:bg-hover hover:text-fg'
            }`}
          >
            {t('cassets.galleryFilterAll')}
          </button>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === f
                  ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                  : 'text-fg-faint hover:bg-hover hover:text-fg'
              }`}
            >
              {typeLabel(f, t)}
            </button>
          ))}
        </div>

        {/* Selection toolbar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!selectMode && !compareMode ? (
            <>
              <button
                onClick={() => setSelectMode(true)}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-hover"
              >
                {t('cassets.gallerySelect')}
              </button>
              <button
                onClick={() => setCompareMode(true)}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-hover"
              >
                <ArrowUpDown className="mr-1 inline h-3.5 w-3.5" />
                {t('cassets.compare')}
              </button>
            </>
          ) : selectMode ? (
            <>
              <button
                onClick={bulkDelete}
                disabled={selected.size === 0 || bulkDeleting}
                className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-bold text-danger disabled:opacity-40"
              >
                {bulkDeleting ? (
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
                ) : (
                  `${t('cassets.galleryDeleteSelected')} (${selected.size})`
                )}
              </button>
              <button
                onClick={exitSelectMode}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-hover"
              >
                {t('cassets.galleryCancel')}
              </button>
            </>
          ) : (
            <>
              <span className="text-xs font-medium text-fg-faint">
                {t('cassets.compareSelected', { '0': compareSelected.length })}
              </span>
              <button
                onClick={goCompare}
                disabled={compareSelected.length !== 2}
                className="rounded-lg border border-[#00b2fc]/30 bg-[#00b2fc]/10 px-3 py-1.5 text-xs font-bold text-[#00b2fc] disabled:opacity-40"
              >
                {t('cassets.compareGo')}
              </button>
              <button
                onClick={exitCompareMode}
                className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-hover"
              >
                {t('cassets.galleryCancel')}
              </button>
            </>
          )}
        </div>

        {bulkStatus && (
          <div role="status" className="mt-3 rounded-xl border border-success/30 bg-success/5 p-3 text-xs text-success">
            {bulkStatus}
          </div>
        )}

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

        {!loading && assets.length > 0 && !hasResults && (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
            <Search className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
            <p className="text-sm text-fg-faint">{t('cassets.galleryNoResults')}</p>
          </div>
        )}

        {/* Packages */}
        {packages.length > 0 && (
          <div className="mt-6 space-y-3">
            {packages.map((pkg) => {
              const meta = parseMetadata(pkg.metadata);
              const children = childrenOf(pkg.id);
              const isExpanded = expandedId === pkg.id;
              const isSelected = selected.has(pkg.id);
              const isCompareSelected = compareSelected.includes(pkg.id);
              return (
                <div
                  key={pkg.id}
                  className={`rounded-2xl border bg-surface p-4 transition ${
                    isSelected || isCompareSelected ? 'border-[#00b2fc]/50 ring-1 ring-[#00b2fc]/30' : 'border-line'
                  }`}
                >
                  <div className="flex w-full items-center justify-between text-left">
                    <div className="flex items-center gap-2 min-w-0">
                      {selectMode && (
                        <button
                          onClick={() => toggleSelect(pkg.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isSelected
                              ? 'border-[#00b2fc] bg-[#00b2fc]/15'
                              : 'border-line bg-app'
                          }`}
                          aria-label={isSelected ? `Deselect ${pkg.name}` : `Select ${pkg.name}`}
                          aria-pressed={isSelected}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-[#00b2fc]" />}
                        </button>
                      )}
                      {compareMode && (
                        <button
                          onClick={() => toggleCompare(pkg.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isCompareSelected
                              ? 'border-[#00b2fc] bg-[#00b2fc]/15'
                              : 'border-line bg-app'
                          }`}
                          aria-label={isCompareSelected ? `Deselect ${pkg.name}` : `Select ${pkg.name}`}
                          aria-pressed={isCompareSelected}
                        >
                          {isCompareSelected && <Check className="h-3.5 w-3.5 text-[#00b2fc]" />}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (selectMode) toggleSelect(pkg.id);
                          else if (compareMode) toggleCompare(pkg.id);
                          else setExpandedId(isExpanded ? null : pkg.id);
                        }}
                        className="flex items-center gap-2 min-w-0"
                        aria-expanded={isExpanded}
                        aria-label={pkg.name}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-faint" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-faint" />}
                        <Package className="h-4 w-4 shrink-0 text-brand-accent" />
                        <span
                          className="text-sm font-bold text-fg truncate hover:text-brand-accent"
                          role={selectMode ? undefined : 'button'}
                        >
                          {pkg.name}
                        </span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-fg-faint">
                      {meta?.totalCreditsSpent !== undefined && (
                        <span className="flex items-center gap-1"><Coins className="h-3 w-3" /> {String(meta.totalCreditsSpent)}cr</span>
                      )}
                      <span>{new Date(pkg.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

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
                        const childSelected = selected.has(child.id);
                        return (
                          <div
                            key={child.id}
                            className={`rounded-xl bg-app p-3 transition ${
                              childSelected ? 'ring-1 ring-[#00b2fc]/30' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {selectMode && (
                                <button
                                  onClick={() => toggleSelect(child.id)}
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                                    childSelected
                                      ? 'border-[#00b2fc] bg-[#00b2fc]/15'
                                      : 'border-line bg-surface'
                                  }`}
                                  aria-label={childSelected ? `Deselect ${child.name}` : `Select ${child.name}`}
                                  aria-pressed={childSelected}
                                >
                                  {childSelected && <Check className="h-3.5 w-3.5 text-[#00b2fc]" />}
                                </button>
                              )}
                              <Icon className={`h-3.5 w-3.5 ${color}`} />
                              <button
                                onClick={() => {
                                  if (selectMode) toggleSelect(child.id);
                                  else setPreview(child);
                                }}
                                className="text-xs font-bold text-fg truncate hover:text-brand-accent"
                              >
                                {child.name}
                              </button>
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
                const isSelected = selected.has(asset.id);
                return (
                  <div
                    key={asset.id}
                    className={`rounded-xl border bg-surface p-3 transition ${
                      isSelected ? 'border-[#00b2fc]/50 ring-1 ring-[#00b2fc]/30' : 'border-line'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {selectMode && (
                        <button
                          onClick={() => toggleSelect(asset.id)}
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                            isSelected
                              ? 'border-[#00b2fc] bg-[#00b2fc]/15'
                              : 'border-line bg-app'
                          }`}
                          aria-label={isSelected ? `Deselect ${asset.name}` : `Select ${asset.name}`}
                          aria-pressed={isSelected}
                        >
                          {isSelected && <Check className="h-3.5 w-3.5 text-[#00b2fc]" />}
                        </button>
                      )}
                      <Icon className="h-3.5 w-3.5 text-brand-accent" />
                      <button
                        onClick={() => {
                          if (selectMode) toggleSelect(asset.id);
                          else setPreview(asset);
                        }}
                        className="text-xs font-bold text-fg truncate hover:text-brand-accent"
                      >
                        {asset.name}
                      </button>
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

      {/* Lightbox / preview modal */}
      {preview && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('cassets.galleryPreview')}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-2xl border border-line bg-surface p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold text-fg">{preview.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-hover px-2 py-0.5 text-xs text-fg-faint">{preview.type}</span>
                  <span className="text-xs text-fg-faint">
                    {new Date(preview.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreview(null)}
                className="shrink-0 rounded-lg p-1 text-fg-faint hover:text-fg"
                aria-label={t('cassets.galleryClose')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {parseTags(preview.tags).length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {parseTags(preview.tags).map((tag) => (
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

            {parseMetadata(preview.metadata) && (
              <div>
                <p className="mb-1 text-xs font-medium text-fg-faint">Metadata</p>
                <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-app p-3 text-[11px] text-fg-faint">
                  {JSON.stringify(parseMetadata(preview.metadata), null, 2)}
                </pre>
              </div>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl border border-line bg-app px-4 py-2 text-sm font-medium text-fg hover:bg-hover"
              >
                {t('cassets.galleryClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
