# Legal Applicability Matrix — Lazynext Operating System

**Status:** Living document. Last updated 2026-09-03.
**Scope:** Which laws may apply to Lazynext based on company location, user location, and data processing activities. Grounded in the Phase 0 Discovery Report (§H) and product inspection.
**Method:** Jurisdiction is triggered by (a) company establishment, (b) user location, (c) data processing activities, (d) offering goods/services to users in a region, (d) monitoring behavior in a region.

> **Disclaimer:** This matrix is an engineering triage of likely applicability, **not legal advice**. Every "Apply" and "Requires counsel" item must be confirmed by a qualified lawyer in the relevant jurisdiction. Items marked **[REQUIRES COUNSEL]** need professional review before launch.

---

## 1. Company & User Location Profile

| Factor | Current / Assumed | Notes |
|---|---|---|
| Company establishment | **[UNVERIFIED]** — likely India (INR currency, `hi` locale) | Determines primary regulator. **[REQUIRES COUNSEL]** |
| Target users | Global (13 locales: en, zh, ja, es, ko, pt, fr, de, ar, hi, vi, th, id) | Triggers multiple jurisdictions |
| Currencies displayed | ~30 | Indicates global commercial intent |
| Data processing | Cloudflare (global edge), D1, R2, Atlas Cloud, Dodo, Resend | Cross-border transfers |
| Payment processor | Dodo Payments | Jurisdiction of Dodo entity matters |
| AI provider | Atlas Cloud (`api.atlascloud.ai`) | Subprocessor; AI regulation relevant |
| Monitoring of behavior | Creative performance analytics, ad metrics | May trigger GDPR Art. 3(1)(b) |

---

## 2. Legal Applicability Matrix

| Law / regime | Region | Applies? | Trigger | Required actions | Counsel? |
|---|---|---|---|---|---|
| **India DPDP Act 2023** | India | **Likely yes** | Company/user in India; `hi` locale, INR | Consent manager, data principal rights, breach notification to Data Protection Board, DPA with processors | **[REQUIRES COUNSEL]** |
| **EU GDPR** | EU/EEA | **Yes** | Offering services to EU users (locales de, fr, es); monitoring | Lawful basis, DSR workflow, DPA, subprocessor list, records of processing, breach notification 72h, DPIA for AI | **[REQUIRES COUNSEL]** |
| **UK GDPR + DPA 2018** | UK | **Yes** | Offering services to UK users (en locale) | Same as EU GDPR; ICO registration; UK representative if no UK establishment | **[REQUIRES COUNSEL]** |
| **US — CCPA/CPRA** | California | **Likely yes** | Offering services to CA residents; `en` locale | Privacy notice, Do Not Sell/Share, GPC honor, DSR, contract with subprocessors | **[REQUIRES COUNSEL]** |
| **US — Other state laws** (VA VCDPA, CO CPA, CT CTDPA, UT UCPA, TX TDPSA, OR OCPA, etc.) | US states | **Likely yes** (several) | Offering services to residents | Privacy notice, DSR, opt-out of targeted ads/sale, sensitive-data opt-in | **[REQUIRES COUNSEL]** |
| **Brazil LGPD** | Brazil | **Likely yes** | `pt` locale; offering services | Privacy notice, DSR, DPO appointment (if applicable), ANPD breach notification | **[REQUIRES COUNSEL]** |
| **Canada PIPEDA / Quebec Law 25** | Canada | **Likely yes** | Offering services to Canadians | Consent, DSR, breach notification (PIPEDA mandatory since 2018), Quebec-specific DPO + impact assessments | **[REQUIRES COUNSEL]** |
| **ePrivacy Directive (cookie law)** | EU/EEA | **Yes** | Non-essential cookies/trackers to EU users | Consent banner before non-essential cookies; granular consent; withdrawable | **[REQUIRES COUNSEL]** |
| **UK Privacy & Electronic Communications Regulations (PECR)** | UK | **Yes** | Non-essential cookies/trackers to UK users | Same as ePrivacy | **[REQUIRES COUNSEL]** |
| **Consumer protection (FTC Act §5, EU UCPD, India CPA)** | Global | **Yes** | Commercial practices | No deceptive UX/dark patterns; truthful pricing; clear terms | **[REQUIRES COUNSEL]** |
| **Electronic communications / anti-spam (CAN-SPAM, GDPR ePrivacy, India)** | Global | **Yes** (when marketing email added) | Marketing emails | Opt-out, sender identity, physical address | **[REQUIRES COUNSEL]** |
| **Payments / payment services** | Global | **Yes** | Dodo Payments checkout | PCI DSS scope (likely SAQ-A via hosted checkout); refund policy; receipt/invoice | **[REQUIRES COUNSEL]** |
| **Taxation (GST, VAT, sales tax)** | India, EU, US, etc. | **Yes** | Selling paid services | Tax registration where required; invoice compliance; marketplace rules | **[REQUIRES COUNSEL]** |
| **Accessibility (WCAG 2.1/2.2, ADA, EAA, India RPwD)** | Global | **Yes** | Public web app | WCAG 2.1 AA conformance; EAA compliance for EU access (June 2025) | **[REQUIRES COUNSEL]** |
| **Intellectual property (copyright, trademark)** | Global | **Yes** | User-generated content, AI outputs | ToS grant license; DMCA/takedown process; IP indemnity; AI-output ownership clarity | **[REQUIRES COUNSEL]** |
| **AI regulation (EU AI Act, India AI advisories, US state AI laws)** | EU, India, US | **Likely yes** | AI generation features | Transparency for AI-generated content; prohibited-practices review; risk classification (likely limited-risk) | **[REQUIRES COUNSEL]** |
| **Data localization (Russia, China, India sectoral)** | RU, CN, IN sectoral | **Maybe** | If users in those regions | Assess whether local storage required | **[REQUIRES COUNSEL]** |
| **Children's data (COPPA, GDPR Art. 8, DPDP §9)** | US, EU, India | **Maybe** | If any users under age threshold | Age gate; parental consent; or block minors | **[REQUIRES COUNSEL]** |

---

## 3. Data Processing Activities Register (ROPA — outline)

A Record of Processing Activities is required by GDPR Art. 30. The outline below should be completed by the DPO/data lead.

| Activity | Purpose | Data categories | Data subjects | Recipients | Retention | Cross-border | Lawful basis |
|---|---|---|---|---|---|---|---|
| Account provisioning | Service access | Identity, credentials | Users | Cloudflare, Google (OAuth) | Until deletion | Yes | Contract |
| AI content generation | Service delivery | Prompts, uploads, outputs | Users | Atlas Cloud, Cloudflare | Until deletion | Yes | Contract |
| Billing | Payment | Credits, email, payment metadata | Users | Dodo, Cloudflare | 7y (tax) | Yes | Contract |
| Ad publishing | Publishing | OAuth tokens, creative content | Users | Meta, Google | Until revocation | Yes | Consent |
| Analytics | Product improvement | Usage, IP | Users | Cloudflare | 30-90d | Yes | Legitimate interest |
| Email communication | Verification, support | Email, name | Users | Resend | Until deletion | Yes | Contract/Consent |
| Security/logging | Abuse prevention | IP, UA, events | All visitors | Cloudflare | 90d | Yes | Legitimate interest |

**Remediation:** complete the ROPA; review annually; store with legal records.

---

## 4. Breach Notification Obligations

| Regime | Authority | Deadline | Notify users? | Notes |
|---|---|---|---|---|
| EU GDPR | Supervisory authority | 72h | If high risk | Art. 33/34 |
| UK GDPR | ICO | 72h | If high risk | |
| India DPDP | Data Protection Board | "As soon as possible" | Yes | **[REQUIRES COUNSEL]** on exact timing |
| CCPA/CPRA | — | "Without unreasonable delay" | Yes (if >500 CA residents) | |
| Brazil LGPD | ANPD | "In a reasonable time" | Yes | |
| Canada PIPEDA | OPC | "As soon as feasible" | Yes (if real risk) | |

**Remediation:** incident response runbook with jurisdiction-specific notification paths (see `docs/SECURITY.md` §12).

---

## 5. Cookie & Tracking Compliance

- EU/UK: consent **before** setting non-essential cookies/trackers (ePrivacy/PECR).
- US states: opt-out of targeted advertising/sale; honor GPC.
- India DPDP: consent for cookies beyond strictly necessary.
- **Current state:** no consent banner. **Remediation:** implement a banner that blocks non-essential scripts (analytics, marketing) until consent; record consent; allow withdrawal.

---

## 6. AI-Specific Obligations

| Obligation | Source | Status |
|---|---|---|
| Transparency that content is AI-generated | EU AI Act, India AI advisory | **Missing** — outputs not labeled |
| Risk classification of AI system | EU AI Act | **[REQUIRES COUNSEL]** — likely "limited risk" |
| Prohibited practices check | EU AI Act | **[REQUIRES COUNSEL]** |
| Deepfake disclosure | India AI advisory | **[REQUIRES COUNSEL]** |
| User-facing AI transparency | US state AI laws (CO, CA SB 942) | **[REQUIRES COUNSEL]** |
| Human oversight for automated decisions | GDPR Art. 22 | **[REQUIRES COUNSEL]** — agent skill chains may qualify |

**Remediation:** label AI-generated outputs; document AI system classification; add human-in-the-loop for publishing decisions.

---

## 7. Accessibility

- Target: **WCAG 2.1 Level AA** (baseline for EAA, ADA, Section 508, India RPwD).
- Current: responsive 280px–2560px, RTL support, safe-area utilities, touch targets. No formal accessibility audit.
- **Remediation:** automated (axe) + manual audit; keyboard navigation; screen-reader labels; focus management; color-contrast verification; publish accessibility statement.

---

## 8. Consumer Protection & Dark Patterns

- Pricing must be truthful and non-deceptive (FTC §5, EU UCPD, India CPA).
- Current pricing page shows 3 credit packs ($9/$39/$99) in ~30 currencies. Homepage exposes business-internal economics ("~$0.01-0.04", "~95%") — likely a debug artifact and potentially misleading. **Remediation:** remove internal economics from public UI.
- No dark patterns (forced continuity, hidden subscriptions) observed; credit-pack model is one-time. **[REQUIRES COUNSEL]** review of checkout UX.

---

## 9. Taxation

- Selling paid services globally triggers tax registration/obligations in multiple jurisdictions (GST in India, VAT in EU via OSS/IOSS, US sales tax economic nexus).
- **Current state:** no tax handling observed in app; Dodo may handle merchant-of-record. **[REQUIRES COUNSEL]** to confirm who is merchant of record and tax obligations.

---

## 10. Summary — Counsel Required

The following require qualified legal counsel before launch or continued operation:

1. Confirm company establishment and primary regulator (India DPDP vs. other).
2. EU/UK GDPR compliance program (DPA, ROPA, DSR, breach, DPIA).
3. US state privacy law compliance (CCPA/CPRA + 12+ other states).
4. Subprocessor DPAs (Cloudflare, Atlas, Dodo, Resend, Google, ipapi.co).
5. Cross-border transfer mechanism (SCCs, adequacy, TIA).
6. Cookie consent banner scope and implementation.
7. AI Act / AI advisory classification and transparency.
8. Payment/tax merchant-of-record and invoicing.
9. Accessibility conformance and statement.
10. IP ownership of AI outputs and user content; takedown process.
11. Children's data / age gating.
12. Marketing email compliance (when added).

**Legal document inventory and status:** see `docs/LEGAL.md`.
