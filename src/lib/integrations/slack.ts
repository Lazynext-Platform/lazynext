import type { IntegrationClient, IntegrationConfig, IntegrationResult } from './index';

export class SlackClient implements IntegrationClient {
  name = 'slack';
  type = 'messaging';
  private config: IntegrationConfig | null = null;

  configure(config: IntegrationConfig): void {
    this.config = config;
  }

  async testConnection(): Promise<IntegrationResult> {
    if (!this.config?.credentials.token) {
      return { success: false, error: 'Slack token not configured' };
    }
    return { success: true, data: { message: 'Slack connection test (stub)' } };
  }

  async sendMessage(channel: string, text: string): Promise<IntegrationResult> {
    if (!this.config) return { success: false, error: 'Not configured' };
    return { success: true, data: { channel, text, ts: 'stub-ts' } };
  }
}

export const slackClient = new SlackClient();
