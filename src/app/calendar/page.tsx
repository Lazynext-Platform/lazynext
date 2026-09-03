import Link from 'next/link';
import type { Metadata } from 'next';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Calendar — Lazynext',
  description: 'Schedule and track events, deadlines, and milestones.',
  robots: { index: false, follow: false },
};
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import { safePrisma } from '@/lib/safe-prisma';

export const dynamic = 'force-dynamic';

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length % 7 !== 0) days.push(null);
  return days;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string; year?: string }> }) {
  const sp = await searchParams;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return <div className="p-8"><Button href="/login">Sign in</Button></div>;
  }

  const workspaces = await WorkspaceService.listForUser(session.user.id);
  const wsIds = workspaces.map((w) => w.id);

  const now = new Date();
  const year = parseInt(sp.year || String(now.getFullYear()));
  const month = parseInt(sp.month || String(now.getMonth()));
  const monthDate = new Date(year, month, 1);
  const days = getMonthDays(year, month);

  // Fetch scheduled items for this month
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

  const [tasksWithDue, scheduledJobs, scheduledPosts] = await Promise.all([
    safePrisma(() => prisma.task.findMany({
      where: {
        project: { workspaceId: { in: wsIds } },
        deletedAt: null,
        dueDate: { gte: monthStart, lte: monthEnd },
      },
      include: { project: { select: { id: true, name: true } } },
    }), []),
    safePrisma(() => prisma.scheduledJob.findMany({
      where: { workspaceId: { in: wsIds }, scheduledAt: { gte: monthStart, lte: monthEnd } },
    }), []),
    safePrisma(() => prisma.scheduledPost.findMany({
      where: { userId: session.user.id, scheduledAt: { gte: monthStart, lte: monthEnd } },
    }), []),
  ]);

  // Group items by day
  const itemsByDay: Record<string, { label: string; href?: string; type: string }[]> = {};
  for (const t of tasksWithDue) {
    if (!t.dueDate) continue;
    const key = t.dueDate.toDateString();
    if (!itemsByDay[key]) itemsByDay[key] = [];
    itemsByDay[key].push({ label: t.title, href: `/projects/${t.project.id}`, type: 'task' });
  }
  for (const j of scheduledJobs) {
    const key = j.scheduledAt.toDateString();
    if (!itemsByDay[key]) itemsByDay[key] = [];
    itemsByDay[key].push({ label: j.type, type: 'job' });
  }
  for (const p of scheduledPosts) {
    const key = p.scheduledAt.toDateString();
    if (!itemsByDay[key]) itemsByDay[key] = [];
    itemsByDay[key].push({ label: `Post: ${p.platform}`, type: 'post' });
  }

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  const totalItems = tasksWithDue.length + scheduledJobs.length + scheduledPosts.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="heading-display text-2xl">Calendar</h1>
          <p className="text-sm text-fg-secondary mt-1">{totalItems} scheduled item{totalItems !== 1 ? 's' : ''} this month</p>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading-display text-lg">{MONTHS[month]} {year}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${prevMonth}&year=${prevYear}`}
            className="p-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
            style={{ borderColor: 'var(--c-ink)' }}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <Link
            href={`/calendar?month=${nextMonth}&year=${nextYear}`}
            className="p-2 border-2 rounded-[var(--radius-sm)] bg-surface hover:bg-hover transition-colors"
            style={{ borderColor: 'var(--c-ink)' }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Calendar grid */}
      <Card className="p-0 overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b-2" style={{ borderColor: 'var(--c-ink)' }}>
          {WEEKDAYS.map((day) => (
            <div key={day} className="label-mono text-center py-2 px-1 border-r-2 last:border-r-0" style={{ borderColor: 'var(--c-ink)' }}>
              {day}
            </div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const isToday = day && day.toDateString() === now.toDateString();
            const dayItems = day ? itemsByDay[day.toDateString()] || [] : [];
            return (
              <div
                key={i}
                className="min-h-[80px] sm:min-h-[120px] p-1.5 border-r-2 border-b-2 last:border-r-0"
                style={{ borderColor: 'var(--c-ink)' }}
              >
                {day && (
                  <>
                    <div
                      className={`text-xs font-mono mb-1 inline-flex items-center justify-center h-5 w-5 ${isToday ? '' : ''}`}
                      style={isToday ? { backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-sm)' } : undefined}
                    >
                      {day.getDate()}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayItems.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs px-1.5 py-0.5 border truncate"
                          style={{
                            borderColor: 'var(--c-ink)',
                            backgroundColor: item.type === 'task' ? 'var(--c-surface-alt)' : 'var(--c-surface)',
                            borderRadius: 'var(--radius-sm)',
                          }}
                        >
                          {item.href ? (
                            <Link href={item.href} className="hover:underline truncate block">{item.label}</Link>
                          ) : (
                            <span className="truncate block">{item.label}</span>
                          )}
                        </div>
                      ))}
                      {dayItems.length > 3 && (
                        <span className="text-xs text-fg-muted px-1">+{dayItems.length - 3} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
