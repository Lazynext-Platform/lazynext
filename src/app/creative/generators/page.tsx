'use client';

import { useState, useMemo } from 'react';
import { Search, Wand2, ArrowRight, X, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { Card, Badge, Input, Button, Textarea } from '@/components/ui';

const GENERATORS = [
  // Persuasion / Psychology
  { api: '/api/creative/creative-ad-anticipation-builder', label: 'Anticipation Builder', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-belonging-appeal-designer', label: 'Belonging Appeal Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-climax-architect', label: 'Climax Architect', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-comparison-framework-designer', label: 'Comparison Framework', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-concept-synthesizer', label: 'Concept Synthesizer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-curiosity-gap-designer', label: 'Curiosity Gap Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-desire-amplifier-designer', label: 'Desire Amplifier', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-empathy-bridge-designer', label: 'Empathy Bridge Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-endowment-effect-designer', label: 'Endowment Effect Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-fab-framework-designer', label: 'FAB Framework Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-foreshadowing-designer', label: 'Foreshadowing Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-format-innovator', label: 'Format Innovator', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-framing-effect-designer', label: 'Framing Effect Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-identity-alignment-designer', label: 'Identity Alignment Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-liking-affinity-designer', label: 'Liking Affinity Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-loss-aversion-framing-designer', label: 'Loss Aversion Framing', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-metaphor-generator', label: 'Metaphor Generator', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-micro-commitment-designer', label: 'Micro-Commitment Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-micro-moment-designer', label: 'Micro-Moment Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-narrative-twist-designer', label: 'Narrative Twist Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-nostalgia-trigger-designer', label: 'Nostalgia Trigger Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-offer-architecture-designer', label: 'Offer Architecture Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-pattern-interrupt-designer', label: 'Pattern Interrupt Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-persuasion-strategist', label: 'Persuasion Strategist', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-price-framing-designer', label: 'Price Framing Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-reciprocity-trigger-designer', label: 'Reciprocity Trigger Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-resolution-designer', label: 'Resolution Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-stakes-escalation-designer', label: 'Stakes Escalation Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-surprise-element-designer', label: 'Surprise Element Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-tension-release-strategist', label: 'Tension Release Strategist', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-tone-calibrator', label: 'Tone Calibrator', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-transformation-arc-designer', label: 'Transformation Arc Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-urgency-catalyst-designer', label: 'Urgency Catalyst Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-value-ladder-designer', label: 'Value Ladder Designer', category: 'Persuasion' },
  { api: '/api/creative/creative-ad-visual-hierarchy-strategist', label: 'Visual Hierarchy Strategist', category: 'Persuasion' },
  // Copy / Writing
  { api: '/api/creative/ad-copy-generator', label: 'Ad Copy Generator', category: 'Copy' },
  { api: '/api/creative/ad-caption-generator', label: 'Caption Generator', category: 'Copy' },
  { api: '/api/creative/ad-headline-generator', label: 'Headline Generator', category: 'Copy' },
  { api: '/api/creative/ad-script-writer', label: 'Script Writer', category: 'Copy' },
  { api: '/api/creative/ad-story-generator', label: 'Story Generator', category: 'Copy' },
  { api: '/api/creative/ad-voiceover-script-generator', label: 'Voiceover Script Generator', category: 'Copy' },
  { api: '/api/creative/creative-brief-generator', label: 'Brief Generator', category: 'Copy' },
  { api: '/api/creative/creative-hook-matrix-generator', label: 'Hook Matrix Generator', category: 'Copy' },
  { api: '/api/creative/creative-hook-revamp-generator', label: 'Hook Revamp Generator', category: 'Copy' },
  { api: '/api/creative/creative-messaging-framework-builder', label: 'Messaging Framework Builder', category: 'Copy' },
  // Visual / Design
  { api: '/api/creative/ad-color-palette-generator', label: 'Color Palette Generator', category: 'Visual' },
  { api: '/api/creative/ad-font-pairing-generator', label: 'Font Pairing Generator', category: 'Visual' },
  { api: '/api/creative/ad-thumbnail-generator', label: 'Thumbnail Generator', category: 'Visual' },
  // Analysis
  { api: '/api/creative/ad-emotion-analyzer', label: 'Emotion Analyzer', category: 'Analysis' },
  { api: '/api/creative/ad-audience-segment-builder', label: 'Audience Segment Builder', category: 'Analysis' },
  { api: '/api/creative/ad-persona-matcher', label: 'Persona Matcher', category: 'Analysis' },
  { api: '/api/creative/ad-competitive-intelligence', label: 'Competitive Intelligence', category: 'Analysis' },
  { api: '/api/creative/creative-quality-scorer', label: 'Quality Scorer', category: 'Analysis' },
  { api: '/api/creative/creative-sentiment-journey-mapper', label: 'Sentiment Journey Mapper', category: 'Analysis' },
  { api: '/api/creative/creative-concept-validator', label: 'Concept Validator', category: 'Analysis' },
  { api: '/api/creative/creative-diff', label: 'Creative Diff', category: 'Analysis' },
  // Social / Engagement
  { api: '/api/creative/ad-hashtag-generator', label: 'Hashtag Generator', category: 'Social' },
  { api: '/api/creative/ad-cta-optimizer', label: 'CTA Optimizer', category: 'Social' },
  { api: '/api/creative/ad-creative-social-proof-architect', label: 'Social Proof Architect', category: 'Social' },
  { api: '/api/creative/ad-creative-hook-timing-optimizer', label: 'Hook Timing Optimizer', category: 'Social' },
  // Localization / Adaptation
  { api: '/api/creative/ad-localization-adapter', label: 'Localization Adapter', category: 'Localization' },
  { api: '/api/creative/ad-concept-merger', label: 'Concept Merger', category: 'Localization' },
  { api: '/api/creative/creative-concept-expander-pro', label: 'Concept Expander Pro', category: 'Localization' },
  // Audio / Music
  { api: '/api/creative/ad-music-mood-matcher', label: 'Music Mood Matcher', category: 'Audio' },
  { api: '/api/creative/ad-creative-sound-design-strategist', label: 'Sound Design Strategist', category: 'Audio' },
  // Testing / Optimization
  { api: '/api/creative/ad-ab-test-name-generator', label: 'AB Test Name Generator', category: 'Testing' },
  { api: '/api/creative/ad-creative-ab-test-simulator', label: 'AB Test Simulator', category: 'Testing' },
  { api: '/api/creative/creative-ad-persuasion-strategist', label: 'Persuasion Strategist', category: 'Testing' },
];

const CATEGORIES = [...new Set(GENERATORS.map((g) => g.category))];

interface GeneratorResult {
  [key: string]: unknown;
}

export default function GeneratorsPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedGen, setSelectedGen] = useState<typeof GENERATORS[0] | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<GeneratorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    return GENERATORS.filter((g) => {
      const matchesQuery = !query || g.label.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = !activeCategory || g.category === activeCategory;
      return matchesQuery && matchesCategory;
    });
  }, [query, activeCategory]);

  async function runGenerator() {
    if (!selectedGen || !input.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      // Most creative APIs accept a JSON body with a "source" or "prompt" or "input" field.
      // We send a generic body that works with most generators.
      const body: Record<string, unknown> = { source: input.trim(), prompt: input.trim(), input: input.trim() };
      const res = await fetch(selectedGen.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error === 'insufficient_credits'
          ? 'Insufficient credits. Buy more in Settings → Billing.'
          : data.error || `Request failed (${res.status})`);
      }
      setResult(data.result || data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }

  function copyResult() {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function closePanel() {
    setSelectedGen(null);
    setResult(null);
    setError('');
    setInput('');
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl">Creative Generators</h1>
        <p className="text-sm text-fg-secondary mt-1">
          {GENERATORS.length} AI-powered generators · Click any generator to run it
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search generators..."
            className="pl-10"
          />
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setActiveCategory(null)}
          className="px-3 py-1 text-xs border-2 transition"
          style={{
            borderColor: 'var(--c-ink)',
            borderRadius: 'var(--radius-sm)',
            background: !activeCategory ? 'var(--c-ink)' : 'var(--c-surface)',
            color: !activeCategory ? 'var(--c-surface)' : 'var(--c-fg)',
          }}
        >
          All ({GENERATORS.length})
        </button>
        {CATEGORIES.map((cat) => {
          const count = GENERATORS.filter((g) => g.category === cat).length;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-3 py-1 text-xs border-2 transition"
              style={{
                borderColor: 'var(--c-ink)',
                borderRadius: 'var(--radius-sm)',
                background: isActive ? 'var(--c-ink)' : 'var(--c-surface)',
                color: isActive ? 'var(--c-surface)' : 'var(--c-fg)',
              }}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Generator grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((gen) => (
          <button
            key={gen.api}
            onClick={() => {
              setSelectedGen(gen);
              setResult(null);
              setError('');
              setInput('');
            }}
            className="text-left"
          >
            <Card className="p-4 transition-all hover:translate-x-[2px] hover:translate-y-[2px]">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center border-2 shrink-0"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  <Wand2 className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{gen.label}</p>
                  <p className="text-xs text-fg-muted truncate font-mono mt-1">{gen.api}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-fg-muted shrink-0" />
              </div>
            </Card>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-fg-muted">No generators found for &ldquo;{query}&rdquo;</p>
        </div>
      )}

      {/* Generator panel (slide-in) */}
      {selectedGen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={closePanel}
          />
          <div
            className="relative w-full max-w-lg h-full bg-surface border-l-2 overflow-y-auto"
            style={{ borderColor: 'var(--c-ink)', boxShadow: 'var(--shadow-hard-lg)' }}
          >
            {/* Panel header */}
            <div
              className="sticky top-0 flex items-center justify-between px-4 py-3 border-b-2 bg-surface z-10"
              style={{ borderColor: 'var(--c-ink)' }}
            >
              <div className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                <div>
                  <h2 className="heading-display text-sm">{selectedGen.label}</h2>
                  <p className="text-xs text-fg-muted font-mono">{selectedGen.api}</p>
                </div>
              </div>
              <button onClick={closePanel} className="p-1 hover:bg-hover rounded transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Panel body */}
            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="label-mono block mb-2">Input</label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe your product, paste a URL, or enter your creative brief..."
                  rows={6}
                  autoFocus
                />
                <p className="text-xs text-fg-muted mt-1">
                  Most generators accept a product description, URL, or creative brief.
                </p>
              </div>

              <Button
                onClick={runGenerator}
                disabled={loading || !input.trim()}
                className="w-full"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate</>
                )}
              </Button>

              {error && (
                <div
                  className="p-3 border-2 text-sm"
                  style={{ borderColor: 'var(--c-danger)', borderRadius: 'var(--radius-sm)', color: 'var(--c-danger)' }}
                >
                  <AlertCircle className="h-4 w-4 inline mr-2" />{error}
                </div>
              )}

              {result && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label-mono">Result</label>
                    <button
                      onClick={copyResult}
                      className="text-xs flex items-center gap-1 text-fg-secondary hover:text-fg transition-colors"
                    >
                      {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                    </button>
                  </div>
                  <pre
                    className="p-4 border-2 overflow-x-auto text-xs font-mono max-h-96"
                    style={{
                      borderColor: 'var(--c-ink)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--c-surface-alt)',
                    }}
                  >
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
