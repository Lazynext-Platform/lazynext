import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for UGC Ad Formats.
 *
 * Replicates the structures from src/lib/creative/ugc-formats.ts to test
 * without requiring TypeScript path alias resolution (same pattern as
 * creative-intelligence.test.ts).
 */

// ── Replicated types ──
type UgcFormatType =
  | 'testimonial' | 'reaction' | 'unboxing' | 'before_after'
  | 'tutorial' | 'review' | 'comparison';

type PlatformFormat = 'tiktok' | 'reels' | 'shorts' | 'snapchat' | 'facebook_story';

type CreatorPersona =
  | 'enthusiastic_customer' | 'expert_reviewer' | 'casual_user'
  | 'influencer' | 'everyday_person';

const ALL_FORMATS: UgcFormatType[] = [
  'testimonial', 'reaction', 'unboxing', 'before_after', 'tutorial', 'review', 'comparison',
];
const ALL_PLATFORMS: PlatformFormat[] = [
  'tiktok', 'reels', 'shorts', 'snapchat', 'facebook_story',
];
const ALL_PERSONAS: CreatorPersona[] = [
  'enthusiastic_customer', 'expert_reviewer', 'casual_user', 'influencer', 'everyday_person',
];

// ── Replicated UGC_COST ──
const UGC_COST = 4;

// ── Replicated UGC_TEMPLATES ──
const UGC_TEMPLATES: Record<UgcFormatType, {
  type: UgcFormatType;
  name: string;
  description: string;
  structure: Array<{ sceneNumber: number; durationSec: number; shotType: string; description: string }>;
  durationSec: number;
  hookType: string;
  recommendedPlatforms: PlatformFormat[];
}> = {
  testimonial: {
    type: 'testimonial',
    name: 'Customer Testimonial',
    description: 'A real customer shares their authentic experience with the product.',
    durationSec: 30,
    hookType: 'relatable_problem',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      { sceneNumber: 1, durationSec: 3, shotType: 'close-up selfie', description: 'Creator looks into camera.' },
      { sceneNumber: 2, durationSec: 6, shotType: 'medium shot', description: 'Creator explains before state.' },
      { sceneNumber: 3, durationSec: 8, shotType: 'product demo', description: 'Product in use.' },
      { sceneNumber: 4, durationSec: 6, shotType: 'close-up selfie', description: 'Result and payoff.' },
      { sceneNumber: 5, durationSec: 4, shotType: 'product hero', description: 'CTA.' },
    ],
  },
  reaction: {
    type: 'reaction',
    name: 'First Reaction',
    description: 'Creator reacts to the product for the first time.',
    durationSec: 25,
    hookType: 'curiosity_gap',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts', 'snapchat'],
    structure: [
      { sceneNumber: 1, durationSec: 3, shotType: 'close-up selfie', description: 'Excited expression.' },
      { sceneNumber: 2, durationSec: 5, shotType: 'medium shot', description: 'Reveal reaction.' },
      { sceneNumber: 3, durationSec: 8, shotType: 'product demo', description: 'Tries product.' },
      { sceneNumber: 4, durationSec: 5, shotType: 'close-up selfie', description: 'Verdict.' },
      { sceneNumber: 5, durationSec: 4, shotType: 'product hero', description: 'CTA.' },
    ],
  },
  unboxing: {
    type: 'unboxing',
    name: 'Unboxing & First Look',
    description: 'ASMR-style unboxing.',
    durationSec: 35,
    hookType: 'sensory_hook',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      { sceneNumber: 1, durationSec: 4, shotType: 'close-up hands', description: 'Sealed package.' },
      { sceneNumber: 2, durationSec: 8, shotType: 'close-up hands', description: 'ASMR unboxing.' },
      { sceneNumber: 3, durationSec: 6, shotType: 'product hero', description: 'First reveal.' },
      { sceneNumber: 4, durationSec: 10, shotType: 'product demo', description: 'Features.' },
      { sceneNumber: 5, durationSec: 4, shotType: 'close-up selfie', description: 'Verdict + CTA.' },
    ],
  },
  before_after: {
    type: 'before_after',
    name: 'Before & After',
    description: 'Dramatic before/after transformation.',
    durationSec: 30,
    hookType: 'transformation',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts', 'facebook_story'],
    structure: [
      { sceneNumber: 1, durationSec: 4, shotType: 'before shot', description: 'Before state.' },
      { sceneNumber: 2, durationSec: 3, shotType: 'transition', description: 'Transition.' },
      { sceneNumber: 3, durationSec: 8, shotType: 'after shot', description: 'After reveal.' },
      { sceneNumber: 4, durationSec: 8, shotType: 'product demo', description: 'How it was used.' },
      { sceneNumber: 5, durationSec: 4, shotType: 'close-up selfie', description: 'Endorse + CTA.' },
    ],
  },
  tutorial: {
    type: 'tutorial',
    name: 'How-To Tutorial',
    description: 'Educational step-by-step tutorial.',
    durationSec: 45,
    hookType: 'value_promise',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      { sceneNumber: 1, durationSec: 4, shotType: 'close-up selfie', description: 'Value promise.' },
      { sceneNumber: 2, durationSec: 10, shotType: 'product demo', description: 'Step 1.' },
      { sceneNumber: 3, durationSec: 12, shotType: 'product demo', description: 'Step 2.' },
      { sceneNumber: 4, durationSec: 10, shotType: 'product demo', description: 'Step 3.' },
      { sceneNumber: 5, durationSec: 5, shotType: 'close-up selfie', description: 'Recap + CTA.' },
    ],
  },
  review: {
    type: 'review',
    name: 'Honest Review',
    description: 'Balanced, trustworthy review.',
    durationSec: 40,
    hookType: 'honest_take',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts', 'facebook_story'],
    structure: [
      { sceneNumber: 1, durationSec: 4, shotType: 'close-up selfie', description: 'Honest framing.' },
      { sceneNumber: 2, durationSec: 10, shotType: 'product demo', description: 'Pros.' },
      { sceneNumber: 3, durationSec: 8, shotType: 'medium shot', description: 'Cons.' },
      { sceneNumber: 4, durationSec: 8, shotType: 'product demo', description: 'Who it is for.' },
      { sceneNumber: 5, durationSec: 5, shotType: 'close-up selfie', description: 'Verdict + CTA.' },
    ],
  },
  comparison: {
    type: 'comparison',
    name: 'Product Comparison',
    description: 'Side-by-side comparison.',
    durationSec: 40,
    hookType: 'versus',
    recommendedPlatforms: ['tiktok', 'reels', 'shorts'],
    structure: [
      { sceneNumber: 1, durationSec: 4, shotType: 'split screen', description: 'Introduce both.' },
      { sceneNumber: 2, durationSec: 10, shotType: 'side-by-side demo', description: 'Feature 1.' },
      { sceneNumber: 3, durationSec: 10, shotType: 'side-by-side demo', description: 'Feature 2.' },
      { sceneNumber: 4, durationSec: 8, shotType: 'close-up selfie', description: 'Declare winner.' },
      { sceneNumber: 5, durationSec: 5, shotType: 'product hero', description: 'CTA.' },
    ],
  },
};

// ── Replicated platform hashtags ──
const PLATFORM_BASE_HASHTAGS: Record<PlatformFormat, string[]> = {
  tiktok: ['fyp', 'foryou', 'tiktokmademebuyit', 'tiktokshop'],
  reels: ['reels', 'reelsinstagram', 'instagood', 'explore'],
  shorts: ['shorts', 'youtubeshorts', 'shortsfeed', 'ytshorts'],
  snapchat: ['snapchat', 'snap', 'spotlight'],
  facebook_story: ['facebookstory', 'fbstory', 'story'],
};

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  beauty: ['beauty', 'skincare', 'makeup', 'beautytok'],
  tech: ['tech', 'gadgets', 'techtok', 'unboxing'],
  fitness: ['fitness', 'workout', 'gymtok', 'fitnesstips'],
  food: ['food', 'foodie', 'recipe', 'foodtok'],
  fashion: ['fashion', 'ootd', 'style', 'fashiontok'],
  home: ['home', 'homedecor', 'amazonfinds', 'homehacks'],
  default: ['viral', 'trending', 'musthave', 'productreview'],
};

function getPlatformHashtags(platform: PlatformFormat, productCategory?: string): string[] {
  const platformTags = PLATFORM_BASE_HASHTAGS[platform] ?? [];
  const category = (productCategory || '').toLowerCase().trim();
  const categoryTags = CATEGORY_HASHTAGS[category] ?? CATEGORY_HASHTAGS.default;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of [...platformTags, ...categoryTags]) {
    const clean = tag.replace(/^#/, '').toLowerCase();
    if (!seen.has(clean)) {
      seen.add(clean);
      out.push(clean);
    }
  }
  return out.slice(0, 12);
}

// ── Replicated persona guidelines ──
const PERSONA_GUIDELINES: Record<CreatorPersona, {
  persona: CreatorPersona;
  name: string;
  voice: string;
  style: string;
  doSay: string[];
  avoid: string[];
  energyLevel: 'low' | 'medium' | 'high';
}> = {
  enthusiastic_customer: {
    persona: 'enthusiastic_customer', name: 'Enthusiastic Customer',
    voice: 'Excited, genuine, personal.', style: 'Fast-paced, high energy.',
    doSay: ['I am obsessed with this'], avoid: ['corporate jargon'], energyLevel: 'high',
  },
  expert_reviewer: {
    persona: 'expert_reviewer', name: 'Expert Reviewer',
    voice: 'Authoritative, analytical, balanced.', style: 'Calm, structured.',
    doSay: ['After testing this'], avoid: ['hype without evidence'], energyLevel: 'medium',
  },
  casual_user: {
    persona: 'casual_user', name: 'Casual User',
    voice: 'Relaxed, conversational, relatable.', style: 'Low pressure, natural.',
    doSay: ['So I have been using this'], avoid: ['salesy language'], energyLevel: 'low',
  },
  influencer: {
    persona: 'influencer', name: 'Influencer',
    voice: 'Aspirational, trend-aware, confident.', style: 'Polished but authentic.',
    doSay: ['My followers have been asking'], avoid: ['negative framing'], energyLevel: 'high',
  },
  everyday_person: {
    persona: 'everyday_person', name: 'Everyday Person',
    voice: 'Normal, unscripted, authentic.', style: 'Imperfect, genuine.',
    doSay: ['I do not usually post about products'], avoid: ['polished influencer speak'], energyLevel: 'medium',
  },
};

function getPersonaGuidelines(persona: CreatorPersona) {
  return PERSONA_GUIDELINES[persona] ?? PERSONA_GUIDELINES.everyday_person;
}

// ── Tests: UGC template structure validation (all 7 formats) ──

test('UGC_TEMPLATES has exactly 7 format types', () => {
  assert.equal(Object.keys(UGC_TEMPLATES).length, 7);
});

test('all 7 format types are present in UGC_TEMPLATES', () => {
  for (const fmt of ALL_FORMATS) {
    assert.ok(fmt in UGC_TEMPLATES, `${fmt} should be in UGC_TEMPLATES`);
  }
});

test('each UGC template has a valid type matching its key', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    assert.equal(tmpl.type, key, `template ${key} type should match key`);
  }
});

test('each UGC template has a non-empty name and description', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    assert.ok(tmpl.name.length > 0, `${key} name should be non-empty`);
    assert.ok(tmpl.description.length > 0, `${key} description should be non-empty`);
  }
});

test('each UGC template has a positive durationSec', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    assert.ok(tmpl.durationSec > 0, `${key} durationSec should be positive, got ${tmpl.durationSec}`);
    assert.ok(tmpl.durationSec <= 90, `${key} durationSec should be <= 90, got ${tmpl.durationSec}`);
  }
});

test('each UGC template has a non-empty hookType', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    assert.ok(tmpl.hookType.length > 0, `${key} hookType should be non-empty`);
  }
});

test('each UGC template has at least one recommended platform', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    assert.ok(tmpl.recommendedPlatforms.length > 0, `${key} should have >= 1 recommended platform`);
    for (const p of tmpl.recommendedPlatforms) {
      assert.ok(ALL_PLATFORMS.includes(p), `${key} recommended platform ${p} should be valid`);
    }
  }
});

test('each UGC template has a non-empty structure with valid scenes', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    assert.ok(tmpl.structure.length >= 3, `${key} should have >= 3 scenes, got ${tmpl.structure.length}`);
    tmpl.structure.forEach((scene, idx) => {
      assert.ok(scene.sceneNumber > 0, `${key} scene ${idx} sceneNumber should be positive`);
      assert.ok(scene.durationSec > 0, `${key} scene ${idx} durationSec should be positive`);
      assert.ok(scene.shotType.length > 0, `${key} scene ${idx} shotType should be non-empty`);
      assert.ok(scene.description.length > 0, `${key} scene ${idx} description should be non-empty`);
    });
  }
});

test('each UGC template scene numbers are sequential starting from 1', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    tmpl.structure.forEach((scene, idx) => {
      assert.equal(scene.sceneNumber, idx + 1, `${key} scene ${idx} sceneNumber should be ${idx + 1}`);
    });
  }
});

test('each UGC template structure duration sums to a reasonable value', () => {
  for (const [key, tmpl] of Object.entries(UGC_TEMPLATES)) {
    const sum = tmpl.structure.reduce((acc, s) => acc + s.durationSec, 0);
    assert.ok(sum >= 10, `${key} scene durations should sum to >= 10, got ${sum}`);
    assert.ok(sum <= 120, `${key} scene durations should sum to <= 120, got ${sum}`);
  }
});

// ── Tests: Platform hashtag generation ──

test('getPlatformHashtags returns non-empty array for every platform', () => {
  for (const p of ALL_PLATFORMS) {
    const tags = getPlatformHashtags(p);
    assert.ok(tags.length > 0, `${p} should return >= 1 hashtag`);
  }
});

test('getPlatformHashtags includes platform-specific tags', () => {
  const tiktokTags = getPlatformHashtags('tiktok');
  assert.ok(tiktokTags.includes('fyp'), 'tiktok should include fyp');
  assert.ok(tiktokTags.includes('tiktokmademebuyit'), 'tiktok should include tiktokmademebuyit');

  const reelsTags = getPlatformHashtags('reels');
  assert.ok(reelsTags.includes('reels'), 'reels should include reels');

  const shortsTags = getPlatformHashtags('shorts');
  assert.ok(shortsTags.includes('shorts'), 'shorts should include shorts');
});

test('getPlatformHashtags includes category-specific tags when category is provided', () => {
  const beautyTags = getPlatformHashtags('tiktok', 'beauty');
  assert.ok(beautyTags.includes('beauty'), 'beauty category should include beauty tag');
  assert.ok(beautyTags.includes('skincare'), 'beauty category should include skincare tag');
});

test('getPlatformHashtags falls back to default tags for unknown category', () => {
  const tags = getPlatformHashtags('tiktok', 'nonexistent_category');
  assert.ok(tags.includes('viral'), 'unknown category should fall back to default viral tag');
  assert.ok(tags.includes('trending'), 'unknown category should fall back to default trending tag');
});

test('getPlatformHashtags returns no more than 12 tags', () => {
  for (const p of ALL_PLATFORMS) {
    const tags = getPlatformHashtags(p, 'beauty');
    assert.ok(tags.length <= 12, `${p} should return <= 12 hashtags, got ${tags.length}`);
  }
});

test('getPlatformHashtags returns deduplicated tags', () => {
  for (const p of ALL_PLATFORMS) {
    const tags = getPlatformHashtags(p);
    const unique = new Set(tags);
    assert.equal(tags.length, unique.size, `${p} hashtags should be deduplicated`);
  }
});

test('getPlatformHashtags returns tags without leading #', () => {
  for (const p of ALL_PLATFORMS) {
    const tags = getPlatformHashtags(p);
    for (const tag of tags) {
      assert.ok(!tag.startsWith('#'), `${p} tag ${tag} should not start with #`);
    }
  }
});

// ── Tests: Persona guidelines structure ──

test('getPersonaGuidelines returns guidelines for all 5 personas', () => {
  for (const p of ALL_PERSONAS) {
    const g = getPersonaGuidelines(p);
    assert.ok(g, `${p} should return guidelines`);
  }
});

test('each persona guideline has a valid structure', () => {
  for (const p of ALL_PERSONAS) {
    const g = getPersonaGuidelines(p);
    assert.equal(g.persona, p, `${p} persona should match`);
    assert.ok(g.name.length > 0, `${p} name should be non-empty`);
    assert.ok(g.voice.length > 0, `${p} voice should be non-empty`);
    assert.ok(g.style.length > 0, `${p} style should be non-empty`);
    assert.ok(Array.isArray(g.doSay) && g.doSay.length > 0, `${p} doSay should be non-empty array`);
    assert.ok(Array.isArray(g.avoid) && g.avoid.length > 0, `${p} avoid should be non-empty array`);
    assert.ok(['low', 'medium', 'high'].includes(g.energyLevel), `${p} energyLevel should be valid`);
  }
});

test('getPersonaGuidelines falls back to everyday_person for unknown persona', () => {
  const g = getPersonaGuidelines('unknown' as CreatorPersona);
  assert.equal(g.persona, 'everyday_person');
});

test('persona guidelines doSay entries are non-empty strings', () => {
  for (const p of ALL_PERSONAS) {
    const g = getPersonaGuidelines(p);
    for (const s of g.doSay) {
      assert.ok(typeof s === 'string' && s.length > 0, `${p} doSay entry should be non-empty string`);
    }
  }
});

// ── Tests: UgcAdRequest validation ──

function validateUgcRequest(req: {
  productName: string;
  format: string;
  platform: string;
  persona: string;
}): string[] {
  const errors: string[] = [];
  if (!req.productName || !req.productName.trim()) errors.push('product_name_required');
  if (!ALL_FORMATS.includes(req.format as UgcFormatType)) errors.push('invalid_format');
  if (!ALL_PLATFORMS.includes(req.platform as PlatformFormat)) errors.push('invalid_platform');
  if (!ALL_PERSONAS.includes(req.persona as CreatorPersona)) errors.push('invalid_persona');
  return errors;
}

test('valid UgcAdRequest passes validation', () => {
  const errors = validateUgcRequest({
    productName: 'Glow Serum',
    format: 'testimonial',
    platform: 'tiktok',
    persona: 'enthusiastic_customer',
  });
  assert.equal(errors.length, 0);
});

test('missing productName fails validation', () => {
  const errors = validateUgcRequest({
    productName: '',
    format: 'testimonial',
    platform: 'tiktok',
    persona: 'enthusiastic_customer',
  });
  assert.ok(errors.includes('product_name_required'));
});

test('whitespace-only productName fails validation', () => {
  const errors = validateUgcRequest({
    productName: '   ',
    format: 'testimonial',
    platform: 'tiktok',
    persona: 'enthusiastic_customer',
  });
  assert.ok(errors.includes('product_name_required'));
});

test('invalid format fails validation', () => {
  const errors = validateUgcRequest({
    productName: 'Test',
    format: 'invalid_format',
    platform: 'tiktok',
    persona: 'enthusiastic_customer',
  });
  assert.ok(errors.includes('invalid_format'));
});

test('invalid platform fails validation', () => {
  const errors = validateUgcRequest({
    productName: 'Test',
    format: 'testimonial',
    platform: 'myspace',
    persona: 'enthusiastic_customer',
  });
  assert.ok(errors.includes('invalid_platform'));
});

test('invalid persona fails validation', () => {
  const errors = validateUgcRequest({
    productName: 'Test',
    format: 'testimonial',
    platform: 'tiktok',
    persona: 'robot',
  });
  assert.ok(errors.includes('invalid_persona'));
});

test('all 7 formats pass validation with valid fields', () => {
  for (const fmt of ALL_FORMATS) {
    const errors = validateUgcRequest({
      productName: 'Test Product',
      format: fmt,
      platform: 'tiktok',
      persona: 'enthusiastic_customer',
    });
    assert.equal(errors.length, 0, `format ${fmt} should pass validation`);
  }
});

test('all 5 platforms pass validation with valid fields', () => {
  for (const p of ALL_PLATFORMS) {
    const errors = validateUgcRequest({
      productName: 'Test Product',
      format: 'testimonial',
      platform: p,
      persona: 'enthusiastic_customer',
    });
    assert.equal(errors.length, 0, `platform ${p} should pass validation`);
  }
});

test('all 5 personas pass validation with valid fields', () => {
  for (const pers of ALL_PERSONAS) {
    const errors = validateUgcRequest({
      productName: 'Test Product',
      format: 'testimonial',
      platform: 'tiktok',
      persona: pers,
    });
    assert.equal(errors.length, 0, `persona ${pers} should pass validation`);
  }
});

// ── Tests: UgcAdResult structure ──

function makeMockResult(): Record<string, unknown> {
  return {
    format: 'testimonial',
    platform: 'tiktok',
    persona: 'enthusiastic_customer',
    scenes: [
      { sceneNumber: 1, durationSec: 3, shotType: 'close-up selfie', description: 'Hook scene' },
      { sceneNumber: 2, durationSec: 6, shotType: 'medium shot', description: 'Body scene' },
    ],
    hookText: 'I never thought I would say this about a product...',
    scriptText: 'Full script text here.',
    captionText: 'This changed my routine!',
    hashtags: ['fyp', 'tiktokmademebuyit'],
    callToAction: 'Link in bio',
    estimatedDurationSec: 30,
    visualNotes: 'Natural lighting, handheld.',
    audioNotes: 'Trending upbeat track.',
  };
}

function validateUgcResult(result: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (!ALL_FORMATS.includes(result.format as UgcFormatType)) errors.push('invalid_format');
  if (!ALL_PLATFORMS.includes(result.platform as PlatformFormat)) errors.push('invalid_platform');
  if (!ALL_PERSONAS.includes(result.persona as CreatorPersona)) errors.push('invalid_persona');
  if (!Array.isArray(result.scenes) || result.scenes.length === 0) errors.push('scenes_required');
  if (typeof result.hookText !== 'string') errors.push('hookText_required');
  if (typeof result.scriptText !== 'string') errors.push('scriptText_required');
  if (typeof result.captionText !== 'string') errors.push('captionText_required');
  if (!Array.isArray(result.hashtags)) errors.push('hashtags_required');
  if (typeof result.callToAction !== 'string') errors.push('callToAction_required');
  if (typeof result.estimatedDurationSec !== 'number') errors.push('estimatedDurationSec_required');
  if (typeof result.visualNotes !== 'string') errors.push('visualNotes_required');
  if (typeof result.audioNotes !== 'string') errors.push('audioNotes_required');
  return errors;
}

test('mock UgcAdResult passes structure validation', () => {
  const result = makeMockResult();
  const errors = validateUgcResult(result);
  assert.equal(errors.length, 0);
});

test('UgcAdResult with empty scenes fails validation', () => {
  const result = makeMockResult();
  result.scenes = [];
  const errors = validateUgcResult(result);
  assert.ok(errors.includes('scenes_required'));
});

test('UgcAdResult with missing hookText fails validation', () => {
  const result = makeMockResult();
  delete result.hookText;
  const errors = validateUgcResult(result);
  assert.ok(errors.includes('hookText_required'));
});

test('UgcAdResult with missing callToAction fails validation', () => {
  const result = makeMockResult();
  delete result.callToAction;
  const errors = validateUgcResult(result);
  assert.ok(errors.includes('callToAction_required'));
});

test('UgcAdResult with non-number estimatedDurationSec fails validation', () => {
  const result = makeMockResult();
  result.estimatedDurationSec = '30';
  const errors = validateUgcResult(result);
  assert.ok(errors.includes('estimatedDurationSec_required'));
});

test('UgcAdResult with non-array hashtags fails validation', () => {
  const result = makeMockResult();
  result.hashtags = 'fyp';
  const errors = validateUgcResult(result);
  assert.ok(errors.includes('hashtags_required'));
});

test('UgcAdResult scenes have valid scene structure', () => {
  const result = makeMockResult();
  const scenes = result.scenes as Array<Record<string, unknown>>;
  for (const scene of scenes) {
    assert.ok(typeof scene.sceneNumber === 'number' && scene.sceneNumber > 0);
    assert.ok(typeof scene.durationSec === 'number' && scene.durationSec > 0);
    assert.ok(typeof scene.shotType === 'string' && scene.shotType.length > 0);
    assert.ok(typeof scene.description === 'string' && scene.description.length > 0);
  }
});

// ── Tests: UGC cost ──

test('UGC_COST is a positive number', () => {
  assert.ok(UGC_COST > 0, `UGC_COST should be positive, got ${UGC_COST}`);
});

test('UGC_COST is 4 credits', () => {
  assert.equal(UGC_COST, 4);
});

test('UGC_COST is within a reasonable range for a single generation', () => {
  assert.ok(UGC_COST >= 2 && UGC_COST <= 10, `UGC_COST should be between 2 and 10, got ${UGC_COST}`);
});
