import type { Metadata } from 'next';
import { LegalPage, makeMetadata } from '@/components/LegalPage';

export const metadata: Metadata = makeMetadata('Data Processing Agreement — Lazynext', 'Data Processing Agreement (DPA) for Lazynext as a data processor.');

const year = new Date().getFullYear();

export default function DpaPage() {
  return (
    <LegalPage
      title="Data Processing Agreement (DPA)"
      lastUpdated={`Last updated: ${year}`}
      description="This Data Processing Agreement governs Lazynext's processing of personal data on behalf of customers who are controllers."
      sections={[
        {
          title: '1. Parties',
          body: 'This DPA is between Lazynext ("Processor") and the customer organization ("Controller") that uses Lazynext to process personal data. By using Lazynext for processing personal data, the Controller agrees to this DPA.',
        },
        {
          title: '2. Roles and Scope',
          body: 'The Controller is the data controller and determines the purposes and means of processing personal data. The Processor processes personal data on behalf of the Controller, only on documented instructions from the Controller. The scope of processing is limited to providing the Lazynext platform services.',
        },
        {
          title: '3. Data Subject Categories',
          body: 'Personal data processed may include: the Controller\'s authorized users (name, email), the Controller\'s customers or contacts (if stored in the platform), and any other personal data the Controller chooses to store in workspaces, documents, or files.',
        },
        {
          title: '4. Data Types',
          list: [
            'Identity data: name, email address, profile image.',
            'Contact data: email addresses, phone numbers stored by the Controller.',
            'Content data: documents, files, and creative content uploaded by the Controller.',
            'Usage data: API calls, login times, IP addresses.',
            'Technical data: browser type, device information.',
          ],
        },
        {
          title: '5. Processing Purposes',
          body: 'The Processor processes personal data only for: providing the platform services, maintaining security and availability, complying with legal obligations, and generating audit logs. The Processor does not process personal data for its own purposes, for marketing, or for training AI models.',
        },
        {
          title: '6. Security Measures',
          list: [
            'Encryption in transit (TLS 1.2+) and at rest (Cloudflare D1/R2 encryption).',
            'Access controls: role-based authorization, API key authentication, session management.',
            'Audit logging: all security-relevant actions are logged.',
            'Rate limiting: API and MCP endpoints are rate-limited.',
            'Regular security reviews and dependency updates.',
            'Origin validation for MCP to prevent DNS rebinding.',
          ],
        },
        {
          title: '7. Subprocessors',
          body: 'The Processor uses subprocessors to provide the service. The current list of subprocessors is available at our subprocessor list page. The Controller may object to new subprocessors by notifying the Processor within 30 days of being informed of a new subprocessor.',
        },
        {
          title: '8. Data Subject Rights',
          body: 'The Processor will assist the Controller in responding to data subject requests (access, rectification, erasure, portability, restriction) to the extent possible, given the technical capabilities of the platform. Data subject requests may be submitted via our data request page.',
        },
        {
          title: '9. Data Breach Notification',
          body: 'The Processor will notify the Controller of a personal data breach without undue delay and in any case within 72 hours of becoming aware of the breach. The notification will include the nature of the breach, the likely consequences, and the measures taken or proposed.',
        },
        {
          title: '10. Data Return and Deletion',
          body: 'Upon termination of the service, the Processor will return or delete all personal data at the Controller\'s choice, unless retention is required by law. Data deletion requests can be submitted via the data request page.',
        },
        {
          title: '11. International Transfers',
          body: 'Data may be transferred to countries outside the EEA, UK, or Switzerland. Such transfers are governed by Standard Contractual Clauses (SCCs) or other appropriate safeguards as required by applicable law.',
        },
        {
          title: '12. Audit',
          body: 'The Controller may audit the Processor\'s compliance with this DPA, subject to reasonable notice and confidentiality obligations. The Processor will provide relevant documentation and certifications upon request.',
        },
        {
          title: '13. Contact',
          body: 'For questions about this DPA, contact us at dpa@lazynext.com.',
        },
      ]}
    />
  );
}
