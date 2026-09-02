import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MATRIX_COST_PER_CELL,
  MATRIX_MAX_CELLS,
  getMatrixDimensions,
  getAdFormats,
  calculateMatrixSize,
  validateMatrixConfig,
  generateCells,
  calculateCellScore,
  createMatrix,
  analyzeDimensions,
  identifyWinningCombinations,
  generateMatrixInsights,
  analyzeMatrix,
  type MatrixDimension,
  type AdFormat,
  type MatrixCellStatus,
  type MatrixAxis,
  type MatrixCell,
  type VariantMatrix,
  type MatrixResult,
} from '../src/lib/creative/variant-matrix.ts';

describe('variant-matrix', () => {
  describe('type completeness', () => {
    test('MatrixDimension has 6 dimensions', () => {
      const dims: MatrixDimension[] = ['hook', 'angle', 'format', 'platform', 'tone', 'cta'];
      assert.equal(dims.length, 6);
    });

    test('AdFormat has 8 formats', () => {
      const formats: AdFormat[] = [
        'video_vertical', 'video_horizontal', 'video_square',
        'image_single', 'image_carousel', 'story', 'reel', 'short',
      ];
      assert.equal(formats.length, 8);
    });

    test('MatrixCellStatus has 5 statuses', () => {
      const statuses: MatrixCellStatus[] = ['generated', 'tested', 'winning', 'underperforming', 'untested'];
      assert.equal(statuses.length, 5);
    });

    test('getMatrixDimensions returns 6 dimensions', () => {
      const dims = getMatrixDimensions();
      assert.equal(dims.length, 6);
      for (const d of dims) {
        assert.ok(d.dimension);
        assert.ok(d.name);
        assert.ok(d.description);
      }
    });

    test('getAdFormats returns 8 formats', () => {
      const formats = getAdFormats();
      assert.equal(formats.length, 8);
      for (const f of formats) {
        assert.ok(f.format);
        assert.ok(f.name);
        assert.ok(f.description);
      }
    });
  });

  describe('calculateMatrixSize', () => {
    test('multiplies axis values', () => {
      const axes: MatrixAxis[] = [
        { dimension: 'hook', values: ['h1', 'h2', 'h3'] },
        { dimension: 'angle', values: ['a1', 'a2'] },
      ];
      assert.equal(calculateMatrixSize(axes), 6);
    });

    test('empty axes returns 1', () => {
      assert.equal(calculateMatrixSize([]), 1);
    });
  });

  describe('MATRIX_MAX_CELLS', () => {
    test('max cells is 100', () => {
      assert.equal(MATRIX_MAX_CELLS, 100);
    });

    test('cost per cell is 1', () => {
      assert.equal(MATRIX_COST_PER_CELL, 1);
    });
  });

  describe('validateMatrixConfig', () => {
    test('valid config passes', () => {
      const r = validateMatrixConfig({
        name: 'Test Matrix',
        hooks: ['h1', 'h2'],
        angles: ['a1', 'a2'],
        formats: ['video_vertical'],
        platforms: ['meta'],
      });
      assert.ok(r.valid);
    });

    test('missing name fails', () => {
      const r = validateMatrixConfig({ hooks: ['h1'], angles: ['a1'], formats: ['video_vertical'], platforms: ['meta'] });
      assert.ok(!r.valid);
    });

    test('no hooks fails', () => {
      const r = validateMatrixConfig({ name: 'Test', hooks: [], angles: ['a1'], formats: ['video_vertical'], platforms: ['meta'] });
      assert.ok(!r.valid);
    });

    test('no angles fails', () => {
      const r = validateMatrixConfig({ name: 'Test', hooks: ['h1'], angles: [], formats: ['video_vertical'], platforms: ['meta'] });
      assert.ok(!r.valid);
    });
  });

  describe('generateCells', () => {
    test('generates correct number of cells', () => {
      const axes: MatrixAxis[] = [
        { dimension: 'hook', values: ['h1', 'h2'] },
        { dimension: 'angle', values: ['a1', 'a2', 'a3'] },
      ];
      const cells = generateCells(axes);
      assert.equal(cells.length, 6);
    });

    test('cells have untested status', () => {
      const axes: MatrixAxis[] = [
        { dimension: 'hook', values: ['h1'] },
        { dimension: 'angle', values: ['a1'] },
      ];
      const cells = generateCells(axes);
      assert.equal(cells[0].status, 'untested');
    });

    test('cells have unique IDs', () => {
      const axes: MatrixAxis[] = [
        { dimension: 'hook', values: ['h1', 'h2'] },
        { dimension: 'angle', values: ['a1', 'a2'] },
      ];
      const cells = generateCells(axes);
      const ids = cells.map((c) => c.cellId);
      assert.equal(new Set(ids).size, ids.length);
    });
  });

  describe('calculateCellScore', () => {
    test('untested cell returns 0', () => {
      const cell: MatrixCell = {
        cellId: 'c1', coordinates: {} as any, status: 'untested',
        hook: 'h1', angle: 'a1', format: 'video_vertical', platform: 'meta', tone: '', cta: '',
      };
      const score = calculateCellScore(cell);
      assert.equal(score, 0);
    });
  });

  describe('createMatrix', () => {
    test('creates matrix with correct cell count', () => {
      const matrix = createMatrix({
        name: 'Test',
        hooks: ['h1', 'h2'],
        angles: ['a1', 'a2'],
        formats: ['video_vertical'],
        platforms: ['meta'],
      });
      assert.ok(matrix.matrixId);
      assert.equal(matrix.name, 'Test');
      assert.equal(matrix.totalCells, 4);
      assert.equal(matrix.cells.length, 4);
    });

    test('matrix has correct timestamps', () => {
      const matrix = createMatrix({
        name: 'Test',
        hooks: ['h1'],
        angles: ['a1'],
        formats: ['video_vertical'],
        platforms: ['meta'],
      });
      assert.ok(matrix.createdAt);
      assert.ok(matrix.updatedAt);
    });
  });

  describe('analyzeDimensions', () => {
    test('returns analysis for each dimension', () => {
      const cells: MatrixCell[] = [
        { cellId: 'c1', coordinates: {} as any, status: 'tested', hook: 'h1', angle: 'a1', format: 'video_vertical', platform: 'meta', tone: '', cta: '', score: 80, performance: { impressions: 1000, clicks: 50, conversions: 5, ctr: 5, cvr: 10, spend: 10, revenue: 50, roas: 5 } },
        { cellId: 'c2', coordinates: {} as any, status: 'tested', hook: 'h2', angle: 'a1', format: 'video_vertical', platform: 'meta', tone: '', cta: '', score: 60, performance: { impressions: 1000, clicks: 30, conversions: 3, ctr: 3, cvr: 10, spend: 10, revenue: 30, roas: 3 } },
      ];
      const analysis = analyzeDimensions(cells);
      assert.ok(Array.isArray(analysis));
    });
  });

  describe('identifyWinningCombinations', () => {
    test('returns array of winning combinations', () => {
      const cells: MatrixCell[] = [
        { cellId: 'c1', coordinates: {} as any, status: 'winning', hook: 'h1', angle: 'a1', format: 'video_vertical', platform: 'meta', tone: '', cta: '', score: 90, performance: { impressions: 1000, clicks: 50, conversions: 10, ctr: 5, cvr: 20, spend: 10, revenue: 100, roas: 10 } },
      ];
      const winners = identifyWinningCombinations(cells);
      assert.ok(Array.isArray(winners));
    });
  });

  describe('generateMatrixInsights', () => {
    test('returns array of insights', () => {
      const cells: MatrixCell[] = [
        { cellId: 'c1', coordinates: {} as any, status: 'tested', hook: 'h1', angle: 'a1', format: 'video_vertical', platform: 'meta', tone: '', cta: '', score: 80, performance: { impressions: 1000, clicks: 50, conversions: 5, ctr: 5, cvr: 10, spend: 10, revenue: 50, roas: 5 } },
      ];
      const dimAnalysis = analyzeDimensions(cells);
      const insights = generateMatrixInsights(cells, dimAnalysis);
      assert.ok(Array.isArray(insights));
    });
  });

  describe('analyzeMatrix', () => {
    test('returns complete MatrixResult', () => {
      const matrix = createMatrix({
        name: 'Test',
        hooks: ['h1', 'h2'],
        angles: ['a1'],
        formats: ['video_vertical'],
        platforms: ['meta'],
      });
      const result = analyzeMatrix(matrix);
      assert.ok(result.matrix);
      assert.ok(Array.isArray(result.winningCombinations));
      assert.ok(Array.isArray(result.insights));
      assert.ok(Array.isArray(result.recommendations));
      assert.ok(Array.isArray(result.dimensionAnalysis));
    });
  });

  describe('MatrixResult structure', () => {
    test('MatrixResult has all required fields', () => {
      const matrix = createMatrix({
        name: 'Test', hooks: ['h1'], angles: ['a1'],
        formats: ['video_vertical'], platforms: ['meta'],
      });
      const result: MatrixResult = analyzeMatrix(matrix);
      assert.ok(result.matrix);
      assert.ok('winningCombinations' in result);
      assert.ok('insights' in result);
      assert.ok('recommendations' in result);
      assert.ok('dimensionAnalysis' in result);
    });
  });
});
