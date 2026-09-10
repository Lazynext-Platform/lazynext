// AUTO-GENERATED: Business domain catch-all route. Do not edit manually.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { DistributionService } from '@/lib/services/distribution-service';
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
  'centers': {
    list: 'listCenters',
    create: 'createCenter',
    get: 'getCenter',
    update: 'updateCenter',
    delete: 'deleteCenter',
    actions: {},
  },
  'channels': {
    list: 'listChannels',
    create: 'createChannel',
    get: 'getChannel',
    update: 'updateChannel',
    delete: 'deleteChannel',
    actions: {
      'activate': 'activateChannel',
      'pause': 'pauseChannel',
    },
  },
  'fulfillment': {
    list: 'listFulfillments',
    create: 'createFulfillment',
    get: 'getFulfillment',
    update: 'updateFulfillment',
    delete: 'deleteFulfillment',
    actions: {
      'allocate': 'allocateFulfillment',
      'deliver': 'deliverFulfillment',
      'pack': 'packFulfillment',
      'pick': 'pickFulfillment',
      'ship': 'shipFulfillment',
    },
  },
  'metrics': {
    list: 'getDistributionMetrics',
    actions: {},
  },
  'networks': {
    list: 'listNetworks',
    create: 'createNetwork',
    get: 'getNetwork',
    update: 'updateNetwork',
    delete: 'deleteNetwork',
    actions: {},
  },
  'stats': {
    list: 'getDistributionStats',
    actions: {},
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
      const items = await (DistributionService as any)[resource.list](ctx.ws.organizationId, opts);
      return NextResponse.json({ [segments[0]]: items });
    } catch (e) {
      console.error('[distribution] list error:', e);
      return NextResponse.json({ error: 'failed_to_list' }, { status: 500 });
    }
  } else if (segments.length === 2) {
    if (!resource.get) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (DistributionService as any)[resource.get](segments[1]);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[distribution] get error:', e);
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
      const item = await (DistributionService as any)[resource.create](ctx.ws.organizationId, ctx.ws.id, body, ctx.session.user.id);
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item }, { status: 201 });
    } catch (e) {
      console.error('[distribution] create error:', e);
      return NextResponse.json({ error: 'failed_to_create' }, { status: 500 });
    }
  } else if (segments.length === 3) {
    const action = resource.actions[segments[2]];
    if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (DistributionService as any)[action](segments[1], session.user.id);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[distribution] action error:', e);
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
      const item = await (DistributionService as any)[resource.update](segments[1], body);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[distribution] update error:', e);
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
      const ok = await (DistributionService as any)[resource.delete](segments[1]);
      if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[distribution] delete error:', e);
      return NextResponse.json({ error: 'failed_to_delete' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
