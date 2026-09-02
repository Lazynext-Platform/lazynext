import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * TT-series smoke tests for creative designer libraries that previously lacked
 * dedicated unit tests. Each library follows the shared toolkit pattern:
 *   - a CREDIT_COST constant
 *   - a validate...Input function returning { valid, errors }
 *   - an async generate... function with a deterministic dry-run fallback
 *
 * Tests cover: export existence, input validation, and dry-run output structure.
 * No real LLM calls are made (dryRun: true is passed explicitly).
 */

// ── AIDA Framework Designer ──
import {
  AD_CREATIVE_AIDA_FRAMEWORK_DESIGNER_CREDIT_COST as AIDA_COST,
  validateAdCreativeAIDAFrameworkDesignerInput as validateAIDA,
  generateAIDAFramework,
  type AdCreativeAIDAFrameworkDesignerInput,
} from '@/lib/creative/ad-creative-aida-framework-designer';

const aidaInput: AdCreativeAIDAFrameworkDesignerInput = {
  productOrBrand: 'DTC skincare brand selling a vitamin C serum',
  targetAudience: 'Busy professional women aged 25-40 concerned about skin aging',
  platform: 'tiktok',
};

test('AIDA Framework Designer: CREDIT_COST is 3', () => {
  assert.equal(AIDA_COST, 3);
});

test('AIDA Framework Designer: validate rejects empty input', () => {
  const { valid, errors } = validateAIDA(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('AIDA Framework Designer: validate rejects missing productOrBrand', () => {
  const { valid, errors } = validateAIDA({ ...aidaInput, productOrBrand: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('AIDA Framework Designer: dry-run returns expected structure', async () => {
  const result = await generateAIDAFramework({ ...aidaInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(result.framework);
  assert.ok(result.framework.attention);
  assert.ok(result.framework.interest);
  assert.ok(result.framework.desire);
  assert.ok(result.framework.action);
  for (const stage of ['attention', 'interest', 'desire', 'action'] as const) {
    assert.ok(typeof result.framework[stage].copy === 'string' && result.framework[stage].copy.length > 0);
    assert.ok(typeof result.framework[stage].hook === 'string');
    assert.ok(typeof result.framework[stage].cta === 'string');
  }
});

test('AIDA Framework Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateAIDAFramework({ ...aidaInput, productOrBrand: '' } as AdCreativeAIDAFrameworkDesignerInput),
    /invalid_ad_creative_aida_framework_designer_input/,
  );
});

// ── Choice Simplifier Designer ──
import {
  AD_CREATIVE_CHOICE_SIMPLIFIER_DESIGNER_CREDIT_COST as CHOICE_COST,
  validateAdCreativeChoiceSimplifierDesignerInput as validateChoice,
  generateChoiceSimplification,
  type AdCreativeChoiceSimplifierDesignerInput,
} from '@/lib/creative/ad-creative-choice-simplifier-designer';

const choiceInput: AdCreativeChoiceSimplifierDesignerInput = {
  productOrBrand: 'A SaaS project management tool',
  targetAudience: 'Small business owners evaluating software',
  options: [
    { name: 'Basic', description: 'For solo founders', price: '$9/mo' },
    { name: 'Pro', description: 'For growing teams', price: '$29/mo' },
    { name: 'Enterprise', description: 'For large orgs', price: '$99/mo' },
  ],
};

test('Choice Simplifier Designer: CREDIT_COST is 3', () => {
  assert.equal(CHOICE_COST, 3);
});

test('Choice Simplifier Designer: validate rejects empty input', () => {
  const { valid, errors } = validateChoice(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Choice Simplifier Designer: validate rejects missing productOrBrand', () => {
  const { valid, errors } = validateChoice({ ...choiceInput, productOrBrand: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('Choice Simplifier Designer: dry-run returns expected structure', async () => {
  const result = await generateChoiceSimplification({ ...choiceInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(result.recommendedOption);
  assert.ok(result.simplificationCopy);
  assert.ok(typeof result.simplificationCopy.headline === 'string');
  assert.ok(typeof result.simplificationCopy.body === 'string');
  assert.ok(typeof result.simplificationCopy.cta === 'string');
  assert.ok(Array.isArray(result.decisionTree));
  assert.ok(typeof result.cognitiveLoadReduction === 'string');
});

test('Choice Simplifier Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateChoiceSimplification({ ...choiceInput, productOrBrand: '' } as AdCreativeChoiceSimplifierDesignerInput),
    /invalid_ad_creative_choice_simplifier_designer_input/,
  );
});

// ── Future Pacing Designer ──
import {
  AD_CREATIVE_FUTURE_PACING_DESIGNER_CREDIT_COST as FUTURE_COST,
  validateAdCreativeFuturePacingDesignerInput as validateFuture,
  generateFuturePacing,
  type AdCreativeFuturePacingDesignerInput,
} from '@/lib/creative/ad-creative-future-pacing-designer';

const futureInput: AdCreativeFuturePacingDesignerInput = {
  productOrBrand: 'A meditation app',
  targetAudience: 'Stressed professionals',
  desiredOutcome: 'Feeling calm and focused every morning',
};

test('Future Pacing Designer: CREDIT_COST is 4', () => {
  assert.equal(FUTURE_COST, 4);
});

test('Future Pacing Designer: validate rejects empty input', () => {
  const { valid, errors } = validateFuture(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Future Pacing Designer: validate rejects missing desiredOutcome', () => {
  const { valid, errors } = validateFuture({ ...futureInput, desiredOutcome: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_outcome_required'));
});

test('Future Pacing Designer: dry-run returns expected structure', async () => {
  const result = await generateFuturePacing({ ...futureInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(Array.isArray(result.futureScenarios));
  assert.ok(result.futureScenarios.length > 0);
  for (const s of result.futureScenarios) {
    assert.ok(typeof s.timeframe === 'string');
    assert.ok(typeof s.scenario === 'string');
    assert.ok(typeof s.sensoryDetails === 'string');
    assert.ok(typeof s.emotionalPayoff === 'string');
  }
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.hook === 'string');
  assert.ok(typeof result.adCopy.body === 'string');
  assert.ok(typeof result.adCopy.cta === 'string');
  assert.ok(typeof result.visualizationPrompt === 'string');
});

test('Future Pacing Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateFuturePacing({ ...futureInput, desiredOutcome: '' } as AdCreativeFuturePacingDesignerInput),
    /invalid_ad_creative_future_pacing_designer_input/,
  );
});

// ── Hook Story Offer Designer ──
import {
  AD_CREATIVE_HOOK_STORY_OFFER_DESIGNER_CREDIT_COST as HSO_COST,
  validateAdCreativeHookStoryOfferDesignerInput as validateHSO,
  generateHookStoryOffer,
  type AdCreativeHookStoryOfferDesignerInput,
} from '@/lib/creative/ad-creative-hook-story-offer-designer';

const hsoInput: AdCreativeHookStoryOfferDesignerInput = {
  productOrBrand: 'A meal prep delivery service',
  targetAudience: 'Busy parents',
  platform: 'instagram',
};

test('Hook Story Offer Designer: CREDIT_COST is 3', () => {
  assert.equal(HSO_COST, 3);
});

test('Hook Story Offer Designer: validate rejects empty input', () => {
  const { valid, errors } = validateHSO(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Hook Story Offer Designer: validate rejects missing productOrBrand', () => {
  const { valid, errors } = validateHSO({ ...hsoInput, productOrBrand: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_or_brand_required'));
});

test('Hook Story Offer Designer: dry-run returns expected structure', async () => {
  const result = await generateHookStoryOffer({ ...hsoInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(result.framework);
  assert.ok(result.framework.hook);
  assert.ok(typeof result.framework.hook.copy === 'string');
  assert.ok(typeof result.framework.hook.hookType === 'string');
  assert.ok(result.framework.story);
  assert.ok(typeof result.framework.story.copy === 'string');
  assert.ok(typeof result.framework.story.storyArc === 'string');
  assert.ok(result.framework.offer);
  assert.ok(typeof result.framework.offer.copy === 'string');
  assert.ok(typeof result.framework.offer.offerType === 'string');
  assert.ok(typeof result.framework.offer.cta === 'string');
});

test('Hook Story Offer Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateHookStoryOffer({ ...hsoInput, productOrBrand: '' } as AdCreativeHookStoryOfferDesignerInput),
    /invalid_ad_creative_hook_story_offer_designer_input/,
  );
});

// ── Implementation Intention Designer ──
import {
  AD_CREATIVE_IMPLEMENTATION_INTENTION_DESIGNER_CREDIT_COST as II_COST,
  validateAdCreativeImplementationIntentionDesignerInput as validateII,
  generateImplementationIntentions,
  type AdCreativeImplementationIntentionDesignerInput,
} from '@/lib/creative/ad-creative-implementation-intention-designer';

const iiInput: AdCreativeImplementationIntentionDesignerInput = {
  productOrBrand: 'A fitness app',
  targetAudience: 'Beginners looking to lose weight',
  desiredAction: 'Download the app and start the first workout',
  context: 'They are scrolling social media in the evening after work',
};

test('Implementation Intention Designer: CREDIT_COST is 3', () => {
  assert.equal(II_COST, 3);
});

test('Implementation Intention Designer: validate rejects empty input', () => {
  const { valid, errors } = validateII(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Implementation Intention Designer: validate rejects missing desiredAction', () => {
  const { valid, errors } = validateII({ ...iiInput, desiredAction: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('desired_action_required'));
});

test('Implementation Intention Designer: validate rejects missing context', () => {
  const { valid, errors } = validateII({ ...iiInput, context: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('context_required'));
});

test('Implementation Intention Designer: dry-run returns expected structure', async () => {
  const result = await generateImplementationIntentions({ ...iiInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(Array.isArray(result.ifThenPlans));
  assert.ok(result.ifThenPlans.length > 0);
  for (const p of result.ifThenPlans) {
    assert.ok(typeof p.trigger === 'string');
    assert.ok(typeof p.action === 'string');
    assert.ok(typeof p.timing === 'string');
    assert.ok(typeof p.frictionRemoval === 'string');
  }
  assert.ok(typeof result.bestPlan === 'string');
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.hook === 'string');
  assert.ok(typeof result.adCopy.body === 'string');
  assert.ok(typeof result.adCopy.cta === 'string');
  assert.ok(typeof result.commitmentDevice === 'string');
});

test('Implementation Intention Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateImplementationIntentions({ ...iiInput, desiredAction: '' } as AdCreativeImplementationIntentionDesignerInput),
    /invalid_ad_creative_implementation_intention_designer_input/,
  );
});

// ── Mental Accounting Designer ──
import {
  AD_CREATIVE_MENTAL_ACCOUNTING_DESIGNER_CREDIT_COST as MA_COST,
  validateAdCreativeMentalAccountingDesignerInput as validateMA,
  generateMentalAccountingReframes,
  type AdCreativeMentalAccountingDesignerInput,
} from '@/lib/creative/ad-creative-mental-accounting-designer';

const maInput: AdCreativeMentalAccountingDesignerInput = {
  productOrBrand: 'A premium standing desk',
  price: '$499',
  targetAudience: 'Remote workers',
};

test('Mental Accounting Designer: CREDIT_COST is 3', () => {
  assert.equal(MA_COST, 3);
});

test('Mental Accounting Designer: validate rejects empty input', () => {
  const { valid, errors } = validateMA(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Mental Accounting Designer: validate rejects missing price', () => {
  const { valid, errors } = validateMA({ ...maInput, price: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('price_required'));
});

test('Mental Accounting Designer: dry-run returns expected structure', async () => {
  const result = await generateMentalAccountingReframes({ ...maInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(Array.isArray(result.reframes));
  assert.ok(result.reframes.length > 0);
  for (const r of result.reframes) {
    assert.ok(typeof r.type === 'string');
    assert.ok(typeof r.frame === 'string');
    assert.ok(typeof r.calculation === 'string');
    assert.ok(typeof r.psychologicalEffect === 'string');
  }
  assert.ok(typeof result.bestReframe === 'string');
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.headline === 'string');
  assert.ok(typeof result.adCopy.body === 'string');
  assert.ok(typeof result.adCopy.cta === 'string');
});

test('Mental Accounting Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateMentalAccountingReframes({ ...maInput, price: '' } as AdCreativeMentalAccountingDesignerInput),
    /invalid_ad_creative_mental_accounting_designer_input/,
  );
});

// ── Pain of Paying Designer ──
import {
  AD_CREATIVE_PAIN_OF_PAYING_DESIGNER_CREDIT_COST as POP_COST,
  validateAdCreativePainOfPayingDesignerInput as validatePOP,
  generatePainOfPayingStrategies,
  type AdCreativePainOfPayingDesignerInput,
} from '@/lib/creative/ad-creative-pain-of-paying-designer';

const popInput: AdCreativePainOfPayingDesignerInput = {
  productOrBrand: 'An online course',
  price: '$297',
  targetAudience: 'Aspiring freelancers',
  paymentFrictionPoints: 'High upfront cost, fear of not completing the course',
};

test('Pain of Paying Designer: CREDIT_COST is 3', () => {
  assert.equal(POP_COST, 3);
});

test('Pain of Paying Designer: validate rejects empty input', () => {
  const { valid, errors } = validatePOP(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Pain of Paying Designer: validate rejects missing paymentFrictionPoints', () => {
  const { valid, errors } = validatePOP({ ...popInput, paymentFrictionPoints: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('payment_friction_points_required'));
});

test('Pain of Paying Designer: dry-run returns expected structure', async () => {
  const result = await generatePainOfPayingStrategies({ ...popInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(Array.isArray(result.strategies));
  assert.ok(result.strategies.length > 0);
  for (const s of result.strategies) {
    assert.ok(typeof s.type === 'string');
    assert.ok(typeof s.description === 'string');
    assert.ok(typeof s.copy === 'string');
    assert.ok(typeof s.psychologicalPrinciple === 'string');
  }
  assert.ok(typeof result.bestStrategy === 'string');
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.headline === 'string');
  assert.ok(typeof result.adCopy.body === 'string');
  assert.ok(typeof result.adCopy.cta === 'string');
});

test('Pain of Paying Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generatePainOfPayingStrategies({ ...popInput, paymentFrictionPoints: '' } as AdCreativePainOfPayingDesignerInput),
    /invalid_ad_creative_pain_of_paying_designer_input/,
  );
});

// ── Unique Mechanism Designer ──
import {
  AD_CREATIVE_UNIQUE_MECHANISM_DESIGNER_CREDIT_COST as UM_COST,
  validateAdCreativeUniqueMechanismDesignerInput as validateUM,
  generateUniqueMechanism,
  type AdCreativeUniqueMechanismDesignerInput,
} from '@/lib/creative/ad-creative-unique-mechanism-designer';

const umInput: AdCreativeUniqueMechanismDesignerInput = {
  productOrBrand: 'A hair growth serum',
  productDescription: 'A topical serum with a patented peptide complex that targets follicle stem cells.',
  targetAudience: 'Men experiencing early hair thinning',
};

test('Unique Mechanism Designer: CREDIT_COST is 4', () => {
  assert.equal(UM_COST, 4);
});

test('Unique Mechanism Designer: validate rejects empty input', () => {
  const { valid, errors } = validateUM(null as never);
  assert.equal(valid, false);
  assert.ok(errors.includes('input_required'));
});

test('Unique Mechanism Designer: validate rejects missing productDescription', () => {
  const { valid, errors } = validateUM({ ...umInput, productDescription: '' });
  assert.equal(valid, false);
  assert.ok(errors.includes('product_description_required'));
});

test('Unique Mechanism Designer: dry-run returns expected structure', async () => {
  const result = await generateUniqueMechanism({ ...umInput, dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(result.mechanism);
  assert.ok(typeof result.mechanism.name === 'string' && result.mechanism.name.length > 0);
  assert.ok(typeof result.mechanism.description === 'string');
  assert.ok(typeof result.mechanism.scientificBasis === 'string');
  assert.ok(Array.isArray(result.differentiationPoints));
  assert.ok(result.adCopy);
  assert.ok(typeof result.adCopy.headline === 'string');
  assert.ok(typeof result.adCopy.body === 'string');
  assert.ok(typeof result.adCopy.cta === 'string');
  assert.ok(Array.isArray(result.proofElements));
});

test('Unique Mechanism Designer: generate rejects invalid input', async () => {
  await assert.rejects(
    () => generateUniqueMechanism({ ...umInput, productDescription: '' } as AdCreativeUniqueMechanismDesignerInput),
    /invalid_ad_creative_unique_mechanism_designer_input/,
  );
});
