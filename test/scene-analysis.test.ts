import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENE_ANALYSIS_COST,
  getSceneTypes,
  getShotTypes,
  getCameraMovements,
  getSceneMoods,
  calculatePacingPattern,
  calculateOverallEffectiveness,
  calculateHookTime,
  validateSceneAnalysisRequest,
  type SceneType,
  type ShotType,
  type CameraMovement,
  type SceneMood,
  type SceneSegment,
} from '../src/lib/creative/scene-analysis.ts';

describe('scene-analysis', () => {
  describe('type completeness', () => {
    test('SceneType has 14 types', () => {
      const types: SceneType[] = ['hook', 'product_reveal', 'demo', 'testimonial', 'comparison', 'lifestyle', 'problem', 'solution', 'social_proof', 'cta', 'transition', 'branding', 'emotional_beat', 'data_visualization'];
      assert.equal(types.length, 14);
    });

    test('ShotType has 8 types', () => {
      const types: ShotType[] = ['wide', 'medium', 'close_up', 'extreme_close_up', 'overhead', 'pov', 'two_shot', 'insert'];
      assert.equal(types.length, 8);
    });

    test('CameraMovement has 10 movements', () => {
      const movements: CameraMovement[] = ['static', 'pan', 'tilt', 'zoom_in', 'zoom_out', 'tracking', 'handheld', 'dolly', 'crane', 'whip_pan'];
      assert.equal(movements.length, 10);
    });

    test('SceneMood has 10 moods', () => {
      const moods: SceneMood[] = ['energetic', 'calm', 'dramatic', 'playful', 'luxurious', 'urgent', 'inspirational', 'mysterious', 'authentic', 'professional'];
      assert.equal(moods.length, 10);
    });

    test('getSceneTypes returns 14', () => { assert.equal(getSceneTypes().length, 14); });
    test('getShotTypes returns 8', () => { assert.equal(getShotTypes().length, 8); });
    test('getCameraMovements returns 10', () => { assert.equal(getCameraMovements().length, 10); });
    test('getSceneMoods returns 10', () => { assert.equal(getSceneMoods().length, 10); });
  });

  describe('calculatePacingPattern', () => {
    test('empty returns medium', () => {
      assert.equal(calculatePacingPattern([]), 'medium');
    });
    test('short avg = fast_cut', () => {
      const scenes: SceneSegment[] = Array.from({ length: 5 }, (_, i) => ({
        sceneId: `s${i}`, sceneIndex: i, sceneType: 'hook' as SceneType, startTime: i * 2, endTime: i * 2 + 2, duration: 2, title: '', description: '', mood: 'energetic' as SceneMood, shots: [], narrativeFunction: '', keyMessage: '', effectivenessScore: 50, adaptationNotes: '', reshootDifficulty: 'easy' as const,
      }));
      assert.equal(calculatePacingPattern(scenes), 'fast_cut');
    });
    test('long avg = slow_burn', () => {
      const scenes: SceneSegment[] = Array.from({ length: 3 }, (_, i) => ({
        sceneId: `s${i}`, sceneIndex: i, sceneType: 'hook' as SceneType, startTime: i * 10, endTime: i * 10 + 10, duration: 10, title: '', description: '', mood: 'calm' as SceneMood, shots: [], narrativeFunction: '', keyMessage: '', effectivenessScore: 50, adaptationNotes: '', reshootDifficulty: 'easy' as const,
      }));
      assert.equal(calculatePacingPattern(scenes), 'slow_burn');
    });
  });

  describe('calculateOverallEffectiveness', () => {
    test('empty returns 0', () => { assert.equal(calculateOverallEffectiveness([]), 0); });
    test('returns average', () => {
      const scenes: SceneSegment[] = [
        { sceneId: 's1', sceneIndex: 0, sceneType: 'hook', startTime: 0, endTime: 3, duration: 3, title: '', description: '', mood: 'energetic', shots: [], narrativeFunction: '', keyMessage: '', effectivenessScore: 80, adaptationNotes: '', reshootDifficulty: 'easy' },
        { sceneId: 's2', sceneIndex: 1, sceneType: 'cta', startTime: 3, endTime: 6, duration: 3, title: '', description: '', mood: 'urgent', shots: [], narrativeFunction: '', keyMessage: '', effectivenessScore: 60, adaptationNotes: '', reshootDifficulty: 'easy' },
      ];
      assert.equal(calculateOverallEffectiveness(scenes), 70);
    });
  });

  describe('calculateHookTime', () => {
    test('returns hook start time', () => {
      const scenes: SceneSegment[] = [
        { sceneId: 's1', sceneIndex: 0, sceneType: 'product_reveal', startTime: 0, endTime: 5, duration: 5, title: '', description: '', mood: 'energetic', shots: [], narrativeFunction: '', keyMessage: '', effectivenessScore: 50, adaptationNotes: '', reshootDifficulty: 'easy' },
        { sceneId: 's2', sceneIndex: 1, sceneType: 'hook', startTime: 5, endTime: 8, duration: 3, title: '', description: '', mood: 'energetic', shots: [], narrativeFunction: '', keyMessage: '', effectivenessScore: 50, adaptationNotes: '', reshootDifficulty: 'easy' },
      ];
      assert.equal(calculateHookTime(scenes), 5);
    });
  });

  describe('validateSceneAnalysisRequest', () => {
    test('empty content fails', () => {
      assert.ok(!validateSceneAnalysisRequest({ sourceContent: '' }).valid);
    });
    test('valid passes', () => {
      assert.ok(validateSceneAnalysisRequest({ sourceContent: 'A video transcript' }).valid);
    });
  });

  describe('SCENE_ANALYSIS_COST', () => {
    test('cost is 8', () => { assert.equal(SCENE_ANALYSIS_COST, 8); });
  });
});
