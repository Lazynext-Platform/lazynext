import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type BankAccountType = 'checking' | 'savings' | 'credit' | 'investment';
export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'paid';

// ── Memory row ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  sourceId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Content payloads ──

interface BankAccountContent {
  name: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  balance: number;
  type: BankAccountType;
  isActive: boolean;
}

interface CashPositionContent {
  accountId: string;
  accountName: string;
  balance: number;
  date: string;
  notes: string;
}

interface ForecastContent {
  period: string;
  expectedInflows: Array<{ source: string; amount: number; date: string }>;
  expectedOutflows: Array<{ category: string; amount: number; date: string }>;
  notes: string;
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
}

interface PaymentApprovalContent {
  payee: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
  description: string;
  bankAccountId: string;
  status: PaymentStatus;
  approvedBy: string;
  approvedAt: string | null;
  rejectedBy: string;
  rejectedAt: string | null;
  rejectionReason: string;
}

// ── Public interfaces ──

export interface BankAccount {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  balance: number;
  type: BankAccountType;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashPosition {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountId: string;
  accountName: string;
  balance: number;
  date: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CashFlowForecast {
  id: string;
  organizationId: string;
  workspaceId: string;
  period: string;
  expectedInflows: Array<{ source: string; amount: number; date: string }>;
  expectedOutflows: Array<{ category: string; amount: number; date: string }>;
  notes: string;
  totalInflows: number;
  totalOutflows: number;
  netFlow: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentApproval {
  id: string;
  organizationId: string;
  workspaceId: string;
  payee: string;
  amount: number;
  currency: string;
  dueDate: string;
  category: string;
  description: string;
  bankAccountId: string;
  status: PaymentStatus;
  approvedBy: string;
  approvedAt: string | null;
  rejectedBy: string;
  rejectedAt: string | null;
  rejectionReason: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Input / Options ──

export interface CreateBankAccountInput {
  name: string;
  bankName: string;
  accountNumber?: string;
  currency?: string;
  balance?: number;
  type?: BankAccountType;
  isActive?: boolean;
}

export interface UpdateBankAccountInput {
  name?: string;
  bankName?: string;
  accountNumber?: string;
  currency?: string;
  balance?: number;
  type?: BankAccountType;
  isActive?: boolean;
}

export interface ListBankAccountsOpts {
  type?: BankAccountType;
  isActive?: boolean;
}

export interface RecordCashPositionInput {
  accountId: string;
  balance: number;
  date: string;
  notes?: string;
}

export interface ListCashPositionsOpts {
  accountId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface CreateForecastInput {
  period: string;
  expectedInflows: Array<{ source: string; amount: number; date: string }>;
  expectedOutflows: Array<{ category: string; amount: number; date: string }>;
  notes?: string;
}

export interface ListForecastsOpts {
  period?: string;
}

export interface CashFlowSummaryOpts {
  fromDate?: Date;
  toDate?: Date;
}

export interface CreatePaymentApprovalInput {
  payee: string;
  amount: number;
  currency?: string;
  dueDate?: string;
  category?: string;
  description?: string;
  bankAccountId?: string;
}

export interface ListPaymentApprovalsOpts {
  status?: PaymentStatus;
}

export interface CashFlowSummary {
  totalInflows: number;
  totalOutflows: number;
  net: number;
}

export interface LiquidityAnalysis {
  currentCash: number;
  pendingPayments: number;
  projectedBalance: number;
  pendingCount: number;
}

export interface TreasuryStats {
  bankAccountCount: number;
  activeAccountCount: number;
  cashPositionCount: number;
  forecastCount: number;
  paymentApprovalCount: number;
  pendingPaymentCount: number;
  totalCash: number;
  pendingPayments: number;
}

// ── Helpers ──

const fallbackBankContent: BankAccountContent = {
  name: '',
  bankName: '',
  accountNumber: '',
  currency: 'USD',
  balance: 0,
  type: 'checking',
  isActive: true,
};

const fallbackCashContent: CashPositionContent = {
  accountId: '',
  accountName: '',
  balance: 0,
  date: '',
  notes: '',
};

const fallbackForecastContent: ForecastContent = {
  period: '',
  expectedInflows: [],
  expectedOutflows: [],
  notes: '',
  totalInflows: 0,
  totalOutflows: 0,
  netFlow: 0,
};

const fallbackPaymentContent: PaymentApprovalContent = {
  payee: '',
  amount: 0,
  currency: 'USD',
  dueDate: '',
  category: '',
  description: '',
  bankAccountId: '',
  status: 'pending',
  approvedBy: '',
  approvedAt: null,
  rejectedBy: '',
  rejectedAt: null,
  rejectionReason: '',
};

function parseBankContent(raw: string): BankAccountContent {
  if (!raw) return fallbackBankContent;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      bankName: p.bankName ?? '',
      accountNumber: p.accountNumber ?? '',
      currency: p.currency ?? 'USD',
      balance: Number(p.balance) || 0,
      type: (p.type as BankAccountType) ?? 'checking',
      isActive: p.isActive !== undefined ? Boolean(p.isActive) : true,
    };
  } catch {
    return fallbackBankContent;
  }
}

function parseCashContent(raw: string): CashPositionContent {
  if (!raw) return fallbackCashContent;
  try {
    const p = JSON.parse(raw);
    return {
      accountId: p.accountId ?? '',
      accountName: p.accountName ?? '',
      balance: Number(p.balance) || 0,
      date: p.date ?? '',
      notes: p.notes ?? '',
    };
  } catch {
    return fallbackCashContent;
  }
}

function parseForecastContent(raw: string): ForecastContent {
  if (!raw) return fallbackForecastContent;
  try {
    const p = JSON.parse(raw);
    return {
      period: p.period ?? '',
      expectedInflows: Array.isArray(p.expectedInflows) ? p.expectedInflows : [],
      expectedOutflows: Array.isArray(p.expectedOutflows) ? p.expectedOutflows : [],
      notes: p.notes ?? '',
      totalInflows: Number(p.totalInflows) || 0,
      totalOutflows: Number(p.totalOutflows) || 0,
      netFlow: Number(p.netFlow) || 0,
    };
  } catch {
    return fallbackForecastContent;
  }
}

function parsePaymentContent(raw: string): PaymentApprovalContent {
  if (!raw) return fallbackPaymentContent;
  try {
    const p = JSON.parse(raw);
    return {
      payee: p.payee ?? '',
      amount: Number(p.amount) || 0,
      currency: p.currency ?? 'USD',
      dueDate: p.dueDate ?? '',
      category: p.category ?? '',
      description: p.description ?? '',
      bankAccountId: p.bankAccountId ?? '',
      status: (p.status as PaymentStatus) ?? 'pending',
      approvedBy: p.approvedBy ?? '',
      approvedAt: p.approvedAt ?? null,
      rejectedBy: p.rejectedBy ?? '',
      rejectedAt: p.rejectedAt ?? null,
      rejectionReason: p.rejectionReason ?? '',
    };
  } catch {
    return fallbackPaymentContent;
  }
}

function toBankAccount(row: MemoryRow): BankAccount {
  const c = parseBankContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    name: c.name,
    bankName: c.bankName,
    accountNumber: c.accountNumber,
    currency: c.currency,
    balance: c.balance,
    type: c.type,
    isActive: c.isActive,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toCashPosition(row: MemoryRow): CashPosition {
  const c = parseCashContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    accountId: c.accountId,
    accountName: c.accountName,
    balance: c.balance,
    date: c.date,
    notes: c.notes,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toForecast(row: MemoryRow): CashFlowForecast {
  const c = parseForecastContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    period: c.period,
    expectedInflows: c.expectedInflows,
    expectedOutflows: c.expectedOutflows,
    notes: c.notes,
    totalInflows: c.totalInflows,
    totalOutflows: c.totalOutflows,
    netFlow: c.netFlow,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPaymentApproval(row: MemoryRow): PaymentApproval {
  const c = parsePaymentContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    payee: c.payee,
    amount: c.amount,
    currency: c.currency,
    dueDate: c.dueDate,
    category: c.category,
    description: c.description,
    bankAccountId: c.bankAccountId,
    status: c.status,
    approvedBy: c.approvedBy,
    approvedAt: c.approvedAt,
    rejectedBy: c.rejectedBy,
    rejectedAt: c.rejectedAt,
    rejectionReason: c.rejectionReason,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// ── Treasury Service ──

export const TreasuryService = {
  // ── Bank Accounts ──

  async createBankAccount(
    organizationId: string,
    workspaceId: string,
    input: CreateBankAccountInput,
    createdBy: string,
  ): Promise<BankAccount> {
    const content: BankAccountContent = {
      name: input.name,
      bankName: input.bankName,
      accountNumber: input.accountNumber ?? '',
      currency: input.currency ?? 'USD',
      balance: input.balance ?? 0,
      type: input.type ?? 'checking',
      isActive: input.isActive ?? true,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'bank_account',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['bank_account', content.type]),
        createdBy,
      },
    });

    return toBankAccount(row as MemoryRow);
  },

  async getBankAccount(id: string): Promise<BankAccount | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toBankAccount(row as MemoryRow);
  },

  async listBankAccounts(
    organizationId: string,
    opts: ListBankAccountsOpts = {},
  ): Promise<BankAccount[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'bank_account', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let accounts = rows.map((r) => toBankAccount(r as MemoryRow));
    if (opts.type) {
      accounts = accounts.filter((a) => a.type === opts.type);
    }
    if (opts.isActive !== undefined) {
      accounts = accounts.filter((a) => a.isActive === opts.isActive);
    }
    return accounts;
  },

  async updateBankAccount(
    id: string,
    input: UpdateBankAccountInput,
  ): Promise<BankAccount | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseBankContent(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.bankName !== undefined) content.bankName = input.bankName;
    if (input.accountNumber !== undefined) content.accountNumber = input.accountNumber;
    if (input.currency !== undefined) content.currency = input.currency;
    if (input.balance !== undefined) content.balance = input.balance;
    if (input.type !== undefined) content.type = input.type;
    if (input.isActive !== undefined) content.isActive = input.isActive;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['bank_account', content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toBankAccount(row as MemoryRow);
  },

  async deleteBankAccount(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Cash Positions ──

  async recordCashPosition(
    organizationId: string,
    workspaceId: string,
    input: RecordCashPositionInput,
    createdBy: string,
  ): Promise<CashPosition> {
    const account = await safePrisma(
      () => prisma.memory.findUnique({ where: { id: input.accountId } }),
      null,
    );
    const accountName = account
      ? parseBankContent((account as MemoryRow).content).name
      : '';

    const content: CashPositionContent = {
      accountId: input.accountId,
      accountName,
      balance: input.balance,
      date: input.date,
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'cash_position',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.accountId,
        confidence: 1.0,
        lifecycle: 'long',
        tags: JSON.stringify(['cash_position']),
        createdBy,
      },
    });

    return toCashPosition(row as MemoryRow);
  },

  async getCashPositions(
    organizationId: string,
    opts: ListCashPositionsOpts = {},
  ): Promise<CashPosition[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'cash_position', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let positions = rows.map((r) => toCashPosition(r as MemoryRow));
    if (opts.accountId) {
      positions = positions.filter((p) => p.accountId === opts.accountId);
    }
    if (opts.fromDate) {
      positions = positions.filter((p) => new Date(p.date) >= opts.fromDate!);
    }
    if (opts.toDate) {
      positions = positions.filter((p) => new Date(p.date) <= opts.toDate!);
    }
    return positions;
  },

  async getCurrentCashPosition(organizationId: string): Promise<number> {
    const accounts = await this.listBankAccounts(organizationId, { isActive: true });
    return accounts.reduce((sum, a) => sum + a.balance, 0);
  },

  // ── Forecasts ──

  async createForecast(
    organizationId: string,
    workspaceId: string,
    input: CreateForecastInput,
    createdBy: string,
  ): Promise<CashFlowForecast> {
    const totalInflows = input.expectedInflows.reduce((s, i) => s + i.amount, 0);
    const totalOutflows = input.expectedOutflows.reduce((s, o) => s + o.amount, 0);
    const netFlow = totalInflows - totalOutflows;

    const content: ForecastContent = {
      period: input.period,
      expectedInflows: input.expectedInflows,
      expectedOutflows: input.expectedOutflows,
      notes: input.notes ?? '',
      totalInflows,
      totalOutflows,
      netFlow,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'cash_flow_forecast',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['cash_flow_forecast', input.period]),
        createdBy,
      },
    });

    return toForecast(row as MemoryRow);
  },

  async getForecast(id: string): Promise<CashFlowForecast | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toForecast(row as MemoryRow);
  },

  async listForecasts(
    organizationId: string,
    opts: ListForecastsOpts = {},
  ): Promise<CashFlowForecast[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'cash_flow_forecast', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let forecasts = rows.map((r) => toForecast(r as MemoryRow));
    if (opts.period) {
      forecasts = forecasts.filter((f) => f.period === opts.period);
    }
    return forecasts;
  },

  async deleteForecast(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ── Cash Flow Summary ──

  async getCashFlowSummary(
    organizationId: string,
    opts: CashFlowSummaryOpts = {},
  ): Promise<CashFlowSummary> {
    const forecasts = await this.listForecasts(organizationId);

    let totalInflows = 0;
    let totalOutflows = 0;

    for (const f of forecasts) {
      for (const inflow of f.expectedInflows) {
        const d = new Date(inflow.date);
        if (opts.fromDate && d < opts.fromDate) continue;
        if (opts.toDate && d > opts.toDate) continue;
        totalInflows += inflow.amount;
      }
      for (const outflow of f.expectedOutflows) {
        const d = new Date(outflow.date);
        if (opts.fromDate && d < opts.fromDate) continue;
        if (opts.toDate && d > opts.toDate) continue;
        totalOutflows += outflow.amount;
      }
    }

    return {
      totalInflows,
      totalOutflows,
      net: totalInflows - totalOutflows,
    };
  },

  // ── Payment Approvals ──

  async createPaymentApproval(
    organizationId: string,
    workspaceId: string,
    input: CreatePaymentApprovalInput,
    createdBy: string,
  ): Promise<PaymentApproval> {
    const content: PaymentApprovalContent = {
      payee: input.payee,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      dueDate: input.dueDate ?? '',
      category: input.category ?? '',
      description: input.description ?? '',
      bankAccountId: input.bankAccountId ?? '',
      status: 'pending',
      approvedBy: '',
      approvedAt: null,
      rejectedBy: '',
      rejectedAt: null,
      rejectionReason: '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'payment_approval',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: input.bankAccountId || null,
        confidence: 1.0,
        lifecycle: 'medium',
        tags: JSON.stringify(['payment_approval', 'pending']),
        createdBy,
      },
    });

    return toPaymentApproval(row as MemoryRow);
  },

  async getPaymentApproval(id: string): Promise<PaymentApproval | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toPaymentApproval(row as MemoryRow);
  },

  async listPaymentApprovals(
    organizationId: string,
    opts: ListPaymentApprovalsOpts = {},
  ): Promise<PaymentApproval[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: { type: 'payment_approval', organizationId },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let approvals = rows.map((r) => toPaymentApproval(r as MemoryRow));
    if (opts.status) {
      approvals = approvals.filter((a) => a.status === opts.status);
    }
    return approvals;
  },

  async approvePayment(
    id: string,
    approvedBy: string,
  ): Promise<PaymentApproval | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parsePaymentContent(existing.content);
    content.status = 'approved';
    content.approvedBy = approvedBy;
    content.approvedAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['payment_approval', 'approved']),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPaymentApproval(row as MemoryRow);
  },

  async rejectPayment(
    id: string,
    reason: string,
    rejectedBy: string,
  ): Promise<PaymentApproval | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parsePaymentContent(existing.content);
    content.status = 'rejected';
    content.rejectedBy = rejectedBy;
    content.rejectedAt = new Date().toISOString();
    content.rejectionReason = reason;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['payment_approval', 'rejected']),
          },
        }),
      null,
    );
    if (!row) return null;
    return toPaymentApproval(row as MemoryRow);
  },

  // ── Liquidity Analysis ──

  async getLiquidityAnalysis(organizationId: string): Promise<LiquidityAnalysis> {
    const currentCash = await this.getCurrentCashPosition(organizationId);
    const pendingPayments = await this.listPaymentApprovals(organizationId, {
      status: 'pending',
    });
    const pendingTotal = pendingPayments.reduce((s, p) => s + p.amount, 0);

    return {
      currentCash,
      pendingPayments: pendingTotal,
      projectedBalance: currentCash - pendingTotal,
      pendingCount: pendingPayments.length,
    };
  },

  // ── Stats ──

  async getStats(organizationId: string): Promise<TreasuryStats> {
    const [accounts, cashPositions, forecasts, payments] = await Promise.all([
      this.listBankAccounts(organizationId),
      this.getCashPositions(organizationId),
      this.listForecasts(organizationId),
      this.listPaymentApprovals(organizationId),
    ]);

    const activeAccountCount = accounts.filter((a) => a.isActive).length;
    const pendingPayments = payments.filter((p) => p.status === 'pending');
    const totalCash = accounts
      .filter((a) => a.isActive)
      .reduce((s, a) => s + a.balance, 0);
    const pendingTotal = pendingPayments.reduce((s, p) => s + p.amount, 0);

    return {
      bankAccountCount: accounts.length,
      activeAccountCount,
      cashPositionCount: cashPositions.length,
      forecastCount: forecasts.length,
      paymentApprovalCount: payments.length,
      pendingPaymentCount: pendingPayments.length,
      totalCash,
      pendingPayments: pendingTotal,
    };
  },
};
