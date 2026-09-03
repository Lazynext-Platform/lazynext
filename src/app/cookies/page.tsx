import type { Metadata } from 'next';
import { LegalPage, makeMetadata } from '@/components/LegalPage';

export const metadata: Metadata = makeMetadata('Cookie Policy — Lazynext', 'How Lazynext uses cookies and similar technologies.');

const year = new Date().getFullYear();

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      lastUpdated={`Last updated: ${year}`}
      description="This Cookie Policy explains how Lazynext uses cookies and similar technologies on our website."
      sections={[
        {
          title: '1. What Are Cookies',
          body: 'Cookies are small text files stored on your device when you visit a website. They allow the website to remember your actions and preferences over time. Lazynext uses cookies and similar technologies (localStorage, sessionStorage) for authentication, preferences, and analytics.',
        },
        {
          title: '2. Types of Cookies We Use',
          list: [
            'Essential cookies: Required for authentication, session management, and security. These cannot be disabled.',
            'Preference cookies: Remember your theme (light/dark/system), language, and workspace selection.',
            'Analytics cookies: Help us understand how visitors use our platform (only if you consent).',
            'Marketing cookies: Used to measure the effectiveness of advertising campaigns (only if you consent).',
          ],
        },
        {
          title: '3. Cookie Consent',
          body: 'When you first visit Lazynext, you will see a cookie banner asking for your consent to non-essential cookies. You can change your consent preferences at any time. Essential cookies are set automatically and cannot be disabled.',
        },
        {
          title: '4. Managing Cookies',
          body: 'You can control and delete cookies through your browser settings. Note that disabling essential cookies will prevent you from signing in and using the platform. Each browser has different procedures for managing cookies — see your browser\'s help documentation for details.',
        },
        {
          title: '5. Third-Party Cookies',
          body: 'Some third-party services we use (Google OAuth, Cloudflare, Dodo Payments) may set their own cookies. These are governed by their respective privacy policies. We do not control third-party cookies.',
        },
        {
          title: '6. Updates to This Policy',
          body: 'We may update this Cookie Policy from time to time. Changes will be posted on this page with an updated "Last updated" date.',
        },
        {
          title: '7. Contact',
          body: 'If you have questions about this Cookie Policy, please contact us at privacy@lazynext.com.',
        },
      ]}
    />
  );
}
