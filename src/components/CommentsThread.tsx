'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  MessageSquare, Send, Loader2, Trash2, CheckCircle2,
  Circle, Reply, Radio,
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';

type Comment = {
  id: string;
  userId: string;
  userName?: string;
  userImage?: string | null;
  assetId: string;
  parentId: string | null;
  body: string;
  mentions: string[];
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
};

export function CommentsThread({ assetId }: { assetId: string }) {
  const { data: session, status } = useSession();
  const { t } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [live, setLive] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (status !== 'authenticated') { setLoading(false); return; }
    try {
      const res = await fetch(`/api/creative/comments?assetId=${assetId}`);
      if (!res.ok) throw new Error('load_failed');
      const j = await res.json();
      setComments(j.comments || []);
    } catch {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  }, [assetId, status]);

  useEffect(() => { load(); }, [load]);

  // SSE connection
  useEffect(() => {
    if (status !== 'authenticated') return;
    const es = new EventSource(`/api/creative/comments/stream?assetId=${assetId}`);
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'update') {
          load(); // Reload full comments with user info
        }
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [assetId, status, load]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const postComment = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/creative/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, body: body.trim() }),
      });
      if (!res.ok) throw new Error('post_failed');
      setBody('');
      load();
    } catch {
      setError('Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  const postReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/creative/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId, body: replyBody.trim(), parentId }),
      });
      if (!res.ok) throw new Error('post_failed');
      setReplyBody('');
      setReplyTo(null);
      load();
    } catch {
      setError('Failed to post reply');
    } finally {
      setPosting(false);
    }
  };

  const toggleResolve = async (id: string, resolved: boolean) => {
    try {
      await fetch(`/api/creative/comments?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: !resolved }),
      });
      load();
    } catch { /* ignore */ }
  };

  const deleteComment = async (id: string) => {
    if (!confirm(t('comments.deleteConfirm'))) return;
    try {
      await fetch(`/api/creative/comments?id=${id}`, { method: 'DELETE' });
      load();
    } catch { /* ignore */ }
  };

  // Render: highlight @mentions in blue
  const renderBody = (text: string) => {
    const parts = text.split(/(@[\w.+-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-brand-accent font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Build threaded structure
  const topLevel = comments.filter(c => !c.parentId);
  const repliesOf = (id: string) => comments.filter(c => c.parentId === id);

  const fmtTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const Avatar = ({ name, image }: { name?: string; image?: string | null }) => {
    if (image) {
      return <img src={image} alt={name || 'avatar'} className="h-7 w-7 shrink-0 rounded-full object-cover" />;
    }
    const letter = (name || '?').charAt(0).toUpperCase();
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00b2fc]/15 text-xs font-bold text-[#00b2fc]">
        {letter}
      </div>
    );
  };

  const renderComment = (c: Comment, isReply = false) => {
    const isOwner = session?.user?.id === c.userId;
    return (
      <div key={c.id} className={isReply ? 'ml-8 border-l-2 border-line pl-3' : ''}>
        <div className="flex items-start gap-2 py-2">
          <Avatar name={c.userName} image={c.userImage} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-fg truncate">{c.userName || 'Unknown'}</span>
              <span className="text-[10px] text-fg-faint">{fmtTime(c.createdAt)}</span>
              {c.resolved && (
                <span className="flex items-center gap-0.5 text-[10px] text-success">
                  <CheckCircle2 className="h-3 w-3" />
                </span>
              )}
            </div>
            <p className={`mt-0.5 text-sm text-fg whitespace-pre-wrap break-words ${c.resolved ? 'line-through text-fg-faint' : ''}`}>
              {renderBody(c.body)}
            </p>
            <div className="mt-1 flex items-center gap-3">
              <button
                onClick={() => {
                  if (replyTo === c.id) { setReplyTo(null); setReplyBody(''); }
                  else { setReplyTo(c.id); setReplyBody(''); }
                }}
                className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-fg"
                aria-label={t('comments.reply')}
              >
                <Reply className="h-3 w-3" />
                {t('comments.reply')}
              </button>
              <button
                onClick={() => toggleResolve(c.id, c.resolved)}
                className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-fg"
                aria-label={c.resolved ? t('comments.unresolve') : t('comments.resolve')}
              >
                {c.resolved ? <CheckCircle2 className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3" />}
                {c.resolved ? t('comments.unresolve') : t('comments.resolve')}
              </button>
              {isOwner && (
                <button
                  onClick={() => deleteComment(c.id)}
                  className="flex items-center gap-1 text-[11px] text-fg-faint hover:text-danger"
                  aria-label={t('comments.delete')}
                >
                  <Trash2 className="h-3 w-3" />
                  {t('comments.delete')}
                </button>
              )}
            </div>
            {replyTo === c.id && (
              <div className="mt-2 flex items-end gap-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={t('comments.replyPlaceholder')}
                  aria-label={t('comments.replyPlaceholder')}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-line bg-app p-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-[#00b2fc]/40"
                />
                <button
                  onClick={() => postReply(c.id)}
                  disabled={posting || !replyBody.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00b2fc] text-white disabled:opacity-40"
                  aria-label={t('comments.send')}
                >
                  {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
        {repliesOf(c.id).map((r) => renderComment(r, true))}
      </div>
    );
  };

  if (status !== 'authenticated') {
    return (
      <div className="mt-4 rounded-xl border border-line bg-surface p-4 text-center">
        <p className="text-sm text-fg-faint">{t('comments.signInRequired')}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-line bg-surface p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-accent" />
          <h3 className="text-sm font-bold text-fg">{t('comments.title')}</h3>
        </div>
        {live && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-success">
            <Radio className="h-3 w-3 animate-pulse" />
            {t('comments.live')}
          </span>
        )}
      </div>

      {error && (
        <div role="alert" className="mt-2 rounded-lg border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
          {error}
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-brand-accent" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-faint">{t('comments.empty')}</p>
      ) : (
        <div ref={scrollRef} className="mt-3 max-h-[400px] overflow-y-auto">
          {topLevel.map((c) => renderComment(c))}
        </div>
      )}

      {/* Comment input */}
      <div className="mt-3 border-t border-line pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('comments.placeholder')}
            aria-label={t('comments.placeholder')}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-line bg-app p-2 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-[#00b2fc]/40"
          />
          <button
            onClick={postComment}
            disabled={posting || !body.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00b2fc] text-white disabled:opacity-40"
            aria-label={t('comments.send')}
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
