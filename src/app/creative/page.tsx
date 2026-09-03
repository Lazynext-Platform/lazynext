import Link from 'next/link';
import type { Metadata } from 'next';
import {
  Sparkles, Film, Image as ImageIcon, Mic, Video, Drama, Clapperboard, Scissors,
  BarChart3, Target, TrendingUp, Shield, Calendar, Zap, Bot, FolderKanban,
  ArrowRight, Search, Wand2, Palette, Type, Music, Eye, Brain, Megaphone, Grid3x3,
} from 'lucide-react';
import { Card, Badge } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Creative Studio — Lazynext',
  description: 'Generate ads, scripts, and creative content with AI.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const CREATIVE_MODULES = [
  {
    category: 'Flagship Pipelines',
    items: [
      { href: '/creative/pipelines', label: 'All Pipelines', desc: 'End-to-end creative production workflows', icon: Zap },
      { href: '/creative-studio', label: 'Creative Studio', desc: 'Generate UGC product ads with AI', icon: Sparkles },
      { href: '/lazynext-studio', label: 'Lazynext Studio', desc: 'Multi-shot video generation', icon: Video },
      { href: '/drama-studio', label: 'Drama Studio', desc: 'AI drama ad generation', icon: Drama },
    ],
  },
  {
    category: 'Image & Visual',
    items: [
      { href: '/image-studio', label: 'Image Studio', desc: 'AI image generation and editing', icon: ImageIcon },
      { href: '/mood-board-generator', label: 'Mood Board Generator', desc: 'Visual mood boards from text', icon: Palette },
      { href: '/multi-concept', label: 'Multi-Concept Engine', desc: '6 concepts with distinct emotional triggers', icon: Brain },
      { href: '/reference-remix', label: 'Reference Remix', desc: 'Remix reference ads into new creatives', icon: Wand2 },
    ],
  },
  {
    category: 'Video & Editor',
    items: [
      { href: '/editor', label: 'Clip Editor', desc: 'Timeline-based video editing', icon: Scissors },
      { href: '/shot-planner', label: 'Shot Planner', desc: 'Plan shots from scripts', icon: Clapperboard },
      { href: '/scene-analysis', label: 'Scene Analysis', desc: 'Analyze video scenes', icon: Eye },
      { href: '/ugc-studio', label: 'UGC Studio', desc: 'User-generated content creation', icon: Film },
    ],
  },
  {
    category: 'Audio & Voice',
    items: [
      { href: '/audio-studio', label: 'Audio Studio', desc: 'TTS, voice generation, and mixing', icon: Mic },
      { href: '/narrative-studio', label: 'Narrative Studio', desc: 'AI-driven narrative generation', icon: Type },
    ],
  },
  {
    category: 'Briefs & Planning',
    items: [
      { href: '/product-brief', label: 'Product Brief', desc: 'URL to ad brief pipeline', icon: FolderKanban },
      { href: '/creative-brief-generator', label: 'Brief Generator', desc: 'Generate creative briefs', icon: Wand2 },
      { href: '/brief-analyzer', label: 'Brief Analyzer', desc: 'Analyze and score briefs', icon: BarChart3 },
      { href: '/concept-expander', label: 'Concept Expander', desc: 'Expand concepts into full plans', icon: Sparkles },
    ],
  },
  {
    category: 'Hooks & Scripts',
    items: [
      { href: '/hook-library', label: 'Hook Library', desc: 'Browse and manage ad hooks', icon: Type },
      { href: '/hook-tester', label: 'Hook Tester', desc: 'Test hooks for effectiveness', icon: Target },
      { href: '/creative-director', label: 'Creative Director', desc: 'Autonomous creative direction agent', icon: Bot },
      { href: '/creative-hook-matrix-generator', label: 'Hook Matrix', desc: 'Generate hook matrices', icon: Grid3x3 },
    ],
  },
  {
    category: 'Performance & Analytics',
    items: [
      { href: '/performance', label: 'Performance', desc: 'Creative performance tracking', icon: TrendingUp },
      { href: '/performance-loop', label: 'Performance Loop', desc: 'Feed performance back into briefs', icon: Zap },
      { href: '/viral-analyzer', label: 'Viral Analyzer', desc: 'Analyze virality scores', icon: TrendingUp },
      { href: '/quality-scoring', label: 'Quality Scoring', desc: 'Score creative quality', icon: BarChart3 },
    ],
  },
  {
    category: 'Brand & Compliance',
    items: [
      { href: '/brand-voice', label: 'Brand Voice', desc: 'Define and analyze brand voice', icon: Megaphone },
      { href: '/brand-guardrails', label: 'Brand Guardrails', desc: 'Check creatives against brand guidelines', icon: Shield },
      { href: '/brand-concepts', label: 'Brand Concepts', desc: 'Generate brand concept variations', icon: Palette },
      { href: '/compliance', label: 'Compliance', desc: 'Ad platform compliance checking', icon: Shield },
    ],
  },
  {
    category: 'Publishing & Distribution',
    items: [
      { href: '/publish', label: 'Publish', desc: 'Publish to connected platforms', icon: Megaphone },
      { href: '/smart-calendar', label: 'Smart Calendar', desc: 'AI-suggested posting schedule', icon: Calendar },
      { href: '/repurposing', label: 'Repurposing', desc: 'Repurpose content across platforms', icon: Zap },
      { href: '/google-safety', label: 'Google Ads Safety', desc: 'Google Ads safety layer', icon: Shield },
      { href: '/meta-safety', label: 'Meta Ads Safety', desc: 'Meta Ads safety layer', icon: Shield },
    ],
  },
  {
    category: 'Intelligence & Trends',
    items: [
      { href: '/trend-intelligence', label: 'Trend Intelligence', desc: 'Track creative trends', icon: TrendingUp },
      { href: '/trend-spotter', label: 'Trend Spotter', desc: 'Spot emerging trends', icon: Eye },
      { href: '/competitor-watch', label: 'Competitor Watch', desc: 'Monitor competitor ads', icon: Eye },
      { href: '/audience-insights', label: 'Audience Insights', desc: 'Understand your audience', icon: Target },
      { href: '/ml-insights', label: 'ML Insights', desc: 'Machine learning insights', icon: Brain },
    ],
  },
];

const ALL_GENERATORS = [
  // All the individual generator pages — accessible via /creative/generators
  '/creative-ad-anticipation-builder', '/creative-ad-belonging-appeal-designer',
  '/creative-ad-climax-architect', '/creative-ad-comparison-framework-designer',
  '/creative-ad-concept-synthesizer', '/creative-ad-curiosity-gap-designer',
  '/creative-ad-desire-amplifier-designer', '/creative-ad-empathy-bridge-designer',
  '/creative-ad-endowment-effect-designer', '/creative-ad-fab-framework-designer',
  '/creative-ad-foreshadowing-designer', '/creative-ad-format-innovator',
  '/creative-ad-framing-effect-designer', '/creative-ad-identity-alignment-designer',
  '/creative-ad-liking-affinity-designer', '/creative-ad-loss-aversion-framing-designer',
  '/creative-ad-metaphor-generator', '/creative-ad-micro-commitment-designer',
  '/creative-ad-micro-moment-designer', '/creative-ad-narrative-twist-designer',
  '/creative-ad-nostalgia-trigger-designer', '/creative-ad-offer-architecture-designer',
  '/creative-ad-pattern-interrupt-designer', '/creative-ad-persuasion-strategist',
  '/creative-ad-price-framing-designer', '/creative-ad-reciprocity-trigger-designer',
  '/creative-ad-resolution-designer', '/creative-ad-stakes-escalation-designer',
  '/creative-ad-surprise-element-designer', '/creative-ad-tension-release-strategist',
  '/creative-ad-tone-calibrator', '/creative-ad-transformation-arc-designer',
  '/creative-ad-urgency-catalyst-designer', '/creative-ad-value-ladder-designer',
  '/creative-ad-visual-hierarchy-strategist',
  // More generators
  '/creative-concept-expander-pro', '/creative-concept-validator', '/creative-diff',
  '/creative-fatigue-detector', '/creative-format-converter', '/creative-format-recommender',
  '/creative-hook-revamp-generator', '/creative-messaging-framework-builder',
  '/creative-performance-forecaster', '/creative-quality-scorer', '/creative-scene-generator',
  '/creative-sentiment-journey-mapper', '/creative-trend-adapter', '/creative-visual-hierarchy-analyzer',
  '/creative-hook-matrix-generator', '/creator-kits', '/fatigue', '/forecasting',
  '/inspiration', '/pipeline', '/personas', '/skill-chains', '/skills', '/templates',
  '/testing-lab', '/variant-matrix', '/variant-matrix-generator', '/budget-optimizer',
  '/campaign-orchestrator', '/competitor-intel', '/brief-intelligence', '/brief-template-builder',
  '/audience-persona-generator', '/brand-story-architect', '/brand-voice-analyzer',
  '/brand-voice-consistency-checker', '/calendar',
];

export default function CreativeHubPage() {
  const totalFeatures = CREATIVE_MODULES.reduce((sum, m) => sum + m.items.length, 0) + ALL_GENERATORS.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="flex h-12 w-12 items-center justify-center border-2"
            style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-accent)', color: 'var(--c-accent-fg)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard)' }}
          >
            <Sparkles className="h-6 w-6" />
          </span>
          <div>
            <h1 className="heading-display text-2xl">Creative Studio</h1>
            <p className="text-sm text-fg-secondary">
              {totalFeatures}+ creative tools · pipelines · generators · analytics
            </p>
          </div>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-4">
        <Link href="/creative/pipelines" className="block">
          <Card className="p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
            <Zap className="h-6 w-6 mb-2" />
            <p className="text-sm font-semibold">Pipelines</p>
            <p className="text-xs text-fg-muted">End-to-end workflows</p>
          </Card>
        </Link>
        <Link href="/creative/generators" className="block">
          <Card className="p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
            <Wand2 className="h-6 w-6 mb-2" />
            <p className="text-sm font-semibold">All Generators</p>
            <p className="text-xs text-fg-muted">{ALL_GENERATORS.length} tools</p>
          </Card>
        </Link>
        <Link href="/my-work" className="block">
          <Card className="p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
            <FolderKanban className="h-6 w-6 mb-2" />
            <p className="text-sm font-semibold">My Work</p>
            <p className="text-xs text-fg-muted">Your creations</p>
          </Card>
        </Link>
        <Link href="/assets" className="block">
          <Card className="p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
            <ImageIcon className="h-6 w-6 mb-2" />
            <p className="text-sm font-semibold">Assets</p>
            <p className="text-xs text-fg-muted">Media library</p>
          </Card>
        </Link>
      </div>

      {/* Categorized modules */}
      {CREATIVE_MODULES.map((module) => (
        <div key={module.category} className="mb-8">
          <h2 className="heading-display text-sm mb-4">{module.category}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {module.items.map((item) => (
              <Link key={item.href} href={item.href}>
                <Card className="p-4 h-full transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center border-2 shrink-0"
                      style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{item.label}</p>
                      <p className="text-xs text-fg-secondary line-clamp-2">{item.desc}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
