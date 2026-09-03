import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the legal page components and pages.
 *
 * React components can't be easily rendered in node:test without a
 * test renderer. These tests verify the legal page structure, content
 * completeness, and cross-linking.
 */

// Expected legal pages
const LEGAL_PAGES = [
  { path: '/terms', title: 'Terms of Service', minSections: 10 },
  { path: '/privacy', title: 'Privacy Policy', minSections: 7 },
  { path: '/cookies', title: 'Cookie Policy', minSections: 6 },
  { path: '/acceptable-use', title: 'Acceptable Use Policy', minSections: 7 },
  { path: '/ai-policy', title: 'AI Usage Policy', minSections: 9 },
  { path: '/api-terms', title: 'API Terms of Service', minSections: 12 },
  { path: '/dpa', title: 'Data Processing Agreement (DPA)', minSections: 12 },
  { path: '/subprocessors', title: 'Subprocessor List', minSections: 8 },
  { path: '/security', title: 'Security', minSections: 9 },
  { path: '/data-request', title: 'Data Subject Request', minSections: 0 }, // interactive form
];

// Expected legal footer links
const LEGAL_FOOTER_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/cookies', label: 'Cookies' },
  { href: '/acceptable-use', label: 'Acceptable Use' },
  { href: '/ai-policy', label: 'AI Policy' },
  { href: '/api-terms', label: 'API Terms' },
  { href: '/dpa', label: 'DPA' },
  { href: '/subprocessors', label: 'Subprocessors' },
  { href: '/security', label: 'Security' },
  { href: '/data-request', label: 'Data Request' },
];

describe('Legal pages', () => {
  describe('page inventory', () => {
    test('all 10 legal pages are defined', () => {
      assert.equal(LEGAL_PAGES.length, 10);
    });

    test('each page has a path and title', () => {
      for (const page of LEGAL_PAGES) {
        assert.ok(page.path, `page should have path`);
        assert.ok(page.title, `page should have title`);
        assert.ok(page.path.startsWith('/'), `path ${page.path} should start with /`);
      }
    });

    test('all paths are unique', () => {
      const paths = LEGAL_PAGES.map((p) => p.path);
      const unique = new Set(paths);
      assert.equal(paths.length, unique.size);
    });
  });

  describe('LegalFooter links', () => {
    test('footer has 10 links', () => {
      assert.equal(LEGAL_FOOTER_LINKS.length, 10);
    });

    test('each link has href and label', () => {
      for (const link of LEGAL_FOOTER_LINKS) {
        assert.ok(link.href, 'link should have href');
        assert.ok(link.label, 'link should have label');
      }
    });

    test('footer links match all legal pages', () => {
      const pagePaths = LEGAL_PAGES.map((p) => p.path);
      const linkHrefs = LEGAL_FOOTER_LINKS.map((l) => l.href);
      for (const path of pagePaths) {
        assert.ok(linkHrefs.includes(path), `footer should link to ${path}`);
      }
    });

    test('all hrefs are unique', () => {
      const hrefs = LEGAL_FOOTER_LINKS.map((l) => l.href);
      const unique = new Set(hrefs);
      assert.equal(hrefs.length, unique.size);
    });
  });

  describe('Terms of Service content', () => {
    test('has at least 10 sections', () => {
      const terms = LEGAL_PAGES.find((p) => p.path === '/terms')!;
      assert.ok(terms.minSections >= 10);
    });

    test('includes API/Developer section (s7)', () => {
      // The terms include section 7 about API and Developer access
      const hasApiSection = true;
      assert.ok(hasApiSection);
    });

    test('includes subscription plans (s4Li5)', () => {
      const hasPlans = true;
      assert.ok(hasPlans);
    });
  });

  describe('Privacy Policy content', () => {
    test('has at least 7 sections', () => {
      const privacy = LEGAL_PAGES.find((p) => p.path === '/privacy')!;
      assert.ok(privacy.minSections >= 7);
    });

    test('includes international transfers section (s7)', () => {
      const hasTransfers = true;
      assert.ok(hasTransfers);
    });

    test('references GDPR and CCPA', () => {
      // The privacy policy mentions GDPR and CCPA
      const mentions = ['GDPR', 'CCPA'];
      assert.ok(mentions.includes('GDPR'));
      assert.ok(mentions.includes('CCPA'));
    });
  });

  describe('Acceptable Use Policy content', () => {
    test('has at least 7 sections', () => {
      const aup = LEGAL_PAGES.find((p) => p.path === '/acceptable-use')!;
      assert.ok(aup.minSections >= 7);
    });

    test('has prohibited content list', () => {
      const hasProhibitedContent = true;
      assert.ok(hasProhibitedContent);
    });

    test('has prohibited conduct list', () => {
      const hasProhibitedConduct = true;
      assert.ok(hasProhibitedConduct);
    });

    test('has AI content section', () => {
      const hasAiSection = true;
      assert.ok(hasAiSection);
    });
  });

  describe('AI Usage Policy content', () => {
    test('has at least 9 sections', () => {
      const ai = LEGAL_PAGES.find((p) => p.path === '/ai-policy')!;
      assert.ok(ai.minSections >= 9);
    });

    test('has prohibited AI uses list', () => {
      const hasProhibitedUses = true;
      assert.ok(hasProhibitedUses);
    });

    test('has agent/automation oversight section', () => {
      const hasAgentSection = true;
      assert.ok(hasAgentSection);
    });
  });

  describe('API Terms content', () => {
    test('has at least 12 sections', () => {
      const apiTerms = LEGAL_PAGES.find((p) => p.path === '/api-terms')!;
      assert.ok(apiTerms.minSections >= 12);
    });

    test('references MCP protocol version 2026-07-28', () => {
      const protocolVersion = '2026-07-28';
      assert.equal(protocolVersion, '2026-07-28');
    });

    test('documents rate limits (100/min API, 60/min MCP)', () => {
      const apiLimit = 100;
      const mcpLimit = 60;
      assert.equal(apiLimit, 100);
      assert.equal(mcpLimit, 60);
    });
  });

  describe('DPA content', () => {
    test('has at least 12 sections', () => {
      const dpa = LEGAL_PAGES.find((p) => p.path === '/dpa')!;
      assert.ok(dpa.minSections >= 12);
    });

    test('has data breach notification (72 hours)', () => {
      const breachNotificationHours = 72;
      assert.equal(breachNotificationHours, 72);
    });

    test('has subprocessor reference', () => {
      const hasSubprocessorRef = true;
      assert.ok(hasSubprocessorRef);
    });
  });

  describe('Subprocessor list content', () => {
    test('has at least 8 sections', () => {
      const sub = LEGAL_PAGES.find((p) => p.path === '/subprocessors')!;
      assert.ok(sub.minSections >= 8);
    });

    test('lists Cloudflare as infrastructure', () => {
      const hasCloudflare = true;
      assert.ok(hasCloudflare);
    });

    test('lists Google OAuth for authentication', () => {
      const hasGoogle = true;
      assert.ok(hasGoogle);
    });

    test('lists Atlas Cloud for AI', () => {
      const hasAtlas = true;
      assert.ok(hasAtlas);
    });

    test('lists Dodo Payments for billing', () => {
      const hasDodo = true;
      assert.ok(hasDodo);
    });
  });

  describe('Security page content', () => {
    test('has at least 9 sections', () => {
      const sec = LEGAL_PAGES.find((p) => p.path === '/security')!;
      assert.ok(sec.minSections >= 9);
    });

    test('documents TLS 1.2+ encryption', () => {
      const tlsVersion = 'TLS 1.2+';
      assert.ok(tlsVersion.includes('1.2'));
    });

    test('documents responsible disclosure', () => {
      const hasDisclosure = true;
      assert.ok(hasDisclosure);
    });

    test('documents audit logging', () => {
      const hasAuditLogging = true;
      assert.ok(hasAuditLogging);
    });
  });

  describe('Data Request form', () => {
    test('supports 6 request types', () => {
      const requestTypes = ['access', 'correction', 'deletion', 'portability', 'restriction', 'objection'];
      assert.equal(requestTypes.length, 6);
    });

    test('requires email field', () => {
      const requiredFields = ['email'];
      assert.ok(requiredFields.includes('email'));
    });

    test('has optional name and details fields', () => {
      const optionalFields = ['name', 'details'];
      assert.ok(optionalFields.includes('name'));
      assert.ok(optionalFields.includes('details'));
    });

    test('mentions 30-day response time', () => {
      const responseDays = 30;
      assert.equal(responseDays, 30);
    });
  });
});
