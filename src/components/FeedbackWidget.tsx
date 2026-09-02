'use client';

import { useState, useCallback } from 'react';
import { MessageSquare, X, Loader2, Star, Send } from 'lucide-react';
import { useI18n } from '@/i18n/provider';

/**
 * Lightweight in-app feedback widget.
 * Allows users to rate features and submit text feedback.
 * Feedback is stored via the /api/feedback endpoint.
 */
export function FeedbackWidget({ feature }: { feature: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature, rating, comment: comment.trim() }),
      });
      if (res.ok) {
        setSubmitted(true);
        setRating(0);
        setComment('');
      } else {
        setError(t('feedback.error'));
      }
    } catch {
      setError(t('feedback.error'));
    }
    setSubmitting(false);
  }, [rating, comment, feature, t]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={t('feedback.open')}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg shadow-lg hover:opacity-90 transition"
      >
        <MessageSquare className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">{t('feedback.open')}</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-xl">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="w-4 h-4" aria-hidden="true" />
          {t('feedback.title')}
        </h3>
        <button
          onClick={() => { setOpen(false); setSubmitted(false); }}
          aria-label={t('feedback.close')}
          className="p-1 text-fg-muted hover:text-fg rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {submitted ? (
        <div className="p-6 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-2">
            <Star className="w-5 h-5 text-success" aria-hidden="true" />
          </div>
          <p className="text-sm text-fg-muted">{t('feedback.thanks')}</p>
          <button
            onClick={() => { setOpen(false); setSubmitted(false); }}
            className="mt-3 text-xs underline text-fg-muted"
          >
            {t('feedback.close')}
          </button>
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <p className="text-xs text-fg-muted">{t('feedback.prompt')}</p>

          {/* Star rating */}
          <div className="flex gap-1" role="radiogroup" aria-label={t('feedback.rating')}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${t('feedback.stars')}`}
                className="p-1 transition"
              >
                <Star
                  className={`w-5 h-5 ${(hoverRating || rating) >= star ? 'fill-warning text-warning' : 'text-fg-muted'}`}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs text-fg-muted" htmlFor="feedback-comment">{t('feedback.comment')}</label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              placeholder={t('feedback.commentPlaceholder')}
              rows={3}
              maxLength={500}
              className="w-full mt-1 rounded-md border border-border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {error && <p role="alert" className="text-xs text-danger">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            aria-busy={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {t('feedback.submit')}
          </button>
        </div>
      )}
    </div>
  );
}
