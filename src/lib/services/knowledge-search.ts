// ── Knowledge Search Engine ──
// Provides tokenization, keyword extraction, relevance scoring, and
// highlighting for the unified knowledge search across documents,
// memories, and research records.

// ── Types ──

export interface SearchIndexEntry {
  id: string;
  organizationId: string;
  documentId?: string | null;
  memoryId?: string | null;
  researchId?: string | null;
  entityType: string; // document | memory | research
  title: string;
  content: string;
  tags: string[];
  keywords: string[];
  relevanceScore: number;
}

export interface SearchEntity {
  id: string;
  organizationId: string;
  documentId?: string | null;
  memoryId?: string | null;
  researchId?: string | null;
  entityType: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface SearchOpts {
  workspaceId?: string;
  entityType?: string;
  tags?: string[];
  limit?: number;
}

export interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  excerpt: string;
  relevance: number;
  tags: string[];
  highlightedTitle: string;
  highlightedExcerpt: string;
}

// ── Stop words ──

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'when',
  'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to',
  'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under',
  'again', 'further', 'once', 'here', 'there', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can',
  'will', 'just', 'should', 'now', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'of',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
]);

// ── Knowledge Search ──

export const KnowledgeSearch = {
  /**
   * Get the set of common English stop words.
   */
  getStopWords(): Set<string> {
    return STOP_WORDS;
  },

  /**
   * Tokenize text into lowercase keywords, removing punctuation and
   * splitting on whitespace.
   */
  tokenize(text: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 0);
  },

  /**
   * Extract the top `limit` keywords from text using frequency analysis,
   * excluding stop words.
   */
  extractKeywords(text: string, limit: number = 20): string[] {
    const tokens = this.tokenize(text);
    const freq = new Map<string, number>();

    for (const token of tokens) {
      if (STOP_WORDS.has(token) || token.length < 2) continue;
      freq.set(token, (freq.get(token) || 0) + 1);
    }

    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  },

  /**
   * Score a text against a query string.
   * Uses term frequency and fuzzy (substring) matching.
   * Returns a numeric score (higher = more relevant).
   */
  score(query: string, text: string): number {
    if (!query || !text) return 0;

    const queryTokens = this.tokenize(query).filter((t) => !STOP_WORDS.has(t) && t.length > 1);
    if (queryTokens.length === 0) return 0;

    const textTokens = this.tokenize(text);
    const textLower = text.toLowerCase();
    const textLen = textTokens.length || 1;

    let score = 0;

    for (const qt of queryTokens) {
      // Exact token match — term frequency
      let exactMatches = 0;
      for (const tt of textTokens) {
        if (tt === qt) exactMatches++;
      }

      if (exactMatches > 0) {
        // TF normalized by document length
        score += (exactMatches / textLen) * 10;
      }

      // Fuzzy / substring match
      if (textLower.includes(qt)) {
        score += 2;
      }

      // Prefix match bonus
      for (const tt of textTokens) {
        if (tt.startsWith(qt) && tt !== qt) {
          score += 1;
          break;
        }
      }
    }

    // Normalize by number of query tokens so multi-term queries don't
    // get artificially inflated
    return score / queryTokens.length;
  },

  /**
   * Build a search index entry from an entity object.
   */
  buildIndexEntry(entity: SearchEntity): SearchIndexEntry {
    const fullText = `${entity.title} ${entity.content}`;
    const keywords = this.extractKeywords(fullText, 30);
    const tags = entity.tags || [];

    return {
      id: entity.id,
      organizationId: entity.organizationId,
      documentId: entity.documentId ?? null,
      memoryId: entity.memoryId ?? null,
      researchId: entity.researchId ?? null,
      entityType: entity.entityType,
      title: entity.title,
      content: entity.content,
      tags,
      keywords,
      relevanceScore: 0,
    };
  },

  /**
   * Search the index entries with optional filters.
   * Ranks results by relevance score (title + content).
   */
  search(
    index: SearchIndexEntry[],
    query: string,
    opts?: SearchOpts,
  ): SearchResult[] {
    const q = query.trim();
    if (!q) return [];

    const limit = opts?.limit ?? 50;
    const entityType = opts?.entityType;
    const tags = opts?.tags;

    const results: SearchResult[] = [];

    for (const entry of index) {
      // Apply filters
      if (entityType && entry.entityType !== entityType) continue;
      if (tags && tags.length > 0) {
        const hasTag = tags.some((t) => entry.tags.includes(t));
        if (!hasTag) continue;
      }

      const titleScore = this.score(q, entry.title) * 2; // title weighted higher
      const contentScore = this.score(q, entry.content);
      const keywordScore = this.score(q, entry.keywords.join(' ')) * 1.5;
      const tagScore = this.score(q, entry.tags.join(' ')) * 1.5;

      const total = titleScore + contentScore + keywordScore + tagScore;
      if (total <= 0) continue;

      const excerpt = entry.content.slice(0, 200);

      results.push({
        id: entry.id,
        entityType: entry.entityType,
        title: entry.title,
        excerpt,
        relevance: Math.round(total * 100) / 100,
        tags: entry.tags,
        highlightedTitle: this.highlight(entry.title, q),
        highlightedExcerpt: this.highlight(excerpt, q),
      });
    }

    return results.sort((a, b) => b.relevance - a.relevance).slice(0, limit);
  },

  /**
   * Highlight matching query terms in text, returning HTML with <mark> tags.
   */
  highlight(text: string, query: string): string {
    if (!query || !text) return text;

    const queryTokens = this.tokenize(query).filter((t) => !STOP_WORDS.has(t) && t.length > 1);
    if (queryTokens.length === 0) return text;

    // Escape HTML first
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Sort tokens by length descending so longer matches are replaced first
    const sortedTokens = [...new Set(queryTokens)].sort((a, b) => b.length - a.length);

    for (const token of sortedTokens) {
      // Case-insensitive replacement, preserving original case
      const regex = new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      escaped = escaped.replace(regex, '<mark>$1</mark>');
    }

    return escaped;
  },
};
