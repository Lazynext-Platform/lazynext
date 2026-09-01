/**
 * Navigation categories for the LazyNext platform.
 *
 * Replaces the flat 181-link nav and 159-tile dashboard with a categorized,
 * searchable navigation model.
 *
 * Used by:
 * - src/components/Shell.tsx (primary nav with dropdowns)
 * - src/app/dashboard/page.tsx (categorized dashboard with search)
 *
 * Each app is identified by its route slug (matching the page directory name).
 * Icons are mapped in the consuming components to avoid importing all of
 * lucide-react in this config file.
 */

export interface NavApp {
  /** Route slug — matches the page directory name under src/app/ */
  slug: string;
  /** Full href path */
  href: string;
  /** i18n key suffix for the title (e.g., 'adCopyGenerator.title') */
  titleKey?: string;
  /** Whether this is a flagship/premium app */
  flagship?: boolean;
}

export interface NavCategory {
  /** Category ID for i18n */
  id: string;
  /** Display label (fallback if i18n key not found) */
  label: string;
  /** Lucide icon name for the category */
  icon: string;
  /** Apps in this category */
  apps: NavApp[];
}

export const NAV_CATEGORIES: NavCategory[] = [
  {
    id: 'flagship',
    label: 'Flagship Studios',
    icon: 'Sparkles',
    apps: [
      { slug: 'lazynext-studio', href: '/lazynext-studio', flagship: true },
      { slug: 'ad-reference', href: '/ad-reference', flagship: true },
      { slug: 'drama-studio', href: '/drama-studio', flagship: true },
      { slug: 'ad-skit', href: '/ad-skit', flagship: true },
    ],
  },
  {
    id: 'creative-strategy',
    label: 'Creative Strategy',
    icon: 'Lightbulb',
    apps: [
      { slug: 'creative-studio', href: '/creative-studio' },
      { slug: 'creative-director', href: '/creative-director' },
      { slug: 'product-brief', href: '/product-brief' },
      { slug: 'reference-remix', href: '/reference-remix' },
      { slug: 'multi-concept', href: '/multi-concept' },
      { slug: 'brief-intelligence', href: '/brief-intelligence' },
      { slug: 'brief-analyzer', href: '/brief-analyzer' },
      { slug: 'brief-template-builder', href: '/brief-template-builder' },
      { slug: 'concept-expander', href: '/concept-expander' },
      { slug: 'creative-concept-expander-pro', href: '/creative-concept-expander-pro' },
      { slug: 'ad-concept-merger', href: '/ad-concept-merger' },
      { slug: 'creative-concept-validator', href: '/creative-concept-validator' },
    ],
  },
  {
    id: 'copy-messaging',
    label: 'Copy & Messaging',
    icon: 'PenLine',
    apps: [
      { slug: 'ad-copy-generator', href: '/ad-copy-generator' },
      { slug: 'ad-headline-generator', href: '/ad-headline-generator' },
      { slug: 'ad-caption-generator', href: '/ad-caption-generator' },
      { slug: 'ad-cta-optimizer', href: '/ad-cta-optimizer' },
      { slug: 'ad-script-writer', href: '/ad-script-writer' },
      { slug: 'ad-story-generator', href: '/ad-story-generator' },
      { slug: 'ad-voiceover-script-generator', href: '/ad-voiceover-script-generator' },
      { slug: 'ad-hashtag-generator', href: '/ad-hashtag-generator' },
      { slug: 'hook-library', href: '/hook-library' },
      { slug: 'hook-tester', href: '/hook-tester' },
      { slug: 'creative-hook-revamp-generator', href: '/creative-hook-revamp-generator' },
      { slug: 'creative-hook-matrix-generator', href: '/creative-hook-matrix-generator' },
      { slug: 'angle-finder', href: '/angle-finder' },
      { slug: 'creative-brief-generator', href: '/creative-brief-generator' },
      { slug: 'creative-messaging-framework-builder', href: '/creative-messaging-framework-builder' },
      { slug: 'ad-creative-pas-framework-designer', href: '/ad-creative-pas-framework-designer' },
      { slug: 'ad-creative-bab-framework-designer', href: '/ad-creative-bab-framework-designer' },
      { slug: 'creative-ad-fab-framework-designer', href: '/creative-ad-fab-framework-designer' },
      { slug: 'ad-creative-demonstration-framework-designer', href: '/ad-creative-demonstration-framework-designer' },
      { slug: 'creative-ad-comparison-framework-designer', href: '/creative-ad-comparison-framework-designer' },
      { slug: 'ad-creative-aida-framework-designer', href: '/ad-creative-aida-framework-designer' },
      { slug: 'ad-creative-hook-story-offer-designer', href: '/ad-creative-hook-story-offer-designer' },
    ],
  },
  {
    id: 'persuasion-psychology',
    label: 'Persuasion & Psychology',
    icon: 'Heart',
    apps: [
      { slug: 'ad-creative-emotional-anchor-designer', href: '/ad-creative-emotional-anchor-designer' },
      { slug: 'ad-creative-emotional-pivot-designer', href: '/ad-creative-emotional-pivot-designer' },
      { slug: 'ad-creative-emotion-sequencer', href: '/ad-creative-emotion-sequencer' },
      { slug: 'ad-creative-fear-appeal-designer', href: '/ad-creative-fear-appeal-designer' },
      { slug: 'ad-creative-pride-appeal-designer', href: '/ad-creative-pride-appeal-designer' },
      { slug: 'ad-creative-humor-appeal-designer', href: '/ad-creative-humor-appeal-designer' },
      { slug: 'creative-ad-belonging-appeal-designer', href: '/creative-ad-belonging-appeal-designer' },
      { slug: 'creative-ad-liking-affinity-designer', href: '/creative-ad-liking-affinity-designer' },
      { slug: 'creative-ad-desire-amplifier-designer', href: '/creative-ad-desire-amplifier-designer' },
      { slug: 'creative-ad-empathy-bridge-designer', href: '/creative-ad-empathy-bridge-designer' },
      { slug: 'ad-creative-belief-shift-designer', href: '/ad-creative-belief-shift-designer' },
      { slug: 'creative-ad-identity-alignment-designer', href: '/creative-ad-identity-alignment-designer' },
      { slug: 'ad-creative-social-proof-architect', href: '/ad-creative-social-proof-architect' },
      { slug: 'ad-creative-social-momentum-designer', href: '/ad-creative-social-momentum-designer' },
      { slug: 'ad-creative-authority-positioning-designer', href: '/ad-creative-authority-positioning-designer' },
      { slug: 'ad-creative-trust-accelerator-designer', href: '/ad-creative-trust-accelerator-designer' },
      { slug: 'creative-ad-urgency-catalyst-designer', href: '/creative-ad-urgency-catalyst-designer' },
      { slug: 'ad-creative-scarcity-frame-designer', href: '/ad-creative-scarcity-frame-designer' },
      { slug: 'ad-creative-objection-neutralizer-designer', href: '/ad-creative-objection-neutralizer-designer' },
      { slug: 'ad-creative-risk-reversal-designer', href: '/ad-creative-risk-reversal-designer' },
      { slug: 'creative-ad-micro-commitment-designer', href: '/creative-ad-micro-commitment-designer' },
      { slug: 'ad-creative-testimonial-architecture-designer', href: '/ad-creative-testimonial-architecture-designer' },
      { slug: 'ad-creative-unique-mechanism-designer', href: '/ad-creative-unique-mechanism-designer' },
      { slug: 'ad-creative-future-pacing-designer', href: '/ad-creative-future-pacing-designer' },
    ],
  },
  {
    id: 'behavioral-economics',
    label: 'Behavioral Economics',
    icon: 'DollarSign',
    apps: [
      { slug: 'ad-creative-anchoring-effect-designer', href: '/ad-creative-anchoring-effect-designer' },
      { slug: 'creative-ad-price-framing-designer', href: '/creative-ad-price-framing-designer' },
      { slug: 'ad-creative-decoy-effect-designer', href: '/ad-creative-decoy-effect-designer' },
      { slug: 'creative-ad-loss-aversion-framing-designer', href: '/creative-ad-loss-aversion-framing-designer' },
      { slug: 'creative-ad-reciprocity-trigger-designer', href: '/creative-ad-reciprocity-trigger-designer' },
      { slug: 'creative-ad-endowment-effect-designer', href: '/creative-ad-endowment-effect-designer' },
      { slug: 'creative-ad-framing-effect-designer', href: '/creative-ad-framing-effect-designer' },
      { slug: 'creative-ad-nostalgia-trigger-designer', href: '/creative-ad-nostalgia-trigger-designer' },
      { slug: 'creative-ad-offer-architecture-designer', href: '/creative-ad-offer-architecture-designer' },
      { slug: 'creative-ad-value-ladder-designer', href: '/creative-ad-value-ladder-designer' },
      { slug: 'ad-creative-viewer-reward-designer', href: '/ad-creative-viewer-reward-designer' },
      { slug: 'creative-ad-anticipation-builder', href: '/creative-ad-anticipation-builder' },
      { slug: 'creative-ad-persuasion-strategist', href: '/creative-ad-persuasion-strategist' },
      { slug: 'ad-creative-mental-accounting-designer', href: '/ad-creative-mental-accounting-designer' },
      { slug: 'ad-creative-pain-of-paying-designer', href: '/ad-creative-pain-of-paying-designer' },
      { slug: 'ad-creative-implementation-intention-designer', href: '/ad-creative-implementation-intention-designer' },
      { slug: 'ad-creative-choice-simplifier-designer', href: '/ad-creative-choice-simplifier-designer' },
    ],
  },
  {
    id: 'narrative-pacing',
    label: 'Narrative & Pacing',
    icon: 'BookOpen',
    apps: [
      { slug: 'ad-creative-story-arc-designer', href: '/ad-creative-story-arc-designer' },
      { slug: 'ad-creative-tension-release-designer', href: '/ad-creative-tension-release-designer' },
      { slug: 'creative-ad-tension-release-strategist', href: '/creative-ad-tension-release-strategist' },
      { slug: 'creative-ad-climax-architect', href: '/creative-ad-climax-architect' },
      { slug: 'creative-ad-foreshadowing-designer', href: '/creative-ad-foreshadowing-designer' },
      { slug: 'creative-ad-resolution-designer', href: '/creative-ad-resolution-designer' },
      { slug: 'creative-ad-transformation-arc-designer', href: '/creative-ad-transformation-arc-designer' },
      { slug: 'creative-ad-stakes-escalation-designer', href: '/creative-ad-stakes-escalation-designer' },
      { slug: 'creative-ad-micro-moment-designer', href: '/creative-ad-micro-moment-designer' },
      { slug: 'ad-creative-callback-memory-designer', href: '/ad-creative-callback-memory-designer' },
      { slug: 'ad-creative-memory-anchor-builder', href: '/ad-creative-memory-anchor-builder' },
      { slug: 'creative-ad-narrative-twist-designer', href: '/creative-ad-narrative-twist-designer' },
      { slug: 'creative-ad-curiosity-gap-designer', href: '/creative-ad-curiosity-gap-designer' },
      { slug: 'ad-creative-curiosity-loop-designer', href: '/ad-creative-curiosity-loop-designer' },
      { slug: 'creative-ad-surprise-element-designer', href: '/creative-ad-surprise-element-designer' },
      { slug: 'creative-ad-pattern-interrupt-designer', href: '/creative-ad-pattern-interrupt-designer' },
      { slug: 'ad-creative-sequencer', href: '/ad-creative-sequencer' },
    ],
  },
  {
    id: 'analytics-intelligence',
    label: 'Analytics & Intelligence',
    icon: 'BarChart3',
    apps: [
      { slug: 'performance', href: '/performance' },
      { slug: 'performance-loop', href: '/performance-loop' },
      { slug: 'ad-performance-predictor', href: '/ad-performance-predictor' },
      { slug: 'creative-performance-forecaster', href: '/creative-performance-forecaster' },
      { slug: 'forecasting', href: '/forecasting' },
      { slug: 'creative-quality-scorer', href: '/creative-quality-scorer' },
      { slug: 'quality-scoring', href: '/quality-scoring' },
      { slug: 'fatigue', href: '/fatigue' },
      { slug: 'creative-fatigue-detector', href: '/creative-fatigue-detector' },
      { slug: 'ad-creative-burnout-detector', href: '/ad-creative-burnout-detector' },
      { slug: 'ad-emotion-analyzer', href: '/ad-emotion-analyzer' },
      { slug: 'ad-sentiment-tuner', href: '/ad-sentiment-tuner' },
      { slug: 'creative-sentiment-journey-mapper', href: '/creative-sentiment-journey-mapper' },
      { slug: 'ad-audience-resonance-predictor', href: '/ad-audience-resonance-predictor' },
      { slug: 'ad-audience-pain-point-mapper', href: '/ad-audience-pain-point-mapper' },
      { slug: 'ad-audience-psychographic-profiler', href: '/ad-audience-psychographic-profiler' },
      { slug: 'ad-audience-segment-builder', href: '/ad-audience-segment-builder' },
      { slug: 'audience-persona-generator', href: '/audience-persona-generator' },
      { slug: 'audience-insights', href: '/audience-insights' },
      { slug: 'personas', href: '/personas' },
    ],
  },
  {
    id: 'market-competitive',
    label: 'Market & Competitive',
    icon: 'Radar',
    apps: [
      { slug: 'competitor-intel', href: '/competitor-intel' },
      { slug: 'competitor-watch', href: '/competitor-watch' },
      { slug: 'ad-competitive-intelligence', href: '/ad-competitive-intelligence' },
      { slug: 'trend-intelligence', href: '/trend-intelligence' },
      { slug: 'trend-spotter', href: '/trend-spotter' },
      { slug: 'creative-trend-adapter', href: '/creative-trend-adapter' },
      { slug: 'viral-analyzer', href: '/viral-analyzer' },
      { slug: 'viral-analysis', href: '/viral-analysis' },
    ],
  },
  {
    id: 'production-asset',
    label: 'Production & Asset',
    icon: 'Clapperboard',
    apps: [
      { slug: 'creative-assets', href: '/creative-assets' },
      { slug: 'creator-kits', href: '/creator-kits' },
      { slug: 'brand-concepts', href: '/brand-concepts' },
      { slug: 'clip-editor', href: '/clip-editor' },
      { slug: 'media-service-boundary', href: '/media-service-boundary' },
      { slug: 'image-studio', href: '/image-studio' },
      { slug: 'audio-studio', href: '/audio-studio' },
      { slug: 'creative-scene-generator', href: '/creative-scene-generator' },
      { slug: 'scene-analysis', href: '/scene-analysis' },
      { slug: 'shot-planner', href: '/shot-planner' },
      { slug: 'ad-color-palette-generator', href: '/ad-color-palette-generator' },
      { slug: 'ad-font-pairing-generator', href: '/ad-font-pairing-generator' },
      { slug: 'ad-thumbnail-generator', href: '/ad-thumbnail-generator' },
      { slug: 'ad-music-mood-matcher', href: '/ad-music-mood-matcher' },
      { slug: 'mood-board-generator', href: '/mood-board-generator' },
    ],
  },
  {
    id: 'campaign-management',
    label: 'Campaign Management',
    icon: 'Workflow',
    apps: [
      { slug: 'ads', href: '/ads' },
      { slug: 'campaign-orchestrator', href: '/campaign-orchestrator' },
      { slug: 'pipeline', href: '/pipeline' },
      { slug: 'workflow-builder', href: '/workflow-builder' },
      { slug: 'smart-calendar', href: '/smart-calendar' },
      { slug: 'calendar', href: '/calendar' },
      { slug: 'budget-optimizer', href: '/budget-optimizer' },
      { slug: 'ad-budget-allocator', href: '/ad-budget-allocator' },
      { slug: 'ab-automation', href: '/ab-automation' },
      { slug: 'ab-test-planner', href: '/ab-test-planner' },
      { slug: 'ad-ab-test-name-generator', href: '/ad-ab-test-name-generator' },
      { slug: 'ad-creative-ab-test-simulator', href: '/ad-creative-ab-test-simulator' },
      { slug: 'testing-lab', href: '/testing-lab' },
      { slug: 'publish', href: '/publish' },
    ],
  },
  {
    id: 'brand-compliance',
    label: 'Brand & Compliance',
    icon: 'Shield',
    apps: [
      { slug: 'brand-voice', href: '/brand-voice' },
      { slug: 'brand-voice-analyzer', href: '/brand-voice-analyzer' },
      { slug: 'brand-voice-consistency-checker', href: '/brand-voice-consistency-checker' },
      { slug: 'brand-story-architect', href: '/brand-story-architect' },
      { slug: 'brand-guardrails', href: '/brand-guardrails' },
      { slug: 'meta-safety', href: '/meta-safety' },
      { slug: 'google-safety', href: '/google-safety' },
      { slug: 'compliance', href: '/compliance' },
    ],
  },
  {
    id: 'platform-infrastructure',
    label: 'Platform & Infrastructure',
    icon: 'Server',
    apps: [
      { slug: 'editor', href: '/editor' },
      { slug: 'skills', href: '/skills' },
      { slug: 'skill-chains', href: '/skill-chains' },
      { slug: 'skill-chain-builder', href: '/skill-chain-builder' },
      { slug: 'mcp-server', href: '/mcp-server' },
      { slug: 'ml-insights', href: '/ml-insights' },
      { slug: 'templates', href: '/templates' },
      { slug: 'inspiration', href: '/inspiration' },
      { slug: 'leaderboard', href: '/leaderboard' },
      { slug: 'ad-timing-optimizer', href: '/ad-timing-optimizer' },
      { slug: 'ad-placement-strategist', href: '/ad-placement-strategist' },
      { slug: 'ad-format-optimizer', href: '/ad-format-optimizer' },
      { slug: 'creative-format-converter', href: '/creative-format-converter' },
      { slug: 'creative-format-recommender', href: '/creative-format-recommender' },
      { slug: 'ad-localization-adapter', href: '/ad-localization-adapter' },
      { slug: 'ad-persona-matcher', href: '/ad-persona-matcher' },
      { slug: 'ad-creative-rotator', href: '/ad-creative-rotator' },
      { slug: 'ad-creative-lifecycle-manager', href: '/ad-creative-lifecycle-manager' },
      { slug: 'creative-ad-format-innovator', href: '/creative-ad-format-innovator' },
      { slug: 'creative-ad-tone-calibrator', href: '/creative-ad-tone-calibrator' },
    ],
  },
  {
    id: 'sensory-design',
    label: 'Sensory & Design',
    icon: 'Palette',
    apps: [
      { slug: 'ad-creative-sensory-enhancer', href: '/ad-creative-sensory-enhancer' },
      { slug: 'ad-creative-sensory-contrast-designer', href: '/ad-creative-sensory-contrast-designer' },
      { slug: 'ad-creative-contrast-amplifier', href: '/ad-creative-contrast-amplifier' },
      { slug: 'ad-creative-sound-design-strategist', href: '/ad-creative-sound-design-strategist' },
      { slug: 'creative-ad-metaphor-generator', href: '/creative-ad-metaphor-generator' },
      { slug: 'creative-ad-visual-hierarchy-strategist', href: '/creative-ad-visual-hierarchy-strategist' },
      { slug: 'creative-visual-hierarchy-analyzer', href: '/creative-visual-hierarchy-analyzer' },
      { slug: 'ad-creative-hook-timing-optimizer', href: '/ad-creative-hook-timing-optimizer' },
      { slug: 'ad-creative-rhythm-pacing-optimizer', href: '/ad-creative-rhythm-pacing-optimizer' },
      { slug: 'ad-creative-pacing-variability-designer', href: '/ad-creative-pacing-variability-designer' },
    ],
  },
];

/**
 * Primary navigation items — always visible in the header.
 * These are the 6 core workflow destinations.
 */
export const PRIMARY_NAV = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: 'LayoutDashboard' },
  { href: '/creative-director', labelKey: 'nav.create', icon: 'Sparkles' },
  { href: '/performance', labelKey: 'nav.optimize', icon: 'BarChart3' },
  { href: '/ads', labelKey: 'nav.manage', icon: 'Megaphone' },
  { href: '/competitor-intel', labelKey: 'nav.insights', icon: 'Radar' },
  { href: '/settings', labelKey: 'nav.settings', icon: 'Settings' },
] as const;

/**
 * Get all apps flattened from all categories.
 * Useful for search functionality.
 */
export function getAllApps(): NavApp[] {
  return NAV_CATEGORIES.flatMap((cat) => cat.apps);
}

/**
 * Get the category for a given app slug.
 */
export function getCategoryForApp(slug: string): NavCategory | undefined {
  return NAV_CATEGORIES.find((cat) => cat.apps.some((app) => app.slug === slug));
}

/**
 * Search apps by query string.
 * Matches against slug and (if available) title.
 */
export function searchApps(query: string): NavApp[] {
  const q = query.toLowerCase().trim();
  if (!q) return getAllApps();
  return getAllApps().filter((app) => {
    const slugMatch = app.slug.includes(q);
    const titleMatch = app.titleKey?.toLowerCase().includes(q) ?? false;
    // Also match against human-readable slug (dashes to spaces)
    const readableSlug = app.slug.replace(/-/g, ' ');
    const readableMatch = readableSlug.includes(q);
    return slugMatch || titleMatch || readableMatch;
  });
}
