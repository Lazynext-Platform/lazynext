import type { Metadata } from 'next';
import { Bell } from 'lucide-react';
import { auth } from '@/../auth';
import { NotificationService } from '@/lib/services/notification-service';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { NotificationCenter } from './NotificationCenter';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Notifications — Lazynext',
  description: 'Unified notification center with in-app messaging, email digests, mentions, and preferences.',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const [notifications, unreadCount, stats, preferences] = await Promise.all([
    NotificationService.list(session.user.id, { limit: 50 }),
    NotificationService.getUnreadCount(session.user.id),
    NotificationService.getNotificationStats(session.user.id),
    NotificationService.getNotificationPreferences(session.user.id),
  ]);

  if (notifications.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="heading-display text-2xl">Notifications</h1>
          <p className="text-sm text-fg-secondary mt-1">Stay on top of tasks, mentions, approvals, and agent activity.</p>
        </div>
        <Card className="p-8">
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="When something happens — a task is assigned, you're mentioned, or an agent finishes — you'll see it here."
            action={<Button href="/dashboard">Go to Dashboard</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="heading-display text-2xl flex items-center gap-2">
            Notifications
            {unreadCount > 0 && <Badge variant="danger">{unreadCount}</Badge>}
          </h1>
          <p className="text-sm text-fg-secondary mt-1">Stay on top of tasks, mentions, approvals, and agent activity.</p>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bell className="h-3 w-3" /> Total
          </div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bell className="h-3 w-3" /> Unread
          </div>
          <div className="text-2xl font-semibold">{stats.unread}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bell className="h-3 w-3" /> Categories
          </div>
          <div className="text-2xl font-semibold">{Object.keys(stats.byCategory).length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Bell className="h-3 w-3" /> Types
          </div>
          <div className="text-2xl font-semibold">{Object.keys(stats.byType).length}</div>
        </Card>
      </div>

      <NotificationCenter
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
        initialStats={stats}
        initialPreferences={preferences}
      />
    </div>
  );
}
