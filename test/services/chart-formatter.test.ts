import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ChartFormatter } from '@/lib/services/chart-formatter';

// ─────────────────────────────────────────────────────────────────────────────
// ChartFormatter
// ─────────────────────────────────────────────────────────────────────────────

describe('ChartFormatter', () => {
  describe('toLineChart', () => {
    it('formats single series without seriesField', () => {
      const data = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
      ];
      const result = ChartFormatter.toLineChart(data, { xField: 'date', yField: 'value', title: 'Sales' });
      assert.equal(result.series.length, 1);
      assert.equal(result.series[0].points.length, 2);
      assert.equal(result.series[0].points[0].y, 10);
      assert.equal(result.title, 'Sales');
    });

    it('groups into multiple series when seriesField is provided', () => {
      const data = [
        { date: '2024-01-01', value: 10, region: 'US' },
        { date: '2024-01-01', value: 5, region: 'EU' },
        { date: '2024-01-02', value: 15, region: 'US' },
      ];
      const result = ChartFormatter.toLineChart(data, { xField: 'date', yField: 'value', seriesField: 'region' });
      assert.equal(result.series.length, 2);
      const us = result.series.find((s) => s.name === 'US');
      assert.ok(us);
      assert.equal(us!.points.length, 2);
    });
  });

  describe('toBarChart', () => {
    it('formats rows into bar data', () => {
      const data = [
        { label: 'A', value: 10 },
        { label: 'B', value: 20 },
      ];
      const result = ChartFormatter.toBarChart(data, { labelField: 'label', valueField: 'value', title: 'Bars' });
      assert.equal(result.data.length, 2);
      assert.equal(result.data[0].label, 'A');
      assert.equal(result.data[0].value, 10);
      assert.equal(result.title, 'Bars');
    });

    it('includes color when colorField is set', () => {
      const data = [{ label: 'A', value: 10, color: 'red' }];
      const result = ChartFormatter.toBarChart(data, { labelField: 'label', valueField: 'value', colorField: 'color' });
      assert.equal(result.data[0].color, 'red');
    });
  });

  describe('toPieChart', () => {
    it('formats rows into pie data', () => {
      const data = [
        { category: 'X', count: 30 },
        { category: 'Y', count: 70 },
      ];
      const result = ChartFormatter.toPieChart(data, { labelField: 'category', valueField: 'count' });
      assert.equal(result.data.length, 2);
      assert.equal(result.data[0].label, 'X');
      assert.equal(result.data[0].value, 30);
    });
  });

  describe('toTable', () => {
    it('derives columns from first row when not specified', () => {
      const data = [{ a: 1, b: 2 }];
      const result = ChartFormatter.toTable(data);
      assert.deepEqual(result.columns, ['a', 'b']);
      assert.equal(result.rows[0].a, 1);
    });

    it('filters to specified columns', () => {
      const data = [{ a: 1, b: 2, c: 3 }];
      const result = ChartFormatter.toTable(data, { columns: ['a', 'c'] });
      assert.deepEqual(result.columns, ['a', 'c']);
      assert.equal(result.rows[0].a, 1);
      assert.equal(result.rows[0].b, undefined);
    });
  });

  describe('toMetric', () => {
    it('formats a metric with label and unit', () => {
      const result = ChartFormatter.toMetric(42.5, { label: 'Revenue', unit: 'USD', decimals: 1 });
      assert.equal(result.value, 42.5);
      assert.equal(result.label, 'Revenue');
      assert.equal(result.unit, 'USD');
      assert.ok(result.display.includes('42.5'));
    });
  });

  describe('toGauge', () => {
    it('computes percent of value relative to target', () => {
      const result = ChartFormatter.toGauge(50, 100, { label: 'Progress', unit: '%' });
      assert.equal(result.value, 50);
      assert.equal(result.target, 100);
      assert.equal(result.percent, 50);
      assert.equal(result.label, 'Progress');
    });

    it('clamps percent to 0-100', () => {
      const over = ChartFormatter.toGauge(150, 100);
      assert.equal(over.percent, 100);
      const under = ChartFormatter.toGauge(-10, 100);
      assert.equal(under.percent, 0);
    });
  });

  describe('toCSV', () => {
    it('converts array of objects to CSV', () => {
      const data = [{ name: 'A', value: 1 }, { name: 'B', value: 2 }];
      const csv = ChartFormatter.toCSV(data);
      const lines = csv.split('\n');
      assert.equal(lines[0], 'name,value');
      assert.equal(lines[1], 'A,1');
      assert.equal(lines[2], 'B,2');
    });

    it('escapes cells with commas and quotes', () => {
      const data = [{ text: 'hello, "world"' }];
      const csv = ChartFormatter.toCSV(data);
      assert.ok(csv.includes('"hello, ""world"""'));
    });

    it('returns empty string for empty input', () => {
      assert.equal(ChartFormatter.toCSV([]), '');
    });
  });

  describe('toMarkdown', () => {
    it('converts rows to a markdown table', () => {
      const data = [{ name: 'A', value: 1 }];
      const md = ChartFormatter.toMarkdown(data);
      const lines = md.split('\n');
      assert.equal(lines[0], '| name | value |');
      assert.equal(lines[1], '| --- | --- |');
      assert.equal(lines[2], '| A | 1 |');
    });

    it('returns empty string for empty input', () => {
      assert.equal(ChartFormatter.toMarkdown([]), '');
    });
  });

  describe('formatNumber', () => {
    it('formats with commas', () => {
      assert.equal(ChartFormatter.formatNumber(1234567), '1,234,567');
    });

    it('abbreviates large numbers', () => {
      assert.equal(ChartFormatter.formatNumber(1500000, { abbreviate: true }), '1.5M');
      assert.equal(ChartFormatter.formatNumber(2500, { abbreviate: true }), '2.5K');
    });
  });

  describe('formatPercent', () => {
    it('formats a number as percentage', () => {
      assert.equal(ChartFormatter.formatPercent(42.567), '42.6%');
      assert.equal(ChartFormatter.formatPercent(100, 0), '100%');
    });
  });

  describe('formatCurrency', () => {
    it('formats a number as USD currency', () => {
      const result = ChartFormatter.formatCurrency(1234.5, 'USD');
      assert.ok(result.includes('1,234.50'));
    });
  });

  describe('aggregateBy', () => {
    it('groups and aggregates by field', () => {
      const data = [
        { status: 'done', value: 10 },
        { status: 'done', value: 20 },
        { status: 'todo', value: 5 },
      ];
      const result = ChartFormatter.aggregateBy(data, 'status', [
        { field: 'value', type: 'sum', alias: 'total' },
        { field: 'id', type: 'count', alias: 'count' },
      ]);
      assert.equal(result.length, 2);
      const done = result.find((r) => r.status === 'done');
      assert.ok(done);
      assert.equal(done!.total, 30);
      assert.equal(done!.count, 2);
    });

    it('computes avg, min, max', () => {
      const data = [
        { g: 'x', v: 10 },
        { g: 'x', v: 20 },
        { g: 'x', v: 30 },
      ];
      const result = ChartFormatter.aggregateBy(data, 'g', [
        { field: 'v', type: 'avg' },
        { field: 'v', type: 'min' },
        { field: 'v', type: 'max' },
      ]);
      assert.equal(result[0].avg_v, 20);
      assert.equal(result[0].min_v, 10);
      assert.equal(result[0].max_v, 30);
    });
  });

  describe('sortBy', () => {
    it('sorts ascending by numeric field', () => {
      const data = [{ v: 3 }, { v: 1 }, { v: 2 }];
      const result = ChartFormatter.sortBy(data, 'v', 'asc');
      assert.deepEqual(result.map((r) => r.v), [1, 2, 3]);
    });

    it('sorts descending by string field', () => {
      const data = [{ name: 'c' }, { name: 'a' }, { name: 'b' }];
      const result = ChartFormatter.sortBy(data, 'name', 'desc');
      assert.deepEqual(result.map((r) => r.name), ['c', 'b', 'a']);
    });
  });
});
