/**
 * Built-in creative templates for the template library.
 *
 * These are seeded into D1 on first access and provide users with pre-built
 * starting points for common e-commerce creative patterns.
 */

export interface BuiltinTemplate {
  category: 'brief' | 'hooks' | 'angles' | 'script' | 'skill-bundle';
  name: string;
  description: string;
  payload: Record<string, unknown>;
  tags: string[];
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  // ── Brief templates ──
  {
    category: 'brief',
    name: 'Product Launch',
    description: 'Brief template for launching a new product with awareness + conversion goals.',
    tags: ['launch', 'product', 'awareness'],
    payload: {
      goals: ['awareness', 'consideration', 'conversion'],
      tone: 'exciting',
      audience: 'Early adopters and tech enthusiasts',
      keyMessage: 'Introducing a revolutionary new product',
      cta: 'Shop Now',
    },
  },
  {
    category: 'brief',
    name: 'Seasonal Sale',
    description: 'Brief template for seasonal promotions and discount campaigns.',
    tags: ['sale', 'seasonal', 'discount'],
    payload: {
      goals: ['conversion', 'retention'],
      tone: 'urgent',
      audience: 'Existing customers and deal seekers',
      keyMessage: 'Limited-time seasonal sale with exclusive discounts',
      cta: 'Shop the Sale',
    },
  },
  {
    category: 'brief',
    name: 'Brand Story',
    description: 'Brief template for brand storytelling and emotional connection.',
    tags: ['brand', 'story', 'emotional'],
    payload: {
      goals: ['awareness', 'brand-affinity'],
      tone: 'inspiring',
      audience: 'Broad audience interested in brand values',
      keyMessage: 'Our journey and why we do what we do',
      cta: 'Learn More',
    },
  },

  // ── Hook templates ──
  {
    category: 'hooks',
    name: 'Question Hooks',
    description: 'Curiosity-driven question hooks that stop the scroll.',
    tags: ['question', 'curiosity', 'scroll-stopper'],
    payload: {
      hooks: [
        { type: 'question', text: 'Did you know 90% of people are doing this wrong?' },
        { type: 'question', text: 'What if everything you knew about X was wrong?' },
        { type: 'question', text: 'Why does nobody talk about this?' },
      ],
    },
  },
  {
    category: 'hooks',
    name: 'Problem-Solution Hooks',
    description: 'Hooks that present a pain point then tease the solution.',
    tags: ['problem', 'solution', 'pain-point'],
    payload: {
      hooks: [
        { type: 'problem-solution', text: 'Struggling with X? Here\'s what actually works.' },
        { type: 'problem-solution', text: 'Stop wasting money on X. Do this instead.' },
        { type: 'problem-solution', text: 'The #1 mistake people make with X (and how to fix it)' },
      ],
    },
  },
  {
    category: 'hooks',
    name: 'Bold Claim Hooks',
    description: 'Confident, attention-grabbing claims that demand attention.',
    tags: ['bold', 'claim', 'attention'],
    payload: {
      hooks: [
        { type: 'bold-claim', text: 'This will change the way you think about X forever.' },
        { type: 'bold-claim', text: 'I tried 100 products so you don\'t have to. This one won.' },
        { type: 'bold-claim', text: 'The truth about X that nobody wants to tell you.' },
      ],
    },
  },

  // ── Angle templates ──
  {
    category: 'angles',
    name: 'Social Proof Angle',
    description: 'Leverage customer testimonials and user-generated content.',
    tags: ['social-proof', 'testimonial', 'ugc'],
    payload: {
      angles: [
        { name: 'Customer Spotlight', description: 'Feature real customer stories and results', emotionalTrigger: 'trust' },
        { name: 'Before & After', description: 'Show transformation with real user results', emotionalTrigger: 'aspiration' },
      ],
    },
  },
  {
    category: 'angles',
    name: 'Educational Angle',
    description: 'Teach the audience something valuable while showcasing the product.',
    tags: ['education', 'value', 'tutorial'],
    payload: {
      angles: [
        { name: 'How-To Guide', description: 'Teach a skill using the product as the tool', emotionalTrigger: 'empowerment' },
        { name: 'Myth Busting', description: 'Debunk common myths related to the product category', emotionalTrigger: 'surprise' },
      ],
    },
  },
  {
    category: 'angles',
    name: 'Entertainment Angle',
    description: 'Humor and entertainment-first content with subtle product integration.',
    tags: ['entertainment', 'humor', 'viral'],
    payload: {
      angles: [
        { name: 'Sk Comedy', description: 'Short comedic sketch featuring the product', emotionalTrigger: 'joy' },
        { name: 'Trend Remix', description: 'Adapt a trending format to feature the product', emotionalTrigger: 'fomo' },
      ],
    },
  },

  // ── Script templates ──
  {
    category: 'script',
    name: '30-Second Ad Structure',
    description: 'Classic 30-second ad: hook (3s) → problem (7s) → solution (12s) → proof (5s) → CTA (3s).',
    tags: ['30s', 'ad', 'structure'],
    payload: {
      structure: 'hook-problem-solution-proof-cta',
      scenes: [
        { beat: 'Hook', durationSec: 3, visual: 'Attention-grabbing opening', voiceover: 'Hook line' },
        { beat: 'Problem', durationSec: 7, visual: 'Show the pain point', voiceover: 'Relatable problem' },
        { beat: 'Solution', durationSec: 12, visual: 'Product demo', voiceover: 'How the product solves it' },
        { beat: 'Proof', durationSec: 5, visual: 'Testimonial/results', voiceover: 'Social proof' },
        { beat: 'CTA', durationSec: 3, visual: 'Product + call to action', voiceover: 'CTA line' },
      ],
    },
  },
  {
    category: 'script',
    name: '15-Short Form',
    description: 'Fast-paced 15-second short for TikTok/Reels: hook (2s) → demo (8s) → result (3s) → CTA (2s).',
    tags: ['15s', 'short-form', 'tiktok'],
    payload: {
      structure: 'hook-demo-result-cta',
      scenes: [
        { beat: 'Hook', durationSec: 2, visual: 'Bold visual + text overlay', voiceover: 'Scroll-stopping hook' },
        { beat: 'Demo', durationSec: 8, visual: 'Quick product demo cuts', voiceover: 'Key benefits rapid-fire' },
        { beat: 'Result', durationSec: 3, visual: 'Before/after or result', voiceover: 'The transformation' },
        { beat: 'CTA', durationSec: 2, visual: 'Product shot + CTA text', voiceover: 'Call to action' },
      ],
    },
  },
  {
    category: 'script',
    name: '60-Second Story Ad',
    description: 'Narrative-driven 60-second ad with character arc and emotional payoff.',
    tags: ['60s', 'story', 'narrative'],
    payload: {
      structure: 'setup-conflict-resolution-payoff',
      scenes: [
        { beat: 'Setup', durationSec: 10, visual: 'Establish character and world', voiceover: 'Meet [character]' },
        { beat: 'Conflict', durationSec: 15, visual: 'Introduce the problem', voiceover: 'But there was one problem...' },
        { beat: 'Discovery', durationSec: 15, visual: 'Finding the product', voiceover: 'Then they discovered [product]' },
        { beat: 'Resolution', durationSec: 12, visual: 'Using the product successfully', voiceover: 'Everything changed' },
        { beat: 'Payoff', durationSec: 8, visual: 'Happy ending + product', voiceover: 'CTA + brand message' },
      ],
    },
  },

  // ── Skill bundle templates ──
  {
    category: 'skill-bundle',
    name: 'TikTok Viral Bundle',
    description: 'Essential editing skills for TikTok-style viral content.',
    tags: ['tiktok', 'viral', 'short-form'],
    payload: {
      skillIds: ['fast-paced-hook-cut', 'caption-pop', 'trending-audio-sync'],
      description: 'Combine fast cuts, pop-on captions, and audio sync for maximum TikTok engagement.',
    },
  },
  {
    category: 'skill-bundle',
    name: 'Product Demo Pro',
    description: 'Professional product demo editing skills for YouTube and ads.',
    tags: ['product-demo', 'youtube', 'professional'],
    payload: {
      skillIds: ['product-zoom-punch', 'b-roll-cutaway', 'color-grade-pop'],
      description: 'Zoom punches, B-roll cutaways, and color grading for polished product demos.',
    },
  },
];
