# ADR-218: E2E Rate-Limit Skip Behavior

**Date:** 2026-09-02
**Status:** Accepted
**Supersedes:** None

## Context

E2E tests (Playwright) run against a local dev server with mock Atlas. Some
API endpoints have rate limiting that can trigger during test runs, especially
when many tests hit the same endpoint in rapid succession.

When a test receives HTTP 429 (Too Many Requests), it calls `test.skip()` with
the reason `'rate limited'` rather than failing. This prevents environmental
rate limiting from producing misleading test failures.

## Decision

**E2E tests skip on HTTP 429 by design.** This is the correct behavior because:

1. **Rate limiting is a production safety mechanism**, not a feature under test.
   Testing rate-limit behavior itself is done in dedicated unit tests.

2. **CI runners share IP addresses** across parallel test runs, which can
   trigger rate limits even with `E2E_NO_RATE_LIMIT=1` set (the env var
   disables some but not all rate checks).

3. **Skipping is better than failing** — a skip indicates "this test could not
   run due to environment" while a fail indicates "the code is broken."
   Rate-limit skips are environmental, not code defects.

4. **The `E2E_NO_RATE_LIMIT=1` env var** is set in the Playwright webServer
   config to minimize rate-limit triggers, but some rate checks (e.g., media
   serving) remain active for security testing.

## Consequences

- E2E tests may skip a small number of tests per run due to rate limiting
- Skipped tests are reported in Playwright output and do not affect pass/fail
- The full test suite passes when run locally with fewer parallel workers
- Rate-limit behavior itself is verified in unit tests, not E2E
