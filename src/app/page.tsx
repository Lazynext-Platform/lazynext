'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useI18n } from '@/i18n/provider';
import {
  ArrowRight,
  LayoutGrid,
  FolderKanban,
  CheckSquare,
  FileText,
  MessageSquare,
  Calendar,
  Users,
  BarChart3,
  Bot,
  Zap,
  Search,
  Settings,
  Shield,
  Code2,
  FolderOpen,
  AlertCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';

type OSModule = {
  href: string;
  icon: typeof LayoutGrid;
  title: string;
  description: string;
};

const OS_MODULES: OSModule[] = [
  { href: '/dashboard', icon: LayoutGrid, title: 'Dashboard', description: 'Overview of your workspace, projects, tasks, and activity' },
  { href: '/projects', icon: FolderKanban, title: 'Projects', description: 'Organize work into projects with tasks, documents, and files' },
  { href: '/tasks', icon: CheckSquare, title: 'Tasks', description: 'Track work with Kanban boards, assignments, and priorities' },
  { href: '/documents', icon: FileText, title: 'Documents', description: 'Create and share knowledge base articles and documentation' },
  { href: '/conversations', icon: MessageSquare, title: 'Conversations', description: 'Workspace messaging and team discussions' },
  { href: '/calendar', icon: Calendar, title: 'Calendar', description: 'Schedule and track events, deadlines, and milestones' },
  { href: '/people', icon: Users, title: 'People', description: 'Manage workspace members and roles' },
  { href: '/analytics', icon: BarChart3, title: 'Analytics', description: 'Cross-module insights and resource distribution charts' },
  { href: '/agents', icon: Bot, title: 'AI Agents', description: 'Create AI agents to automate tasks with custom instructions' },
  { href: '/automations', icon: Zap, title: 'Automations', description: 'Automate repetitive workflows with triggers and actions' },
  { href: '/files', icon: FolderOpen, title: 'Files', description: 'Upload, store, and share files across your workspace' },
  { href: '/search', icon: Search, title: 'Search', description: 'Search across projects, tasks, documents, and creative work' },
];

const PLATFORM_FEATURES: OSModule[] = [
  { href: '/developers', icon: Code2, title: 'Developer API', description: 'REST API v1, MCP server, webhooks, and API keys' },
  { href: '/settings', icon: Settings, title: 'Settings', description: 'Profile, security, notifications, billing, and preferences' },
  { href: '/admin', icon: Shield, title: 'Admin', description: 'User management, credit adjustments, and system oversight' },
];

export default function Home() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const authError = searchParams.get('error');
  const verified = searchParams.get('verified');

  const errorMessages: Record<string, string> = {
    'invalid-token': t('auth.invalidToken'),
    'token-expired': t('auth.tokenExpired'),
    'verification-failed': t('auth.verificationFailed'),
    'Configuration': t('auth.signInError'),
    'OAuthCallback': t('auth.signInError'),
  };
  const errorText = authError ? (errorMessages[authError] || t('auth.signInError')) : '';

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      {/* Email verification success banner */}
      {verified === 'true' && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{t('auth.emailVerified')}</span>
          </div>
        </div>
      )}
      {/* Auth error banner */}
      {authError && (
        <div className="mx-auto max-w-6xl px-6 pt-4">
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorText}</span>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-6">
        <div className="mb-4 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-fg-secondary">
            <Sparkles className="h-3 w-3" style={{ color: 'var(--color-brand-accent)' }} />
            {t('home.featured')}
          </span>
        </div>
        <div className="text-[14px] uppercase tracking-[0.24em] text-fg-muted font-semibold mb-3" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", sans-serif' }}>Lazynext</div>
        <h1 className="font-bold uppercase leading-[1.06] tracking-[-0.03em] text-[clamp(38px,5.2vw,56px)] text-fg" style={{ fontFamily: 'var(--font-grotesk), "Space Grotesk", system-ui, sans-serif' }}>
          {t('home.heroTitle')}<br /><span style={{ color: 'var(--color-brand-accent)' }}>{t('home.heroTitleHl')}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-fg-faint">{t('home.heroSubtitle')}</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            style={{ background: 'var(--color-brand-accent)' }}
          >
            {t('home.tryIt')} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-fg-secondary transition hover:border-line-strong hover:text-fg"
          >
            {t('home.signUp')}
          </Link>
        </div>
      </div>

      {/* OS Module Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="mb-6 text-center text-lg font-semibold text-fg-secondary">
          {OS_MODULES.length} modules · one unified workspace
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OS_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-[#00b2fc]/50 hover:bg-surface"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl transition duration-300 group-hover:scale-110" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold tracking-tight">{mod.title}</h3>
                </div>
                <p className="mt-3 text-sm text-fg-faint leading-relaxed">{mod.description}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium opacity-0 transition duration-300 group-hover:opacity-100" style={{ color: 'var(--color-brand-accent)' }}>
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Platform Features */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <h2 className="mb-6 text-center text-lg font-semibold text-fg-secondary">
          Platform
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLATFORM_FEATURES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link
                key={mod.href}
                href={mod.href}
                className="group rounded-2xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-[#00b2fc]/50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-bold tracking-tight">{mod.title}</h3>
                </div>
                <p className="mt-3 text-sm text-fg-faint leading-relaxed">{mod.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: '15+', label: 'OS Modules' },
            { value: '37', label: 'Data Models' },
            { value: '10', label: 'Languages' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-surface p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--color-brand-accent)' }}>{stat.value}</div>
              <div className="mt-1 text-xs text-fg-faint">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
