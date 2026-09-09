import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: FindManyArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: FindManyArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
  },
};

mock.module('@/lib/prisma', {
  namedExports: { prisma: prismaMock },
});

mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1',
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type: 'print_job',
    content: JSON.stringify({
      printerId: 'mem-p1',
      type: 'document',
      description: 'Quarterly report',
      status: 'submitted',
      requester: 'Alice',
      department: 'Finance',
      copies: 10,
      colorMode: 'bw',
      duplex: true,
      paperSize: 'A4',
      submittedDate: '2028-01-15',
      completedDate: null,
      cost: 5.50,
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['print_job', 'document', 'submitted']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makePrinterRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-p1',
    type: 'printer',
    content: JSON.stringify({
      name: 'HP LaserJet Pro',
      type: 'laser',
      description: 'Office laser printer',
      status: 'active',
      location: 'Building A',
      manufacturer: 'HP',
      model: 'LaserJet Pro M404',
      serialNumber: 'SN12345',
      ipAddress: '192.168.1.100',
      colorCapable: false,
      duplexCapable: true,
      notes: '',
    }),
    tags: JSON.stringify(['printer', 'laser', 'active']),
    ...overrides,
  });
}

function makeSupplyRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-s1',
    type: 'print_supply',
    content: JSON.stringify({
      name: 'Black Toner Cartridge',
      type: 'toner',
      description: 'HP 58A toner',
      status: 'in_stock',
      quantity: 50,
      unit: 'units',
      reorderLevel: 10,
      cost: 89.99,
      supplier: 'HP Direct',
      compatiblePrinters: ['mem-p1'],
      notes: '',
    }),
    tags: JSON.stringify(['print_supply', 'toner', 'in_stock']),
    ...overrides,
  });
}

function makeMaintenanceRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-m1',
    type: 'print_maintenance',
    content: JSON.stringify({
      printerId: 'mem-p1',
      type: 'preventive',
      description: 'Routine maintenance',
      status: 'scheduled',
      scheduledDate: '2028-02-01',
      startedDate: null,
      completedDate: null,
      technician: 'Bob Tech',
      cost: 150,
      notes: '',
    }),
    tags: JSON.stringify(['print_maintenance', 'preventive', 'scheduled']),
    ...overrides,
  });
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { PrintServicesService } = await import('@/lib/services/print-services-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Jobs
// ─────────────────────────────────────────────────────────────────────────────

describe('PrintServicesService — Jobs', () => {
  beforeEach(() => resetMock());

  it('creates a job with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const j = await PrintServicesService.createJob('org-1', 'ws-1', {
      type: 'photo',
    }, 'user-1');
    assert.equal(j.type, 'photo');
    assert.equal(j.status, 'submitted');
    assert.equal(j.copies, 1);
  });

  it('creates a job with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const j = await PrintServicesService.createJob('org-1', 'ws-1', {
      printerId: 'mem-p1', type: 'poster', description: 'Conference poster',
      status: 'processing', requester: 'Charlie', department: 'Marketing',
      copies: 5, colorMode: 'color', duplex: false, paperSize: 'A3',
      submittedDate: '2028-03-01', cost: 25.00, notes: 'Rush order',
    }, 'user-1');
    assert.equal(j.type, 'poster');
    assert.equal(j.requester, 'Charlie');
    assert.equal(j.copies, 5);
    assert.equal(j.colorMode, 'color');
  });

  it('gets a job by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const j = await PrintServicesService.getJob('mem-1');
    assert.ok(j);
    assert.equal(j!.id, 'mem-1');
    assert.equal(j!.requester, 'Alice');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'printer' });
    const j = await PrintServicesService.getJob('mem-1');
    assert.equal(j, null);
  });

  it('returns null when job not found', async () => {
    memFindUniqueImpl = async () => null;
    const j = await PrintServicesService.getJob('nope');
    assert.equal(j, null);
  });

  it('lists jobs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'print_job') return [makeRow()];
      return [];
    };
    const list = await PrintServicesService.listJobs('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].requester, 'Alice');
  });

  it('updates a job', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await PrintServicesService.updateJob('mem-1', { status: 'completed' });
    assert.ok(j);
    assert.equal(j!.status, 'completed');
  });

  it('deletes a job', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await PrintServicesService.deleteJob('mem-1');
    assert.equal(ok, true);
  });

  it('processJob sets status to processing', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await PrintServicesService.processJob('mem-1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'processing');
  });

  it('completeJob sets status to completed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await PrintServicesService.completeJob('mem-1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'completed');
  });

  it('cancelJob sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await PrintServicesService.cancelJob('mem-1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'cancelled');
  });

  it('reprintJob sets status to reprinted', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const j = await PrintServicesService.reprintJob('mem-1', 'user-1');
    assert.ok(j);
    assert.equal(j!.status, 'reprinted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Printers
// ─────────────────────────────────────────────────────────────────────────────

describe('PrintServicesService — Printers', () => {
  beforeEach(() => resetMock());

  it('creates a printer with defaults', async () => {
    memCreateImpl = async (args) => makePrinterRow({ content: args.data.content as string });
    const p = await PrintServicesService.createPrinter('org-1', 'ws-1', {
      name: 'Canon PIXMA', type: 'inkjet',
    }, 'user-1');
    assert.equal(p.name, 'Canon PIXMA');
    assert.equal(p.status, 'active');
    assert.equal(p.colorCapable, false);
  });

  it('creates a printer with full input', async () => {
    memCreateImpl = async (args) => makePrinterRow({ content: args.data.content as string });
    const p = await PrintServicesService.createPrinter('org-1', 'ws-1', {
      name: 'Epson SureColor', type: 'plotter', description: 'Large format plotter',
      status: 'maintained', location: 'Design Studio', manufacturer: 'Epson',
      model: 'SureColor P7000', serialNumber: 'EP67890', ipAddress: '192.168.1.200',
      colorCapable: true, duplexCapable: false, notes: 'For large prints only',
    }, 'user-1');
    assert.equal(p.name, 'Epson SureColor');
    assert.equal(p.type, 'plotter');
    assert.equal(p.colorCapable, true);
    assert.equal(p.manufacturer, 'Epson');
  });

  it('gets a printer by id', async () => {
    memFindUniqueImpl = async () => makePrinterRow();
    const p = await PrintServicesService.getPrinter('mem-p1');
    assert.ok(p);
    assert.equal(p!.name, 'HP LaserJet Pro');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makePrinterRow({ type: 'print_job' });
    const p = await PrintServicesService.getPrinter('mem-p1');
    assert.equal(p, null);
  });

  it('returns null when printer not found', async () => {
    memFindUniqueImpl = async () => null;
    const p = await PrintServicesService.getPrinter('nope');
    assert.equal(p, null);
  });

  it('lists printers by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'printer') return [makePrinterRow()];
      return [];
    };
    const list = await PrintServicesService.listPrinters('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a printer', async () => {
    memFindUniqueImpl = async () => makePrinterRow();
    memUpdateImpl = async (args) => makePrinterRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PrintServicesService.updatePrinter('mem-p1', { status: 'maintained' });
    assert.ok(p);
    assert.equal(p!.status, 'maintained');
  });

  it('deletes a printer', async () => {
    memDeleteImpl = async () => ({ id: 'mem-p1' });
    const ok = await PrintServicesService.deletePrinter('mem-p1');
    assert.equal(ok, true);
  });

  it('activatePrinter sets status to active', async () => {
    memFindUniqueImpl = async () => makePrinterRow();
    memUpdateImpl = async (args) => makePrinterRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PrintServicesService.activatePrinter('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'active');
  });

  it('maintainPrinter sets status to maintained', async () => {
    memFindUniqueImpl = async () => makePrinterRow();
    memUpdateImpl = async (args) => makePrinterRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PrintServicesService.maintainPrinter('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'maintained');
  });

  it('decommissionPrinter sets status to decommissioned', async () => {
    memFindUniqueImpl = async () => makePrinterRow();
    memUpdateImpl = async (args) => makePrinterRow({ id: 'mem-p1', content: args.data.content as string });
    const p = await PrintServicesService.decommissionPrinter('mem-p1', 'user-1');
    assert.ok(p);
    assert.equal(p!.status, 'decommissioned');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Supplies
// ─────────────────────────────────────────────────────────────────────────────

describe('PrintServicesService — Supplies', () => {
  beforeEach(() => resetMock());

  it('creates a supply with defaults', async () => {
    memCreateImpl = async (args) => makeSupplyRow({ content: args.data.content as string });
    const s = await PrintServicesService.createSupply('org-1', 'ws-1', {
      name: 'A4 Paper', type: 'paper',
    }, 'user-1');
    assert.equal(s.name, 'A4 Paper');
    assert.equal(s.status, 'in_stock');
    assert.equal(s.quantity, 0);
  });

  it('creates a supply with full input', async () => {
    memCreateImpl = async (args) => makeSupplyRow({ content: args.data.content as string });
    const s = await PrintServicesService.createSupply('org-1', 'ws-1', {
      name: 'Color Ink Set', type: 'ink', description: 'CMYK ink set',
      status: 'low', quantity: 5, unit: 'sets', reorderLevel: 10,
      cost: 120.00, supplier: 'InkWorld', compatiblePrinters: ['mem-p1', 'mem-p2'],
      notes: 'Reorder soon',
    }, 'user-1');
    assert.equal(s.name, 'Color Ink Set');
    assert.equal(s.type, 'ink');
    assert.equal(s.quantity, 5);
    assert.equal(s.compatiblePrinters.length, 2);
  });

  it('gets a supply by id', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    const s = await PrintServicesService.getSupply('mem-s1');
    assert.ok(s);
    assert.equal(s!.name, 'Black Toner Cartridge');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeSupplyRow({ type: 'print_job' });
    const s = await PrintServicesService.getSupply('mem-s1');
    assert.equal(s, null);
  });

  it('returns null when supply not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await PrintServicesService.getSupply('nope');
    assert.equal(s, null);
  });

  it('lists supplies by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'print_supply') return [makeSupplyRow()];
      return [];
    };
    const list = await PrintServicesService.listSupplies('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a supply', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await PrintServicesService.updateSupply('mem-s1', { quantity: 30 });
    assert.ok(s);
    assert.equal(s!.quantity, 30);
  });

  it('deletes a supply', async () => {
    memDeleteImpl = async () => ({ id: 'mem-s1' });
    const ok = await PrintServicesService.deleteSupply('mem-s1');
    assert.equal(ok, true);
  });

  it('reorderSupply sets status to reordered', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await PrintServicesService.reorderSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'reordered');
  });

  it('receiveSupply sets status to received', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await PrintServicesService.receiveSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'received');
  });

  it('depleteSupply sets status to depleted', async () => {
    memFindUniqueImpl = async () => makeSupplyRow();
    memUpdateImpl = async (args) => makeSupplyRow({ id: 'mem-s1', content: args.data.content as string });
    const s = await PrintServicesService.depleteSupply('mem-s1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'depleted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Maintenance
// ─────────────────────────────────────────────────────────────────────────────

describe('PrintServicesService — Maintenance', () => {
  beforeEach(() => resetMock());

  it('creates a maintenance record with defaults', async () => {
    memCreateImpl = async (args) => makeMaintenanceRow({ content: args.data.content as string });
    const m = await PrintServicesService.createMaintenance('org-1', 'ws-1', {
      type: 'cleaning',
    }, 'user-1');
    assert.equal(m.type, 'cleaning');
    assert.equal(m.status, 'scheduled');
    assert.equal(m.technician, '');
  });

  it('creates a maintenance record with full input', async () => {
    memCreateImpl = async (args) => makeMaintenanceRow({ content: args.data.content as string });
    const m = await PrintServicesService.createMaintenance('org-1', 'ws-1', {
      printerId: 'mem-p1', type: 'corrective', description: 'Fix paper jam',
      status: 'in_progress', scheduledDate: '2028-04-01', startedDate: '2028-04-01',
      technician: 'Dave Repair', cost: 200, notes: 'Recurring issue',
    }, 'user-1');
    assert.equal(m.type, 'corrective');
    assert.equal(m.technician, 'Dave Repair');
    assert.equal(m.cost, 200);
  });

  it('gets a maintenance record by id', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    const m = await PrintServicesService.getMaintenance('mem-m1');
    assert.ok(m);
    assert.equal(m!.technician, 'Bob Tech');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow({ type: 'print_job' });
    const m = await PrintServicesService.getMaintenance('mem-m1');
    assert.equal(m, null);
  });

  it('returns null when maintenance not found', async () => {
    memFindUniqueImpl = async () => null;
    const m = await PrintServicesService.getMaintenance('nope');
    assert.equal(m, null);
  });

  it('lists maintenance records by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'print_maintenance') return [makeMaintenanceRow()];
      return [];
    };
    const list = await PrintServicesService.listMaintenance('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a maintenance record', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PrintServicesService.updateMaintenance('mem-m1', { cost: 300 });
    assert.ok(m);
    assert.equal(m!.cost, 300);
  });

  it('deletes a maintenance record', async () => {
    memDeleteImpl = async () => ({ id: 'mem-m1' });
    const ok = await PrintServicesService.deleteMaintenance('mem-m1');
    assert.equal(ok, true);
  });

  it('startMaintenance sets status to in_progress', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PrintServicesService.startMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'in_progress');
  });

  it('completeMaintenance sets status to completed', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PrintServicesService.completeMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'completed');
  });

  it('cancelMaintenance sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeMaintenanceRow();
    memUpdateImpl = async (args) => makeMaintenanceRow({ id: 'mem-m1', content: args.data.content as string });
    const m = await PrintServicesService.cancelMaintenance('mem-m1', 'user-1');
    assert.ok(m);
    assert.equal(m!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('PrintServicesService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getPrintServicesMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'printer') return [
        makePrinterRow({ content: JSON.stringify({ name: 'P1', type: 'laser', status: 'active', description: '', location: '', manufacturer: '', model: '', serialNumber: '', ipAddress: '', colorCapable: false, duplexCapable: false, notes: '' }) }),
      ];
      if (t === 'print_job') return [
        makeRow({ content: JSON.stringify({ printerId: null, type: 'document', status: 'submitted', description: '', requester: '', department: '', copies: 1, colorMode: 'bw', duplex: false, paperSize: 'A4', submittedDate: null, completedDate: null, cost: 0, notes: '' }) }),
        makeRow({ id: 'j2', content: JSON.stringify({ printerId: null, type: 'document', status: 'completed', description: '', requester: '', department: '', copies: 1, colorMode: 'bw', duplex: false, paperSize: 'A4', submittedDate: null, completedDate: null, cost: 0, notes: '' }) }),
      ];
      if (t === 'print_supply') return [
        makeSupplyRow({ content: JSON.stringify({ name: 'S1', type: 'toner', status: 'low', description: '', quantity: 0, unit: '', reorderLevel: 0, cost: 0, supplier: '', compatiblePrinters: [], notes: '' }) }),
      ];
      if (t === 'print_maintenance') return [
        makeMaintenanceRow({ content: JSON.stringify({ printerId: null, type: 'preventive', status: 'scheduled', description: '', scheduledDate: null, startedDate: null, completedDate: null, technician: '', cost: 0, notes: '' }) }),
      ];
      return [];
    };
    const m = await PrintServicesService.getPrintServicesMetrics('org-1');
    assert.equal(m.activePrinters, 1);
    assert.equal(m.pendingJobs, 1);
    assert.equal(m.completedJobs, 1);
    assert.equal(m.lowSupplies, 1);
    assert.equal(m.pendingMaintenance, 1);
  });

  it('getPrintServicesStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'print_job') return [makeRow()];
      if (t === 'printer') return [makePrinterRow()];
      if (t === 'print_supply') return [makeSupplyRow()];
      if (t === 'print_maintenance') return [makeMaintenanceRow()];
      return [];
    };
    const s = await PrintServicesService.getPrintServicesStats('org-1');
    assert.equal(s.jobCount, 1);
    assert.equal(s.printerCount, 1);
    assert.equal(s.supplyCount, 1);
    assert.equal(s.maintenanceCount, 1);
    assert.equal(s.byJobType['document'], 1);
    assert.equal(s.byPrinterType['laser'], 1);
    assert.equal(s.bySupplyType['toner'], 1);
    assert.equal(s.byMaintenanceStatus['scheduled'], 1);
  });
});
