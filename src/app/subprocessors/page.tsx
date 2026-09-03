import type { Metadata } from 'next';
import { LegalPage, makeMetadata } from '@/components/LegalPage';

export const metadata: Metadata = makeMetadata('Subprocessor List — Lazynext', 'List of subprocessors used by Lazynext.');

const year = new Date().getFullYear();

export default function SubprocessorsPage() {
  return (
    <LegalPage
      title="Subprocessor List"
      lastUpdated={`Last updated: ${year}`}
      description="This page lists all third-party subprocessors that Lazynext uses to provide its services."
      sections={[
        {
          title: '1. Overview',
          body: 'Lazynext uses the following subprocessors to process customer data. We update this list when we add or remove subprocessors. Customers may subscribe to updates by contacting privacy@lazynext.com.',
        },
        {
          title: '2. Infrastructure and Hosting',
          list: [
            'Cloudflare — Content delivery, DDoS protection, Workers runtime, D1 database, R2 object storage, rate limiting. Location: Global edge network. Purpose: Hosting and infrastructure.',
          ],
        },
        {
          title: '3. Authentication',
          list: [
            'Google OAuth — Google Sign-In authentication. Location: Global. Purpose: User authentication. Data: Name, email, profile image (as authorized by user).',
          ],
        },
        {
          title: '4. AI Generation',
          list: [
            'Atlas Cloud — AI model inference for text, image, video, and audio generation. Location: Varies by provider. Purpose: AI content generation. Data: Prompts, input media, generation parameters.',
          ],
        },
        {
          title: '5. Payments',
          list: [
            'Dodo Payments — Payment processing for credits and subscriptions. Location: Global. Purpose: Billing. Data: Payment method details (processed by Dodo; Lazynext does not store card data).',
          ],
        },
        {
          title: '6. Email',
          list: [
            'Resend — Transactional email delivery. Location: Global. Purpose: Sending verification emails, notifications, and receipts. Data: Email address, email content.',
          ],
        },
        {
          title: '7. Ad Platform Integrations (Optional)',
          list: [
            'Meta Ads API — Campaign management and creative performance. Purpose: Ad publishing and metrics. Data: Ad creative, campaign settings (only when user connects).',
            'Google Ads API — Campaign management and creative performance. Purpose: Ad publishing and metrics. Data: Ad creative, campaign settings (only when user connects).',
          ],
        },
        {
          title: '8. Changes to This List',
          body: 'We will update this list whenever we add, remove, or change a subprocessor. For material changes involving new subprocessors that process personal data, we will provide at least 30 days\' notice before the new subprocessor begins processing data, allowing customers to object.',
        },
        {
          title: '9. Contact',
          body: 'For questions about our subprocessors or to object to a new subprocessor, contact us at privacy@lazynext.com.',
        },
      ]}
    />
  );
}
