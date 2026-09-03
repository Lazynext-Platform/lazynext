import Link from 'next/link';
import { User, Lock, Bell, Globe, Palette, Building, CreditCard, Webhook, ScrollText, ArrowRight } from 'lucide-react';
import { auth } from '@/../auth';
import { Card } from '@/components/ui';

export const dynamic = 'force-dynamic';

const SETTINGS_SECTIONS = [
  { href: '/settings/profile', label: 'Profile', desc: 'Your name, email, and avatar', icon: User },
  { href: '/settings/security', label: 'Security', desc: 'Password, MFA, and active sessions', icon: Lock },
  { href: '/settings/notifications', label: 'Notifications', desc: 'Email and in-app notification preferences', icon: Bell },
  { href: '/settings/locale', label: 'Language & Region', desc: 'Language, timezone, and regional settings', icon: Globe },
  { href: '/settings/appearance', label: 'Appearance', desc: 'Theme and display preferences', icon: Palette },
];

const WORKSPACE_SECTIONS = [
  { href: '/workspaces', label: 'Workspaces', desc: 'Manage your workspaces and organizations', icon: Building },
  { href: '/settings/billing', label: 'Billing & Plan', desc: 'Plan tier, credits, usage limits, and upgrades', icon: CreditCard },
  { href: '/developers', label: 'Developer', desc: 'API keys, MCP, and webhooks', icon: Webhook },
  { href: '/admin', label: 'Admin', desc: 'User and system administration', icon: ScrollText },
];

export default async function SettingsPage() {
  const session = await auth().catch(() => null);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="heading-display text-2xl mb-8">Settings</h1>

      {/* User section */}
      <h2 className="label-mono mb-3">Personal</h2>
      <div className="grid gap-3 mb-8">
        {SETTINGS_SECTIONS.map((s) => (
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
              <ArrowRight className="h-4 w-4 text-fg-muted shrink-0" />
            </Card>
          </Link>
        ))}
      </div>

      {/* Workspace section */}
      <h2 className="label-mono mb-3">Workspace & Platform</h2>
      <div className="grid gap-3">
        {WORKSPACE_SECTIONS.map((s) => (
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
              <ArrowRight className="h-4 w-4 text-fg-muted shrink-0" />
            </Card>
          </Link>
        ))}
      </div>

      {/* User info footer */}
      {session?.user && (
        <div className="mt-8 pt-6 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
          <p className="text-xs text-fg-muted">
            Signed in as {session.user.email}
          </p>
        </div>
      )}
    </div>
  );
}
