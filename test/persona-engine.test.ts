import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePersonaOverlap,
  generateTargetingRecommendations,
  generateCreativeAdaptations,
  getPersonaArchetypes,
  getChannels,
  validatePersonaRequest,
  PERSONA_COST,
  type Persona,
  type Demographics,
  type Psychographics,
  type PainPoint,
  type ChannelAffinity,
  type BuyingBehavior,
  type PersonaOverlap,
  type TargetingRecommendation,
  type PersonaEngineResult,
  type PersonaArchetype,
  type ChannelPreference,
  type ContentPreference,
  type BuyingMotivation,
} from '../src/lib/creative/persona-engine.ts';

function makeDemographics(): Demographics {
  return {
    ageRange: { min: 25, max: 34 },
    gender: 'all',
    incomeLevel: 'middle',
    education: 'bachelors',
    location: 'urban',
    occupation: 'Product Manager',
    familyStatus: 'single',
  };
}

function makePsychographics(): Psychographics {
  return {
    values: ['sustainability', 'efficiency'],
    interests: ['fitness', 'tech'],
    lifestyle: ['active', 'health-conscious'],
    personalityTraits: ['curious', 'driven'],
    attitudes: ['optimistic'],
    opinions: ['values transparency'],
  };
}

function makePainPoint(): PainPoint {
  return {
    painId: 'pp_1',
    category: 'functional',
    description: 'Takes too long to set up',
    severity: 7,
    frequency: 'daily',
    currentSolution: 'Manual spreadsheets',
  };
}

function makeChannelAffinity(): ChannelAffinity {
  return {
    channel: 'tiktok',
    affinity: 85,
    preferredContent: ['video', 'image'],
    bestTimeToReach: '7-10pm',
    avgSessionDuration: 600,
  };
}

function makeBuyingBehavior(): BuyingBehavior {
  return {
    motivation: 'quality',
    researchDepth: 'moderate',
    decisionSpeed: 'considered',
    priceSensitivity: 6,
    brandLoyalty: 5,
    reviewReliance: 7,
    socialProofReliance: 8,
  };
}

function makePersona(overrides: Partial<Persona> = {}): Persona {
  return {
    personaId: 'p_1',
    name: 'Budget-Conscious Brian',
    archetype: 'decision_maker',
    tagline: 'ROI first, always.',
    description: 'A pragmatic manager who optimizes for measurable outcomes.',
    demographics: makeDemographics(),
    psychographics: makePsychographics(),
    painPoints: [makePainPoint()],
    channelAffinities: [makeChannelAffinity()],
    buyingBehavior: makeBuyingBehavior(),
    keyMessages: ['Save 10 hours a week', 'ROI in 30 days'],
    preferredTone: ['confident', 'data-driven'],
    preferredFormats: ['video', 'image'],
    objections: [{ objection: 'Too expensive', rebuttal: 'Pays for itself in 30 days' }],
    successStories: ['Notion — product-led growth'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('Audience Persona Engine', () => {
  test('Persona structure validation (all fields)', () => {
    const p = makePersona();
    assert.ok(p.personaId);
    assert.ok(p.name);
    assert.ok(p.archetype);
    assert.ok(p.tagline);
    assert.ok(p.description);
    assert.ok(Array.isArray(p.painPoints));
    assert.ok(Array.isArray(p.channelAffinities));
    assert.ok(Array.isArray(p.keyMessages));
    assert.ok(Array.isArray(p.preferredTone));
    assert.ok(Array.isArray(p.preferredFormats));
    assert.ok(Array.isArray(p.objections));
    assert.ok(Array.isArray(p.successStories));
    assert.ok(p.createdAt);
  });

  test('Demographics structure validation', () => {
    const d = makeDemographics();
    assert.ok(d.ageRange.min <= d.ageRange.max);
    assert.ok(['male', 'female', 'all', 'non-binary'].includes(d.gender));
    assert.ok(['low', 'lower_middle', 'middle', 'upper_middle', 'high'].includes(d.incomeLevel));
    assert.ok(['high_school', 'some_college', 'bachelors', 'masters', 'doctorate'].includes(d.education));
    assert.ok(['urban', 'suburban', 'rural', 'global'].includes(d.location));
    assert.equal(typeof d.occupation, 'string');
    assert.ok(['single', 'married', 'parent', 'empty_nester'].includes(d.familyStatus!));
  });

  test('Psychographics structure validation', () => {
    const ps = makePsychographics();
    assert.ok(Array.isArray(ps.values));
    assert.ok(Array.isArray(ps.interests));
    assert.ok(Array.isArray(ps.lifestyle));
    assert.ok(Array.isArray(ps.personalityTraits));
    assert.ok(Array.isArray(ps.attitudes));
    assert.ok(Array.isArray(ps.opinions));
    assert.ok(ps.values.length > 0);
  });

  test('PainPoint structure validation', () => {
    const pp = makePainPoint();
    assert.ok(pp.painId);
    assert.ok(['functional', 'emotional', 'social', 'financial', 'time'].includes(pp.category));
    assert.ok(pp.severity >= 1 && pp.severity <= 10);
    assert.ok(['daily', 'weekly', 'monthly', 'occasionally'].includes(pp.frequency));
    assert.equal(typeof pp.currentSolution, 'string');
  });

  test('ChannelAffinity structure validation', () => {
    const ca = makeChannelAffinity();
    assert.ok(ca.channel);
    assert.ok(ca.affinity >= 0 && ca.affinity <= 100);
    assert.ok(Array.isArray(ca.preferredContent));
    assert.ok(typeof ca.bestTimeToReach === 'string');
    assert.ok(ca.avgSessionDuration >= 0);
  });

  test('BuyingBehavior structure validation', () => {
    const bb = makeBuyingBehavior();
    assert.ok(bb.motivation);
    assert.ok(['minimal', 'moderate', 'extensive'].includes(bb.researchDepth));
    assert.ok(['impulse', 'quick', 'considered', 'lengthy'].includes(bb.decisionSpeed));
    assert.ok(bb.priceSensitivity >= 1 && bb.priceSensitivity <= 10);
    assert.ok(bb.brandLoyalty >= 1 && bb.brandLoyalty <= 10);
    assert.ok(bb.reviewReliance >= 1 && bb.reviewReliance <= 10);
    assert.ok(bb.socialProofReliance >= 1 && bb.socialProofReliance <= 10);
  });

  test('PersonaOverlap structure validation', () => {
    const a = makePersona();
    const b = makePersona({ personaId: 'p_2', name: 'Other', channelAffinities: [{ ...makeChannelAffinity(), channel: 'instagram' }] });
    const o = calculatePersonaOverlap(a, b);
    assert.ok(o.personaA);
    assert.ok(o.personaB);
    assert.ok(o.overlapScore >= 0 && o.overlapScore <= 100);
    assert.ok(Array.isArray(o.sharedChannels));
    assert.ok(Array.isArray(o.sharedInterests));
    assert.ok(Array.isArray(o.sharedPainPoints));
    assert.ok(typeof o.recommendation === 'string');
  });

  test('TargetingRecommendation structure validation', () => {
    const recs = generateTargetingRecommendations([makePersona()]);
    assert.ok(recs.length > 0);
    const r: TargetingRecommendation = recs[0];
    assert.ok(r.platform);
    assert.ok(r.audienceSize >= 0);
    assert.ok(Array.isArray(r.targetingCriteria));
    assert.ok(r.lookalikePotential >= 0 && r.lookalikePotential <= 100);
    assert.ok(r.estimatedCpm >= 0);
    assert.ok(Array.isArray(r.bestAdFormats));
    assert.equal(typeof r.recommended, 'boolean');
    assert.ok(typeof r.reasoning === 'string');
  });

  test('PersonaEngineResult complete structure validation', () => {
    const personas = [makePersona(), makePersona({ personaId: 'p_2', name: 'Second' })];
    const result: PersonaEngineResult = {
      personas,
      overlaps: [calculatePersonaOverlap(personas[0], personas[1])],
      targetingRecommendations: generateTargetingRecommendations(personas),
      insights: [{
        insightId: 'ins_1',
        type: 'audience_insight',
        title: 'Younger skew',
        description: 'Most personas skew 25-34.',
        actionableRecommendation: 'Lead with short-form video.',
      }],
      creativeAdaptations: generateCreativeAdaptations(personas),
    };
    assert.ok(Array.isArray(result.personas));
    assert.ok(Array.isArray(result.overlaps));
    assert.ok(Array.isArray(result.targetingRecommendations));
    assert.ok(Array.isArray(result.insights));
    assert.ok(Array.isArray(result.creativeAdaptations));
    assert.ok(result.insights[0].type === 'audience_insight');
  });

  test('Persona archetype types completeness (5 archetypes)', () => {
    const archetypes = getPersonaArchetypes();
    assert.equal(archetypes.length, 5);
    const ids = archetypes.map((a) => a.archetype);
    for (const a of ['decision_maker', 'influencer', 'end_user', 'gatekeeper', 'advocate'] as PersonaArchetype[]) {
      assert.ok(ids.includes(a), `missing archetype ${a}`);
    }
  });

  test('Channel preference types completeness (9 channels)', () => {
    const channels = getChannels();
    assert.equal(channels.length, 9);
    const ids = channels.map((c) => c.channel);
    for (const c of ['tiktok', 'instagram', 'youtube', 'facebook', 'linkedin', 'twitter', 'email', 'search', 'display'] as ChannelPreference[]) {
      assert.ok(ids.includes(c), `missing channel ${c}`);
    }
  });

  test('Content preference types completeness (6 types)', () => {
    const types: ContentPreference[] = ['video', 'image', 'text', 'interactive', 'podcast', 'live_stream'];
    assert.equal(types.length, 6);
  });

  test('Buying motivation types completeness (8 motivations)', () => {
    const motivations: BuyingMotivation[] = ['price', 'quality', 'convenience', 'status', 'social_proof', 'innovation', 'safety', 'experience'];
    assert.equal(motivations.length, 8);
  });

  test('Persona request validation (missing product name)', () => {
    const { valid, errors } = validatePersonaRequest({});
    assert.equal(valid, false);
    assert.ok(errors.includes('productName is required'));
  });

  test('Persona request validation (valid request)', () => {
    const { valid, errors } = validatePersonaRequest({ productName: 'Acme', numberOfPersonas: 3 });
    assert.equal(valid, true);
    assert.equal(errors.length, 0);
  });

  test('Persona request validation (out of range count)', () => {
    const { valid } = validatePersonaRequest({ productName: 'Acme', numberOfPersonas: 10 });
    assert.equal(valid, false);
  });

  test('Overlap score range (0-100)', () => {
    const a = makePersona();
    const b = makePersona({ personaId: 'p_2' });
    const o: PersonaOverlap = calculatePersonaOverlap(a, b);
    assert.ok(o.overlapScore >= 0 && o.overlapScore <= 100);
  });

  test('Overlap score identical personas = 100', () => {
    const a = makePersona();
    const o = calculatePersonaOverlap(a, a);
    assert.equal(o.overlapScore, 100);
  });

  test('Affinity score range (0-100)', () => {
    const ca = makeChannelAffinity();
    assert.ok(ca.affinity >= 0 && ca.affinity <= 100);
  });

  test('PERSONA_COST is 6', () => {
    assert.equal(PERSONA_COST, 6);
  });

  test('generateCreativeAdaptations produces per-persona guidance', () => {
    const personas = [makePersona()];
    const adaptations = generateCreativeAdaptations(personas);
    assert.equal(adaptations.length, 1);
    assert.ok(adaptations[0].hookStyle);
    assert.ok(adaptations[0].toneStyle);
    assert.ok(adaptations[0].ctaStyle);
    assert.ok(adaptations[0].formatRecommendation);
  });
});
