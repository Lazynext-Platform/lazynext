import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type BankAccountType = 'checking' | 'savings' | 'money_market' | 'escrow' | 'payroll' | 'merchant';
export type BankAccountStatus = 'active' | 'frozen' | 'closed' | 'dormant';
export type TransactionType = 'debit' | 'credit' | 'wire_out' | 'wire_in' | 'fee' | 'interest' | 'adjustment';
export type TransactionStatus = 'pending' | 'posted' | 'reversed' | 'returned';
export type ReconciliationStatus = 'in_progress' | 'matched' | 'discrepancy' | 'completed';
export type WireTransferStatus = 'initiated' | 'approved' | 'sent' | 'received' | 'cancelled' | 'failed';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string | null;
  sourceId: string | null;
  confidence: number | null;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string | null;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface BankAccountContent {
  accountName: string;
  accountNumber: string;
  bankName: string;
  routingNumber: string;
  accountType: BankAccountType;
  currency: string;
  balance: number;
  status: BankAccountStatus;
  openedDate: string;
  description: string;
}

interface BankTransactionContent {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  counterparty: string;
  reference: string;
  status: TransactionStatus;
  category: string;
}

interface BankReconciliationContent {
  accountId: string;
  period: string;
  statementBalance: number;
  bookBalance: number;
  status: ReconciliationStatus;
  notes: string;
}

interface WireTransferContent {
  fromAccountId: string;
  toAccountName: string;
  toAccountNumber: string;
  toRoutingNumber: string;
  toBankName: string;
  amount: number;
  currency: string;
  purpose: string;
  recipientAddress: string;
  intermediaryBank: string;
  status: WireTransferStatus;
  initiatedDate: string;
  valueDate: string;
}

// ── Public interfaces ──

export interface BankAccount {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  routingNumber: string;
  accountType: BankAccountType;
  currency: string;
  balance: number;
  status: BankAccountStatus;
  openedDate: Date | null;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankTransaction {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: Date;
  counterparty: string;
  reference: string;
  status: TransactionStatus;
  category: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankReconciliation {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountId: string;
  period: string;
  statementBalance: number;
  bookBalance: number;
  status: ReconciliationStatus;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WireTransfer {
  id: string;
  organizationId: string;
  workspaceId: string;
  fromAccountId: string;
  toAccountName: string;
  toAccountNumber: string;
  toRoutingNumber: string;
  toBankName: string;
  amount: number;
  currency: string;
  purpose: string;
  recipientAddress: string;
  intermediaryBank: string;
  status: WireTransferStatus;
  initiatedDate: Date;
  valueDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankingMetrics {
  totalBalance: number;
  pendingTransactions: number;
  outstandingWires: number;
  reconciliationStatus: Record<string, number>;
}

export interface BankingStats {
  accountCount: number;
  activeAccountCount: number;
  transactionCount: number;
  postedTransactionCount: number;
  reconciliationCount: number;
  completedReconciliationCount: number;
  wireTransferCount: number;
  outstandingWireCount: number;
  totalWireAmount: number;
  byAccountType: Record<string, number>;
  byAccountStatus: Record<string, number>;
  byTransactionType: Record<string, number>;
  byTransactionStatus: Record<string, number>;
  byReconciliationStatus: Record<string, number>;
  byWireTransferStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateAccountInput {
  accountName: string;
  accountNumber: string;
  bankName: string;
  routingNumber?: string;
  accountType: BankAccountType;
  currency?: string;
  balance?: number;
  status?: BankAccountStatus;
  openedDate?: string;
  description?: string;
}

export interface UpdateAccountInput {
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  routingNumber?: string;
  accountType?: BankAccountType;
  currency?: string;
  balance?: number;
  status?: BankAccountStatus;
  openedDate?: string;
  description?: string;
}

export interface ListAccountsOpts {
  accountType?: BankAccountType;
  status?: BankAccountStatus;
  bankName?: string;
}

export interface CreateTransactionInput {
  accountId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  date: string;
  counterparty?: string;
  reference?: string;
  status?: TransactionStatus;
  category?: string;
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  description?: string;
  date?: string;
  counterparty?: string;
  reference?: string;
  status?: TransactionStatus;
  category?: string;
}

export interface ListTransactionsOpts {
  accountId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateReconciliationInput {
  accountId: string;
  period: string;
  statementBalance: number;
  bookBalance?: number;
  status?: ReconciliationStatus;
  notes?: string;
}

export interface UpdateReconciliationInput {
  period?: string;
  statementBalance?: number;
  bookBalance?: number;
  status?: ReconciliationStatus;
  notes?: string;
}

export interface ListReconciliationsOpts {
  accountId?: string;
  status?: ReconciliationStatus;
  period?: string;
}

export interface CreateWireTransferInput {
  fromAccountId: string;
  toAccountName: string;
  toAccountNumber: string;
  toRoutingNumber: string;
  toBankName: string;
  amount: number;
  currency?: string;
  purpose?: string;
  recipientAddress?: string;
  intermediaryBank?: string;
  status?: WireTransferStatus;
  initiatedDate?: string;
  valueDate?: string;
}

export interface UpdateWireTransferInput {
  toAccountName?: string;
  toAccountNumber?: string;
  toRoutingNumber?: string;
  toBankName?: string;
  amount?: number;
  currency?: string;
  purpose?: string;
  recipientAddress?: string;
  intermediaryBank?: string;
  status?: WireTransferStatus;
  valueDate?: string;
}

export interface ListWireTransfersOpts {
  fromAccountId?: string;
  status?: WireTransferStatus;
  dateFrom?: string;
  dateTo?: string;
}

// ── Helpers ──

const fallbackAccount: BankAccountContent = {
  accountName: '', accountNumber: '', bankName: '', routingNumber: '',
  accountType: 'checking', currency: 'USD', balance: 0, status: 'active',
  openedDate: '', description: '',
};

const fallbackTransaction: BankTransactionContent = {
  accountId: '', type: 'debit', amount: 0, description: '', date: '',
  counterparty: '', reference: '', status: 'pending', category: '',
};

const fallbackReconciliation: BankReconciliationContent = {
  accountId: '', period: '', statementBalance: 0, bookBalance: 0,
  status: 'in_progress', notes: '',
};

const fallbackWire: WireTransferContent = {
  fromAccountId: '', toAccountName: '', toAccountNumber: '', toRoutingNumber: '',
  toBankName: '', amount: 0, currency: 'USD', purpose: '', recipientAddress: '',
  intermediaryBank: '', status: 'initiated', initiatedDate: '', valueDate: '',
};

function parseAccount(raw: string): BankAccountContent {
  if (!raw) return fallbackAccount;
  try {
    const p = JSON.parse(raw);
    return {
      accountName: p.accountName ?? '',
      accountNumber: p.accountNumber ?? '',
      bankName: p.bankName ?? '',
      routingNumber: p.routingNumber ?? '',
      accountType: (p.accountType as BankAccountType) ?? 'checking',
      currency: p.currency ?? 'USD',
      balance: p.balance ?? 0,
      status: (p.status as BankAccountStatus) ?? 'active',
      openedDate: p.openedDate ?? '',
      description: p.description ?? '',
    };
  } catch { return fallbackAccount; }
}

function parseTransaction(raw: string): BankTransactionContent {
  if (!raw) return fallbackTransaction;
  try {
    const p = JSON.parse(raw);
    return {
      accountId: p.accountId ?? '',
      type: (p.type as TransactionType) ?? 'debit',
      amount: p.amount ?? 0,
      description: p.description ?? '',
      date: p.date ?? '',
      counterparty: p.counterparty ?? '',
      reference: p.reference ?? '',
      status: (p.status as TransactionStatus) ?? 'pending',
      category: p.category ?? '',
    };
  } catch { return fallbackTransaction; }
}

function parseReconciliation(raw: string): BankReconciliationContent {
  if (!raw) return fallbackReconciliation;
  try {
    const p = JSON.parse(raw);
    return {
      accountId: p.accountId ?? '',
      period: p.period ?? '',
      statementBalance: p.statementBalance ?? 0,
      bookBalance: p.bookBalance ?? 0,
      status: (p.status as ReconciliationStatus) ?? 'in_progress',
      notes: p.notes ?? '',
    };
  } catch { return fallbackReconciliation; }
}

function parseWire(raw: string): WireTransferContent {
  if (!raw) return fallbackWire;
  try {
    const p = JSON.parse(raw);
    return {
      fromAccountId: p.fromAccountId ?? '',
      toAccountName: p.toAccountName ?? '',
      toAccountNumber: p.toAccountNumber ?? '',
      toRoutingNumber: p.toRoutingNumber ?? '',
      toBankName: p.toBankName ?? '',
      amount: p.amount ?? 0,
      currency: p.currency ?? 'USD',
      purpose: p.purpose ?? '',
      recipientAddress: p.recipientAddress ?? '',
      intermediaryBank: p.intermediaryBank ?? '',
      status: (p.status as WireTransferStatus) ?? 'initiated',
      initiatedDate: p.initiatedDate ?? '',
      valueDate: p.valueDate ?? '',
    };
  } catch { return fallbackWire; }
}

function toAccount(row: MemoryRow): BankAccount {
  const c = parseAccount(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    accountName: c.accountName, accountNumber: c.accountNumber, bankName: c.bankName,
    routingNumber: c.routingNumber, accountType: c.accountType, currency: c.currency,
    balance: c.balance, status: c.status,
    openedDate: c.openedDate ? new Date(c.openedDate) : null, description: c.description,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTransaction(row: MemoryRow): BankTransaction {
  const c = parseTransaction(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    accountId: c.accountId, type: c.type, amount: c.amount, description: c.description,
    date: c.date ? new Date(c.date) : row.createdAt,
    counterparty: c.counterparty, reference: c.reference, status: c.status, category: c.category,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toReconciliation(row: MemoryRow): BankReconciliation {
  const c = parseReconciliation(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    accountId: c.accountId, period: c.period, statementBalance: c.statementBalance,
    bookBalance: c.bookBalance, status: c.status, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toWire(row: MemoryRow): WireTransfer {
  const c = parseWire(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    fromAccountId: c.fromAccountId, toAccountName: c.toAccountName,
    toAccountNumber: c.toAccountNumber, toRoutingNumber: c.toRoutingNumber,
    toBankName: c.toBankName, amount: c.amount, currency: c.currency, purpose: c.purpose,
    recipientAddress: c.recipientAddress, intermediaryBank: c.intermediaryBank,
    status: c.status,
    initiatedDate: c.initiatedDate ? new Date(c.initiatedDate) : row.createdAt,
    valueDate: c.valueDate ? new Date(c.valueDate) : null,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Banking Service ──

export const BankingService = {
  // ── Accounts ──

  async createAccount(
    organizationId: string,
    workspaceId: string,
    input: CreateAccountInput,
    createdBy: string,
  ): Promise<BankAccount> {
    const content: BankAccountContent = {
      accountName: input.accountName.trim(),
      accountNumber: input.accountNumber.trim(),
      bankName: input.bankName.trim(),
      routingNumber: input.routingNumber ?? '',
      accountType: input.accountType,
      currency: input.currency ?? 'USD',
      balance: input.balance ?? 0,
      status: input.status ?? 'active',
      openedDate: input.openedDate ?? '',
      description: input.description ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'bank_account',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['bank_account', content.accountType, content.status]),
        createdBy,
      },
    });

    return toAccount(row as MemoryRow);
  },

  async getAccount(id: string): Promise<BankAccount | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'bank_account') return null;
    return toAccount(row as MemoryRow);
  },

  async listAccounts(organizationId: string, opts: ListAccountsOpts = {}): Promise<BankAccount[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'bank_account', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toAccount(r as MemoryRow));
    if (opts.accountType) records = records.filter((a) => a.accountType === opts.accountType);
    if (opts.status) records = records.filter((a) => a.status === opts.status);
    if (opts.bankName) records = records.filter((a) => a.bankName === opts.bankName);
    return records;
  },

  async updateAccount(id: string, input: UpdateAccountInput): Promise<BankAccount | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAccount(existing.content);
    if (input.accountName !== undefined) content.accountName = input.accountName.trim();
    if (input.accountNumber !== undefined) content.accountNumber = input.accountNumber;
    if (input.bankName !== undefined) content.bankName = input.bankName;
    if (input.routingNumber !== undefined) content.routingNumber = input.routingNumber;
    if (input.accountType !== undefined) content.accountType = input.accountType;
    if (input.currency !== undefined) content.currency = input.currency;
    if (input.balance !== undefined) content.balance = input.balance;
    if (input.status !== undefined) content.status = input.status;
    if (input.openedDate !== undefined) content.openedDate = input.openedDate;
    if (input.description !== undefined) content.description = input.description;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['bank_account', content.accountType, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toAccount(row as MemoryRow);
  },

  async deleteAccount(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async closeAccount(id: string, closedBy: string): Promise<BankAccount | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseAccount(existing.content);
    content.status = 'closed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['bank_account', content.accountType, 'closed']),
          verifiedBy: closedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toAccount(row as MemoryRow);
  },

  // ── Transactions ──

  async createTransaction(
    organizationId: string,
    workspaceId: string,
    input: CreateTransactionInput,
    createdBy: string,
  ): Promise<BankTransaction> {
    const content: BankTransactionContent = {
      accountId: input.accountId,
      type: input.type,
      amount: input.amount,
      description: input.description ?? '',
      date: input.date,
      counterparty: input.counterparty ?? '',
      reference: input.reference ?? '',
      status: input.status ?? 'pending',
      category: input.category ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'bank_transaction',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.accountId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['bank_transaction', content.type, content.status]),
        createdBy,
      },
    });

    return toTransaction(row as MemoryRow);
  },

  async getTransaction(id: string): Promise<BankTransaction | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'bank_transaction') return null;
    return toTransaction(row as MemoryRow);
  },

  async listTransactions(organizationId: string, opts: ListTransactionsOpts = {}): Promise<BankTransaction[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'bank_transaction', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toTransaction(r as MemoryRow));
    if (opts.accountId) records = records.filter((t) => t.accountId === opts.accountId);
    if (opts.type) records = records.filter((t) => t.type === opts.type);
    if (opts.status) records = records.filter((t) => t.status === opts.status);
    if (opts.dateFrom) records = records.filter((t) => t.date >= new Date(opts.dateFrom!));
    if (opts.dateTo) records = records.filter((t) => t.date <= new Date(opts.dateTo!));
    return records;
  },

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<BankTransaction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTransaction(existing.content);
    if (input.type !== undefined) content.type = input.type;
    if (input.amount !== undefined) content.amount = input.amount;
    if (input.description !== undefined) content.description = input.description;
    if (input.date !== undefined) content.date = input.date;
    if (input.counterparty !== undefined) content.counterparty = input.counterparty;
    if (input.reference !== undefined) content.reference = input.reference;
    if (input.status !== undefined) content.status = input.status;
    if (input.category !== undefined) content.category = input.category;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['bank_transaction', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toTransaction(row as MemoryRow);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async postTransaction(id: string, postedBy: string): Promise<BankTransaction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseTransaction(existing.content);
    content.status = 'posted';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['bank_transaction', content.type, 'posted']),
          verifiedBy: postedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toTransaction(row as MemoryRow);
  },

  // ── Reconciliations ──

  async createReconciliation(
    organizationId: string,
    workspaceId: string,
    input: CreateReconciliationInput,
    createdBy: string,
  ): Promise<BankReconciliation> {
    const content: BankReconciliationContent = {
      accountId: input.accountId,
      period: input.period,
      statementBalance: input.statementBalance,
      bookBalance: input.bookBalance ?? 0,
      status: input.status ?? 'in_progress',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'bank_reconciliation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.accountId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['bank_reconciliation', content.status, content.period]),
        createdBy,
      },
    });

    return toReconciliation(row as MemoryRow);
  },

  async getReconciliation(id: string): Promise<BankReconciliation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'bank_reconciliation') return null;
    return toReconciliation(row as MemoryRow);
  },

  async listReconciliations(organizationId: string, opts: ListReconciliationsOpts = {}): Promise<BankReconciliation[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'bank_reconciliation', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toReconciliation(r as MemoryRow));
    if (opts.accountId) records = records.filter((r) => r.accountId === opts.accountId);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.period) records = records.filter((r) => r.period === opts.period);
    return records;
  },

  async updateReconciliation(id: string, input: UpdateReconciliationInput): Promise<BankReconciliation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseReconciliation(existing.content);
    if (input.period !== undefined) content.period = input.period;
    if (input.statementBalance !== undefined) content.statementBalance = input.statementBalance;
    if (input.bookBalance !== undefined) content.bookBalance = input.bookBalance;
    if (input.status !== undefined) content.status = input.status;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['bank_reconciliation', content.status, content.period]),
        },
      }), null,
    );
    if (!row) return null;
    return toReconciliation(row as MemoryRow);
  },

  async completeReconciliation(id: string, completedBy: string): Promise<BankReconciliation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseReconciliation(existing.content);
    content.status = 'completed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['bank_reconciliation', 'completed', content.period]),
          verifiedBy: completedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toReconciliation(row as MemoryRow);
  },

  // ── Wire Transfers ──

  async createWireTransfer(
    organizationId: string,
    workspaceId: string,
    input: CreateWireTransferInput,
    createdBy: string,
  ): Promise<WireTransfer> {
    const content: WireTransferContent = {
      fromAccountId: input.fromAccountId,
      toAccountName: input.toAccountName.trim(),
      toAccountNumber: input.toAccountNumber,
      toRoutingNumber: input.toRoutingNumber,
      toBankName: input.toBankName,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      purpose: input.purpose ?? '',
      recipientAddress: input.recipientAddress ?? '',
      intermediaryBank: input.intermediaryBank ?? '',
      status: input.status ?? 'initiated',
      initiatedDate: input.initiatedDate ?? new Date().toISOString(),
      valueDate: input.valueDate ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'wire_transfer',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.fromAccountId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['wire_transfer', content.status]),
        createdBy,
      },
    });

    return toWire(row as MemoryRow);
  },

  async getWireTransfer(id: string): Promise<WireTransfer | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'wire_transfer') return null;
    return toWire(row as MemoryRow);
  },

  async listWireTransfers(organizationId: string, opts: ListWireTransfersOpts = {}): Promise<WireTransfer[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'wire_transfer', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toWire(r as MemoryRow));
    if (opts.fromAccountId) records = records.filter((w) => w.fromAccountId === opts.fromAccountId);
    if (opts.status) records = records.filter((w) => w.status === opts.status);
    if (opts.dateFrom) records = records.filter((w) => w.initiatedDate >= new Date(opts.dateFrom!));
    if (opts.dateTo) records = records.filter((w) => w.initiatedDate <= new Date(opts.dateTo!));
    return records;
  },

  async updateWireTransfer(id: string, input: UpdateWireTransferInput): Promise<WireTransfer | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseWire(existing.content);
    if (input.toAccountName !== undefined) content.toAccountName = input.toAccountName;
    if (input.toAccountNumber !== undefined) content.toAccountNumber = input.toAccountNumber;
    if (input.toRoutingNumber !== undefined) content.toRoutingNumber = input.toRoutingNumber;
    if (input.toBankName !== undefined) content.toBankName = input.toBankName;
    if (input.amount !== undefined) content.amount = input.amount;
    if (input.currency !== undefined) content.currency = input.currency;
    if (input.purpose !== undefined) content.purpose = input.purpose;
    if (input.recipientAddress !== undefined) content.recipientAddress = input.recipientAddress;
    if (input.intermediaryBank !== undefined) content.intermediaryBank = input.intermediaryBank;
    if (input.status !== undefined) content.status = input.status;
    if (input.valueDate !== undefined) content.valueDate = input.valueDate;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['wire_transfer', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toWire(row as MemoryRow);
  },

  async approveWireTransfer(id: string, approvedBy: string): Promise<WireTransfer | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseWire(existing.content);
    content.status = 'approved';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['wire_transfer', 'approved']),
          verifiedBy: approvedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toWire(row as MemoryRow);
  },

  async cancelWireTransfer(id: string, reason: string, cancelledBy: string): Promise<WireTransfer | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseWire(existing.content);
    content.status = 'cancelled';
    content.purpose = content.purpose
      ? `${content.purpose}\n[Cancelled by ${cancelledBy}: ${reason}]`
      : `[Cancelled by ${cancelledBy}: ${reason}]`;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['wire_transfer', 'cancelled']),
          verifiedBy: cancelledBy,
        },
      }), null,
    );
    if (!row) return null;
    return toWire(row as MemoryRow);
  },

  // ── Metrics ──

  async getBankingMetrics(organizationId: string): Promise<BankingMetrics> {
    const [accounts, transactions, wires, reconciliations] = await Promise.all([
      BankingService.listAccounts(organizationId),
      BankingService.listTransactions(organizationId),
      BankingService.listWireTransfers(organizationId),
      BankingService.listReconciliations(organizationId),
    ]);

    const totalBalance = accounts
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + a.balance, 0);
    const pendingTransactions = transactions.filter((t) => t.status === 'pending').length;
    const outstandingWires = wires.filter(
      (w) => w.status === 'initiated' || w.status === 'approved' || w.status === 'sent',
    ).length;

    const reconciliationStatus: Record<string, number> = {};
    for (const r of reconciliations) {
      reconciliationStatus[r.status] = (reconciliationStatus[r.status] || 0) + 1;
    }

    return {
      totalBalance,
      pendingTransactions,
      outstandingWires,
      reconciliationStatus,
    };
  },

  // ── Stats ──

  async getBankingStats(organizationId: string): Promise<BankingStats> {
    const [accounts, transactions, reconciliations, wires] = await Promise.all([
      BankingService.listAccounts(organizationId),
      BankingService.listTransactions(organizationId),
      BankingService.listReconciliations(organizationId),
      BankingService.listWireTransfers(organizationId),
    ]);

    const byAccountType: Record<string, number> = {};
    const byAccountStatus: Record<string, number> = {};
    for (const a of accounts) {
      byAccountType[a.accountType] = (byAccountType[a.accountType] || 0) + 1;
      byAccountStatus[a.status] = (byAccountStatus[a.status] || 0) + 1;
    }

    const byTransactionType: Record<string, number> = {};
    const byTransactionStatus: Record<string, number> = {};
    for (const t of transactions) {
      byTransactionType[t.type] = (byTransactionType[t.type] || 0) + 1;
      byTransactionStatus[t.status] = (byTransactionStatus[t.status] || 0) + 1;
    }

    const byReconciliationStatus: Record<string, number> = {};
    for (const r of reconciliations) {
      byReconciliationStatus[r.status] = (byReconciliationStatus[r.status] || 0) + 1;
    }

    const byWireTransferStatus: Record<string, number> = {};
    let outstandingWireCount = 0;
    let totalWireAmount = 0;
    for (const w of wires) {
      byWireTransferStatus[w.status] = (byWireTransferStatus[w.status] || 0) + 1;
      if (['initiated', 'approved', 'sent'].includes(w.status)) outstandingWireCount++;
      totalWireAmount += w.amount;
    }

    return {
      accountCount: accounts.length,
      activeAccountCount: accounts.filter((a) => a.status === 'active').length,
      transactionCount: transactions.length,
      postedTransactionCount: transactions.filter((t) => t.status === 'posted').length,
      reconciliationCount: reconciliations.length,
      completedReconciliationCount: reconciliations.filter((r) => r.status === 'completed').length,
      wireTransferCount: wires.length,
      outstandingWireCount,
      totalWireAmount,
      byAccountType,
      byAccountStatus,
      byTransactionType,
      byTransactionStatus,
      byReconciliationStatus,
      byWireTransferStatus,
    };
  },
};
