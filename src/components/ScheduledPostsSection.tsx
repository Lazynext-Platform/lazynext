'use client';

import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n/provider';

interface ScheduledPost {
  id: string;
  platform: string;
  mediaUrl: string;
  caption: string;
  scheduledAt: string;
  status: string;
  postUrl: string | null;
  postId: string | null;
  error: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'text-info',
  publishing: 'text-warning',
  published: 'text-success',
  failed: 'text-danger',
  cancelled: 'text-fg-faint',
};

const PLATFORM_LABELS: Record<string, string> = {
  tiktok: 'TikTok',
  youtube_shorts: 'YouTube Shorts',
  instagram_reels: 'Instagram Reels',
  facebook: 'Facebook',
  twitter: 'Twitter',
  linkedin: 'LinkedIn',
};

export function ScheduledPostsSection() {
  const { t } = useI18n();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/publish/schedule');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
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

  const handleCancel = async (id: string) => {
    setCancelling(id);
    try {
      const res = await fetch(`/api/publish/schedule?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'cancelled' } : p)));
      } else {
        setError('Failed to cancel scheduled post.');
      }
    } catch {
      setError('Failed to cancel scheduled post.');
    } finally {
      setCancelling(null);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  const activePosts = posts.filter((p) => p.status === 'scheduled');
  const pastPosts = posts.filter((p) => p.status !== 'scheduled');

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-1 font-semibold text-fg">Scheduled Posts</h2>
      <p className="mb-4 text-sm text-fg-faint">
        View and manage your scheduled posts. Cancelled posts refund the scheduling credit.
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-fg-faint">Loading scheduled posts…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-fg-faint">No scheduled posts yet.</p>
      ) : (
        <div className="space-y-4">
          {activePosts.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-faint">Upcoming</h3>
              <div className="space-y-2">
                {activePosts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-line bg-app px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${STATUS_COLORS[post.status] || 'text-fg-secondary'}`}>
                            {PLATFORM_LABELS[post.platform] || post.platform}
                          </span>
                          <span className="text-xs text-fg-faint">·</span>
                          <span className="text-xs text-fg-faint">{formatDate(post.scheduledAt)}</span>
                        </div>
                        <p className="mt-1 truncate text-sm text-fg-secondary">{post.caption}</p>
                      </div>
                      <button
                        onClick={() => handleCancel(post.id)}
                        disabled={cancelling === post.id}
                        className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-fg-secondary transition hover:bg-surface disabled:opacity-50"
                      >
                        {cancelling === post.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pastPosts.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-fg-faint">History</h3>
              <div className="space-y-2">
                {pastPosts.map((post) => (
                  <div key={post.id} className="rounded-xl border border-line bg-app px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${STATUS_COLORS[post.status] || 'text-fg-secondary'}`}>
                        {PLATFORM_LABELS[post.platform] || post.platform}
                      </span>
                      <span className="text-xs text-fg-faint">·</span>
                      <span className={`text-xs ${STATUS_COLORS[post.status] || 'text-fg-faint'}`}>{post.status}</span>
                      <span className="text-xs text-fg-faint">·</span>
                      <span className="text-xs text-fg-faint">{formatDate(post.scheduledAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-fg-secondary">{post.caption}</p>
                    {post.postUrl && (
                      <a
                        href={post.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-xs text-info hover:underline"
                      >
                        View post →
                      </a>
                    )}
                    {post.error && (
                      <p className="mt-1 text-xs text-danger">{post.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
