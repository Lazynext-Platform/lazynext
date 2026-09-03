# Legal Documentation Inventory — Lazynext Operating System

**Status:** Living document. Last updated 2026-09-03.
**Scope:** Inventory of legal documents required for the Lazynext platform, their current status, and gaps. Grounded in the Phase 0 Discovery Report (§H) and source inspection of live `/terms` and `/privacy` routes.
**Principle:** Legal documents must reflect **actual product functionality**. Documents that describe a different product (e.g. the legacy "AI e-commerce ad studio") are non-compliant and must be rewritten.

> **Disclaimer:** This inventory identifies what exists and what is missing. Drafting the actual legal text requires qualified legal counsel. Items marked **[REQUIRES COUNSEL]** must be reviewed or authored by a lawyer.

---

## 1. Inventory

| # | Document | Route / Location | Status | Issues / Notes |
|---|---|---|---|---|
| 1 | Terms of Service | `/terms` (`src/app/terms/page.tsx`) | **Exists — needs rewrite** | Describes old "AI e-commerce ad studio" identity; thin; no API terms, no MCP terms, no AUP, no DPA, no IP/takedown, no dispute/termination detail |
| 2 | Privacy Policy | `/privacy` (`src/app/privacy/page.tsx`) | **Exists — needs rewrite** | Describes old identity; no retention specifics, no subprocessor list, no AI policy, no cookie policy, no DSR workflow, no regional disclosures (GDPR/DPDP/CCPA) |
| 3 | Cookie Policy | — | **Missing** | Required for EU/UK ePrivacy and other jurisdictions |
| 4 | Acceptable Use Policy | — | **Missing** (only a clause in ToS) | Must be standalone; list prohibited uses (abuse, illegal content, scraping, prompt injection for harm) |
| 5 | Refund / Cancellation Policy | — | **Thin** (one line in ToS) | Credit-pack model; define refund eligibility, window, method |
| 6 | Data Processing Agreement (DPA) | — | **Missing** | Required by GDPR Art. 28 for B2B customers; also needed with subprocessors |
| 7 | Subprocessor Information | — | **Missing** | Public list of subprocessors with data, purpose, location (see `docs/PRIVACY.md` §13) |
| 8 | Security Documentation | — | **Missing** | This `docs/SECURITY.md` is engineering-internal; a customer-facing security overview is needed |
| 9 | Vulnerability Disclosure Policy | — | **Missing** | `security@lazynext.com` inbox + safe-harbor terms + scope |
| 10 | API Terms | — | **Missing** | Public API v1 is planned; terms must govern API keys, rate limits, usage, prohibition of resale |
| 11 | Developer Terms | — | **Missing** | For developers integrating via API/MCP |
| 12 | AI / Agent Usage Policy | — | **Missing** | Transparency on AI features, prohibited AI uses, output ownership, human-oversight expectations |
| 13 | Data Retention Policy | — | **Missing** | Per-category retention schedule (see `docs/PRIVACY.md` §4) |
| 14 | Data Deletion Policy | — | **Missing** | Deletion procedure, timelines, backup purge (see `docs/PRIVACY.md` §5) |
| 15 | Copyright / Takedown Policy (DMCA) | — | **Missing** | Designated agent, takedown process, counter-notice |
| 16 | Trademark Usage Guidelines | — | **Missing** | Brand name/logo usage rules |
| 17 | Subprocessor DPA (with each vendor) | — | **Missing** | Cloudflare, Atlas, Dodo, Resend, Google, ipapi.co |
| 18 | Internal Records of Processing (ROPA) | — | **Missing** | GDPR Art. 30 (see `docs/COMPLIANCE.md` §3) |
| 19 | Incident Response Plan | — | **Missing** | See `docs/SECURITY.md` §12 |
| 20 | License (repo) | repo root | **Missing** | No `LICENSE`/`NOTICE`/third-party attribution file. Terms §6 claims MIT lineage — **[REQUIRES COUNSEL]** to verify |

---

## 2. Document-to-Functionality Alignment

Legal documents must match what the product actually does. Key functionality to reflect:

| Functionality | Document that must cover it | Current coverage |
|---|---|---|
| Email + password + Google OAuth login | ToS (account), Privacy (auth data) | Partial |
| Credit-pack purchases via Dodo | ToS (billing), Refund Policy, Privacy (payment data) | Thin |
| AI generation via Atlas Cloud | AI Policy, Privacy (subprocessor), ToS (output ownership) | **Missing** |
| Ad publishing to Meta/Google via OAuth | ToS (third-party terms), Privacy (OAuth tokens), AUP | **Missing** |
| Team/workspace collaboration | ToS (team roles), Privacy (team member data) | **Missing** |
| Public sharing links (`/share/[token]`) | Privacy (public data), AUP | **Missing** |
| MCP server / agent skill chains | API Terms, AI Policy, AUP | **Missing** |
| 13 locales / ~30 currencies | ToS (governing law per region), Privacy (regional disclosures) | **Missing** |
| Webhooks (user + Dodo) | API Terms, Privacy | **Missing** |
| Scheduled posts / automations | ToS (automation), AUP | **Missing** |
| Admin dashboard (`ADMIN_EMAILS`) | Privacy (admin access), ToS | **Missing** |

---

## 3. Versioning & Acceptance

**Current state:** No versioned legal documents. No acceptance recording (version, timestamp, user, context).

**Required:**
- Each legal document has a version number and `lastUpdated` date.
- A `LegalAcceptance` table records `userId, documentType, version, acceptedAt, context (signup/checkout)`.
- Users must re-accept on material change before continued use.
- Admin can view acceptance history for audit.

**Remediation:** build the versioning + acceptance system; surface "last updated" on each legal page; gate signup/checkout on current acceptance.

---

## 4. Regional Disclosures Required

| Region | Disclosure | Document |
|---|---|---|
| EU/EEA | Lawful basis, DSR rights, subprocessor list, retention, transfer mechanism, DPA availability | Privacy Policy |
| UK | UK representative (if no UK establishment), ICO registration | Privacy Policy |
| India (DPDP) | Consent manager, grievance officer, Data Protection Board contact | Privacy Policy |
| California (CCPA/CPRA) | "Do Not Sell/Share" notice, GPC honor, financial-incentive notice (if any), privacy rights request process | Privacy Policy + notice at collection |
| Brazil (LGPD) | DPO contact, ANPD rights | Privacy Policy |
| Canada (PIPEDA/Quebec 25) | Breach process, DPO (Quebec) | Privacy Policy |
| All | Cookie categories, consent mechanism | Cookie Policy |

---

## 5. Contact & Roles

| Role | Required | Current |
|---|---|---|
| Data Protection Officer (DPO) | EU/UK if large-scale/sensitive; LGPD; Quebec | **Not appointed** |
| Privacy contact email | All | `privacy@lazynext.com` **[to set up]** |
| Security contact email | All | `security@lazynext.com` **[to set up]** |
| DMCA designated agent | US | **Not designated** |
| Grievance officer (India) | DPDP | **Not appointed** |
| EU/UK representative | If no EU/UK establishment | **Not appointed** |

---

## 6. Matters Requiring Qualified Legal Counsel

The following must be reviewed or authored by a qualified lawyer before launch:

1. **Terms of Service** — rewrite for the Lazynext OS identity; cover accounts, billing/credits, AI outputs, teams, API/MCP, third-party ad platforms, IP, takedown, dispute/termination, governing law.
2. **Privacy Policy** — rewrite with full regional disclosures, retention, subprocessors, DSR workflow, AI transparency.
3. **Cookie Policy** — categories, consent, withdrawal.
4. **Acceptable Use Policy** — prohibited uses, enforcement, account suspension.
5. **Refund/Cancellation Policy** — credit-pack eligibility, window, method.
6. **DPA** — for B2B customers and with each subprocessor.
7. **AI/Agent Usage Policy** — transparency, prohibited uses, output ownership, human oversight.
8. **API Terms & Developer Terms** — key usage, rate limits, resale, liability.
9. **DMCA/Takedown Policy** — designated agent, process, counter-notice.
10. **Data Retention & Deletion Policies** — per-category schedules.
11. **Vulnerability Disclosure Policy** — scope, safe harbor, response SLA.
12. **License/attribution** — verify Terms §6 MIT claim; add `LICENSE`/`NOTICE`.
13. **Governing law & jurisdiction** — per region **[REQUIRES COUNSEL]**.
14. **Children's data / age gating** — approach per jurisdiction.

---

## 7. Remediation Priority

1. Rewrite Terms of Service and Privacy Policy to match actual product (blocks compliance).
2. Create Cookie Policy + consent banner (blocks EU/UK launch).
3. Create Acceptable Use Policy + AI/Agent Usage Policy (blocks AI features launch).
4. Publish Subprocessor list + sign DPAs (blocks B2B/EU launch).
5. Create Refund/Cancellation Policy (blocks paid launch).
6. Create API Terms + Developer Terms (blocks public API launch).
7. Create DMCA/Takedown + VDP (blocks public launch).
8. Build versioning + acceptance system.
9. Appoint DPO/representatives/grievance officer as required.
10. Add `LICENSE`/`NOTICE`/attribution to repo.
