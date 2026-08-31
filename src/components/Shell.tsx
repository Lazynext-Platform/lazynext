'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, Megaphone, BarChart3, LayoutDashboard, Package, Scissors, Library, Lightbulb, Calendar, CalendarClock, Video, Wand2, ImageIcon, Send, BookOpen, Brain, Volume2, Eye, ShieldCheck, Wallet, Users, Workflow, Grid3x3, Activity, FileSearch, TrendingUp, FlaskConical, MessageSquareQuote, Award, Repeat, Users2, Flame, Film, Server, Clapperboard, Gift, Layers, Cpu, FileText, RefreshCw, Shield, GitBranch, Radar, PenLine, Anchor, FileSpreadsheet, ScrollText, UsersRound, LayoutGrid, GitMerge, FileSearch2, LayoutTemplate, Palette, Gauge, FlaskRound, TestTube, Compass, Mic, Type, Newspaper, Lightbulb as LightbulbIcon, Clock, BatteryLow, MousePointerClick, Expand, BookOpenCheck, Droplet, Hash, Clapperboard as ClapperboardIcon, Music, Mic2, FileText as FileTextIcon, Target, FlaskConical as FlaskIcon, Zap, Users as UsersIcon, ShieldCheck as ShieldIcon, HeartPulse, Repeat2, DollarSign, TrendingUp as TrendingIcon, ListOrdered, BookMarked, Globe2, LineChart, Smile, Grid2x2, RefreshCcw, MicVocal, Layers3, Swords, Radio, LayoutList, LifeBuoy, Split, AlertTriangle, SlidersHorizontal, Shuffle, Waves, Contrast, HelpCircle, Drum, Layout, AudioLines } from 'lucide-react';
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
  { href: '/ad-music-mood-matcher', label: 'Music Matcher', icon: Music, hideOnMd: true },
  { href: '/ad-voiceover-script-generator', label: 'Voiceover Gen', icon: Mic2, hideOnMd: true },
  { href: '/creative-brief-generator', label: 'Brief Gen', icon: FileTextIcon, hideOnMd: true },
  { href: '/ad-placement-strategist', label: 'Placement Strategy', icon: Target, hideOnMd: true },
  { href: '/ad-ab-test-name-generator', label: 'A/B Test Names', icon: FlaskIcon, hideOnMd: true },
  { href: '/creative-hook-revamp-generator', label: 'Hook Revamp', icon: Zap, hideOnMd: true },
  { href: '/ad-audience-segment-builder', label: 'Segment Builder', icon: UsersIcon, hideOnMd: true },
  { href: '/creative-concept-validator', label: 'Concept Validator', icon: ShieldIcon, hideOnMd: true },
  { href: '/ad-emotion-analyzer', label: 'Emotion Analyzer', icon: HeartPulse, hideOnMd: true },
  { href: '/creative-format-converter', label: 'Format Converter', icon: Repeat2, hideOnMd: true },
  { href: '/ad-budget-allocator', label: 'Budget Allocator', icon: DollarSign, hideOnMd: true },
  { href: '/creative-trend-adapter', label: 'Trend Adapter', icon: TrendingIcon, hideOnMd: true },
  { href: '/ad-creative-sequencer', label: 'Creative Sequencer', icon: ListOrdered, hideOnMd: true },
  { href: '/brand-story-architect', label: 'Story Architect', icon: BookMarked, hideOnMd: true },
  { href: '/ad-localization-adapter', label: 'Localization Adapter', icon: Globe2, hideOnMd: true },
  { href: '/creative-performance-forecaster', label: 'Performance Forecaster', icon: LineChart, hideOnMd: true },
  { href: '/ad-sentiment-tuner', label: 'Sentiment Tuner', icon: Smile, hideOnMd: true },
  { href: '/creative-hook-matrix-generator', label: 'Hook Matrix', icon: Grid2x2, hideOnMd: true },
  { href: '/ad-creative-rotator', label: 'Creative Rotator', icon: RefreshCcw, hideOnMd: true },
  { href: '/brand-voice-consistency-checker', label: 'Voice Checker', icon: MicVocal, hideOnMd: true },
  { href: '/ad-persona-matcher', label: 'Persona Matcher', icon: Users2, hideOnMd: true },
  { href: '/creative-concept-expander-pro', label: 'Concept Expander Pro', icon: Layers3, hideOnMd: true },
  { href: '/ad-competitive-intelligence', label: 'Competitive Intel', icon: Swords, hideOnMd: true },
  { href: '/creative-quality-scorer', label: 'Quality Scorer', icon: Gauge, hideOnMd: true },
  { href: '/ad-audience-resonance-predictor', label: 'Resonance Predictor', icon: Radio, hideOnMd: true },
  { href: '/creative-format-recommender', label: 'Format Recommender', icon: LayoutList, hideOnMd: true },
  { href: '/ad-creative-lifecycle-manager', label: 'Lifecycle Manager', icon: LifeBuoy, hideOnMd: true },
  { href: '/creative-sentiment-journey-mapper', label: 'Sentiment Journey', icon: HeartPulse, hideOnMd: true },
  { href: '/ad-creative-ab-test-simulator', label: 'A/B Test Simulator', icon: Split, hideOnMd: true },
  { href: '/creative-visual-hierarchy-analyzer', label: 'Visual Hierarchy', icon: Eye, hideOnMd: true },
  { href: '/ad-audience-pain-point-mapper', label: 'Pain Point Mapper', icon: AlertTriangle, hideOnMd: true },
  { href: '/creative-messaging-framework-builder', label: 'Messaging Framework', icon: MessageSquareQuote, hideOnMd: true },
  { href: '/ad-creative-burnout-detector', label: 'Burnout Detector', icon: Flame, hideOnMd: true },
  { href: '/creative-ad-concept-synthesizer', label: 'Concept Synthesizer', icon: GitMerge, hideOnMd: true },
  { href: '/ad-audience-psychographic-profiler', label: 'Psychographic Profiler', icon: Brain, hideOnMd: true },
  { href: '/creative-ad-tone-calibrator', label: 'Tone Calibrator', icon: SlidersHorizontal, hideOnMd: true },
  { href: '/creative-ad-format-innovator', label: 'Format Innovator', icon: Sparkles, hideOnMd: true },
  { href: '/ad-creative-story-arc-designer', label: 'Story Arc Designer', icon: Lightbulb, hideOnMd: true },
  { href: '/creative-ad-persuasion-strategist', label: 'Persuasion Strategist', icon: Zap, hideOnMd: true },
  { href: '/ad-creative-hook-timing-optimizer', label: 'Hook Timing Optimizer', icon: Clock, hideOnMd: true },
  { href: '/creative-ad-metaphor-generator', label: 'Metaphor Generator', icon: Wand2, hideOnMd: true },
  { href: '/ad-creative-sensory-enhancer', label: 'Sensory Enhancer', icon: Eye, hideOnMd: true },
  { href: '/creative-ad-pattern-interrupt-designer', label: 'Pattern Interrupt', icon: Zap, hideOnMd: true },
  { href: '/ad-creative-social-proof-architect', label: 'Social Proof Architect', icon: Award, hideOnMd: true },
  { href: '/creative-ad-anticipation-builder', label: 'Anticipation Builder', icon: Flame, hideOnMd: true },
  { href: '/ad-creative-contrast-amplifier', label: 'Contrast Amplifier', icon: GitMerge, hideOnMd: true },
  { href: '/creative-ad-micro-moment-designer', label: 'Micro-Moment Designer', icon: Zap, hideOnMd: true },
  { href: '/ad-creative-emotion-sequencer', label: 'Emotion Sequencer', icon: HeartPulse, hideOnMd: true },
  { href: '/creative-ad-narrative-twist-designer', label: 'Narrative Twist Designer', icon: Shuffle, hideOnMd: true },
  { href: '/ad-creative-memory-anchor-builder', label: 'Memory Anchor Builder', icon: Anchor, hideOnMd: true },
  { href: '/creative-ad-tension-release-strategist', label: 'Tension Release Strategist', icon: Waves, hideOnMd: true },
  { href: '/ad-creative-sensory-contrast-designer', label: 'Sensory Contrast Designer', icon: Contrast, hideOnMd: true },
  { href: '/creative-ad-curiosity-gap-designer', label: 'Curiosity Gap Designer', icon: HelpCircle, hideOnMd: true },
  { href: '/ad-creative-rhythm-pacing-optimizer', label: 'Rhythm Pacing Optimizer', icon: Drum, hideOnMd: true },
  { href: '/creative-ad-visual-hierarchy-strategist', label: 'Visual Hierarchy Strategist', icon: Layout, hideOnMd: true },
  { href: '/ad-creative-sound-design-strategist', label: 'Sound Design Strategist', icon: AudioLines, hideOnMd: true },
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
