# Legal Document Audit Report

**Date:** 2026-09-03
**Auditor:** Automated review (not a substitute for qualified legal counsel)
**Scope:** All 9 legal/policy pages on lazynext.com

---

## Documents Audited

| # | Document | Route | Lines | i18n | Status |
|---|---|---|---|---|---|
| 1 | Terms of Service | /terms | 107 | Yes (13 locales) | OK — refund policy expanded |
| 2 | Privacy Policy | /privacy | 90 | Yes (13 locales) | OK |
| 3 | Cookie Policy | /cookies | 51 | No (EN only) | OK |
| 4 | Acceptable Use Policy | /acceptable-use | 68 | No (EN only) | OK |
| 5 | Data Processing Agreement | /dpa | 83 | No (EN only) | OK |
| 6 | Subprocessor List | /subprocessors | 67 | No (EN only) | OK |
| 7 | Security Overview | /security | 80 | No (EN only) | OK — needs MFA update |
| 8 | API Terms of Service | /api-terms | 120 | No (EN only) | OK — new |
| 9 | AI/Agent Usage Policy | /ai-usage-policy | 113 | No (EN only) | OK — new |

---

## Cross-Reference Consistency

### Contact emails referenced across documents

| Email | Used In | Consistent? |
|---|---|---|
| support@lazynext.com | Terms (refunds, chargebacks) | YES |
| privacy@lazynext.com | Privacy, Cookies, Subprocessors, DPA | YES |
| abuse@lazynext.com | Acceptable Use | YES |
| security@lazynext.com | Security | YES |
| dpa@lazynext.com | DPA | YES |
| api@lazynext.com | API Terms | YES |
| ai-policy@lazynext.com | AI Usage Policy | YES |

**Note:** 7 different contact emails are referenced. Verify all inboxes are monitored or consolidate to fewer addresses.

### Subprocessor list consistency

All documents reference the same 5 core subprocessors:
- Cloudflare (hosting, D1, R2, rate limiting) — consistent across Privacy, DPA, Subprocessors, Security
- Google OAuth (authentication) — consistent across Privacy, Subprocessors, Cookies
- Atlas Cloud (AI generation) — consistent across Privacy, Subprocessors, AUP, AI Policy
- Dodo Payments (billing) — consistent across Privacy, Subprocessors, Cookies, Terms
- Resend (email) — consistent across Privacy, Subprocessors

Optional ad platform integrations (Meta Ads, Google Ads) listed in Subprocessors — consistent with AUP.

### Cross-document references

| From | References | Present? |
|---|---|---|
| Terms → API Terms | "governed by these Terms, the API Terms of Service" | YES |
| Terms → AUP | Not explicitly linked | GAP — add link |
| Privacy → Subprocessors | "See our subprocessor list for details" | YES |
| Privacy → Data Request | "at our data request page" | YES |
| DPA → Subprocessors | "available at our subprocessor list page" | YES |
| DPA → Data Request | "via the data request page" | YES |
| AUP → API Terms | "subject to this AUP, the API Terms of Service" | YES |
| AUP → AI Policy | "AI usage policies of our underlying providers" | PARTIAL — should link to /ai-usage-policy |
| API Terms → Terms | "our Terms of Service" | YES |
| API Terms → AUP | "our Acceptable Use Policy" | YES |
| AI Policy → Privacy | "See our Privacy Policy and subprocessor list" | YES |
| AI Policy → Subprocessors | "subprocessor list for details" | YES |
| Security → DPA | "See our Privacy Policy and DPA for details" | YES |
| Cookies → Privacy | "governed by their respective privacy policies" | YES |

---

## Gaps and Issues Found

### 1. Security page missing MFA mention (LOW)

The Security page (`/security`) section 2 (Authentication) lists auth measures but does not mention MFA/TOTP, which was just implemented. **Recommendation:** Add "Multi-factor authentication (TOTP) available via authenticator apps" to the authentication list.

### 2. Security page missing session revocation mention (LOW)

The Security page does not mention server-side session revocation. **Recommendation:** Add "Server-side session revocation for logout-all-devices functionality" to the authentication list.

### 3. Terms does not link to AUP (LOW)

Terms of Service section 5 (Acceptable Use) references acceptable use but does not link to `/acceptable-use`. **Recommendation:** Add explicit link.

### 4. AUP does not link to AI Usage Policy (LOW)

AUP section 4 mentions "AI usage policies of our underlying providers" but doesn't link to the new `/ai-usage-policy` page. **Recommendation:** Add link.

### 5. i18n inconsistency (MEDIUM)

Terms and Privacy are fully internationalized (13 locales). The other 7 documents are English-only. This means non-English users see mixed-language legal pages. **Recommendation:** Either translate all legal pages or add a notice on non-translated pages stating "This document is provided in English. The English version is the authoritative version."

### 6. No "last updated" date in i18n messages (LOW)

Terms and Privacy use `t.lastUpdated.replace('{year}', String(year))` which shows "Last updated: 2026" but no specific date. The LegalPage-based documents also show only the year. **Recommendation:** Include month/year or full date.

### 7. DPA contact email differs from Privacy contact (INFO)

DPA uses `dpa@lazynext.com` while Privacy uses `privacy@lazynext.com`. This is acceptable practice but both inboxes must be monitored.

### 8. No governing law / jurisdiction clause (MEDIUM)

Terms of Service does not specify governing law or jurisdiction for dispute resolution. **Recommendation:** Add a governing law clause (requires counsel to determine appropriate jurisdiction).

### 9. No arbitration clause (MEDIUM)

Terms of Service does not include an arbitration or dispute resolution clause. **Recommendation:** Add dispute resolution terms (requires counsel).

### 10. No age restriction clause (LOW)

Terms of Service does not explicitly state minimum age requirement (typically 13 or 16). **Recommendation:** Add "You must be at least 13 years old to use Lazynext" clause.

### 11. No force majeure clause (LOW)

Terms of Service does not include a force majeure clause. **Recommendation:** Add standard force majeure provision.

### 12. API Terms and AI Policy use different design pattern (INFO)

API Terms and AI Policy use a custom Neo-Brutalist design with `auth()` import, while the other 7 documents use the shared `LegalPage` component. Both render correctly but the visual style differs slightly. **Recommendation:** For consistency, either migrate API Terms and AI Policy to use `LegalPage`, or migrate the others to the new pattern.

---

## Recommended Actions (Priority Order)

### Requires Counsel

1. Add governing law and jurisdiction clause to Terms
2. Add dispute resolution / arbitration clause to Terms
3. Add age restriction clause to Terms
4. Add force majeure clause to Terms
5. Review all `[REQUIRES COUNSEL]` markers in API Terms and AI Policy
6. Review refund/cancellation policy for compliance with consumer protection laws
7. Review DPA for compliance with GDPR Article 28 requirements
8. Verify SCCs are appropriate for international transfers

### Can Be Done Now (Code Changes)

1. Update Security page to mention MFA and session revocation
2. Add cross-links from Terms → AUP and AUP → AI Policy
3. Add English-only notice to non-i18n legal pages
4. Add specific "Last updated" date instead of just year

---

## Conclusion

The legal document set is **substantially complete and internally consistent**. The 9 documents cover all essential areas for a SaaS platform: terms, privacy, cookies, acceptable use, DPA, subprocessors, security, API terms, and AI usage. Cross-references are mostly intact. The main gaps are standard legal clauses (governing law, arbitration, age, force majeure) that require qualified counsel to draft. All documents should be reviewed by a legal professional before being considered binding.
