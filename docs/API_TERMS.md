# API Terms of Service

**Last updated:** 2025

> **Status:** Draft. Sections marked `[REQUIRES COUNSEL]` require review by qualified legal counsel before publication.

These API Terms of Service ("API Terms") govern your access to and use of the Lazynext REST API (v1), MCP server, and related developer interfaces. By accessing the API you agree to these terms, our Terms of Service, and our Acceptable Use Policy. `[REQUIRES COUNSEL]`

---

## 1. Acceptance of Terms

By using the Lazynext API or MCP server, you agree to these API Terms, our main Terms of Service, and our Acceptable Use Policy. If you do not agree, do not use the API. If you are accessing the API on behalf of an organization, you represent that you are authorized to bind that organization. `[REQUIRES COUNSEL]`

## 2. API Key Usage

API access requires an API key created in the Developer section of your account. Keys must be sent via the `Authorization` header as a Bearer token. You are responsible for keeping keys secure and must not share, publish, or commit them to public repositories. Keys are scoped (read, write, admin) and may only perform operations their scope permits.

## 3. Rate Limits

- REST API v1: 100 requests per minute per IP address.
- MCP server: 60 requests per minute per IP address.
- Rate-limited requests receive a `429` response with a `Retry-After` header.
- We may adjust rate limits at any time without prior notice.

## 4. Prohibited Uses

- Scraping or bulk-downloading data beyond API rate limits.
- Sharing API keys with unauthorized parties.
- Using the API to build a competing product or service.
- Circumventing access controls, rate limits, or scope restrictions.
- Accessing data outside your authorized workspaces.
- Using the API for spam, abuse, or disruptive purposes.

## 5. Data Retention

All API and MCP requests are logged for security and audit purposes. Logs include the API key ID, user ID, workspace ID, action, IP address, and timestamp. Logs are retained for up to 90 days. See our Privacy Policy for full retention details. `[REQUIRES COUNSEL]`

## 6. Intellectual Property

Lazynext retains all rights, title, and interest in the API, its documentation, and related materials. You retain all rights to data you submit through the API. You may not use Lazynext trademarks without prior written consent. `[REQUIRES COUNSEL]`

## 7. Disclaimer of Warranty

The API is provided "as is" and "as available" without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee uninterrupted or error-free API availability. `[REQUIRES COUNSEL]`

## 8. Limitation of Liability

To the maximum extent permitted by law, Lazynext shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the API. Our total liability shall not exceed the amount you paid for API access in the twelve months preceding the claim. `[REQUIRES COUNSEL]`

## 9. Termination

We may revoke API keys or suspend API access for violations of these Terms, rate limit abuse, security concerns, or account suspension. You may revoke your own keys at any time. Upon termination, all API access ceases immediately. `[REQUIRES COUNSEL]`

## 10. Changes to Terms

We may update these API Terms at any time. Continued API use after changes constitutes acceptance. We will communicate material changes via email or in-app notification. `[REQUIRES COUNSEL]`

## 11. Contact

For questions about these API Terms, contact us at [api@lazynext.com](mailto:api@lazynext.com).

---

*This document is a draft prepared for internal review and is not legal advice. Engage qualified counsel to finalize before public release.*
