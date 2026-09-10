import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

export class CalendarClient implements IntegrationClient {
  name = 'calendar';
  type = 'calendar';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<IntegrationResult> {
    if (!this.config?.credentials.token) {
      return { success: false, error: 'Calendar token not configured' };
    }
    return { success: true, data: { message: 'Calendar connection test (stub)' } };
  }

  async listEvents(maxResults: number = 10): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    return { success: true, data: { events: [], maxResults } };
  }

  async createEvent(title: string, start: string, end: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    return { success: true, data: { title, start, end, id: 'stub-1' } };
  }
}

export const calendarClient = new CalendarClient();
