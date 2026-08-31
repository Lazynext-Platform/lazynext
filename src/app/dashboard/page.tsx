'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Clapperboard, Coins, Boxes, FolderOpen, ArrowRight, Loader2, Film, Play, Sparkles,
  TrendingDown, TrendingUp, BarChart3, Trophy, Calendar, Gift, Layers, Scissors, Server, Users, Zap, Workflow,
  FileText, RefreshCw, Lightbulb, Shield, Flame, GitBranch, CalendarClock, Radar, PenLine, Anchor, FileSpreadsheet, ScrollText, UsersRound, LayoutGrid, GitMerge, FileSearch2, LayoutTemplate, Palette, Gauge, FlaskRound, TestTube, Compass, Mic, Type, Newspaper, Lightbulb as LightbulbIcon, Clock, BatteryLow, MousePointerClick, Expand, BookOpenCheck, Droplet, Hash, Clapperboard as ClapperboardIcon, Image as ImageIcon, Music, Mic2, FileText as FileTextIcon, Target, FlaskConical as FlaskIcon, Users as UsersIcon, ShieldCheck as ShieldIcon, HeartPulse, Heart, Repeat2, DollarSign, TrendingUp as TrendingIcon, ListOrdered, BookMarked, Globe2, LineChart, Smile, Grid2x2, RefreshCcw, MicVocal, Users2, Layers3, Swords, Radio, LayoutList, LifeBuoy, Split, AlertTriangle, Eye, MessageSquareQuote, Brain, SlidersHorizontal, Wand, Award, Shuffle, Waves, Contrast, HelpCircle, Drum, Layout, AudioLines, CheckCircle
} from 'lucide-react';
import { useI18n } from '@/i18n/provider';
import { appTitle, appDesc, isFeatured } from '@/config/appCatalog';
import { formatNumber, formatDateTime } from '@/lib/i18n-format';
import { AuthModal } from '@/components/AuthModal';
import { OnboardingModal } from '@/components/OnboardingModal';

type App = { id: string; href: string; icon: typeof Clapperboard };
const APPS: App[] = [
  { id: 'lazynext-studio', href: '/lazynext-studio', icon: Clapperboard },
  { id: 'ad-reference', href: '/ad-reference', icon: Clapperboard },
  { id: 'drama-studio', href: '/drama-studio', icon: Clapperboard },
  { id: 'ad-skit', href: '/ad-skit', icon: Clapperboard },
  { id: 'creative-studio', href: '/creative-studio', icon: Sparkles },
  { id: 'creative-director', href: '/creative-director', icon: Sparkles },
  { id: 'ads', href: '/ads', icon: Clapperboard },
  { id: 'performance', href: '/performance', icon: Clapperboard },
  { id: 'creative-assets', href: '/creative-assets', icon: Sparkles },
  { id: 'creator-kits', href: '/creator-kits', icon: Gift },
  { id: 'brand-concepts', href: '/brand-concepts', icon: Layers },
  { id: 'clip-editor', href: '/clip-editor', icon: Scissors },
  { id: 'media-service-boundary', href: '/media-service-boundary', icon: Server },
  { id: 'team-workspace', href: '/teams', icon: Users },
  { id: 'analytics-hub', href: '/analytics-hub', icon: BarChart3 },
  { id: 'ab-automation', href: '/ab-automation', icon: Zap },
  { id: 'workflow-builder', href: '/workflow-builder', icon: Workflow },
  { id: 'product-brief', href: '/product-brief', icon: FileText },
  { id: 'reference-remix', href: '/reference-remix', icon: RefreshCw },
  { id: 'multi-concept', href: '/multi-concept', icon: Lightbulb },
  { id: 'meta-safety', href: '/meta-safety', icon: Shield },
  { id: 'google-safety', href: '/google-safety', icon: Shield },
  { id: 'performance-loop', href: '/performance-loop', icon: TrendingUp },
  { id: 'viral-analyzer', href: '/viral-analyzer', icon: Flame },
  { id: 'skill-chains', href: '/skill-chains', icon: GitBranch },
  { id: 'brand-guardrails', href: '/brand-guardrails', icon: Shield },
  { id: 'smart-calendar', href: '/smart-calendar', icon: CalendarClock },
  { id: 'competitor-watch', href: '/competitor-watch', icon: Radar },
  { id: 'ad-copy-generator', href: '/ad-copy-generator', icon: PenLine },
  { id: 'hook-library', href: '/hook-library', icon: Anchor },
  { id: 'brief-template-builder', href: '/brief-template-builder', icon: FileSpreadsheet },
  { id: 'ad-script-writer', href: '/ad-script-writer', icon: ScrollText },
  { id: 'audience-persona-generator', href: '/audience-persona-generator', icon: UsersRound },
  { id: 'variant-matrix-generator', href: '/variant-matrix-generator', icon: LayoutGrid },
  { id: 'ad-concept-merger', href: '/ad-concept-merger', icon: GitMerge },
  { id: 'brief-analyzer', href: '/brief-analyzer', icon: FileSearch2 },
  { id: 'ad-format-optimizer', href: '/ad-format-optimizer', icon: LayoutTemplate },
  { id: 'mood-board-generator', href: '/mood-board-generator', icon: Palette },
  { id: 'ad-performance-predictor', href: '/ad-performance-predictor', icon: Gauge },
  { id: 'ab-test-planner', href: '/ab-test-planner', icon: FlaskRound },
  { id: 'hook-tester', href: '/hook-tester', icon: TestTube },
  { id: 'trend-spotter', href: '/trend-spotter', icon: Compass },
  { id: 'brand-voice-analyzer', href: '/brand-voice-analyzer', icon: Mic },
  { id: 'ad-caption-generator', href: '/ad-caption-generator', icon: Type },
  { id: 'ad-headline-generator', href: '/ad-headline-generator', icon: Newspaper },
  { id: 'angle-finder', href: '/angle-finder', icon: LightbulbIcon },
  { id: 'ad-timing-optimizer', href: '/ad-timing-optimizer', icon: Clock },
  { id: 'creative-fatigue-detector', href: '/creative-fatigue-detector', icon: BatteryLow },
  { id: 'ad-cta-optimizer', href: '/ad-cta-optimizer', icon: MousePointerClick },
  { id: 'concept-expander', href: '/concept-expander', icon: Expand },
  { id: 'ad-story-generator', href: '/ad-story-generator', icon: BookOpenCheck },
  { id: 'ad-color-palette-generator', href: '/ad-color-palette-generator', icon: Droplet },
  { id: 'ad-thumbnail-generator', href: '/ad-thumbnail-generator', icon: ImageIcon },
  { id: 'ad-font-pairing-generator', href: '/ad-font-pairing-generator', icon: Type },
  { id: 'ad-hashtag-generator', href: '/ad-hashtag-generator', icon: Hash },
  { id: 'creative-scene-generator', href: '/creative-scene-generator', icon: ClapperboardIcon },
  { id: 'ad-music-mood-matcher', href: '/ad-music-mood-matcher', icon: Music },
  { id: 'ad-voiceover-script-generator', href: '/ad-voiceover-script-generator', icon: Mic2 },
  { id: 'creative-brief-generator', href: '/creative-brief-generator', icon: FileTextIcon },
  { id: 'ad-placement-strategist', href: '/ad-placement-strategist', icon: Target },
  { id: 'ad-ab-test-name-generator', href: '/ad-ab-test-name-generator', icon: FlaskIcon },
  { id: 'creative-hook-revamp-generator', href: '/creative-hook-revamp-generator', icon: Zap },
  { id: 'ad-audience-segment-builder', href: '/ad-audience-segment-builder', icon: UsersIcon },
  { id: 'creative-concept-validator', href: '/creative-concept-validator', icon: ShieldIcon },
  { id: 'ad-emotion-analyzer', href: '/ad-emotion-analyzer', icon: HeartPulse },
  { id: 'creative-format-converter', href: '/creative-format-converter', icon: Repeat2 },
  { id: 'ad-budget-allocator', href: '/ad-budget-allocator', icon: DollarSign },
  { id: 'creative-trend-adapter', href: '/creative-trend-adapter', icon: TrendingIcon },
  { id: 'ad-creative-sequencer', href: '/ad-creative-sequencer', icon: ListOrdered },
  { id: 'brand-story-architect', href: '/brand-story-architect', icon: BookMarked },
  { id: 'ad-localization-adapter', href: '/ad-localization-adapter', icon: Globe2 },
  { id: 'creative-performance-forecaster', href: '/creative-performance-forecaster', icon: LineChart },
  { id: 'ad-sentiment-tuner', href: '/ad-sentiment-tuner', icon: Smile },
  { id: 'creative-hook-matrix-generator', href: '/creative-hook-matrix-generator', icon: Grid2x2 },
  { id: 'ad-creative-rotator', href: '/ad-creative-rotator', icon: RefreshCcw },
  { id: 'brand-voice-consistency-checker', href: '/brand-voice-consistency-checker', icon: MicVocal },
  { id: 'ad-persona-matcher', href: '/ad-persona-matcher', icon: Users2 },
  { id: 'creative-concept-expander-pro', href: '/creative-concept-expander-pro', icon: Layers3 },
  { id: 'ad-competitive-intelligence', href: '/ad-competitive-intelligence', icon: Swords },
  { id: 'creative-quality-scorer', href: '/creative-quality-scorer', icon: Gauge },
  { id: 'ad-audience-resonance-predictor', href: '/ad-audience-resonance-predictor', icon: Radio },
  { id: 'creative-format-recommender', href: '/creative-format-recommender', icon: LayoutList },
  { id: 'ad-creative-lifecycle-manager', href: '/ad-creative-lifecycle-manager', icon: LifeBuoy },
  { id: 'creative-sentiment-journey-mapper', href: '/creative-sentiment-journey-mapper', icon: HeartPulse },
  { id: 'ad-creative-ab-test-simulator', href: '/ad-creative-ab-test-simulator', icon: Split },
  { id: 'creative-visual-hierarchy-analyzer', href: '/creative-visual-hierarchy-analyzer', icon: Eye },
  { id: 'ad-audience-pain-point-mapper', href: '/ad-audience-pain-point-mapper', icon: AlertTriangle },
  { id: 'creative-messaging-framework-builder', href: '/creative-messaging-framework-builder', icon: MessageSquareQuote },
  { id: 'ad-creative-burnout-detector', href: '/ad-creative-burnout-detector', icon: Flame },
  { id: 'creative-ad-concept-synthesizer', href: '/creative-ad-concept-synthesizer', icon: GitMerge },
  { id: 'ad-audience-psychographic-profiler', href: '/ad-audience-psychographic-profiler', icon: Brain },
  { id: 'creative-ad-tone-calibrator', href: '/creative-ad-tone-calibrator', icon: SlidersHorizontal },
  { id: 'creative-ad-format-innovator', href: '/creative-ad-format-innovator', icon: Sparkles },
  { id: 'ad-creative-story-arc-designer', href: '/ad-creative-story-arc-designer', icon: Lightbulb },
  { id: 'creative-ad-persuasion-strategist', href: '/creative-ad-persuasion-strategist', icon: Zap },
  { id: 'ad-creative-hook-timing-optimizer', href: '/ad-creative-hook-timing-optimizer', icon: Clock },
  { id: 'creative-ad-metaphor-generator', href: '/creative-ad-metaphor-generator', icon: Wand },
  { id: 'ad-creative-sensory-enhancer', href: '/ad-creative-sensory-enhancer', icon: Eye },
  { id: 'creative-ad-pattern-interrupt-designer', href: '/creative-ad-pattern-interrupt-designer', icon: Zap },
  { id: 'ad-creative-social-proof-architect', href: '/ad-creative-social-proof-architect', icon: Award },
  { id: 'creative-ad-anticipation-builder', href: '/creative-ad-anticipation-builder', icon: Flame },
  { id: 'ad-creative-contrast-amplifier', href: '/ad-creative-contrast-amplifier', icon: GitMerge },
  { id: 'creative-ad-micro-moment-designer', href: '/creative-ad-micro-moment-designer', icon: Zap },
  { id: 'ad-creative-emotion-sequencer', href: '/ad-creative-emotion-sequencer', icon: HeartPulse },
  { id: 'creative-ad-narrative-twist-designer', href: '/creative-ad-narrative-twist-designer', icon: Shuffle },
  { id: 'ad-creative-memory-anchor-builder', href: '/ad-creative-memory-anchor-builder', icon: Anchor },
  { id: 'creative-ad-tension-release-strategist', href: '/creative-ad-tension-release-strategist', icon: Waves },
  { id: 'ad-creative-sensory-contrast-designer', href: '/ad-creative-sensory-contrast-designer', icon: Contrast },
  { id: 'creative-ad-curiosity-gap-designer', href: '/creative-ad-curiosity-gap-designer', icon: HelpCircle },
  { id: 'ad-creative-rhythm-pacing-optimizer', href: '/ad-creative-rhythm-pacing-optimizer', icon: Drum },
  { id: 'creative-ad-visual-hierarchy-strategist', href: '/creative-ad-visual-hierarchy-strategist', icon: Layout },
  { id: 'ad-creative-sound-design-strategist', href: '/ad-creative-sound-design-strategist', icon: AudioLines },
  { id: 'creative-ad-surprise-element-designer', href: '/creative-ad-surprise-element-designer', icon: Sparkles },
  { id: 'ad-creative-callback-memory-designer', href: '/ad-creative-callback-memory-designer', icon: Repeat2 },
  { id: 'creative-ad-climax-architect', href: '/creative-ad-climax-architect', icon: TrendingUp },
  { id: 'ad-creative-pacing-variability-designer', href: '/ad-creative-pacing-variability-designer', icon: Gauge },
  { id: 'creative-ad-foreshadowing-designer', href: '/creative-ad-foreshadowing-designer', icon: Eye },
  { id: 'ad-creative-emotional-pivot-designer', href: '/ad-creative-emotional-pivot-designer', icon: Shuffle },
  { id: 'creative-ad-resolution-designer', href: '/creative-ad-resolution-designer', icon: CheckCircle },
  { id: 'ad-creative-viewer-reward-designer', href: '/ad-creative-viewer-reward-designer', icon: Gift },
  { id: 'ad-creative-tension-release-designer', href: '/ad-creative-tension-release-designer', icon: Waves },
  { id: 'creative-ad-stakes-escalation-designer', href: '/creative-ad-stakes-escalation-designer', icon: TrendingUp },
  { id: 'ad-creative-curiosity-loop-designer', href: '/ad-creative-curiosity-loop-designer', icon: HelpCircle },
  { id: 'creative-ad-transformation-arc-designer', href: '/creative-ad-transformation-arc-designer', icon: RefreshCw },
  { id: 'ad-creative-emotional-anchor-designer', href: '/ad-creative-emotional-anchor-designer', icon: Anchor },
  { id: 'creative-ad-empathy-bridge-designer', href: '/creative-ad-empathy-bridge-designer', icon: Heart },
  { id: 'ad-creative-belief-shift-designer', href: '/ad-creative-belief-shift-designer', icon: Brain },
  { id: 'creative-ad-desire-amplifier-designer', href: '/creative-ad-desire-amplifier-designer', icon: Flame },
  { id: 'ad-creative-trust-accelerator-designer', href: '/ad-creative-trust-accelerator-designer', icon: ShieldIcon },
  { id: 'creative-ad-urgency-catalyst-designer', href: '/creative-ad-urgency-catalyst-designer', icon: Zap },
  { id: 'ad-creative-social-momentum-designer', href: '/ad-creative-social-momentum-designer', icon: Users },
  { id: 'creative-ad-value-ladder-designer', href: '/creative-ad-value-ladder-designer', icon: TrendingUp },
];

type Creation = {
  id: string; templateId: string; prompt: string; status: string;
  outputs: string[] | null; inputImage: string | null; createdAt: string;
};

type Counts = { products: number; avatars: number; brandKits: number };

export default function DashboardPage() {
  const { status, data: session } = useSession();
  const { t, appText, locale } = useI18n();
  const [credits, setCredits] = useState<number | null>(null);
  const [recent, setRecent] = useState<Creation[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [analytics, setAnalytics] = useState<{
    totalSpent: number; totalGranted: number; currentBalance: number;
    byReason: Record<string, { count: number; totalDelta: number }>;
    byDay: Array<{ date: string; spent: number; granted: number }>;
    projection: { avgDailySpend: number; daysUntilEmpty: number | null; currentBalance: number };
  } | null>(null);
  const [leaderboard, setLeaderboard] = useState<{
    entries: Array<{
      creationId: string; platform: string; hookType: string | null; angleName: string | null;
      impressions: number; clicks: number; conversions: number; spend: number; revenue: number;
      ctr: number; cvr: number; roas: number; recordedAt: string;
    }>;
    summary: { totalImpressions: number; totalClicks: number; totalConversions: number; totalSpend: number; totalRevenue: number; avgCtr: number; avgRoas: number };
    byPlatform: Record<string, { count: number; avgRoas: number }>;
  } | null>(null);
  const [calendar, setCalendar] = useState<{
    month: string;
    entries: Array<{ date: string; type: 'campaign' | 'creative'; name: string; platform?: string; status?: string; id: string }>;
    upcoming: Array<{ date: string; type: 'campaign' | 'creative'; name: string; platform?: string; status?: string; id: string }>;
    stats: { totalCampaigns: number; totalCreatives: number; activeCampaigns: number };
  } | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/me').then((r) => r.json()).then((j) => setCredits(j.credits ?? 0)).catch(() => {});
    fetch('/api/creations', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setRecent(((j.creations || []) as Creation[]).slice(0, 4)))
      .catch(() => setRecent([]));
    Promise.all([
      fetch('/api/assets/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/assets/avatars', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/assets/brand-kits', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([p, a, b]) => setCounts({
        products: (p.products || []).length,
        avatars: (a.avatars || []).length,
        brandKits: (b.brandKits || []).length,
      }))
      .catch(() => setCounts({ products: 0, avatars: 0, brandKits: 0 }));
    fetch('/api/credits/analytics', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setAnalytics(j))
      .catch(() => {});
    fetch('/api/creative/leaderboard', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setLeaderboard(j))
      .catch(() => {});
    fetch('/api/creative/calendar', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => setCalendar(j))
      .catch(() => {});
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center py-32"><Loader2 className="h-7 w-7 animate-spin text-fg-faint" /></div>
      </div>
    );
  }

  if (status !== 'authenticated') {
    return (
      <div className="min-h-screen text-fg app-grid-bg bg-app">
        <div className="grid place-items-center gap-4 py-32 text-center">
          <div className="text-5xl">🔐</div>
          <h1 className="text-2xl font-bold text-fg">{t('dashboard.welcome')}</h1>
          <p className="text-fg-faint">{t('dashboard.subtitle')}</p>
          <button onClick={() => setAuthOpen(true)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('common.signIn')}</button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="signin" />
      </div>
    );
  }

  const featured = APPS.filter((app) => isFeatured(app.href));

  return (
    <div className="min-h-screen text-fg app-grid-bg bg-app">
      <OnboardingModal />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
        {/* Welcome + credits */}
        <div className="pt-6 pb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t('dashboard.welcome')}, {session.user?.name?.split(' ')[0] || session.user?.email?.split('@')[0]}
          </h1>
          <p className="mt-2 text-sm text-fg-faint">{t('dashboard.subtitle')}</p>
        </div>

        {/* Quick stats row */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link href="/pricing" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><Coins className="h-4 w-4" /><span className="text-xs font-medium">{t('dashboard.credits')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{credits === null ? '·' : formatNumber(credits, locale)}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('dashboard.buyCredits')} →</div>
          </Link>
          <Link href="/my-work" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><FolderOpen className="h-4 w-4" /><span className="text-xs font-medium">{t('nav.myWork')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{recent ? recent.length : '·'}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('dashboard.viewAll')} →</div>
          </Link>
          <Link href="/assets" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><Boxes className="h-4 w-4" /><span className="text-xs font-medium">{t('nav.assets')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{counts ? counts.products + counts.avatars + counts.brandKits : '·'}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('dashboard.viewAll')} →</div>
          </Link>
          <Link href="/settings" className="group rounded-2xl border border-line bg-surface p-4 transition hover:border-[#00b2fc]/40">
            <div className="flex items-center gap-2 text-fg-faint"><Clapperboard className="h-4 w-4" /><span className="text-xs font-medium">{t('nav.settings')}</span></div>
            <div className="mt-1 text-2xl font-bold text-fg">{session.user?.name?.split(' ')[0] || '·'}</div>
            <div className="mt-1 text-[11px] text-brand-accent opacity-0 transition group-hover:opacity-100">{t('nav.settings')} →</div>
          </Link>
        </div>

        {/* Credit analytics */}
        {analytics && (
          <div className="mb-10 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('dashboard.creditAnalytics')}</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="flex items-center gap-1 text-xs text-fg-faint">
                  <TrendingDown className="h-3 w-3" />
                  {t('dashboard.totalSpent')}
                </div>
                <div className="mt-1 text-xl font-bold text-fg">{analytics.totalSpent}</div>
              </div>
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="flex items-center gap-1 text-xs text-fg-faint">
                  <TrendingUp className="h-3 w-3" />
                  {t('dashboard.totalGranted')}
                </div>
                <div className="mt-1 text-xl font-bold text-fg">{analytics.totalGranted}</div>
              </div>
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="text-xs text-fg-faint">{t('dashboard.avgDailySpend')}</div>
                <div className="mt-1 text-xl font-bold text-fg">{analytics.projection.avgDailySpend}</div>
              </div>
              <div className="rounded-lg border border-line bg-app p-3">
                <div className="text-xs text-fg-faint">{t('dashboard.daysRemaining')}</div>
                <div className="mt-1 text-xl font-bold text-fg">
                  {analytics.projection.daysUntilEmpty !== null
                    ? `${analytics.projection.daysUntilEmpty}d`
                    : '∞'}
                </div>
              </div>
            </div>

            {/* By reason breakdown */}
            {Object.keys(analytics.byReason).length > 0 && (
              <div className="mb-4">
                <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('dashboard.spendByCategory')}</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(analytics.byReason)
                    .sort(([, a], [, b]) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta))
                    .map(([reason, data]) => (
                      <span key={reason} className="text-xs rounded-full bg-app border border-line px-3 py-1">
                        {reason}: {data.totalDelta > 0 ? '+' : ''}{data.totalDelta} ({data.count}x)
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* 30-day spend chart (simple bar chart with divs) */}
            {analytics.byDay.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-medium text-fg-faint">{t('dashboard.spendLast30Days')}</h3>
                <div className="flex items-end gap-px h-20 overflow-x-auto">
                  {analytics.byDay.map(day => {
                    const maxSpent = Math.max(...analytics.byDay.map(d => d.spent), 1);
                    const heightPct = (day.spent / maxSpent) * 100;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 min-w-[4px] bg-brand-accent/60 rounded-t hover:bg-brand-accent transition-colors"
                        style={{ height: `${Math.max(heightPct, 2)}%` }}
                        title={`${day.date}: -${day.spent} credits, +${day.granted} granted`}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance leaderboard */}
        {leaderboard && (
          <div className="mb-10 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('dashboard.leaderboard')}</h2>
            </div>

            {leaderboard.entries.length === 0 ? (
              <p className="text-xs text-fg-faint">{t('dashboard.leaderboardEmpty')}</p>
            ) : (
              <>
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.totalImpressions')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{formatNumber(leaderboard.summary.totalImpressions, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.totalClicks')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{formatNumber(leaderboard.summary.totalClicks, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.totalConversions')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{formatNumber(leaderboard.summary.totalConversions, locale)}</div>
                  </div>
                  <div className="rounded-lg border border-line bg-app p-3">
                    <div className="text-xs text-fg-faint">{t('dashboard.avgRoas')}</div>
                    <div className="mt-1 text-xl font-bold text-fg">{leaderboard.summary.avgRoas}x</div>
                  </div>
                </div>

                {/* Platform breakdown */}
                <div className="mb-4 flex gap-2">
                  {Object.entries(leaderboard.byPlatform).map(([platform, data]) => (
                    data.count > 0 && (
                      <span key={platform} className="text-xs rounded-full bg-app border border-line px-3 py-1">
                        {platform}: {data.count} campaigns, avg ROAS {data.avgRoas.toFixed(2)}x
                      </span>
                    )
                  ))}
                </div>

                {/* Leaderboard table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-line text-left text-fg-faint">
                        <th className="pb-2 pr-3 font-medium">#</th>
                        <th className="pb-2 pr-3 font-medium">Platform</th>
                        <th className="pb-2 pr-3 font-medium">Hook</th>
                        <th className="pb-2 pr-3 font-medium">Angle</th>
                        <th className="pb-2 pr-3 font-medium text-right">Impressions</th>
                        <th className="pb-2 pr-3 font-medium text-right">CTR</th>
                        <th className="pb-2 pr-3 font-medium text-right">ROAS</th>
                        <th className="pb-2 pr-3 font-medium text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.entries.map((entry, i) => (
                        <tr key={i} className="border-b border-line/50">
                          <td className="py-2 pr-3 font-bold text-fg">{i + 1}</td>
                          <td className="py-2 pr-3">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${entry.platform === 'meta' ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'}`}>
                              {entry.platform}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-fg-faint">{entry.hookType || '—'}</td>
                          <td className="py-2 pr-3 text-fg-faint">{entry.angleName || '—'}</td>
                          <td className="py-2 pr-3 text-right text-fg">{formatNumber(entry.impressions, locale)}</td>
                          <td className="py-2 pr-3 text-right text-fg">{(entry.ctr * 100).toFixed(2)}%</td>
                          <td className="py-2 pr-3 text-right font-bold text-fg">{entry.roas.toFixed(2)}x</td>
                          <td className="py-2 pr-3 text-right text-fg">${entry.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* Content calendar */}
        {calendar && (
          <div className="mb-10 rounded-2xl border border-line bg-surface p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-brand-accent" />
              <h2 className="text-lg font-bold text-fg">{t('dashboard.contentCalendar')}</h2>
              <span className="ml-auto text-xs text-fg-faint">{calendar.month}</span>
            </div>

            {/* Upcoming reminders */}
            {calendar.upcoming.length > 0 && (
              <div className="mb-4 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <h3 className="mb-2 text-xs font-medium text-warning">{t('dashboard.upcomingDeployments')}</h3>
                <div className="space-y-1">
                  {calendar.upcoming.map((u, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-fg">{u.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="rounded bg-app border border-line px-1.5 py-0.5 text-[10px]">{u.platform}</span>
                        <span className="text-fg-faint">{u.date}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar grid */}
            {calendar.entries.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {calendar.entries.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 rounded bg-app px-3 py-2 text-xs">
                    <span className="text-fg-faint font-mono shrink-0">{e.date.slice(5)}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${
                      e.type === 'campaign'
                        ? e.platform === 'meta' ? 'bg-blue-500/15 text-blue-500' : 'bg-red-500/15 text-red-500'
                        : 'bg-brand-accent/15 text-brand-accent'
                    }`}>
                      {e.type === 'campaign' ? e.platform : e.type}
                    </span>
                    <span className="text-fg truncate">{e.name}</span>
                    {e.status && (
                      <span className="ml-auto text-fg-faint shrink-0">{e.status}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-fg-faint">{t('dashboard.calendarEmpty')}</p>
            )}

            {/* Stats */}
            <div className="mt-3 flex gap-3 text-xs text-fg-faint">
              <span>{calendar.stats.totalCampaigns} campaigns</span>
              <span>·</span>
              <span>{calendar.stats.totalCreatives} creatives</span>
              <span>·</span>
              <span className="text-success">{calendar.stats.activeCampaigns} active</span>
            </div>
          </div>
        )}

        {/* Quick create */}
        <div className="mb-10">
          <h2 className="mb-4 text-lg font-bold text-fg">{t('dashboard.quickCreate')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {APPS.map((app) => {
              const a = appText(app.id);
              return (
                <Link key={app.id} href={app.href}
                  className="group rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-1 hover:border-[#00b2fc]/40 hover:bg-surface">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'rgba(0,178,252,0.15)', color: 'var(--color-brand-accent)' }}>
                    <app.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-3 text-sm font-bold">{appTitle(app.id, a.title, locale)}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-fg-faint">{appDesc(app.id, a.description, locale)}</p>
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100" style={{ color: 'var(--color-brand-accent)' }}>
                    {t('dashboard.startNow')} <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent work */}
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">{t('dashboard.recentWork')}</h2>
            <Link href="/my-work" className="text-xs text-brand-accent hover:underline">{t('dashboard.viewAll')} →</Link>
          </div>
          {recent === null ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
          ) : recent.length === 0 ? (
            <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-hover py-12 text-center">
              <Film className="h-8 w-8 text-fg-placeholder" />
              <p className="text-sm text-fg-faint">{t('dashboard.noWork')}</p>
              <Link href="/lazynext-studio" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('dashboard.startNow')}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {recent.map((c) => {
                const url = Array.isArray(c.outputs) && typeof c.outputs[0] === 'string' ? c.outputs[0] : '';
                const title = c.prompt || t('myWork.untitled');
                return (
                  <Link key={c.id} href="/my-work" className="group overflow-hidden rounded-2xl border border-line bg-black/30">
                    <div className="relative aspect-[9/16] w-full">
                      {c.inputImage ? (
                        <img src={c.inputImage} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      ) : url ? (
                        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-3xl">🎬</div>
                      )}
                      {c.status === 'processing' && (
                        <div className="absolute inset-0 grid place-items-center bg-black/40"><Loader2 className="h-6 w-6 animate-spin" style={{ color: 'var(--color-brand-accent)' }} /></div>
                      )}
                      {c.status === 'completed' && url && (
                        <div className="absolute inset-0 grid place-items-center bg-black/20 opacity-0 transition group-hover:opacity-100"><div className="grid h-10 w-10 place-items-center rounded-full bg-black/60"><Play className="h-4 w-4 text-white" /></div></div>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-xs font-medium">{title}</div>
                      <div className="mt-0.5 text-[10px] text-fg-faint">{formatDateTime(c.createdAt, locale)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Assets summary */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-fg">{t('dashboard.yourAssets')}</h2>
            <Link href="/assets" className="text-xs text-brand-accent hover:underline">{t('dashboard.viewAll')} →</Link>
          </div>
          {counts === null ? (
            <div className="grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-fg-placeholder" /></div>
          ) : counts.products + counts.avatars + counts.brandKits === 0 ? (
            <div className="grid place-items-center gap-3 rounded-2xl border border-dashed border-line bg-hover py-12 text-center">
              <Boxes className="h-8 w-8 text-fg-placeholder" />
              <p className="text-sm text-fg-faint">{t('dashboard.noAssets')}</p>
              <Link href="/assets" className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: '#0064d9' }}>{t('nav.assets')}</Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <Link href="/assets" className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-[#00b2fc]/40">
                <div className="text-2xl font-bold text-fg">{counts.products}</div>
                <div className="mt-1 text-xs text-fg-faint">{t('nav.products')}</div>
              </Link>
              <Link href="/assets" className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-[#00b2fc]/40">
                <div className="text-2xl font-bold text-fg">{counts.avatars}</div>
                <div className="mt-1 text-xs text-fg-faint">{t('nav.avatars')}</div>
              </Link>
              <Link href="/assets" className="rounded-2xl border border-line bg-surface p-4 text-center transition hover:border-[#00b2fc]/40">
                <div className="text-2xl font-bold text-fg">{counts.brandKits}</div>
                <div className="mt-1 text-xs text-fg-faint">{t('nav.brandKits')}</div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
