// ── SDK Generator (Phase 12: API Platform) ──
//
// Generates code snippets / SDK examples for the public API in multiple
// languages, plus a catalog of available endpoints and markdown documentation.

export interface EndpointCategory {
  category: string;
  endpoints: Array<{
    method: string;
    path: string;
    description: string;
    auth: boolean;
  }>;
}

export interface SdkSnippet {
  language: string;
  code: string;
}

const DEFAULT_BASE_URL = 'https://api.lazynext.com';

const ENDPOINT_CATALOG: EndpointCategory[] = [
  {
    category: 'Workspaces',
    endpoints: [
      { method: 'GET', path: '/api/v1/workspaces', description: 'List workspaces for the authenticated API key', auth: true },
    ],
  },
  {
    category: 'API Keys',
    endpoints: [
      { method: 'GET', path: '/api/platform/keys', description: 'List API keys for the organization', auth: true },
      { method: 'POST', path: '/api/platform/keys', description: 'Create a new API key', auth: true },
      { method: 'GET', path: '/api/platform/keys/{id}', description: 'Get a single API key', auth: true },
      { method: 'PATCH', path: '/api/platform/keys/{id}', description: 'Update an API key', auth: true },
      { method: 'DELETE', path: '/api/platform/keys/{id}', description: 'Delete an API key', auth: true },
      { method: 'POST', path: '/api/platform/keys/{id}/revoke', description: 'Revoke an API key', auth: true },
      { method: 'GET', path: '/api/platform/keys/{id}/usage', description: 'Get usage stats for an API key', auth: true },
    ],
  },
  {
    category: 'Usage',
    endpoints: [
      { method: 'GET', path: '/api/platform/usage', description: 'Get organization-wide usage stats', auth: true },
      { method: 'GET', path: '/api/platform/usage/slow', description: 'Get slowest requests', auth: true },
      { method: 'GET', path: '/api/platform/usage/errors', description: 'Get error rate over time', auth: true },
    ],
  },
  {
    category: 'Webhooks',
    endpoints: [
      { method: 'GET', path: '/api/platform/webhooks', description: 'List webhook subscriptions', auth: true },
      { method: 'POST', path: '/api/platform/webhooks', description: 'Create a webhook subscription', auth: true },
      { method: 'GET', path: '/api/platform/webhooks/{id}', description: 'Get a webhook subscription', auth: true },
      { method: 'PATCH', path: '/api/platform/webhooks/{id}', description: 'Update a webhook subscription', auth: true },
      { method: 'DELETE', path: '/api/platform/webhooks/{id}', description: 'Delete a webhook subscription', auth: true },
      { method: 'POST', path: '/api/platform/webhooks/{id}/test', description: 'Send a test event', auth: true },
      { method: 'POST', path: '/api/platform/webhooks/{id}/pause', description: 'Pause a webhook subscription', auth: true },
      { method: 'POST', path: '/api/platform/webhooks/{id}/resume', description: 'Resume a webhook subscription', auth: true },
    ],
  },
  {
    category: 'SDK & Docs',
    endpoints: [
      { method: 'POST', path: '/api/platform/sdk/generate', description: 'Generate SDK code snippets', auth: true },
      { method: 'GET', path: '/api/platform/sdk/endpoints', description: 'List all available API endpoints', auth: true },
      { method: 'GET', path: '/api/platform/docs', description: 'Get API documentation (markdown)', auth: false },
    ],
  },
];

export const SdkGenerator = {
  /**
   * Generate a JavaScript / TypeScript SDK code snippet.
   */
  generateJavaScript(baseUrl = DEFAULT_BASE_URL, apiKey = 'YOUR_API_KEY'): string {
    return `import { Lazynext } from '@lazynext/sdk';

const client = new Lazynext({
  baseUrl: '${baseUrl}',
  apiKey: '${apiKey}',
});

// List workspaces
const { workspaces } = await client.workspaces.list();

// Create an API key
const { apiKey, plaintextKey } = await client.keys.create({
  name: 'My Production Key',
  scopes: ['read', 'write'],
});

// List webhook subscriptions
const subs = await client.webhooks.list();

// Send a test webhook
await client.webhooks.test('sub_123');`;
  },

  /**
   * Generate a Python SDK code snippet.
   */
  generatePython(baseUrl = DEFAULT_BASE_URL, apiKey = 'YOUR_API_KEY'): string {
    return `from lazynext import Lazynext

client = Lazynext(
    base_url="${baseUrl}",
    api_key="${apiKey}",
)

# List workspaces
workspaces = client.workspaces.list()

# Create an API key
result = client.keys.create(
    name="My Production Key",
    scopes=["read", "write"],
)
print(result.plaintext_key)  # only returned once

# List webhook subscriptions
subs = client.webhooks.list()

# Send a test webhook
client.webhooks.test("sub_123")`;
  },

  /**
   * Generate a Go code snippet.
   */
  generateGo(baseUrl = DEFAULT_BASE_URL, apiKey = 'YOUR_API_KEY'): string {
    return `package main

import (
    "context"
    "fmt"
    "github.com/lazynext/sdk-go"
)

func main() {
    client := lazynext.New("${baseUrl}", "${apiKey}")

    // List workspaces
    workspaces, err := client.Workspaces.List(context.Background())
    if err != nil {
        panic(err)
    }
    fmt.Println(workspaces)

    // Create an API key
    key, err := client.Keys.Create(context.Background(), &lazynext.KeyCreateParams{
        Name:   "My Production Key",
        Scopes: []string{"read", "write"},
    })

    // List webhook subscriptions
    subs, err := client.Webhooks.List(context.Background())
}`;
  },

  /**
   * Generate curl examples.
   */
  generateCurl(baseUrl = DEFAULT_BASE_URL, apiKey = 'YOUR_API_KEY'): string {
    return `# List workspaces
curl -X GET ${baseUrl}/api/v1/workspaces \\
  -H "Authorization: Bearer ${apiKey}"

# Create an API key
curl -X POST ${baseUrl}/api/platform/keys \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"My Production Key","scopes":["read","write"]}'

# List webhook subscriptions
curl -X GET ${baseUrl}/api/platform/webhooks \\
  -H "Authorization: Bearer ${apiKey}"

# Send a test webhook
curl -X POST ${baseUrl}/api/platform/webhooks/sub_123/test \\
  -H "Authorization: Bearer ${apiKey}"`;
  },

  /**
   * Generate a Rust code snippet.
   */
  generateRust(baseUrl = DEFAULT_BASE_URL, apiKey = 'YOUR_API_KEY'): string {
    return `use lazynext::Lazynext;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Lazynext::new("${baseUrl}", "${apiKey}");

    // List workspaces
    let workspaces = client.workspaces().list().await?;
    println!("{:?}", workspaces);

    // Create an API key
    let key = client.keys().create(&lazynext::KeyCreateParams {
        name: "My Production Key".to_string(),
        scopes: vec!["read".to_string(), "write".to_string()],
    }).await?;

    // List webhook subscriptions
    let subs = client.webhooks().list().await?;

    Ok(())
}`;
  },

  /**
   * Generate all SDK variants at once.
   */
  generateAll(baseUrl = DEFAULT_BASE_URL, apiKey = 'YOUR_API_KEY'): SdkSnippet[] {
    return [
      { language: 'javascript', code: this.generateJavaScript(baseUrl, apiKey) },
      { language: 'python', code: this.generatePython(baseUrl, apiKey) },
      { language: 'go', code: this.generateGo(baseUrl, apiKey) },
      { language: 'curl', code: this.generateCurl(baseUrl, apiKey) },
      { language: 'rust', code: this.generateRust(baseUrl, apiKey) },
    ];
  },

  /**
   * Return all available API endpoints grouped by category.
   */
  getEndpointList(): EndpointCategory[] {
    return ENDPOINT_CATALOG;
  },

  /**
   * Generate markdown API documentation.
   */
  generateDocs(baseUrl = DEFAULT_BASE_URL): string {
    const lines: string[] = [
      '# Lazynext API Documentation',
      '',
      `Base URL: \`${baseUrl}\``,
      '',
      '## Authentication',
      '',
      'All authenticated endpoints require an API key passed via the `Authorization` header:',
      '',
      '```',
      'Authorization: Bearer lnxt_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      '```',
      '',
      'Alternatively, the `X-API-Key` header is accepted as a fallback.',
      '',
      '## Rate Limiting',
      '',
      'Each API key has per-minute and per-day rate limits. When exceeded, the API responds with `429 Too Many Requests` and a `Retry-After` header.',
      '',
      '## Endpoints',
      '',
    ];

    for (const cat of ENDPOINT_CATALOG) {
      lines.push(`### ${cat.category}`, '');
      lines.push('| Method | Path | Description | Auth |');
      lines.push('|--------|------|-------------|------|');
      for (const ep of cat.endpoints) {
        lines.push(`| \`${ep.method}\` | \`${ep.path}\` | ${ep.description} | ${ep.auth ? 'Yes' : 'No'} |`);
      }
      lines.push('');
    }

    lines.push('## Webhooks', '');
    lines.push('Webhook subscriptions deliver signed (HMAC-SHA256) POST requests to your URL. Verify the `X-Webhook-Signature` header using your subscription secret.', '');

    return lines.join('\n');
  },
};
