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
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
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
    type: 'ip_asset',
    content: JSON.stringify({ title: 'Test', type: 'patent', status: 'filed', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: null, jurisdiction: 'US', inventor: '', owner: '', description: '', value: null, classification: '', tags: [], notes: '' }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['ip_asset', 'patent', 'filed']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
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

const { IPService } = await import('@/lib/services/ip-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('IPService', () => {
  beforeEach(() => { resetMock(); });

  // ── Assets ──

  describe('createAsset', () => {
    it('creates an asset with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_asset', content: args.data.content as string });
      const asset = await IPService.createAsset('org-1', 'ws-1', { title: 'My Patent', type: 'patent', status: 'filed' }, 'user-1');
      assert.equal(asset.title, 'My Patent');
      assert.equal(asset.type, 'patent');
      assert.equal(asset.status, 'filed');
      assert.equal(asset.organizationId, 'org-1');
      assert.equal(asset.registrationNumber, null);
      assert.equal(asset.value, null);
      assert.equal(asset.tags.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_asset', content: args.data.content as string });
      const asset = await IPService.createAsset('org-1', 'ws-1', {
        title: 'My Patent', type: 'patent', status: 'granted', registrationNumber: 'US123',
        filingDate: '2023-01-01', grantDate: '2024-01-01', expiryDate: '2044-01-01',
        jurisdiction: 'US', inventor: 'Alice', owner: 'Acme', description: 'desc',
        value: 50000, classification: 'H04W', tags: ['tech'], notes: 'notes',
      }, 'user-1');
      assert.equal(asset.type, 'patent');
      assert.equal(asset.status, 'granted');
      assert.equal(asset.registrationNumber, 'US123');
      assert.equal(asset.value, 50000);
      assert.equal(asset.tags.length, 1);
    });
  });

  describe('getAsset', () => {
    it('returns an asset when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_asset' });
      const asset = await IPService.getAsset('mem-1');
      assert.ok(asset);
      assert.equal(asset!.id, 'mem-1');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const asset = await IPService.getAsset('nope');
      assert.equal(asset, null);
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_license' });
      const asset = await IPService.getAsset('mem-1');
      assert.equal(asset, null);
    });
  });

  describe('listAssets', () => {
    it('lists assets', async () => {
      memFindManyImpl = async () => [makeRow({ id: 'a1' }), makeRow({ id: 'a2' })];
      const list = await IPService.listAssets('org-1');
      assert.equal(list.length, 2);
    });

    it('filters by type, status, jurisdiction, owner', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', content: JSON.stringify({ title: 'A', type: 'patent', status: 'granted', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: null, jurisdiction: 'US', inventor: '', owner: 'Acme', description: '', value: null, classification: '', tags: [], notes: '' }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ title: 'B', type: 'trademark', status: 'filed', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: null, jurisdiction: 'EU', inventor: '', owner: 'Beta', description: '', value: null, classification: '', tags: [], notes: '' }) }),
      ];
      const list = await IPService.listAssets('org-1', { type: 'patent', status: 'granted', jurisdiction: 'US', owner: 'Acme' });
      assert.equal(list.length, 1);
      assert.equal(list[0].type, 'patent');
    });
  });

  describe('updateAsset', () => {
    it('updates asset fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_asset' });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_asset', content: args.data.content as string });
      const asset = await IPService.updateAsset('mem-1', { title: 'Updated', status: 'granted' });
      assert.ok(asset);
      assert.equal(asset!.title, 'Updated');
      assert.equal(asset!.status, 'granted');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const asset = await IPService.updateAsset('nope', { title: 'X' });
      assert.equal(asset, null);
    });
  });

  describe('deleteAsset', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await IPService.deleteAsset('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await IPService.deleteAsset('mem-1');
      assert.equal(ok, false);
    });
  });

  describe('getExpiringIP', () => {
    it('returns assets expiring within the window', async () => {
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const far = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', content: JSON.stringify({ title: 'A', type: 'patent', status: 'granted', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: soon, jurisdiction: 'US', inventor: '', owner: '', description: '', value: null, classification: '', tags: [], notes: '' }) }),
        makeRow({ id: 'a2', content: JSON.stringify({ title: 'B', type: 'patent', status: 'granted', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: far, jurisdiction: 'US', inventor: '', owner: '', description: '', value: null, classification: '', tags: [], notes: '' }) }),
      ];
      const list = await IPService.getExpiringIP('org-1', 180);
      assert.equal(list.length, 1);
      assert.equal(list[0].id, 'a1');
    });

    it('excludes expired and abandoned assets', async () => {
      const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      memFindManyImpl = async () => [
        makeRow({ id: 'a1', content: JSON.stringify({ title: 'A', type: 'patent', status: 'expired', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: soon, jurisdiction: 'US', inventor: '', owner: '', description: '', value: null, classification: '', tags: [], notes: '' }) }),
      ];
      const list = await IPService.getExpiringIP('org-1', 180);
      assert.equal(list.length, 0);
    });
  });

  // ── Licenses ──

  describe('createLicense', () => {
    it('creates a license with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_license', content: args.data.content as string });
      const lic = await IPService.createLicense('org-1', 'ws-1', { assetId: 'a1', licensee: 'Corp', type: 'exclusive', startDate: '2024-01-01' }, 'user-1');
      assert.equal(lic.licensee, 'Corp');
      assert.equal(lic.type, 'exclusive');
      assert.equal(lic.status, 'active');
      assert.equal(lic.assetId, 'a1');
      assert.equal(lic.royaltyRate, null);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_license', content: args.data.content as string });
      const lic = await IPService.createLicense('org-1', 'ws-1', {
        assetId: 'a1', licensee: 'Corp', type: 'non_exclusive', startDate: '2024-01-01',
        endDate: '2025-01-01', territory: 'US', fieldOfUse: 'software',
        royaltyRate: 5, minimumRoyalty: 1000, upfrontFee: 50000,
        status: 'pending', terms: 'terms', restrictions: 'none', signedDate: '2024-01-15',
      }, 'user-1');
      assert.equal(lic.territory, 'US');
      assert.equal(lic.royaltyRate, 5);
      assert.equal(lic.status, 'pending');
    });
  });

  describe('getLicense', () => {
    it('returns a license when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_license', content: JSON.stringify({ assetId: 'a1', licensee: 'L', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: null, minimumRoyalty: null, upfrontFee: null, status: 'active', terms: '', restrictions: '', signedDate: null }) });
      const lic = await IPService.getLicense('mem-1');
      assert.ok(lic);
      assert.equal(lic!.licensee, 'L');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_asset' });
      const lic = await IPService.getLicense('mem-1');
      assert.equal(lic, null);
    });
  });

  describe('listLicenses', () => {
    it('lists licenses and filters by assetId, type, status, licensee', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'l1', type: 'ip_license', content: JSON.stringify({ assetId: 'a1', licensee: 'X', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: null, minimumRoyalty: null, upfrontFee: null, status: 'active', terms: '', restrictions: '', signedDate: null }) }),
        makeRow({ id: 'l2', type: 'ip_license', content: JSON.stringify({ assetId: 'a2', licensee: 'Y', type: 'non_exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: null, minimumRoyalty: null, upfrontFee: null, status: 'terminated', terms: '', restrictions: '', signedDate: null }) }),
      ];
      const list = await IPService.listLicenses('org-1', { assetId: 'a1', type: 'exclusive', status: 'active', licensee: 'X' });
      assert.equal(list.length, 1);
      assert.equal(list[0].licensee, 'X');
    });
  });

  describe('updateLicense', () => {
    it('updates license fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_license', content: JSON.stringify({ assetId: 'a1', licensee: 'Old', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: null, minimumRoyalty: null, upfrontFee: null, status: 'active', terms: '', restrictions: '', signedDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_license', content: args.data.content as string });
      const lic = await IPService.updateLicense('mem-1', { licensee: 'New', status: 'suspended' });
      assert.ok(lic);
      assert.equal(lic!.licensee, 'New');
      assert.equal(lic!.status, 'suspended');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const lic = await IPService.updateLicense('nope', { licensee: 'X' });
      assert.equal(lic, null);
    });
  });

  describe('terminateLicense', () => {
    it('terminates a license', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_license', content: JSON.stringify({ assetId: 'a1', licensee: 'L', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: null, minimumRoyalty: null, upfrontFee: null, status: 'active', terms: '', restrictions: '', signedDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_license', content: args.data.content as string });
      const lic = await IPService.terminateLicense('mem-1', 'breach', 'admin');
      assert.ok(lic);
      assert.equal(lic!.status, 'terminated');
      assert.ok(lic!.restrictions.includes('breach'));
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const lic = await IPService.terminateLicense('nope', 'r', 'u');
      assert.equal(lic, null);
    });
  });

  describe('renewLicense', () => {
    it('renews a license with new end date', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_license', content: JSON.stringify({ assetId: 'a1', licensee: 'L', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: '2024-12-31', royaltyRate: null, minimumRoyalty: null, upfrontFee: null, status: 'expired', terms: '', restrictions: '', signedDate: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_license', content: args.data.content as string });
      const lic = await IPService.renewLicense('mem-1', '2026-12-31', 'admin');
      assert.ok(lic);
      assert.equal(lic!.status, 'active');
      assert.ok(lic!.endDate);
    });
  });

  // ── Disputes ──

  describe('createDispute', () => {
    it('creates a dispute with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_dispute', content: args.data.content as string });
      const d = await IPService.createDispute('org-1', 'ws-1', { title: 'Infringement', type: 'infringement' }, 'user-1');
      assert.equal(d.title, 'Infringement');
      assert.equal(d.type, 'infringement');
      assert.equal(d.status, 'filed');
      assert.equal(d.assetId, null);
      assert.equal(d.claims.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_dispute', content: args.data.content as string });
      const d = await IPService.createDispute('org-1', 'ws-1', {
        assetId: 'a1', title: 'Dispute', type: 'ownership', status: 'under_review',
        opposingParty: 'Rival', filedDate: '2024-05-01', jurisdiction: 'US',
        description: 'desc', claims: ['c1'], evidence: ['e1'], resolution: '', legalCosts: 5000,
      }, 'user-1');
      assert.equal(d.opposingParty, 'Rival');
      assert.equal(d.legalCosts, 5000);
      assert.equal(d.claims.length, 1);
    });
  });

  describe('getDispute', () => {
    it('returns a dispute when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_dispute', content: JSON.stringify({ assetId: null, title: 'D', type: 'infringement', status: 'filed', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) });
      const d = await IPService.getDispute('mem-1');
      assert.ok(d);
      assert.equal(d!.title, 'D');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_asset' });
      const d = await IPService.getDispute('mem-1');
      assert.equal(d, null);
    });
  });

  describe('listDisputes', () => {
    it('lists disputes and filters by assetId, type, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 'd1', type: 'ip_dispute', content: JSON.stringify({ assetId: 'a1', title: 'A', type: 'infringement', status: 'filed', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) }),
        makeRow({ id: 'd2', type: 'ip_dispute', content: JSON.stringify({ assetId: 'a2', title: 'B', type: 'opposition', status: 'resolved', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) }),
      ];
      const list = await IPService.listDisputes('org-1', { assetId: 'a1', type: 'infringement', status: 'filed' });
      assert.equal(list.length, 1);
      assert.equal(list[0].title, 'A');
    });
  });

  describe('updateDispute', () => {
    it('updates dispute fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_dispute', content: JSON.stringify({ assetId: null, title: 'Old', type: 'infringement', status: 'filed', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_dispute', content: args.data.content as string });
      const d = await IPService.updateDispute('mem-1', { title: 'New', status: 'under_review' });
      assert.ok(d);
      assert.equal(d!.title, 'New');
      assert.equal(d!.status, 'under_review');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await IPService.updateDispute('nope', { title: 'X' });
      assert.equal(d, null);
    });
  });

  describe('resolveDispute', () => {
    it('resolves a dispute', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_dispute', content: JSON.stringify({ assetId: null, title: 'D', type: 'infringement', status: 'under_review', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_dispute', content: args.data.content as string });
      const d = await IPService.resolveDispute('mem-1', 'settled', 'admin');
      assert.ok(d);
      assert.equal(d!.status, 'resolved');
      assert.equal(d!.resolution, 'settled');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const d = await IPService.resolveDispute('nope', 'r', 'u');
      assert.equal(d, null);
    });
  });

  describe('appealDispute', () => {
    it('appeals a dispute', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_dispute', content: JSON.stringify({ assetId: null, title: 'D', type: 'infringement', status: 'dismissed', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_dispute', content: args.data.content as string });
      const d = await IPService.appealDispute('mem-1', 'new evidence', 'admin');
      assert.ok(d);
      assert.equal(d!.status, 'appealed');
      assert.ok(d!.claims.length > 0);
    });
  });

  // ── Trademarks ──

  describe('createTrademark', () => {
    it('creates a trademark with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_trademark', content: args.data.content as string });
      const tm = await IPService.createTrademark('org-1', 'ws-1', { name: 'Logo', classes: ['9'], status: 'filed' }, 'user-1');
      assert.equal(tm.name, 'Logo');
      assert.equal(tm.status, 'filed');
      assert.equal(tm.classes.length, 1);
      assert.equal(tm.jurisdiction, '');
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_trademark', content: args.data.content as string });
      const tm = await IPService.createTrademark('org-1', 'ws-1', {
        name: 'Brand', classes: ['9', '42'], status: 'registered',
        registrationNumber: 'US123', filingDate: '2023-01-01', registrationDate: '2024-01-01',
        expiryDate: '2034-01-01', jurisdiction: 'US', owner: 'Acme', attorney: 'Law',
      }, 'user-1');
      assert.equal(tm.status, 'registered');
      assert.equal(tm.classes.length, 2);
      assert.equal(tm.owner, 'Acme');
    });
  });

  describe('getTrademark', () => {
    it('returns a trademark when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_trademark', content: JSON.stringify({ name: 'TM', classes: ['9'], registrationNumber: null, filingDate: null, registrationDate: null, expiryDate: null, jurisdiction: '', status: 'filed', logoDescription: '', colorsClaimed: '', priorityClaim: '', owner: '', attorney: '' }) });
      const tm = await IPService.getTrademark('mem-1');
      assert.ok(tm);
      assert.equal(tm!.name, 'TM');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_asset' });
      const tm = await IPService.getTrademark('mem-1');
      assert.equal(tm, null);
    });
  });

  describe('listTrademarks', () => {
    it('lists trademarks and filters by status, jurisdiction', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 't1', type: 'ip_trademark', content: JSON.stringify({ name: 'A', classes: [], registrationNumber: null, filingDate: null, registrationDate: null, expiryDate: null, jurisdiction: 'US', status: 'registered', logoDescription: '', colorsClaimed: '', priorityClaim: '', owner: '', attorney: '' }) }),
        makeRow({ id: 't2', type: 'ip_trademark', content: JSON.stringify({ name: 'B', classes: [], registrationNumber: null, filingDate: null, registrationDate: null, expiryDate: null, jurisdiction: 'EU', status: 'filed', logoDescription: '', colorsClaimed: '', priorityClaim: '', owner: '', attorney: '' }) }),
      ];
      const list = await IPService.listTrademarks('org-1', { status: 'registered', jurisdiction: 'US' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateTrademark', () => {
    it('updates trademark fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_trademark', content: JSON.stringify({ name: 'Old', classes: ['9'], registrationNumber: null, filingDate: null, registrationDate: null, expiryDate: null, jurisdiction: '', status: 'filed', logoDescription: '', colorsClaimed: '', priorityClaim: '', owner: '', attorney: '' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_trademark', content: args.data.content as string });
      const tm = await IPService.updateTrademark('mem-1', { name: 'New', status: 'registered' });
      assert.ok(tm);
      assert.equal(tm!.name, 'New');
      assert.equal(tm!.status, 'registered');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const tm = await IPService.updateTrademark('nope', { name: 'X' });
      assert.equal(tm, null);
    });
  });

  describe('deleteTrademark', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await IPService.deleteTrademark('mem-1');
      assert.equal(ok, true);
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await IPService.deleteTrademark('mem-1');
      assert.equal(ok, false);
    });
  });

  // ── Trade Secrets ──

  describe('createTradeSecret', () => {
    it('creates a trade secret with defaults', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_trade_secret', content: args.data.content as string });
      const ts = await IPService.createTradeSecret('org-1', 'ws-1', { name: 'Formula', category: 'technical', accessLevel: 'confidential' }, 'user-1');
      assert.equal(ts.name, 'Formula');
      assert.equal(ts.category, 'technical');
      assert.equal(ts.accessLevel, 'confidential');
      assert.equal(ts.status, 'active');
      assert.equal(ts.protectionMeasures.length, 0);
    });

    it('passes through provided fields', async () => {
      memCreateImpl = async (args) => makeRow({ type: 'ip_trade_secret', content: args.data.content as string });
      const ts = await IPService.createTradeSecret('org-1', 'ws-1', {
        name: 'Formula', category: 'commercial', accessLevel: 'top_secret',
        description: 'desc', owner: 'Acme', custodian: 'Bob',
        protectionMeasures: ['NDA', 'encryption'], disclosureHistory: 'none',
        value: 100000, createdDate: '2024-01-01', status: 'active',
      }, 'user-1');
      assert.equal(ts.category, 'commercial');
      assert.equal(ts.accessLevel, 'top_secret');
      assert.equal(ts.protectionMeasures.length, 2);
    });
  });

  describe('getTradeSecret', () => {
    it('returns a trade secret when found', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_trade_secret', content: JSON.stringify({ name: 'TS', description: '', category: 'technical', accessLevel: 'confidential', owner: '', custodian: '', protectionMeasures: [], disclosureHistory: '', value: null, createdDate: null, lastReviewed: null, status: 'active' }) });
      const ts = await IPService.getTradeSecret('mem-1');
      assert.ok(ts);
      assert.equal(ts!.name, 'TS');
    });

    it('returns null when type is wrong', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_asset' });
      const ts = await IPService.getTradeSecret('mem-1');
      assert.equal(ts, null);
    });
  });

  describe('listTradeSecrets', () => {
    it('lists trade secrets and filters by category, accessLevel, status', async () => {
      memFindManyImpl = async () => [
        makeRow({ id: 's1', type: 'ip_trade_secret', content: JSON.stringify({ name: 'A', description: '', category: 'technical', accessLevel: 'confidential', owner: '', custodian: '', protectionMeasures: [], disclosureHistory: '', value: null, createdDate: null, lastReviewed: null, status: 'active' }) }),
        makeRow({ id: 's2', type: 'ip_trade_secret', content: JSON.stringify({ name: 'B', description: '', category: 'commercial', accessLevel: 'top_secret', owner: '', custodian: '', protectionMeasures: [], disclosureHistory: '', value: null, createdDate: null, lastReviewed: null, status: 'deprecated' }) }),
      ];
      const list = await IPService.listTradeSecrets('org-1', { category: 'technical', accessLevel: 'confidential', status: 'active' });
      assert.equal(list.length, 1);
      assert.equal(list[0].name, 'A');
    });
  });

  describe('updateTradeSecret', () => {
    it('updates trade secret fields', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_trade_secret', content: JSON.stringify({ name: 'Old', description: '', category: 'technical', accessLevel: 'confidential', owner: '', custodian: '', protectionMeasures: [], disclosureHistory: '', value: null, createdDate: null, lastReviewed: null, status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_trade_secret', content: args.data.content as string });
      const ts = await IPService.updateTradeSecret('mem-1', { name: 'New', status: 'deprecated' });
      assert.ok(ts);
      assert.equal(ts!.name, 'New');
      assert.equal(ts!.status, 'deprecated');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const ts = await IPService.updateTradeSecret('nope', { name: 'X' });
      assert.equal(ts, null);
    });
  });

  describe('deleteTradeSecret', () => {
    it('returns true on success', async () => {
      memDeleteImpl = async () => ({});
      const ok = await IPService.deleteTradeSecret('mem-1');
      assert.equal(ok, true);
    });
  });

  describe('reviewTradeSecret', () => {
    it('reviews a trade secret updating lastReviewed', async () => {
      memFindUniqueImpl = async () => makeRow({ type: 'ip_trade_secret', content: JSON.stringify({ name: 'TS', description: '', category: 'technical', accessLevel: 'confidential', owner: '', custodian: '', protectionMeasures: [], disclosureHistory: '', value: null, createdDate: null, lastReviewed: null, status: 'active' }) });
      memUpdateImpl = async (args) => makeRow({ type: 'ip_trade_secret', content: args.data.content as string });
      const ts = await IPService.reviewTradeSecret('mem-1', 'admin');
      assert.ok(ts);
      assert.ok(ts!.lastReviewed);
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const ts = await IPService.reviewTradeSecret('nope', 'u');
      assert.equal(ts, null);
    });
  });

  // ── Metrics & Stats ──

  describe('getIPMetrics', () => {
    it('returns aggregated metrics', async () => {
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'ip_asset') return [
          makeRow({ id: 'a1', content: JSON.stringify({ title: 'A', type: 'patent', status: 'granted', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: null, jurisdiction: '', inventor: '', owner: '', description: '', value: 50000, classification: '', tags: [], notes: '' }) }),
        ];
        if (t === 'ip_license') return [
          makeRow({ id: 'l1', content: JSON.stringify({ assetId: 'a1', licensee: 'L', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: 5, minimumRoyalty: 1000, upfrontFee: null, status: 'active', terms: '', restrictions: '', signedDate: null }) }),
        ];
        if (t === 'ip_dispute') return [
          makeRow({ id: 'd1', content: JSON.stringify({ assetId: null, title: 'D', type: 'infringement', status: 'filed', opposingParty: '', filedDate: null, jurisdiction: '', description: '', claims: [], evidence: [], resolution: '', legalCosts: null }) }),
        ];
        return [];
      };
      const m = await IPService.getIPMetrics('org-1');
      assert.equal(m.portfolioValue, 50000);
      assert.equal(m.activeLicenses, 1);
      assert.equal(m.pendingDisputes, 1);
      assert.equal(m.byType.patent, 1);
    });
  });

  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      memFindManyImpl = async (args) => {
        const t = (args.where as Record<string, unknown>).type as string;
        if (t === 'ip_asset') return [
          makeRow({ id: 'a1', content: JSON.stringify({ title: 'A', type: 'patent', status: 'granted', registrationNumber: null, filingDate: null, grantDate: null, expiryDate: null, jurisdiction: '', inventor: '', owner: '', description: '', value: 50000, classification: '', tags: [], notes: '' }) }),
        ];
        if (t === 'ip_license') return [
          makeRow({ id: 'l1', content: JSON.stringify({ assetId: 'a1', licensee: 'L', type: 'exclusive', territory: '', fieldOfUse: '', startDate: '2024-01-01', endDate: null, royaltyRate: 5, minimumRoyalty: 1000, upfrontFee: null, status: 'active', terms: '', restrictions: '', signedDate: null }) }),
        ];
        return [];
      };
      const s = await IPService.getStats('org-1');
      assert.equal(s.assetCount, 1);
      assert.equal(s.licenseCount, 1);
      assert.equal(s.activeLicenseCount, 1);
      assert.equal(s.portfolioValue, 50000);
      assert.equal(s.byAssetType.patent, 1);
      assert.equal(s.byAssetStatus.granted, 1);
    });
  });
});
