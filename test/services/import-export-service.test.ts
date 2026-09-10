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

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
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
    type: 'import_export_shipment',
    content: JSON.stringify({
      reference: 'SHP-001',
      direction: 'import',
      type: 'sea',
      description: 'Container shipment',
      status: 'draft',
      originCountry: 'CN',
      destinationCountry: 'US',
      originPort: 'Shanghai',
      destinationPort: 'Los Angeles',
      carrier: 'Maersk',
      vessel: 'MSC Oscar',
      trackingNumber: 'TRK123',
      estimatedArrival: '2028-01-01',
      actualArrival: null,
      containerNumber: 'CONT001',
      billOfLading: 'BL001',
      incoterms: 'FOB',
      value: 50000,
      currency: 'USD',
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['import_export_shipment', 'import', 'sea', 'draft']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeDeclarationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-d1',
    type: 'customs_declaration',
    content: JSON.stringify({
      shipmentId: null,
      reference: 'DEC-001',
      type: 'import',
      description: 'Customs declaration',
      status: 'draft',
      country: 'US',
      port: 'Los Angeles',
      declaredValue: 50000,
      currency: 'USD',
      hsCode: '8517.62.00',
      goodsDescription: 'Electronics',
      quantity: 100,
      origin: 'CN',
      destination: 'US',
      importer: 'Acme Inc',
      exporter: 'TechCorp',
      broker: 'GlobalBroker',
      filingDate: null,
      approvalDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['customs_declaration', 'import', 'draft']),
    ...overrides,
  });
}

function makeLicenseRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'trade_license',
    content: JSON.stringify({
      reference: 'LIC-001',
      type: 'import',
      description: 'Import license',
      status: 'pending',
      issuingAuthority: 'DOC',
      country: 'US',
      holder: 'Acme Inc',
      validFrom: '2028-01-01',
      validTo: '2028-12-31',
      goods: 'Electronics',
      restrictions: 'No re-export',
      notes: '',
    }),
    tags: JSON.stringify(['trade_license', 'import', 'pending']),
    ...overrides,
  });
}

function makeTariffRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-t1',
    type: 'tariff_record',
    content: JSON.stringify({
      hsCode: '8517.62.00',
      description: 'Telecommunications equipment',
      type: 'ad_valorem',
      rate: 5.5,
      unit: '%',
      country: 'US',
      status: 'active',
      effectiveDate: '2028-01-01',
      expiryDate: null,
      preferentialRate: 2.5,
      notes: '',
    }),
    tags: JSON.stringify(['tariff_record', 'ad_valorem', 'active', 'US']),
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
}

const { ImportExportService } = await import('@/lib/services/import-export-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Shipments
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportExportService — Shipments', () => {
  beforeEach(() => resetMock());

  it('creates a shipment with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await ImportExportService.createShipment('org-1', 'ws-1', {
      reference: 'SHP-100', direction: 'import', type: 'sea',
    }, 'user-1');
    assert.equal(s.reference, 'SHP-100');
    assert.equal(s.status, 'draft');
    assert.equal(s.value, 0);
    assert.equal(s.currency, 'USD');
  });

  it('creates a shipment with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const s = await ImportExportService.createShipment('org-1', 'ws-1', {
      reference: 'SHP-200', direction: 'export', type: 'air',
      description: 'Air freight', status: 'filed',
      originCountry: 'US', destinationCountry: 'DE',
      originPort: 'JFK', destinationPort: 'FRA',
      carrier: 'DHL', vessel: 'Flight 123', trackingNumber: 'TRK456',
      estimatedArrival: '2028-01-01', actualArrival: '2028-01-15',
      containerNumber: 'CONT002', billOfLading: 'BL002',
      incoterms: 'CIF', value: 100000, currency: 'EUR', notes: 'Urgent',
    }, 'user-1');
    assert.equal(s.reference, 'SHP-200');
    assert.equal(s.direction, 'export');
    assert.equal(s.type, 'air');
    assert.equal(s.status, 'filed');
    assert.equal(s.value, 100000);
    assert.equal(s.currency, 'EUR');
  });

  it('gets a shipment by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const s = await ImportExportService.getShipment('mem-1');
    assert.ok(s);
    assert.equal(s!.id, 'mem-1');
    assert.equal(s!.reference, 'SHP-001');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'customs_declaration' });
    const s = await ImportExportService.getShipment('mem-1');
    assert.equal(s, null);
  });

  it('returns null when shipment not found', async () => {
    memFindUniqueImpl = async () => null;
    const s = await ImportExportService.getShipment('nope');
    assert.equal(s, null);
  });

  it('lists shipments by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'import_export_shipment') return [makeRow()];
      return [];
    };
    const list = await ImportExportService.listShipments('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].reference, 'SHP-001');
  });

  it('updates a shipment', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.updateShipment('mem-1', { status: 'in_transit' });
    assert.ok(s);
    assert.equal(s!.status, 'in_transit');
  });

  it('deletes a shipment', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await ImportExportService.deleteShipment('mem-1');
    assert.equal(ok, true);
  });

  it('fileShipment sets status to filed', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.fileShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'filed');
  });

  it('transitShipment sets status to in_transit', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.transitShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'in_transit');
  });

  it('arriveShipment sets status to arrived and actualArrival', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.arriveShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'arrived');
    assert.ok(s!.actualArrival);
  });

  it('clearShipment sets status to cleared', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.clearShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'cleared');
  });

  it('deliverShipment sets status to delivered', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.deliverShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'delivered');
  });

  it('holdShipment sets status to held', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const s = await ImportExportService.holdShipment('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'held');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Declarations
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportExportService — Declarations', () => {
  beforeEach(() => resetMock());

  it('creates a declaration with defaults', async () => {
    memCreateImpl = async (args) => makeDeclarationRow({ content: args.data.content as string });
    const d = await ImportExportService.createDeclaration('org-1', 'ws-1', {
      reference: 'DEC-100', type: 'import',
    }, 'user-1');
    assert.equal(d.reference, 'DEC-100');
    assert.equal(d.status, 'draft');
    assert.equal(d.declaredValue, 0);
    assert.equal(d.currency, 'USD');
  });

  it('creates a declaration with full input', async () => {
    memCreateImpl = async (args) => makeDeclarationRow({ content: args.data.content as string });
    const d = await ImportExportService.createDeclaration('org-1', 'ws-1', {
      reference: 'DEC-200', type: 'export', shipmentId: 'mem-1',
      description: 'Export declaration', status: 'submitted',
      country: 'DE', port: 'Hamburg', declaredValue: 75000,
      currency: 'EUR', hsCode: '8517.62.00', goodsDescription: 'Phones',
      quantity: 500, origin: 'US', destination: 'DE',
      importer: 'Buyer', exporter: 'Seller', broker: 'Broker',
      filingDate: '2028-01-01', approvalDate: '2028-01-10', notes: 'Priority',
    }, 'user-1');
    assert.equal(d.reference, 'DEC-200');
    assert.equal(d.type, 'export');
    assert.equal(d.status, 'submitted');
    assert.equal(d.declaredValue, 75000);
    assert.equal(d.shipmentId, 'mem-1');
  });

  it('gets a declaration by id', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow();
    const d = await ImportExportService.getDeclaration('mem-d1');
    assert.ok(d);
    assert.equal(d!.id, 'mem-d1');
    assert.equal(d!.reference, 'DEC-001');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow({ type: 'import_export_shipment' });
    const d = await ImportExportService.getDeclaration('mem-d1');
    assert.equal(d, null);
  });

  it('lists declarations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'customs_declaration') return [makeDeclarationRow()];
      return [];
    };
    const list = await ImportExportService.listDeclarations('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].reference, 'DEC-001');
  });

  it('updates a declaration', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow();
    memUpdateImpl = async (args) => makeDeclarationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await ImportExportService.updateDeclaration('mem-d1', { status: 'under_review' });
    assert.ok(d);
    assert.equal(d!.status, 'under_review');
  });

  it('deletes a declaration', async () => {
    memDeleteImpl = async () => ({ id: 'mem-d1' });
    const ok = await ImportExportService.deleteDeclaration('mem-d1');
    assert.equal(ok, true);
  });

  it('submitDeclaration sets status to submitted and filingDate', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow();
    memUpdateImpl = async (args) => makeDeclarationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await ImportExportService.submitDeclaration('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'submitted');
    assert.ok(d!.filingDate);
  });

  it('approveDeclaration sets status to approved and approvalDate', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow();
    memUpdateImpl = async (args) => makeDeclarationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await ImportExportService.approveDeclaration('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'approved');
    assert.ok(d!.approvalDate);
  });

  it('rejectDeclaration sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow();
    memUpdateImpl = async (args) => makeDeclarationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await ImportExportService.rejectDeclaration('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'rejected');
  });

  it('amendDeclaration sets status to amended', async () => {
    memFindUniqueImpl = async () => makeDeclarationRow();
    memUpdateImpl = async (args) => makeDeclarationRow({ id: 'mem-d1', content: args.data.content as string });
    const d = await ImportExportService.amendDeclaration('mem-d1', 'user-1');
    assert.ok(d);
    assert.equal(d!.status, 'amended');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Licenses
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportExportService — Licenses', () => {
  beforeEach(() => resetMock());

  it('creates a license with defaults', async () => {
    memCreateImpl = async (args) => makeLicenseRow({ content: args.data.content as string });
    const l = await ImportExportService.createLicense('org-1', 'ws-1', {
      reference: 'LIC-100', type: 'import',
    }, 'user-1');
    assert.equal(l.reference, 'LIC-100');
    assert.equal(l.status, 'pending');
    assert.equal(l.goods, '');
  });

  it('creates a license with full input', async () => {
    memCreateImpl = async (args) => makeLicenseRow({ content: args.data.content as string });
    const l = await ImportExportService.createLicense('org-1', 'ws-1', {
      reference: 'LIC-200', type: 'export', description: 'Export license',
      status: 'active', issuingAuthority: 'BIS', country: 'US',
      holder: 'Acme', validFrom: '2028-01-01', validTo: '2028-12-31',
      goods: 'Electronics', restrictions: 'No re-export', notes: 'Important',
    }, 'user-1');
    assert.equal(l.reference, 'LIC-200');
    assert.equal(l.type, 'export');
    assert.equal(l.status, 'active');
    assert.equal(l.holder, 'Acme');
  });

  it('gets a license by id', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    const l = await ImportExportService.getLicense('mem-l1');
    assert.ok(l);
    assert.equal(l!.id, 'mem-l1');
    assert.equal(l!.reference, 'LIC-001');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeLicenseRow({ type: 'import_export_shipment' });
    const l = await ImportExportService.getLicense('mem-l1');
    assert.equal(l, null);
  });

  it('lists licenses by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'trade_license') return [makeLicenseRow()];
      return [];
    };
    const list = await ImportExportService.listLicenses('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].reference, 'LIC-001');
  });

  it('updates a license', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await ImportExportService.updateLicense('mem-l1', { holder: 'NewHolder' });
    assert.ok(l);
    assert.equal(l!.holder, 'NewHolder');
  });

  it('deletes a license', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await ImportExportService.deleteLicense('mem-l1');
    assert.equal(ok, true);
  });

  it('activateLicense sets status to active', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await ImportExportService.activateLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'active');
  });

  it('suspendLicense sets status to suspended', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await ImportExportService.suspendLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'suspended');
  });

  it('revokeLicense sets status to revoked', async () => {
    memFindUniqueImpl = async () => makeLicenseRow();
    memUpdateImpl = async (args) => makeLicenseRow({ id: 'mem-l1', content: args.data.content as string });
    const l = await ImportExportService.revokeLicense('mem-l1', 'user-1');
    assert.ok(l);
    assert.equal(l!.status, 'revoked');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Tariffs
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportExportService — Tariffs', () => {
  beforeEach(() => resetMock());

  it('creates a tariff with defaults', async () => {
    memCreateImpl = async (args) => makeTariffRow({ content: args.data.content as string });
    const t = await ImportExportService.createTariff('org-1', 'ws-1', {
      hsCode: '8517.62.00', description: 'Telecom equipment', type: 'ad_valorem', rate: 5.5,
    }, 'user-1');
    assert.equal(t.hsCode, '8517.62.00');
    assert.equal(t.status, 'active');
    assert.equal(t.preferentialRate, 0);
  });

  it('creates a tariff with full input', async () => {
    memCreateImpl = async (args) => makeTariffRow({ content: args.data.content as string });
    const t = await ImportExportService.createTariff('org-1', 'ws-1', {
      hsCode: '1234.56.78', description: 'Machinery', type: 'compound', rate: 10,
      unit: 'kg', country: 'DE', status: 'pending',
      effectiveDate: '2028-01-01', expiryDate: '2028-12-31',
      preferentialRate: 5, notes: 'Special rate',
    }, 'user-1');
    assert.equal(t.hsCode, '1234.56.78');
    assert.equal(t.type, 'compound');
    assert.equal(t.rate, 10);
    assert.equal(t.country, 'DE');
    assert.equal(t.status, 'pending');
  });

  it('gets a tariff by id', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    const t = await ImportExportService.getTariff('mem-t1');
    assert.ok(t);
    assert.equal(t!.id, 'mem-t1');
    assert.equal(t!.hsCode, '8517.62.00');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeTariffRow({ type: 'import_export_shipment' });
    const t = await ImportExportService.getTariff('mem-t1');
    assert.equal(t, null);
  });

  it('lists tariffs by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'tariff_record') return [makeTariffRow()];
      return [];
    };
    const list = await ImportExportService.listTariffs('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].hsCode, '8517.62.00');
  });

  it('updates a tariff', async () => {
    memFindUniqueImpl = async () => makeTariffRow();
    memUpdateImpl = async (args) => makeTariffRow({ id: 'mem-t1', content: args.data.content as string });
    const t = await ImportExportService.updateTariff('mem-t1', { rate: 7.5 });
    assert.ok(t);
    assert.equal(t!.rate, 7.5);
  });

  it('deletes a tariff', async () => {
    memDeleteImpl = async () => ({ id: 'mem-t1' });
    const ok = await ImportExportService.deleteTariff('mem-t1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('ImportExportService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getImportExportMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'import_export_shipment') return [
        makeRow({ content: JSON.stringify({ reference: 'S1', direction: 'import', type: 'sea', status: 'filed', value: 0, currency: 'USD' }) }),
        makeRow({ id: 's2', content: JSON.stringify({ reference: 'S2', direction: 'import', type: 'sea', status: 'in_transit', value: 0, currency: 'USD' }) }),
        makeRow({ id: 's3', content: JSON.stringify({ reference: 'S3', direction: 'import', type: 'sea', status: 'delivered', value: 0, currency: 'USD' }) }),
      ];
      if (t === 'customs_declaration') return [
        makeDeclarationRow({ content: JSON.stringify({ reference: 'D1', type: 'import', status: 'draft', declaredValue: 0, currency: 'USD' }) }),
        makeDeclarationRow({ id: 'd2', content: JSON.stringify({ reference: 'D2', type: 'import', status: 'submitted', declaredValue: 0, currency: 'USD' }) }),
      ];
      if (t === 'trade_license') return [
        makeLicenseRow({ content: JSON.stringify({ reference: 'L1', type: 'import', status: 'active' }) }),
      ];
      if (t === 'tariff_record') return [
        makeTariffRow({ content: JSON.stringify({ hsCode: '1234', description: 'Test', type: 'ad_valorem', rate: 5, status: 'active' }) }),
      ];
      return [];
    };
    const m = await ImportExportService.getImportExportMetrics('org-1');
    assert.equal(m.activeShipments, 2);
    assert.equal(m.pendingDeclarations, 2);
    assert.equal(m.activeLicenses, 1);
    assert.equal(m.activeTariffs, 1);
    assert.equal(m.shipmentClearanceRate, 33);
  });

  it('getImportExportStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'import_export_shipment') return [makeRow()];
      if (t === 'customs_declaration') return [makeDeclarationRow()];
      if (t === 'trade_license') return [makeLicenseRow()];
      if (t === 'tariff_record') return [makeTariffRow()];
      return [];
    };
    const s = await ImportExportService.getImportExportStats('org-1');
    assert.equal(s.shipmentCount, 1);
    assert.equal(s.declarationCount, 1);
    assert.equal(s.licenseCount, 1);
    assert.equal(s.tariffCount, 1);
    assert.equal(s.byShipmentDirection['import'], 1);
    assert.equal(s.byShipmentStatus['draft'], 1);
    assert.equal(s.byDeclarationStatus['draft'], 1);
    assert.equal(s.byLicenseStatus['pending'], 1);
    assert.equal(s.byTariffType['ad_valorem'], 1);
  });
});
