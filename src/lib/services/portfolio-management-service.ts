import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AccountType = 'investment' | 'retirement' | 'endowment' | 'pension' | 'hedge_fund' | 'mutual_fund' | 'trust' | 'treasury' | 'escrow';
export type AccountStatus = 'active' | 'closed' | 'frozen' | 'pending' | 'suspended' | 'liquidated';
export type HoldingType = 'equity' | 'bond' | 'fund' | 'etf' | 'commodity' | 'real_estate' | 'cash' | 'derivative' | 'alternative' | 'crypto';
export type HoldingStatus = 'open' | 'closed' | 'pending' | 'sold' | 'expired';
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'interest' | 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'split' | 'rebalance' | 'conversion';
export type TransactionStatus = 'pending' | 'executed' | 'settled' | 'cancelled' | 'failed' | 'reversed';
export type AllocationType = 'strategic' | 'tactical' | 'target' | 'actual' | 'drift' | 'rebalance';
export type AllocationStatus = 'active' | 'archived' | 'draft' | 'reviewed';

// ── Interfaces ──

interface MemoryRow {
  id: string;
  workspaceId: string;
  organizationId: string;
  type: string;
  content: string;
  source: string;
  sourceId: string | null;
  confidence: number;
  owner: string | null;
  accessPolicy: string | null;
  lifecycle: string;
  expiresAt: Date | null;
  tags: string | null;
  relatedMemoryIds: string | null;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioAccount {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: AccountType;
  description: string;
  status: AccountStatus;
  custodian: string;
  manager: string;
  currency: string;
  currentValue: number;
  inceptionDate: Date | null;
  benchmark: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioHolding {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountId: string;
  symbol: string;
  name: string;
  type: HoldingType;
  description: string;
  status: HoldingStatus;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  marketValue: number;
  currency: string;
  sector: string;
  acquiredDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioTransaction {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountId: string;
  holdingId: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  status: TransactionStatus;
  executionDate: Date | null;
  settlementDate: Date | null;
  quantity: number;
  price: number;
  fees: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioAllocation {
  id: string;
  organizationId: string;
  workspaceId: string;
  accountId: string;
  type: AllocationType;
  description: string;
  status: AllocationStatus;
  targetWeights: Record<string, number>;
  actualWeights: Record<string, number>;
  driftThreshold: number;
  lastRebalanceDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioManagementMetrics {
  activeAccounts: number;
  openHoldings: number;
  pendingTransactions: number;
  totalPortfolioValue: number;
  activeAllocations: number;
}

export interface PortfolioManagementStats {
  accountCount: number;
  activeAccountCount: number;
  holdingCount: number;
  openHoldingCount: number;
  transactionCount: number;
  pendingTransactionCount: number;
  allocationCount: number;
  activeAllocationCount: number;
  byAccountType: Record<string, number>;
  byAccountStatus: Record<string, number>;
  byHoldingType: Record<string, number>;
  byHoldingStatus: Record<string, number>;
  byTransactionType: Record<string, number>;
  byTransactionStatus: Record<string, number>;
  byAllocationType: Record<string, number>;
  byAllocationStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  description?: string;
  status?: AccountStatus;
  custodian?: string;
  manager?: string;
  currency?: string;
  currentValue?: number;
  inceptionDate?: string;
  benchmark?: string;
  notes?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  description?: string;
  status?: AccountStatus;
  custodian?: string;
  manager?: string;
  currency?: string;
  currentValue?: number;
  inceptionDate?: string;
  benchmark?: string;
  notes?: string;
}

export interface ListAccountsOpts {
  type?: AccountType;
  status?: AccountStatus;
}

export interface CreateHoldingInput {
  accountId: string;
  symbol: string;
  name: string;
  type: HoldingType;
  description?: string;
  status?: HoldingStatus;
  quantity?: number;
  avgCost?: number;
  currentPrice?: number;
  marketValue?: number;
  currency?: string;
  sector?: string;
  acquiredDate?: string;
  notes?: string;
}

export interface UpdateHoldingInput {
  accountId?: string;
  symbol?: string;
  name?: string;
  type?: HoldingType;
  description?: string;
  status?: HoldingStatus;
  quantity?: number;
  avgCost?: number;
  currentPrice?: number;
  marketValue?: number;
  currency?: string;
  sector?: string;
  acquiredDate?: string;
  notes?: string;
}

export interface ListHoldingsOpts {
  accountId?: string;
  type?: HoldingType;
  status?: HoldingStatus;
}

export interface CreateTransactionInput {
  accountId: string;
  holdingId?: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string;
  status?: TransactionStatus;
  executionDate?: string;
  settlementDate?: string;
  quantity?: number;
  price?: number;
  fees?: number;
  notes?: string;
}

export interface UpdateTransactionInput {
  accountId?: string;
  holdingId?: string;
  type?: TransactionType;
  amount?: number;
  currency?: string;
  description?: string;
  status?: TransactionStatus;
  executionDate?: string;
  settlementDate?: string;
  quantity?: number;
  price?: number;
  fees?: number;
  notes?: string;
}

export interface ListTransactionsOpts {
  accountId?: string;
  holdingId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
}

export interface CreateAllocationInput {
  accountId: string;
  type: AllocationType;
  description?: string;
  status?: AllocationStatus;
  targetWeights?: Record<string, number>;
  actualWeights?: Record<string, number>;
  driftThreshold?: number;
  lastRebalanceDate?: string;
  notes?: string;
}

export interface UpdateAllocationInput {
  accountId?: string;
  type?: AllocationType;
  description?: string;
  status?: AllocationStatus;
  targetWeights?: Record<string, number>;
  actualWeights?: Record<string, number>;
  driftThreshold?: number;
  lastRebalanceDate?: string;
  notes?: string;
}

export interface ListAllocationsOpts {
  accountId?: string;
  type?: AllocationType;
  status?: AllocationStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toAccount(row: MemoryRow): PortfolioAccount {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as AccountType) ?? 'investment',
    description: (c.description as string) ?? '',
    status: (c.status as AccountStatus) ?? 'pending',
    custodian: (c.custodian as string) ?? '',
    manager: (c.manager as string) ?? '',
    currency: (c.currency as string) ?? 'USD',
    currentValue: (c.currentValue as number) ?? 0,
    inceptionDate: c.inceptionDate ? new Date(c.inceptionDate as string) : null,
    benchmark: (c.benchmark as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toHolding(row: MemoryRow): PortfolioHolding {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    accountId: (c.accountId as string) ?? '',
    symbol: (c.symbol as string) ?? '',
    name: (c.name as string) ?? '',
    type: (c.type as HoldingType) ?? 'equity',
    description: (c.description as string) ?? '',
    status: (c.status as HoldingStatus) ?? 'open',
    quantity: (c.quantity as number) ?? 0,
    avgCost: (c.avgCost as number) ?? 0,
    currentPrice: (c.currentPrice as number) ?? 0,
    marketValue: (c.marketValue as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    sector: (c.sector as string) ?? '',
    acquiredDate: c.acquiredDate ? new Date(c.acquiredDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTransaction(row: MemoryRow): PortfolioTransaction {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    accountId: (c.accountId as string) ?? '',
    holdingId: (c.holdingId as string) ?? null,
    type: (c.type as TransactionType) ?? 'buy',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    description: (c.description as string) ?? '',
    status: (c.status as TransactionStatus) ?? 'pending',
    executionDate: c.executionDate ? new Date(c.executionDate as string) : null,
    settlementDate: c.settlementDate ? new Date(c.settlementDate as string) : null,
    quantity: (c.quantity as number) ?? 0,
    price: (c.price as number) ?? 0,
    fees: (c.fees as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAllocation(row: MemoryRow): PortfolioAllocation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    accountId: (c.accountId as string) ?? '',
    type: (c.type as AllocationType) ?? 'strategic',
    description: (c.description as string) ?? '',
    status: (c.status as AllocationStatus) ?? 'draft',
    targetWeights: (c.targetWeights as Record<string, number>) ?? {},
    actualWeights: (c.actualWeights as Record<string, number>) ?? {},
    driftThreshold: (c.driftThreshold as number) ?? 0,
    lastRebalanceDate: c.lastRebalanceDate ? new Date(c.lastRebalanceDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PortfolioManagementService = {
  // ── Accounts ──

  async createAccount(organizationId: string, workspaceId: string, input: CreateAccountInput, createdBy: string): Promise<PortfolioAccount> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      custodian: input.custodian ?? '',
      manager: input.manager ?? '',
      currency: input.currency ?? 'USD',
      currentValue: input.currentValue ?? 0,
      inceptionDate: input.inceptionDate ?? null,
      benchmark: input.benchmark ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_account',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_account', content.type, content.status]),
        createdBy,
      },
    });
    return toAccount(row as MemoryRow);
  },

  async getAccount(id: string): Promise<PortfolioAccount | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'portfolio_account') return null;
    return toAccount(row as MemoryRow);
  },

  async listAccounts(organizationId: string, opts: ListAccountsOpts = {}): Promise<PortfolioAccount[]> {
    const where: Record<string, unknown> = { organizationId, type: 'portfolio_account' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAccount);
  },

  async updateAccount(id: string, input: UpdateAccountInput): Promise<PortfolioAccount | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.custodian !== undefined && { custodian: input.custodian }),
      ...(input.manager !== undefined && { manager: input.manager }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.currentValue !== undefined && { currentValue: input.currentValue }),
      ...(input.inceptionDate !== undefined && { inceptionDate: input.inceptionDate }),
      ...(input.benchmark !== undefined && { benchmark: input.benchmark }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_account', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAccount(row as MemoryRow);
  },

  async deleteAccount(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateAccount(id: string, _activatedBy: string): Promise<PortfolioAccount | null> {
    return PortfolioManagementService.updateAccount(id, { status: 'active' });
  },

  async freezeAccount(id: string, _frozenBy: string): Promise<PortfolioAccount | null> {
    return PortfolioManagementService.updateAccount(id, { status: 'frozen' });
  },

  async suspendAccount(id: string, _suspendedBy: string): Promise<PortfolioAccount | null> {
    return PortfolioManagementService.updateAccount(id, { status: 'suspended' });
  },

  async liquidateAccount(id: string, _liquidatedBy: string): Promise<PortfolioAccount | null> {
    return PortfolioManagementService.updateAccount(id, { status: 'liquidated' });
  },

  async closeAccount(id: string, _closedBy: string): Promise<PortfolioAccount | null> {
    return PortfolioManagementService.updateAccount(id, { status: 'closed' });
  },

  // ── Holdings ──

  async createHolding(organizationId: string, workspaceId: string, input: CreateHoldingInput, createdBy: string): Promise<PortfolioHolding> {
    const content = {
      accountId: input.accountId,
      symbol: input.symbol.trim(),
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'open',
      quantity: input.quantity ?? 0,
      avgCost: input.avgCost ?? 0,
      currentPrice: input.currentPrice ?? 0,
      marketValue: input.marketValue ?? 0,
      currency: input.currency ?? 'USD',
      sector: input.sector ?? '',
      acquiredDate: input.acquiredDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_holding',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.accountId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_holding', content.type, content.status]),
        createdBy,
      },
    });
    return toHolding(row as MemoryRow);
  },

  async getHolding(id: string): Promise<PortfolioHolding | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'portfolio_holding') return null;
    return toHolding(row as MemoryRow);
  },

  async listHoldings(organizationId: string, opts: ListHoldingsOpts = {}): Promise<PortfolioHolding[]> {
    const where: Record<string, unknown> = { organizationId, type: 'portfolio_holding' };
    const conditions: unknown[] = [];
    if (opts.accountId) conditions.push({ content: { contains: `"accountId":"${opts.accountId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toHolding);
  },

  async updateHolding(id: string, input: UpdateHoldingInput): Promise<PortfolioHolding | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.accountId !== undefined && { accountId: input.accountId }),
      ...(input.symbol !== undefined && { symbol: input.symbol.trim() }),
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.avgCost !== undefined && { avgCost: input.avgCost }),
      ...(input.currentPrice !== undefined && { currentPrice: input.currentPrice }),
      ...(input.marketValue !== undefined && { marketValue: input.marketValue }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.sector !== undefined && { sector: input.sector }),
      ...(input.acquiredDate !== undefined && { acquiredDate: input.acquiredDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_holding', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toHolding(row as MemoryRow);
  },

  async deleteHolding(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async closeHolding(id: string, _closedBy: string): Promise<PortfolioHolding | null> {
    return PortfolioManagementService.updateHolding(id, { status: 'closed' });
  },

  async sellHolding(id: string, _soldBy: string): Promise<PortfolioHolding | null> {
    return PortfolioManagementService.updateHolding(id, { status: 'sold' });
  },

  // ── Transactions ──

  async createTransaction(organizationId: string, workspaceId: string, input: CreateTransactionInput, createdBy: string): Promise<PortfolioTransaction> {
    const content = {
      accountId: input.accountId,
      holdingId: input.holdingId ?? null,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      description: input.description ?? '',
      status: input.status ?? 'pending',
      executionDate: input.executionDate ?? null,
      settlementDate: input.settlementDate ?? null,
      quantity: input.quantity ?? 0,
      price: input.price ?? 0,
      fees: input.fees ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_transaction',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.holdingId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_transaction', content.type, content.status]),
        createdBy,
      },
    });
    return toTransaction(row as MemoryRow);
  },

  async getTransaction(id: string): Promise<PortfolioTransaction | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'portfolio_transaction') return null;
    return toTransaction(row as MemoryRow);
  },

  async listTransactions(organizationId: string, opts: ListTransactionsOpts = {}): Promise<PortfolioTransaction[]> {
    const where: Record<string, unknown> = { organizationId, type: 'portfolio_transaction' };
    const conditions: unknown[] = [];
    if (opts.accountId) conditions.push({ content: { contains: `"accountId":"${opts.accountId}"` } });
    if (opts.holdingId) conditions.push({ content: { contains: `"holdingId":"${opts.holdingId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTransaction);
  },

  async updateTransaction(id: string, input: UpdateTransactionInput): Promise<PortfolioTransaction | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.accountId !== undefined && { accountId: input.accountId }),
      ...(input.holdingId !== undefined && { holdingId: input.holdingId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.executionDate !== undefined && { executionDate: input.executionDate }),
      ...(input.settlementDate !== undefined && { settlementDate: input.settlementDate }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.fees !== undefined && { fees: input.fees }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_transaction', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTransaction(row as MemoryRow);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async executeTransaction(id: string, _executedBy: string): Promise<PortfolioTransaction | null> {
    return PortfolioManagementService.updateTransaction(id, { status: 'executed', executionDate: new Date().toISOString() });
  },

  async settleTransaction(id: string, _settledBy: string): Promise<PortfolioTransaction | null> {
    return PortfolioManagementService.updateTransaction(id, { status: 'settled', settlementDate: new Date().toISOString() });
  },

  async cancelTransaction(id: string, _cancelledBy: string): Promise<PortfolioTransaction | null> {
    return PortfolioManagementService.updateTransaction(id, { status: 'cancelled' });
  },

  async failTransaction(id: string, _failedBy: string): Promise<PortfolioTransaction | null> {
    return PortfolioManagementService.updateTransaction(id, { status: 'failed' });
  },

  async reverseTransaction(id: string, _reversedBy: string): Promise<PortfolioTransaction | null> {
    return PortfolioManagementService.updateTransaction(id, { status: 'reversed' });
  },

  // ── Allocations ──

  async createAllocation(organizationId: string, workspaceId: string, input: CreateAllocationInput, createdBy: string): Promise<PortfolioAllocation> {
    const content = {
      accountId: input.accountId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      targetWeights: input.targetWeights ?? {},
      actualWeights: input.actualWeights ?? {},
      driftThreshold: input.driftThreshold ?? 0,
      lastRebalanceDate: input.lastRebalanceDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_allocation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.accountId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_allocation', content.type, content.status]),
        createdBy,
      },
    });
    return toAllocation(row as MemoryRow);
  },

  async getAllocation(id: string): Promise<PortfolioAllocation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'portfolio_allocation') return null;
    return toAllocation(row as MemoryRow);
  },

  async listAllocations(organizationId: string, opts: ListAllocationsOpts = {}): Promise<PortfolioAllocation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'portfolio_allocation' };
    const conditions: unknown[] = [];
    if (opts.accountId) conditions.push({ content: { contains: `"accountId":"${opts.accountId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toAllocation);
  },

  async updateAllocation(id: string, input: UpdateAllocationInput): Promise<PortfolioAllocation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.accountId !== undefined && { accountId: input.accountId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.targetWeights !== undefined && { targetWeights: input.targetWeights }),
      ...(input.actualWeights !== undefined && { actualWeights: input.actualWeights }),
      ...(input.driftThreshold !== undefined && { driftThreshold: input.driftThreshold }),
      ...(input.lastRebalanceDate !== undefined && { lastRebalanceDate: input.lastRebalanceDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_allocation', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toAllocation(row as MemoryRow);
  },

  async deleteAllocation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateAllocation(id: string, _activatedBy: string): Promise<PortfolioAllocation | null> {
    return PortfolioManagementService.updateAllocation(id, { status: 'active' });
  },

  async reviewAllocation(id: string, _reviewedBy: string): Promise<PortfolioAllocation | null> {
    return PortfolioManagementService.updateAllocation(id, { status: 'reviewed' });
  },

  async archiveAllocation(id: string, _archivedBy: string): Promise<PortfolioAllocation | null> {
    return PortfolioManagementService.updateAllocation(id, { status: 'archived' });
  },

  // ── Metrics & Stats ──

  async getPortfolioManagementMetrics(organizationId: string): Promise<PortfolioManagementMetrics> {
    const [accounts, holdings, transactions, allocations] = await Promise.all([
      PortfolioManagementService.listAccounts(organizationId),
      PortfolioManagementService.listHoldings(organizationId),
      PortfolioManagementService.listTransactions(organizationId),
      PortfolioManagementService.listAllocations(organizationId),
    ]);
    const activeAccounts = accounts.filter((a) => a.status === 'active').length;
    const openHoldings = holdings.filter((h) => h.status === 'open').length;
    const pendingTransactions = transactions.filter((t) => t.status === 'pending').length;
    const totalPortfolioValue = accounts.reduce((sum, a) => sum + a.currentValue, 0);
    const activeAllocations = allocations.filter((a) => a.status === 'active').length;
    return { activeAccounts, openHoldings, pendingTransactions, totalPortfolioValue, activeAllocations };
  },

  async getPortfolioManagementStats(organizationId: string): Promise<PortfolioManagementStats> {
    const [accounts, holdings, transactions, allocations] = await Promise.all([
      PortfolioManagementService.listAccounts(organizationId),
      PortfolioManagementService.listHoldings(organizationId),
      PortfolioManagementService.listTransactions(organizationId),
      PortfolioManagementService.listAllocations(organizationId),
    ]);
    const byAccountType: Record<string, number> = {};
    const byAccountStatus: Record<string, number> = {};
    const byHoldingType: Record<string, number> = {};
    const byHoldingStatus: Record<string, number> = {};
    const byTransactionType: Record<string, number> = {};
    const byTransactionStatus: Record<string, number> = {};
    const byAllocationType: Record<string, number> = {};
    const byAllocationStatus: Record<string, number> = {};
    for (const a of accounts) { byAccountType[a.type] = (byAccountType[a.type] ?? 0) + 1; byAccountStatus[a.status] = (byAccountStatus[a.status] ?? 0) + 1; }
    for (const h of holdings) { byHoldingType[h.type] = (byHoldingType[h.type] ?? 0) + 1; byHoldingStatus[h.status] = (byHoldingStatus[h.status] ?? 0) + 1; }
    for (const t of transactions) { byTransactionType[t.type] = (byTransactionType[t.type] ?? 0) + 1; byTransactionStatus[t.status] = (byTransactionStatus[t.status] ?? 0) + 1; }
    for (const a of allocations) { byAllocationType[a.type] = (byAllocationType[a.type] ?? 0) + 1; byAllocationStatus[a.status] = (byAllocationStatus[a.status] ?? 0) + 1; }
    return {
      accountCount: accounts.length,
      activeAccountCount: accounts.filter((a) => a.status === 'active').length,
      holdingCount: holdings.length,
      openHoldingCount: holdings.filter((h) => h.status === 'open').length,
      transactionCount: transactions.length,
      pendingTransactionCount: transactions.filter((t) => t.status === 'pending').length,
      allocationCount: allocations.length,
      activeAllocationCount: allocations.filter((a) => a.status === 'active').length,
      byAccountType, byAccountStatus, byHoldingType, byHoldingStatus, byTransactionType, byTransactionStatus, byAllocationType, byAllocationStatus,
    };
  },
};
