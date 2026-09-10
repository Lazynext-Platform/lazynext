import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Finance Service ──

export const FinanceService = {
  /**
   * List transactions for a workspace with optional type/category/status filter.
   */
  async list(workspaceId: string, filters?: {
    type?: string;
    category?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return safePrisma(() =>
      prisma.transaction.findMany({
        where: {
          workspaceId,
          ...(filters?.type && { type: filters.type }),
          ...(filters?.category && { category: filters.category }),
          ...(filters?.status && { status: filters.status }),
          ...(filters?.startDate && { date: { gte: filters.startDate } }),
          ...(filters?.endDate && { date: { lte: filters.endDate } }),
        },
        orderBy: { date: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Create a new transaction.
   */
  async create(input: {
    organizationId: string;
    workspaceId?: string;
    type: string;
    category: string;
    amount: number;
    currency?: string;
    description?: string;
    date?: Date;
    status?: string;
    source?: string;
    reference?: string;
    createdBy?: string;
  }) {
    return prisma.transaction.create({
      data: {
        organizationId: input.organizationId,
        workspaceId: input.workspaceId || null,
        type: input.type,
        category: input.category,
        amount: input.amount,
        currency: input.currency || 'USD',
        description: input.description?.slice(0, 2000) || null,
        date: input.date || new Date(),
        status: input.status || 'confirmed',
        source: input.source?.slice(0, 100) || null,
        reference: input.reference?.slice(0, 200) || null,
        createdBy: input.createdBy || null,
      },
    });
  },

  /**
   * Get summary: income, expense, and net totals for a period.
   */
  async getSummary(workspaceId: string, startDate?: Date, endDate?: Date) {
    const where = {
      workspaceId,
      ...(startDate && { date: { gte: startDate } }),
      ...(endDate && { date: { lte: endDate } }),
    };

    const transactions = await safePrisma(() =>
      prisma.transaction.findMany({
        where,
        select: { type: true, amount: true },
      }),
    []);

    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount;
      else if (tx.type === 'expense') expense += tx.amount;
    }
    return {
      income,
      expense,
      net: income - expense,
      count: transactions.length,
    };
  },

  /**
   * Get totals grouped by category.
   */
  async getByCategory(workspaceId: string, startDate?: Date, endDate?: Date) {
    const where = {
      workspaceId,
      ...(startDate && { date: { gte: startDate } }),
      ...(endDate && { date: { lte: endDate } }),
    };

    const transactions = await safePrisma(() =>
      prisma.transaction.findMany({
        where,
        select: { category: true, type: true, amount: true },
      }),
    []);

    const byCategory: Record<string, { income: number; expense: number; net: number; count: number }> = {};
    for (const tx of transactions) {
      if (!byCategory[tx.category]) {
        byCategory[tx.category] = { income: 0, expense: 0, net: 0, count: 0 };
      }
      if (tx.type === 'income') byCategory[tx.category].income += tx.amount;
      else if (tx.type === 'expense') byCategory[tx.category].expense += tx.amount;
      byCategory[tx.category].net = byCategory[tx.category].income - byCategory[tx.category].expense;
      byCategory[tx.category].count += 1;
    }
    return byCategory;
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Phase 11: Finance & Billing v2
  // ───────────────────────────────────────────────────────────────────────────

  // ── Invoices ──

  /**
   * Generate the next sequential invoice number for an organization (e.g. INV-0001).
   */
  async getInvoiceNumber(organizationId: string): Promise<string> {
    const count = await safePrisma(() =>
      prisma.invoice.count({ where: { organizationId } }),
    0);
    const next = count + 1;
    return `INV-${String(next).padStart(4, '0')}`;
  },

  /**
   * Create an invoice with line items, calculating subtotal/tax/discount/total.
   */
  async createInvoice(organizationId: string, input: {
    workspaceId?: string;
    customerId?: string;
    type?: string;
    issueDate?: Date;
    dueDate: Date;
    taxRate?: number;
    discountRate?: number;
    currency?: string;
    notes?: string;
    terms?: string;
    createdBy?: string;
    lineItems: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
      discountRate?: number;
      category?: string;
    }>;
  }) {
    // Calculate line item totals and subtotal
    let subtotal = 0;
    const lineItemsData = input.lineItems.map((li) => {
      const qty = li.quantity ?? 1;
      const unitPrice = li.unitPrice ?? 0;
      const lineTaxRate = li.taxRate ?? 0;
      const lineDiscountRate = li.discountRate ?? 0;
      const gross = qty * unitPrice;
      const lineDiscount = gross * (lineDiscountRate / 100);
      const afterDiscount = gross - lineDiscount;
      const lineTax = afterDiscount * (lineTaxRate / 100);
      const total = afterDiscount + lineTax;
      subtotal += gross;
      return {
        description: li.description.slice(0, 1000),
        quantity: qty,
        unitPrice,
        taxRate: lineTaxRate,
        discountRate: lineDiscountRate,
        total,
        category: li.category?.slice(0, 100) || null,
      };
    });

    const taxRate = input.taxRate ?? 0;
    const discountRate = input.discountRate ?? 0;
    const discountAmount = subtotal * (discountRate / 100);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * (taxRate / 100);
    const total = afterDiscount + taxAmount;

    const number = await this.getInvoiceNumber(organizationId);

    return prisma.invoice.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        customerId: input.customerId || null,
        number,
        status: 'draft',
        type: input.type || 'sales',
        issueDate: input.issueDate || new Date(),
        dueDate: input.dueDate,
        subtotal,
        taxRate,
        taxAmount,
        discountRate,
        discountAmount,
        total,
        currency: input.currency || 'USD',
        notes: input.notes?.slice(0, 5000) || '',
        terms: input.terms?.slice(0, 5000) || '',
        createdBy: input.createdBy || null,
        lineItems: { create: lineItemsData },
      },
      include: { lineItems: true },
    });
  },

  /**
   * List invoices for an organization with optional filters.
   */
  async listInvoices(organizationId: string, opts?: {
    status?: string;
    customerId?: string;
    startDate?: Date;
    endDate?: Date;
    type?: string;
  }) {
    return safePrisma(() =>
      prisma.invoice.findMany({
        where: {
          organizationId,
          ...(opts?.status && { status: opts.status }),
          ...(opts?.customerId && { customerId: opts.customerId }),
          ...(opts?.type && { type: opts.type }),
          ...(opts?.startDate && { issueDate: { gte: opts.startDate } }),
          ...(opts?.endDate && { issueDate: { lte: opts.endDate } }),
        },
        include: { lineItems: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single invoice with line items.
   */
  async getInvoice(id: string) {
    return safePrisma(() =>
      prisma.invoice.findUnique({
        where: { id },
        include: { lineItems: true },
      }),
    null);
  },

  /**
   * Update an invoice (only allowed when status is draft).
   */
  async updateInvoice(id: string, input: {
    customerId?: string;
    type?: string;
    dueDate?: Date;
    taxRate?: number;
    discountRate?: number;
    currency?: string;
    notes?: string;
    terms?: string;
    status?: string;
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      taxRate?: number;
      discountRate?: number;
      category?: string;
    }>;
  }) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new Error('invoice_not_found');
    if (existing.status !== 'draft') {
      throw new Error('invoice_not_editable');
    }

    const updateData: Record<string, unknown> = {};
    if (input.customerId !== undefined) updateData.customerId = input.customerId || null;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.dueDate !== undefined) updateData.dueDate = input.dueDate;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.notes !== undefined) updateData.notes = input.notes.slice(0, 5000);
    if (input.terms !== undefined) updateData.terms = input.terms.slice(0, 5000);
    if (input.status !== undefined) updateData.status = input.status;

    // Recalculate totals if line items or rates change
    let lineItemsData: Array<Record<string, unknown>> | undefined;
    if (input.lineItems) {
      let subtotal = 0;
      lineItemsData = input.lineItems.map((li) => {
        const qty = li.quantity ?? 1;
        const unitPrice = li.unitPrice ?? 0;
        const lineTaxRate = li.taxRate ?? 0;
        const lineDiscountRate = li.discountRate ?? 0;
        const gross = qty * unitPrice;
        const lineDiscount = gross * (lineDiscountRate / 100);
        const afterDiscount = gross - lineDiscount;
        const lineTax = afterDiscount * (lineTaxRate / 100);
        const total = afterDiscount + lineTax;
        subtotal += gross;
        return {
          description: li.description.slice(0, 1000),
          quantity: qty,
          unitPrice,
          taxRate: lineTaxRate,
          discountRate: lineDiscountRate,
          total,
          category: li.category?.slice(0, 100) || null,
        };
      });
      const taxRate = input.taxRate ?? existing.taxRate;
      const discountRate = input.discountRate ?? existing.discountRate;
      const discountAmount = subtotal * (discountRate / 100);
      const afterDiscount = subtotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const total = afterDiscount + taxAmount;
      updateData.subtotal = subtotal;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.discountRate = discountRate;
      updateData.discountAmount = discountAmount;
      updateData.total = total;
    } else if (input.taxRate !== undefined || input.discountRate !== undefined) {
      const taxRate = input.taxRate ?? existing.taxRate;
      const discountRate = input.discountRate ?? existing.discountRate;
      const discountAmount = existing.subtotal * (discountRate / 100);
      const afterDiscount = existing.subtotal - discountAmount;
      const taxAmount = afterDiscount * (taxRate / 100);
      const total = afterDiscount + taxAmount;
      updateData.taxRate = taxRate;
      updateData.taxAmount = taxAmount;
      updateData.discountRate = discountRate;
      updateData.discountAmount = discountAmount;
      updateData.total = total;
    }

    // Replace line items if provided
    if (lineItemsData) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: id } }).catch(() => {});
      updateData.lineItems = { create: lineItemsData };
    }

    return prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { lineItems: true },
    });
  },

  /**
   * Mark an invoice as sent and set sentAt.
   */
  async sendInvoice(id: string) {
    return prisma.invoice.update({
      where: { id },
      data: { status: 'sent', sentAt: new Date() },
      include: { lineItems: true },
    });
  },

  /**
   * Record a payment against an invoice. Updates paidAmount; marks paid when fully paid.
   */
  async recordPayment(id: string, amount: number) {
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new Error('invoice_not_found');

    const newPaidAmount = invoice.paidAmount + amount;
    const fullyPaid = newPaidAmount >= invoice.total;
    const data: Record<string, unknown> = { paidAmount: newPaidAmount };
    if (fullyPaid) {
      data.status = 'paid';
      data.paidAt = new Date();
    }

    return prisma.invoice.update({
      where: { id },
      data,
      include: { lineItems: true },
    });
  },

  /**
   * Mark an invoice as cancelled.
   */
  async cancelInvoice(id: string) {
    return prisma.invoice.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { lineItems: true },
    });
  },

  /**
   * Delete an invoice (only allowed when draft).
   */
  async deleteInvoice(id: string) {
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) throw new Error('invoice_not_found');
    if (existing.status !== 'draft') {
      throw new Error('invoice_not_deletable');
    }
    return prisma.invoice.delete({ where: { id } });
  },

  // ── Expenses ──

  /**
   * Create a new expense.
   */
  async createExpense(organizationId: string, input: {
    workspaceId?: string;
    vendor: string;
    description?: string;
    category?: string;
    amount: number;
    currency?: string;
    status?: string;
    expenseDate?: Date;
    receiptUrl?: string;
    submittedBy?: string;
    tags?: string[];
  }) {
    return prisma.expense.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        vendor: input.vendor.slice(0, 300),
        description: input.description?.slice(0, 5000) || '',
        category: input.category || 'general',
        amount: input.amount,
        currency: input.currency || 'USD',
        status: input.status || 'pending',
        expenseDate: input.expenseDate || new Date(),
        receiptUrl: input.receiptUrl?.slice(0, 1000) || null,
        submittedBy: input.submittedBy || null,
        tags: JSON.stringify(input.tags || []),
      },
    });
  },

  /**
   * List expenses for an organization with optional filters.
   */
  async listExpenses(organizationId: string, opts?: {
    status?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return safePrisma(() =>
      prisma.expense.findMany({
        where: {
          organizationId,
          ...(opts?.status && { status: opts.status }),
          ...(opts?.category && { category: opts.category }),
          ...(opts?.startDate && { expenseDate: { gte: opts.startDate } }),
          ...(opts?.endDate && { expenseDate: { lte: opts.endDate } }),
        },
        orderBy: { expenseDate: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single expense by ID.
   */
  async getExpense(id: string) {
    return safePrisma(() =>
      prisma.expense.findUnique({ where: { id } }),
    null);
  },

  /**
   * Update an expense.
   */
  async updateExpense(id: string, input: {
    vendor?: string;
    description?: string;
    category?: string;
    amount?: number;
    currency?: string;
    status?: string;
    receiptUrl?: string;
  }) {
    const updateData: Record<string, unknown> = {};
    if (input.vendor !== undefined) updateData.vendor = input.vendor.slice(0, 300);
    if (input.description !== undefined) updateData.description = input.description.slice(0, 5000);
    if (input.category !== undefined) updateData.category = input.category;
    if (input.amount !== undefined) updateData.amount = input.amount;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.receiptUrl !== undefined) updateData.receiptUrl = input.receiptUrl || null;
    return prisma.expense.update({ where: { id }, data: updateData });
  },

  /**
   * Approve an expense.
   */
  async approveExpense(id: string, approvedBy: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'approved', approvedBy, approvedAt: new Date() },
    });
  },

  /**
   * Reject an expense.
   */
  async rejectExpense(id: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'rejected' },
    });
  },

  /**
   * Mark an expense as reimbursed.
   */
  async reimburseExpense(id: string) {
    return prisma.expense.update({
      where: { id },
      data: { status: 'reimbursed' },
    });
  },

  /**
   * Get expense summary: total by category, by month, pending count.
   */
  async getExpenseSummary(organizationId: string, opts?: {
    startDate?: Date;
    endDate?: Date;
  }) {
    const expenses = await safePrisma(() =>
      prisma.expense.findMany({
        where: {
          organizationId,
          ...(opts?.startDate && { expenseDate: { gte: opts.startDate } }),
          ...(opts?.endDate && { expenseDate: { lte: opts.endDate } }),
        },
        select: { category: true, amount: true, status: true, expenseDate: true },
      }),
    []);

    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    let pendingCount = 0;
    let total = 0;
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
      const monthKey = `${e.expenseDate.getFullYear()}-${String(e.expenseDate.getMonth() + 1).padStart(2, '0')}`;
      byMonth[monthKey] = (byMonth[monthKey] || 0) + e.amount;
      total += e.amount;
      if (e.status === 'pending') pendingCount += 1;
    }
    return { total, byCategory, byMonth, pendingCount, count: expenses.length };
  },

  // ── Revenue Recognition ──

  /**
   * Recognize revenue for a period.
   */
  async recognizeRevenue(organizationId: string, input: {
    invoiceId?: string;
    amount: number;
    recognizedDate?: Date;
    period: string;
    type?: string;
    notes?: string;
  }) {
    return prisma.revenueRecognition.create({
      data: {
        organizationId,
        invoiceId: input.invoiceId || null,
        amount: input.amount,
        recognizedDate: input.recognizedDate || new Date(),
        period: input.period,
        type: input.type || 'sales',
        status: 'recognized',
        notes: input.notes?.slice(0, 5000) || '',
      },
    });
  },

  /**
   * List revenue recognitions for an organization by period.
   */
  async listRevenue(organizationId: string, opts?: {
    period?: string;
    type?: string;
    status?: string;
  }) {
    return safePrisma(() =>
      prisma.revenueRecognition.findMany({
        where: {
          organizationId,
          ...(opts?.period && { period: opts.period }),
          ...(opts?.type && { type: opts.type }),
          ...(opts?.status && { status: opts.status }),
        },
        orderBy: { recognizedDate: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Defer a revenue recognition (mark as deferred).
   */
  async deferRevenue(id: string) {
    return prisma.revenueRecognition.update({
      where: { id },
      data: { status: 'deferred' },
    });
  },

  /**
   * Get revenue summary for a period.
   */
  async getRevenueSummary(organizationId: string, period: string) {
    const records = await safePrisma(() =>
      prisma.revenueRecognition.findMany({
        where: { organizationId, period },
        select: { amount: true, type: true, status: true },
      }),
    []);

    const byType: Record<string, number> = {};
    let totalRecognized = 0;
    let totalDeferred = 0;
    for (const r of records) {
      byType[r.type] = (byType[r.type] || 0) + r.amount;
      if (r.status === 'recognized') totalRecognized += r.amount;
      else if (r.status === 'deferred') totalDeferred += r.amount;
    }
    return {
      total: totalRecognized + totalDeferred,
      recognized: totalRecognized,
      deferred: totalDeferred,
      byType,
      count: records.length,
    };
  },

  // ── Payroll ──

  /**
   * Create a payroll record, calculating netAmount = gross - taxWithheld + benefits.
   */
  async createPayroll(organizationId: string, input: {
    workspaceId?: string;
    employeeName: string;
    employeeId?: string;
    period: string;
    grossAmount: number;
    taxWithheld?: number;
    benefits?: number;
    payDate?: Date;
  }) {
    const taxWithheld = input.taxWithheld ?? 0;
    const benefits = input.benefits ?? 0;
    const netAmount = input.grossAmount - taxWithheld + benefits;
    return prisma.payrollRecord.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId || null,
        employeeName: input.employeeName.slice(0, 300),
        employeeId: input.employeeId || null,
        period: input.period,
        grossAmount: input.grossAmount,
        taxWithheld,
        netAmount,
        benefits,
        status: 'draft',
        payDate: input.payDate || null,
      },
    });
  },

  /**
   * List payroll records for an organization by period.
   */
  async listPayroll(organizationId: string, opts?: {
    period?: string;
    status?: string;
    employeeId?: string;
  }) {
    return safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: {
          organizationId,
          ...(opts?.period && { period: opts.period }),
          ...(opts?.status && { status: opts.status }),
          ...(opts?.employeeId && { employeeId: opts.employeeId }),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single payroll record by ID.
   */
  async getPayroll(id: string) {
    return safePrisma(() =>
      prisma.payrollRecord.findUnique({ where: { id } }),
    null);
  },

  /**
   * Approve a payroll record.
   */
  async approvePayroll(id: string) {
    return prisma.payrollRecord.update({
      where: { id },
      data: { status: 'approved' },
    });
  },

  /**
   * Mark a payroll record as paid.
   */
  async payPayroll(id: string, payDate?: Date) {
    return prisma.payrollRecord.update({
      where: { id },
      data: { status: 'paid', payDate: payDate || new Date() },
    });
  },

  /**
   * Get payroll summary for a period.
   */
  async getPayrollSummary(organizationId: string, period: string) {
    const records = await safePrisma(() =>
      prisma.payrollRecord.findMany({
        where: { organizationId, period },
        select: { grossAmount: true, taxWithheld: true, netAmount: true, benefits: true, status: true },
      }),
    []);

    let grossTotal = 0;
    let taxTotal = 0;
    let netTotal = 0;
    let benefitsTotal = 0;
    let paidCount = 0;
    for (const r of records) {
      grossTotal += r.grossAmount;
      taxTotal += r.taxWithheld;
      netTotal += r.netAmount;
      benefitsTotal += r.benefits;
      if (r.status === 'paid') paidCount += 1;
    }
    return {
      grossTotal,
      taxTotal,
      netTotal,
      benefitsTotal,
      paidCount,
      count: records.length,
    };
  },

  // ── Tax ──

  /**
   * Calculate tax for a period.
   */
  async calculateTax(organizationId: string, input: {
    period: string;
    type?: string;
    jurisdiction?: string;
    taxableAmount: number;
    taxRate: number;
    notes?: string;
  }) {
    const taxAmount = input.taxableAmount * (input.taxRate / 100);
    return prisma.taxRecord.create({
      data: {
        organizationId,
        period: input.period,
        type: input.type || 'sales_tax',
        jurisdiction: input.jurisdiction || '',
        taxableAmount: input.taxableAmount,
        taxRate: input.taxRate,
        taxAmount,
        status: 'calculated',
        notes: input.notes?.slice(0, 5000) || '',
      },
    });
  },

  /**
   * List tax records for an organization by period/type.
   */
  async listTaxRecords(organizationId: string, opts?: {
    period?: string;
    type?: string;
    status?: string;
  }) {
    return safePrisma(() =>
      prisma.taxRecord.findMany({
        where: {
          organizationId,
          ...(opts?.period && { period: opts.period }),
          ...(opts?.type && { type: opts.type }),
          ...(opts?.status && { status: opts.status }),
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    []);
  },

  /**
   * Get a single tax record by ID.
   */
  async getTaxRecord(id: string) {
    return safePrisma(() =>
      prisma.taxRecord.findUnique({ where: { id } }),
    null);
  },

  /**
   * Mark a tax record as filed.
   */
  async fileTax(id: string) {
    return prisma.taxRecord.update({
      where: { id },
      data: { status: 'filed', filedAt: new Date() },
    });
  },

  /**
   * Mark a tax record as paid.
   */
  async payTax(id: string) {
    return prisma.taxRecord.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    });
  },

  /**
   * Get tax summary for a period.
   */
  async getTaxSummary(organizationId: string, period: string) {
    const records = await safePrisma(() =>
      prisma.taxRecord.findMany({
        where: { organizationId, period },
        select: { type: true, taxAmount: true, taxableAmount: true, status: true },
      }),
    []);

    const byType: Record<string, number> = {};
    let totalTax = 0;
    let totalTaxable = 0;
    let filedCount = 0;
    let paidCount = 0;
    for (const r of records) {
      byType[r.type] = (byType[r.type] || 0) + r.taxAmount;
      totalTax += r.taxAmount;
      totalTaxable += r.taxableAmount;
      if (r.status === 'filed') filedCount += 1;
      if (r.status === 'paid') paidCount += 1;
    }
    return {
      totalTax,
      totalTaxable,
      byType,
      filedCount,
      paidCount,
      count: records.length,
    };
  },

  // ── Reports ──

  /**
   * Get a combined financial report for a date range.
   */
  async getFinancialReport(organizationId: string, opts: {
    startDate: Date;
    endDate: Date;
    period?: string;
  }) {
    const [invoices, expenses, taxRecords, payrollRecords] = await Promise.all([
      safePrisma(() =>
        prisma.invoice.findMany({
          where: {
            organizationId,
            issueDate: { gte: opts.startDate, lte: opts.endDate },
          },
          select: { total: true, paidAmount: true, status: true, dueDate: true },
        }),
      []),
      safePrisma(() =>
        prisma.expense.findMany({
          where: {
            organizationId,
            expenseDate: { gte: opts.startDate, lte: opts.endDate },
          },
          select: { amount: true, category: true },
        }),
      []),
      safePrisma(() =>
        prisma.taxRecord.findMany({
          where: { organizationId, period: opts.period || '' },
          select: { taxAmount: true, status: true },
        }),
      []),
      safePrisma(() =>
        prisma.payrollRecord.findMany({
          where: { organizationId, period: opts.period || '' },
          select: { netAmount: true, status: true },
        }),
      []),
    ]);

    const revenue = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.paidAmount, 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - expensesTotal;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    const invoiceTotal = invoices.reduce((sum, i) => sum + i.total, 0);
    const invoicePaid = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const outstanding = invoiceTotal - invoicePaid;
    const now = new Date();
    const overdue = invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'void' && i.dueDate < now)
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0);

    const expenseBreakdown: Record<string, number> = {};
    for (const e of expenses) {
      expenseBreakdown[e.category] = (expenseBreakdown[e.category] || 0) + e.amount;
    }

    const taxLiability = taxRecords
      .filter((t) => t.status !== 'paid')
      .reduce((sum, t) => sum + t.taxAmount, 0);

    const payrollTotal = payrollRecords
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.netAmount, 0);

    return {
      revenue,
      expenses: expensesTotal,
      profit,
      profitMargin,
      invoices: {
        total: invoiceTotal,
        paid: invoicePaid,
        outstanding,
        overdue,
      },
      expenseBreakdown,
      taxLiability,
      payrollTotal,
    };
  },

  /**
   * Get a profit & loss statement for a date range.
   */
  async getProfitLoss(organizationId: string, startDate: Date, endDate: Date) {
    const [invoices, expenses] = await Promise.all([
      safePrisma(() =>
        prisma.invoice.findMany({
          where: {
            organizationId,
            issueDate: { gte: startDate, lte: endDate },
            status: 'paid',
          },
          select: { subtotal: true, taxAmount: true, discountAmount: true, total: true },
        }),
      []),
      safePrisma(() =>
        prisma.expense.findMany({
          where: {
            organizationId,
            expenseDate: { gte: startDate, lte: endDate },
          },
          select: { amount: true, category: true },
        }),
      []),
    ]);

    const revenue = invoices.reduce((sum, i) => sum + i.subtotal, 0);
    const discounts = invoices.reduce((sum, i) => sum + i.discountAmount, 0);
    const taxCollected = invoices.reduce((sum, i) => sum + i.taxAmount, 0);

    const expenseByCategory: Record<string, number> = {};
    let totalExpenses = 0;
    for (const e of expenses) {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
      totalExpenses += e.amount;
    }

    const grossProfit = revenue - totalExpenses;
    const netProfit = grossProfit;

    return {
      revenue,
      discounts,
      taxCollected,
      expenses: expenseByCategory,
      totalExpenses,
      grossProfit,
      netProfit,
      period: { startDate, endDate },
    };
  },

  /**
   * Get a cash flow summary for a date range.
   */
  async getCashFlow(organizationId: string, startDate: Date, endDate: Date) {
    const [invoices, expenses, payrollRecords] = await Promise.all([
      safePrisma(() =>
        prisma.invoice.findMany({
          where: {
            organizationId,
            issueDate: { gte: startDate, lte: endDate },
          },
          select: { paidAmount: true, status: true, paidAt: true },
        }),
      []),
      safePrisma(() =>
        prisma.expense.findMany({
          where: {
            organizationId,
            expenseDate: { gte: startDate, lte: endDate },
            status: { in: ['approved', 'reimbursed'] },
          },
          select: { amount: true },
        }),
      []),
      safePrisma(() =>
        prisma.payrollRecord.findMany({
          where: {
            organizationId,
            payDate: { gte: startDate, lte: endDate },
            status: 'paid',
          },
          select: { netAmount: true },
        }),
      []),
    ]);

    const cashIn = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const expenseOut = expenses.reduce((sum, e) => sum + e.amount, 0);
    const payrollOut = payrollRecords.reduce((sum, p) => sum + p.netAmount, 0);
    const cashOut = expenseOut + payrollOut;
    const netCashFlow = cashIn - cashOut;

    return {
      cashIn,
      cashOut,
      netCashFlow,
      operating: { cashIn, expenseOut, payrollOut },
      period: { startDate, endDate },
    };
  },

  /**
   * Get a simple balance sheet as of a date (assets, liabilities, equity).
   */
  async getBalanceSheet(organizationId: string, asOfDate: Date) {
    const [invoices, expenses, taxRecords] = await Promise.all([
      safePrisma(() =>
        prisma.invoice.findMany({
          where: {
            organizationId,
            issueDate: { lte: asOfDate },
          },
          select: { total: true, paidAmount: true, status: true },
        }),
      []),
      safePrisma(() =>
        prisma.expense.findMany({
          where: {
            organizationId,
            expenseDate: { lte: asOfDate },
          },
          select: { amount: true, status: true },
        }),
      []),
      safePrisma(() =>
        prisma.taxRecord.findMany({
          where: {
            organizationId,
          },
          select: { taxAmount: true, status: true },
        }),
      []),
    ]);

    // Assets: accounts receivable (unpaid invoice totals) + cash (paid invoices)
    const accountsReceivable = invoices
      .filter((i) => i.status !== 'cancelled' && i.status !== 'void')
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0);
    const cash = invoices.reduce((sum, i) => sum + i.paidAmount, 0);

    // Liabilities: unpaid taxes + unpaid expenses
    const taxLiability = taxRecords
      .filter((t) => t.status !== 'paid')
      .reduce((sum, t) => sum + t.taxAmount, 0);
    const unpaidExpenses = expenses
      .filter((e) => e.status === 'approved' || e.status === 'reimbursed')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalAssets = cash + accountsReceivable;
    const totalLiabilities = taxLiability + unpaidExpenses;
    const equity = totalAssets - totalLiabilities;

    return {
      asOfDate,
      assets: { cash, accountsReceivable, total: totalAssets },
      liabilities: { taxLiability, unpaidExpenses, total: totalLiabilities },
      equity,
    };
  },

  /**
   * Get a financial dashboard summary: monthly revenue, expenses, profit,
   * outstanding invoices, recent expenses, tax liability, payroll.
   */
  async getFinancialDashboard(organizationId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [invoices, expenses, taxRecords, payrollRecords, recentExpenses] = await Promise.all([
      safePrisma(() =>
        prisma.invoice.findMany({
          where: { organizationId, issueDate: { gte: monthStart } },
          select: { total: true, paidAmount: true, status: true, dueDate: true, number: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      []),
      safePrisma(() =>
        prisma.expense.findMany({
          where: { organizationId, expenseDate: { gte: monthStart } },
          select: { amount: true, category: true },
        }),
      []),
      safePrisma(() =>
        prisma.taxRecord.findMany({
          where: { organizationId, period },
          select: { taxAmount: true, status: true },
        }),
      []),
      safePrisma(() =>
        prisma.payrollRecord.findMany({
          where: { organizationId, period },
          select: { netAmount: true, status: true },
        }),
      []),
      safePrisma(() =>
        prisma.expense.findMany({
          where: { organizationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, vendor: true, amount: true, category: true, status: true, expenseDate: true },
        }),
      []),
    ]);

    const revenue = invoices.reduce((sum, i) => sum + i.paidAmount, 0);
    const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - expensesTotal;

    const outstanding = invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'void')
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0);
    const overdue = invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled' && i.status !== 'void' && i.dueDate < now)
      .reduce((sum, i) => sum + (i.total - i.paidAmount), 0);

    const taxLiability = taxRecords
      .filter((t) => t.status !== 'paid')
      .reduce((sum, t) => sum + t.taxAmount, 0);

    const payrollTotal = payrollRecords
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.netAmount, 0);

    // Monthly trend (last 6 months)
    const monthly: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly.push({ month: mKey, revenue: 0, expenses: 0, profit: 0 });
    }

    return {
      revenue,
      expenses: expensesTotal,
      profit,
      outstanding,
      overdue,
      taxLiability,
      payrollTotal,
      recentInvoices: invoices,
      recentExpenses,
      monthly,
      period,
    };
  },
};
