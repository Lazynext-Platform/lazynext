import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  IntegrationRegistry,
  type IntegrationClient,
  type IntegrationConfig,
  type IntegrationResult,
} from '@/lib/integrations';
import { GitHubClient, githubClient } from '@/lib/integrations/github';
import { WebSearchClient, webSearchClient } from '@/lib/integrations/web-search';
import { CalendarClient, calendarClient } from '@/lib/integrations/calendar';
import { SlackClient, slackClient } from '@/lib/integrations/slack';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<IntegrationConfig> = {}): IntegrationConfig {
  return {
    id: 'test-id',
    name: 'test',
    type: 'test',
    enabled: true,
    credentials: {},
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// IntegrationRegistry — register / get / list
// ─────────────────────────────────────────────────────────────────────────────

describe('IntegrationRegistry', () => {
  it('auto-registers the four built-in clients on import', () => {
    const names = IntegrationRegistry.list();
    assert.ok(names.includes('github'), 'github should be registered');
    assert.ok(names.includes('web-search'), 'web-search should be registered');
    assert.ok(names.includes('calendar'), 'calendar should be registered');
    assert.ok(names.includes('slack'), 'slack should be registered');
  });

  it('get() returns the registered client by name', () => {
    const client = IntegrationRegistry.get('github');
    assert.ok(client, 'github client should be retrievable');
    assert.equal(client?.name, 'github');
    assert.equal(client?.type, 'version-control');
  });

  it('get() returns null for an unknown name', () => {
    assert.equal(IntegrationRegistry.get('does-not-exist'), null);
  });

  it('register() adds a new client and list() includes it', () => {
    const mock: IntegrationClient = {
      name: 'mock-test-client',
      type: 'mock',
      configure: () => {},
      testConnection: async (): Promise<IntegrationResult> => ({ success: true }),
    };
    IntegrationRegistry.register(mock);
    assert.ok(IntegrationRegistry.list().includes('mock-test-client'));
    assert.equal(IntegrationRegistry.get('mock-test-client'), mock);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GitHubClient
// ─────────────────────────────────────────────────────────────────────────────

describe('GitHubClient', () => {
  it('exposes name and type', () => {
    assert.equal(githubClient.name, 'github');
    assert.equal(githubClient.type, 'version-control');
  });

  it('testConnection() fails without a token', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /token/);
  });

  it('testConnection() succeeds with a token (stub)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_test' } }));
    const res = await client.testConnection();
    assert.equal(res.success, true);
  });

  it('listRepos() fails when not configured', async () => {
    const client = new GitHubClient();
    const res = await client.listRepos();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('listRepos() returns an empty repos array (stub)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_test' } }));
    const res = await client.listRepos();
    assert.equal(res.success, true);
    assert.deepEqual((res.data as { repos: unknown[] }).repos, []);
  });

  it('createIssue() returns stub data with repo/title/body', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_test' } }));
    const res = await client.createIssue('owner/repo', 'Bug', 'details');
    assert.equal(res.success, true);
    const data = res.data as { repo: string; title: string; body: string; number: number };
    assert.equal(data.repo, 'owner/repo');
    assert.equal(data.title, 'Bug');
    assert.equal(data.body, 'details');
    assert.equal(data.number, 0);
  });

  it('createPR() returns stub data with repo/title/head/base', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_test' } }));
    const res = await client.createPR('owner/repo', 'Fix', 'feature', 'main');
    assert.equal(res.success, true);
    const data = res.data as { repo: string; title: string; head: string; base: string; number: number };
    assert.equal(data.repo, 'owner/repo');
    assert.equal(data.title, 'Fix');
    assert.equal(data.head, 'feature');
    assert.equal(data.base, 'main');
    assert.equal(data.number, 0);
  });

  it('getWorkflowRuns() returns an empty runs array (stub)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_test' } }));
    const res = await client.getWorkflowRuns('owner/repo');
    assert.equal(res.success, true);
    assert.deepEqual((res.data as { runs: unknown[] }).runs, []);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSearchClient
// ─────────────────────────────────────────────────────────────────────────────

describe('WebSearchClient', () => {
  it('exposes name and type', () => {
    assert.equal(webSearchClient.name, 'web-search');
    assert.equal(webSearchClient.type, 'search');
  });

  it('testConnection() fails without an apiKey', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /API key/);
  });

  it('testConnection() succeeds with an apiKey (stub)', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: { apiKey: 'sk_test' } }));
    const res = await client.testConnection();
    assert.equal(res.success, true);
  });

  it('search() fails when not configured', async () => {
    const client = new WebSearchClient();
    const res = await client.search('query');
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('search() returns the query and an empty results array (stub)', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: { apiKey: 'sk_test' } }));
    const res = await client.search('best ad hooks', 5);
    assert.equal(res.success, true);
    const data = res.data as { query: string; results: unknown[]; maxResults: number };
    assert.equal(data.query, 'best ad hooks');
    assert.deepEqual(data.results, []);
    assert.equal(data.maxResults, 5);
  });

  it('search() defaults maxResults to 10', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: { apiKey: 'sk_test' } }));
    const res = await client.search('query');
    const data = res.data as { maxResults: number };
    assert.equal(data.maxResults, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CalendarClient
// ─────────────────────────────────────────────────────────────────────────────

describe('CalendarClient', () => {
  it('exposes name and type', () => {
    assert.equal(calendarClient.name, 'calendar');
    assert.equal(calendarClient.type, 'calendar');
  });

  it('testConnection() fails without a token', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /token/);
  });

  it('testConnection() succeeds with a token (stub)', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: { token: 'cal_test' } }));
    const res = await client.testConnection();
    assert.equal(res.success, true);
  });

  it('listEvents() fails when not configured', async () => {
    const client = new CalendarClient();
    const res = await client.listEvents();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('listEvents() returns an empty events array (stub)', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: { token: 'cal_test' } }));
    const res = await client.listEvents();
    assert.equal(res.success, true);
    assert.deepEqual((res.data as { events: unknown[] }).events, []);
  });

  it('createEvent() returns stub data with title/start/end', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: { token: 'cal_test' } }));
    const res = await client.createEvent('Meeting', '2025-01-01T10:00', '2025-01-01T11:00');
    assert.equal(res.success, true);
    const data = res.data as { title: string; start: string; end: string; id: string };
    assert.equal(data.title, 'Meeting');
    assert.equal(data.start, '2025-01-01T10:00');
    assert.equal(data.end, '2025-01-01T11:00');
    assert.equal(data.id, 'stub-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SlackClient
// ─────────────────────────────────────────────────────────────────────────────

describe('SlackClient', () => {
  it('exposes name and type', () => {
    assert.equal(slackClient.name, 'slack');
    assert.equal(slackClient.type, 'messaging');
  });

  it('testConnection() fails without a token', async () => {
    const client = new SlackClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /token/);
  });

  it('testConnection() succeeds with a token (stub)', async () => {
    const client = new SlackClient();
    client.configure(makeConfig({ credentials: { token: 'xoxb_test' } }));
    const res = await client.testConnection();
    assert.equal(res.success, true);
  });

  it('sendMessage() fails when not configured', async () => {
    const client = new SlackClient();
    const res = await client.sendMessage('#general', 'hello');
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('sendMessage() returns stub data with channel/text/ts', async () => {
    const client = new SlackClient();
    client.configure(makeConfig({ credentials: { token: 'xoxb_test' } }));
    const res = await client.sendMessage('#general', 'hello');
    assert.equal(res.success, true);
    const data = res.data as { channel: string; text: string; ts: string };
    assert.equal(data.channel, '#general');
    assert.equal(data.text, 'hello');
    assert.equal(data.ts, 'stub-ts');
  });
});
