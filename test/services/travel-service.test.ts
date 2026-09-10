import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type MemoryFindManyArgs = {
  where: {
    type?: string;
    organizationId?: string;
    workspaceId?: string;
    sourceId?: string;
    createdBy?: string;
    createdAt?: Record<string, unknown>;
  };
  orderBy?: Record<string, unknown>;
  take?: number;
  skip?: number;
};

type MemoryFindUniqueArgs = {
  where: { id: string };
};

type MemoryFindFirstArgs = {
  where: Record<string, unknown>;
};

type MemoryCreateArgs = {
  data: {
    workspaceId: string;
    organizationId: string;
    type: string;
    content: string;
    source: string;
    sourceId: string | null;
    confidence: number;
    lifecycle: string;
    tags: string;
    createdBy: string;
  };
};

type MemoryUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

type MemoryDeleteArgs = {
  where: { id: string };
};

type MemoryCountArgs = {
  where: Record<string, unknown>;
};

type ExpenseCreateArgs = {
  data: Record<string, unknown>;
};

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let memoryFindManyImpl: (args: MemoryFindManyArgs) => Promise<unknown[]> =
  async () => [];
let memoryFindUniqueImpl: (args: MemoryFindUniqueArgs) => Promise<unknown> =
  async () => null;
let memoryFindFirstImpl: (args: MemoryFindFirstArgs) => Promise<unknown> =
  async () => null;
let memoryCreateImpl: (args: MemoryCreateArgs) => Promise<unknown> =
  async () => ({});
let memoryUpdateImpl: (args: MemoryUpdateArgs) => Promise<unknown> =
  async () => ({});
let memoryDeleteImpl: (args: MemoryDeleteArgs) => Promise<unknown> =
  async () => ({});
let memoryCountImpl: (args: MemoryCountArgs) => Promise<number> =
  async () => 0;
let expenseCreateImpl: (args: ExpenseCreateArgs) => Promise<unknown> =
  async () => ({});

const prismaMock = {
  memory: {
    findMany: (args: MemoryFindManyArgs): Promise<unknown[]> => {
      calls.push({ method: 'memory.findMany', args });
      return memoryFindManyImpl(args);
    },
    findUnique: (args: MemoryFindUniqueArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findUnique', args });
      return memoryFindUniqueImpl(args);
    },
    findFirst: (args: MemoryFindFirstArgs): Promise<unknown> => {
      calls.push({ method: 'memory.findFirst', args });
      return memoryFindFirstImpl(args);
    },
    create: (args: MemoryCreateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.create', args });
      return memoryCreateImpl(args);
    },
    update: (args: MemoryUpdateArgs): Promise<unknown> => {
      calls.push({ method: 'memory.update', args });
      return memoryUpdateImpl(args);
    },
    delete: (args: MemoryDeleteArgs): Promise<unknown> => {
      calls.push({ method: 'memory.delete', args });
      return memoryDeleteImpl(args);
    },
    count: (args: MemoryCountArgs): Promise<number> => {
      calls.push({ method: 'memory.count', args });
      return memoryCountImpl(args);
    },
  },
  expense: {
    create: (args: ExpenseCreateArgs): Promise<unknown> => {
      calls.push({ method: 'expense.create', args });
      return expenseCreateImpl(args);
    },
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
  memoryFindManyImpl = async () => [];
  memoryFindUniqueImpl = async () => null;
  memoryFindFirstImpl = async () => null;
  memoryCreateImpl = async () => ({});
  memoryUpdateImpl = async () => ({});
  memoryDeleteImpl = async () => ({});
  memoryCountImpl = async () => 0;
  expenseCreateImpl = async () => ({});
}

function makeRow(
  id: string,
  type: string,
  content: Record<string, unknown>,
  overrides: Partial<Record<string, unknown>> = {},
): unknown {
  return {
    id,
    workspaceId: 'ws-1',
    organizationId: 'org-1',
    type,
    content: JSON.stringify(content),
    sourceId: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

const { TravelService } =
  await import('@/lib/services/travel-service');

// ─────────────────────────────────────────────────────────────────────────────
// TravelService
// ─────────────────────────────────────────────────────────────────────────────

describe('TravelService', () => {
  beforeEach(() => { resetMock(); });

  describe('createTravelRequest', () => {
    it('creates a travel request with default status pending', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'travel_request');
        const content = JSON.parse(args.data.content);
        assert.equal(content.status, 'pending');
        assert.equal(content.destination, 'Tokyo');
        assert.equal(content.transportMode, 'flight');
        return makeRow('tr-1', 'travel_request', content);
      };

      const req = await TravelService.createTravelRequest('org-1', 'ws-1', {
        employeeId: 'e1',
        employeeName: 'Alice',
        destination: 'Tokyo',
        purpose: 'Client meeting',
        departureDate: new Date('2025-06-01'),
        returnDate: new Date('2025-06-07'),
        transportMode: 'flight',
      }, 'user-1');

      assert.ok(req);
      assert.equal(req.id, 'tr-1');
      assert.equal(req.status, 'pending');
      assert.equal(req.destination, 'Tokyo');
      assert.equal(calls[0].method, 'memory.create');
    });

    it('defaults transportMode to other and estimatedCost to 0', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        const content = JSON.parse(args.data.content);
        assert.equal(content.transportMode, 'other');
        assert.equal(content.estimatedCost, 0);
        return makeRow('tr-2', 'travel_request', content);
      };

      const req = await TravelService.createTravelRequest('org-1', 'ws-1', {
        employeeId: 'e1',
        employeeName: 'Bob',
        destination: 'Berlin',
        purpose: 'Conference',
        departureDate: new Date('2025-07-01'),
        returnDate: new Date('2025-07-05'),
      }, 'user-1');

      assert.equal(req.transportMode, 'other');
      assert.equal(req.estimatedCost, 0);
    });
  });

  describe('getTravelRequest', () => {
    it('returns a request by id', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'Alice', destination: 'Tokyo',
          purpose: 'Meeting', departureDate: '2025-06-01', returnDate: '2025-06-07',
          estimatedCost: 1000, transportMode: 'flight', notes: '', status: 'pending',
        });

      const req = await TravelService.getTravelRequest('tr-1');

      assert.ok(req);
      assert.equal(req.id, 'tr-1');
      assert.equal(req.destination, 'Tokyo');
      assert.equal(calls[0].method, 'memory.findUnique');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const req = await TravelService.getTravelRequest('nope');
      assert.equal(req, null);
    });
  });

  describe('listTravelRequests', () => {
    it('returns requests for an organization', async () => {
      memoryFindManyImpl = async () => [
        makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0, transportMode: 'flight', notes: '', status: 'pending' }),
        makeRow('tr-2', 'travel_request', { employeeId: 'e2', employeeName: 'B', destination: 'Y', purpose: '', departureDate: '2025-07-01', returnDate: '2025-07-05', estimatedCost: 0, transportMode: 'train', notes: '', status: 'approved' }),
      ];

      const reqs = await TravelService.listTravelRequests('org-1');

      assert.equal(reqs.length, 2);
      assert.equal(calls[0].method, 'memory.findMany');
    });

    it('filters by status', async () => {
      memoryFindManyImpl = async () => [
        makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0, transportMode: 'flight', notes: '', status: 'pending' }),
        makeRow('tr-2', 'travel_request', { employeeId: 'e2', employeeName: 'B', destination: 'Y', purpose: '', departureDate: '2025-07-01', returnDate: '2025-07-05', estimatedCost: 0, transportMode: 'train', notes: '', status: 'approved' }),
      ];

      const reqs = await TravelService.listTravelRequests('org-1', { status: 'approved' });
      assert.equal(reqs.length, 1);
      assert.equal(reqs[0].status, 'approved');
    });

    it('filters by employeeId', async () => {
      memoryFindManyImpl = async () => [
        makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0, transportMode: 'flight', notes: '', status: 'pending' }),
      ];

      const reqs = await TravelService.listTravelRequests('org-1', { employeeId: 'e1' });
      assert.equal(reqs.length, 1);
      assert.equal(reqs[0].employeeId, 'e1');
    });

    it('filters by date range', async () => {
      memoryFindManyImpl = async () => [
        makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0, transportMode: 'flight', notes: '', status: 'pending' }),
        makeRow('tr-2', 'travel_request', { employeeId: 'e2', employeeName: 'B', destination: 'Y', purpose: '', departureDate: '2025-03-01', returnDate: '2025-03-05', estimatedCost: 0, transportMode: 'train', notes: '', status: 'approved' }),
      ];

      const reqs = await TravelService.listTravelRequests('org-1', {
        fromDate: new Date('2025-05-01'),
        toDate: new Date('2025-12-31'),
      });
      assert.equal(reqs.length, 1);
      assert.equal(reqs[0].id, 'tr-1');
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };
      const reqs = await TravelService.listTravelRequests('org-1');
      assert.deepEqual(reqs, []);
    });
  });

  describe('updateTravelRequest', () => {
    it('updates editable fields', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: 'old',
          departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 100,
          transportMode: 'flight', notes: '', status: 'pending',
        });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.destination, 'Tokyo');
        assert.equal(content.estimatedCost, 2000);
        return makeRow('tr-1', 'travel_request', content);
      };

      const req = await TravelService.updateTravelRequest('tr-1', {
        destination: 'Tokyo',
        estimatedCost: 2000,
      });

      assert.ok(req);
      assert.equal(req.destination, 'Tokyo');
      assert.equal(req.estimatedCost, 2000);
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const req = await TravelService.updateTravelRequest('nope', { destination: 'X' });
      assert.equal(req, null);
    });
  });

  describe('approveTravelRequest', () => {
    it('sets status to approved with approver', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0,
          transportMode: 'flight', notes: '', status: 'pending',
        });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'approved');
        assert.equal(content.approvedBy, 'mgr-1');
        assert.ok(content.approvedAt);
        return makeRow('tr-1', 'travel_request', content);
      };

      const req = await TravelService.approveTravelRequest('tr-1', 'mgr-1');
      assert.ok(req);
      assert.equal(req.status, 'approved');
      assert.equal(req.approvedBy, 'mgr-1');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const req = await TravelService.approveTravelRequest('nope', 'mgr-1');
      assert.equal(req, null);
    });
  });

  describe('rejectTravelRequest', () => {
    it('sets status to rejected with reason and rejector', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0,
          transportMode: 'flight', notes: '', status: 'pending',
        });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'rejected');
        assert.equal(content.rejectionReason, 'too expensive');
        assert.equal(content.rejectedBy, 'mgr-1');
        return makeRow('tr-1', 'travel_request', content);
      };

      const req = await TravelService.rejectTravelRequest('tr-1', 'too expensive', 'mgr-1');
      assert.ok(req);
      assert.equal(req.status, 'rejected');
      assert.equal(req.rejectionReason, 'too expensive');
    });
  });

  describe('cancelTravelRequest', () => {
    it('sets status to cancelled with reason', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 0,
          transportMode: 'flight', notes: '', status: 'approved',
        });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'cancelled');
        assert.equal(content.cancelReason, 'changed plans');
        return makeRow('tr-1', 'travel_request', content);
      };

      const req = await TravelService.cancelTravelRequest('tr-1', 'changed plans');
      assert.ok(req);
      assert.equal(req.status, 'cancelled');
      assert.equal(req.cancelReason, 'changed plans');
    });
  });

  describe('addItineraryItem', () => {
    it('creates an itinerary item linked to request via sourceId', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'travel_itinerary');
        assert.equal(args.data.sourceId, 'tr-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.title, 'Flight to Tokyo');
        assert.equal(content.type, 'flight');
        return makeRow('it-1', 'travel_itinerary', content, { sourceId: 'tr-1' });
      };

      const item = await TravelService.addItineraryItem('tr-1', 'org-1', 'ws-1', {
        type: 'flight',
        title: 'Flight to Tokyo',
        date: new Date('2025-06-01'),
        location: 'JFK',
        cost: 800,
      }, 'user-1');

      assert.ok(item);
      assert.equal(item.id, 'it-1');
      assert.equal(item.requestId, 'tr-1');
      assert.equal(item.title, 'Flight to Tokyo');
    });
  });

  describe('getItinerary', () => {
    it('returns itinerary items for a request', async () => {
      memoryFindManyImpl = async () => [
        makeRow('it-1', 'travel_itinerary', { type: 'flight', title: 'A', date: '2025-06-01', location: '', details: '', cost: 0 }, { sourceId: 'tr-1' }),
        makeRow('it-2', 'travel_itinerary', { type: 'hotel', title: 'B', date: '2025-06-02', location: '', details: '', cost: 0 }, { sourceId: 'tr-1' }),
      ];

      const items = await TravelService.getItinerary('tr-1');
      assert.equal(items.length, 2);
      assert.equal(items[0].requestId, 'tr-1');
      const args = calls[0].args as MemoryFindManyArgs;
      assert.equal(args.where.sourceId, 'tr-1');
    });

    it('returns empty array on error', async () => {
      memoryFindManyImpl = async () => { throw new Error('fail'); };
      const items = await TravelService.getItinerary('tr-1');
      assert.deepEqual(items, []);
    });
  });

  describe('removeItineraryItem', () => {
    it('deletes an itinerary item', async () => {
      memoryDeleteImpl = async () => ({ id: 'it-1' });
      const ok = await TravelService.removeItineraryItem('it-1');
      assert.equal(ok, true);
      assert.equal(calls[0].method, 'memory.delete');
    });

    it('returns false on error', async () => {
      memoryDeleteImpl = async () => { throw new Error('fail'); };
      const ok = await TravelService.removeItineraryItem('it-1');
      assert.equal(ok, false);
    });
  });

  describe('addBooking', () => {
    it('creates a booking linked to request via sourceId', async () => {
      memoryCreateImpl = async (args: MemoryCreateArgs) => {
        assert.equal(args.data.type, 'travel_booking');
        assert.equal(args.data.sourceId, 'tr-1');
        const content = JSON.parse(args.data.content);
        assert.equal(content.vendor, 'Delta');
        assert.equal(content.cost, 1200);
        assert.equal(content.status, 'pending');
        return makeRow('bk-1', 'travel_booking', content, { sourceId: 'tr-1' });
      };

      const booking = await TravelService.addBooking('tr-1', 'org-1', 'ws-1', {
        type: 'flight',
        vendor: 'Delta',
        cost: 1200,
      }, 'user-1');

      assert.ok(booking);
      assert.equal(booking.id, 'bk-1');
      assert.equal(booking.requestId, 'tr-1');
      assert.equal(booking.vendor, 'Delta');
      assert.equal(booking.cost, 1200);
    });
  });

  describe('getBookings', () => {
    it('returns bookings for a request', async () => {
      memoryFindManyImpl = async () => [
        makeRow('bk-1', 'travel_booking', { type: 'flight', vendor: 'Delta', confirmationNumber: 'ABC', cost: 1200, bookingDate: '2025-01-01', status: 'confirmed' }, { sourceId: 'tr-1' }),
      ];

      const bookings = await TravelService.getBookings('tr-1');
      assert.equal(bookings.length, 1);
      assert.equal(bookings[0].vendor, 'Delta');
    });
  });

  describe('updateBookingStatus', () => {
    it('updates the booking status', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('bk-1', 'travel_booking', {
          type: 'flight', vendor: 'Delta', confirmationNumber: 'ABC',
          cost: 1200, bookingDate: '2025-01-01', status: 'pending',
        }, { sourceId: 'tr-1' });
      memoryUpdateImpl = async (args: MemoryUpdateArgs) => {
        const content = JSON.parse(args.data.content as string);
        assert.equal(content.status, 'confirmed');
        return makeRow('bk-1', 'travel_booking', content, { sourceId: 'tr-1' });
      };

      const booking = await TravelService.updateBookingStatus('bk-1', 'confirmed');
      assert.ok(booking);
      assert.equal(booking.status, 'confirmed');
    });

    it('returns null when not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const booking = await TravelService.updateBookingStatus('nope', 'confirmed');
      assert.equal(booking, null);
    });
  });

  describe('convertToExpense', () => {
    it('creates an expense with category travel and total amount', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'Tokyo', purpose: 'Meeting',
          departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 1000,
          transportMode: 'flight', notes: '', status: 'approved',
        });
      memoryFindManyImpl = async () => [
        makeRow('bk-1', 'travel_booking', { type: 'flight', vendor: 'Delta', confirmationNumber: '', cost: 500, bookingDate: '2025-01-01', status: 'confirmed' }, { sourceId: 'tr-1' }),
      ];
      expenseCreateImpl = async (args: ExpenseCreateArgs) => {
        assert.equal(args.data.category, 'travel');
        assert.equal(args.data.vendor, 'Tokyo');
        assert.equal(args.data.amount, 1500);
        return { id: 'exp-1', ...args.data };
      };

      const expense = await TravelService.convertToExpense('tr-1', 'org-1', 'ws-1', 'user-1');
      assert.ok(expense);
      assert.equal(expense.id, 'exp-1');
      assert.equal(calls.some((c) => c.method === 'expense.create'), true);
    });

    it('excludes cancelled bookings from total', async () => {
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'Paris', purpose: '',
          departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 500,
          transportMode: 'flight', notes: '', status: 'approved',
        });
      memoryFindManyImpl = async () => [
        makeRow('bk-1', 'travel_booking', { type: 'flight', vendor: 'AF', confirmationNumber: '', cost: 1000, bookingDate: '', status: 'cancelled' }, { sourceId: 'tr-1' }),
      ];
      expenseCreateImpl = async (args: ExpenseCreateArgs) => {
        assert.equal(args.data.amount, 500);
        return { id: 'exp-2', ...args.data };
      };

      const expense = await TravelService.convertToExpense('tr-1', 'org-1', 'ws-1', 'user-1');
      assert.ok(expense);
      assert.equal(expense.amount, 500);
    });

    it('returns null when request not found', async () => {
      memoryFindUniqueImpl = async () => null;
      const expense = await TravelService.convertToExpense('nope', 'org-1', 'ws-1', 'user-1');
      assert.equal(expense, null);
    });
  });

  describe('checkPolicyCompliance', () => {
    it('returns compliant when all rules pass', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: future.toISOString(), returnDate: future.toISOString(),
          estimatedCost: 1000, transportMode: 'flight', notes: '', status: 'pending',
        });

      const result = await TravelService.checkPolicyCompliance('tr-1');
      assert.equal(result.compliant, true);
      assert.equal(result.violations.length, 0);
    });

    it('flags cost exceeding max', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: future.toISOString(), returnDate: future.toISOString(),
          estimatedCost: 6000, transportMode: 'flight', notes: '', status: 'pending',
        });

      const result = await TravelService.checkPolicyCompliance('tr-1');
      assert.equal(result.compliant, false);
      assert.ok(result.violations.some((v) => v.includes('estimated_cost_exceeds')));
    });

    it('flags insufficient advance booking', async () => {
      const soon = new Date();
      soon.setDate(soon.getDate() + 2);
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: soon.toISOString(), returnDate: soon.toISOString(),
          estimatedCost: 500, transportMode: 'flight', notes: '', status: 'pending',
        });

      const result = await TravelService.checkPolicyCompliance('tr-1');
      assert.equal(result.compliant, false);
      assert.ok(result.violations.some((v) => v.includes('advance_booking')));
    });

    it('flags unapproved transport mode', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      memoryFindUniqueImpl = async () =>
        makeRow('tr-1', 'travel_request', {
          employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '',
          departureDate: future.toISOString(), returnDate: future.toISOString(),
          estimatedCost: 500, transportMode: 'other', notes: '', status: 'pending',
        });

      const result = await TravelService.checkPolicyCompliance('tr-1');
      assert.equal(result.compliant, false);
      assert.ok(result.violations.includes('transport_mode_not_approved'));
    });

    it('returns not_found violation when request missing', async () => {
      memoryFindUniqueImpl = async () => null;
      const result = await TravelService.checkPolicyCompliance('nope');
      assert.equal(result.compliant, false);
      assert.ok(result.violations.includes('request_not_found'));
    });
  });

  describe('getTravelCostSummary', () => {
    it('aggregates costs by category and transport mode', async () => {
      memoryFindManyImpl = async () => [
        makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 1000, transportMode: 'flight', notes: '', status: 'approved' }),
        makeRow('tr-2', 'travel_request', { employeeId: 'e2', employeeName: 'B', destination: 'Y', purpose: '', departureDate: '2025-07-01', returnDate: '2025-07-05', estimatedCost: 500, transportMode: 'train', notes: '', status: 'cancelled' }),
      ];
      // For booking lookups inside getTravelCostSummary, return empty
      memoryFindManyImpl = async (args: MemoryFindManyArgs) => {
        if (args.where.type === 'travel_booking') return [];
        return [
          makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 1000, transportMode: 'flight', notes: '', status: 'approved' }),
          makeRow('tr-2', 'travel_request', { employeeId: 'e2', employeeName: 'B', destination: 'Y', purpose: '', departureDate: '2025-07-01', returnDate: '2025-07-05', estimatedCost: 500, transportMode: 'train', notes: '', status: 'cancelled' }),
        ];
      };

      const summary = await TravelService.getTravelCostSummary('org-1');
      assert.equal(summary.requestCount, 2);
      // cancelled excluded
      assert.equal(summary.totalCost, 1000);
      assert.equal(summary.byTransportMode.flight, 1000);
    });
  });

  describe('getStats', () => {
    it('aggregates travel stats', async () => {
      memoryFindManyImpl = async () => [
        makeRow('tr-1', 'travel_request', { employeeId: 'e1', employeeName: 'A', destination: 'X', purpose: '', departureDate: '2025-06-01', returnDate: '2025-06-07', estimatedCost: 1000, transportMode: 'flight', notes: '', status: 'approved' }),
        makeRow('tr-2', 'travel_request', { employeeId: 'e2', employeeName: 'B', destination: 'Y', purpose: '', departureDate: '2025-07-01', returnDate: '2025-07-05', estimatedCost: 500, transportMode: 'train', notes: '', status: 'pending' }),
        makeRow('tr-3', 'travel_request', { employeeId: 'e3', employeeName: 'C', destination: 'Z', purpose: '', departureDate: '2025-08-01', returnDate: '2025-08-05', estimatedCost: 200, transportMode: 'car', notes: '', status: 'rejected' }),
      ];

      const stats = await TravelService.getStats('org-1');
      assert.equal(stats.requestCount, 3);
      assert.equal(stats.pendingCount, 1);
      // approved=1, rejected=1 => approvalRate = 0.5
      assert.equal(stats.approvalRate, 0.5);
      // totalCost excludes cancelled (none here) = 1000+500+200 = 1700
      assert.equal(stats.totalCost, 1700);
    });

    it('returns zero stats when no requests', async () => {
      memoryFindManyImpl = async () => [];
      const stats = await TravelService.getStats('org-1');
      assert.equal(stats.requestCount, 0);
      assert.equal(stats.pendingCount, 0);
      assert.equal(stats.approvalRate, 0);
      assert.equal(stats.totalCost, 0);
    });
  });
});
