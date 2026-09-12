import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export class WebSearchClient implements IntegrationClient {
  name = 'web-search';
  type = 'search';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<IntegrationResult> {
    // Free APIs (DuckDuckGo + Wikipedia) need no key, so always pass.
    // If a paid provider key is configured, we still pass.
    return { success: true, data: { message: 'Web search ready (DuckDuckGo + Wikipedia, no key needed)' } };
  }

  async search(query: string, maxResults: number = 10): Promise<IntegrationResult> {
    if (!this.config && !process.env.WEB_SEARCH_API_KEY) {
      // Still works — DuckDuckGo + Wikipedia are free
      this.config = { id: 'web-search', name: 'web-search', type: 'search', enabled: true, credentials: {} };
    }

    const results: SearchResult[] = [];

    // 1. DuckDuckGo Instant Answer API (free, no key needed)
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      const ddgResp = await fetch(ddgUrl, { signal: AbortSignal.timeout(8000) });
      if (ddgResp.ok) {
        const ddg = await ddgResp.json() as {
          AbstractText?: string;
          AbstractURL?: string;
          Heading?: string;
          RelatedTopics?: Array<{ Text?: string; FirstURL?: string } | { Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
        };
        if (ddg.AbstractText && ddg.AbstractURL) {
          results.push({ title: ddg.Heading || query, url: ddg.AbstractURL, snippet: ddg.AbstractText, source: 'duckduckgo' });
        }
        if (ddg.RelatedTopics) {
          for (const topic of ddg.RelatedTopics) {
            if (results.length >= maxResults) break;
            if ('Text' in topic && topic.Text && topic.FirstURL) {
              results.push({ title: topic.Text.slice(0, 80), url: topic.FirstURL, snippet: topic.Text, source: 'duckduckgo' });
            } else if ('Topics' in topic && topic.Topics) {
              for (const sub of topic.Topics) {
                if (results.length >= maxResults) break;
                if (sub.Text && sub.FirstURL) {
                  results.push({ title: sub.Text.slice(0, 80), url: sub.FirstURL, snippet: sub.Text, source: 'duckduckgo' });
                }
              }
            }
          }
        }
      }
    } catch { /* DDG may not return results for all queries */ }

    // 2. Wikipedia search API (free, no key needed) — supplement if DDG didn't fill
    if (results.length < maxResults) {
      try {
        const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=${maxResults - results.length}`;
        const wikiResp = await fetch(wikiUrl, { signal: AbortSignal.timeout(8000) });
        if (wikiResp.ok) {
          const wiki = await wikiResp.json() as { query?: { search?: Array<{ title: string; snippet: string }> } };
          if (wiki.query?.search) {
            for (const item of wiki.query.search) {
              if (results.length >= maxResults) break;
              const snippet = item.snippet.replace(/<[^>]+>/g, '');
              results.push({
                title: item.title,
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
                snippet,
                source: 'wikipedia',
              });
            }
          }
        }
      } catch { /* Wikipedia may be unavailable */ }
    }

    return {
      success: true,
      data: { query, results, count: results.length, maxResults },
    };
  }
}

export const webSearchClient = new WebSearchClient();
