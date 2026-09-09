import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memFindFirstImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    findFirst: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findFirst', args }); return memFindFirstImpl(args); },
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

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memFindFirstImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { FacilitiesService } = await import('@/lib/services/facilities-service');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers for building Memory rows
// ─────────────────────────────────────────────────────────────────────────────

function makeRow(id: string, type: string, content: Record<string, unknown>): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-02'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('FacilitiesService', () => {
  beforeEach(() => { resetMock(); });

  // ── Facilities ──

  describe('createFacility', () => {
    it('creates a facility with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'facility');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'HQ');
        assert.equal(content.type, 'other');
        assert.equal(content.isActive, true);
        return makeRow('f1', 'facility', content);
      };
      const result = await FacilitiesService.createFacility('org-1', 'ws-1', { name: 'HQ' }, 'user-1');
      assert.equal(result.name, 'HQ');
      assert.equal(result.type, 'other');
    });

    it('creates a facility with explicit fields', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.type, 'office');
        assert.equal(content.floors, 5);
        assert.equal(content.totalArea, 10000);
        return makeRow('f1', 'facility', content);
      };
      const result = await FacilitiesService.createFacility('org-1', 'ws-1', {
        name: 'HQ', type: 'office', floors: 5, totalArea: 10000, areaUnit: 'sqft',
      }, 'user-1');
      assert.equal(result.type, 'office');
      assert.equal(result.floors, 5);
    });
  });

  describe('getFacility', () => {
    it('returns a facility by id', async () => {
      memFindUniqueImpl = async () => makeRow('f1', 'facility', { name: 'HQ', address: '', type: 'office', floors: 1, totalArea: 0, areaUnit: 'sqft', description: '', isActive: true });
      const result = await FacilitiesService.getFacility('f1');
      assert.ok(result);
      assert.equal(result!.name, 'HQ');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await FacilitiesService.getFacility('nope');
      assert.equal(result, null);
    });
  });

  describe('listFacilities', () => {
    it('lists facilities for an organization', async () => {
      memFindManyImpl = async () => [
        makeRow('f1', 'facility', { name: 'A', address: '', type: 'office', floors: 1, totalArea: 0, areaUnit: 'sqft', description: '', isActive: true }),
        makeRow('f2', 'facility', { name: 'B', address: '', type: 'warehouse', floors: 1, totalArea: 0, areaUnit: 'sqft', description: '', isActive: false }),
      ];
      const result = await FacilitiesService.listFacilities('org-1');
      assert.equal(result.length, 2);
    });

    it('applies type and isActive filters', async () => {
      memFindManyImpl = async () => [
        makeRow('f1', 'facility', { name: 'A', address: '', type: 'office', floors: 1, totalArea: 0, areaUnit: 'sqft', description: '', isActive: true }),
        makeRow('f2', 'facility', { name: 'B', address: '', type: 'warehouse', floors: 1, totalArea: 0, areaUnit: 'sqft', description: '', isActive: false }),
      ];
      const result = await FacilitiesService.listFacilities('org-1', { type: 'office', isActive: true });
      assert.equal(result.length, 1);
      assert.equal(result[0].type, 'office');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      memFindManyImpl = async () => { throw new Error('DB down'); };
      const result = await FacilitiesService.listFacilities('org-1');
      assert.deepEqual(result, []);
    });
  });

  describe('updateFacility', () => {
    it('updates only provided fields', async () => {
      memFindUniqueImpl = async () => makeRow('f1', 'facility', { name: 'Old', address: '', type: 'office', floors: 1, totalArea: 0, areaUnit: 'sqft', description: '', isActive: true });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.name, 'New');
        assert.equal(content.type, 'office');
        return makeRow('f1', 'facility', content);
      };
      const result = await FacilitiesService.updateFacility('f1', { name: 'New' });
      assert.ok(result);
      assert.equal(result!.name, 'New');
    });

    it('returns null when not found', async () => {
      memFindUniqueImpl = async () => null;
      const result = await FacilitiesService.updateFacility('nope', { name: 'New' });
      assert.equal(result, null);
    });
  });

  describe('deleteFacility', () => {
    it('deletes a facility', async () => {
      memDeleteImpl = async () => ({ id: 'f1' });
      const result = await FacilitiesService.deleteFacility('f1');
      assert.equal(result, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memDeleteImpl = async () => { throw new Error('fail'); };
      const result = await FacilitiesService.deleteFacility('f1');
      assert.equal(result, false);
    });
  });

  // ── Leases ──

  describe('createLease', () => {
    it('creates a lease with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'lease');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.facilityId, 'f1');
        assert.equal(content.status, 'pending');
        assert.equal(content.monthlyRent, 0);
        return makeRow('l1', 'lease', content);
      };
      const result = await FacilitiesService.createLease('org-1', 'ws-1', {
        facilityId: 'f1', landlord: 'Landlord A', startDate: '2025-01-01', endDate: '2026-01-01',
      }, 'user-1');
      assert.equal(result.facilityId, 'f1');
      assert.equal(result.status, 'pending');
    });
  });

  describe('getLease', () => {
    it('returns a lease by id', async () => {
      memFindUniqueImpl = async () => makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 1000, deposit: 500, terms: '', status: 'active', terminatedAt: null, terminationReason: null });
      const result = await FacilitiesService.getLease('l1');
      assert.ok(result);
      assert.equal(result!.landlord, 'A');
    });
  });

  describe('listLeases', () => {
    it('applies facilityId and status filters', async () => {
      memFindManyImpl = async () => [
        makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 1000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null }),
        makeRow('l2', 'lease', { facilityId: 'f2', landlord: 'B', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 2000, deposit: 0, terms: '', status: 'expired', terminatedAt: null, terminationReason: null }),
      ];
      const result = await FacilitiesService.listLeases('org-1', { facilityId: 'f1', status: 'active' });
      assert.equal(result.length, 1);
    });
  });

  describe('updateLease', () => {
    it('updates lease fields', async () => {
      memFindUniqueImpl = async () => makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 1000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.monthlyRent, 1500);
        return makeRow('l1', 'lease', content);
      };
      const result = await FacilitiesService.updateLease('l1', { monthlyRent: 1500 });
      assert.ok(result);
      assert.equal(result!.monthlyRent, 1500);
    });
  });

  describe('terminateLease', () => {
    it('terminates a lease with reason', async () => {
      memFindUniqueImpl = async () => makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 1000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'terminated');
        assert.equal(content.terminationReason, 'End of term');
        assert.ok(content.terminatedAt);
        return makeRow('l1', 'lease', content);
      };
      const result = await FacilitiesService.terminateLease('l1', 'End of term');
      assert.ok(result);
      assert.equal(result!.status, 'terminated');
      assert.equal(result!.terminationReason, 'End of term');
    });
  });

  describe('getExpiringLeases', () => {
    it('returns active leases expiring within the horizon', async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const far = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      memFindManyImpl = async () => [
        makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: soon.toISOString(), monthlyRent: 1000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null }),
        makeRow('l2', 'lease', { facilityId: 'f2', landlord: 'B', startDate: '2025-01-01', endDate: far.toISOString(), monthlyRent: 2000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null }),
      ];
      const result = await FacilitiesService.getExpiringLeases('org-1', 90);
      assert.equal(result.length, 1);
    });
  });

  // ── Maintenance ──

  describe('createMaintenanceRequest', () => {
    it('creates a maintenance request with status pending', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'maintenance_request');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'pending');
        assert.equal(content.priority, 'medium');
        return makeRow('m1', 'maintenance_request', content);
      };
      const result = await FacilitiesService.createMaintenanceRequest('org-1', 'ws-1', {
        facilityId: 'f1', title: 'Broken AC', requestedBy: 'Alice',
      }, 'user-1');
      assert.equal(result.status, 'pending');
      assert.equal(result.priority, 'medium');
    });
  });

  describe('getMaintenanceRequest', () => {
    it('returns a maintenance request by id', async () => {
      memFindUniqueImpl = async () => makeRow('m1', 'maintenance_request', { facilityId: 'f1', title: 'X', description: '', priority: 'high', category: 'hvac', status: 'pending', requestedBy: 'A', assignedTo: null, completedAt: null, completionNotes: null });
      const result = await FacilitiesService.getMaintenanceRequest('m1');
      assert.ok(result);
      assert.equal(result!.title, 'X');
    });
  });

  describe('listMaintenanceRequests', () => {
    it('applies facilityId, status, and priority filters', async () => {
      memFindManyImpl = async () => [
        makeRow('m1', 'maintenance_request', { facilityId: 'f1', title: 'A', description: '', priority: 'high', category: 'hvac', status: 'pending', requestedBy: 'A', assignedTo: null, completedAt: null, completionNotes: null }),
        makeRow('m2', 'maintenance_request', { facilityId: 'f2', title: 'B', description: '', priority: 'low', category: 'other', status: 'completed', requestedBy: 'A', assignedTo: null, completedAt: null, completionNotes: null }),
      ];
      const result = await FacilitiesService.listMaintenanceRequests('org-1', { facilityId: 'f1', status: 'pending', priority: 'high' });
      assert.equal(result.length, 1);
    });
  });

  describe('updateMaintenanceRequest', () => {
    it('updates maintenance fields', async () => {
      memFindUniqueImpl = async () => makeRow('m1', 'maintenance_request', { facilityId: 'f1', title: 'X', description: '', priority: 'medium', category: 'other', status: 'pending', requestedBy: 'A', assignedTo: null, completedAt: null, completionNotes: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'in_progress');
        return makeRow('m1', 'maintenance_request', content);
      };
      const result = await FacilitiesService.updateMaintenanceRequest('m1', { status: 'in_progress' });
      assert.ok(result);
      assert.equal(result!.status, 'in_progress');
    });
  });

  describe('assignMaintenanceRequest', () => {
    it('assigns a maintenance request and sets status to assigned', async () => {
      memFindUniqueImpl = async () => makeRow('m1', 'maintenance_request', { facilityId: 'f1', title: 'X', description: '', priority: 'medium', category: 'other', status: 'pending', requestedBy: 'A', assignedTo: null, completedAt: null, completionNotes: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'assigned');
        assert.equal(content.assignedTo, 'tech1');
        return makeRow('m1', 'maintenance_request', content);
      };
      const result = await FacilitiesService.assignMaintenanceRequest('m1', 'tech1');
      assert.ok(result);
      assert.equal(result!.status, 'assigned');
      assert.equal(result!.assignedTo, 'tech1');
    });
  });

  describe('completeMaintenanceRequest', () => {
    it('completes a maintenance request with notes', async () => {
      memFindUniqueImpl = async () => makeRow('m1', 'maintenance_request', { facilityId: 'f1', title: 'X', description: '', priority: 'medium', category: 'other', status: 'assigned', requestedBy: 'A', assignedTo: 'tech1', completedAt: null, completionNotes: null });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'completed');
        assert.equal(content.completionNotes, 'Fixed');
        assert.ok(content.completedAt);
        return makeRow('m1', 'maintenance_request', content);
      };
      const result = await FacilitiesService.completeMaintenanceRequest('m1', 'Fixed');
      assert.ok(result);
      assert.equal(result!.status, 'completed');
      assert.equal(result!.completionNotes, 'Fixed');
    });
  });

  // ── Space Allocations ──

  describe('createSpaceAllocation', () => {
    it('creates a space allocation with defaults', async () => {
      memCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.type, 'space_allocation');
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.facilityId, 'f1');
        assert.equal(content.floor, 0);
        assert.ok(content.startDate);
        return makeRow('sa1', 'space_allocation', content);
      };
      const result = await FacilitiesService.createSpaceAllocation('org-1', 'ws-1', {
        facilityId: 'f1',
      }, 'user-1');
      assert.equal(result.facilityId, 'f1');
    });
  });

  describe('getSpaceAllocations', () => {
    it('applies facilityId and department filters', async () => {
      memFindManyImpl = async () => [
        makeRow('sa1', 'space_allocation', { facilityId: 'f1', floor: 1, area: 500, assignedTo: 'A', department: 'Eng', purpose: '', startDate: '2025-01-01' }),
        makeRow('sa2', 'space_allocation', { facilityId: 'f2', floor: 2, area: 300, assignedTo: 'B', department: 'Sales', purpose: '', startDate: '2025-01-01' }),
      ];
      const result = await FacilitiesService.getSpaceAllocations('org-1', { facilityId: 'f1', department: 'Eng' });
      assert.equal(result.length, 1);
    });
  });

  describe('updateSpaceAllocation', () => {
    it('updates space allocation fields', async () => {
      memFindUniqueImpl = async () => makeRow('sa1', 'space_allocation', { facilityId: 'f1', floor: 1, area: 500, assignedTo: 'A', department: 'Eng', purpose: '', startDate: '2025-01-01' });
      memUpdateImpl = async (args: UpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.area, 800);
        return makeRow('sa1', 'space_allocation', content);
      };
      const result = await FacilitiesService.updateSpaceAllocation('sa1', { area: 800 });
      assert.ok(result);
      assert.equal(result!.area, 800);
    });
  });

  describe('deleteSpaceAllocation', () => {
    it('deletes a space allocation', async () => {
      memDeleteImpl = async () => ({ id: 'sa1' });
      const result = await FacilitiesService.deleteSpaceAllocation('sa1');
      assert.equal(result, true);
    });
  });

  // ── Reports & Stats ──

  describe('getOccupancyReport', () => {
    it('computes occupancy per facility and overall', async () => {
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = args.where.type as string;
        if (type === 'facility') {
          return [
            makeRow('f1', 'facility', { name: 'A', address: '', type: 'office', floors: 1, totalArea: 1000, areaUnit: 'sqft', description: '', isActive: true }),
            makeRow('f2', 'facility', { name: 'B', address: '', type: 'office', floors: 1, totalArea: 2000, areaUnit: 'sqft', description: '', isActive: true }),
          ];
        }
        if (type === 'space_allocation') {
          return [
            makeRow('sa1', 'space_allocation', { facilityId: 'f1', floor: 1, area: 500, assignedTo: 'A', department: 'Eng', purpose: '', startDate: '2025-01-01' }),
            makeRow('sa2', 'space_allocation', { facilityId: 'f2', floor: 1, area: 1000, assignedTo: 'B', department: 'Sales', purpose: '', startDate: '2025-01-01' }),
          ];
        }
        return [];
      };
      const result = await FacilitiesService.getOccupancyReport('org-1');
      assert.equal(result.facilities.length, 2);
      assert.equal(result.totalArea, 3000);
      assert.equal(result.totalAllocatedArea, 1500);
      assert.equal(result.overallOccupancyRate, 50);
    });
  });

  describe('getFacilityCosts', () => {
    it('computes rent totals by facility', async () => {
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = args.where.type as string;
        if (type === 'lease') {
          return [
            makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 1000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null }),
            makeRow('l2', 'lease', { facilityId: 'f2', landlord: 'B', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 2000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null }),
            makeRow('l3', 'lease', { facilityId: 'f1', landlord: 'C', startDate: '2025-01-01', endDate: '2026-01-01', monthlyRent: 500, deposit: 0, terms: '', status: 'expired', terminatedAt: null, terminationReason: null }),
          ];
        }
        if (type === 'maintenance_request') {
          return [];
        }
        return [];
      };
      const result = await FacilitiesService.getFacilityCosts('org-1');
      assert.equal(result.totalRent, 3000);
      assert.equal(result.byFacility['f1'].rent, 1000);
      assert.equal(result.byFacility['f2'].rent, 2000);
    });
  });

  describe('getStats', () => {
    it('returns aggregate facilities stats', async () => {
      const now = new Date();
      const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      memFindManyImpl = async (args: FindManyArgs) => {
        const type = args.where.type as string;
        if (type === 'facility') {
          return [
            makeRow('f1', 'facility', { name: 'A', address: '', type: 'office', floors: 1, totalArea: 1000, areaUnit: 'sqft', description: '', isActive: true }),
            makeRow('f2', 'facility', { name: 'B', address: '', type: 'office', floors: 1, totalArea: 2000, areaUnit: 'sqft', description: '', isActive: false }),
          ];
        }
        if (type === 'lease') {
          return [
            makeRow('l1', 'lease', { facilityId: 'f1', landlord: 'A', startDate: '2025-01-01', endDate: soon.toISOString(), monthlyRent: 1000, deposit: 0, terms: '', status: 'active', terminatedAt: null, terminationReason: null }),
          ];
        }
        if (type === 'maintenance_request') {
          return [
            makeRow('m1', 'maintenance_request', { facilityId: 'f1', title: 'X', description: '', priority: 'high', category: 'hvac', status: 'pending', requestedBy: 'A', assignedTo: null, completedAt: null, completionNotes: null }),
          ];
        }
        if (type === 'space_allocation') {
          return [
            makeRow('sa1', 'space_allocation', { facilityId: 'f1', floor: 1, area: 500, assignedTo: 'A', department: 'Eng', purpose: '', startDate: '2025-01-01' }),
          ];
        }
        return [];
      };
      const result = await FacilitiesService.getStats('org-1');
      assert.equal(result.facilityCount, 2);
      assert.equal(result.activeFacilityCount, 1);
      assert.equal(result.leaseCount, 1);
      assert.equal(result.activeLeaseCount, 1);
      assert.equal(result.expiringLeaseCount, 1);
      assert.equal(result.maintenanceRequestCount, 1);
      assert.equal(result.openMaintenanceCount, 1);
      assert.equal(result.spaceAllocationCount, 1);
      assert.equal(result.totalArea, 3000);
      assert.equal(result.allocatedArea, 500);
    });
  });
});
