'use client';

import { useState, useCallback } from 'react';
import { MessageSquare, X, Loader2, AlertCircle, Send, History, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import type { Timeline } from '@/lib/editor/types';

interface EditCommand {
  type: string;
  params: Record<string, unknown>;
  confidence: number;
  originalText: string;
}

interface ChatResponse {
  response: string;
  command: EditCommand;
  updatedTimeline?: Timeline;
}

interface HistoryEntry {
  message: string;
  response: string;
  command: EditCommand;
  timestamp: number;
}

interface ConversationalEditorProps {
  timeline: Timeline | null;
  onTimelineUpdate?: (timeline: Timeline) => void;
}

export function ConversationalEditor({ timeline, onTimelineUpdate }: ConversationalEditorProps) {
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const execute = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/editor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, timeline }),
      });
      const data: ChatResponse = await res.json();
      if (!res.ok) throw new Error(data.response || 'Failed');
      setHistory((prev) => [
        { message: input, response: data.response, command: data.command, timestamp: Date.now() },
        ...prev,
      ]);
      if (data.updatedTimeline && onTimelineUpdate) {
        onTimelineUpdate(data.updatedTimeline);
      }
      setInput('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [input, timeline, onTimelineUpdate]);

  const clearHistory = useCallback(() => setHistory([]), []);

  const confidenceColor = (c: number) =>
    c >= 0.8 ? 'text-success' : c >= 0.5 ? 'text-warning' : 'text-danger';

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {t('editorChat.title')}
        </h2>
        <p className="text-sm text-fg-muted mt-1">{t('editorChat.placeholder')}</p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && execute()}
          placeholder={t('editorChat.placeholder')}
          aria-label={t('editorChat.title')}
          className="flex-1 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
          disabled={loading}
        />
        <button
          onClick={execute}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          aria-label={t('editorChat.execute')}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? t('editorChat.executing') : t('editorChat.execute')}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-danger/10 border border-danger/30 px-3 py-2 text-sm text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-danger hover:opacity-70" aria-label="Dismiss">✕</button>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-1">
              <History className="w-4 h-4" />
              {t('editorChat.history')}
            </h3>
            <button
              onClick={clearHistory}
              className="text-xs text-fg-muted hover:text-danger flex items-center gap-1"
              aria-label={t('editorChat.clearHistory')}
            >
              <Trash2 className="w-3 h-3" />
              {t('editorChat.clearHistory')}
            </button>
          </div>
          {history.map((entry, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-bg-card p-3 space-y-1">
              <div className="text-sm font-medium">{entry.message}</div>
              <div className="text-xs text-fg-muted">{entry.response}</div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 rounded bg-bg-secondary">{entry.command.type}</span>
                <span className={confidenceColor(entry.command.confidence)}>
                  {t('editorChat.confidence')}: {Math.round(entry.command.confidence * 100)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 && !loading && (
        <div className="text-sm text-fg-muted space-y-1">
          <p className="font-medium">{t('editorChat.examples')}</p>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            <li>{t('editorChat.exampleTrim')}</li>
            <li>{t('editorChat.exampleSpeed')}</li>
            <li>{t('editorChat.exampleMute')}</li>
            <li>{t('editorChat.exampleFade')}</li>
            <li>{t('editorChat.exampleMarker')}</li>
            <li>{t('editorChat.exampleCaption')}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
