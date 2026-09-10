// AUTO-GENERATED: Business domain catch-all route. Do not edit manually.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { GrantService } from '@/lib/services/grant-service';
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
  'applications': {
    list: 'listApplications',
    create: 'createApplication',
    get: 'getApplication',
    update: 'updateApplication',
    actions: {
      'submit': 'submitApplication',
      'withdraw': 'withdrawApplication',
    },
  },
  'awards': {
    list: 'listAwards',
    create: 'createAward',
    get: 'getAward',
    update: 'updateAward',
    actions: {
      'accept': 'acceptAward',
      'close': 'closeAward',
    },
  },
  'disbursements': {
    list: 'listDisbursements',
    create: 'createDisbursement',
    get: 'getDisbursement',
    update: 'updateDisbursement',
    actions: {
      'approve': 'approveDisbursement',
    },
  },
  'metrics': {
    list: 'getGrantMetrics',
    actions: {},
  },
  'opportunities': {
    list: 'listOpportunities',
    create: 'createOpportunity',
    get: 'getOpportunity',
    update: 'updateOpportunity',
    delete: 'deleteOpportunity',
    actions: {},
  },
  'reports': {
    list: 'listReports',
    create: 'createReport',
    get: 'getReport',
    update: 'updateReport',
    actions: {
      'submit': 'submitReport',
    },
  },
  'stats': {
    list: 'getStats',
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
      const items = await (GrantService as any)[resource.list](ctx.ws.organizationId, opts);
      return NextResponse.json({ [segments[0]]: items });
    } catch (e) {
      console.error('[grants] list error:', e);
      return NextResponse.json({ error: 'failed_to_list' }, { status: 500 });
    }
  } else if (segments.length === 2) {
    if (!resource.get) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (GrantService as any)[resource.get](segments[1]);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[grants] get error:', e);
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
      const item = await (GrantService as any)[resource.create](ctx.ws.organizationId, ctx.ws.id, body, ctx.session.user.id);
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item }, { status: 201 });
    } catch (e) {
      console.error('[grants] create error:', e);
      return NextResponse.json({ error: 'failed_to_create' }, { status: 500 });
    }
  } else if (segments.length === 3) {
    const action = resource.actions[segments[2]];
    if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (GrantService as any)[action](segments[1], session.user.id);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[grants] action error:', e);
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
      const item = await (GrantService as any)[resource.update](segments[1], body);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[grants] update error:', e);
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
      const ok = await (GrantService as any)[resource.delete](segments[1]);
      if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[grants] delete error:', e);
      return NextResponse.json({ error: 'failed_to_delete' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
