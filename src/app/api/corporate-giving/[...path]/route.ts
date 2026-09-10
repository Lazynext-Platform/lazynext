// AUTO-GENERATED: Business domain catch-all route. Do not edit manually.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { CorporateGivingService } from '@/lib/services/corporate-giving-service';
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
  'donations': {
    list: 'listDonations',
    create: 'createDonation',
    get: 'getDonation',
    update: 'updateDonation',
    delete: 'deleteDonation',
    actions: {
      'approve': 'approveDonation',
      'complete': 'completeDonation',
      'reject': 'rejectDonation',
    },
  },
  'grants': {
    list: 'listGrants',
    create: 'createGrant',
    get: 'getGrant',
    update: 'updateGrant',
    delete: 'deleteGrant',
    actions: {
      'approve': 'approveGrant',
      'complete': 'completeGrant',
      'disburse': 'disburseGrant',
      'reject': 'rejectGrant',
      'submit': 'submitGrant',
    },
  },
  'metrics': {
    list: 'getCorporateGivingMetrics',
    actions: {},
  },
  'programs': {
    list: 'listPrograms',
    create: 'createProgram',
    get: 'getProgram',
    update: 'updateProgram',
    delete: 'deleteProgram',
    actions: {
      'complete': 'completeProgram',
      'pause': 'pauseProgram',
      'start': 'startProgram',
    },
  },
  'sponsorships': {
    list: 'listSponsorships',
    create: 'createSponsorship',
    get: 'getSponsorship',
    update: 'updateSponsorship',
    delete: 'deleteSponsorship',
    actions: {
      'activate': 'activateSponsorship',
      'cancel': 'cancelSponsorship',
      'complete': 'completeSponsorship',
    },
  },
  'stats': {
    list: 'getCorporateGivingStats',
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
      const items = await (CorporateGivingService as any)[resource.list](ctx.ws.organizationId, opts);
      return NextResponse.json({ [segments[0]]: items });
    } catch (e) {
      console.error('[corporate-giving] list error:', e);
      return NextResponse.json({ error: 'failed_to_list' }, { status: 500 });
    }
  } else if (segments.length === 2) {
    if (!resource.get) return NextResponse.json({ error: 'method_not_allowed' }, { status: 405 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (CorporateGivingService as any)[resource.get](segments[1]);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[corporate-giving] get error:', e);
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
      const item = await (CorporateGivingService as any)[resource.create](ctx.ws.organizationId, ctx.ws.id, body, ctx.session.user.id);
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item }, { status: 201 });
    } catch (e) {
      console.error('[corporate-giving] create error:', e);
      return NextResponse.json({ error: 'failed_to_create' }, { status: 500 });
    }
  } else if (segments.length === 3) {
    const action = resource.actions[segments[2]];
    if (!action) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const session = await auth().catch(() => null);
    if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    try {
      const item = await (CorporateGivingService as any)[action](segments[1], session.user.id);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[corporate-giving] action error:', e);
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
      const item = await (CorporateGivingService as any)[resource.update](segments[1], body);
      if (!item) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      const key = segments[0].replace(/s$/, '');
      return NextResponse.json({ [key]: item });
    } catch (e) {
      console.error('[corporate-giving] update error:', e);
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
      const ok = await (CorporateGivingService as any)[resource.delete](segments[1]);
      if (!ok) return NextResponse.json({ error: 'not_found' }, { status: 404 });
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error('[corporate-giving] delete error:', e);
      return NextResponse.json({ error: 'failed_to_delete' }, { status: 500 });
    }
  }
  return NextResponse.json({ error: 'not_found' }, { status: 404 });
}
