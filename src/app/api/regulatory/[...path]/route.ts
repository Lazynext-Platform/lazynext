// AUTO-GENERATED: Business domain catch-all route. Do not edit manually.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { RegulatoryService } from '@/lib/services/regulatory-service';
import { WorkspaceService } from '@/lib/services/workspace';

export const maxDuration = 60;

const RESOURCES: Record<string, {
  list?: string;
  create?: string;
  get?: string;
  update?: string;
  delete?: string;
  actions: Record<string, string>;
}> = {
  'changes': {
    list: 'listChanges',
    create: 'createChange',
    get: 'getChange',
    update: 'updateChange',
    actions: {
      'assess': 'assessImpact',
      'implement': 'implementChange',
    },
  },
  'filings': {
    list: 'listFilings',
    create: 'createFiling',
    get: 'getFiling',
    update: 'updateFiling',
    actions: {
      'accept': 'acceptFiling',
      'reject': 'rejectFiling',
      'submit': 'submitFiling',
    },
  },
  'metrics': {
    list: 'getRegulatoryMetrics',
    actions: {},
  },
  'monitoring': {
    list: 'listMonitoring',
    create: 'createMonitoring',
    get: 'getMonitoring',
    update: 'updateMonitoring',
    delete: 'deleteMonitoring',
    actions: {
      'finding': 'recordFinding',
    },
  },
  'requirements': {
    list: 'listRequirements',
    create: 'createRequirement',
    get: 'getRequirement',
    update: 'updateRequirement',
    delete: 'deleteRequirement',
    actions: {
      'assess': 'assessRequirement',
    },
  },
  'stats': {
    list: 'getStats',
    actions: {},
  },
  'submissions': {
    list: 'listSubmissions',
    create: 'createSubmission',
    get: 'getSubmission',
    update: 'updateSubmission',
    actions: {
      'response': 'logResponse',
      'submit': 'submitRegulatoryDocument',
    },
  },
};

async function resolveWorkspace() {
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return null;
  const workspaces = await WorkspaceService.listForUser(session.user.id);
  if (workspaces.length === 0) return null;
  return { session, ws: workspaces[0] };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const resource = RESOURCES[segments[0]];
  if (!resource) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  
  if (segments.length === 1) {
    if (!resource.list) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const ctx = await resolveWorkspace();
    if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const opts: Record<string, string> = {};
    for (const k of ['type', 'status', 'priority', 'category', 'search', 'severity', 'phase']) {
      const v = url.searchParams.get(k);
      if (v) opts[k] = v;
    }
    try {
      const items = await (RegulatoryService as any)[resource.list](ctx.ws.organizationId, opts);
      return NextResponse.json({ [segments[0]]: items });
    } catch (e) {
      console.error('[regulatory] list error:', e);
      return NextResponse.json({ error: 'failed_to_list' }, { status: 500 });
    }
  } else if (segments.length === 2) {
    if (!resource.get) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (RegulatoryService as any)[resource.get](segments[1]);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[regulatory] get error:', e);
      return NextResponse.json({ error: 'failed_to_get' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const resource = RESOURCES[segments[0]];
  if (!resource) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  
  if (segments.length === 1) {
    if (!resource.create) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const ctx = await resolveWorkspace();
    if (!ctx) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    try {
      const item = await (RegulatoryService as any)[resource.create](ctx.ws.organizationId, ctx.ws.id, body, ctx.session.user.id);
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item }, { status: 201 });
    } catch (e) {
      console.error('[regulatory] create error:', e);
      return NextResponse.json({ error: 'failed_to_create' }, { status: 500 });
    }
  } else if (segments.length === 3) {
    const action = resource.actions[segments[2]];
    if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (RegulatoryService as any)[action](segments[1], session.user.id);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[regulatory] action error:', e);
      return NextResponse.json({ error: 'failed_to_action' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const resource = RESOURCES[segments[0]];
  if (!resource) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  
  if (segments.length === 2) {
    if (!resource.update) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    try {
      const item = await (RegulatoryService as any)[resource.update](segments[1], body);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[regulatory] update error:', e);
      return NextResponse.json({ error: 'failed_to_update' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const resource = RESOURCES[segments[0]];
  if (!resource) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  
  if (segments.length === 2) {
    if (!resource.delete) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const ok = await (RegulatoryService as any)[resource.delete](segments[1]);
      if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[regulatory] delete error:', e);
      return NextResponse.json({ error: 'failed_to_delete' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
