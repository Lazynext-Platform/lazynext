import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { prisma } from '@/lib/prisma';
import { safeError } from '@/lib/security';
import { IntegrationRegistry, type IntegrationConfig } from '@/lib/integrations';
import { githubClient } from '@/lib/integrations/github';
import { webSearchClient } from '@/lib/integrations/web-search';
import { calendarClient } from '@/lib/integrations/calendar';
import { slackClient } from '@/lib/integrations/slack';

/**
 * GET /api/integrations/[platform] — get integration details (registry metadata).
 * POST /api/integrations/[platform] — execute an integration action
 *   (search, create issue, send message, list repos, etc.).
 * DELETE /api/integrations/[platform] — disconnect an integration.
 */

type Ctx = { params: Promise<{ platform: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { platform } = params;
  const name = platform.toLowerCase();
  const client = IntegrationRegistry.get(name);
  if (!client) {
    return NextResponse.json({ error: 'integration_not_found' }, { status: 404 });
  }

  return NextResponse.json({
    integration: { name: client.name, type: client.type },
  });
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { platform } = params;
  const name = platform.toLowerCase();
  const client = IntegrationRegistry.get(name);
  if (!client) {
    return NextResponse.json({ error: 'integration_not_found' }, { status: 404 });
  }

  let body: {
    action?: string;
    credentials?: Record<string, string>;
    query?: string;
    maxResults?: number;
    repo?: string;
    title?: string;
    body?: string;
    head?: string;
    base?: string;
    channel?: string;
    text?: string;
    start?: string;
    end?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const config: IntegrationConfig = {
    id: name,
    name,
    type: client.type,
    enabled: true,
    credentials: body.credentials ?? {},
  };
  client.configure(config);

  try {
    let result;
    switch (name) {
      case 'github': {
        const gh = githubClient;
        switch (body.action) {
          case 'listRepos':
            result = await gh.listRepos();
            break;
          case 'createIssue':
            if (!body.repo || !body.title) {
              return NextResponse.json({ error: 'repo_and_title_required' }, { status: 400 });
            }
            result = await gh.createIssue(body.repo, body.title, body.body ?? '');
            break;
          case 'createPR':
            if (!body.repo || !body.title || !body.head || !body.base) {
              return NextResponse.json({ error: 'repo_title_head_base_required' }, { status: 400 });
            }
            result = await gh.createPR(body.repo, body.title, body.head, body.base);
            break;
          case 'getWorkflowRuns':
            if (!body.repo) {
              return NextResponse.json({ error: 'repo_required' }, { status: 400 });
            }
            result = await gh.getWorkflowRuns(body.repo);
            break;
          case 'test':
            result = await gh.testConnection();
            break;
          default:
            return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
        }
        break;
      }
      case 'web-search': {
        switch (body.action) {
          case 'search':
            if (!body.query) {
              return NextResponse.json({ error: 'query_required' }, { status: 400 });
            }
            result = await webSearchClient.search(body.query, body.maxResults ?? 10);
            break;
          case 'test':
            result = await webSearchClient.testConnection();
            break;
          default:
            return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
        }
        break;
      }
      case 'calendar': {
        switch (body.action) {
          case 'listEvents':
            result = await calendarClient.listEvents(body.maxResults ?? 10);
            break;
          case 'createEvent':
            if (!body.title || !body.start || !body.end) {
              return NextResponse.json({ error: 'title_start_end_required' }, { status: 400 });
            }
            result = await calendarClient.createEvent(body.title, body.start, body.end);
            break;
          case 'test':
            result = await calendarClient.testConnection();
            break;
          default:
            return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
        }
        break;
      }
      case 'slack': {
        switch (body.action) {
          case 'sendMessage':
            if (!body.channel || !body.text) {
              return NextResponse.json({ error: 'channel_and_text_required' }, { status: 400 });
            }
            result = await slackClient.sendMessage(body.channel, body.text);
            break;
          case 'test':
            result = await slackClient.testConnection();
            break;
          default:
            return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
        }
        break;
      }
      default:
        return NextResponse.json({ error: 'unsupported_integration' }, { status: 400 });
    }

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (e) {
    return NextResponse.json(safeError(e, 'integrations/action', 'action_failed'), { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { platform } = params;
  const session = await auth().catch(() => null);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const existing = await prisma.platformConnection.findUnique({
    where: { userId_platform: { userId: session.user.id, platform: platform.toLowerCase() } },
  });
  if (!existing) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  await prisma.platformConnection.delete({
    where: { userId_platform: { userId: session.user.id, platform: platform.toLowerCase() } },
  });

  return NextResponse.json({ ok: true });
}
