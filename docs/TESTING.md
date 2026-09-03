# Testing Strategy

Lazynext Operating System follows a testing pyramid with multiple layers
of automated tests, from unit tests at the base to end-to-end tests at
the top. The test suite is the primary safety net for continuous
deployment to Cloudflare Workers.

## Testing Pyramid

```
                    ┌─────────┐
                    │   E2E   │  1000+ Playwright tests
                  ┌─┴─────────┴─┐
                  │  Contract   │  API, webhook, MCP contracts
                ┌─┴─────────────┴─┐
                │  Integration    │  DB, auth, API, payments, webhooks
              ┌─┴─────────────────┴─┐
              │      Unit           │  6817+ tests
              └─────────────────────┘
```

## Unit Tests

Unit tests form the foundation of the testing pyramid with 6817+ tests
running on the Node.js test runner (`npm test`).

| Area | Coverage | Examples |
|------|----------|----------|
| Domain logic | Creative intelligence, pipeline stages, skill chains | Brief generation, scoring, forecasting |
| Utilities | `safeError()`, value coercion (`asStr`/`asNum`/`asObj`/`asStrArr`), JSON extraction | `src/lib/creative/toolkit.ts` |
| Validation | Input validation, schema validation, permission checks | API route guards, credit checks |
| Permissions | Role-based access, admin authorization, workspace scoping | `ADMIN_EMAILS` checks, org membership |
| Pricing | Credit deduction, refund logic, plan-tier model filtering | `src/lib/providers/router.ts` |
| Token crypto | AES-256-GCM encryption/decryption, KDF (PBKDF2) | `test/token-crypto.test.ts` |
| Token refresh | OAuth token refresh for all 5 platforms | `test/token-refresh.test.ts` |
| Platform adapters | TikTok, YouTube, Instagram, Facebook, LinkedIn | `test/platform-adapters.test.ts` |
| Chain execution | Partial failure, credit refunds, conditional branching | `test/chain-partial-failure.test.ts` |

### Running unit tests

```bash
npm test        # Node test runner, 6817+ tests
npm run lint    # ESLint, 0 errors expected
```

## Integration Tests

Integration tests verify that multiple components work together,
including real database interactions, authentication flows, and
third-party API contracts.

| Layer | Scope | Mechanism |
|-------|-------|-----------|
| Database | D1/SQLite schema, migrations, queries | `better-sqlite3` locally; D1 in staging |
| Authentication | NextAuth JWT, Google + Credentials providers, OAuth PKCE | Mock OAuth providers |
| API | Route handlers, rate limiting, error sanitization | HTTP requests against dev server |
| Payments | Dodo Payments checkout, webhooks, credit allocation | Dodo test mode |
| Webhooks | Dodo webhook signature validation, event processing | Signed webhook payloads |
| Publishing | OAuth flow, token refresh, platform adapters, scheduled posts | Mocked platform APIs |

## Contract Tests

Contract tests ensure that the application's external interfaces remain
stable and that third-party integrations adhere to expected schemas.

| Contract Type | Scope | Verification |
|---------------|-------|--------------|
| API contracts | All `/api/*` routes | Request/response schema validation |
| Webhook contracts | Dodo Payments webhook payload schema | Signature + payload validation |
| MCP contracts | `/api/creative/mcp-server` tool definitions | Tool schema + response format |

## End-to-End (E2E) Tests

E2E tests use Playwright to simulate real user journeys through the
application in a real browser. The suite includes 1000+ tests across
multiple browser contexts.

| Project | Browser | Scope |
|---------|---------|-------|
| `chromium` | Desktop Chrome | Full user journeys on desktop |
| `mobile-chrome` | Mobile Chrome (emulated) | Responsive + touch interactions |
| `chromium-auth` | Desktop Chrome (authenticated) | Authenticated workflows |

### E2E coverage

- Login and registration flows (Credentials + Google OAuth)
- Creative generation workflows (brief → script → storyboard → media)
- Pipeline execution (all 9 stages)
- Publishing OAuth flows (TikTok, YouTube, Instagram, Facebook, LinkedIn)
- Scheduled post creation and cancellation
- Admin dashboard (credit reconciliation, user management)
- Compliance rules CRUD
- Share link access and password protection
- Responsive layout verification (280px–2560px)
- Feature search (Cmd+K) and category navigation

### Running E2E tests

```bash
npx playwright test                          # All projects
npx playwright test --project=chromium       # Desktop only
npx playwright test --project=mobile-chrome  # Mobile only
```

E2E tests set `E2E_NO_RATE_LIMIT=1` to bypass rate limiting during test
runs, ensuring deterministic results.

### Test account

| Field | Value |
|-------|-------|
| Email | `test@lazynext.local` |
| Password | `Test1234!` |
| Initial credits | 150 |
| Admin access | Yes (in `ADMIN_EMAILS`) |

## Visual Testing

Visual regression testing verifies that UI components render correctly
across locale and theme variations. The Neo-Brutalist design system's
hard borders, offset shadows, and high-contrast colors are checked for
consistency.

## Accessibility Testing

Accessibility tests verify WCAG 2.1 AA compliance:

- Keyboard navigation (all interactive elements reachable via Tab)
- Screen reader compatibility (ARIA labels, semantic HTML)
- Color contrast ratios (minimum 4.5:1 for text)
- Focus management (visible focus indicators, focus traps in modals)
- Touch target sizes (minimum 44×44px for coarse-pointer devices)

## Responsive Testing

All pages are tested across the full viewport range with no horizontal
overflow:

| Breakpoint | Width Range | Target Devices |
|------------|-------------|----------------|
| Mobile S | 280px–374px | Small Android phones |
| Mobile | 375px–767px | iPhone, standard Android |
| Tablet | 768px–1023px | iPad, Android tablets |
| Desktop | 1024px–1535px | Laptops, small desktops |
| Wide | 1536px–2560px | Large monitors, ultrawide |

Safe-area utilities (`pt-safe`, `pb-safe`, `safe-top`, `safe-bottom`,
`safe-area`) handle notched devices. `touch-action: manipulation` is
applied to interactive elements to prevent double-tap zoom delay.

## Browser Matrix

| Browser | Version | Platform | Status |
|---------|---------|----------|--------|
| Chrome | Latest 2 | Windows, macOS, Linux | Primary E2E target |
| Edge | Latest 2 | Windows, macOS | Chromium-based; covered by Chrome tests |
| Firefox | Latest 2 | Windows, macOS, Linux | Manual + smoke tests |
| Safari | Latest 2 | macOS | Manual + smoke tests |
| iOS Safari | Latest 2 | iPhone | Manual testing |
| Android Chrome | Latest 2 | Android | `mobile-chrome` E2E project |

## Security Testing

| Test Type | Tool | Frequency | Scope |
|-----------|------|-----------|-------|
| SAST (Static Analysis) | ESLint security rules, `tsc --noEmit` | Every commit | Source code |
| Dependency scan | `npm audit` | Every build | `package-lock.json` |
| Secret scanning | Pre-commit hooks | Every commit | Git history |
| Error sanitization audit | Manual + automated | Every release | All API routes |
| Rate limit verification | E2E tests | Every E2E run | API + AI endpoints |

The `safeError()` helper ensures raw exception messages are never leaked
to clients. The pipeline error classifier maps errors to controlled codes.

## Performance Testing

| Metric | Target | Measurement |
|--------|--------|-------------|
| Worker cold start | <50ms | Cloudflare Workers analytics |
| API response (p50) | <200ms | Cloudflare Workers analytics |
| API response (p99) | <1000ms | Cloudflare Workers analytics |
| Bundle size | Checked at build | `cf:build` output |
| Lighthouse score | >90 | Manual / CI |

Bundle size is checked during `cf:build`. The `lucide-react` import
optimization (`experimental.optimizePackageImports`) keeps the icon
bundle small.

## CI Verification

Every pull request must pass:

```bash
npx tsc --noEmit     # Type checking
npm run lint         # ESLint (0 errors, 0 warnings)
npm test             # Unit tests (6817+ passed, 0 failed)
npm run build        # Production build (Cloudflare target)
npm run cf:build     # Cloudflare/OpenNext build
npx playwright test  # E2E (1000+ passed, 0 skipped, 0 failed)
```

## Mock Atlas Cloud API

For testing AI generation workflows without real API keys or credits,
the mock Atlas server (`npm run mock-atlas`, port 3099) provides:

- Realistic LLM responses for AI Expand, ad-skit plans, drama scripts
- Generation task lifecycle simulation (pending → processing → completed)
- Placeholder media files (1x1 PNG, minimal MP4, minimal WAV)
- No real credits consumed; no external API calls made
