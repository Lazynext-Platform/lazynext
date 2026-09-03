import type { Metadata } from 'next';
import { LegalPage, makeMetadata } from '@/components/LegalPage';

export const metadata: Metadata = makeMetadata('Security — Lazynext', 'Security practices and infrastructure at Lazynext.');

const year = new Date().getFullYear();

export default function SecurityPage() {
  return (
    <LegalPage
      title="Security"
      lastUpdated={`Last updated: ${year}`}
      description="Overview of security practices, infrastructure, and controls at Lazynext."
      sections={[
        {
          title: '1. Infrastructure',
          body: 'Lazynext is hosted on Cloudflare Workers, a globally distributed edge computing platform. Data is stored in Cloudflare D1 (SQLite-compatible database) and Cloudflare R2 (object storage). All traffic is served over HTTPS with TLS 1.2+ encryption.',
        },
        {
          title: '2. Authentication',
          list: [
            'Google OAuth and email/password authentication via NextAuth (Auth.js v5).',
            'JWT-based sessions with configurable expiration.',
            'Account lockout after 5 failed login attempts within 15 minutes.',
            'IP-based rate limiting on auth endpoints (10 requests per minute).',
            'Password hashing using bcrypt.',
          ],
        },
        {
          title: '3. Authorization',
          list: [
            'Workspace-based tenancy with role-based access control (owner, admin, member, viewer, guest).',
            'Centralized authorization helpers (requireAuth, requireRole, requireApiKey).',
            'API key authentication with SHA-256 hashing (plaintext never stored).',
            'Scope-based API access (read, write, admin).',
            'MCP origin validation to prevent DNS rebinding attacks.',
          ],
        },
        {
          title: '4. Rate Limiting',
          body: 'API and MCP endpoints are rate-limited. In production, Cloudflare rate-limit bindings provide distributed protection. In development, an in-memory limiter provides best-effort protection. Rate-limited requests receive a 429 response with a Retry-After header.',
        },
        {
          title: '5. Audit Logging',
          body: 'Security-relevant actions are logged via a centralized audit service. This includes authentication events, API key creation and revocation, workspace and membership changes, project/task/document CRUD operations, and API/MCP requests. Audit logs are stored in the database and can be queried by workspace administrators.',
        },
        {
          title: '6. Data Encryption',
          list: [
            'In transit: TLS 1.2+ for all connections.',
            'At rest: Cloudflare D1 and R2 provide encryption at rest.',
            'API keys: SHA-256 hashed before storage; plaintext shown only once on creation.',
            'Passwords: bcrypt hashed.',
          ],
        },
        {
          title: '7. Vulnerability Management',
          list: [
            'Regular dependency updates and security patch reviews.',
            'Automated build and type checking on every change.',
            'ESLint with security-oriented rules.',
            'No secrets or API keys committed to the repository.',
          ],
        },
        {
          title: '8. Responsible Disclosure',
          body: 'If you discover a security vulnerability, please report it responsibly to security@lazynext.com. Do not publicly disclose vulnerabilities until we have had an opportunity to investigate and remediate. We acknowledge reports within 48 hours and provide updates on remediation progress.',
        },
        {
          title: '9. Compliance',
          body: 'Lazynext is designed with GDPR, CCPA, and other data protection regulations in mind. We provide a Data Processing Agreement (DPA), subprocessor list, and data subject request mechanism. See our Privacy Policy and DPA for details.',
        },
        {
          title: '10. Contact',
          body: 'For security questions or to report a vulnerability, contact us at security@lazynext.com.',
        },
      ]}
    />
  );
}
