'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Sparkles, Search, Star, Trash2, Loader2, AlertCircle,
  FileText, MessageSquare, Lightbulb, Film, Package,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { AuthModal } from '@/components/AuthModal';

interface Template {
  id: string;
  userId: string | null;
  category: string;
  name: string;
  description: string;
  payloadJson: string;
  tagsJson: string;
  isFavorite: boolean;
  createdAt: string;
}

const CATEGORIES = [
  { value: '', icon: Sparkles, labelKey: 'templates.allCategories' },
  { value: 'brief', icon: FileText, labelKey: 'templates.catBrief' },
  { value: 'hooks', icon: MessageSquare, labelKey: 'templates.catHooks' },
  { value: 'angles', icon: Lightbulb, labelKey: 'templates.catAngles' },
  { value: 'script', icon: Film, labelKey: 'templates.catScript' },
  { value: 'skill-bundle', icon: Package, labelKey: 'templates.catSkillBundle' },
];

export default function TemplateLibraryPage() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const [authOpen, setAuthOpen] = useState(false);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      if (favoritesOnly) params.set('favorites', 'true');
      const res = await fetch(`/api/creative/templates?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json().catch(() => ({}));
      setTemplates(j.templates || []);
    } catch {
      setError(t('templates.errFailed'));
    } finally {
      setLoading(false);
    }
  }, [session?.user, category, search, favoritesOnly, t]);

  useEffect(() => {
    if (session?.user) loadTemplates();
  }, [session?.user, loadTemplates]);

  const toggleFavorite = useCallback(async (tmpl: Template) => {
    if (!session?.user) { setAuthOpen(true); return; }
    try {
      await fetch(`/api/creative/templates?id=${tmpl.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: !tmpl.isFavorite }),
      });
      loadTemplates();
    } catch {
      setError(t('templates.errAction'));
    }
  }, [session?.user, loadTemplates, t]);

  const deleteTemplate = useCallback(async (tmpl: Template) => {
    if (!tmpl.userId) return; // can't delete built-ins
    if (!confirm(`Delete "${tmpl.name}"?`)) return;
    try {
      await fetch(`/api/creative/templates?id=${tmpl.id}`, { method: 'DELETE' });
      loadTemplates();
    } catch {
      setError(t('templates.errAction'));
    }
  }, [loadTemplates, t]);

  const applyTemplate = useCallback(async (tmpl: Template) => {
    if (!session?.user) { setAuthOpen(true); return; }
    // Navigate to the relevant studio page with the template payload
    const payload = JSON.parse(tmpl.payloadJson || '{}');
    const params = new URLSearchParams();
    params.set('templateId', tmpl.id);
    params.set('templateName', tmpl.name);

    if (tmpl.category === 'brief' || tmpl.category === 'angles' || tmpl.category === 'hooks' || tmpl.category === 'script') {
      window.location.href = `/creative-studio?${params}`;
    } else if (tmpl.category === 'skill-bundle') {
      window.location.href = `/editor?${params}`;
    }
  }, [session?.user]);

  return (
    <div className="min-h-screen bg-bg">
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">
            <Sparkles className="inline w-6 h-6 mr-2 text-brand-accent" aria-hidden="true" />
            {t('templates.title')}
          </h1>
          <p className="text-sm text-fg-muted">{t('templates.subtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    category === cat.value
                      ? 'bg-brand-accent text-white'
                      : 'bg-bg-card border border-border text-fg hover:bg-bg-muted/10'
                  }`}
                  aria-pressed={category === cat.value}
                >
                  <Icon className="inline w-4 h-4 mr-1" aria-hidden="true" />
                  {t(cat.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('templates.searchPlaceholder')}
              className="w-full rounded-lg border border-border bg-bg-card pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              aria-label={t('templates.searchPlaceholder')}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
            />
            <Star className="w-4 h-4" aria-hidden="true" />
            {t('templates.favoritesOnly')}
          </label>
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="inline w-4 h-4 mr-1.5" aria-hidden="true" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div role="status" className="flex items-center gap-2 text-fg-muted">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span className="text-sm">{t('common.loadingDots')}</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && templates.length === 0 && (
          <p className="text-sm text-fg-muted">{t('templates.noResults')}</p>
        )}

        {/* Template grid */}
        {!loading && templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(tmpl => {
              const tags: string[] = JSON.parse(tmpl.tagsJson || '[]');
              const isBuiltin = !tmpl.userId;
              return (
                <div
                  key={tmpl.id}
                  className="rounded-lg border border-border bg-bg-card p-4 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-sm truncate min-w-0">{tmpl.name}</h3>
                    <button
                      onClick={() => toggleFavorite(tmpl)}
                      className="shrink-0 ml-2 text-fg-muted hover:text-brand-accent"
                      aria-label={tmpl.isFavorite ? t('templates.unfavorite') : t('templates.favorite')}
                    >
                      <Star
                        className={`w-4 h-4 ${tmpl.isFavorite ? 'fill-brand-accent text-brand-accent' : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                  </div>

                  <span className={`text-xs px-2 py-0.5 rounded-full self-start mb-2 ${
                    isBuiltin ? 'bg-brand-accent/10 text-brand-accent' : 'bg-fg-muted/10 text-fg-muted'
                  }`}>
                    {isBuiltin ? t('templates.builtin') : t('templates.custom')}
                  </span>

                  <p className="text-xs text-fg-muted mb-3 flex-1">{tmpl.description}</p>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.map(tag => (
                        <span key={tag} className="text-xs rounded-full bg-bg border border-border px-2 py-0.5">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => applyTemplate(tmpl)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-brand-accent text-white text-xs font-medium hover:opacity-90"
                    >
                      {t('templates.apply')}
                    </button>
                    <button
                      onClick={() => setSelectedTemplate(tmpl)}
                      className="px-3 py-1.5 rounded-lg border border-border text-fg text-xs hover:bg-bg"
                    >
                      {t('templates.preview')}
                    </button>
                    {!isBuiltin && (
                      <button
                        onClick={() => deleteTemplate(tmpl)}
                        className="px-2 py-1.5 rounded-lg border border-danger/30 text-danger text-xs hover:bg-danger/10"
                        aria-label={`Delete ${tmpl.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview modal */}
        {selectedTemplate && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedTemplate.name}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedTemplate(null)}
          >
            <div
              className="rounded-lg bg-bg-card border border-border max-w-2xl w-full max-h-[80vh] overflow-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold">{selectedTemplate.name}</h2>
                  <p className="text-sm text-fg-muted">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-fg-muted hover:text-fg text-xl"
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <pre className="text-xs bg-bg rounded-lg border border-border p-4 overflow-auto max-h-60">
                {JSON.stringify(JSON.parse(selectedTemplate.payloadJson || '{}'), null, 2)}
              </pre>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => { applyTemplate(selectedTemplate); setSelectedTemplate(null); }}
                  className="px-4 py-2 rounded-lg bg-brand-accent text-white text-sm font-medium hover:opacity-90"
                >
                  {t('templates.apply')}
                </button>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2 rounded-lg border border-border text-fg text-sm hover:bg-bg"
                >
                  {t('templates.close')}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
