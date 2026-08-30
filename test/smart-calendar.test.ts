import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Tests for the Smart Calendar engine (multi-platform content calendar with
 * AI-suggested optimal posting times).
 *
 * Tests cover input validation, dry-run mode, schedule generation logic, and
 * optimal time heuristics. The generateSmartCalendar function is invoked in
 * dry-run mode (no real LLM calls) so it can run in the Node test runner.
 */
import {
  SMART_CALENDAR_COST,
  validateSmartCalendarInput,
  generateSmartCalendar,
  generateDateRange,
  getOptimalTimeSlot,
  PLATFORM_OPTIMAL_SLOTS,
  VALID_PLATFORMS,
  VALID_FORMATS,
  type SmartCalendarInput,
  type CalendarCreative,
} from '@/lib/creative/smart-calendar';

// ── Credit cost ──

test('SMART_CALENDAR_COST is 3', () => {
  assert.equal(SMART_CALENDAR_COST, 3);
});

// ── Input validation tests ──

const validCreative: CalendarCreative = {
  id: 'c1',
  platform: 'tiktok',
  format: 'video',
};

const validInput: SmartCalendarInput = {
  creatives: [validCreative],
  startDate: '2026-01-01',
  endDate: '2026-01-07',
};

test('validateSmartCalendarInput accepts a valid input', () => {
  const { valid, errors } = validateSmartCalendarInput(validInput);
  assert.ok(valid, `should be valid: ${errors.join(', ')}`);
  assert.equal(errors.length, 0);
});

test('validateSmartCalendarInput rejects missing input', () => {
  const { valid, errors } = validateSmartCalendarInput({} as SmartCalendarInput);
  assert.equal(valid, false);
  assert.ok(errors.includes('creatives_required'));
  assert.ok(errors.includes('start_date_required'));
  assert.ok(errors.includes('end_date_required'));
});

test('validateSmartCalendarInput rejects empty creatives array', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    creatives: [],
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('creatives_required'));
});

test('validateSmartCalendarInput rejects creative with missing id', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    creatives: [{ id: '', platform: 'tiktok', format: 'video' }],
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('missing_id')));
});

test('validateSmartCalendarInput rejects invalid platform', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    creatives: [{ id: 'c1', platform: 'snapchat' as never, format: 'video' }],
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('invalid_platform')));
});

test('validateSmartCalendarInput rejects invalid format', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    creatives: [{ id: 'c1', platform: 'tiktok', format: 'gif' as never }],
  });
  assert.equal(valid, false);
  assert.ok(errors.some((e) => e.includes('invalid_format')));
});

test('validateSmartCalendarInput rejects end date before start date', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    startDate: '2026-01-10',
    endDate: '2026-01-05',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('end_date_before_start'));
});

test('validateSmartCalendarInput rejects invalid date strings', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    startDate: 'not-a-date',
    endDate: 'also-not-a-date',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('start_date_invalid'));
  assert.ok(errors.includes('end_date_invalid'));
});

test('validateSmartCalendarInput rejects date range longer than 90 days', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    startDate: '2026-01-01',
    endDate: '2026-06-01',
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('date_range_too_long'));
});

test('validateSmartCalendarInput rejects too many creatives', () => {
  const creatives = Array.from({ length: 101 }, (_, i) => ({
    id: `c${i}`,
    platform: 'tiktok' as const,
    format: 'video' as const,
  }));
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    creatives,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('too_many_creatives'));
});

test('validateSmartCalendarInput rejects invalid timezone', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    timezone: 123 as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('timezone_invalid'));
});

test('validateSmartCalendarInput rejects invalid dryRun type', () => {
  const { valid, errors } = validateSmartCalendarInput({
    ...validInput,
    dryRun: 'yes' as never,
  });
  assert.equal(valid, false);
  assert.ok(errors.includes('dry_run_invalid'));
});

test('VALID_PLATFORMS contains expected platforms', () => {
  assert.ok(VALID_PLATFORMS.includes('tiktok'));
  assert.ok(VALID_PLATFORMS.includes('instagram'));
  assert.ok(VALID_PLATFORMS.includes('youtube'));
  assert.ok(VALID_PLATFORMS.includes('facebook'));
  assert.ok(VALID_PLATFORMS.includes('linkedin'));
  assert.ok(VALID_PLATFORMS.includes('x'));
});

test('VALID_FORMATS contains expected formats', () => {
  assert.ok(VALID_FORMATS.includes('video'));
  assert.ok(VALID_FORMATS.includes('image'));
  assert.ok(VALID_FORMATS.includes('carousel'));
});

// ── generateDateRange tests ──

test('generateDateRange returns dates between start and end inclusive', () => {
  const dates = generateDateRange('2026-01-01', '2026-01-07');
  assert.equal(dates.length, 7);
  assert.equal(dates[0], '2026-01-01');
  assert.equal(dates[6], '2026-01-07');
});

test('generateDateRange returns single date for same start and end', () => {
  const dates = generateDateRange('2026-01-01', '2026-01-01');
  assert.equal(dates.length, 1);
  assert.equal(dates[0], '2026-01-01');
});

test('generateDateRange returns empty for invalid dates', () => {
  assert.deepEqual(generateDateRange('invalid', '2026-01-07'), []);
  assert.deepEqual(generateDateRange('2026-01-01', 'invalid'), []);
});

// ── getOptimalTimeSlot tests ──

test('getOptimalTimeSlot returns morning for tiktok index 0', () => {
  const slot = getOptimalTimeSlot('tiktok', 0);
  assert.equal(slot.timeOfDay, 'morning');
  assert.equal(slot.time, '09:00');
});

test('getOptimalTimeSlot returns evening for tiktok index 1', () => {
  const slot = getOptimalTimeSlot('tiktok', 1);
  assert.equal(slot.timeOfDay, 'evening');
  assert.equal(slot.time, '18:00');
});

test('getOptimalTimeSlot wraps around for high indices', () => {
  const slot = getOptimalTimeSlot('tiktok', 2);
  assert.equal(slot.timeOfDay, 'morning');
});

test('getOptimalTimeSlot returns afternoon for instagram index 0', () => {
  const slot = getOptimalTimeSlot('instagram', 0);
  assert.equal(slot.timeOfDay, 'afternoon');
  assert.equal(slot.time, '12:00');
});

test('PLATFORM_OPTIMAL_SLOTS has entries for all valid platforms', () => {
  for (const p of VALID_PLATFORMS) {
    assert.ok(Array.isArray(PLATFORM_OPTIMAL_SLOTS[p]), `${p} should have optimal slots`);
    assert.ok(PLATFORM_OPTIMAL_SLOTS[p].length > 0, `${p} should have at least one slot`);
  }
});

// ── Dry-run schedule generation tests ──
//
// These tests run generateSmartCalendar with dryRun: true so no real LLM
// calls are made — deterministic heuristic schedules are returned instead.

test('dry-run generation returns a SmartCalendarResult with schedule', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, dryRun: true },
    'test-user',
  );
  assert.ok(result);
  assert.ok(Array.isArray(result.schedule));
  assert.equal(result.schedule.length, 1);
  assert.equal(result.totalPosts, 1);
  assert.equal(result.dryRun, true);
});

test('dry-run generation distributes creatives across dates', async () => {
  const creatives: CalendarCreative[] = Array.from({ length: 5 }, (_, i) => ({
    id: `c${i}`,
    platform: 'tiktok' as const,
    format: 'video' as const,
  }));
  const result = await generateSmartCalendar(
    { creatives, startDate: '2026-01-01', endDate: '2026-01-07', dryRun: true },
    'test-user',
  );
  assert.equal(result.schedule.length, 5);
  const dates = new Set(result.schedule.map((s) => s.date));
  assert.ok(dates.size > 1, 'creatives should be spread across multiple dates');
});

test('dry-run generation assigns correct platform to each post', async () => {
  const creatives: CalendarCreative[] = [
    { id: 'c0', platform: 'tiktok', format: 'video' },
    { id: 'c1', platform: 'instagram', format: 'image' },
  ];
  const result = await generateSmartCalendar(
    { creatives, startDate: '2026-01-01', endDate: '2026-01-07', dryRun: true },
    'test-user',
  );
  assert.equal(result.schedule.length, 2);
  const platforms = result.schedule.map((s) => s.platform);
  assert.ok(platforms.includes('tiktok'));
  assert.ok(platforms.includes('instagram'));
});

test('dry-run generation sorts schedule by date and time', async () => {
  const creatives: CalendarCreative[] = [
    { id: 'c0', platform: 'instagram', format: 'image' },
    { id: 'c1', platform: 'tiktok', format: 'video' },
  ];
  const result = await generateSmartCalendar(
    { creatives, startDate: '2026-01-01', endDate: '2026-01-07', dryRun: true },
    'test-user',
  );
  for (let i = 1; i < result.schedule.length; i++) {
    const prev = result.schedule[i - 1];
    const cur = result.schedule[i];
    assert.ok(
      (prev.date + prev.time).localeCompare(cur.date + cur.time) <= 0,
      'schedule should be sorted by date+time',
    );
  }
});

test('dry-run generation computes platformBreakdown', async () => {
  const creatives: CalendarCreative[] = [
    { id: 'c0', platform: 'tiktok', format: 'video' },
    { id: 'c1', platform: 'tiktok', format: 'video' },
    { id: 'c2', platform: 'instagram', format: 'image' },
  ];
  const result = await generateSmartCalendar(
    { creatives, startDate: '2026-01-01', endDate: '2026-01-07', dryRun: true },
    'test-user',
  );
  assert.equal(result.platformBreakdown['tiktok'], 2);
  assert.equal(result.platformBreakdown['instagram'], 1);
});

test('dry-run generation computes averageConfidence', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, dryRun: true },
    'test-user',
  );
  assert.ok(result.averageConfidence > 0);
  assert.ok(result.averageConfidence <= 1);
});

test('dry-run generation uses timezone from input', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, timezone: 'America/New_York', dryRun: true },
    'test-user',
  );
  assert.equal(result.timezone, 'America/New_York');
});

test('dry-run generation defaults timezone to UTC', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, dryRun: true },
    'test-user',
  );
  assert.equal(result.timezone, 'UTC');
});

test('dry-run generation assigns timeOfDay from heuristics', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, dryRun: true },
    'test-user',
  );
  const post = result.schedule[0];
  assert.ok(['morning', 'afternoon', 'evening'].includes(post.timeOfDay));
});

test('dry-run generation assigns expectedReach > 0', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, dryRun: true },
    'test-user',
  );
  for (const post of result.schedule) {
    assert.ok(post.expectedReach > 0, 'expectedReach should be positive');
  }
});

test('dry-run generation assigns rationale string', async () => {
  const result = await generateSmartCalendar(
    { ...validInput, dryRun: true },
    'test-user',
  );
  for (const post of result.schedule) {
    assert.ok(typeof post.rationale === 'string' && post.rationale.length > 0);
  }
});

test('generateSmartCalendar throws on invalid input', async () => {
  await assert.rejects(
    () => generateSmartCalendar({ ...validInput, creatives: [] } as SmartCalendarInput, 'test-user'),
    /invalid_smart_calendar_input/,
  );
});

test('dry-run generation returns empty schedule for single-day range with no creatives spread', async () => {
  const result = await generateSmartCalendar(
    { creatives: [validCreative], startDate: '2026-01-01', endDate: '2026-01-01', dryRun: true },
    'test-user',
  );
  assert.equal(result.schedule.length, 1);
  assert.equal(result.schedule[0].date, '2026-01-01');
});
