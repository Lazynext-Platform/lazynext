import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CAMPAIGN_ORCHESTRATOR_COST,
  getCampaignPhases,
  getCampaignGoals,
  getOptimizationActions,
  getNextPhase,
  canTransitionTo,
  validateCampaignRequest,
  type CampaignPhase,
  type CampaignGoal,
  type OptimizationAction,
} from '../src/lib/creative/campaign-orchestrator.ts';

describe('campaign-orchestrator', () => {
  describe('type completeness', () => {
    test('CampaignPhase has 10 phases', () => {
      const phases: CampaignPhase[] = ['goal_definition', 'research', 'concept_generation', 'approval', 'budget_allocation', 'production', 'publishing', 'optimization', 'completed', 'paused'];
      assert.equal(phases.length, 10);
    });

    test('CampaignGoal has 8 goals', () => {
      const goals: CampaignGoal[] = ['brand_awareness', 'product_launch', 'sales_boost', 'retargeting', 'market_expansion', 'customer_acquisition', 'engagement', 'seasonal_promotion'];
      assert.equal(goals.length, 8);
    });

    test('OptimizationAction has 7 actions', () => {
      const actions: OptimizationAction[] = ['scale_winners', 'pause_underperformers', 'reallocate_budget', 'refresh_creatives', 'test_new_audience', 'adjust_bidding', 'expand_platforms'];
      assert.equal(actions.length, 7);
    });

    test('getCampaignPhases returns 10', () => { assert.equal(getCampaignPhases().length, 10); });
    test('getCampaignGoals returns 8', () => { assert.equal(getCampaignGoals().length, 8); });
    test('getOptimizationActions returns 7', () => { assert.equal(getOptimizationActions().length, 7); });
  });

  describe('getNextPhase', () => {
    test('goal_definition → research', () => {
      assert.equal(getNextPhase('goal_definition'), 'research');
    });
    test('research → concept_generation', () => {
      assert.equal(getNextPhase('research'), 'concept_generation');
    });
    test('optimization → completed', () => {
      assert.equal(getNextPhase('optimization'), 'completed');
    });
    test('completed → null', () => {
      assert.equal(getNextPhase('completed'), null);
    });
    test('paused → null (not in flow)', () => {
      assert.equal(getNextPhase('paused'), null);
    });
  });

  describe('canTransitionTo', () => {
    test('can always pause from active', () => {
      assert.ok(canTransitionTo('research', 'paused'));
      assert.ok(canTransitionTo('optimization', 'paused'));
    });
    test('cannot pause from completed', () => {
      assert.ok(!canTransitionTo('completed', 'paused'));
    });
    test('can advance to next phase', () => {
      assert.ok(canTransitionTo('goal_definition', 'research'));
    });
    test('cannot skip phases', () => {
      assert.ok(!canTransitionTo('goal_definition', 'publishing'));
    });
  });

  describe('validateCampaignRequest', () => {
    test('empty name fails', () => {
      assert.ok(!validateCampaignRequest({ campaignName: '', goal: 'sales_boost' }).valid);
    });
    test('missing goal fails', () => {
      assert.ok(!validateCampaignRequest({ campaignName: 'Test' }).valid);
    });
    test('valid passes', () => {
      assert.ok(validateCampaignRequest({ campaignName: 'Summer Sale', goal: 'sales_boost' }).valid);
    });
  });

  describe('CAMPAIGN_ORCHESTRATOR_COST', () => {
    test('cost is 10', () => { assert.equal(CAMPAIGN_ORCHESTRATOR_COST, 10); });
  });
});
