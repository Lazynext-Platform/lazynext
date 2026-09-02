'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';

interface CustomRule {
  id: string;
  platform: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  recommendation: string;
  keywords: string[];
  priority: number;
  enabled: boolean;
}

const PLATFORMS = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'meta', label: 'Meta (FB/IG)' },
  { id: 'google', label: 'Google' },
  { id: 'universal', label: 'Universal' },
];

const CATEGORIES = [
  { id: 'prohibited_content', label: 'Prohibited Content' },
  { id: 'restricted_content', label: 'Restricted Content' },
  { id: 'claim_verification', label: 'Claim Verification' },
  { id: 'brand_safety', label: 'Brand Safety' },
  { id: 'platform_policy', label: 'Platform Policy' },
  { id: 'disclosure', label: 'Disclosure' },
  { id: 'copyright', label: 'Copyright' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'data_privacy', label: 'Data Privacy' },
];

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-danger',
  high: 'text-warning',
  medium: 'text-info',
  low: 'text-fg-secondary',
  info: 'text-fg-faint',
};

export function ComplianceRulesSection() {
  const { t } = useI18n();
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [platform, setPlatform] = useState('universal');
  const [category, setCategory] = useState('prohibited_content');
  const [severity, setSeverity] = useState('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [keywords, setKeywords] = useState('');
  const [priority, setPriority] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/creative/compliance/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.customRules || []);
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

  const resetForm = () => {
    setPlatform('universal');
    setCategory('prohibited_content');
    setSeverity('medium');
    setTitle('');
    setDescription('');
    setRecommendation('');
    setKeywords('');
    setPriority(0);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (rule: CustomRule) => {
    setEditingId(rule.id);
    setPlatform(rule.platform);
    setCategory(rule.category);
    setSeverity(rule.severity);
    setTitle(rule.title);
    setDescription(rule.description);
    setRecommendation(rule.recommendation);
    setKeywords(rule.keywords.join(', '));
    setPriority(rule.priority);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body = {
        platform,
        category,
        severity,
        title: title.trim(),
        description: description.trim(),
        recommendation: recommendation.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        priority,
      };
      const res = editingId
        ? await fetch('/api/creative/compliance/rules', {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...body }),
          })
        : await fetch('/api/creative/compliance/rules', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
      if (res.ok) {
        resetForm();
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save rule.');
      }
    } catch {
      setError('Failed to save rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/creative/compliance/rules?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch {
      /* ignore */
    }
  };

  const handleToggle = async (rule: CustomRule) => {
    try {
      const res = await fetch('/api/creative/compliance/rules', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: rule.id, enabled: !rule.enabled }),
      });
      if (res.ok) {
        setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !r.enabled } : r)));
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-fg">Custom Compliance Rules</h2>
          <p className="mt-1 text-sm text-fg-faint">
            Create custom rules to check your content against platform-specific compliance requirements.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
            style={{ background: '#0064d9' }}
          >
            + New Rule
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 space-y-3 rounded-xl border border-line bg-app p-4">
          <h3 className="text-sm font-bold text-fg">{editingId ? 'Edit Rule' : 'Create Rule'}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-fg-faint">Platform</span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
              >
                {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-fg-faint">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
              >
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-fg-faint">Severity</span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
              >
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-fg-faint">Priority (0-100)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-fg-faint">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('compliance.phRuleTitle')}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
            />
          </label>
          <label className="block">
            <span className="text-xs text-fg-faint">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('compliance.phRuleDescription')}
              rows={2}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
            />
          </label>
          <label className="block">
            <span className="text-xs text-fg-faint">Recommendation</span>
            <input
              type="text"
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              placeholder={t('compliance.phRecommendation')}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
            />
          </label>
          <label className="block">
            <span className="text-xs text-fg-faint">Keywords (comma-separated)</span>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={t('compliance.phKeywords')}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {saving ? 'Saving…' : editingId ? 'Update Rule' : 'Create Rule'}
            </button>
            <button
              onClick={resetForm}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-fg-secondary transition hover:bg-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fg-faint">Loading rules…</p>
      ) : rules.length === 0 ? (
        <p className="text-sm text-fg-faint">No custom rules yet. Click &quot;New Rule&quot; to create one.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-line bg-app px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${SEVERITY_COLORS[rule.severity] || 'text-fg-secondary'}`}>
                      {rule.severity}
                    </span>
                    <span className="text-xs text-fg-faint">·</span>
                    <span className="text-xs text-fg-faint">
                      {PLATFORMS.find((p) => p.id === rule.platform)?.label || rule.platform}
                    </span>
                    <span className="text-xs text-fg-faint">·</span>
                    <span className="text-xs text-fg-faint">
                      {CATEGORIES.find((c) => c.id === rule.category)?.label || rule.category}
                    </span>
                    {!rule.enabled && (
                      <span className="rounded bg-fg-faint/20 px-1.5 py-0.5 text-xs text-fg-faint">disabled</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium text-fg">{rule.title}</p>
                  <p className="mt-0.5 text-xs text-fg-secondary">{rule.description}</p>
                  {rule.keywords.length > 0 && (
                    <p className="mt-1 text-xs text-fg-faint">Keywords: {rule.keywords.join(', ')}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handleToggle(rule)}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-fg-secondary transition hover:bg-surface"
                  >
                    {rule.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-fg-secondary transition hover:bg-surface"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-danger transition hover:bg-surface"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
