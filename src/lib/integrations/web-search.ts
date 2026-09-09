import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class WebSearchClient implements IntegrationClient {
  name = 'web-search';
  type = 'search';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<IntegrationResult> {
    if (!this.config?.credentials.apiKey) {
      return { success: false, error: 'Search API key not configured' };
    }
    return { success: true, data: { message: 'Web search connection test (stub)' } };
  }

  async search(query: string, maxResults: number = 10): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    // In production, call search API (e.g. SerpAPI, Google Custom Search, Brave Search)
    return {
      success: true,
      data: {
        query,
        results: [] as SearchResult[],
        maxResults,
        message: 'Web search (stub — configure API key for real results)',
      },
    };
  }
}

export const webSearchClient = new WebSearchClient();
