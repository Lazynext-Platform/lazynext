'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Megaphone, BarChart3, LayoutDashboard, Package, Scissors, Library, Lightbulb, Calendar, CalendarClock, Video, Wand2, ImageIcon, Send, BookOpen, Brain, Volume2, Eye, ShieldCheck, Wallet, Users, Workflow, Grid3x3, Activity, FileSearch, TrendingUp, FlaskConical, MessageSquareQuote, Award, Repeat, Users2, Flame, Film, Server, Clapperboard, Gift, Layers, Cpu, FileText, RefreshCw, Shield, GitBranch, Radar, PenLine, Anchor, FileSpreadsheet, ScrollText, UsersRound, LayoutGrid, GitMerge, FileSearch2, LayoutTemplate, Palette, Gauge, FlaskRound, TestTube, Compass, Mic, Type, Newspaper, Lightbulb as LightbulbIcon, Clock, BatteryLow, MousePointerClick, Expand, BookOpenCheck, Droplet, Hash, Clapperboard as ClapperboardIcon } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { LangToggle } from '@/components/LangToggle';
import { CreditBadge } from '@/components/CreditBadge';
import { HistoryButton } from '@/components/HistoryButton';

// All pages use the unified immersive dark shell with a single sticky header.
const LOCALE_RE = /^\/(en|zh|ja|es|ko|pt|fr|de|ar|hi|vi|th|id)(?=\/|$)/;

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/creative-director', label: 'Director', icon: Sparkles },
  { href: '/brief-intelligence', label: 'Brief IQ', icon: FileSearch, hideOnMd: true },
  { href: '/pipeline', label: 'Pipeline', icon: Workflow, hideOnMd: true },
  { href: '/ugc-studio', label: 'UGC Studio', icon: Video, hideOnMd: true },
  { href: '/ads', label: 'Ads', icon: Megaphone },
  { href: '/performance', label: 'Performance', icon: BarChart3 },
  { href: '/forecasting', label: 'Forecast', icon: TrendingUp, hideOnMd: true },
  { href: '/competitor-intel', label: 'Competitors', icon: Eye, hideOnMd: true },
  { href: '/personas', label: 'Personas', icon: Users, hideOnMd: true },
  { href: '/budget-optimizer', label: 'Budget', icon: Wallet, hideOnMd: true },
  { href: '/fatigue', label: 'Fatigue', icon: Activity, hideOnMd: true },
  { href: '/creative-assets', label: 'Assets', icon: Package },
  { href: '/editor', label: 'Editor', icon: Scissors },
  { href: '/skills', label: 'Skills', icon: Wand2, hideOnMd: true },
  { href: '/image-studio', label: 'Image Studio', icon: ImageIcon, hideOnMd: true },
  { href: '/audio-studio', label: 'Audio', icon: Volume2, hideOnMd: true },
  { href: '/narrative-studio', label: 'Narrative', icon: BookOpen, hideOnMd: true },
  { href: '/variant-matrix', label: 'Variants', icon: Grid3x3, hideOnMd: true },
  { href: '/testing-lab', label: 'Testing Lab', icon: FlaskConical, hideOnMd: true },
  { href: '/publish', label: 'Publish', icon: Send, hideOnMd: true },
  { href: '/ml-insights', label: 'ML Insights', icon: Brain, hideOnMd: true },
  { href: '/compliance', label: 'Compliance', icon: ShieldCheck, hideOnMd: true },
  { href: '/brand-voice', label: 'Brand Voice', icon: MessageSquareQuote, hideOnMd: true },
  { href: '/quality-scoring', label: 'Quality Score', icon: Award, hideOnMd: true },
  { href: '/repurposing', label: 'Repurpose', icon: Repeat, hideOnMd: true },
  { href: '/audience-insights', label: 'Audience IQ', icon: Users2, hideOnMd: true },
  { href: '/trend-intelligence', label: 'Trends', icon: Flame, hideOnMd: true },
  { href: '/scene-analysis', label: 'Scenes', icon: Film, hideOnMd: true },
  { href: '/shot-planner', label: 'Shot Plan', icon: Clapperboard, hideOnMd: true },
  { href: '/campaign-orchestrator', label: 'Campaigns', icon: Workflow, hideOnMd: true },
  { href: '/mcp-server', label: 'MCP', icon: Server, hideOnMd: true },
  { href: '/creator-kits', label: 'Creator Kits', icon: Gift, hideOnMd: true },
  { href: '/brand-concepts', label: 'Concepts', icon: Layers, hideOnMd: true },
  { href: '/clip-editor', label: 'Clip Edit', icon: Scissors, hideOnMd: true },
  { href: '/media-service-boundary', label: 'Media API', icon: Cpu, hideOnMd: true },
  { href: '/templates', label: 'Templates', icon: Library, hideOnMd: true },
  { href: '/inspiration', label: 'Inspiration', icon: Lightbulb, hideOnMd: true },
  { href: '/product-brief', label: 'Brief', icon: FileText, hideOnMd: true },
  { href: '/reference-remix', label: 'Remix', icon: RefreshCw, hideOnMd: true },
  { href: '/multi-concept', label: 'Concepts', icon: Lightbulb, hideOnMd: true },
  { href: '/meta-safety', label: 'Meta Safety', icon: Shield, hideOnMd: true },
  { href: '/google-safety', label: 'Google Safety', icon: Shield, hideOnMd: true },
  { href: '/performance-loop', label: 'Perf Loop', icon: TrendingUp, hideOnMd: true },
  { href: '/viral-analyzer', label: 'Viral', icon: Flame, hideOnMd: true },
  { href: '/skill-chains', label: 'Skill Chains', icon: GitBranch, hideOnMd: true },
  { href: '/competitor-watch', label: 'Competitor Watch', icon: Radar, hideOnMd: true },
  { href: '/hook-library', label: 'Hook Library', icon: Anchor, hideOnMd: true },
  { href: '/ad-copy-generator', label: 'Ad Copy', icon: PenLine, hideOnMd: true },
  { href: '/brand-guardrails', label: 'Guardrails', icon: Shield, hideOnMd: true },
  { href: '/smart-calendar', label: 'Smart Calendar', icon: CalendarClock, hideOnMd: true },
  { href: '/brief-template-builder', label: 'Brief Builder', icon: FileSpreadsheet, hideOnMd: true },
  { href: '/ad-script-writer', label: 'Script Writer', icon: ScrollText, hideOnMd: true },
  { href: '/audience-persona-generator', label: 'Personas', icon: UsersRound, hideOnMd: true },
  { href: '/variant-matrix-generator', label: 'Variant Matrix', icon: LayoutGrid, hideOnMd: true },
  { href: '/ad-concept-merger', label: 'Concept Merger', icon: GitMerge, hideOnMd: true },
  { href: '/brief-analyzer', label: 'Brief Analyzer', icon: FileSearch2, hideOnMd: true },
  { href: '/ad-format-optimizer', label: 'Format Optimizer', icon: LayoutTemplate, hideOnMd: true },
  { href: '/mood-board-generator', label: 'Mood Board', icon: Palette, hideOnMd: true },
  { href: '/ad-performance-predictor', label: 'Performance Predictor', icon: Gauge, hideOnMd: true },
  { href: '/ab-test-planner', label: 'A/B Test Planner', icon: FlaskRound, hideOnMd: true },
  { href: '/hook-tester', label: 'Hook Tester', icon: TestTube, hideOnMd: true },
  { href: '/trend-spotter', label: 'Trend Spotter', icon: Compass, hideOnMd: true },
  { href: '/brand-voice-analyzer', label: 'Voice Analyzer', icon: Mic, hideOnMd: true },
  { href: '/ad-caption-generator', label: 'Caption Gen', icon: Type, hideOnMd: true },
  { href: '/ad-headline-generator', label: 'Headline Gen', icon: Newspaper, hideOnMd: true },
  { href: '/angle-finder', label: 'Angle Finder', icon: LightbulbIcon, hideOnMd: true },
  { href: '/ad-timing-optimizer', label: 'Timing Optimizer', icon: Clock, hideOnMd: true },
  { href: '/creative-fatigue-detector', label: 'Fatigue Detector', icon: BatteryLow, hideOnMd: true },
  { href: '/ad-cta-optimizer', label: 'CTA Optimizer', icon: MousePointerClick, hideOnMd: true },
  { href: '/concept-expander', label: 'Concept Expander', icon: Expand, hideOnMd: true },
  { href: '/ad-story-generator', label: 'Story Generator', icon: BookOpenCheck, hideOnMd: true },
  { href: '/ad-color-palette-generator', label: 'Color Palette', icon: Droplet, hideOnMd: true },
  { href: '/ad-thumbnail-generator', label: 'Thumbnail Gen', icon: ImageIcon, hideOnMd: true },
  { href: '/ad-font-pairing-generator', label: 'Font Pairing', icon: Type, hideOnMd: true },
  { href: '/ad-hashtag-generator', label: 'Hashtag Gen', icon: Hash, hideOnMd: true },
  { href: '/creative-scene-generator', label: 'Scene Gen', icon: ClapperboardIcon, hideOnMd: true },
  { href: '/observability', label: 'Observability', icon: Activity, hideOnMd: true },
  { href: '/calendar', label: 'Calendar', icon: Calendar, hideOnMd: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const raw = usePathname() || '';
  const p = raw.replace(LOCALE_RE, '') || '/';

  return (
    <div className="min-h-screen bg-app text-fg">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Unified sticky header — single source of truth for top navigation.
          Left: logo + brand + primary nav links. Right: history, credits, language, user menu.
          Uses proper flexbox with min-w-0 and shrink-0 to prevent overlap at all viewport sizes. */}
      <header className="sticky top-0 z-50 border-b border-line bg-app/80 pt-safe backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-2 px-3 sm:px-4 md:gap-4">
          {/* Left group: logo + brand name + nav links */}
          <div className="flex min-w-0 items-center gap-2">
            <Link href="/" className="flex shrink-0 items-center gap-2 hover:opacity-80 transition">
              <img src="/lazynext-mark.png" alt="Lazynext" className="h-7 w-7 shrink-0 rounded-lg sm:h-8 sm:w-8" />
              <span className="hidden text-base font-bold tracking-tight sm:inline">Lazynext</span>
            </Link>
            {/* Primary nav links — hidden on very narrow screens, visible sm+.
                The nav uses overflow-x-auto with a flex-nowrap inner container so
                that the growing number of links never causes page-level horizontal
                overflow. The scrollbar is hidden for visual cleanliness. */}
            <nav aria-label="Primary" className="hidden md:block max-w-[calc(100vw-3rem)] overflow-x-auto scrollbar-hide">
              <div className="flex items-center gap-0.5 flex-nowrap">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon;
                const isActive = p === link.href || p.startsWith(link.href + '/');
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      'hideOnMd' in link && link.hideOnMd ? 'hidden lg:flex' : ''
                    } ${
                      isActive
                        ? 'bg-[#00b2fc]/15 text-[#00b2fc]'
                        : 'text-fg-faint hover:bg-hover hover:text-fg'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Link>
                );
              })}
              </div>
            </nav>
          </div>
          {/* Right group: toolbar items — nav is min-w-0 so it can shrink; items
              themselves are shrink-0 so they never compress each other. Toolbar
              gap tightens on narrow screens. */}
          <nav aria-label="Toolbar" className="flex min-w-0 items-center justify-end gap-1 sm:gap-1.5 md:gap-2">
            <HistoryButton />
            <CreditBadge />
            <LangToggle />
            <UserMenu />
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
