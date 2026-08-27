# Lazynext — Development Guide

## Local Development Setup

### Prerequisites
- Node.js 25+
- npm

### Environment
- `.env.local` contains local dev overrides (not committed to git)
- `NEXTAUTH_URL` and `AUTH_URL` must point to `http://localhost:3100`
- `ADMIN_EMAILS` lists emails authorized for the admin dashboard

### Running the dev server
```bash
npm run dev    # starts on port 3100 with BUILD_TARGET=local
```

### Mock Atlas Cloud API (for generation testing)
The mock Atlas server allows testing AI generation workflows without real API keys or credits.

```bash
npm run mock-atlas    # starts on port 3099
```

Set these env vars in `.env.local` (already configured):
```
ATLASCLOUD_BASE=http://localhost:3099/api/v1
ATLASCLOUD_LLM_BASE=http://localhost:3099/v1
ATLASCLOUD_API_KEY=mock-key-for-dev
```

The mock server:
- Returns realistic LLM responses for AI Expand, ad-skit plans, drama scripts, and marketing plans
- Simulates generation task lifecycle: pending → processing → completed (after 3 polls)
- Serves placeholder media files (1x1 PNG, minimal MP4, minimal WAV)
- Does NOT consume real credits or make external API calls

### Local Prisma (SQLite)
Local dev uses `better-sqlite3` via `src/lib/prisma.local.ts`.
Production uses Cloudflare D1 via `src/lib/prisma.cloudflare.ts`.
The `scripts/prepare-platform.mjs` script selects the correct implementation based on `BUILD_TARGET`.

### Local Media Storage
Local dev uses file-based media storage via `src/lib/media-storage.local.ts`.
Files are stored in `.dev-media/` directory.
Production uses Cloudflare R2 via `src/lib/media-storage.cloudflare.ts`.

## Verification Commands
```bash
npm run lint    # ESLint
npm test        # Node test runner (34 tests)
npm run build   # Production build (Cloudflare target)
```

## Test Account
- Email: `test@lazynext.local`
- Password: `Test1234!`
- Credits: starts at 150
- Included in `ADMIN_EMAILS` for admin access

## Responsive Design
- Safe-area utilities: `pt-safe`, `pb-safe`, `safe-top`, `safe-bottom`, `safe-area`
- All pages tested across 280px–2560px viewports with no horizontal overflow
- RTL support via `dir="rtl"` and `lang="ar"` (cookie-based locale switching)
- Admin table uses `overflow-x-auto` container for horizontal scrolling on narrow screens
- Touch targets enlarged for coarse-pointer devices
- `touch-action: manipulation` on interactive elements

## Key Architecture
- Next.js 16 + React 19 + TypeScript 6
- Tailwind CSS 4
- NextAuth (JWT session, Google + Credentials providers)
- Prisma 7 with D1 (prod) / SQLite (local)
- Cloudflare R2 (prod) / file-based (local) media storage
- Atlas Cloud AI generation API (prod) / mock server (local)
- Dodo Payments for billing

## Production-Only Testing (Cannot Be Verified Locally)

The following items require production infrastructure, external credentials, or
physical hardware and cannot be tested in the local development environment:

| Item | Why Local Testing Is Insufficient | What's Verified Locally |
|------|-----------------------------------|------------------------|
| Real Atlas Cloud API | Mock returns placeholder content (1x1 PNG, minimal MP4) | API contract, polling lifecycle, error handling |
| Real Cloudflare R2 | Local uses file-based storage in `.dev-media/` | Upload/download/delete flow, media references |
| Real Dodo Payments | No real payment processing; checkout redirect verified only | Checkout URL construction, redirect handling |
| Real email delivery | Forgot-password flow verified but no actual email sent | Token generation, reset API, password update |
| Real Google OAuth | Button rendered, provider configured, needs real credentials | OAuth provider config, callback routing |
| Real Cloudflare D1 | Local uses SQLite via `better-sqlite3` | Prisma schema, queries, migrations |
| Physical device testing | Safe-area insets simulated via CSS `env()` utilities | CSS rules verified, `viewport-fit=cover` set |
| Screen reader testing | ARIA attributes verified via DOM inspection, not SR software | All ARIA roles, labels, announcements in place |
| Real network throttling | localhost is too fast for slow-3G simulation | Performance metrics collected (FCP 100ms, TTFB 41ms) |
| Ad Reference generation | Requires public URLs; localhost rejected by Atlas | UI flow, form validation, error handling |
| Redeem mode | Requires `PAYMENT_PROVIDER=atlas` | Code path exists, UI verified |
| Rate limiting (429) | In-memory limiter; 30/min default, 20/min uploads | 429 response format, `Retry-After` header, client error handling |
| Video playback | Mock media doesn't return real video format | Video element, controls, download flow |

## Accessibility Audit Summary

Completed across 15+ sessions:

- WCAG AA color contrast (light and dark themes)
- All interactive elements have visible focus indicators (2px solid outline)
- All inputs have accessible names (`aria-label`, `<label>`, or `title`)
- All icon-only buttons have `aria-label` or `title`
- All images have `alt` attributes
- All dialogs have `role="dialog"`, `aria-modal="true"`, and `aria-label`
- All error messages use `role="alert"` with semantic `text-danger` color
- All success/info messages use `role="status"` with semantic `text-success`/`text-warning`
- All tables have `<caption>` (sr-only) and `scope="col"` on headers
- Skip link to `#main-content` on all pages
- Every page has exactly one `<h1>`
- External links use `rel="noopener noreferrer"`
- `prefers-reduced-motion` media query implemented
- `@media print` styles implemented
- Safe-area insets on all fixed/sticky elements
- `touch-action: manipulation` on interactive elements
- 13 locale translations (en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id)
- RTL support for Arabic (`dir="rtl"`, `lang="ar"`)
- 0 horizontal overflow across 41 viewport combinations (375px–2560px, 200% zoom, RTL)

