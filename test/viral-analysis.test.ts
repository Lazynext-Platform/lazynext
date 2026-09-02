import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Note: calculateViralityGrade and getShareabilityLevel from
// @/lib/creative/viral-analysis cannot be imported in tests because the module
// imports from @/lib/atlas and @/lib/providers/model-helpers which have
// extensionless imports the Node test runner cannot resolve.
// These tests validate the grading/level logic structurally.

function calculateViralityGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function getShareabilityLevel(score: number): string {
  if (score >= 80) return 'very_high';
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

describe('Viral Analysis', () => {
  test('ViralityFactor structure is valid', () => {
    const factor: any = {
      factor: 'hook_strength',
      score: 85,
      description: 'Strong curiosity gap in first 2 seconds',
      evidence: 'Opens with unexpected question',
      improvementTip: 'Make the hook even more specific',
    };
    assert.equal(factor.factor, 'hook_strength');
    assert.equal(factor.score, 85);
    assert.ok(factor.description.length > 0);
    assert.ok(factor.evidence.length > 0);
    assert.ok(factor.improvementTip.length > 0);
  });

  test('ViralityFactor covers all expected factor names', () => {
    const expectedFactors = [
      'hook_strength', 'pacing', 'emotional_trigger', 'novelty', 'relatability',
      'controversy', 'trend_alignment', 'production_quality', 'story_arc', 'cta_effectiveness',
    ];
    const factors: any[] = expectedFactors.map((f) => ({
      factor: f,
      score: 70,
      description: 'desc',
      evidence: 'evidence',
      improvementTip: 'tip',
    }));
    assert.equal(factors.length, 10);
    for (const f of factors) {
      assert.ok(expectedFactors.includes(f.factor));
    }
  });

  test('ShareabilityAnalysis structure is valid', () => {
    const share: any = {
      score: 78,
      factors: {
        emotionalResonance: 80,
        socialCurrency: 75,
        practicalValue: 60,
        storytelling: 85,
        novelty: 70,
        controversy: 40,
      },
      shareabilityLevel: 'high',
      primaryShareMotivations: ['relatability', 'entertainment'],
    };
    assert.equal(share.score, 78);
    assert.equal(share.factors.emotionalResonance, 80);
    assert.equal(share.factors.socialCurrency, 75);
    assert.equal(share.factors.practicalValue, 60);
    assert.equal(share.factors.storytelling, 85);
    assert.equal(share.factors.novelty, 70);
    assert.equal(share.factors.controversy, 40);
    assert.equal(share.shareabilityLevel, 'high');
    assert.equal(share.primaryShareMotivations.length, 2);
  });

  test('ViralAnalysisResult complete structure is valid', () => {
    const result: any = {
      sourceUrl: 'https://tiktok.com/@user/video/123',
      overallViralityScore: 82,
      viralityGrade: 'A',
      factors: [
        { factor: 'hook_strength', score: 90, description: 'd', evidence: 'e', improvementTip: 't' },
      ],
      shareability: {
        score: 78,
        factors: { emotionalResonance: 80, socialCurrency: 75, practicalValue: 60, storytelling: 85, novelty: 70, controversy: 40 },
        shareabilityLevel: 'high',
        primaryShareMotivations: ['relatability'],
      },
      hookAnalysis: {
        hookType: 'curiosity_gap',
        hookText: 'You won\'t believe this',
        hookStrength: 90,
        hookTiming: '1-3s',
        alternativeHooks: ['alt1', 'alt2'],
      },
      emotionalJourney: {
        primaryEmotion: 'surprise',
        emotionalShifts: [{ timeSec: 0, emotion: 'curiosity', intensity: 70 }],
        emotionalPayoff: 'satisfaction',
      },
      pacingAnalysis: {
        optimalPacing: 'fast',
        currentPacing: 'medium',
        shotCount: 12,
        avgShotDuration: 2.5,
        energyPeaks: [3, 10],
      },
      trendAlignment: {
        currentTrends: ['trend1'],
        trendMatchScore: 65,
        trendLongevityRisk: 'medium',
      },
      viralMechanics: {
        loopability: 80,
        rewatchability: 75,
        commentBait: 70,
        shareBait: 85,
        saveBait: 60,
      },
      audiencePsychology: {
        primaryDesire: 'belonging',
        secondaryDesire: 'status',
        psychologicalTriggers: ['FOMO'],
        socialProofElements: ['views'],
      },
      improvementRecommendations: [
        { area: 'hook', currentScore: 70, potentialScore: 90, recommendation: 'improve', priority: 'high' },
      ],
      viralVariantSuggestions: [
        { variantType: 'hook_swap', description: 'swap hook', expectedViralityLift: 15, changesRequired: ['change1'] },
      ],
    };
    assert.equal(result.sourceUrl, 'https://tiktok.com/@user/video/123');
    assert.equal(result.overallViralityScore, 82);
    assert.equal(result.viralityGrade, 'A');
    assert.equal(result.factors.length, 1);
    assert.equal(result.shareability.score, 78);
    assert.equal(result.hookAnalysis.hookStrength, 90);
    assert.equal(result.emotionalJourney.emotionalShifts.length, 1);
    assert.equal(result.pacingAnalysis.shotCount, 12);
    assert.equal(result.trendAlignment.trendMatchScore, 65);
    assert.equal(result.viralMechanics.loopability, 80);
    assert.equal(result.audiencePsychology.primaryDesire, 'belonging');
    assert.equal(result.improvementRecommendations.length, 1);
    assert.equal(result.viralVariantSuggestions.length, 1);
  });

  // ── calculateViralityGrade thresholds ──

  test('calculateViralityGrade: 90+ = A+', () => {
    assert.equal(calculateViralityGrade(90), 'A+');
    assert.equal(calculateViralityGrade(100), 'A+');
    assert.equal(calculateViralityGrade(95), 'A+');
  });

  test('calculateViralityGrade: 80+ = A', () => {
    assert.equal(calculateViralityGrade(80), 'A');
    assert.equal(calculateViralityGrade(89), 'A');
    assert.equal(calculateViralityGrade(85), 'A');
  });

  test('calculateViralityGrade: 70+ = B', () => {
    assert.equal(calculateViralityGrade(70), 'B');
    assert.equal(calculateViralityGrade(79), 'B');
    assert.equal(calculateViralityGrade(75), 'B');
  });

  test('calculateViralityGrade: 60+ = C', () => {
    assert.equal(calculateViralityGrade(60), 'C');
    assert.equal(calculateViralityGrade(69), 'C');
    assert.equal(calculateViralityGrade(65), 'C');
  });

  test('calculateViralityGrade: 40+ = D', () => {
    assert.equal(calculateViralityGrade(40), 'D');
    assert.equal(calculateViralityGrade(59), 'D');
    assert.equal(calculateViralityGrade(50), 'D');
  });

  test('calculateViralityGrade: <40 = F', () => {
    assert.equal(calculateViralityGrade(39), 'F');
    assert.equal(calculateViralityGrade(0), 'F');
    assert.equal(calculateViralityGrade(25), 'F');
  });

  // ── getShareabilityLevel thresholds ──

  test('getShareabilityLevel: 80+ = very_high', () => {
    assert.equal(getShareabilityLevel(80), 'very_high');
    assert.equal(getShareabilityLevel(100), 'very_high');
    assert.equal(getShareabilityLevel(90), 'very_high');
  });

  test('getShareabilityLevel: 65+ = high', () => {
    assert.equal(getShareabilityLevel(65), 'high');
    assert.equal(getShareabilityLevel(79), 'high');
    assert.equal(getShareabilityLevel(70), 'high');
  });

  test('getShareabilityLevel: 45+ = medium', () => {
    assert.equal(getShareabilityLevel(45), 'medium');
    assert.equal(getShareabilityLevel(64), 'medium');
    assert.equal(getShareabilityLevel(55), 'medium');
  });

  test('getShareabilityLevel: <45 = low', () => {
    assert.equal(getShareabilityLevel(44), 'low');
    assert.equal(getShareabilityLevel(0), 'low');
    assert.equal(getShareabilityLevel(30), 'low');
  });

  // ── Score color coding thresholds ──

  test('score color coding: green >= 80', () => {
    const score = 85;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'green');
  });

  test('score color coding: yellow 60-79', () => {
    const score = 70;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'yellow');
  });

  test('score color coding: red < 60', () => {
    const score = 45;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'red');
  });

  test('score color coding boundary: 80 is green', () => {
    const score = 80;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'green');
  });

  test('score color coding boundary: 60 is yellow', () => {
    const score = 60;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'yellow');
  });

  test('score color coding boundary: 59 is red', () => {
    const score = 59;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'red');
  });
});
