# Lazynext

**Lazynext** is an AI e-commerce ad studio for generating UGC product ads, reference-ad remakes, AI drama ads, and short ad skits, powered by [Atlas Cloud](https://www.atlascloud.ai?utm_source=github&utm_campaign=atlas-marketing-studio).

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-f38020)](https://workers.cloudflare.com/)
[![Powered by Atlas Cloud](https://img.shields.io/badge/powered%20by-Atlas%20Cloud-00b2fc)](https://www.atlascloud.ai?utm_source=github&utm_campaign=atlas-marketing-studio)

> Most AI video tools generate a clip. Lazynext gives you the ad workflow around it: product input, script, shots, reference assets, video generation, credits, login, and deployment.

## What this project is

Lazynext is a self-hostable AI ad generator for e-commerce teams, agencies, and builders, powered by [Atlas Cloud](https://www.atlascloud.ai?utm_source=github&utm_campaign=atlas-marketing-studio). It turns product photos, presenter images, product links, prompts, or reference ads into ready-to-use video ad concepts.

It is a real, runnable e-commerce creative studio with opinionated workflows for:

- AI UGC ads and product review videos
- Reference-ad remakes with your own product and presenter
- Short drama ads for social commerce
- Two-person ad skits from a simple product idea
- Multi-model image, video, LLM, TTS, and lip-sync pipelines
- Credit metering, Google login, Dodo Payments top-ups, and Cloudflare deployment

## AI ad workflows

Each workflow is a complete AI ad generation path, not just a single model call.

| Workflow | What it does | Use it for | Models |
|---|---|---|---|
| **UGC Product Ad** | Product + presenter photos -> lip-synced UGC ad | An **AI UGC ad generator** or **product-to-video ad generator** for product reviews, creator testimonials, direct-response e-commerce ads, and social ad variations. | Atlas Cloud prompt expansion, `nano-banana/edit` first frame, `seedance-2.0` image-to-video |
| **Reference to Ad** | Upload a viral ad -> remake it with your product and presenter | A **reference ad remake AI workflow** for adapting proven ad structure, talent framing, and product placement to your own offer. | `gemini-omni-flash/video-edit`, optional ElevenLabs TTS, optional `veed/lipsync`, fallback to `kling motion-control` |
| **AI Drama Ad** | One topic -> comedy script -> shot-by-shot drama ad | An **AI short drama ad generator** for social commerce, story-led e-commerce ads, and short-form video campaigns. | Atlas Cloud LLM script generation, reference image generation, `seedance-2.0/reference-to-video` per shot |
| **Ad Skit** | One-line product -> two-person comedy skit | A **short ad skit generator** for creator ads, TikTok-style product jokes, hook testing, and fast creative iteration. | Atlas Cloud LLM script generation, `gpt-image-2` product shot, `seedance-2.0/reference-to-video` with audio |

All workflows auto-detect the input language. Write the product brief in English, Chinese, or another language, and the generated script/ad follows that language.

## Who it is for

- E-commerce founders who need more ad creative variations
- UGC creators and performance marketing teams testing short-form video ads
- Agencies building repeatable AI ad production workflows for clients
- Developers studying how to build an AI video SaaS with real billing and deployment
- Atlas Cloud users who want a working multi-model reference app

## Features

- Product-to-video workflows for AI UGC ads, product commercials, drama ads, and ad skits
- Reference-ad remake flow for turning a working creative into a new product ad
- Multi-model orchestration through the Atlas Cloud API
- Dynamic video credit pricing based on duration, model, and resolution
- Google login with NextAuth
- Dodo Payments checkout or Atlas redeem-code top-ups
- Cloudflare D1 database via Prisma
- Cloudflare R2 media storage
- OpenNext Cloudflare Workers deployment
- Public media URL handling for model APIs that need fetchable assets
- MIT license for learning, forking, and self-hosting

## Quick start

```bash
git clone https://github.com/Lazynext-Platform/lazynext.git
cd lazynext
npm install
```

For local development:

```bash
cp .env.example .env.local
# Fill auth, Atlas Cloud, Dodo Payments, and Resend values.
npm run dev
```

For Cloudflare/OpenNext preview:

```bash
cp .dev.vars.example .dev.vars
# D1 and R2 come from wrangler.jsonc bindings.
npm run cf:preview
```

Core application variables:

```env
ATLASCLOUD_API_KEY=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
PAYMENT_PROVIDER=atlas
```

Platform resources:

| Platform | Database | Media storage |
|---|---|---|
| Cloudflare | D1 binding `DB` | R2 binding `MEDIA_BUCKET` |

Where to get each value:

| Variable | Where to get it | Notes |
|---|---|---|
| `ATLASCLOUD_API_KEY` | [Atlas Cloud API Keys](https://www.atlascloud.ai/docs/api-keys) | Create an Atlas Cloud API key for image, video, LLM, TTS, and lip-sync generation. API keys are shown once, so store it safely. |
| `NEXTAUTH_SECRET` | [NextAuth secret](https://next-auth.js.org/configuration/options#nextauth_secret) | Generate locally with `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | [Google Cloud OAuth clients](https://console.cloud.google.com/auth/clients) | Create a Web application OAuth client for Google sign-in. |
| `GOOGLE_CLIENT_SECRET` | [Google Cloud OAuth clients](https://console.cloud.google.com/auth/clients) | Copy the client secret from the same Web application OAuth client. |
| `DODO_PAYMENTS_API_KEY` | [Dodo Payments Dashboard](https://app.dodopayments.com/) | Required when `PAYMENT_PROVIDER=dodo`. Get from Developer → API. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | [Dodo Payments Dashboard](https://app.dodopayments.com/) | Required for Dodo webhook verification. Get from Developer → Webhooks. |
| `DODO_PAYMENTS_ENVIRONMENT` | — | `test_mode` or `live_mode`. Defaults to `test_mode`. |
| `DODO_PRODUCT_STARTER` | — | Product ID from `npm run setup:dodo`. |
| `DODO_PRODUCT_PRO` | — | Product ID from `npm run setup:dodo`. |
| `DODO_PRODUCT_ELITE` | — | Product ID from `npm run setup:dodo`. |
| `RESEND_API_KEY` | [Resend Dashboard](https://resend.com/api-keys) | API key for transactional email delivery. |
| `FROM_EMAIL` | Resend Dashboard | Verified sender address (e.g. `Lazynext <support@lazynext.com>`). |
| `SIGNUP_BONUS_CREDITS` | — | Credits granted to new users on signup. Defaults to `0`. |
| `ADMIN_EMAILS` | — | Comma-separated admin email addresses. |

Open [http://localhost:3000](http://localhost:3000).

Get an Atlas Cloud API key at [Atlas Cloud](https://www.atlascloud.ai?utm_source=github&utm_campaign=atlas-marketing-studio).

## Deploy

Lazynext deploys exclusively to Cloudflare Workers using OpenNext.

### Deploy to Cloudflare Workers

```bash
npm run cf:deploy
```

Cloudflare uses the `DB` D1 binding and `MEDIA_BUCKET` R2 binding in
`wrangler.jsonc`. The deployment includes a custom domain route for `lazynext.com`.

Set application secrets with Wrangler or the dashboard:

```bash
wrangler secret put ATLASCLOUD_API_KEY
wrangler secret put NEXTAUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for resource creation, database
initialization, legacy R2 compatibility, verification commands, and data
migration boundaries.

## Credits and pricing

Users spend in-app credits while your deployment pays Atlas Cloud in USD. The app maps AI generation cost to credits:

- Fixed-cost steps such as image generation, LLM scripts, and TTS use flat credit prices.
- Video generation uses dynamic pricing based on model, duration, and resolution.

`src/lib/video-pricing.ts` calculates video credits like this:

```text
credits = ceil(perSecond[resolution] * seconds * ACCOUNT_MARKUP * MARGIN / CREDIT_USD)
```

Top-up packs live in `src/config/pricing.ts`, so you can adjust margin and packaging in one place.

## License

MIT. AI generation powered by [Atlas Cloud](https://www.atlascloud.ai?utm_source=github&utm_campaign=atlas-marketing-studio).

Lazynext is a Lazynext-branded distribution built on the open-source [Atlas Marketing Studio](https://github.com/AtlasCloudAI/atlas-marketing-studio) project (MIT). All AI generation runs through the Atlas Cloud API.

## Technical architecture

```text
atlas-marketing-studio/
|-- src/
|   |-- app/                         # Next.js 14 App Router pages and API routes
|   |   |-- lazynext-studio/         # AI UGC ad generator UI
|   |   |-- ad-reference/             # Reference ad remake workflow
|   |   |-- drama-studio/             # AI short drama ad generator
|   |   |-- ad-skit/                  # Two-person ad skit generator
|   |   |-- my-work/                  # Saved generations and creation history
|   |   |-- pricing/                  # Credit packs and top-up screen
|   |   `-- api/                      # Generation, auth, checkout, redeem, webhooks
|   |-- components/                   # Reusable studio UI components
|   |-- config/                       # Pricing and product configuration
|   |-- i18n/                         # Multilingual UI copy
|   `-- lib/
|       |-- atlas.ts                  # Atlas Cloud API client
|       |-- video-pricing.ts          # Duration and resolution based credit pricing
|       |-- lazynext-studio/         # UGC ad formats, schemas, and prompts
|       |-- drama/                    # Drama scripts, prompts, and shot planning
|       `-- payments/                 # Dodo Payments checkout and redeem-code credits
|-- prisma/
|   `-- schema.prisma                 # Users, accounts, credits, creations, codes
|-- public/
|   `-- samples/                      # Demo videos and reference assets
|-- open-next.config.ts               # OpenNext build target for Cloudflare Workers
|-- wrangler.jsonc                    # Cloudflare deployment config
`-- package.json                      # Next.js, Prisma, Dodo Payments, Atlas Cloud scripts
```
