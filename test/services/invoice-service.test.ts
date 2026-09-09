import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number; include?: unknown; select?: unknown };
type FindUniqueArgs = { where: Record<string, unknown>; include?: unknown; select?: unknown };
type CreateArgs = { data: Record<string, unknown>; include?: unknown };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown>; include?: unknown };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

interface CallRecord {
  method: string;
  args?: unknown;
}

const calls: CallRecord[] = [];

let invoiceFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let invoiceFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let invoiceCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let invoiceUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let invoiceDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

let lineItemCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let lineItemDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});

const prismaMock = {
  invoice: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'invoice.findMany', args }); return invoiceFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'invoice.findUnique', args }); return invoiceFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'invoice.create', args }); return invoiceCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'invoice.update', args }); return invoiceUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'invoice.delete', args }); return invoiceDeleteImpl(args); },
  },
  invoiceLineItem: {
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'invoiceLineItem.create', args }); return lineItemCreateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'invoiceLineItem.delete', args }); return lineItemDeleteImpl(args); },
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
  invoiceFindManyImpl = async () => [];
  invoiceFindUniqueImpl = async () => null;
  invoiceCreateImpl = async () => ({});
  invoiceUpdateImpl = async () => ({});
  invoiceDeleteImpl = async () => ({});
  lineItemCreateImpl = async () => ({});
  lineItemDeleteImpl = async () => ({});
}

function makeInvoiceRow(id: string, overrides: Partial<Record<string, unknown>> = {}): unknown {
  return {
    id,
    organizationId: 'org-1',
    workspaceId: null,
    customerId: 'cust-1',
    number: 'INV-2025-0001',
    status: 'draft',
    type: 'sales',
    issueDate: new Date('2025-01-01'),
    dueDate: new Date('2025-02-01'),
    subtotal: 1000,
    taxRate: 10,
    taxAmount: 100,
    discountRate: 0,
    discountAmount: 0,
    total: 1100,
    currency: 'USD',
    notes: '',
    terms: '',
    paidAmount: 0,
    paidAt: null,
    sentAt: null,
    createdBy: 'user-1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    lineItems: [],
    ...overrides,
  };
}

const { InvoiceService, calculateTotals } = await import('@/lib/services/invoice-service');

// ─────────────────────────────────────────────────────────────────────────────
// calculateTotals (pure function)
// ─────────────────────────────────────────────────────────────────────────────

describe('calculateTotals', () => {
  it('calculates totals for simple line items', () => {
    const result = calculateTotals([
      { description: 'Item 1', quantity: 2, unitPrice: 100 },
      { description: 'Item 2', quantity: 1, unitPrice: 50 },
    ], 0, 0);

    assert.equal(result.subtotal, 250);
    assert.equal(result.taxAmount, 0);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.total, 250);
  });

  it('calculates totals with tax', () => {
    const result = calculateTotals([
      { description: 'Item 1', quantity: 1, unitPrice: 100 },
    ], 10, 0);

    assert.equal(result.subtotal, 100);
    assert.equal(result.taxAmount, 10);
    assert.equal(result.total, 110);
  });

  it('calculates totals with discount', () => {
    const result = calculateTotals([
      { description: 'Item 1', quantity: 1, unitPrice: 100 },
    ], 0, 20);

    assert.equal(result.subtotal, 100);
    assert.equal(result.discountAmount, 20);
    assert.equal(result.total, 80);
  });

  it('calculates totals with line item discount', () => {
    const result = calculateTotals([
      { description: 'Item 1', quantity: 1, unitPrice: 100, discountRate: 50 },
    ], 0, 0);

    assert.equal(result.subtotal, 50);
    assert.equal(result.total, 50);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// InvoiceService
// ─────────────────────────────────────────────────────────────────────────────

describe('InvoiceService', () => {
  beforeEach(() => { resetMock(); });

  describe('create', () => {
    it('creates an invoice with auto-generated number', async () => {
      invoiceFindManyImpl = async () => [];
      invoiceCreateImpl = async (args: CreateArgs) => {
        const number = args.data.number as string;
        assert.ok(number.startsWith('INV-'));
        assert.equal(args.data.status, 'draft');
        assert.equal(args.data.type, 'sales');
        return makeInvoiceRow('inv-1', { number });
      };

      const invoice = await InvoiceService.create({
        organizationId: 'org-1',
        dueDate: new Date('2025-02-01'),
        lineItems: [{ description: 'Item 1', quantity: 1, unitPrice: 100 }],
        createdBy: 'user-1',
      });

      assert.ok(invoice);
      assert.equal(invoice.id, 'inv-1');
      assert.ok(invoice.number.startsWith('INV-'));
    });

    it('calculates totals from line items', async () => {
      invoiceFindManyImpl = async () => [];
      invoiceCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.subtotal, 200);
        assert.equal(args.data.taxAmount, 20);
        assert.equal(args.data.total, 220);
        return makeInvoiceRow('inv-1', { ...args.data });
      };

      const invoice = await InvoiceService.create({
        organizationId: 'org-1',
        dueDate: new Date('2025-02-01'),
        taxRate: 10,
        lineItems: [
          { description: 'A', quantity: 2, unitPrice: 100 },
        ],
        createdBy: 'user-1',
      });

      assert.equal(invoice.subtotal, 200);
      assert.equal(invoice.taxAmount, 20);
      assert.equal(invoice.total, 220);
    });

    it('increments invoice number from existing', async () => {
      const year = new Date().getFullYear();
      invoiceFindManyImpl = async () => [{ number: `INV-${year}-0003` }];
      invoiceCreateImpl = async (args: CreateArgs) => {
        assert.equal(args.data.number, `INV-${year}-0004`);
        return makeInvoiceRow('inv-1', { number: args.data.number as string });
      };

      await InvoiceService.create({
        organizationId: 'org-1',
        dueDate: new Date('2025-02-01'),
        createdBy: 'user-1',
      });
    });
  });

  describe('get', () => {
    it('returns an invoice by id with line items', async () => {
      invoiceFindUniqueImpl = async () => makeInvoiceRow('inv-1', {
        lineItems: [{ id: 'li-1', invoiceId: 'inv-1', description: 'Item', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() }],
      });

      const invoice = await InvoiceService.get('inv-1');

      assert.ok(invoice);
      assert.equal(invoice.id, 'inv-1');
      assert.equal(invoice.lineItems.length, 1);
    });

    it('returns null when invoice not found', async () => {
      invoiceFindUniqueImpl = async () => null;

      const invoice = await InvoiceService.get('nope');
      assert.equal(invoice, null);
    });
  });

  describe('list', () => {
    it('returns invoices for an organization', async () => {
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1'),
        makeInvoiceRow('inv-2'),
      ];

      const invoices = await InvoiceService.list('org-1');

      assert.equal(invoices.length, 2);
      assert.equal(calls[0].method, 'invoice.findMany');
    });

    it('filters by status', async () => {
      invoiceFindManyImpl = async () => [];

      await InvoiceService.list('org-1', { status: 'paid' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.status, 'paid');
    });

    it('filters by type', async () => {
      invoiceFindManyImpl = async () => [];

      await InvoiceService.list('org-1', { type: 'sales' });

      const args = calls[0].args as FindManyArgs;
      assert.equal(args.where.type, 'sales');
    });

    it('returns empty array on error (safePrisma fallback)', async () => {
      invoiceFindManyImpl = async () => { throw new Error('DB down'); };

      const invoices = await InvoiceService.list('org-1');
      assert.deepEqual(invoices, []);
    });
  });

  describe('update', () => {
    it('updates invoice fields', async () => {
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.notes, 'Updated notes');
        return makeInvoiceRow('inv-1', { notes: 'Updated notes' });
      };

      const invoice = await InvoiceService.update('inv-1', { notes: 'Updated notes' });

      assert.ok(invoice);
      assert.equal(invoice.notes, 'Updated notes');
    });

    it('recalculates totals when taxRate changes', async () => {
      invoiceFindUniqueImpl = async () => makeInvoiceRow('inv-1', {
        taxRate: 0,
        lineItems: [{ id: 'li-1', invoiceId: 'inv-1', description: 'Item', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() }],
      });
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.taxRate, 10);
        assert.equal(args.data.taxAmount, 10);
        assert.equal(args.data.total, 110);
        return makeInvoiceRow('inv-1', { ...args.data });
      };

      const invoice = await InvoiceService.update('inv-1', { taxRate: 10 });

      assert.ok(invoice);
      assert.equal(invoice.taxRate, 10);
    });
  });

  describe('delete', () => {
    it('deletes an invoice', async () => {
      invoiceDeleteImpl = async () => ({ id: 'inv-1' });

      const result = await InvoiceService.delete('inv-1');
      assert.equal(result, true);
    });

    it('returns false on error', async () => {
      invoiceDeleteImpl = async () => { throw new Error('fail'); };

      const result = await InvoiceService.delete('inv-1');
      assert.equal(result, false);
    });
  });

  describe('changeStatus', () => {
    it('changes invoice status', async () => {
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'sent');
        return makeInvoiceRow('inv-1', { status: 'sent' });
      };

      const invoice = await InvoiceService.changeStatus('inv-1', 'sent');

      assert.ok(invoice);
      assert.equal(invoice.status, 'sent');
    });

    it('sets paidAt when status is paid', async () => {
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'paid');
        assert.ok(args.data.paidAt);
        return makeInvoiceRow('inv-1', { status: 'paid', paidAt: args.data.paidAt as Date });
      };

      const invoice = await InvoiceService.changeStatus('inv-1', 'paid');

      assert.ok(invoice);
      assert.equal(invoice.status, 'paid');
      assert.ok(invoice.paidAt);
    });
  });

  describe('send', () => {
    it('marks invoice as sent with sentAt', async () => {
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'sent');
        assert.ok(args.data.sentAt);
        return makeInvoiceRow('inv-1', { status: 'sent', sentAt: args.data.sentAt as Date });
      };

      const invoice = await InvoiceService.send('inv-1');

      assert.ok(invoice);
      assert.equal(invoice.status, 'sent');
      assert.ok(invoice.sentAt);
    });
  });

  describe('markPaid', () => {
    it('marks invoice as paid with paidAmount', async () => {
      invoiceFindUniqueImpl = async () => makeInvoiceRow('inv-1', { total: 1100 });
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.status, 'paid');
        assert.equal(args.data.paidAmount, 1100);
        return makeInvoiceRow('inv-1', { status: 'paid', paidAmount: 1100 });
      };

      const invoice = await InvoiceService.markPaid('inv-1');

      assert.ok(invoice);
      assert.equal(invoice.status, 'paid');
      assert.equal(invoice.paidAmount, 1100);
    });

    it('returns null when invoice not found', async () => {
      invoiceFindUniqueImpl = async () => null;

      const invoice = await InvoiceService.markPaid('nope');
      assert.equal(invoice, null);
    });
  });

  describe('addLineItem', () => {
    it('adds a line item and recalculates totals', async () => {
      invoiceFindUniqueImpl = async () => makeInvoiceRow('inv-1', {
        taxRate: 0,
        lineItems: [{ id: 'li-1', invoiceId: 'inv-1', description: 'A', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() }],
      });
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.subtotal, 200);
        assert.equal(args.data.total, 200);
        return makeInvoiceRow('inv-1', { ...args.data, lineItems: [
          { id: 'li-1', invoiceId: 'inv-1', description: 'A', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() },
          { id: 'li-2', invoiceId: 'inv-1', description: 'B', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() },
        ] });
      };

      const invoice = await InvoiceService.addLineItem('inv-1', {
        description: 'B',
        quantity: 1,
        unitPrice: 100,
      });

      assert.ok(invoice);
      assert.equal(invoice.subtotal, 200);
    });

    it('returns null when invoice not found', async () => {
      invoiceFindUniqueImpl = async () => null;

      const invoice = await InvoiceService.addLineItem('nope', { description: 'x' });
      assert.equal(invoice, null);
    });
  });

  describe('removeLineItem', () => {
    it('removes a line item and recalculates totals', async () => {
      invoiceFindUniqueImpl = async () => makeInvoiceRow('inv-1', {
        taxRate: 0,
        lineItems: [
          { id: 'li-1', invoiceId: 'inv-1', description: 'A', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() },
          { id: 'li-2', invoiceId: 'inv-1', description: 'B', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() },
        ],
      });
      invoiceUpdateImpl = async (args: UpdateArgs) => {
        assert.equal(args.data.subtotal, 100);
        assert.equal(args.data.total, 100);
        return makeInvoiceRow('inv-1', { ...args.data, lineItems: [
          { id: 'li-1', invoiceId: 'inv-1', description: 'A', quantity: 1, unitPrice: 100, taxRate: 0, discountRate: 0, total: 100, category: null, createdAt: new Date() },
        ] });
      };

      const invoice = await InvoiceService.removeLineItem('inv-1', 'li-2');

      assert.ok(invoice);
      assert.equal(invoice.subtotal, 100);
    });
  });

  describe('getStats', () => {
    it('aggregates invoice stats', async () => {
      invoiceFindManyImpl = async () => [
        makeInvoiceRow('inv-1', { status: 'paid', type: 'sales', total: 1000, paidAmount: 1000 }),
        makeInvoiceRow('inv-2', { status: 'sent', type: 'sales', total: 500, paidAmount: 0, dueDate: new Date('2020-01-01') }),
        makeInvoiceRow('inv-3', { status: 'draft', type: 'credit', total: 200, paidAmount: 0 }),
      ];

      const stats = await InvoiceService.getStats('org-1');

      assert.equal(stats.totalInvoices, 3);
      assert.equal(stats.byStatus.paid, 1);
      assert.equal(stats.byStatus.sent, 1);
      assert.equal(stats.byStatus.draft, 1);
      assert.equal(stats.byType.sales, 2);
      assert.equal(stats.byType.credit, 1);
      assert.equal(stats.totalRevenue, 1000);
      assert.ok(stats.totalOutstanding > 0);
    });
  });
});
