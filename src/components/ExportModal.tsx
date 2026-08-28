'use client';

import { useState, useCallback } from 'react';
import {
  Download, Loader2, AlertCircle, X, FileJson, FileSpreadsheet,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type ExportModalProps = {
  open: boolean;
  onClose: () => void;
  assetIds: string[];
  assetNames: string[];
};

const FIELDS = [
  { key: 'brief', labelKey: 'exportCenter.fieldBrief' },
  { key: 'hooks', labelKey: 'exportCenter.fieldHooks' },
  { key: 'angles', labelKey: 'exportCenter.fieldAngles' },
  { key: 'script', labelKey: 'exportCenter.fieldScript' },
  { key: 'storyboard', labelKey: 'exportCenter.fieldStoryboard' },
  { key: 'score', labelKey: 'exportCenter.fieldScore' },
  { key: 'variants', labelKey: 'exportCenter.fieldVariants' },
];

export function ExportModal({ open, onClose, assetIds, assetNames }: ExportModalProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [selectedFields, setSelectedFields] = useState<string[]>(['brief', 'hooks', 'angles', 'script', 'storyboard', 'score', 'variants']);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const toggleField = useCallback((field: string) => {
    setSelectedFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  }, []);

  const handleExport = useCallback(async () => {
    if (assetIds.length === 0) return;
    if (selectedFields.length === 0) {
      setError(t('exportCenter.noFieldsSelected'));
      return;
    }
    setExporting(true); setError('');
    try {
      const res = await fetch('/api/creative/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetIds,
          format,
          fields: selectedFields,
        }),
      });
      if (!res.ok) throw new Error('export_failed');

      const blob = await res.blob();
      const contentDisposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `creative-export-${Date.now()}.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      setError(t('exportCenter.exportFailed'));
    } finally {
      setExporting(false);
    }
  }, [assetIds, format, selectedFields, t, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('exportCenter.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="rounded-lg bg-surface border border-line max-w-lg w-full max-h-[85vh] overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-fg">{t('exportCenter.title')}</h2>
            <p className="text-sm text-fg-faint">{t('exportCenter.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="text-fg-faint hover:text-fg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
            <AlertCircle className="inline w-4 h-4 mr-1.5" />
            {error}
          </div>
        )}

        {/* Selected assets summary */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-fg">{t('exportCenter.selectedAssets')}</h3>
          <div className="rounded-lg border border-line bg-app p-3 text-xs text-fg-faint">
            {assetNames.length} {t('exportCenter.assetsCount')}
            {assetNames.length > 0 && (
              <div className="mt-1 max-h-20 overflow-y-auto">
                {assetNames.slice(0, 5).map((name, i) => (
                  <div key={i} className="truncate">{name}</div>
                ))}
                {assetNames.length > 5 && <div className="text-fg-faint">+{assetNames.length - 5} more</div>}
              </div>
            )}
          </div>
        </div>

        {/* Format selection */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-fg">{t('exportCenter.format')}</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setFormat('json')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                format === 'json'
                  ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                  : 'border-line bg-app text-fg hover:bg-hover'
              }`}
              aria-pressed={format === 'json'}
            >
              <FileJson className="h-4 w-4" />
              JSON
            </button>
            <button
              onClick={() => setFormat('csv')}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                format === 'csv'
                  ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                  : 'border-line bg-app text-fg hover:bg-hover'
              }`}
              aria-pressed={format === 'csv'}
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV
            </button>
          </div>
        </div>

        {/* Field selection */}
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-fg">{t('exportCenter.fields')}</h3>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map(field => (
              <label
                key={field.key}
                className="flex items-center gap-2 rounded-lg border border-line bg-app p-2 text-sm cursor-pointer hover:bg-hover"
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="rounded border-line"
                />
                <span className="text-fg">{t(field.labelKey)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line text-fg text-sm hover:bg-hover"
          >
            {t('exportCenter.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || assetIds.length === 0 || selectedFields.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {t('exportCenter.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
