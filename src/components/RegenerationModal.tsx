'use client';

import { useState, useCallback } from 'react';
import {
  RefreshCw, X, Loader2, AlertCircle, Check, ArrowRight, GitCompare,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

interface RegenerationResult {
  type: string;
  original: Record<string, unknown>;
  regenerated: Record<string, unknown>;
  changes: string[];
  improvementNote: string;
}

interface RegenerationModalProps {
  open: boolean;
  onClose: () => void;
  brief: unknown;
  elementType: 'hook' | 'angle' | 'script' | 'brief';
  element: Record<string, unknown> | null;
  onApply?: (regenerated: Record<string, unknown>) => void;
}

const PRESET_INSTRUCTIONS: Array<{ key: string; label: string; instruction: string }> = [
  { key: 'aggressive', label: 'aggressiveHook', instruction: 'Make the hook more aggressive and attention-grabbing. Use stronger language and a bolder claim.' },
  { key: 'simplify', label: 'simplify', instruction: 'Simplify the language. Make it easier to understand for a general audience. Remove jargon.' },
  { key: 'emotional', label: 'moreEmotional', instruction: 'Increase the emotional impact. Add more feeling and personal connection.' },
  { key: 'shorter', label: 'shorter', instruction: 'Make it more concise. Cut unnecessary words while keeping the core message.' },
  { key: 'urgent', label: 'addUrgency', instruction: 'Add urgency and scarcity. Make the reader feel they need to act now.' },
  { key: 'social', label: 'socialProof', instruction: 'Add social proof elements. Reference popularity, testimonials, or widespread adoption.' },
];

export function RegenerationModal({
  open, onClose, brief, elementType, element, onApply,
}: RegenerationModalProps) {
  const { t } = useI18n();
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegenerationResult | null>(null);

  const regenerate = useCallback(async () => {
    if (!brief || !element || !instruction.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/creative/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, type: elementType, instruction: instruction.trim(), element }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'failed');
      }
      const data = await res.json();
      setResult(data.result as RegenerationResult);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, [brief, element, instruction, elementType]);

  if (!open) return null;

  // Render a field diff
  const renderField = (label: string, oldValue: unknown, newValue: unknown) => {
    const oldStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue, null, 2);
    const newStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue, null, 2);
    const changed = oldStr !== newStr;
    return (
      <div key={label} className="space-y-1">
        <div className="text-xs font-medium text-fg-faint">{label}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`rounded-lg border p-2 text-xs ${changed ? 'border-danger/20 bg-danger/5' : 'border-line bg-app'}`}>
            <div className="mb-1 text-[10px] font-bold text-fg-faint">{t('regeneration.before')}</div>
            <div className="whitespace-pre-wrap text-fg-faint line-through">{oldStr || '—'}</div>
          </div>
          <div className={`rounded-lg border p-2 text-xs ${changed ? 'border-success/20 bg-success/5' : 'border-line bg-app'}`}>
            <div className="mb-1 text-[10px] font-bold text-fg-faint">{t('regeneration.after')}</div>
            <div className="whitespace-pre-wrap text-fg">{newStr || '—'}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('regeneration.title')}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-brand-accent" />
            <h2 className="text-lg font-bold">{t('regeneration.title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-faint hover:bg-app hover:text-fg"
            aria-label={t('regeneration.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-fg-faint">
          {t('regeneration.subtitle').replace('{0}', t(`regeneration.type_${elementType}`))}
        </p>

        {/* Preset instructions */}
        {!result && !loading && (
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-bold text-fg">{t('regeneration.presets')}</div>
              <div className="flex flex-wrap gap-2">
                {PRESET_INSTRUCTIONS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => setInstruction(preset.instruction)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                      instruction === preset.instruction
                        ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                        : 'border-line bg-app text-fg-faint hover:bg-surface'
                    }`}
                  >
                    {t(`regeneration.${preset.label}`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-fg-faint">{t('regeneration.instruction')}</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder={t('regeneration.instructionPlaceholder')}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border border-line bg-app px-3 py-2 text-sm text-fg placeholder:text-fg-placeholder focus:border-[#00b2fc]/40 focus:outline-none"
              />
            </div>

            <button
              onClick={regenerate}
              disabled={!instruction.trim() || !element}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: '#0064d9' }}
            >
              {t('regeneration.regenerate')} (3 {t('regeneration.credits')})
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
            <p className="text-sm text-fg-faint">{t('regeneration.regenerating')}</p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger" role="alert">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{t('regeneration.error')}: {error}</span>
            </div>
            <button onClick={regenerate} className="mt-2 text-xs underline">
              {t('regeneration.retry')}
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Improvement note */}
            {result.improvementNote && (
              <div className="rounded-xl border border-brand-accent/30 bg-brand-accent/5 p-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-brand-accent">
                  <Check className="h-3.5 w-3.5" />
                  {t('regeneration.improvementNote')}
                </div>
                <p className="text-xs text-fg">{result.improvementNote}</p>
              </div>
            )}

            {/* Before/After diff */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-fg">
                <GitCompare className="h-3.5 w-3.5 text-brand-accent" />
                {t('regeneration.beforeAfter')}
              </div>
              <div className="space-y-3">
                {Object.keys(result.original).map((key) => {
                  const oldVal = result.original[key];
                  const newVal = result.regenerated[key];
                  if (Array.isArray(oldVal) || typeof oldVal === 'object') {
                    return renderField(key, oldVal, newVal);
                  }
                  return renderField(key, oldVal, newVal);
                })}
                {/* Check for new fields in regenerated */}
                {Object.keys(result.regenerated)
                  .filter((k) => !(k in result.original))
                  .map((key) => renderField(key, '', result.regenerated[key]))}
              </div>
            </div>

            {/* Changes list */}
            {result.changes.length > 0 && (
              <div>
                <div className="mb-2 text-xs font-bold text-fg">{t('regeneration.changesMade')}</div>
                <ul className="space-y-1">
                  {result.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-fg-faint">
                      <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-brand-accent" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {onApply && (
                <button
                  onClick={() => {
                    onApply(result.regenerated);
                    onClose();
                  }}
                  className="flex-1 rounded-lg bg-success px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  {t('regeneration.apply')}
                </button>
              )}
              <button
                onClick={regenerate}
                disabled={loading}
                className="flex-1 rounded-lg border border-line bg-app px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:opacity-50"
              >
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : t('regeneration.regenerateAgain')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
