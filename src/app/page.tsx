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

const OS_MODULES_KEY_MAP: { href: string; icon: typeof LayoutGrid; titleKey: string; descKey: string }[] = [
  { href: '/dashboard', icon: LayoutGrid, titleKey: 'home.modDashboard', descKey: 'home.modDashboardDesc' },
  { href: '/projects', icon: FolderKanban, titleKey: 'home.modProjects', descKey: 'home.modProjectsDesc' },
  { href: '/tasks', icon: CheckSquare, titleKey: 'home.modTasks', descKey: 'home.modTasksDesc' },
  { href: '/documents', icon: FileText, titleKey: 'home.modDocuments', descKey: 'home.modDocumentsDesc' },
  { href: '/conversations', icon: MessageSquare, titleKey: 'home.modConversations', descKey: 'home.modConversationsDesc' },
  { href: '/calendar', icon: Calendar, titleKey: 'home.modCalendar', descKey: 'home.modCalendarDesc' },
  { href: '/people', icon: Users, titleKey: 'home.modPeople', descKey: 'home.modPeopleDesc' },
  { href: '/analytics', icon: BarChart3, titleKey: 'home.modAnalytics', descKey: 'home.modAnalyticsDesc' },
  { href: '/agents', icon: Bot, titleKey: 'home.modAgents', descKey: 'home.modAgentsDesc' },
  { href: '/automations', icon: Zap, titleKey: 'home.modAutomations', descKey: 'home.modAutomationsDesc' },
  { href: '/files', icon: FolderOpen, titleKey: 'home.modFiles', descKey: 'home.modFilesDesc' },
  { href: '/search', icon: Search, titleKey: 'home.modSearch', descKey: 'home.modSearchDesc' },
];

const PLATFORM_FEATURES_KEY_MAP: { href: string; icon: typeof LayoutGrid; titleKey: string; descKey: string }[] = [
  { href: '/developers', icon: Code2, titleKey: 'home.pfDeveloperApi', descKey: 'home.pfDeveloperApiDesc' },
  { href: '/settings', icon: Settings, titleKey: 'home.pfSettings', descKey: 'home.pfSettingsDesc' },
  { href: '/admin', icon: Shield, titleKey: 'home.pfAdmin', descKey: 'home.pfAdminDesc' },
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
      <a href="#main-content" className="skip-link">Skip to content</a>
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

      <main id="main-content" tabIndex={-1}>
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
        <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Get started">
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
        </nav>
      </div>

      {/* OS Module Grid */}
      <nav className="max-w-6xl mx-auto px-4 pb-16" aria-label="OS modules">
        <h2 className="mb-6 text-center text-lg font-semibold text-fg-secondary">
          {t('home.modulesHeading').replace('{count}', String(OS_MODULES_KEY_MAP.length))}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {OS_MODULES_KEY_MAP.map((mod) => {
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
                  <h3 className="font-bold tracking-tight">{t(mod.titleKey)}</h3>
                </div>
                <p className="mt-3 text-sm text-fg-faint leading-relaxed">{t(mod.descKey)}</p>
                <div className="mt-3 flex items-center gap-1 text-sm font-medium opacity-0 transition duration-300 group-hover:opacity-100" style={{ color: 'var(--color-brand-accent)' }}>
                  Open <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Platform Features */}
      <nav className="max-w-6xl mx-auto px-4 pb-16" aria-label="Platform features">
        <h2 className="mb-6 text-center text-lg font-semibold text-fg-secondary">
          {t('home.platformHeading')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {PLATFORM_FEATURES_KEY_MAP.map((mod) => {
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
                  <h3 className="font-bold tracking-tight">{t(mod.titleKey)}</h3>
                </div>
                <p className="mt-3 text-sm text-fg-faint leading-relaxed">{t(mod.descKey)}</p>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { value: '15+', label: t('home.statModules') },
            { value: '55', label: t('home.statModels') },
            { value: '13', label: t('home.statLanguages') },
            { value: '99.9%', label: t('home.statUptime') },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-surface p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: 'var(--color-brand-accent)' }}>{stat.value}</div>
              <div className="mt-1 text-xs text-fg-faint">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      </main>
    </div>
  );
}
