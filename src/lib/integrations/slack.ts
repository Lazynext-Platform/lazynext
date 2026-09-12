import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

export class SlackClient implements IntegrationClient {
  name = 'slack';
  type = 'messaging';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  private getToken(): string | null {
    return this.config?.credentials.token || process.env.SLACK_BOT_TOKEN || null;
  }

  async testConnection(): Promise<IntegrationResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Slack token not configured (set SLACK_BOT_TOKEN or provide credentials.token)' };
    }
    try {
      const resp = await fetch('https://slack.com/api/auth.test', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(8000),
      });
      const result = await resp.json() as { ok: boolean; error?: string; user?: string; team?: string };
      if (!result.ok) {
        return { success: false, error: result.error || 'Slack auth test failed' };
      }
      return { success: true, data: { message: `Connected as ${result.user} on ${result.team}` } };
    } catch (e) {
      return { success: false, error: `Slack connection failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async sendMessage(channel: string, text: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Slack token not configured' };
    }
    try {
      const resp = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, text }),
        signal: AbortSignal.timeout(10000),
      });
      const result = await resp.json() as { ok: boolean; error?: string; ts?: string };
      if (!result.ok) {
        return { success: false, error: result.error || 'Unknown Slack error' };
      }
      return { success: true, data: { channel, text, ts: result.ts } };
    } catch (e) {
      return { success: false, error: `Slack sendMessage failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }

  async listChannels(limit: number = 100): Promise<IntegrationResult> {
    const token = this.getToken();
    if (!token) {
      return { success: false, error: 'Slack token not configured' };
    }
    try {
      const resp = await fetch(`https://slack.com/api/conversations.list?limit=${limit}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      });
      const result = await resp.json() as { ok: boolean; error?: string; channels?: Array<{ id: string; name: string }> };
      if (!result.ok) {
        return { success: false, error: result.error || 'Unknown Slack error' };
      }
      return { success: true, data: { channels: result.channels?.map(c => ({ id: c.id, name: c.name })) || [] } };
    } catch (e) {
      return { success: false, error: `Slack listChannels failed: ${e instanceof Error ? e.message : 'unknown'}` };
    }
  }
}

export const slackClient = new SlackClient();
