# Legal Review Checklist for Qualified Counsel

**Date:** 2026-09-03
**Prepared by:** Automated audit (not legal advice)
**Purpose:** Provide counsel with a structured checklist for reviewing all 9 legal documents

---

## Documents Requiring Review

| # | Document | URL | Priority |
|---|---|---|---|
| 1 | Terms of Service | https://lazynext.com/terms | HIGH |
| 2 | Privacy Policy | https://lazynext.com/privacy | HIGH |
| 3 | Cookie Policy | https://lazynext.com/cookies | MEDIUM |
| 4 | Acceptable Use Policy | https://lazynext.com/acceptable-use | HIGH |
| 5 | Data Processing Agreement | https://lazynext.com/dpa | HIGH |
| 6 | Subprocessor List | https://lazynext.com/subprocessors | MEDIUM |
| 7 | Security Overview | https://lazynext.com/security | LOW |
| 8 | API Terms of Service | https://lazynext.com/api-terms | HIGH |
| 9 | AI/Agent Usage Policy | https://lazynext.com/ai-usage-policy | HIGH |

---

## Review Checklist

### Terms of Service (/terms)

- [ ] **Governing law clause** — No jurisdiction specified for dispute resolution. Add governing law (recommend Delaware, USA or India based on business entity location).
- [ ] **Dispute resolution / arbitration** — No arbitration or mediation clause. Add dispute resolution mechanism.
- [ ] **Age restriction** — No minimum age stated. Add "You must be at least 13 years old" or applicable jurisdiction minimum.
- [ ] **Force majeure** — No force majeure clause. Add standard provision excusing performance during unforeseen events.
- [ ] **Refund policy** — Expanded refund/cancellation policy added (14-day credit refunds, subscription cancellation, failed generation refunds, chargeback policy). Review for compliance with consumer protection laws in target markets (EU, UK, US, India).
- [ ] **Subscription terms** — Verify auto-renewal disclosure requirements are met for EU/UK users.
- [ ] **Liability cap** — Current limitation is broad ("maximum extent permitted by law"). Consider specifying a monetary cap.
- [ ] **Indemnification** — No indemnification clause. Consider adding user indemnification for content they create.

### Privacy Policy (/privacy)

- [ ] **GDPR Article 13/14 compliance** — Verify all required information is present (identity of controller, purposes, legal basis, recipients, retention period, rights, right to lodge complaint).
- [ ] **CCPA/CPRA compliance** — Verify California-specific disclosures (categories of personal information collected, business purpose, right to opt-out of sale, right to limit use of sensitive personal information).
- [ ] **Legal basis for processing** — Not explicitly stated for each processing purpose. Add legal basis (consent, contract, legitimate interest, legal obligation).
- [ ] **Data retention periods** — States "you may request data deletion" but does not specify retention periods. Add specific retention timeframes.
- [ ] **Children's privacy** — No mention of children's data. Add "Lazynext is not directed to children under 13/16."
- [ ] **International transfer mechanism** — Mentions SCCs but does not specify which SCCs or how to obtain a copy. Add specific SCC reference.

### Cookie Policy (/cookies)

- [ ] **ePrivacy Directive compliance** — Verify cookie consent mechanism meets EU ePrivacy requirements.
- [ ] **Cookie inventory** — Lists cookie categories but not specific cookie names. Consider adding a cookie table with names, purposes, durations, and third parties.
- [ ] **Consent withdrawal** — States consent can be withdrawn but does not explain how. Add instructions for withdrawing consent.

### Acceptable Use Policy (/acceptable-use)

- [ ] **Enforcement discretion** — "at our sole discretion" may need qualification for some jurisdictions.
- [ ] **Link to AI Usage Policy** — Section 4 references AI policies but does not link to /ai-usage-policy. Add link.
- [ ] **Reporting address** — Verify abuse@lazynext.com is monitored and has capacity to handle reports.

### Data Processing Agreement (/dpa)

- [ ] **GDPR Article 28 compliance** — Verify all Article 28(3) requirements are met (documented instructions, confidentiality, security measures, sub-processor management, data subject rights assistance, breach notification, data return/deletion, audit rights).
- [ ] **SCC reference** — Mentions SCCs but does not specify which version (2021/914) or how to obtain them. Add specific reference.
- [ ] **Audit frequency** — Does not specify audit frequency or limitations. Consider adding reasonable audit frequency limits.
- [ ] **Liability allocation** — Does not specify liability caps between controller and processor. Add liability provisions.
- [ ] **Termination of DPA** — Does not specify how DPA terminates relative to main agreement. Add termination clause.

### Subprocessor List (/subprocessors)

- [ ] **Notification mechanism** — States 30 days notice but does not specify how customers are notified. Add notification method (email, dashboard, RSS).
- [ ] **Objection process** — States customers may object but does not describe the objection process. Add process description.
- [ ] **Atlas Cloud** — DPA not yet executed (see DPA_VERIFICATION_CHECKLIST.md). This is a compliance gap.

### Security Overview (/security)

- [ ] **MFA mention** — Page does not mention MFA/TOTP support (recently implemented). Add to authentication section.
- [ ] **Session revocation** — Page does not mention server-side session revocation. Add to authentication section.
- [ ] **Bug bounty** — No bug bounty program mentioned. Consider adding or stating "no formal program."
- [ ] **Incident response** — Does not mention incident response procedures or timelines beyond "48 hours acknowledgment."

### API Terms of Service (/api-terms)

- [ ] **All [REQUIRES COUNSEL] markers** — 8 markers present. Review each section marked.
- [ ] **Rate limit changes** — "We may adjust rate limits at any time without prior notice" — verify this is acceptable.
- [ ] **Liability cap** — "amount you paid for API access in the twelve months preceding the claim" — verify this is appropriate for API usage.
- [ ] **SLA** — No uptime SLA provided. Consider whether one is needed.
- [ ] **Data processing** — References Privacy Policy but does not specify how API data is processed differently.

### AI/Agent Usage Policy (/ai-usage-policy)

- [ ] **All [REQUIRES COUNSEL] markers** — 7 markers present. Review each section marked.
- [ ] **EU AI Act compliance** — No mention of EU AI Act compliance. Consider adding if serving EU users.
- [ ] **Transparency obligations** — No mention of AI transparency requirements (e.g., disclosing AI-generated content). Consider adding.
- [ ] **Provider policy changes** — States provider terms may change. Consider how this affects users.
- [ ] **Agent liability** — Clarify liability allocation for autonomous agent actions.

---

## Cross-Document Items

- [ ] **Consistency of defined terms** — Verify "Lazynext", "the Service", "the Platform" are used consistently.
- [ ] **Contact email verification** — 7 different emails referenced (support@, privacy@, abuse@, security@, dpa@, api@, ai-policy@). Verify all are monitored.
- [ ] **Effective dates** — All documents show only year. Add specific effective dates (month/day/year).
- [ ] **Version control** — No document version numbers. Add version numbers for tracking changes.
- [ ] **i18n notice** — Terms and Privacy are translated to 13 locales. Other 7 documents are English-only. Add notice on non-English pages that English version is authoritative.

---

## Regulatory Compliance Checklist

- [ ] **GDPR** — EU data protection compliance
- [ ] **CCPA/CPRA** — California privacy compliance
- [ ] **ePrivacy Directive** — Cookie consent compliance
- [ ] **EU AI Act** — AI system classification and obligations (if applicable)
- [ ] **DSA (Digital Services Act)** — If considered an intermediary service
- [ ] **DMA (Digital Markets Act)** — If considered a gatekeeper (unlikely)
- [ ] **COPPA** — Children's privacy (if any users under 13)
- [ ] **PCI DSS** — Payment card data (handled by Dodo Payments, but verify scope)
- [ ] **Local consumer protection laws** — Refund/cancellation terms for target markets

---

## Recommended Counsel Engagement

1. **Engage a technology/SaaS attorney** familiar with GDPR, CCPA, and AI regulations
2. **Provide all 9 document URLs** for online review
3. **Provide this checklist** as a starting framework
4. **Provide the DPA Verification Checklist** (docs/DPA_VERIFICATION_CHECKLIST.md) for subprocessor compliance context
5. **Budget for 8-16 hours** of legal review time for all 9 documents
6. **Schedule a follow-up** to implement counsel's recommended changes

---

## Disclaimer

This checklist was prepared by an automated audit and is not legal advice. All legal documents should be reviewed by qualified legal counsel admitted to practice in the relevant jurisdictions before being considered binding or compliant.
