'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Wand2, ArrowRight } from 'lucide-react';
import { Card, Badge, Input } from '@/components/ui';

const GENERATORS = [
  // Persuasion / Psychology
  { href: '/creative-ad-anticipation-builder', label: 'Anticipation Builder', category: 'Persuasion' },
  { href: '/creative-ad-belonging-appeal-designer', label: 'Belonging Appeal Designer', category: 'Persuasion' },
  { href: '/creative-ad-climax-architect', label: 'Climax Architect', category: 'Persuasion' },
  { href: '/creative-ad-comparison-framework-designer', label: 'Comparison Framework', category: 'Persuasion' },
  { href: '/creative-ad-concept-synthesizer', label: 'Concept Synthesizer', category: 'Persuasion' },
  { href: '/creative-ad-curiosity-gap-designer', label: 'Curiosity Gap Designer', category: 'Persuasion' },
  { href: '/creative-ad-desire-amplifier-designer', label: 'Desire Amplifier', category: 'Persuasion' },
  { href: '/creative-ad-empathy-bridge-designer', label: 'Empathy Bridge Designer', category: 'Persuasion' },
  { href: '/creative-ad-endowment-effect-designer', label: 'Endowment Effect Designer', category: 'Persuasion' },
  { href: '/creative-ad-fab-framework-designer', label: 'FAB Framework Designer', category: 'Persuasion' },
  { href: '/creative-ad-foreshadowing-designer', label: 'Foreshadowing Designer', category: 'Persuasion' },
  { href: '/creative-ad-format-innovator', label: 'Format Innovator', category: 'Persuasion' },
  { href: '/creative-ad-framing-effect-designer', label: 'Framing Effect Designer', category: 'Persuasion' },
  { href: '/creative-ad-identity-alignment-designer', label: 'Identity Alignment Designer', category: 'Persuasion' },
  { href: '/creative-ad-liking-affinity-designer', label: 'Liking Affinity Designer', category: 'Persuasion' },
  { href: '/creative-ad-loss-aversion-framing-designer', label: 'Loss Aversion Framing', category: 'Persuasion' },
  { href: '/creative-ad-metaphor-generator', label: 'Metaphor Generator', category: 'Persuasion' },
  { href: '/creative-ad-micro-commitment-designer', label: 'Micro-Commitment Designer', category: 'Persuasion' },
  { href: '/creative-ad-micro-moment-designer', label: 'Micro-Moment Designer', category: 'Persuasion' },
  { href: '/creative-ad-narrative-twist-designer', label: 'Narrative Twist Designer', category: 'Persuasion' },
  { href: '/creative-ad-nostalgia-trigger-designer', label: 'Nostalgia Trigger Designer', category: 'Persuasion' },
  { href: '/creative-ad-offer-architecture-designer', label: 'Offer Architecture Designer', category: 'Persuasion' },
  { href: '/creative-ad-pattern-interrupt-designer', label: 'Pattern Interrupt Designer', category: 'Persuasion' },
  { href: '/creative-ad-persuasion-strategist', label: 'Persuasion Strategist', category: 'Persuasion' },
  { href: '/creative-ad-price-framing-designer', label: 'Price Framing Designer', category: 'Persuasion' },
  { href: '/creative-ad-reciprocity-trigger-designer', label: 'Reciprocity Trigger Designer', category: 'Persuasion' },
  { href: '/creative-ad-resolution-designer', label: 'Resolution Designer', category: 'Persuasion' },
  { href: '/creative-ad-stakes-escalation-designer', label: 'Stakes Escalation Designer', category: 'Persuasion' },
  { href: '/creative-ad-surprise-element-designer', label: 'Surprise Element Designer', category: 'Persuasion' },
  { href: '/creative-ad-tension-release-strategist', label: 'Tension Release Strategist', category: 'Persuasion' },
  { href: '/creative-ad-tone-calibrator', label: 'Tone Calibrator', category: 'Persuasion' },
  { href: '/creative-ad-transformation-arc-designer', label: 'Transformation Arc Designer', category: 'Persuasion' },
  { href: '/creative-ad-urgency-catalyst-designer', label: 'Urgency Catalyst Designer', category: 'Persuasion' },
  { href: '/creative-ad-value-ladder-designer', label: 'Value Ladder Designer', category: 'Persuasion' },
  { href: '/creative-ad-visual-hierarchy-strategist', label: 'Visual Hierarchy Strategist', category: 'Persuasion' },

  // Creative Tools
  { href: '/creative-concept-expander-pro', label: 'Concept Expander Pro', category: 'Creative Tools' },
  { href: '/creative-concept-validator', label: 'Concept Validator', category: 'Creative Tools' },
  { href: '/creative-diff', label: 'Creative Diff', category: 'Creative Tools' },
  { href: '/creative-fatigue-detector', label: 'Fatigue Detector', category: 'Creative Tools' },
  { href: '/creative-format-converter', label: 'Format Converter', category: 'Creative Tools' },
  { href: '/creative-format-recommender', label: 'Format Recommender', category: 'Creative Tools' },
  { href: '/creative-hook-revamp-generator', label: 'Hook Revamp Generator', category: 'Creative Tools' },
  { href: '/creative-messaging-framework-builder', label: 'Messaging Framework Builder', category: 'Creative Tools' },
  { href: '/creative-performance-forecaster', label: 'Performance Forecaster', category: 'Creative Tools' },
  { href: '/creative-quality-scorer', label: 'Quality Scorer', category: 'Creative Tools' },
  { href: '/creative-scene-generator', label: 'Scene Generator', category: 'Creative Tools' },
  { href: '/creative-sentiment-journey-mapper', label: 'Sentiment Journey Mapper', category: 'Creative Tools' },
  { href: '/creative-trend-adapter', label: 'Trend Adapter', category: 'Creative Tools' },
  { href: '/creative-visual-hierarchy-analyzer', label: 'Visual Hierarchy Analyzer', category: 'Creative Tools' },
  { href: '/creative-hook-matrix-generator', label: 'Hook Matrix Generator', category: 'Creative Tools' },

  // Planning & Strategy
  { href: '/product-brief', label: 'Product Brief', category: 'Planning' },
  { href: '/creative-brief-generator', label: 'Brief Generator', category: 'Planning' },
  { href: '/brief-analyzer', label: 'Brief Analyzer', category: 'Planning' },
  { href: '/brief-intelligence', label: 'Brief Intelligence', category: 'Planning' },
  { href: '/brief-template-builder', label: 'Brief Template Builder', category: 'Planning' },
  { href: '/concept-expander', label: 'Concept Expander', category: 'Planning' },
  { href: '/budget-optimizer', label: 'Budget Optimizer', category: 'Planning' },
  { href: '/campaign-orchestrator', label: 'Campaign Orchestrator', category: 'Planning' },
  { href: '/competitor-intel', label: 'Competitor Intel', category: 'Planning' },
  { href: '/competitor-watch', label: 'Competitor Watch', category: 'Planning' },
  { href: '/audience-persona-generator', label: 'Audience Persona Generator', category: 'Planning' },
  { href: '/audience-insights', label: 'Audience Insights', category: 'Planning' },
  { href: '/personas', label: 'Personas', category: 'Planning' },

  // Brand
  { href: '/brand-voice', label: 'Brand Voice', category: 'Brand' },
  { href: '/brand-voice-analyzer', label: 'Brand Voice Analyzer', category: 'Brand' },
  { href: '/brand-voice-consistency-checker', label: 'Brand Voice Consistency Checker', category: 'Brand' },
  { href: '/brand-guardrails', label: 'Brand Guardrails', category: 'Brand' },
  { href: '/brand-concepts', label: 'Brand Concepts', category: 'Brand' },
  { href: '/brand-story-architect', label: 'Brand Story Architect', category: 'Brand' },

  // Performance
  { href: '/performance', label: 'Performance', category: 'Performance' },
  { href: '/performance-loop', label: 'Performance Loop', category: 'Performance' },
  { href: '/fatigue', label: 'Fatigue', category: 'Performance' },
  { href: '/forecasting', label: 'Forecasting', category: 'Performance' },
  { href: '/viral-analyzer', label: 'Viral Analyzer', category: 'Performance' },
  { href: '/quality-scoring', label: 'Quality Scoring', category: 'Performance' },
  { href: '/ml-insights', label: 'ML Insights', category: 'Performance' },
  { href: '/testing-lab', label: 'Testing Lab', category: 'Performance' },
  { href: '/variant-matrix', label: 'Variant Matrix', category: 'Performance' },
  { href: '/variant-matrix-generator', label: 'Variant Matrix Generator', category: 'Performance' },

  // Trends & Intelligence
  { href: '/trend-intelligence', label: 'Trend Intelligence', category: 'Intelligence' },
  { href: '/trend-spotter', label: 'Trend Spotter', category: 'Intelligence' },
  { href: '/inspiration', label: 'Inspiration', category: 'Intelligence' },
  { href: '/hook-library', label: 'Hook Library', category: 'Intelligence' },
  { href: '/hook-tester', label: 'Hook Tester', category: 'Intelligence' },

  // Distribution
  { href: '/publish', label: 'Publish', category: 'Distribution' },
  { href: '/smart-calendar', label: 'Smart Calendar', category: 'Distribution' },
  { href: '/repurposing', label: 'Repurposing', category: 'Distribution' },
  { href: '/calendar', label: 'Calendar', category: 'Distribution' },
  { href: '/google-safety', label: 'Google Ads Safety', category: 'Distribution' },
  { href: '/meta-safety', label: 'Meta Ads Safety', category: 'Distribution' },

  // Creative Assets
  { href: '/creator-kits', label: 'Creator Kits', category: 'Assets' },
  { href: '/templates', label: 'Templates', category: 'Assets' },
  { href: '/mood-board-generator', label: 'Mood Board Generator', category: 'Assets' },
  { href: '/assets', label: 'Asset Library', category: 'Assets' },

  // Skills & Automation
  { href: '/skills', label: 'Skills', category: 'Automation' },
  { href: '/skill-chains', label: 'Skill Chains', category: 'Automation' },
  { href: '/pipeline', label: 'Pipeline Builder', category: 'Automation' },
  { href: '/creative-director', label: 'Creative Director Agent', category: 'Automation' },
];

const CATEGORIES = [...new Set(GENERATORS.map((g) => g.category))];

export default function GeneratorsPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return GENERATORS.filter((g) => {
      const matchesQuery = !query || g.label.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !activeCategory || g.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="heading-display text-2xl">All Generators</h1>
        <p className="text-sm text-fg-secondary mt-1">
          {GENERATORS.length} creative tools across {CATEGORIES.length} categories
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search generators..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className="px-3 py-1.5 text-xs font-mono border-2 transition-colors"
          style={{
            borderColor: 'var(--c-ink)',
            backgroundColor: !activeCategory ? 'var(--c-ink)' : 'var(--c-surface)',
            color: !activeCategory ? 'var(--c-surface)' : 'var(--c-fg)',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          ALL ({GENERATORS.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = GENERATORS.filter((g) => g.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1.5 text-xs font-mono border-2 transition-colors"
              style={{
                borderColor: 'var(--c-ink)',
                backgroundColor: isActive ? 'var(--c-ink)' : 'var(--c-surface)',
                color: isActive ? 'var(--c-surface)' : 'var(--c-fg)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              {cat.toUpperCase()} ({count})
            </button>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Search className="h-8 w-8 mx-auto mb-3 text-fg-muted" />
          <p className="text-sm text-fg-secondary">No generators found for &ldquo;{query}&rdquo;</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((gen) => (
            <Link key={gen.href} href={gen.href}>
              <Card className="p-4 flex items-center gap-3 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
                <div
                  className="flex h-8 w-8 items-center justify-center border-2 shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  <Wand2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{gen.label}</p>
                  <p className="text-xs text-fg-muted">{gen.category}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-fg-muted shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
