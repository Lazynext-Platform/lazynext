import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Settings, Users, CreditCard, ScrollText, Plug } from 'lucide-react';
import { auth } from '@/../auth';
import { WorkspaceService } from '@/lib/services/workspace';
import { prisma } from '@/lib/prisma';
import { Card, Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function WorkspaceSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) notFound();

  const detail = await WorkspaceService.getForUser(id, session.user.id);
  if (!detail) notFound();

  const sections = [
    { href: `/workspaces/${id}/members`, label: 'Members', desc: `${detail.memberCount} member${detail.memberCount !== 1 ? 's' : ''}`, icon: Users },
    { href: `/workspaces/${id}/settings`, label: 'General', desc: 'Workspace name, locale, timezone', icon: Settings },
    { href: `/workspaces/${id}/billing`, label: 'Billing', desc: 'Plan, invoices, usage', icon: CreditCard },
    { href: `/workspaces/${id}/integrations`, label: 'Integrations', desc: 'Connected services', icon: Plug },
    { href: `/workspaces/${id}/audit-log`, label: 'Audit Log', desc: 'Security and activity log', icon: ScrollText },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/workspaces" className="flex items-center gap-1 text-sm text-fg-secondary hover:text-fg mb-4">
        <ArrowLeft className="h-4 w-4" /> All workspaces
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div
          className="flex h-14 w-14 items-center justify-center border-2 font-display text-xl font-black"
          style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard)' }}
        >
          {detail.name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="heading-display text-2xl">{detail.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={detail.role === 'owner' ? 'accent' : 'default'}>{detail.role}</Badge>
            <span className="text-xs text-fg-muted">{detail.slug}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="p-4 flex items-center gap-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
              <div
                className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
                style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-xs text-fg-secondary">{s.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
