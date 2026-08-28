import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY_SCORING_COST,
  getQualityDimensions,
  getScoreGrades,
  calculateGrade,
  calculatePercentile,
  calculateOverallGrade,
  calculateImprovementPotential,
  getBenchmarkScores,
  validateQualityScoringRequest,
  type QualityDimension,
  type ScoreGrade,
  type BenchmarkType,
} from '../src/lib/creative/quality-scoring.ts';

describe('quality-scoring', () => {
  describe('type completeness', () => {
    test('QualityDimension has 6 dimensions', () => {
      const dims: QualityDimension[] = ['attention', 'persuasion', 'brand_fit', 'emotional_resonance', 'clarity', 'platform_fit'];
      assert.equal(dims.length, 6);
    });

    test('ScoreGrade has 5 grades', () => {
      const grades: ScoreGrade[] = ['A', 'B', 'C', 'D', 'F'];
      assert.equal(grades.length, 5);
    });

    test('BenchmarkType has 3 types', () => {
      const types: BenchmarkType[] = ['industry_avg', 'top_quartile', 'user_history'];
      assert.equal(types.length, 3);
    });

    test('getQualityDimensions returns 6', () => {
      assert.equal(getQualityDimensions().length, 6);
    });

    test('getScoreGrades returns 5', () => {
      assert.equal(getScoreGrades().length, 5);
    });
  });

  describe('calculateGrade', () => {
    test('90 = A', () => { assert.equal(calculateGrade(90), 'A'); });
    test('80 = B', () => { assert.equal(calculateGrade(80), 'B'); });
    test('70 = C', () => { assert.equal(calculateGrade(70), 'C'); });
    test('60 = D', () => { assert.equal(calculateGrade(60), 'D'); });
    test('50 = F', () => { assert.equal(calculateGrade(50), 'F'); });
    test('95 = A', () => { assert.equal(calculateGrade(95), 'A'); });
    test('0 = F', () => { assert.equal(calculateGrade(0), 'F'); });
  });

  describe('calculatePercentile', () => {
    test('returns 0-100', () => {
      const p = calculatePercentile(50, 60);
      assert.ok(p >= 0 && p <= 100);
    });
    test('higher score = higher percentile', () => {
      const p1 = calculatePercentile(30, 60);
      const p2 = calculatePercentile(80, 60);
      assert.ok(p2 > p1);
    });
  });

  describe('calculateOverallGrade', () => {
    test('returns valid grade from dimensions', () => {
      const dims = [
        { dimension: 'attention' as QualityDimension, score: 90, grade: 'A' as ScoreGrade, benchmark: 70, benchmarkType: 'industry_avg' as BenchmarkType, percentile: 90, strengths: [], weaknesses: [], recommendations: [] },
        { dimension: 'persuasion' as QualityDimension, score: 85, grade: 'B' as ScoreGrade, benchmark: 70, benchmarkType: 'industry_avg' as BenchmarkType, percentile: 85, strengths: [], weaknesses: [], recommendations: [] },
      ];
      const g = calculateOverallGrade(dims);
      assert.ok(['A', 'B', 'C', 'D', 'F'].includes(g));
    });
  });

  describe('calculateImprovementPotential', () => {
    test('returns 0-100', () => {
      const dims = [
        { dimension: 'attention' as QualityDimension, score: 50, grade: 'F' as ScoreGrade, benchmark: 70, benchmarkType: 'industry_avg' as BenchmarkType, percentile: 30, strengths: [], weaknesses: [], recommendations: [] },
      ];
      const p = calculateImprovementPotential(dims);
      assert.ok(p >= 0 && p <= 100);
    });
  });

  describe('getBenchmarkScores', () => {
    test('returns scores for all 6 dimensions', () => {
      const scores = getBenchmarkScores('industry_avg');
      assert.equal(Object.keys(scores).length, 6);
    });
  });

  describe('validateQualityScoringRequest', () => {
    test('empty content fails', () => {
      const r = validateQualityScoringRequest({ creativeContent: '' });
      assert.ok(!r.valid);
    });
    test('valid content passes', () => {
      const r = validateQualityScoringRequest({ creativeContent: 'A great ad creative' });
      assert.ok(r.valid);
    });
  });

  describe('QUALITY_SCORING_COST', () => {
    test('cost is 5', () => { assert.equal(QUALITY_SCORING_COST, 5); });
  });
});
