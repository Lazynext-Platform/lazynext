import { Lock } from 'lucide-react';
import { auth } from '@/../auth';

export const dynamic = 'force-dynamic';

export default async function ApiTermsPage() {
  const session = await auth().catch(() => null);
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen text-fg bg-app">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          className="flex items-center gap-3 mb-8 border-2 bg-surface p-4"
          style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-sm)' }}
        >
          <Lock className="h-6 w-6 shrink-0" />
          <div>
            <h1 className="heading-display text-3xl">API Terms of Service</h1>
            <p className="mt-1 text-sm text-fg-faint">Last updated: {year}</p>
          </div>
        </div>

        {session?.user?.name && (
          <p className="mb-6 text-sm text-fg-secondary">
            Signed in as {session.user.name}. These terms apply to your use of the Lazynext API.
          </p>
        )}

        <div className="prose prose-neutral max-w-none text-sm leading-relaxed text-fg-secondary">
          <p>
            These API Terms of Service (&quot;API Terms&quot;) govern your access to and use of the
            Lazynext REST API (v1), MCP server, and related developer interfaces. By accessing the API
            you agree to these terms, our Terms of Service, and our Acceptable Use Policy.
            <strong className="text-fg"> [REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">1. Acceptance of Terms</h2>
          <p>
            By using the Lazynext API or MCP server, you agree to these API Terms, our main Terms of
            Service, and our Acceptable Use Policy. If you do not agree, do not use the API. If you are
            accessing the API on behalf of an organization, you represent that you are authorized to
            bind that organization. <strong className="text-fg">[REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">2. API Key Usage</h2>
          <p>
            API access requires an API key created in the Developer section of your account. Keys must
            be sent via the <code>Authorization</code> header as a Bearer token. You are responsible
            for keeping keys secure and must not share, publish, or commit them to public repositories.
            Keys are scoped (read, write, admin) and may only perform operations their scope permits.
          </p>
          <h2 className="text-lg font-semibold text-fg">3. Rate Limits</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>REST API v1: 100 requests per minute per IP address.</li>
            <li>MCP server: 60 requests per minute per IP address.</li>
            <li>Rate-limited requests receive a 429 response with a <code>Retry-After</code> header.</li>
            <li>We may adjust rate limits at any time without prior notice.</li>
          </ul>
          <h2 className="text-lg font-semibold text-fg">4. Prohibited Uses</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Scraping or bulk-downloading data beyond API rate limits.</li>
            <li>Sharing API keys with unauthorized parties.</li>
            <li>Using the API to build a competing product or service.</li>
            <li>Circumventing access controls, rate limits, or scope restrictions.</li>
            <li>Accessing data outside your authorized workspaces.</li>
            <li>Using the API for spam, abuse, or disruptive purposes.</li>
          </ul>
          <h2 className="text-lg font-semibold text-fg">5. Data Retention</h2>
          <p>
            All API and MCP requests are logged for security and audit purposes. Logs include the API
            key ID, user ID, workspace ID, action, IP address, and timestamp. Logs are retained for up
            to 90 days. See our Privacy Policy for full retention details.
            <strong className="text-fg"> [REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">6. Intellectual Property</h2>
          <p>
            Lazynext retains all rights, title, and interest in the API, its documentation, and related
            materials. You retain all rights to data you submit through the API. You may not use
            Lazynext trademarks without prior written consent.
            <strong className="text-fg"> [REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">7. Disclaimer of Warranty</h2>
          <p>
            The API is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
            kind, whether express or implied, including merchantability, fitness for a particular
            purpose, or non-infringement. We do not guarantee uninterrupted or error-free API
            availability. <strong className="text-fg">[REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Lazynext shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of the API.
            Our total liability shall not exceed the amount you paid for API access in the twelve months
            preceding the claim. <strong className="text-fg">[REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">9. Termination</h2>
          <p>
            We may revoke API keys or suspend API access for violations of these Terms, rate limit abuse,
            security concerns, or account suspension. You may revoke your own keys at any time. Upon
            termination, all API access ceases immediately. <strong className="text-fg">[REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">10. Changes to Terms</h2>
          <p>
            We may update these API Terms at any time. Continued API use after changes constitutes
            acceptance. We will communicate material changes via email or in-app notification.
            <strong className="text-fg"> [REQUIRES COUNSEL]</strong>
          </p>
          <h2 className="text-lg font-semibold text-fg">11. Contact</h2>
          <p>
            For questions about these API Terms, contact us at{' '}
            <a href="mailto:api@lazynext.com" className="text-fg underline">api@lazynext.com</a>.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t-2" style={{ borderColor: 'var(--c-ink)' }}>
          <a href="/" className="text-sm text-fg-faint hover:text-fg transition">← Back to Lazynext</a>
        </div>
      </div>
    </div>
  );
}
