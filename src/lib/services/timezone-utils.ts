// ── Timezone Utilities ──
// Uses Intl.DateTimeFormat for timezone-aware conversions and formatting.

export type TimezoneFormat = 'short' | 'long' | 'time' | 'date';

export interface TimezoneOption {
  label: string;
  value: string;
}

export const TimezoneUtils = {
  /**
   * Convert a date from a given timezone to UTC.
   * The input `date` is interpreted as a wall-clock time in `timezone`.
   * Returns a UTC Date.
   */
  convertToUtc(date: Date, timezone: string): Date {
    // Get the offset (in minutes) for the timezone at the given date
    const offsetMin = TimezoneUtils._getOffsetMinutes(timezone, date);
    // The wall-clock time in the timezone corresponds to UTC + offset
    // So UTC = wall-clock-time - offset
    return new Date(date.getTime() - offsetMin * 60 * 1000);
  },

  /**
   * Convert a UTC date to a given timezone.
   * Returns a Date whose internal value represents the wall-clock time in that timezone.
   */
  convertFromUtc(date: Date, timezone: string): Date {
    const offsetMin = TimezoneUtils._getOffsetMinutes(timezone, date);
    return new Date(date.getTime() + offsetMin * 60 * 1000);
  },

  /**
   * List common timezones with friendly labels.
   */
  getTimezones(): TimezoneOption[] {
    return [
      { label: 'UTC', value: 'UTC' },
      { label: 'America/New_York (EST/EDT)', value: 'America/New_York' },
      { label: 'America/Chicago (CST/CDT)', value: 'America/Chicago' },
      { label: 'America/Denver (MST/MDT)', value: 'America/Denver' },
      { label: 'America/Los_Angeles (PST/PDT)', value: 'America/Los_Angeles' },
      { label: 'America/Anchorage (AKST/AKDT)', value: 'America/Anchorage' },
      { label: 'America/Sao_Paulo (BRT)', value: 'America/Sao_Paulo' },
      { label: 'Europe/London (GMT/BST)', value: 'Europe/London' },
      { label: 'Europe/Paris (CET/CEST)', value: 'Europe/Paris' },
      { label: 'Europe/Berlin (CET/CEST)', value: 'Europe/Berlin' },
      { label: 'Europe/Madrid (CET/CEST)', value: 'Europe/Madrid' },
      { label: 'Europe/Moscow (MSK)', value: 'Europe/Moscow' },
      { label: 'Africa/Cairo (EET)', value: 'Africa/Cairo' },
      { label: 'Africa/Johannesburg (SAST)', value: 'Africa/Johannesburg' },
      { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
      { label: 'Asia/Karachi (PKT)', value: 'Asia/Karachi' },
      { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
      { label: 'Asia/Dhaka (BST)', value: 'Asia/Dhaka' },
      { label: 'Asia/Bangkok (ICT)', value: 'Asia/Bangkok' },
      { label: 'Asia/Singapore (SGT)', value: 'Asia/Singapore' },
      { label: 'Asia/Shanghai (CST)', value: 'Asia/Shanghai' },
      { label: 'Asia/Tokyo (JST)', value: 'Asia/Tokyo' },
      { label: 'Asia/Seoul (KST)', value: 'Asia/Seoul' },
      { label: 'Australia/Sydney (AEST/AEDT)', value: 'Australia/Sydney' },
      { label: 'Pacific/Auckland (NZST/NZDT)', value: 'Pacific/Auckland' },
      { label: 'Pacific/Honolulu (HST)', value: 'Pacific/Honolulu' },
    ];
  },

  /**
   * Detect the user's timezone from the runtime environment.
   */
  detectTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  },

  /**
   * Format a date in a given timezone.
   * format: 'short' | 'long' | 'time' | 'date'
   */
  formatInTimezone(date: Date, timezone: string, format: TimezoneFormat = 'short'): string {
    const opts: Intl.DateTimeFormatOptions = {};
    switch (format) {
      case 'short':
        opts.dateStyle = 'short';
        opts.timeStyle = 'short';
        break;
      case 'long':
        opts.dateStyle = 'full';
        opts.timeStyle = 'short';
        break;
      case 'time':
        opts.timeStyle = 'short';
        break;
      case 'date':
        opts.dateStyle = 'medium';
        break;
    }
    try {
      return new Intl.DateTimeFormat('en-US', { ...opts, timeZone: timezone }).format(date);
    } catch {
      return new Intl.DateTimeFormat('en-US', opts).format(date);
    }
  },

  /**
   * Get the UTC offset string (e.g. "+05:30") for a timezone at a given date.
   */
  getOffset(timezone: string, date: Date = new Date()): string {
    const offsetMin = TimezoneUtils._getOffsetMinutes(timezone, date);
    const sign = offsetMin >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMin);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  },

  /**
   * Check if Daylight Saving Time is in effect for a timezone at a given date.
   * Compares the January offset vs July offset; if they differ, DST is observed.
   * Then checks whether the current date's offset matches the summer (July) offset.
   */
  isDST(timezone: string, date: Date = new Date()): boolean {
    const year = date.getFullYear();
    const jan = new Date(year, 0, 15);
    const jul = new Date(year, 6, 15);
    const janOffset = TimezoneUtils._getOffsetMinutes(timezone, jan);
    const julOffset = TimezoneUtils._getOffsetMinutes(timezone, jul);
    // If no difference, DST is not observed in this timezone
    if (janOffset === julOffset) return false;
    // DST always shifts the offset towards UTC (reduces absolute value).
    // Standard time has the larger absolute offset.
    const standardOffset = Math.abs(janOffset) >= Math.abs(julOffset) ? janOffset : julOffset;
    const currentOffset = TimezoneUtils._getOffsetMinutes(timezone, date);
    // DST is in effect when the current offset differs from the standard offset
    return currentOffset !== standardOffset;
  },

  /**
   * Get default working hours (9-17) in the timezone.
   * Returns hour boundaries in the local timezone.
   */
  getWorkingHours(timezone: string): { start: number; end: number } {
    // Default 9-17 for all timezones; can be extended per-region
    void timezone;
    return { start: 9, end: 17 };
  },

  /**
   * Internal: get the offset in minutes for a timezone at a given date.
   */
  _getOffsetMinutes(timezone: string, date: Date): number {
    try {
      // Use Intl.DateTimeFormat with timeZoneName to extract the offset
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'shortOffset',
      });
      const parts = dtf.formatToParts(date);
      const tzPart = parts.find((p) => p.type === 'timeZoneName');
      if (tzPart) {
        const result = parseOffsetString(tzPart.value);
        if (result !== null) return result;
      }
    } catch {
      // Fallback below
    }
    // Fallback: use longOffset
    try {
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        timeZoneName: 'longOffset',
      });
      const parts = dtf.formatToParts(date);
      const tzPart = parts.find((p) => p.type === 'timeZoneName');
      if (tzPart) {
        const result = parseOffsetString(tzPart.value);
        if (result !== null) return result;
      }
    } catch {
      // Final fallback
    }
    return 0;
  },
};

// ── Helpers ──

/**
 * Parse an offset string like "GMT+5:30", "GMT-5", "GMT+0", or "GMT" into minutes.
 * Returns null if the string cannot be parsed.
 */
function parseOffsetString(value: string): number | null {
  // Remove "GMT" prefix
  const cleaned = value.replace('GMT', '').trim();
  if (cleaned === '' || cleaned === '+0' || cleaned === '-0' || cleaned === '0') return 0;
  const sign = cleaned.startsWith('-') ? -1 : 1;
  const rest = cleaned.replace(/[+-]/, '');
  const parts = rest.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts.length > 1 ? parseInt(parts[1], 10) : 0;
  if (isNaN(h) || isNaN(m)) return null;
  return sign * (h * 60 + m);
}
