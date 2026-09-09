export interface IntegrationConfig {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  credentials: Record<string, string>;
}

export interface IntegrationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface IntegrationClient {
  name: string;
  type: string;
  configure(config: IntegrationConfig): void;
  testConnection(): Promise<IntegrationResult>;
}

export const IntegrationRegistry = {
  clients: new Map<string, IntegrationClient>(),

  register(client: IntegrationClient): void {
    this.clients.set(client.name, client);
  },

  get(name: string): IntegrationClient | null {
    return this.clients.get(name) || null;
  },

  list(): string[] {
    return Array.from(this.clients.keys());
  },
};

// Late imports + registration happen at the bottom to avoid circular-import
// issues during module initialization. The individual client modules import
// only types from this file, so the registry is fully initialized by the time
// any consumer calls `IntegrationRegistry.get/list`.
import { githubClient } from './github';
import { webSearchClient } from './web-search';
import { calendarClient } from './calendar';
import { slackClient } from './slack';

// Auto-register all built-in clients
IntegrationRegistry.register(githubClient);
IntegrationRegistry.register(webSearchClient);
IntegrationRegistry.register(calendarClient);
IntegrationRegistry.register(slackClient);
