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
    type: 'library_item',
    content: JSON.stringify({
      title: 'The Art of Strategy',
      type: 'book',
      author: 'Avinash Dixit',
      isbn: '978-0393337174',
      publisher: 'W. W. Norton',
      publicationYear: 2008,
      edition: '1st',
      category: 'Business',
      description: 'A book on game theory',
      status: 'available',
      location: 'Shelf A1',
      quantity: 5,
      availableQuantity: 3,
      keywords: ['strategy', 'game theory'],
      notes: '',
    }),
    source: 'user',
    sourceId: null,
    confidence: 1.0,
    owner: null,
    accessPolicy: null,
    lifecycle: 'permanent',
    expiresAt: null,
    tags: JSON.stringify(['library_item', 'book', 'available']),
    relatedMemoryIds: null,
    verifiedBy: null,
    verifiedAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function makeLoanRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-l1',
    type: 'library_loan',
    content: JSON.stringify({
      itemId: 'mem-1',
      borrowerId: 'user-2',
      borrowerName: 'Jane Doe',
      status: 'active',
      checkoutDate: '2028-01-01',
      dueDate: '2028-02-01',
      returnDate: null,
      renewedDate: null,
      condition: 'good',
      notes: '',
    }),
    tags: JSON.stringify(['library_loan', 'active']),
    ...overrides,
  });
}

function makeReservationRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-r1',
    type: 'library_reservation',
    content: JSON.stringify({
      itemId: 'mem-1',
      reserverId: 'user-3',
      reserverName: 'Bob Smith',
      status: 'pending',
      reservedDate: '2028-01-01',
      expiryDate: '2028-03-01',
      fulfilledDate: null,
      notes: '',
    }),
    tags: JSON.stringify(['library_reservation', 'pending']),
    ...overrides,
  });
}

function makeAcquisitionRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return makeRow({
    id: 'mem-a1',
    type: 'library_acquisition',
    content: JSON.stringify({
      title: 'Thinking, Fast and Slow',
      type: 'book',
      author: 'Daniel Kahneman',
      publisher: 'Farrar, Straus and Giroux',
      cost: 25.00,
      budget: 500.00,
      status: 'requested',
      requestedBy: 'user-1',
      approvedBy: '',
      orderedDate: null,
      receivedDate: null,
      supplier: 'Amazon',
      notes: '',
    }),
    tags: JSON.stringify(['library_acquisition', 'book', 'requested']),
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

const { CorporateLibraryService } = await import('@/lib/services/corporate-library-service');

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Items
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateLibraryService — Items', () => {
  beforeEach(() => resetMock());

  it('creates an item with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const item = await CorporateLibraryService.createItem('org-1', 'ws-1', {
      title: 'Clean Code', type: 'book',
    }, 'user-1');
    assert.equal(item.title, 'Clean Code');
    assert.equal(item.status, 'available');
    assert.equal(item.quantity, 0);
    assert.equal(item.keywords.length, 0);
  });

  it('creates an item with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const item = await CorporateLibraryService.createItem('org-1', 'ws-1', {
      title: 'Design Patterns', type: 'book', author: 'GoF',
      isbn: '978-0201633610', publisher: 'Addison-Wesley',
      publicationYear: 1994, edition: '1st', category: 'Software',
      description: 'Classic software engineering book', status: 'available',
      location: 'Shelf B2', quantity: 10, availableQuantity: 8,
      keywords: ['patterns', 'design'], notes: 'Reference copy',
    }, 'user-1');
    assert.equal(item.title, 'Design Patterns');
    assert.equal(item.author, 'GoF');
    assert.equal(item.quantity, 10);
    assert.equal(item.availableQuantity, 8);
    assert.equal(item.keywords.length, 2);
  });

  it('gets an item by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const item = await CorporateLibraryService.getItem('mem-1');
    assert.ok(item);
    assert.equal(item!.id, 'mem-1');
    assert.equal(item!.title, 'The Art of Strategy');
  });

  it('returns null for wrong type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'library_loan' });
    const item = await CorporateLibraryService.getItem('mem-1');
    assert.equal(item, null);
  });

  it('returns null when item not found', async () => {
    memFindUniqueImpl = async () => null;
    const item = await CorporateLibraryService.getItem('nope');
    assert.equal(item, null);
  });

  it('lists items by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'library_item') return [makeRow()];
      return [];
    };
    const list = await CorporateLibraryService.listItems('org-1');
    assert.equal(list.length, 1);
    assert.equal(list[0].title, 'The Art of Strategy');
  });

  it('updates an item', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ id: 'mem-1', content: args.data.content as string });
    const item = await CorporateLibraryService.updateItem('mem-1', { status: 'checked_out' });
    assert.ok(item);
    assert.equal(item!.status, 'checked_out');
  });

  it('deletes an item', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await CorporateLibraryService.deleteItem('mem-1');
    assert.equal(ok, true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Loans
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateLibraryService — Loans', () => {
  beforeEach(() => resetMock());

  it('creates a loan with defaults', async () => {
    memCreateImpl = async (args) => makeLoanRow({ content: args.data.content as string });
    const loan = await CorporateLibraryService.createLoan('org-1', 'ws-1', {
      itemId: 'mem-1', borrowerId: 'user-2', borrowerName: 'Jane Doe',
    }, 'user-1');
    assert.equal(loan.borrowerName, 'Jane Doe');
    assert.equal(loan.status, 'active');
    assert.equal(loan.condition, '');
  });

  it('creates a loan with full input', async () => {
    memCreateImpl = async (args) => makeLoanRow({ content: args.data.content as string });
    const loan = await CorporateLibraryService.createLoan('org-1', 'ws-1', {
      itemId: 'mem-1', borrowerId: 'user-2', borrowerName: 'Jane Doe',
      status: 'active', checkoutDate: '2028-01-01', dueDate: '2028-02-01',
      condition: 'good', notes: 'Handle with care',
    }, 'user-1');
    assert.equal(loan.borrowerName, 'Jane Doe');
    assert.equal(loan.dueDate!.toISOString().startsWith('2028-02-01'), true);
    assert.equal(loan.condition, 'good');
  });

  it('gets a loan by id', async () => {
    memFindUniqueImpl = async () => makeLoanRow();
    const loan = await CorporateLibraryService.getLoan('mem-l1');
    assert.ok(loan);
    assert.equal(loan!.borrowerName, 'Jane Doe');
  });

  it('returns null for wrong type on getLoan', async () => {
    memFindUniqueImpl = async () => makeLoanRow({ type: 'library_item' });
    const loan = await CorporateLibraryService.getLoan('mem-l1');
    assert.equal(loan, null);
  });

  it('lists loans by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'library_loan') return [makeLoanRow()];
      return [];
    };
    const list = await CorporateLibraryService.listLoans('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a loan', async () => {
    memFindUniqueImpl = async () => makeLoanRow();
    memUpdateImpl = async (args) => makeLoanRow({ id: 'mem-l1', content: args.data.content as string });
    const loan = await CorporateLibraryService.updateLoan('mem-l1', { status: 'overdue' });
    assert.ok(loan);
    assert.equal(loan!.status, 'overdue');
  });

  it('deletes a loan', async () => {
    memDeleteImpl = async () => ({ id: 'mem-l1' });
    const ok = await CorporateLibraryService.deleteLoan('mem-l1');
    assert.equal(ok, true);
  });

  it('returnLoan sets status to returned', async () => {
    memFindUniqueImpl = async () => makeLoanRow();
    memUpdateImpl = async (args) => makeLoanRow({ id: 'mem-l1', content: args.data.content as string });
    const loan = await CorporateLibraryService.returnLoan('mem-l1', 'user-1');
    assert.ok(loan);
    assert.equal(loan!.status, 'returned');
    assert.ok(loan!.returnDate);
  });

  it('renewLoan sets status to renewed', async () => {
    memFindUniqueImpl = async () => makeLoanRow();
    memUpdateImpl = async (args) => makeLoanRow({ id: 'mem-l1', content: args.data.content as string });
    const loan = await CorporateLibraryService.renewLoan('mem-l1', 'user-1');
    assert.ok(loan);
    assert.equal(loan!.status, 'renewed');
    assert.ok(loan!.renewedDate);
  });

  it('markLoanLost sets status to lost', async () => {
    memFindUniqueImpl = async () => makeLoanRow();
    memUpdateImpl = async (args) => makeLoanRow({ id: 'mem-l1', content: args.data.content as string });
    const loan = await CorporateLibraryService.markLoanLost('mem-l1', 'user-1');
    assert.ok(loan);
    assert.equal(loan!.status, 'lost');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Reservations
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateLibraryService — Reservations', () => {
  beforeEach(() => resetMock());

  it('creates a reservation with defaults', async () => {
    memCreateImpl = async (args) => makeReservationRow({ content: args.data.content as string });
    const res = await CorporateLibraryService.createReservation('org-1', 'ws-1', {
      itemId: 'mem-1', reserverId: 'user-3', reserverName: 'Bob Smith',
    }, 'user-1');
    assert.equal(res.reserverName, 'Bob Smith');
    assert.equal(res.status, 'pending');
    assert.equal(res.notes, '');
  });

  it('creates a reservation with full input', async () => {
    memCreateImpl = async (args) => makeReservationRow({ content: args.data.content as string });
    const res = await CorporateLibraryService.createReservation('org-1', 'ws-1', {
      itemId: 'mem-1', reserverId: 'user-3', reserverName: 'Bob Smith',
      status: 'pending', reservedDate: '2028-01-01', expiryDate: '2028-03-01',
      notes: 'Priority reservation',
    }, 'user-1');
    assert.equal(res.reserverName, 'Bob Smith');
    assert.equal(res.expiryDate!.toISOString().startsWith('2028-03-01'), true);
    assert.equal(res.notes, 'Priority reservation');
  });

  it('gets a reservation by id', async () => {
    memFindUniqueImpl = async () => makeReservationRow();
    const res = await CorporateLibraryService.getReservation('mem-r1');
    assert.ok(res);
    assert.equal(res!.reserverName, 'Bob Smith');
  });

  it('returns null for wrong type on getReservation', async () => {
    memFindUniqueImpl = async () => makeReservationRow({ type: 'library_item' });
    const res = await CorporateLibraryService.getReservation('mem-r1');
    assert.equal(res, null);
  });

  it('lists reservations by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'library_reservation') return [makeReservationRow()];
      return [];
    };
    const list = await CorporateLibraryService.listReservations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a reservation', async () => {
    memFindUniqueImpl = async () => makeReservationRow();
    memUpdateImpl = async (args) => makeReservationRow({ id: 'mem-r1', content: args.data.content as string });
    const res = await CorporateLibraryService.updateReservation('mem-r1', { status: 'expired' });
    assert.ok(res);
    assert.equal(res!.status, 'expired');
  });

  it('deletes a reservation', async () => {
    memDeleteImpl = async () => ({ id: 'mem-r1' });
    const ok = await CorporateLibraryService.deleteReservation('mem-r1');
    assert.equal(ok, true);
  });

  it('fulfillReservation sets status to fulfilled', async () => {
    memFindUniqueImpl = async () => makeReservationRow();
    memUpdateImpl = async (args) => makeReservationRow({ id: 'mem-r1', content: args.data.content as string });
    const res = await CorporateLibraryService.fulfillReservation('mem-r1', 'user-1');
    assert.ok(res);
    assert.equal(res!.status, 'fulfilled');
    assert.ok(res!.fulfilledDate);
  });

  it('cancelReservation sets status to cancelled', async () => {
    memFindUniqueImpl = async () => makeReservationRow();
    memUpdateImpl = async (args) => makeReservationRow({ id: 'mem-r1', content: args.data.content as string });
    const res = await CorporateLibraryService.cancelReservation('mem-r1', 'user-1');
    assert.ok(res);
    assert.equal(res!.status, 'cancelled');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Acquisitions
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateLibraryService — Acquisitions', () => {
  beforeEach(() => resetMock());

  it('creates an acquisition with defaults', async () => {
    memCreateImpl = async (args) => makeAcquisitionRow({ content: args.data.content as string });
    const acq = await CorporateLibraryService.createAcquisition('org-1', 'ws-1', {
      title: 'New Book', type: 'book',
    }, 'user-1');
    assert.equal(acq.title, 'New Book');
    assert.equal(acq.status, 'requested');
    assert.equal(acq.cost, 0);
  });

  it('creates an acquisition with full input', async () => {
    memCreateImpl = async (args) => makeAcquisitionRow({ content: args.data.content as string });
    const acq = await CorporateLibraryService.createAcquisition('org-1', 'ws-1', {
      title: 'Deep Learning', type: 'book', author: 'Ian Goodfellow',
      publisher: 'MIT Press', cost: 75.00, budget: 1000.00,
      status: 'requested', requestedBy: 'user-1', supplier: 'Book Depository',
      notes: 'For ML team',
    }, 'user-1');
    assert.equal(acq.title, 'Deep Learning');
    assert.equal(acq.author, 'Ian Goodfellow');
    assert.equal(acq.cost, 75.00);
    assert.equal(acq.supplier, 'Book Depository');
  });

  it('gets an acquisition by id', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow();
    const acq = await CorporateLibraryService.getAcquisition('mem-a1');
    assert.ok(acq);
    assert.equal(acq!.title, 'Thinking, Fast and Slow');
  });

  it('returns null for wrong type on getAcquisition', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow({ type: 'library_item' });
    const acq = await CorporateLibraryService.getAcquisition('mem-a1');
    assert.equal(acq, null);
  });

  it('lists acquisitions by organization', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'library_acquisition') return [makeAcquisitionRow()];
      return [];
    };
    const list = await CorporateLibraryService.listAcquisitions('org-1');
    assert.equal(list.length, 1);
  });

  it('updates an acquisition', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow();
    memUpdateImpl = async (args) => makeAcquisitionRow({ id: 'mem-a1', content: args.data.content as string });
    const acq = await CorporateLibraryService.updateAcquisition('mem-a1', { cost: 30.00 });
    assert.ok(acq);
    assert.equal(acq!.cost, 30.00);
  });

  it('deletes an acquisition', async () => {
    memDeleteImpl = async () => ({ id: 'mem-a1' });
    const ok = await CorporateLibraryService.deleteAcquisition('mem-a1');
    assert.equal(ok, true);
  });

  it('approveAcquisition sets status to approved', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow();
    memUpdateImpl = async (args) => makeAcquisitionRow({ id: 'mem-a1', content: args.data.content as string });
    const acq = await CorporateLibraryService.approveAcquisition('mem-a1', 'user-1');
    assert.ok(acq);
    assert.equal(acq!.status, 'approved');
    assert.equal(acq!.approvedBy, 'user-1');
  });

  it('orderAcquisition sets status to ordered', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow();
    memUpdateImpl = async (args) => makeAcquisitionRow({ id: 'mem-a1', content: args.data.content as string });
    const acq = await CorporateLibraryService.orderAcquisition('mem-a1', 'user-1');
    assert.ok(acq);
    assert.equal(acq!.status, 'ordered');
    assert.ok(acq!.orderedDate);
  });

  it('receiveAcquisition sets status to received', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow();
    memUpdateImpl = async (args) => makeAcquisitionRow({ id: 'mem-a1', content: args.data.content as string });
    const acq = await CorporateLibraryService.receiveAcquisition('mem-a1', 'user-1');
    assert.ok(acq);
    assert.equal(acq!.status, 'received');
    assert.ok(acq!.receivedDate);
  });

  it('rejectAcquisition sets status to rejected', async () => {
    memFindUniqueImpl = async () => makeAcquisitionRow();
    memUpdateImpl = async (args) => makeAcquisitionRow({ id: 'mem-a1', content: args.data.content as string });
    const acq = await CorporateLibraryService.rejectAcquisition('mem-a1', 'user-1');
    assert.ok(acq);
    assert.equal(acq!.status, 'rejected');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests — Metrics & Stats
// ─────────────────────────────────────────────────────────────────────────────

describe('CorporateLibraryService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('getCorporateLibraryMetrics returns correct counts', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'library_item') return [
        makeRow({ content: JSON.stringify({ title: 'I1', type: 'book', status: 'available', quantity: 3, author: '', isbn: '', publisher: '', publicationYear: 0, edition: '', category: '', description: '', location: '', availableQuantity: 0, keywords: [], notes: '' }) }),
        makeRow({ id: 'i2', content: JSON.stringify({ title: 'I2', type: 'journal', status: 'checked_out', quantity: 2, author: '', isbn: '', publisher: '', publicationYear: 0, edition: '', category: '', description: '', location: '', availableQuantity: 0, keywords: [], notes: '' }) }),
      ];
      if (t === 'library_loan') return [
        makeLoanRow({ content: JSON.stringify({ itemId: 'i1', borrowerId: 'u1', borrowerName: 'A', status: 'overdue', checkoutDate: null, dueDate: null, returnDate: null, renewedDate: null, condition: '', notes: '' }) }),
      ];
      if (t === 'library_reservation') return [
        makeReservationRow({ content: JSON.stringify({ itemId: 'i1', reserverId: 'u2', reserverName: 'B', status: 'pending', reservedDate: null, expiryDate: null, fulfilledDate: null, notes: '' }) }),
      ];
      if (t === 'library_acquisition') return [
        makeAcquisitionRow({ content: JSON.stringify({ title: 'A1', type: 'book', status: 'requested', author: '', publisher: '', cost: 0, budget: 0, requestedBy: '', approvedBy: '', orderedDate: null, receivedDate: null, supplier: '', notes: '' }) }),
      ];
      return [];
    };
    const m = await CorporateLibraryService.getCorporateLibraryMetrics('org-1');
    assert.equal(m.totalItems, 2);
    assert.equal(m.availableItems, 1);
    assert.equal(m.checkedOutItems, 1);
    assert.equal(m.overdueLoans, 1);
    assert.equal(m.activeReservations, 1);
    assert.equal(m.pendingAcquisitions, 1);
    assert.equal(m.totalInventoryValue, 5);
  });

  it('getCorporateLibraryStats returns correct breakdowns', async () => {
    memFindManyImpl = async (args) => {
      const t = (args.where as Record<string, unknown>).type as string;
      if (t === 'library_item') return [makeRow()];
      if (t === 'library_loan') return [makeLoanRow()];
      if (t === 'library_reservation') return [makeReservationRow()];
      if (t === 'library_acquisition') return [makeAcquisitionRow()];
      return [];
    };
    const s = await CorporateLibraryService.getCorporateLibraryStats('org-1');
    assert.equal(s.itemCount, 1);
    assert.equal(s.loanCount, 1);
    assert.equal(s.activeLoanCount, 1);
    assert.equal(s.reservationCount, 1);
    assert.equal(s.pendingReservationCount, 1);
    assert.equal(s.acquisitionCount, 1);
    assert.equal(s.pendingAcquisitionCount, 1);
    assert.equal(s.byItemType['book'], 1);
    assert.equal(s.byItemStatus['available'], 1);
    assert.equal(s.byLoanStatus['active'], 1);
    assert.equal(s.byReservationStatus['pending'], 1);
    assert.equal(s.byAcquisitionType['book'], 1);
    assert.equal(s.byAcquisitionStatus['requested'], 1);
  });
});
