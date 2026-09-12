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
// GitHubClient — real GitHub REST API
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

  it('testConnection() fails with an invalid token (real API call)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_invalid_test_token' } }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    // Real GitHub API returns 401 for invalid tokens
    assert.ok(res.error?.includes('401') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });

  it('listRepos() fails when not configured', async () => {
    const client = new GitHubClient();
    const res = await client.listRepos();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('listRepos() fails with invalid token (real API call)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_invalid_test_token' } }));
    const res = await client.listRepos();
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });

  it('createIssue() fails with invalid token (real API call)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_invalid_test_token' } }));
    const res = await client.createIssue('owner/repo', 'Bug', 'details');
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('404') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });

  it('createPR() fails with invalid token (real API call)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_invalid_test_token' } }));
    const res = await client.createPR('owner/repo', 'Fix', 'feature', 'main');
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('404') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });

  it('getWorkflowRuns() fails with invalid token (real API call)', async () => {
    const client = new GitHubClient();
    client.configure(makeConfig({ credentials: { token: 'ghp_invalid_test_token' } }));
    const res = await client.getWorkflowRuns('owner/repo');
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('404') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WebSearchClient — real DuckDuckGo + Wikipedia APIs (free, no key)
// ─────────────────────────────────────────────────────────────────────────────

describe('WebSearchClient', () => {
  it('exposes name and type', () => {
    assert.equal(webSearchClient.name, 'web-search');
    assert.equal(webSearchClient.type, 'search');
  });

  it('testConnection() succeeds without an apiKey (free APIs)', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.testConnection();
    assert.equal(res.success, true);
  });

  it('search() returns real results from DuckDuckGo/Wikipedia', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.search('JavaScript programming language', 5);
    assert.equal(res.success, true);
    const data = res.data as { query: string; results: Array<{ title: string; url: string; snippet: string; source: string }>; count: number; maxResults: number };
    assert.equal(data.query, 'JavaScript programming language');
    assert.equal(data.maxResults, 5);
    assert.ok(data.results.length > 0, 'expected at least one result from free APIs');
    assert.ok(data.count > 0, 'expected count > 0');
    // Each result should have the required fields
    for (const r of data.results) {
      assert.ok(r.title, 'result should have a title');
      assert.ok(r.url, 'result should have a url');
      assert.ok(r.snippet, 'result should have a snippet');
      assert.ok(r.source, 'result should have a source');
      assert.ok(['duckduckgo', 'wikipedia'].includes(r.source), `source should be duckduckgo or wikipedia, got: ${r.source}`);
    }
  });

  it('search() defaults maxResults to 10', async () => {
    const client = new WebSearchClient();
    client.configure(makeConfig({ credentials: {} }));
    const res = await client.search('test query');
    const data = res.data as { maxResults: number };
    assert.equal(data.maxResults, 10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CalendarClient — real Google Calendar API
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

  it('testConnection() fails with an invalid token (real API call)', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: { token: 'invalid_cal_token' } }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });

  it('listEvents() fails when not configured', async () => {
    const client = new CalendarClient();
    const res = await client.listEvents();
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('listEvents() fails with invalid token (real API call)', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: { token: 'invalid_cal_token' } }));
    const res = await client.listEvents();
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });

  it('createEvent() fails with invalid token (real API call)', async () => {
    const client = new CalendarClient();
    client.configure(makeConfig({ credentials: { token: 'invalid_cal_token' } }));
    const res = await client.createEvent('Meeting', '2025-01-01T10:00:00Z', '2025-01-01T11:00:00Z');
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('401') || res.error?.includes('failed'), `expected API error, got: ${res.error}`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SlackClient — real Slack Web API
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

  it('testConnection() fails with an invalid token (real API call)', async () => {
    const client = new SlackClient();
    client.configure(makeConfig({ credentials: { token: 'xoxb_invalid_test_token' } }));
    const res = await client.testConnection();
    assert.equal(res.success, false);
    // Slack API returns ok=false with an error message for invalid tokens
    assert.ok(res.error?.includes('invalid') || res.error?.includes('failed') || res.error?.includes('not_authed'), `expected API error, got: ${res.error}`);
  });

  it('sendMessage() fails when not configured', async () => {
    const client = new SlackClient();
    const res = await client.sendMessage('#general', 'hello');
    assert.equal(res.success, false);
    assert.match(res.error ?? '', /Not configured/);
  });

  it('sendMessage() fails with invalid token (real API call)', async () => {
    const client = new SlackClient();
    client.configure(makeConfig({ credentials: { token: 'xoxb_invalid_test_token' } }));
    const res = await client.sendMessage('#general', 'hello');
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('invalid') || res.error?.includes('failed') || res.error?.includes('not_authed'), `expected API error, got: ${res.error}`);
  });
});
