import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// SdkGenerator — pure functions, no mocks needed
// ─────────────────────────────────────────────────────────────────────────────

const { SdkGenerator } = await import('@/lib/services/sdk-generator');

describe('SdkGenerator', () => {
  describe('generateJavaScript', () => {
    it('includes the base URL and API key in the snippet', () => {
      const code = SdkGenerator.generateJavaScript('https://custom.api.com', 'my-secret-key');

      assert.ok(code.includes("baseUrl: 'https://custom.api.com'"));
      assert.ok(code.includes("apiKey: 'my-secret-key'"));
      assert.ok(code.includes('Lazynext'));
    });

    it('uses default base URL and API key when not provided', () => {
      const code = SdkGenerator.generateJavaScript();

      assert.ok(code.includes('https://api.lazynext.com'));
      assert.ok(code.includes('YOUR_API_KEY'));
    });
  });

  describe('generatePython', () => {
    it('includes the base URL and API key in the snippet', () => {
      const code = SdkGenerator.generatePython('https://custom.api.com', 'my-secret-key');

      assert.ok(code.includes('base_url="https://custom.api.com"'));
      assert.ok(code.includes('api_key="my-secret-key"'));
      assert.ok(code.includes('from lazynext import Lazynext'));
    });

    it('uses default base URL and API key when not provided', () => {
      const code = SdkGenerator.generatePython();

      assert.ok(code.includes('https://api.lazynext.com'));
      assert.ok(code.includes('YOUR_API_KEY'));
    });
  });

  describe('generateGo', () => {
    it('includes the base URL and API key in the snippet', () => {
      const code = SdkGenerator.generateGo('https://custom.api.com', 'my-secret-key');

      assert.ok(code.includes('lazynext.New("https://custom.api.com", "my-secret-key")'));
      assert.ok(code.includes('package main'));
    });

    it('uses default base URL and API key when not provided', () => {
      const code = SdkGenerator.generateGo();

      assert.ok(code.includes('https://api.lazynext.com'));
      assert.ok(code.includes('YOUR_API_KEY'));
    });
  });

  describe('generateCurl', () => {
    it('includes the base URL and API key in curl commands', () => {
      const code = SdkGenerator.generateCurl('https://custom.api.com', 'my-secret-key');

      assert.ok(code.includes('https://custom.api.com'));
      assert.ok(code.includes('Bearer my-secret-key'));
      assert.ok(code.includes('curl -X GET'));
    });

    it('uses default base URL and API key when not provided', () => {
      const code = SdkGenerator.generateCurl();

      assert.ok(code.includes('https://api.lazynext.com'));
      assert.ok(code.includes('YOUR_API_KEY'));
    });
  });

  describe('generateAll', () => {
    it('returns snippets for all 5 languages', () => {
      const snippets = SdkGenerator.generateAll();

      assert.equal(snippets.length, 5);
      const languages = snippets.map((s) => s.language);
      assert.ok(languages.includes('javascript'));
      assert.ok(languages.includes('python'));
      assert.ok(languages.includes('go'));
      assert.ok(languages.includes('curl'));
      assert.ok(languages.includes('rust'));
    });

    it('passes custom base URL and API key to each snippet', () => {
      const snippets = SdkGenerator.generateAll('https://custom.api.com', 'my-key');

      for (const snippet of snippets) {
        assert.ok(snippet.code.includes('https://custom.api.com'));
        assert.ok(snippet.code.includes('my-key'));
      }
    });
  });

  describe('getEndpointList', () => {
    it('returns endpoint catalog with categories', () => {
      const catalog = SdkGenerator.getEndpointList();

      assert.ok(catalog.length >= 5);
      for (const cat of catalog) {
        assert.ok(cat.category);
        assert.ok(cat.endpoints.length > 0);
        for (const ep of cat.endpoints) {
          assert.ok(ep.method);
          assert.ok(ep.path);
          assert.ok(ep.description);
          assert.equal(typeof ep.auth, 'boolean');
        }
      }
    });

    it('includes Workspaces and Webhooks categories', () => {
      const catalog = SdkGenerator.getEndpointList();
      const categories = catalog.map((c) => c.category);

      assert.ok(categories.includes('Workspaces'));
      assert.ok(categories.includes('Webhooks'));
    });
  });
});
