'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Search, X, Loader2, AlertCircle, Sparkles, Tag, Image as ImageIcon,
  Video, Check, RefreshCw,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type Asset = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
  tags: unknown;
  metadata: unknown;
  createdAt: string;
};

type AutoTagInfo = {
  category?: string;
  mood?: string;
  colorPalette?: string[];
  sceneType?: string;
  productType?: string;
  description?: string;
  taggedAt?: string;
};

const CATEGORIES = ['product', 'lifestyle', 'background', 'logo', 'texture', 'model', 'scene'];
const MOODS = ['energetic', 'calm', 'luxurious', 'playful', 'professional', 'minimal', 'bold'];
const PRODUCT_TYPES = ['skincare', 'fashion', 'tech', 'food', 'fitness', 'home'];

function parseTags(data: unknown): string[] {
  if (typeof data === 'string') {
    try { return JSON.parse(data) as string[]; } catch { return []; }
  }
  if (Array.isArray(data)) return data as string[];
  return [];
}

function parseMetadata(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return null; }
  }
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

function getAutoTag(metadata: unknown): AutoTagInfo | null {
  const meta = parseMetadata(metadata);
  if (!meta) return null;
  const at = meta.autoTag;
  if (at && typeof at === 'object') return at as AutoTagInfo;
  return null;
}

export function SmartAssetLibrary() {
  const { t } = useI18n();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [moodFilter, setMoodFilter] = useState<string | null>(null);
  const [productTypeFilter, setProductTypeFilter] = useState<string | null>(null);

  const [taggingId, setTaggingId] = useState<string | null>(null);
  const [taggingAll, setTaggingAll] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/creative/assets');
      if (!res.ok) throw new Error('failed');
      const j = await res.json().catch(() => ({}));
      setAssets(j?.assets || []);
    } catch (e) {
      setError(t('smartAssets.error'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const showStatus = (msg: string, type: 'success' | 'error') => {
    setStatusMsg(msg);
    setStatusType(type);
    setTimeout(() => { setStatusMsg(''); setStatusType(''); }, 4000);
  };

  const autoTagOne = useCallback(async (assetId: string) => {
    setTaggingId(assetId);
    try {
      const res = await fetch('/api/assets/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 402) throw new Error('insufficient_credits');
        throw new Error(j?.error || 'failed');
      }
      showStatus(t('smartAssets.autoTagSuccess'), 'success');
      await load();
    } catch (e) {
      showStatus(t('smartAssets.autoTagError'), 'error');
    }
    setTaggingId(null);
  }, [load, t]);

  const autoTagAll = useCallback(async () => {
    const untagged = assets.filter((a) => !getAutoTag(a.metadata));
    if (untagged.length === 0) {
      showStatus(t('smartAssets.autoTagAllSuccess'), 'success');
      return;
    }
    setTaggingAll(true);
    let failures = 0;
    for (const asset of untagged) {
      try {
        const res = await fetch('/api/assets/auto-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetId: asset.id }),
        });
        if (!res.ok) { failures++; continue; }
      } catch {
        failures++;
      }
    }
    await load();
    setTaggingAll(false);
    if (failures === 0) {
      showStatus(t('smartAssets.autoTagAllSuccess'), 'success');
    } else {
      showStatus(t('smartAssets.autoTagAllError'), 'error');
    }
  }, [assets, load, t]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Client-side filtering by search + category + mood + productType
  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((a) => {
      const tags = parseTags(a.tags);
      const autoTag = getAutoTag(a.metadata);
      if (q) {
        const nameMatch = a.name.toLowerCase().includes(q);
        const tagMatch = tags.some((tag) => tag.toLowerCase().includes(q));
        if (!nameMatch && !tagMatch) return false;
      }
      if (categoryFilter && autoTag?.category !== categoryFilter) return false;
      if (moodFilter && autoTag?.mood !== moodFilter) return false;
      if (productTypeFilter && autoTag?.productType !== productTypeFilter) return false;
      return true;
    });
  }, [assets, search, categoryFilter, moodFilter, productTypeFilter]);

  const untaggedCount = assets.filter((a) => !getAutoTag(a.metadata)).length;

  const clearFilters = () => {
    setCategoryFilter(null);
    setMoodFilter(null);
    setProductTypeFilter(null);
    setSearch('');
  };

  const hasActiveFilters = categoryFilter || moodFilter || productTypeFilter || search;

  return (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-bold text-fg sm:text-lg">
            <Sparkles className="h-5 w-5 text-brand-accent" />
            {t('smartAssets.title')}
          </h2>
          <p className="mt-1 text-xs text-fg-faint sm:text-sm">{t('smartAssets.description')}</p>
        </div>
        <button
          onClick={autoTagAll}
          disabled={taggingAll || untaggedCount === 0}
          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-brand-accent/30 bg-brand-accent/10 px-3 py-2 text-xs font-bold text-brand-accent transition hover:bg-brand-accent/20 disabled:opacity-40"
        >
          {taggingAll ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {taggingAll ? t('smartAssets.autoTaggingAll') : t('smartAssets.autoTagAll')}
          {!taggingAll && untaggedCount > 0 && (
            <span className="ml-1 rounded-full bg-brand-accent/20 px-1.5 py-0.5 text-[10px]">{untaggedCount}</span>
          )}
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          role={statusType === 'error' ? 'alert' : 'status'}
          className={`mt-3 rounded-xl border p-3 text-xs ${
            statusType === 'error'
              ? 'border-danger/30 bg-danger/5 text-danger'
              : 'border-success/30 bg-success/5 text-success'
          }`}
        >
          {statusMsg}
        </div>
      )}

      {/* Search bar */}
      <div className="mt-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('smartAssets.search')}
          aria-label={t('smartAssets.search')}
          className="w-full rounded-xl border border-line bg-app py-2 pl-9 pr-9 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-[#00b2fc]/40"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-fg-faint hover:text-fg"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="mt-3 space-y-2">
        {/* Category filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-fg-faint">{t('smartAssets.filterCategory')}:</span>
          <button
            onClick={() => setCategoryFilter(null)}
            aria-pressed={categoryFilter === null}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              categoryFilter === null
                ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                : 'text-fg-faint hover:bg-hover hover:text-fg'
            }`}
          >
            {t('smartAssets.allCategories')}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(categoryFilter === c ? null : c)}
              aria-pressed={categoryFilter === c}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition capitalize ${
                categoryFilter === c
                  ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                  : 'text-fg-faint hover:bg-hover hover:text-fg'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Mood filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-fg-faint">{t('smartAssets.filterMood')}:</span>
          <button
            onClick={() => setMoodFilter(null)}
            aria-pressed={moodFilter === null}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              moodFilter === null
                ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                : 'text-fg-faint hover:bg-hover hover:text-fg'
            }`}
          >
            {t('smartAssets.allMoods')}
          </button>
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMoodFilter(moodFilter === m ? null : m)}
              aria-pressed={moodFilter === m}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition capitalize ${
                moodFilter === m
                  ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                  : 'text-fg-faint hover:bg-hover hover:text-fg'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Product type filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-fg-faint">{t('smartAssets.filterProductType')}:</span>
          <button
            onClick={() => setProductTypeFilter(null)}
            aria-pressed={productTypeFilter === null}
            className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
              productTypeFilter === null
                ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                : 'text-fg-faint hover:bg-hover hover:text-fg'
            }`}
          >
            {t('smartAssets.allProductTypes')}
          </button>
          {PRODUCT_TYPES.map((p) => (
            <button
              key={p}
              onClick={() => setProductTypeFilter(productTypeFilter === p ? null : p)}
              aria-pressed={productTypeFilter === p}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition capitalize ${
                productTypeFilter === p
                  ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                  : 'text-fg-faint hover:bg-hover hover:text-fg'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-fg-faint hover:text-fg"
        >
          <X className="h-3 w-3" />
          Clear filters
        </button>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mt-6 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-accent" role="status" aria-label={t('smartAssets.loading')} />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          <AlertCircle className="mr-2 inline h-4 w-4" /> {error}
          <button onClick={load} className="ml-3 underline hover:no-underline">
            {t('smartAssets.retry')}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && assets.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
          <p className="text-sm text-fg-faint">{t('smartAssets.noAssets')}</p>
        </div>
      )}

      {/* No results after filtering */}
      {!loading && !error && assets.length > 0 && filteredAssets.length === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-hover p-6 text-center">
          <Search className="mx-auto mb-2 h-8 w-8 text-fg-placeholder" />
          <p className="text-sm text-fg-faint">{t('smartAssets.noAssets')}</p>
        </div>
      )}

      {/* Asset grid */}
      {!loading && !error && filteredAssets.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAssets.map((asset) => {
            const tags = parseTags(asset.tags);
            const autoTag = getAutoTag(asset.metadata);
            const isTagging = taggingId === asset.id;
            const isSelected = selected.has(asset.id);
            const isVideo = asset.type === 'video';
            const TypeIcon = isVideo ? Video : ImageIcon;

            return (
              <div
                key={asset.id}
                className={`rounded-xl border bg-app p-3 transition ${
                  isSelected ? 'border-[#00b2fc]/50 ring-1 ring-[#00b2fc]/30' : 'border-line'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <TypeIcon className="h-4 w-4 shrink-0 text-brand-accent" />
                    <span className="truncate text-xs font-bold text-fg" title={asset.name}>
                      {asset.name}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    isVideo ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {asset.type}
                  </span>
                </div>

                {/* Auto-tag info */}
                {autoTag && (
                  <div className="mt-2 space-y-1">
                    <div className="flex flex-wrap gap-1">
                      {autoTag.category && (
                        <span className="rounded bg-brand-accent/10 px-1.5 py-0.5 text-[10px] capitalize" style={{ color: 'var(--color-brand-accent)' }}>
                          {autoTag.category}
                        </span>
                      )}
                      {autoTag.mood && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] capitalize text-amber-600 dark:text-amber-400">
                          {autoTag.mood}
                        </span>
                      )}
                      {autoTag.productType && (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] capitalize text-emerald-600 dark:text-emerald-400">
                          {autoTag.productType}
                        </span>
                      )}
                    </div>
                    {autoTag.description && (
                      <p className="text-[10px] leading-snug text-fg-faint">{autoTag.description}</p>
                    )}
                    {autoTag.colorPalette && autoTag.colorPalette.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-fg-faint">{t('smartAssets.colorPalette')}:</span>
                        {autoTag.colorPalette.slice(0, 5).map((color, i) => (
                          <span
                            key={i}
                            className="h-3 w-3 rounded-full border border-line"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tags */}
                <div className="mt-2">
                  {tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded bg-[#00b2fc]/10 px-1.5 py-0.5 text-[10px]"
                          style={{ color: 'var(--color-brand-accent)' }}
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                      {tags.length > 8 && (
                        <span className="text-[10px] text-fg-faint">+{tags.length - 8}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-fg-faint">{t('smartAssets.noTags')}</span>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => autoTagOne(asset.id)}
                    disabled={isTagging || taggingAll}
                    className="flex items-center gap-1 rounded-lg border border-brand-accent/30 bg-brand-accent/10 px-2.5 py-1.5 text-[11px] font-bold text-brand-accent transition hover:bg-brand-accent/20 disabled:opacity-40"
                  >
                    {isTagging ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {isTagging ? t('smartAssets.autoTagging') : t('smartAssets.autoTag')}
                    {!isTagging && <span className="text-fg-faint">({t('smartAssets.credits')})</span>}
                  </button>
                  <button
                    onClick={() => toggleSelect(asset.id)}
                    aria-pressed={isSelected}
                    className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                      isSelected
                        ? 'border-[#00b2fc] bg-[#00b2fc]/15 text-[#00b2fc]'
                        : 'border-line bg-surface text-fg hover:bg-hover'
                    }`}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : <RefreshCw className="h-3 w-3" />}
                    {t('smartAssets.use')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected count */}
      {selected.size > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-line bg-app p-3">
          <span className="text-xs font-medium text-fg-faint">
            {selected.size} selected
          </span>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs font-medium text-fg-faint hover:text-fg"
          >
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
