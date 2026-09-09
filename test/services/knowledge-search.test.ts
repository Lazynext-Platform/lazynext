import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { KnowledgeSearch } from '@/lib/services/knowledge-search';

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — tokenize
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.tokenize', () => {
  it('tokenizes simple text into lowercase words', () => {
    const tokens = KnowledgeSearch.tokenize('Hello World');
    assert.deepEqual(tokens, ['hello', 'world']);
  });

  it('removes punctuation', () => {
    const tokens = KnowledgeSearch.tokenize('Hello, World! How are you?');
    assert.ok(tokens.includes('hello'));
    assert.ok(tokens.includes('world'));
    assert.ok(tokens.includes('how'));
  });

  it('returns empty array for empty string', () => {
    assert.deepEqual(KnowledgeSearch.tokenize(''), []);
  });

  it('handles numbers and mixed content', () => {
    const tokens = KnowledgeSearch.tokenize('Version 2.0 is ready');
    assert.ok(tokens.includes('version'));
    assert.ok(tokens.includes('2'));
    assert.ok(tokens.includes('0'));
    assert.ok(tokens.includes('ready'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — extractKeywords
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.extractKeywords', () => {
  it('extracts keywords sorted by frequency', () => {
    const text = 'marketing marketing strategy strategy strategy content';
    const keywords = KnowledgeSearch.extractKeywords(text, 5);
    assert.equal(keywords[0], 'strategy');
    assert.equal(keywords[1], 'marketing');
    assert.ok(keywords.includes('content'));
  });

  it('excludes stop words', () => {
    const text = 'the quick brown fox jumps over the lazy dog the the the';
    const keywords = KnowledgeSearch.extractKeywords(text, 10);
    assert.ok(!keywords.includes('the'));
    assert.ok(keywords.includes('quick'));
    assert.ok(keywords.includes('fox'));
  });

  it('respects the limit parameter', () => {
    const text = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';
    const keywords = KnowledgeSearch.extractKeywords(text, 3);
    assert.equal(keywords.length, 3);
  });

  it('returns empty array for empty text', () => {
    assert.deepEqual(KnowledgeSearch.extractKeywords('', 10), []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — score
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.score', () => {
  it('returns positive score for matching text', () => {
    const score = KnowledgeSearch.score('marketing strategy', 'marketing strategy guide');
    assert.ok(score > 0);
  });

  it('returns zero for non-matching text', () => {
    const score = KnowledgeSearch.score('marketing', 'cooking recipe pasta');
    assert.equal(score, 0);
  });

  it('returns zero for empty query', () => {
    assert.equal(KnowledgeSearch.score('', 'some text'), 0);
  });

  it('returns zero for empty text', () => {
    assert.equal(KnowledgeSearch.score('query', ''), 0);
  });

  it('gives higher score for exact matches than partial', () => {
    const exactScore = KnowledgeSearch.score('marketing', 'marketing marketing marketing');
    const partialScore = KnowledgeSearch.score('marketing', 'marketplace overview');
    assert.ok(exactScore > partialScore);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — buildIndexEntry
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.buildIndexEntry', () => {
  it('builds an index entry with keywords and tags', () => {
    const entry = KnowledgeSearch.buildIndexEntry({
      id: 'doc-1',
      organizationId: 'org-1',
      documentId: 'doc-1',
      entityType: 'document',
      title: 'Marketing Strategy Guide',
      content: 'This guide covers marketing strategy and content planning.',
      tags: ['marketing', 'guide'],
    });

    assert.equal(entry.id, 'doc-1');
    assert.equal(entry.entityType, 'document');
    assert.equal(entry.title, 'Marketing Strategy Guide');
    assert.ok(entry.keywords.includes('marketing'));
    assert.ok(entry.keywords.includes('strategy'));
    assert.deepEqual(entry.tags, ['marketing', 'guide']);
    assert.equal(entry.relevanceScore, 0);
  });

  it('handles empty content', () => {
    const entry = KnowledgeSearch.buildIndexEntry({
      id: 'doc-2',
      organizationId: 'org-1',
      entityType: 'memory',
      title: 'Empty Note',
      content: '',
    });

    assert.equal(entry.id, 'doc-2');
    assert.equal(entry.content, '');
    // Keywords come from title + content, so title words are present
    assert.ok(entry.keywords.includes('empty'));
    assert.ok(entry.keywords.includes('note'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — search
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.search', () => {
  const index = [
    {
      id: '1', organizationId: 'org-1', documentId: '1', entityType: 'document',
      title: 'Marketing Strategy Guide', content: 'Comprehensive marketing strategy and content planning guide.',
      tags: ['marketing', 'strategy'], keywords: ['marketing', 'strategy', 'guide'], relevanceScore: 0,
    },
    {
      id: '2', organizationId: 'org-1', documentId: '2', entityType: 'document',
      title: 'Sales Playbook', content: 'Sales techniques and closing strategies.',
      tags: ['sales'], keywords: ['sales', 'techniques', 'closing'], relevanceScore: 0,
    },
    {
      id: '3', organizationId: 'org-1', memoryId: '3', entityType: 'memory',
      title: 'fact', content: 'Marketing budget was increased this quarter.',
      tags: ['finance'], keywords: ['marketing', 'budget', 'quarter'], relevanceScore: 0,
    },
  ];

  it('returns results ranked by relevance', () => {
    const results = KnowledgeSearch.search(index, 'marketing strategy');
    assert.ok(results.length > 0);
    assert.equal(results[0].id, '1');
    assert.ok(results[0].relevance > 0);
  });

  it('filters by entity type', () => {
    const results = KnowledgeSearch.search(index, 'marketing', { entityType: 'memory' });
    assert.equal(results.length, 1);
    assert.equal(results[0].entityType, 'memory');
  });

  it('filters by tags', () => {
    const results = KnowledgeSearch.search(index, 'sales', { tags: ['sales'] });
    assert.equal(results.length, 1);
    assert.equal(results[0].id, '2');
  });

  it('returns empty for no matches', () => {
    const results = KnowledgeSearch.search(index, 'nonexistent topic xyz');
    assert.equal(results.length, 0);
  });

  it('returns empty for empty query', () => {
    const results = KnowledgeSearch.search(index, '');
    assert.equal(results.length, 0);
  });

  it('respects limit option', () => {
    const results = KnowledgeSearch.search(index, 'marketing', { limit: 1 });
    assert.ok(results.length <= 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — highlight
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.highlight', () => {
  it('wraps matching terms in <mark> tags', () => {
    const result = KnowledgeSearch.highlight('Marketing strategy guide', 'marketing');
    assert.ok(result.includes('<mark>Marketing</mark>'));
  });

  it('highlights multiple terms', () => {
    const result = KnowledgeSearch.highlight('Marketing strategy guide', 'marketing strategy');
    assert.ok(result.includes('<mark>Marketing</mark>'));
    assert.ok(result.includes('<mark>strategy</mark>'));
  });

  it('escapes HTML in text', () => {
    const result = KnowledgeSearch.highlight('<script>alert(1)</script>', 'script');
    // HTML should be escaped — no raw <script> tag
    assert.ok(!result.includes('<script>'));
    // The escaped entities should be present
    assert.ok(result.includes('&lt;'));
    assert.ok(result.includes('&gt;'));
  });

  it('returns original text for empty query', () => {
    const result = KnowledgeSearch.highlight('some text', '');
    assert.equal(result, 'some text');
  });

  it('preserves original case in highlighted text', () => {
    const result = KnowledgeSearch.highlight('Marketing Strategy', 'marketing');
    assert.ok(result.includes('<mark>Marketing</mark>'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// KnowledgeSearch — getStopWords
// ─────────────────────────────────────────────────────────────────────────────

describe('KnowledgeSearch.getStopWords', () => {
  it('returns a set of common stop words', () => {
    const stopWords = KnowledgeSearch.getStopWords();
    assert.ok(stopWords instanceof Set);
    assert.ok(stopWords.has('the'));
    assert.ok(stopWords.has('and'));
    assert.ok(stopWords.has('is'));
  });
});
