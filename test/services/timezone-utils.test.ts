import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { TimezoneUtils } = await import('@/lib/services/timezone-utils');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('TimezoneUtils', () => {
  describe('convertToUtc', () => {
    it('converts a wall-clock time from a timezone to UTC', () => {
      // 2025-01-15T10:00:00 in America/New_York (EST = UTC-5)
      // Wall-clock 10:00 EST = 15:00 UTC
      // Use Date.UTC so the input is timezone-independent
      const wallClock = new Date(Date.UTC(2025, 0, 15, 10, 0, 0));
      const utc = TimezoneUtils.convertToUtc(wallClock, 'America/New_York');
      // The UTC date should be 15:00
      assert.equal(utc.getUTCHours(), 15);
      assert.equal(utc.getUTCDate(), 15);
    });

    it('handles UTC timezone (no offset change)', () => {
      const date = new Date(Date.UTC(2025, 0, 15, 10, 0, 0));
      const utc = TimezoneUtils.convertToUtc(date, 'UTC');
      assert.equal(utc.getTime(), date.getTime());
    });
  });

  describe('convertFromUtc', () => {
    it('converts UTC to a timezone wall-clock time', () => {
      // 2025-01-15T15:00:00 UTC -> 10:00 EST (UTC-5)
      const utcDate = new Date(Date.UTC(2025, 0, 15, 15, 0, 0));
      const local = TimezoneUtils.convertFromUtc(utcDate, 'America/New_York');
      // Use getUTCHours since the result's "wall-clock" is stored in UTC components
      assert.equal(local.getUTCHours(), 10);
    });

    it('handles UTC timezone (no offset change)', () => {
      const date = new Date(Date.UTC(2025, 0, 15, 10, 0, 0));
      const local = TimezoneUtils.convertFromUtc(date, 'UTC');
      assert.equal(local.getTime(), date.getTime());
    });
  });

  describe('getTimezones', () => {
    it('returns a non-empty array of timezone options', () => {
      const tzs = TimezoneUtils.getTimezones();
      assert.ok(tzs.length > 0);
      assert.ok(tzs.every((tz) => typeof tz.label === 'string' && typeof tz.value === 'string'));
    });

    it('includes UTC and common timezones', () => {
      const tzs = TimezoneUtils.getTimezones();
      const values = tzs.map((tz) => tz.value);
      assert.ok(values.includes('UTC'));
      assert.ok(values.includes('America/New_York'));
      assert.ok(values.includes('Europe/London'));
      assert.ok(values.includes('Asia/Tokyo'));
    });
  });

  describe('detectTimezone', () => {
    it('returns a valid timezone string', () => {
      const tz = TimezoneUtils.detectTimezone();
      assert.ok(typeof tz === 'string');
      assert.ok(tz.length > 0);
    });
  });

  describe('formatInTimezone', () => {
    it('formats a date in short format', () => {
      const date = new Date(Date.UTC(2025, 0, 15, 15, 0, 0));
      const formatted = TimezoneUtils.formatInTimezone(date, 'America/New_York', 'short');
      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.length > 0);
      // Short format may use 2-digit year ("25") or 4-digit ("2025")
      assert.ok(formatted.includes('25'), `Expected year in formatted output, got: ${formatted}`);
    });

    it('formats time only', () => {
      const date = new Date(Date.UTC(2025, 0, 15, 15, 0, 0));
      const formatted = TimezoneUtils.formatInTimezone(date, 'America/New_York', 'time');
      assert.ok(typeof formatted === 'string');
      // 15:00 UTC = 10:00 EST, should contain "10"
      assert.ok(formatted.includes('10'));
    });

    it('formats date only', () => {
      const date = new Date(Date.UTC(2025, 0, 15, 15, 0, 0));
      const formatted = TimezoneUtils.formatInTimezone(date, 'UTC', 'date');
      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.includes('2025') || formatted.includes('25'));
    });

    it('falls back gracefully for invalid timezone', () => {
      const date = new Date(Date.UTC(2025, 0, 15, 10, 0, 0));
      const formatted = TimezoneUtils.formatInTimezone(date, 'Invalid/Timezone', 'short');
      assert.ok(typeof formatted === 'string');
      assert.ok(formatted.length > 0);
    });
  });

  describe('getOffset', () => {
    it('returns +00:00 for UTC', () => {
      const offset = TimezoneUtils.getOffset('UTC', new Date('2025-01-15T00:00:00Z'));
      assert.equal(offset, '+00:00');
    });

    it('returns a valid offset string format', () => {
      const offset = TimezoneUtils.getOffset('America/New_York', new Date('2025-01-15T00:00:00Z'));
      assert.ok(/^[+-]\d{2}:\d{2}$/.test(offset), `Expected offset format, got: ${offset}`);
      // January in NY is EST = UTC-5
      assert.equal(offset, '-05:00');
    });

    it('returns correct offset for IST (+05:30)', () => {
      const offset = TimezoneUtils.getOffset('Asia/Kolkata', new Date('2025-01-15T00:00:00Z'));
      assert.equal(offset, '+05:30');
    });

    it('returns +00:00 for unknown timezone', () => {
      const offset = TimezoneUtils.getOffset('Invalid/Timezone', new Date('2025-01-15T00:00:00Z'));
      assert.equal(offset, '+00:00');
    });
  });

  describe('isDST', () => {
    it('returns false for UTC (no DST)', () => {
      assert.equal(TimezoneUtils.isDST('UTC', new Date('2025-07-15T00:00:00Z')), false);
    });

    it('returns true for America/New_York in July', () => {
      assert.equal(TimezoneUtils.isDST('America/New_York', new Date('2025-07-15T00:00:00Z')), true);
    });

    it('returns false for America/New_York in January', () => {
      assert.equal(TimezoneUtils.isDST('America/New_York', new Date('2025-01-15T00:00:00Z')), false);
    });
  });

  describe('getWorkingHours', () => {
    it('returns default 9-17 working hours', () => {
      const wh = TimezoneUtils.getWorkingHours('America/New_York');
      assert.equal(wh.start, 9);
      assert.equal(wh.end, 17);
    });
  });
});
