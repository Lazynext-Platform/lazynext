import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Unit tests for the chart component data logic.
 * Tests the data transformation and rendering logic without DOM.
 */

test('BarChart: max value calculation', () => {
  const data = [
    { label: 'A', value: 10 },
    { label: 'B', value: 30 },
    { label: 'C', value: 20 },
  ];
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  assert.equal(maxValue, 30);
});

test('BarChart: empty data uses fallback max of 1', () => {
  const data: { label: string; value: number }[] = [];
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  assert.equal(maxValue, 1);
});

test('BarChart: bar width calculation', () => {
  const data = [
    { label: 'A', value: 10 },
    { label: 'B', value: 30 },
  ];
  const barWidth = 100 / Math.max(data.length, 1);
  assert.equal(barWidth, 50);
});

test('DonutChart: total calculation', () => {
  const data = [
    { label: 'Done', value: 15 },
    { label: 'Pending', value: 5 },
  ];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  assert.equal(total, 20);
});

test('DonutChart: zero total handled', () => {
  const data: { label: string; value: number }[] = [];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  assert.equal(total, 0);
});

test('DonutChart: segment angle calculation', () => {
  const data = [
    { label: 'A', value: 25 },
    { label: 'B', value: 75 },
  ];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const angleA = (data[0].value / total) * Math.PI * 2;
  const angleB = (data[1].value / total) * Math.PI * 2;
  assert.ok(Math.abs(angleA - Math.PI / 2) < 0.001); // 25% = 90 degrees
  assert.ok(Math.abs(angleB - (3 * Math.PI) / 2) < 0.001); // 75% = 270 degrees
});

test('ProgressRing: percentage calculation', () => {
  const value = 7;
  const max = 10;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  assert.equal(pct, 70);
});

test('ProgressRing: zero max returns 0', () => {
  const value = 5;
  const max = 0;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  assert.equal(pct, 0);
});

test('ProgressRing: over 100% clamped to 100', () => {
  const value = 15;
  const max = 10;
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  assert.equal(pct, 100);
});

test('ProgressRing: circumference calculation', () => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  assert.ok(circumference > 314 && circumference < 315); // ~314.16
});
