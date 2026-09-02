import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FATIGUE_COST,
  detectSignals,
  calculateFatigueScore,
  determineFatigueLevel,
  determineRefreshUrgency,
  calculatePortfolioHealth,
  analyzeCreativeFatigue,
  generateRotationSchedule,
  validateCreativeMetrics,
  getFatigueSignals,
  getFatigueLevels,
  type CreativeMetrics,
  type FatigueLevel,
  type FatigueSignal,
  type RefreshUrgency,
} from '../src/lib/creative/fatigue-detector.ts';

describe('fatigue-detector', () => {
  describe('type completeness', () => {
    test('FatigueLevel has 5 levels', () => {
      const levels: FatigueLevel[] = ['healthy', 'early_warning', 'fatigued', 'critical', 'unknown'];
      assert.equal(levels.length, 5);
    });

    test('FatigueSignal has 8 signals', () => {
      const signals: FatigueSignal[] = [
        'frequency_increase', 'ctr_decline', 'engagement_decline', 'conversion_decline',
        'impression_decay', 'roas_decline', 'relevance_score_drop', 'cost_increase',
      ];
      assert.equal(signals.length, 8);
    });

    test('RefreshUrgency has 5 urgencies', () => {
      const urgencies: RefreshUrgency[] = ['immediate', 'within_3_days', 'within_1_week', 'within_2_weeks', 'no_action_needed'];
      assert.equal(urgencies.length, 5);
    });

    test('getFatigueSignals returns 8 signals', () => {
      const signals = getFatigueSignals();
      assert.equal(signals.length, 8);
      for (const s of signals) {
        assert.ok(s.signal);
        assert.ok(s.name);
        assert.ok(s.description);
      }
    });

    test('getFatigueLevels returns 5 levels', () => {
      const levels = getFatigueLevels();
      assert.equal(levels.length, 5);
      for (const l of levels) {
        assert.ok(l.level);
        assert.ok(l.name);
        assert.ok(l.scoreRange);
        assert.ok(l.description);
      }
    });
  });

  describe('fatigue score calculation', () => {
    test('score is 0 when no signals detected', () => {
      const signals = [
        { signal: 'ctr_decline' as FatigueSignal, detected: false, severity: 50, currentValue: 2, baselineValue: 2, changePercent: 0, description: '' },
      ];
      assert.equal(calculateFatigueScore(signals), 0);
    });

    test('score increases with detected signals', () => {
      const signals = [
        { signal: 'ctr_decline' as FatigueSignal, detected: true, severity: 100, currentValue: 1, baselineValue: 2, changePercent: -50, description: '' },
      ];
      // weight for ctr_decline is 20, severity 100 => 20 * 1 = 20
      assert.equal(calculateFatigueScore(signals), 20);
    });

    test('score is capped at 100', () => {
      const signals: Array<{ signal: FatigueSignal; detected: boolean; severity: number; currentValue: number; baselineValue: number; changePercent: number; description: string }> = [
        { signal: 'ctr_decline', detected: true, severity: 100, currentValue: 0, baselineValue: 2, changePercent: -100, description: '' },
        { signal: 'engagement_decline', detected: true, severity: 100, currentValue: 0, baselineValue: 2, changePercent: -100, description: '' },
        { signal: 'conversion_decline', detected: true, severity: 100, currentValue: 0, baselineValue: 2, changePercent: -100, description: '' },
        { signal: 'roas_decline', detected: true, severity: 100, currentValue: 0, baselineValue: 2, changePercent: -100, description: '' },
        { signal: 'frequency_increase', detected: true, severity: 100, currentValue: 5, baselineValue: 1, changePercent: 400, description: '' },
        { signal: 'cost_increase', detected: true, severity: 100, currentValue: 5, baselineValue: 1, changePercent: 400, description: '' },
      ];
      assert.ok(calculateFatigueScore(signals) <= 100);
    });
  });

  describe('fatigue level thresholds', () => {
    test('0-20 is healthy', () => {
      assert.equal(determineFatigueLevel(0), 'healthy');
      assert.equal(determineFatigueLevel(20), 'healthy');
    });

    test('21-40 is early_warning', () => {
      assert.equal(determineFatigueLevel(21), 'early_warning');
      assert.equal(determineFatigueLevel(40), 'early_warning');
    });

    test('41-70 is fatigued', () => {
      assert.equal(determineFatigueLevel(41), 'fatigued');
      assert.equal(determineFatigueLevel(70), 'fatigued');
    });

    test('71-100 is critical', () => {
      assert.equal(determineFatigueLevel(71), 'critical');
      assert.equal(determineFatigueLevel(100), 'critical');
    });
  });

  describe('refresh urgency', () => {
    test('critical -> immediate', () => {
      assert.equal(determineRefreshUrgency('critical', 10), 'immediate');
    });

    test('fatigued with long running -> within_3_days', () => {
      assert.equal(determineRefreshUrgency('fatigued', 20), 'within_3_days');
    });

    test('fatigued with short running -> within_1_week', () => {
      assert.equal(determineRefreshUrgency('fatigued', 5), 'within_1_week');
    });

    test('early_warning -> within_2_weeks', () => {
      assert.equal(determineRefreshUrgency('early_warning', 5), 'within_2_weeks');
    });

    test('healthy -> no_action_needed', () => {
      assert.equal(determineRefreshUrgency('healthy', 5), 'no_action_needed');
    });
  });

  describe('signal detection', () => {
    const baseCreative: CreativeMetrics = {
      creativeId: 'c1', creativeName: 'Test', platform: 'meta',
      currentFrequency: 1.5, currentCtr: 2.0, currentCvr: 5.0,
      currentEngagementRate: 8.0, currentRoas: 3.0, currentCpm: 10,
      historicalData: [{ period: 'w1', frequency: 1.5, ctr: 2.0, cvr: 5.0, engagementRate: 8.0, roas: 3.0, cpm: 10, impressions: 10000, clicks: 200, conversions: 10, spend: 100 }],
      daysRunning: 7, totalImpressions: 10000, totalSpend: 100,
    };

    test('CTR decline > 20% is detected', () => {
      const c = { ...baseCreative, currentCtr: 1.5 }; // 25% decline
      const signals = detectSignals(c);
      const ctrSignal = signals.find((s) => s.signal === 'ctr_decline');
      assert.ok(ctrSignal?.detected);
    });

    test('CTR decline < 20% is not detected', () => {
      const c = { ...baseCreative, currentCtr: 1.8 }; // 10% decline
      const signals = detectSignals(c);
      const ctrSignal = signals.find((s) => s.signal === 'ctr_decline');
      assert.ok(!ctrSignal?.detected);
    });

    test('engagement decline > 25% is detected', () => {
      const c = { ...baseCreative, currentEngagementRate: 5.0 }; // 37.5% decline
      const signals = detectSignals(c);
      const engSignal = signals.find((s) => s.signal === 'engagement_decline');
      assert.ok(engSignal?.detected);
    });

    test('ROAS decline > 20% is detected', () => {
      const c = { ...baseCreative, currentRoas: 2.0 }; // 33% decline
      const signals = detectSignals(c);
      const roasSignal = signals.find((s) => s.signal === 'roas_decline');
      assert.ok(roasSignal?.detected);
    });

    test('cost increase > 25% is detected', () => {
      const c = { ...baseCreative, currentCpm: 15 }; // 50% increase
      const signals = detectSignals(c);
      const costSignal = signals.find((s) => s.signal === 'cost_increase');
      assert.ok(costSignal?.detected);
    });

    test('frequency increase > 50% is detected', () => {
      const c = { ...baseCreative, currentFrequency: 3.0 }; // 100% increase
      const signals = detectSignals(c);
      const freqSignal = signals.find((s) => s.signal === 'frequency_increase');
      assert.ok(freqSignal?.detected);
    });
  });

  describe('analyzeCreativeFatigue', () => {
    test('returns complete analysis structure', () => {
      const c: CreativeMetrics = {
        creativeId: 'c1', creativeName: 'Test', platform: 'meta',
        currentFrequency: 1.5, currentCtr: 2.0, currentCvr: 5.0,
        currentEngagementRate: 8.0, currentRoas: 3.0, currentCpm: 10,
        historicalData: [], daysRunning: 7, totalImpressions: 10000, totalSpend: 100,
      };
      const a = analyzeCreativeFatigue(c);
      assert.ok(a.creativeId);
      assert.ok(a.creativeName);
      assert.ok(a.platform);
      assert.ok(a.fatigueLevel);
      assert.ok(typeof a.fatigueScore === 'number');
      assert.ok(Array.isArray(a.signals));
      assert.ok(Array.isArray(a.activeSignals));
      assert.ok(a.refreshUrgency);
      assert.ok(typeof a.daysUntilRefresh === 'number');
      assert.ok(typeof a.estimatedPerformanceLoss === 'number');
      assert.ok(typeof a.projectedDeclineRate === 'number');
      assert.ok(a.recommendation);
      assert.ok(Array.isArray(a.refreshSuggestions));
      assert.ok(a.analyzedAt);
    });
  });

  describe('portfolio health', () => {
    test('empty portfolio returns 100', () => {
      assert.equal(calculatePortfolioHealth([]), 100);
    });

    test('healthy creatives return high score', () => {
      const analyses = [
        { fatigueScore: 10, fatigueLevel: 'healthy' as FatigueLevel },
      ] as any;
      assert.equal(calculatePortfolioHealth(analyses), 90);
    });
  });

  describe('rotation schedule', () => {
    test('generates schedule with correct actions', () => {
      const analyses = [
        { creativeId: 'c1', creativeName: 'C1', fatigueLevel: 'critical' as FatigueLevel, daysUntilRefresh: 0, fatigueScore: 80 },
        { creativeId: 'c2', creativeName: 'C2', fatigueLevel: 'healthy' as FatigueLevel, daysUntilRefresh: 30, fatigueScore: 10 },
      ] as any;
      const schedule = generateRotationSchedule(analyses);
      assert.equal(schedule.length, 2);
      assert.ok(schedule[0].action);
    });
  });

  describe('validation', () => {
    test('missing creativeId fails', () => {
      const r = validateCreativeMetrics({ creativeName: 'Test' });
      assert.ok(!r.valid);
      assert.ok(r.errors.length > 0);
    });

    test('valid creative passes', () => {
      const r = validateCreativeMetrics({
        creativeId: 'c1', creativeName: 'Test',
        currentFrequency: 1, currentCtr: 2,
      });
      assert.ok(r.valid);
    });
  });

  describe('FATIGUE_COST', () => {
    test('cost is 5', () => {
      assert.equal(FATIGUE_COST, 5);
    });
  });
});
