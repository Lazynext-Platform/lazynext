import type { Metadata } from 'next';
import { LegalPage, makeMetadata } from '@/components/LegalPage';

export const metadata: Metadata = makeMetadata('API Terms of Service — Lazynext', 'Terms governing access to the Lazynext REST API and MCP server.');

const year = new Date().getFullYear();

export default function ApiTermsPage() {
  return (
    <LegalPage
      title="API Terms of Service"
      lastUpdated={`Last updated: ${year}`}
      description="These API Terms govern your access to and use of the Lazynext REST API (v1) and MCP server."
      sections={[
        {
          title: '1. Acceptance',
          body: 'By using the Lazynext API or MCP server, you agree to these API Terms, our Terms of Service, and our Acceptable Use Policy. If you do not agree, do not use the API.',
        },
        {
          title: '2. Authentication',
          body: 'API access requires an API key, which you can create in the Developer section of your account. API keys must be sent via the Authorization header as a Bearer token. You are responsible for keeping your API keys secure and must not share them publicly.',
        },
        {
          title: '3. Scopes',
          body: 'API keys are issued with specific scopes (read, write, admin). You may only perform operations that your key\'s scopes permit. Attempting to exceed your key\'s scope is a violation of these Terms.',
        },
        {
          title: '4. Rate Limits',
          body: 'The API is rate-limited to 100 requests per minute per IP address for REST API v1, and 60 requests per minute for MCP. Rate-limited requests receive a 429 response with a Retry-After header. We may adjust rate limits at any time.',
        },
        {
          title: '5. MCP Protocol',
          body: 'The MCP server implements protocol version 2026-07-28. Clients must include io.modelcontextprotocol/protocolVersion and io.modelcontextprotocol/clientCapabilities in the _meta field of each request. The server is stateless — no initialize handshake or session management is required.',
        },
        {
          title: '6. Permitted Use',
          list: [
            'Integrating Lazynext with your internal tools and workflows.',
            'Building applications that read or write data to your Lazynext workspaces.',
            'Using MCP to connect AI assistants to your Lazynext data.',
            'Automating tasks within your workspace scope.',
          ],
        },
        {
          title: '7. Prohibited Use',
          list: [
            'Scraping or bulk-downloading data beyond API rate limits.',
            'Sharing API keys with unauthorized parties.',
            'Using the API to build a competing product or service.',
            'Circumventing access controls, rate limits, or scope restrictions.',
            'Accessing data outside your authorized workspaces.',
            'Using the API for spam, abuse, or disruptive purposes.',
          ],
        },
        {
          title: '8. Data Access',
          body: 'API access is scoped to workspaces you are a member of. The API enforces workspace membership and role checks. You may only access data within your authorized scope. Unauthorized access attempts are logged and may result in key revocation.',
        },
        {
          title: '9. Availability',
          body: 'We do not guarantee uninterrupted API availability. We may modify, suspend, or discontinue API endpoints with reasonable notice. Breaking changes will be versioned (e.g., v2) to preserve backward compatibility.',
        },
        {
          title: '10. Key Revocation',
          body: 'We may revoke API keys for violations of these Terms, rate limit abuse, security concerns, or account suspension. You may revoke your own keys at any time in the Developer section.',
        },
        {
          title: '11. Audit Logging',
          body: 'All API and MCP requests are logged for security and audit purposes. Logs include the API key ID, user ID, workspace ID, action, IP address, and timestamp. See our Privacy Policy for data retention details.',
        },
        {
          title: '12. Changes',
          body: 'We may update these API Terms at any time. Continued API use after changes constitutes acceptance. We will communicate material changes via email or in-app notification.',
        },
        {
          title: '13. Contact',
          body: 'For questions about these API Terms, contact us at api@lazynext.com.',
        },
      ]}
    />
  );
}
