# Privacy Engineering — Lazynext Operating System

**Status:** Living document. Last updated 2026-09-03.
**Scope:** Privacy posture of the Lazynext platform, grounded in the Phase 0 Discovery Report (§D, §H) and source inspection.
**Frameworks:** GDPR (EU/EEA), UK GDPR, India DPDP, US state laws (CCPA/CPRA), Brazil LGPD. This document is engineering guidance; legal obligations are evaluated in `docs/COMPLIANCE.md`.

> **Disclaimer:** Privacy law is jurisdiction-specific. Matters requiring qualified legal counsel are marked **[REQUIRES COUNSEL]**.

---

## 1. Data Inventory (what we collect and why)

| Data category | Examples | Source | Purpose | Lawful basis (GDPR) | Stored in |
|---|---|---|---|---|---|
| Account / identity | email, name, profile image | User (signup/OAuth) | Service delivery, auth | Contract / Consent | `User` |
| Auth credentials | password hash (bcrypt), OAuth account link | User | Authentication | Contract | `User.password`, `Account` |
| Preferences | locale, theme, country, currency | User / IP geo | UX personalization | Consent / Legitimate interest | `User`, cookies |
| Usage / billing | credits, ledger entries, redeemed codes | User / system | Billing, usage tracking | Contract | `CreditLedger`, `RedeemedCode` |
| Creative content | prompts, generated scripts, storyboards, assets | User + Atlas AI | Service output | Contract | `Creation`, `Asset`, R2 |
| Uploaded files | product images, avatars, brand kits | User | Service input | Contract | `AdProduct`, `AdAvatar`, `BrandKit`, R2 |
| Team / org data | team name, members, invitations, activity | User (team owner) | Collaboration | Contract / Legitimate interest | `Team`, `TeamMember`, `TeamInvitation`, `TeamActivity` |
| Platform connections | Meta/Google Ads OAuth tokens | User (OAuth) | Ad publishing, metrics | Consent | `PlatformConnection` (plain text — see §7) |
| Communication | support requests, feedback | User | Support | Consent / Legitimate interest | `Feedback` |
| Technical / logs | IP, user agent, timestamps, console logs | Automatic | Security, ops | Legitimate interest | Cloudflare logs, Worker logs |
| Safety audit data | Meta/Google safety approvals, actor strings | System / admin | Compliance | Legitimate interest / Legal obligation | `MetaSafetyAudit`, `GoogleSafetyAudit` (no `userId`) |

**Children's data:** The service is not directed at children under 16 (or applicable age). No age gate is currently implemented. **[REQUIRES COUNSEL]** on age-verification obligations per jurisdiction.

---

## 2. Data Minimization

| Field | Necessary? | Notes |
|---|---|---|
| email | Yes | Primary identifier; login + notifications. |
| name | Optional | Display only; could be made optional. |
| profile image | Optional | From Google OAuth or upload. |
| country / currency | Yes for billing UX | Derived from IP geo on first visit; stored in cookie. |
| IP address | Transient | Used for geo + rate limit; logged by Cloudflare. |
| `User.credits` | Yes | Required for billing/usage. |
| OAuth tokens | Only if user connects ad platforms | Should be encrypted at rest (see §7). |

**Minimization gaps:**
- 134 `console.*` calls in `src/app/` may log personal data in production. **Remediation:** structured logger with redaction.
- Safety audit models store raw `actor`/`approvedBy` strings with no user relation — may over-collect admin PII. **Remediation:** link to `userId`.

---

## 3. Purpose Limitation

Each data category has a documented purpose (§1). Reuse of data for a new purpose requires either (a) compatibility with the original purpose, (b) fresh consent, or (c) a legal obligation. **[REQUIRES COUNSEL]** to validate compatibility assessments.

**Current risk:** Creative content (prompts, outputs) could be reused to train or improve Atlas models. This must be disclosed and consented. **Remediation:** explicit consent toggle for "use my outputs to improve models"; default off.

---

## 4. Retention

| Data | Current retention | Recommended retention | Gap |
|---|---|---|---|
| Account | Until deletion | Until deletion + grace period | No soft-delete; hard delete on request |
| Creations / assets | Until deletion | Until deletion | No retention policy documented |
| Credit ledger | Until deletion | 7 years (tax/finance) **[REQUIRES COUNSEL]** | Cascade delete wipes ledger on User delete |
| Audit logs (safety) | 24h TTL | 1-7 years depending on jurisdiction | TTL too short for compliance |
| Session JWTs | ~30d (NextAuth default) | 30d or shorter | Not revocable |
| Webhook / payment records | Until deletion | 7 years (tax) | Dodo retains per its policy |
| Cloudflare edge logs | Per Cloudflare policy | 30-90 days typical | Verify in Cloudflare contract |
| Backups | **Not documented** | Defined backup retention | **[REQUIRES COUNSEL + Ops]** |

**Critical gap:** There is **no soft-delete** anywhere (`deletedAt`/`isDeleted` absent). Broad cascade deletes on `User` wipe nearly all per-user data — risky for audit/compliance retention (tax records, safety audits). **Remediation:** implement soft-delete; exclude soft-deleted records from queries; define a retention schedule per data category.

---

## 5. Deletion

- **User-initiated:** No self-service account deletion flow exists. **Remediation:** add "Delete my account" in settings with confirmation; cascade per retention schedule; notify subprocessors.
- **Hard delete today:** Deleting a `User` cascades to most per-user models, but safety audit models (no `userId`) are orphaned, and `RedeemedCode.userId` is a scalar without FK so it may not cascade.
- **Backup deletion:** Must ensure deleted data is removed from backups within the backup retention window. **[REQUIRES COUNSEL]**
- **Legal hold:** No legal-hold mechanism. **Remediation:** flag records under legal hold to suspend deletion.

---

## 6. Export (Portability)

- **No data export endpoint exists.** GDPR Art. 20 and CCPA grant a right to data portability.
- **Remediation:** implement `GET /api/me/export` returning a JSON/ZIP of the user's data (profile, creations metadata, assets, ledger, team memberships). Machine-readable, structured format.

---

## 7. Correction (Rectification)

- Users can edit name and profile image via settings. Email change is not exposed. **Remediation:** allow email change with re-verification; allow correction of preferences.

---

## 8. Consent

| Consent type | Mechanism | Status |
|---|---|---|
| Account creation | Signup form / OAuth | Implied (contract) |
| Marketing emails | **No mechanism** | **Missing** — must be opt-in, granular, withdrawable |
| Cookies (non-essential) | **No consent banner** | **Missing** — see §10 |
| Model training on user data | **No mechanism** | **Missing** |
| Ad-platform OAuth connection | OAuth flow | Present (deauthorization needed) |

**Remediation:** consent management service or simple DB table recording `userId, consentType, version, grantedAt, withdrawnAt`; granular toggles in settings; withdrawable at any time.

---

## 9. Lawful Basis

Per data category (§1). Predominantly **contract** (service delivery) and **legitimate interest** (security, ops). Marketing and non-essential cookies require **consent**. Safety/compliance records may rely on **legal obligation**. **[REQUIRES COUNSEL]** to confirm and document the legitimate-interest balancing test.

---

## 10. Cookie Categories

The platform sets the following cookies (from `src/proxy.ts` and `auth.ts`):

| Cookie | Purpose | Category | Lifetime | Consent required? |
|---|---|---|---|---|
| `next-auth.session-token` (`__Secure-`) | Auth session | Strictly necessary | ~30d | No |
| `next-auth.callback-url` | Auth redirect | Strictly necessary | Session | No |
| `next-auth.csrf-token` (`__Host-`) | CSRF protection | Strictly necessary | Session | No |
| `next-auth.state` / `pkce.code_verifier` | OAuth flow | Strictly necessary | 15 min | No |
| `locale` | Language preference | Preference | 1 year | No (but disclose) |
| `country` / `currency` | Region detection | Preference | 1 year | No (but disclose) |
| Cloudflare `__cf_bm` | Bot management | Security | ~30 min | No (Cloudflare-managed) |

**Analytics cookies:** Cloudflare Web Analytics is loaded (`cloudflareinsights.com` in CSP). Cloudflare claims cookie-free analytics by default; verify whether any analytics cookies are set. **[REQUIRES COUNSEL]**

**Consent banner:** **Missing.** Required for EU/UK (ePrivacy) and other jurisdictions for non-essential cookies/trackers. **Remediation:** implement a consent banner that blocks non-essential scripts until consent; record consent.

---

## 11. Analytics Controls

- Cloudflare Web Analytics is the only analytics provider observed (CSP `connect-src` includes `cloudflareinsights.com`).
- No Google Analytics 4 SDK observed in CSP, though `/api/analytics/ga4` route exists (server-side data fetch, not client SDK).
- **Remediation:** document analytics data flow; ensure no cross-site tracking without consent; configure Cloudflare Analytics to respect Do-Not-Track where required.

---

## 12. Marketing Preferences

- **No marketing email system is wired.** Resend is used for verification/reset only.
- **Remediation (when marketing is added):** double opt-in; granular categories; one-click unsubscribe (CAN-SPAM, GDPR); suppression list; honor Global Privacy Control (GPC) signals.

---

## 13. Data Sharing & Subprocessors

| Subprocessor | Purpose | Data shared | Location | DPA status |
|---|---|---|---|---|
| Cloudflare | Edge, D1, R2, Workers, Analytics | All app data | Global (edge) | **[VERIFY DPA]** |
| Atlas Cloud | AI generation | Prompts, reference media | **[UNVERIFIED]** | **[VERIFY DPA]** |
| Dodo Payments | Payment processing | Billing info, email | **[UNVERIFIED]** | **[VERIFY DPA]** |
| Resend | Transactional email | Email, name | **[UNVERIFIED]** | **[VERIFY DPA]** |
| Google (OAuth) | Login + Ads API | Email, name, profile | Google's regions | **[VERIFY DPA]** |
| ipapi.co | Geo fallback | IP address | **[UNVERIFIED]** | **[VERIFY DPA]** |

**Critical gap:** No subprocessor disclosure page exists (required by GDPR Art. 28, CCPA). **Remediation:** publish a subprocessor list with purposes, data, and locations; sign DPAs; notify users of new subprocessors.

---

## 14. International Transfers

- Cloudflare (edge, global), Atlas Cloud, Dodo, Resend, Google — data may leave the user's jurisdiction.
- **No transfer mechanism documented** (SCCs, adequacy decisions, TIA). **[REQUIRES COUNSEL]**
- **Remediation:** map data flows; execute SCCs where needed; document adequacy status; provide transfer impact assessment for non-adequate destinations.

---

## 15. Privacy Requests Workflow (DSR / SAR)

**Current state:** No workflow. No inbox, no identity verification, no SLA tracking.

**Required workflow:**
1. **Intake:** `privacy@lazynext.com` + in-app form (`/settings/privacy`).
2. **Identity verification:** re-auth + email confirmation.
3. **Logging:** ticket per request with type, received date, due date, status.
4. **Fulfillment SLA:** 30 days (GDPR), 45 days (CCPA, extendable). **[REQUIRES COUNSEL]**
5. **Supported request types:** access, rectification, deletion, restriction, objection, portability.
6. **Notification:** notify subprocessors of deletions where applicable.
7. **Refusal/denial:** documented reason + appeal path.

**Remediation:** build the intake form + ticket table + fulfillment runbook.

---

## 16. User Rights Matrix

| Right | GDPR | UK GDPR | DPDP | CCPA/CPRA | LGPD | PIPEDA | Implemented? |
|---|---|---|---|---|---|---|---|
| Access (copy of data) | Art. 15 | Art. 15 | §11 | §1798.100 | Art. 18 | Princ. 4.9 | No |
| Rectification | Art. 16 | Art. 16 | §12 | §1798.106 | Art. 19 | Princ. 4.9.1 | Partial (name/image only) |
| Deletion | Art. 17 | Art. 17 | §11(d) | §1798.105 | Art. 18 | Princ. 4.5.3 | No |
| Restriction | Art. 18 | Art. 18 | — | — | Art. 19 | — | No |
| Objection | Art. 21 | Art. 21 | — | — | Art. 20 | — | No |
| Portability | Art. 20 | Art. 20 | — | §1798.100(d) | Art. 18 | — | No |
| Withdraw consent | Art. 7 | Art. 7 | §7 | — | Art. 8 | Princ. 4.3 | No |
| Opt-out of sale/share | — | — | — | §1798.120 | Art. 16 | — | No (no sale/share currently) |
| Do Not Sell/Share notice | — | — | — | §1798.135 | — | — | Missing |
| GPC signal honor | — | — | — | CPRA | — | — | Missing |

**Remediation:** implement all supported rights via the DSR workflow (§15); publish rights information in the Privacy Policy.

---

## 17. Privacy by Design Checklist

- [ ] Data minimization review per new feature.
- [ ] Retention schedule enforced (cron job to purge expired data).
- [ ] Soft-delete + legal-hold mechanism.
- [ ] Consent management with versioning.
- [ ] DSR workflow (intake → verify → fulfill → notify).
- [ ] Subprocessor list published + DPAs signed.
- [ ] Transfer mechanism documented.
- [ ] Encryption of OAuth tokens at rest.
- [ ] Structured logging with PII redaction.
- [ ] Privacy Policy reflecting actual data flows (see `docs/LEGAL.md`).
- [ ] Cookie consent banner for non-essential cookies.
- [ ] Model-training consent toggle (default off).
