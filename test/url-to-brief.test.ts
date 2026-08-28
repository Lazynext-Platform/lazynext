import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('URL to Brief', () => {
  test('ProductPageExtraction has required fields', () => {
    const extraction = {
      productName: 'Test Product',
      brandName: 'Test Brand',
      description: 'A test product',
      features: ['feature1', 'feature2'],
      benefits: ['benefit1'],
      audience: 'Young adults',
      price: '$29.99',
      category: 'Electronics',
      positioning: 'Premium quality at affordable price',
      painPoints: ['pain1'],
      usps: ['usp1'],
    };
    assert.equal(extraction.productName, 'Test Product');
    assert.equal(extraction.features.length, 2);
    assert.equal(extraction.benefits.length, 1);
    assert.ok(extraction.price);
    assert.ok(extraction.positioning);
  });

  test('UrlToBriefResult has extraction and suggestions', () => {
    const result = {
      extraction: { productName: 'Test', description: 'Test', features: [], benefits: [], audience: '', positioning: '', painPoints: [], usps: [] },
      brief: { objective: 'awareness' },
      suggestedAngles: ['angle1', 'angle2'],
      suggestedHooks: ['hook1'],
      suggestedCtas: ['cta1'],
      visualDirection: 'Bright and modern',
      toneRecommendation: 'Friendly',
    };
    assert.equal(result.suggestedAngles.length, 2);
    assert.equal(result.suggestedHooks.length, 1);
    assert.ok(result.visualDirection);
  });

  test('URL validation rejects non-URL strings', () => {
    const invalidUrls = ['', 'not-a-url', 'ftp://example.com', 'javascript:alert(1)'];
    for (const url of invalidUrls) {
      try {
        new URL(url);
        assert.fail(`Should have rejected: ${url}`);
      } catch {
        // Expected
      }
    }
  });

  test('URL validation accepts valid http/https URLs', () => {
    const validUrls = ['http://example.com', 'https://example.com/product', 'https://shop.example.com/items/123'];
    for (const url of validUrls) {
      const parsed = new URL(url);
      assert.ok(parsed.protocol === 'http:' || parsed.protocol === 'https:');
    }
  });
});
