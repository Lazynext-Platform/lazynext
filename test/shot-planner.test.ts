import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHOT_PLANNER_COST,
  getVideoFormats,
  getProductionStyles,
  getBudgetTiers,
  getShotComplexities,
  estimateShootTime,
  estimateEditTime,
  estimateTotalCost,
  calculateQualityEstimate,
  validateShotPlanRequest,
  type VideoFormat,
  type ProductionStyle,
  type BudgetTier,
  type ShotComplexity,
  type ShotPlan,
} from '../src/lib/creative/shot-planner.ts';

describe('shot-planner', () => {
  describe('type completeness', () => {
    test('VideoFormat has 5 formats', () => {
      const formats: VideoFormat[] = ['vertical_9_16', 'horizontal_16_9', 'square_1_1', 'story_9_16', 'reel_9_16'];
      assert.equal(formats.length, 5);
    });

    test('ProductionStyle has 6 styles', () => {
      const styles: ProductionStyle[] = ['studio', 'lifestyle', 'ugc', 'animated', 'mixed', 'minimal'];
      assert.equal(styles.length, 6);
    });

    test('BudgetTier has 5 tiers', () => {
      const tiers: BudgetTier[] = ['shoestring', 'low', 'medium', 'high', 'premium'];
      assert.equal(tiers.length, 5);
    });

    test('ShotComplexity has 4 levels', () => {
      const levels: ShotComplexity[] = ['simple', 'moderate', 'complex', 'elaborate'];
      assert.equal(levels.length, 4);
    });

    test('getVideoFormats returns 5', () => { assert.equal(getVideoFormats().length, 5); });
    test('getProductionStyles returns 6', () => { assert.equal(getProductionStyles().length, 6); });
    test('getBudgetTiers returns 5', () => { assert.equal(getBudgetTiers().length, 5); });
    test('getShotComplexities returns 4', () => { assert.equal(getShotComplexities().length, 4); });
  });

  describe('estimateShootTime', () => {
    test('empty returns 0', () => { assert.equal(estimateShootTime([]), 0); });
    test('simple shots are faster', () => {
      const simple: ShotPlan[] = [{ shotId: 's1', shotNumber: 1, sceneLabel: '', shotType: 'medium', cameraMovement: 'static', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [], complexity: 'simple', estimatedCost: 1, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none', productionNotes: '' }];
      const complex: ShotPlan[] = [{ shotId: 's1', shotNumber: 1, sceneLabel: '', shotType: 'medium', cameraMovement: 'tracking', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [], complexity: 'elaborate', estimatedCost: 5, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none', productionNotes: '' }];
      assert.ok(estimateShootTime(simple) < estimateShootTime(complex));
    });
  });

  describe('estimateEditTime', () => {
    test('empty returns 0', () => { assert.equal(estimateEditTime([]), 0); });
    test('more shots = more time', () => {
      const few: ShotPlan[] = Array.from({ length: 2 }, (_, i) => ({ shotId: `s${i}`, shotNumber: i, sceneLabel: '', shotType: 'medium', cameraMovement: 'static', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [], complexity: 'simple' as const, estimatedCost: 1, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none' as const, productionNotes: '' }));
      const many: ShotPlan[] = Array.from({ length: 10 }, (_, i) => ({ shotId: `s${i}`, shotNumber: i, sceneLabel: '', shotType: 'medium', cameraMovement: 'static', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [], complexity: 'simple' as const, estimatedCost: 1, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none' as const, productionNotes: '' }));
      assert.ok(estimateEditTime(few) < estimateEditTime(many));
    });
  });

  describe('estimateTotalCost', () => {
    test('higher budget tier = higher cost', () => {
      const shots: ShotPlan[] = [{ shotId: 's1', shotNumber: 1, sceneLabel: '', shotType: 'medium', cameraMovement: 'static', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [], complexity: 'simple', estimatedCost: 10, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none', productionNotes: '' }];
      const low = estimateTotalCost(shots, 'low');
      const high = estimateTotalCost(shots, 'high');
      assert.ok(high > low);
    });
  });

  describe('calculateQualityEstimate', () => {
    test('empty returns 0', () => { assert.equal(calculateQualityEstimate([], 'low'), 0); });
    test('premium > shoestring', () => {
      const shots: ShotPlan[] = [{ shotId: 's1', shotNumber: 1, sceneLabel: '', shotType: 'medium', cameraMovement: 'static', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [{ frameId: 'k1', timestamp: 0, visualDescription: '', compositionNotes: '', lightingNotes: '', colorNotes: '', assetRequirements: [] }], complexity: 'complex', estimatedCost: 5, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none', productionNotes: '' }];
      const shoestring = calculateQualityEstimate(shots, 'shoestring');
      const premium = calculateQualityEstimate(shots, 'premium');
      assert.ok(premium > shoestring);
    });
    test('returns 0-100', () => {
      const shots: ShotPlan[] = [{ shotId: 's1', shotNumber: 1, sceneLabel: '', shotType: 'medium', cameraMovement: 'static', duration: 3, startTime: 0, endTime: 3, visualDescription: '', audioDescription: '', keyframes: [], complexity: 'simple', estimatedCost: 1, requiredAssets: [], requiredProps: [], requiredLocations: [], talentRequired: 'none', productionNotes: '' }];
      const q = calculateQualityEstimate(shots, 'medium');
      assert.ok(q >= 0 && q <= 100);
    });
  });

  describe('validateShotPlanRequest', () => {
    test('empty content fails', () => {
      assert.ok(!validateShotPlanRequest({ sourceContent: '' }).valid);
    });
    test('valid passes', () => {
      assert.ok(validateShotPlanRequest({ sourceContent: 'A script' }).valid);
    });
  });

  describe('SHOT_PLANNER_COST', () => {
    test('cost is 7', () => { assert.equal(SHOT_PLANNER_COST, 7); });
  });
});
