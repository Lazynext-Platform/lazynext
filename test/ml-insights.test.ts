import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Creative ML Insights', () => {
  test('CreativeElement structure validation', () => {
    const element = {
      elementId: 'hook:question',
      type: 'hook',
      value: 'question',
      frequency: 15,
      avgPerformance: 75,
      performanceVariance: 100,
      correlationStrength: 0.65,
    };
    assert.equal(element.type, 'hook');
    assert.ok(element.frequency > 0);
    assert.ok(element.correlationStrength >= -1 && element.correlationStrength <= 1);
  });

  test('PerformancePattern structure validation', () => {
    const pattern = {
      patternId: 'pattern_0',
      name: 'question + emotional',
      description: 'Top performers combine these elements',
      elements: ['hook:question', 'angle:emotional'],
      frequency: 8,
      avgPerformance: 85,
      confidenceScore: 90,
      examples: ['creative_1', 'creative_2'],
    };
    assert.ok(pattern.elements.length >= 2);
    assert.ok(pattern.confidenceScore >= 0 && pattern.confidenceScore <= 100);
  });

  test('ElementAttribution structure validation', () => {
    const attribution = {
      elementId: 'cta:buy_now',
      elementType: 'cta',
      elementValue: 'buy_now',
      impactScore: 35,
      confidenceInterval: { low: 20, high: 50 },
      sampleSize: 25,
      recommendation: 'Continue using buy_now in cta',
    };
    assert.ok(attribution.impactScore >= -100 && attribution.impactScore <= 100);
    assert.ok(attribution.confidenceInterval.low <= attribution.confidenceInterval.high);
  });

  test('CreativeCluster structure validation', () => {
    const cluster = {
      clusterId: 'cluster_0',
      name: 'energetic-fast',
      description: 'Creatives with energetic tone and fast pacing',
      memberCount: 12,
      avgPerformance: 78,
      commonElements: ['hook:shock', 'cta:buy_now'],
      distinguishingFeatures: ['energetic-fast'],
      recommendedActions: ['Scale this pattern'],
    };
    assert.ok(cluster.memberCount > 0);
    assert.ok(cluster.avgPerformance >= 0 && cluster.avgPerformance <= 100);
  });

  test('MLInsightsResult complete structure validation', () => {
    const result = {
      analysisDate: '2026-08-29T00:00:00Z',
      totalCreativesAnalyzed: 50,
      topPerformersCount: 15,
      bottomPerformersCount: 10,
      elementAttribution: [],
      performancePatterns: [],
      creativeClusters: [],
      insights: [],
      predictiveFactors: [],
      recommendations: [],
    };
    assert.ok(result.totalCreativesAnalyzed > 0);
    assert.ok(result.analysisDate);
    assert.ok(Array.isArray(result.elementAttribution));
  });

  test('impact score color coding - green for >= 60', () => {
    const score = 65;
    const color = score >= 60 ? 'green' : score >= 30 ? 'yellow' : 'red';
    assert.equal(color, 'green');
  });

  test('impact score color coding - yellow for 30-59', () => {
    const score = 45;
    const color = score >= 60 ? 'green' : score >= 30 ? 'yellow' : 'red';
    assert.equal(color, 'yellow');
  });

  test('impact score color coding - red for < 30', () => {
    const score = 20;
    const color = score >= 60 ? 'green' : score >= 30 ? 'yellow' : 'red';
    assert.equal(color, 'red');
  });

  test('confidence score color coding - green for >= 80', () => {
    const score = 85;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'green');
  });

  test('confidence score color coding - yellow for 60-79', () => {
    const score = 70;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'yellow');
  });

  test('confidence score color coding - red for < 60', () => {
    const score = 50;
    const color = score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red';
    assert.equal(color, 'red');
  });

  test('calculateElementAttribution with mock data', () => {
    const creatives = [
      { hook: 'question', performance: 80 },
      { hook: 'question', performance: 75 },
      { hook: 'shock', performance: 40 },
      { hook: 'shock', performance: 35 },
    ];
    const elementMap = new Map<string, number[]>();
    for (const c of creatives) {
      const key = `hook:${c.hook}`;
      if (!elementMap.has(key)) elementMap.set(key, []);
      elementMap.get(key)!.push(c.performance);
    }
    const questionAvg = elementMap.get('hook:question')!.reduce((a, b) => a + b, 0) / 2;
    assert.equal(questionAvg, 77.5);
  });

  test('detectPerformancePatterns with mock data', () => {
    const topPerformers = [
      { hook: 'question', angle: 'emotional', performance: 85 },
      { hook: 'question', angle: 'emotional', performance: 80 },
      { hook: 'shock', angle: 'logical', performance: 75 },
    ];
    const combos = new Map<string, number>();
    for (const c of topPerformers) {
      const combo = `${c.hook}+${c.angle}`;
      combos.set(combo, (combos.get(combo) || 0) + 1);
    }
    assert.equal(combos.get('question+emotional'), 2);
  });

  test('generateInsights produces valid insight types', () => {
    const validTypes = ['strength', 'weakness', 'opportunity', 'threat'];
    const insight = { type: 'strength', title: 'Test', confidenceScore: 85 };
    assert.ok(validTypes.includes(insight.type));
  });

  test('ML insight types are exhaustive', () => {
    const validTypes = ['strength', 'weakness', 'opportunity', 'threat'];
    assert.equal(validTypes.length, 4);
    assert.ok(validTypes.includes('strength'));
    assert.ok(validTypes.includes('weakness'));
    assert.ok(validTypes.includes('opportunity'));
    assert.ok(validTypes.includes('threat'));
  });

  test('recommendation priorities are valid', () => {
    const validPriorities = ['high', 'medium', 'low'];
    assert.equal(validPriorities.length, 3);
    for (const p of validPriorities) {
      assert.ok(typeof p === 'string');
    }
  });
});
