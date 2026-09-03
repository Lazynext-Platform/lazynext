import type { Metadata } from 'next';
import { LegalPage, makeMetadata } from '@/components/LegalPage';

export const metadata: Metadata = makeMetadata('Acceptable Use Policy — Lazynext', 'Rules for acceptable use of the Lazynext platform.');

const year = new Date().getFullYear();

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      lastUpdated={`Last updated: ${year}`}
      description="This Acceptable Use Policy (AUP) defines the rules for using the Lazynext platform."
      sections={[
        {
          title: '1. Permitted Use',
          body: 'Lazynext is a unified operating system for digital work. You may use the platform to create workspaces, projects, tasks, documents, files, automations, AI agents, integrations, and creative content for lawful business and personal purposes.',
        },
        {
          title: '2. Prohibited Content',
          list: [
            'Content that is illegal, fraudulent, or deceptive.',
            'Content that infringes on the intellectual property rights of others.',
            'Content that harasses, threatens, or defames any person or entity.',
            'Content that promotes hate speech, discrimination, or violence.',
            'Content that sexualizes minors or facilitates child exploitation.',
            'Content that facilitates terrorism or violent extremism.',
            'Malware, spyware, or any code intended to harm systems or data.',
            'Personal data of others collected without their consent.',
          ],
        },
        {
          title: '3. Prohibited Conduct',
          list: [
            'Attempting to gain unauthorized access to systems, data, or other users\' accounts.',
            'Reverse-engineering, decompiling, or extracting source code from the platform.',
            'Scraping, crawling, or bulk-downloading content beyond API rate limits.',
            'Using API keys or MCP access to circumvent rate limits or access controls.',
            'Distributing spam, phishing, or unsolicited communications through the platform.',
            'Interfering with or disrupting the service, servers, or infrastructure.',
            'Creating multiple accounts to evade bans, rate limits, or billing.',
            'Using the platform to build a competing product or service.',
          ],
        },
        {
          title: '4. AI-Generated Content',
          body: 'When using AI generation features, you are responsible for the prompts you submit and the content generated. You must not use AI features to create deepfakes, impersonate real people without consent, generate misleading or deceptive content, or violate any AI usage policies of our underlying providers (including Atlas Cloud). See our AI/Agent Usage Policy for full details.',
        },
        {
          title: '5. API and Developer Access',
          body: 'Access to the Lazynext REST API and MCP server is subject to this AUP, the API Terms of Service, and your API key scopes. We may rate-limit, suspend, or revoke API access for violations. Automated access must respect rate limits and include proper authentication.',
        },
        {
          title: '6. Enforcement',
          body: 'Violations of this AUP may result in content removal, account suspension, API key revocation, or permanent termination of access. We may report illegal activity to law enforcement. We reserve the right to take action at our sole discretion.',
        },
        {
          title: '7. Reporting Violations',
          body: 'To report violations of this AUP, contact us at abuse@lazynext.com. Include relevant details, URLs, and evidence. We will investigate reports and take appropriate action.',
        },
        {
          title: '8. Changes',
          body: 'We may update this AUP from time to time. Continued use of the platform after changes constitutes acceptance of the revised policy.',
        },
      ]}
    />
  );
}
