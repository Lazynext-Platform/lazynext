# Subprocessor DPA Verification Checklist

**Date:** 2026-09-03
**Status:** Research complete — action items below require human execution

---

## Summary

| Subprocessor | DPA Available | GDPR | CCPA | SCCs | Certifications | Action Needed |
|---|---|---|---|---|---|---|
| Cloudflare | Yes (public, auto-applied) | Yes | Yes | Yes (EU + UK) | ISO 27001, ISO 27701, SOC 2, PCI DSS | None — download and file DPA |
| Google (OAuth) | Partial (consumer OAuth has no DPA) | Yes | Yes | Yes (Cloud DPA) | ISO 27001, SOC 2, EU-US DPF | Treat as identity provider; no signed DPA needed for consumer OAuth |
| Atlas Cloud | Likely (not public) | Claims yes | Claims yes | Unconfirmed | SOC 2, HIPAA | Request signed DPA + SCCs + sub-processor list |
| Dodo Payments | Yes (public) | Yes | Yes | Yes (EU + UK) | PCI DSS Level 1 | Download and file DPA; request SOC 2 evidence |
| Resend | Yes (auto-executed on signup) | Yes | Yes | Yes (EU + UK + Swiss) | SOC 2 Type II | Download signed DPA from dashboard |

---

## Detailed Status Per Subprocessor

### 1. Cloudflare

- **DPA URL:** https://www.cloudflare.com/cloudflare-customer-dpa/
- **PDF:** https://cf-assets.www.cloudflare.com/slt3lc6tev37/3LmXORq5FW5EuJ0OT1B871/f466268011407efbc07f4fadbd1af466/Cloudflare_Customer_DPA_v6.3_June_20__2025.pdf
- **SCCs:** https://www.cloudflare.com/cloudflare_customer_SCCs.pdf
- **Status:** DPA automatically forms part of the subscription agreement. Covers CDN, Workers, D1, R2, Rate Limiting.
- **Action required:**
  - [ ] Download current DPA PDF and file in compliance records
  - [ ] Download SCCs PDF and file in compliance records
  - [ ] Verify DPA version is current (v6.3 as of June 2025)
  - [ ] No signed agreement needed — DPA is auto-applied

### 2. Google (OAuth/Identity)

- **DPA URL (Cloud Identity/Workspace):** https://cloud.google.com/terms/data-processing-addendum
- **API User Data Policy:** https://developers.google.com/terms/api-services-user-data-policy
- **Status:** Consumer Google OAuth (Sign in with Google) does not have a separate DPA. Google's API Terms and Privacy Policy govern the relationship. Lazynext is the controller for data received via OAuth.
- **Action required:**
  - [ ] Document that Google OAuth is used as an identity provider, not a data processor
  - [ ] Ensure Privacy Policy discloses Google OAuth data collection (already done)
  - [ ] No signed DPA needed for consumer OAuth usage
  - [ ] If Google Cloud Identity/Workspace is adopted later, execute the Cloud DPA

### 3. Atlas Cloud

- **Data retention page:** https://www.atlascloud.ai/data-retention
- **Data deletion page:** https://www.atlascloud.ai/data-deletion-policy
- **Contact:** privacy@atlascloud.ai
- **Status:** DPA likely available for enterprise customers but not publicly posted. SOC 2 certified. GDPR/CCPA compliance claimed. SCCs unconfirmed.
- **Action required:**
  - [x] DPA request submitted via Atlas Cloud contact form (2026-09-03, confirmed: "Thank you! We've received your message")
  - [x] Backup email drafted to privacy@atlascloud.ai (opened in mail client — click Send to deliver)
  - [ ] Request confirmation of EU SCCs (2021/914) and UK IDTA coverage
  - [ ] Request Atlas Cloud's subprocessor list (upstream model providers)
  - [ ] Request data retention periods for prompts and generated content
  - [ ] Request current SOC 2 report
  - [ ] Confirm whether Atlas Cloud acts as controller or processor for prompts
  - [ ] **BLOCKING:** Do not send personal data to Atlas Cloud until DPA is executed
  - [ ] Save received DPA to compliance/dpa/atlas-cloud-dpa.pdf when response arrives

### 4. Dodo Payments

- **DPA URL:** https://dodopayments.com/dpa
- **Status:** DPA is public and covers GDPR, CCPA/CPRA, EU SCCs (2021/914), UK Addendum. PCI DSS v4.0.1 Level 1 certified. As Merchant of Record, Dodo processes buyer data on Lazynext's behalf.
- **Action required:**
  - [ ] Download DPA from https://dodopayments.com/dpa and file in compliance records
  - [ ] Request current SOC 2 Type II report (referenced in DPA but completion unconfirmed)
  - [ ] Verify DPA is auto-applied or requires explicit acceptance
  - [ ] Confirm PCI DSS AOC is current (v4.0.1)

### 5. Resend

- **DPA URL (signed PDF):** https://resend.com/static/documents/resend-dpa-signed.pdf
- **Security page:** https://resend.com/security/gdpr
- **Status:** DPA is pre-signed and auto-executed on account signup. SOC 2 Type II certified (Feb 2025 – Feb 2026). EU SCCs (Modules 2 and 3), UK Addendum, Swiss SCC modifications included. Participates in EU-US Data Privacy Framework.
- **Action required:**
  - [ ] Download signed DPA PDF and file in compliance records
  - [ ] Download SOC 2 report from Resend dashboard (Documents page)
  - [ ] Verify SOC 2 coverage period is current
  - [ ] No additional signed agreement needed — DPA is auto-applied

---

## Compliance Gaps

| Gap | Risk | Mitigation |
|---|---|---|
| Atlas Cloud DPA not executed | HIGH — AI prompts may contain personal data | Email privacy@atlascloud.ai immediately |
| Google consumer OAuth has no DPA | LOW — Lazynext is controller, not processor | Document in Privacy Policy (already done) |
| Dodo Payments SOC 2 unconfirmed | MEDIUM — payment data sensitivity | Request current SOC 2 report |
| No central DPA registry | MEDIUM — cannot prove compliance during audit | Create a compliance folder with all DPAs |

---

## Recommended Compliance Folder Structure

```
compliance/
├── dpa/
│   ├── cloudflare-dpa-v6.3.pdf
│   ├── cloudflare-sccs.pdf
│   ├── dodo-payments-dpa.pdf
│   ├── resend-dpa-signed.pdf
│   └── atlas-cloud-dpa.pdf (PENDING)
├── certifications/
│   ├── cloudflare-iso27001.pdf
│   ├── cloudflare-soc2.pdf
│   ├── dodo-pci-dss-aoc.pdf
│   ├── resend-soc2.pdf
│   └── atlas-cloud-soc2.pdf (PENDING)
├── legal-review/
│   ├── LEGAL_AUDIT.md
│   ├── LEGAL_REVIEW_CHECKLIST.md
│   └── counsel-review-notes.md (TO BE CREATED BY COUNSEL)
└── dr-drills/
    └── DR_DRILL_2026-09-03.md
```

---

## Conclusion

4 of 5 subprocessors have public or auto-applied DPAs with SCCs. Atlas Cloud is the only blocking gap — a signed DPA must be obtained before processing personal data through their AI services. All other subprocessor relationships are compliant from a DPA standpoint. This checklist should be reviewed quarterly and whenever a subprocessor is added or changed.
