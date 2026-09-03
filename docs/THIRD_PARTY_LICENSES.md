# Third-Party License Inventory

Lazynext Operating System is a Lazynext-branded distribution built on the
open-source Atlas Marketing Studio project (MIT license). This document
inventories all third-party dependencies with their licenses, sources,
and attribution requirements.

## Heritage

Lazynext is built on the Atlas Marketing Studio project, originally
released under the MIT license:

- **Project**: Atlas Marketing Studio
- **License**: MIT
- **Source**: https://github.com/AtlasCloudAI/atlas-marketing-studio
- **Copyright**: AtlasCloudAI

The MIT license permits use, modification, and distribution with
attribution. The `NOTICE` file at the repository root preserves the
attribution chain.

## Core Dependencies

| Package | Version | License | Source | Attribution Required |
|---------|---------|---------|--------|----------------------|
| `next` | 16.x | MIT | https://nextjs.org | Yes (license + copyright) |
| `react` | 19.x | MIT | https://react.dev | Yes (license + copyright) |
| `react-dom` | 19.x | MIT | https://react.dev | Yes (license + copyright) |
| `next-auth` | 4.x | ISC | https://next-auth.js.org | Yes (license + copyright) |
| `@auth/prisma-adapter` | latest | ISC | https://authjs.dev | Yes (license + copyright) |
| `@prisma/client` | 7.x | Apache-2.0 | https://prisma.io | Yes (license + copyright + NOTICE) |
| `prisma` | 7.x | Apache-2.0 | https://prisma.io | Yes (license + copyright + NOTICE) |
| `bcryptjs` | 2.x | MIT | https://github.com/dcodeIO/bcrypt.js | Yes (license + copyright) |
| `dodopayments` | latest | MIT | https://dodopayments.com | Yes (license + copyright) |
| `lucide-react` | latest | ISC | https://lucide.dev | Yes (license + copyright) |
| `resend` | latest | MIT | https://resend.com | Yes (license + copyright) |
| `@ffmpeg/ffmpeg` | latest | MIT | https://ffmpeg.org | Yes (license + copyright) |
| `@ffmpeg/util` | latest | MIT | https://ffmpeg.org | Yes (license + copyright) |
| `@opennextjs/cloudflare` | latest | Apache-2.0 | https://opennext.js.org | Yes (license + copyright + NOTICE) |
| `@playwright/test` | latest | Apache-2.0 | https://playwright.dev | Yes (license + copyright + NOTICE) |
| `tailwindcss` | 4.x | MIT | https://tailwindcss.com | Yes (license + copyright) |
| `typescript` | 6.x | Apache-2.0 | https://typescriptlang.org | Yes (license + copyright + NOTICE) |
| `better-sqlite3` | latest | MIT | https://github.com/WiseLibs/better-sqlite3 | Yes (license + copyright) |
| `wrangler` | latest | Apache-2.0 | https://developers.cloudflare.com/workers/wrangler/ | Yes (license + copyright + NOTICE) |

## License Summary

### MIT License

The MIT license is a permissive license that allows use, modification,
distribution, and commercial use with minimal restrictions. The only
requirement is to include the copyright notice and license text.

Packages under MIT: `next`, `react`, `react-dom`, `bcryptjs`,
`dodopayments`, `resend`, `@ffmpeg/ffmpeg`, `@ffmpeg/util`,
`tailwindcss`, `better-sqlite3`.

### ISC License

The ISC license is functionally equivalent to the MIT license — a
permissive license requiring only copyright notice preservation.

Packages under ISC: `next-auth`, `@auth/prisma-adapter`, `lucide-react`.

### Apache-2.0 License

The Apache-2.0 license is a permissive license with explicit patent
grant. It requires preservation of the copyright notice, license text,
and NOTICE file (if present). It also requires stating significant
changes made to the software.

Packages under Apache-2.0: `@prisma/client`, `prisma`,
`@opennextjs/cloudflare`, `@playwright/test`, `typescript`, `wrangler`.

## Infrastructure Dependencies

Lazynext depends on Cloudflare infrastructure services. These are
proprietary services (not open-source packages) but are documented here
for completeness:

| Service | Provider | Documentation |
|---------|----------|---------------|
| Cloudflare Workers | Cloudflare | https://workers.cloudflare.com |
| Cloudflare D1 | Cloudflare | https://developers.cloudflare.com/d1 |
| Cloudflare R2 | Cloudflare | https://developers.cloudflare.com/r2 |
| Cloudflare Rate Limiting | Cloudflare | https://developers.cloudflare.com/workers/runtime-apis/rate-limit/ |
| Cloudflare DNS | Cloudflare | https://developers.cloudflare.com/dns |
| Cloudflare CDN | Cloudflare | https://developers.cloudflare.com/cache |

## AI Generation Dependencies

All AI generation (image, video, LLM, TTS, lip-sync) is powered by the
Atlas Cloud API:

- **Service**: Atlas Cloud API
- **Source**: https://www.atlascloud.ai
- **Usage**: Accessed via `ATLASCLOUD_API_KEY` secret; not a bundled
  dependency but a runtime API dependency.

## Attribution

The `NOTICE` file at the repository root preserves the attribution chain
required by the MIT and Apache-2.0 licenses. It must be included in all
distributions of Lazynext.

### NOTICE file location

```
/NOTICE
```

### Required attribution text

```
Lazynext Operating System
Copyright (c) 2026 Lazynext Platform

This product includes software developed by the following projects:
[see NOTICE file for full list]

Lazynext is a Lazynext-branded distribution built on the open-source
Atlas Marketing Studio project (MIT license):
https://github.com/AtlasCloudAI/atlas-marketing-studio
```

## License Compliance Checklist

- [ ] `NOTICE` file is present at repository root
- [ ] All MIT-licensed packages retain copyright notices
- [ ] All Apache-2.0 packages retain copyright notices and NOTICE files
- [ ] All ISC-licensed packages retain copyright notices
- [ ] Significant modifications to Apache-2.0 packages are documented
- [ ] Attribution is visible in the application (About page or similar)
- [ ] License inventory is reviewed on dependency updates

## Updating This Inventory

When adding or updating a dependency:

1. Check the package's `license` field in `package.json`.
2. Read the full `LICENSE` file in the package's repository.
3. Add the package to the appropriate table above with version, license,
   source, and attribution requirement.
4. Update the `NOTICE` file if a new attribution is required.
5. Run `npm audit` to check for known vulnerabilities.
6. Verify the license is compatible with the project's distribution model.
