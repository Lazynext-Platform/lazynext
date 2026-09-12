import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

export class CalendarClient implements IntegrationClient {
  name = 'calendar';
  type = 'calendar';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  private getToken(): string | null {
    return this.config?.credentials.token || process.env.GOOGLE_CALENDAR_TOKEN || null;
  }

  async testConnection(): Promise<IntegrationResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Calendar token not configured (set GOOGLE_CALENDAR_TOKEN or provide credentials.token)' };
    }
    try {
      const resp = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        return { success: false, error: `Google Calendar API returned ${resp.status}` };
      }
      const data = await resp.json() as { items?: Array<{ id: string; summary: string }> };
      return { success: true, data: { message: `Connected — ${data.items?.length || 0} calendars`, calendars: data.items?.map(c => ({ id: c.id, summary: c.summary })) || [] } };
    } catch (e) {
      return { success: false, error: `Calendar connection failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async listEvents(maxResults: number = 10): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Calendar token not configured' };
    }
    try {
      const timeMin = new Date().toISOString();
      const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&orderBy=startTime&singleEvents=true&timeMin=${timeMin}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        return { success: false, error: `Google Calendar API returned ${resp.status}` };
      }
      const data = await resp.json() as { items?: Array<{ id: string; summary: string; start?: { dateTime?: string }; end?: { dateTime?: string }; htmlLink?: string }> };
      return { success: true, data: { events: data.items?.map(e => ({ id: e.id, title: e.summary, start: e.start?.dateTime, end: e.end?.dateTime, htmlLink: e.htmlLink })) || [], maxResults } };
    } catch (e) {
      return { success: false, error: `Calendar listEvents failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async createEvent(title: string, start: string, end: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Calendar token not configured' };
    }
    try {
      const resp = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: title,
          start: { dateTime: start },
          end: { dateTime: end },
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        const err = await resp.text().catch(() => '');
        return { success: false, error: `Google Calendar API returned ${resp.status}: ${err.slice(0, 200)}` };
      }
      const event = await resp.json() as { id: string; htmlLink?: string };
      return { success: true, data: { title, start, end, id: event.id, htmlLink: event.htmlLink } };
    } catch (e) {
      return { success: false, error: `Calendar createEvent failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }
}

export const calendarClient = new CalendarClient();
