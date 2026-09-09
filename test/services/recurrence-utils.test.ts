import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { RecurrenceUtils } = await import('@/lib/services/recurrence-utils');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('RecurrenceUtils', () => {
  describe('parseRRule', () => {
    it('parses a basic DAILY rule', () => {
      const parsed = RecurrenceUtils.parseRRule('FREQ=DAILY;INTERVAL=2');
      assert.equal(parsed.freq, 'DAILY');
      assert.equal(parsed.interval, 2);
    });

    it('parses a WEEKLY rule with BYDAY', () => {
      const parsed = RecurrenceUtils.parseRRule('FREQ=WEEKLY;BYDAY=MO,WE,FR');
      assert.equal(parsed.freq, 'WEEKLY');
      assert.equal(parsed.interval, 1);
      assert.deepEqual(parsed.byDay, ['MO', 'WE', 'FR']);
    });

    it('parses UNTIL date', () => {
      const parsed = RecurrenceUtils.parseRRule('FREQ=DAILY;UNTIL=20250115T235959Z');
      assert.ok(parsed.until);
      assert.equal(parsed.until.getUTCFullYear(), 2025);
      assert.equal(parsed.until.getUTCMonth(), 0);
      assert.equal(parsed.until.getUTCDate(), 15);
    });

    it('parses COUNT', () => {
      const parsed = RecurrenceUtils.parseRRule('FREQ=DAILY;COUNT=10');
      assert.equal(parsed.count, 10);
    });

    it('parses MONTHLY with BYMONTHDAY', () => {
      const parsed = RecurrenceUtils.parseRRule('FREQ=MONTHLY;BYMONTHDAY=15');
      assert.equal(parsed.freq, 'MONTHLY');
      assert.deepEqual(parsed.byMonthDay, [15]);
    });

    it('handles RRULE: prefix', () => {
      const parsed = RecurrenceUtils.parseRRule('RRULE:FREQ=WEEKLY;INTERVAL=2');
      assert.equal(parsed.freq, 'WEEKLY');
      assert.equal(parsed.interval, 2);
    });

    it('defaults interval to 1 when not specified', () => {
      const parsed = RecurrenceUtils.parseRRule('FREQ=MONTHLY');
      assert.equal(parsed.interval, 1);
    });
  });

  describe('generateRRule', () => {
    it('generates a basic DAILY rule', () => {
      const rrule = RecurrenceUtils.generateRRule({ freq: 'DAILY' });
      assert.equal(rrule, 'FREQ=DAILY');
    });

    it('generates a WEEKLY rule with interval', () => {
      const rrule = RecurrenceUtils.generateRRule({ freq: 'WEEKLY', interval: 2 });
      assert.equal(rrule, 'FREQ=WEEKLY;INTERVAL=2');
    });

    it('generates a rule with BYDAY', () => {
      const rrule = RecurrenceUtils.generateRRule({ freq: 'WEEKLY', byDay: ['MO', 'WE', 'FR'] });
      assert.equal(rrule, 'FREQ=WEEKLY;BYDAY=MO,WE,FR');
    });

    it('generates a rule with COUNT', () => {
      const rrule = RecurrenceUtils.generateRRule({ freq: 'DAILY', count: 10 });
      assert.equal(rrule, 'FREQ=DAILY;COUNT=10');
    });

    it('generates a rule with UNTIL', () => {
      const until = new Date(Date.UTC(2025, 0, 15, 23, 59, 59));
      const rrule = RecurrenceUtils.generateRRule({ freq: 'DAILY', until });
      assert.ok(rrule.includes('UNTIL=20250115T235959Z'));
    });

    it('round-trips parse and generate', () => {
      const original = 'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE,FR';
      const parsed = RecurrenceUtils.parseRRule(original);
      const regenerated = RecurrenceUtils.generateRRule({
        freq: parsed.freq,
        interval: parsed.interval,
        byDay: parsed.byDay,
      });
      assert.equal(regenerated, original);
    });
  });

  describe('expand', () => {
    it('expands DAILY recurrence', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const rangeStart = new Date('2025-01-15T00:00:00Z');
      const rangeEnd = new Date('2025-01-19T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=DAILY', start, rangeStart, rangeEnd);
      // Jan 15, 16, 17, 18, 19 = 5 instances
      assert.equal(instances.length, 5);
    });

    it('expands DAILY with interval=2', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const rangeStart = new Date('2025-01-15T00:00:00Z');
      const rangeEnd = new Date('2025-01-22T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=DAILY;INTERVAL=2', start, rangeStart, rangeEnd);
      // Jan 15, 17, 19, 21 = 4 instances
      assert.equal(instances.length, 4);
    });

    it('expands WEEKLY recurrence', () => {
      const start = new Date('2025-01-15T10:00:00Z'); // Wednesday
      const rangeStart = new Date('2025-01-15T00:00:00Z');
      const rangeEnd = new Date('2025-02-05T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=WEEKLY', start, rangeStart, rangeEnd);
      // Jan 15, 22, 29, Feb 5 = 4 instances
      assert.equal(instances.length, 4);
    });

    it('expands WEEKLY with BYDAY', () => {
      const start = new Date('2025-01-13T10:00:00Z'); // Monday
      const rangeStart = new Date('2025-01-13T00:00:00Z');
      const rangeEnd = new Date('2025-01-19T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=WEEKLY;BYDAY=MO,WE,FR', start, rangeStart, rangeEnd);
      // Mon 13, Wed 15, Fri 17 = 3 instances
      assert.equal(instances.length, 3);
    });

    it('expands MONTHLY recurrence', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const rangeStart = new Date('2025-01-15T00:00:00Z');
      const rangeEnd = new Date('2025-04-30T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=MONTHLY', start, rangeStart, rangeEnd);
      // Jan 15, Feb 15, Mar 15, Apr 15 = 4 instances
      assert.equal(instances.length, 4);
    });

    it('respects COUNT limit', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const rangeStart = new Date('2025-01-15T00:00:00Z');
      const rangeEnd = new Date('2025-12-31T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=DAILY;COUNT=3', start, rangeStart, rangeEnd);
      assert.equal(instances.length, 3);
    });

    it('respects UNTIL date', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const rangeStart = new Date('2025-01-15T00:00:00Z');
      const rangeEnd = new Date('2025-12-31T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=DAILY;UNTIL=20250117T235959Z', start, rangeStart, rangeEnd);
      // Jan 15, 16, 17 = 3 instances
      assert.equal(instances.length, 3);
    });

    it('returns empty array when start is after range end', () => {
      const start = new Date('2025-06-15T10:00:00Z');
      const rangeStart = new Date('2025-01-01T00:00:00Z');
      const rangeEnd = new Date('2025-01-31T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=DAILY', start, rangeStart, rangeEnd);
      assert.equal(instances.length, 0);
    });

    it('expands YEARLY recurrence', () => {
      const start = new Date('2025-01-15T10:00:00Z');
      const rangeStart = new Date('2025-01-01T00:00:00Z');
      const rangeEnd = new Date('2028-12-31T23:59:59Z');
      const instances = RecurrenceUtils.expand('FREQ=YEARLY', start, rangeStart, rangeEnd);
      // 2025, 2026, 2027, 2028 = 4 instances
      assert.equal(instances.length, 4);
    });
  });

  describe('getDefaults', () => {
    it('returns common recurrence patterns', () => {
      const defaults = RecurrenceUtils.getDefaults();
      assert.equal(defaults.daily, 'FREQ=DAILY');
      assert.equal(defaults.weekly, 'FREQ=WEEKLY');
      assert.equal(defaults.biweekly, 'FREQ=WEEKLY;INTERVAL=2');
      assert.equal(defaults.monthly, 'FREQ=MONTHLY');
    });
  });
});
