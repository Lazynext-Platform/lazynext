// ── Recurrence Utilities ──
// Parse, generate, and expand RFC 5545 RRULE strings.

export type RRuleFreq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface ParsedRRule {
  freq: RRuleFreq;
  interval: number;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
  until?: Date;
  count?: number;
}

export interface RRuleConfig {
  freq: RRuleFreq;
  interval?: number;
  byDay?: string[];
  byMonth?: number[];
  byMonthDay?: number[];
  until?: Date;
  count?: number;
}

const DAY_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

export const RecurrenceUtils = {
  /**
   * Parse an RRULE string into a structured object.
   */
  parseRRule(rrule: string): ParsedRRule {
    const result: ParsedRRule = { freq: 'DAILY', interval: 1 };
    // Remove the "RRULE:" prefix if present
    const clean = rrule.replace(/^RRULE:/i, '').trim();
    const parts = clean.split(';');

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key || value === undefined) continue;
      const k = key.toUpperCase();

      switch (k) {
        case 'FREQ':
          result.freq = (value.toUpperCase() as RRuleFreq);
          break;
        case 'INTERVAL':
          result.interval = parseInt(value, 10) || 1;
          break;
        case 'BYDAY':
          result.byDay = value.split(',').map((d) => d.trim().toUpperCase()).filter(Boolean);
          break;
        case 'BYMONTH':
          result.byMonth = value.split(',').map((m) => parseInt(m.trim(), 10)).filter((n) => !isNaN(n));
          break;
        case 'BYMONTHDAY':
          result.byMonthDay = value.split(',').map((d) => parseInt(d.trim(), 10)).filter((n) => !isNaN(n));
          break;
        case 'UNTIL': {
          const d = parseICalDate(value);
          if (d) result.until = d;
          break;
        }
        case 'COUNT':
          result.count = parseInt(value, 10) || undefined;
          break;
      }
    }

    return result;
  },

  /**
   * Generate an RRULE string from a config object.
   */
  generateRRule(config: RRuleConfig): string {
    const parts: string[] = [];
    parts.push(`FREQ=${config.freq}`);
    if (config.interval && config.interval > 1) {
      parts.push(`INTERVAL=${config.interval}`);
    }
    if (config.byDay && config.byDay.length > 0) {
      parts.push(`BYDAY=${config.byDay.join(',')}`);
    }
    if (config.byMonth && config.byMonth.length > 0) {
      parts.push(`BYMONTH=${config.byMonth.join(',')}`);
    }
    if (config.byMonthDay && config.byMonthDay.length > 0) {
      parts.push(`BYMONTHDAY=${config.byMonthDay.join(',')}`);
    }
    if (config.until) {
      parts.push(`UNTIL=${formatICalDate(config.until)}`);
    }
    if (config.count) {
      parts.push(`COUNT=${config.count}`);
    }
    return parts.join(';');
  },

  /**
   * Expand a recurrence rule into a list of start Dates within [rangeStart, rangeEnd].
   * Returns an array of Date objects representing the start of each occurrence.
   */
  expand(rrule: string, startDate: Date, rangeStart: Date, rangeEnd: Date): Date[] {
    const parsed = RecurrenceUtils.parseRRule(rrule);
    const instances: Date[] = [];
    const maxIterations = 10000; // safety limit

    // Start from the event's startDate
    let current = new Date(startDate);
    let count = 0;
    const interval = parsed.interval || 1;

    // Helper: check if current is within range
    const inRange = (d: Date) => d >= rangeStart && d <= rangeEnd;
    // Helper: check if current is past until
    const pastUntil = (d: Date) => parsed.until ? d > parsed.until : false;
    // Helper: check count limit
    const pastCount = () => parsed.count ? count >= parsed.count : false;

    // For WEEKLY with BYDAY, we need to generate occurrences on specific weekdays
    if (parsed.freq === 'WEEKLY' && parsed.byDay && parsed.byDay.length > 0) {
      // Start from the week of the startDate
      let weekStart = new Date(current);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

      while (instances.length < maxIterations) {
        for (const dayCode of parsed.byDay) {
          const dayOfWeek = DAY_MAP[dayCode];
          if (dayOfWeek === undefined) continue;
          const occ = new Date(weekStart);
          occ.setDate(weekStart.getDate() + dayOfWeek);
          occ.setHours(startDate.getHours(), startDate.getMinutes(), startDate.getSeconds(), 0);

          if (occ < startDate) continue; // before the event starts
          if (pastUntil(occ)) return instances;
          if (pastCount()) return instances;

          count++;
          if (inRange(occ)) {
            instances.push(occ);
          }
          if (occ > rangeEnd) return instances;
        }
        // Advance by interval weeks
        weekStart.setDate(weekStart.getDate() + 7 * interval);
        if (weekStart > rangeEnd && (!parsed.until || weekStart > parsed.until)) break;
      }
      return instances;
    }

    // For DAILY, WEEKLY (without BYDAY), MONTHLY, YEARLY — iterate by frequency
    while (instances.length < maxIterations) {
      if (pastUntil(current)) break;
      if (pastCount()) break;
      if (current > rangeEnd) break;

      count++;
      if (inRange(current)) {
        instances.push(new Date(current));
      }

      // Advance by the appropriate interval
      switch (parsed.freq) {
        case 'DAILY':
          current = new Date(current.getTime() + interval * 24 * 60 * 60 * 1000);
          break;
        case 'WEEKLY':
          current = new Date(current.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'MONTHLY':
          current = new Date(current.getFullYear(), current.getMonth() + interval, current.getDate(),
            current.getHours(), current.getMinutes(), current.getSeconds(), 0);
          break;
        case 'YEARLY':
          current = new Date(current.getFullYear() + interval, current.getMonth(), current.getDate(),
            current.getHours(), current.getMinutes(), current.getSeconds(), 0);
          break;
      }
    }

    return instances;
  },

  /**
   * Return common recurrence pattern defaults.
   */
  getDefaults(): { daily: string; weekly: string; biweekly: string; monthly: string } {
    return {
      daily: 'FREQ=DAILY',
      weekly: 'FREQ=WEEKLY',
      biweekly: 'FREQ=WEEKLY;INTERVAL=2',
      monthly: 'FREQ=MONTHLY',
    };
  },
};

// ── Helpers ──

/**
 * Parse an iCal date string (YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS or YYYYMMDD).
 */
function parseICalDate(value: string): Date | null {
  const v = value.trim();
  // YYYYMMDD
  if (v.length === 8) {
    return new Date(
      parseInt(v.slice(0, 4)),
      parseInt(v.slice(4, 6)) - 1,
      parseInt(v.slice(6, 8)),
    );
  }
  // YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  if (v.length >= 15) {
    const year = parseInt(v.slice(0, 4));
    const month = parseInt(v.slice(4, 6)) - 1;
    const day = parseInt(v.slice(6, 8));
    const hour = parseInt(v.slice(9, 11));
    const min = parseInt(v.slice(11, 13));
    const sec = parseInt(v.slice(13, 15));
    const isUtc = v.endsWith('Z');
    if (isUtc) {
      return new Date(Date.UTC(year, month, day, hour, min, sec));
    }
    return new Date(year, month, day, hour, min, sec);
  }
  // Try Date.parse as fallback
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format a Date as an iCal UTC date string (YYYYMMDDTHHMMSSZ).
 */
function formatICalDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}
