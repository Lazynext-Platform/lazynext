import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type AssetClass = 'equity' | 'fixed_income' | 'real_estate' | 'commodity' | 'cash' | 'alternative' | 'cryptocurrency' | 'derivative';
export type HoldingStatus = 'active' | 'sold' | 'closed' | 'pending';
export type TransactionType = 'buy' | 'sell' | 'dividend' | 'interest' | 'split' | 'rebalance' | 'fee' | 'deposit' | 'withdrawal';
export type AllocationStrategy = 'conservative' | 'moderate' | 'aggressive' | 'income_focused' | 'growth_focused' | 'balanced' | 'custom';
export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high';
export type RiskStatus = 'within_limits' | 'warning' | 'breach' | 'critical';

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

export interface PortfolioHolding {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  assetClass: AssetClass;
  ticker: string;
  isin: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  purchaseDate: Date | null;
  currency: string;
  status: HoldingStatus;
  sector: string;
  country: string;
  rating: string;
  notes: string;
  soldPrice: number | null;
  soldDate: Date | null;
  soldBy: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioTransaction {
  id: string;
  organizationId: string;
  workspaceId: string;
  holdingId: string | null;
  type: TransactionType;
  quantity: number;
  price: number;
  amount: number;
  currency: string;
  transactionDate: Date | null;
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
  name: string;
  strategy: AllocationStrategy;
  targetWeights: Record<string, number>;
  currentWeights: Record<string, number>;
  driftThreshold: number;
  status: string;
  lastRebalancedAt: Date | null;
  rebalancedBy: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioRisk {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  riskLevel: RiskLevel;
  status: RiskStatus;
  varAmount: number;
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  concentration: number;
  assessmentDate: Date | null;
  mitigationPlan: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PortfolioMetrics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  activeHoldings: number;
}

export interface PortfolioStats {
  holdingCount: number;
  activeHoldingCount: number;
  transactionCount: number;
  allocationCount: number;
  riskCount: number;
  byAssetClass: Record<string, number>;
  byHoldingStatus: Record<string, number>;
  byTransactionType: Record<string, number>;
  byRiskLevel: Record<string, number>;
}

// ── Input / Options ──

export interface CreateHoldingInput {
  name: string;
  assetClass: AssetClass;
  ticker?: string;
  isin?: string;
  quantity: number;
  purchasePrice: number;
  currentPrice?: number;
  purchaseDate: string;
  currency?: string;
  status?: HoldingStatus;
  sector?: string;
  country?: string;
  rating?: string;
  notes?: string;
}

export interface UpdateHoldingInput {
  name?: string;
  assetClass?: AssetClass;
  ticker?: string;
  isin?: string;
  quantity?: number;
  purchasePrice?: number;
  currentPrice?: number;
  purchaseDate?: string;
  currency?: string;
  status?: HoldingStatus;
  sector?: string;
  country?: string;
  rating?: string;
  notes?: string;
}

export interface ListHoldingsOpts {
  assetClass?: AssetClass;
  status?: HoldingStatus;
  sector?: string;
}

export interface CreateTransactionInput {
  holdingId?: string;
  type: TransactionType;
  quantity?: number;
  price?: number;
  amount?: number;
  currency?: string;
  transactionDate?: string;
  fees?: number;
  notes?: string;
}

export interface UpdateTransactionInput {
  holdingId?: string;
  type?: TransactionType;
  quantity?: number;
  price?: number;
  amount?: number;
  currency?: string;
  transactionDate?: string;
  fees?: number;
  notes?: string;
}

export interface ListTransactionsOpts {
  holdingId?: string;
  type?: TransactionType;
}

export interface CreateAllocationInput {
  name: string;
  strategy: AllocationStrategy;
  targetWeights?: Record<string, number>;
  currentWeights?: Record<string, number>;
  driftThreshold?: number;
  status?: string;
  notes?: string;
}

export interface UpdateAllocationInput {
  name?: string;
  strategy?: AllocationStrategy;
  targetWeights?: Record<string, number>;
  currentWeights?: Record<string, number>;
  driftThreshold?: number;
  status?: string;
  notes?: string;
}

export interface ListAllocationsOpts {
  strategy?: AllocationStrategy;
  status?: string;
}

export interface CreateRiskInput {
  name: string;
  riskLevel: RiskLevel;
  status?: RiskStatus;
  varAmount?: number;
  beta?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  concentration?: number;
  assessmentDate?: string;
  mitigationPlan?: string;
  notes?: string;
}

export interface UpdateRiskInput {
  name?: string;
  riskLevel?: RiskLevel;
  status?: RiskStatus;
  varAmount?: number;
  beta?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  volatility?: number;
  concentration?: number;
  assessmentDate?: string;
  mitigationPlan?: string;
  notes?: string;
}

export interface ListRisksOpts {
  riskLevel?: RiskLevel;
  status?: RiskStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toHolding(row: MemoryRow): PortfolioHolding {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    assetClass: (c.assetClass as AssetClass) ?? 'equity',
    ticker: (c.ticker as string) ?? '',
    isin: (c.isin as string) ?? '',
    quantity: (c.quantity as number) ?? 0,
    purchasePrice: (c.purchasePrice as number) ?? 0,
    currentPrice: (c.currentPrice as number) ?? 0,
    purchaseDate: c.purchaseDate ? new Date(c.purchaseDate as string) : null,
    currency: (c.currency as string) ?? 'USD',
    status: (c.status as HoldingStatus) ?? 'active',
    sector: (c.sector as string) ?? '',
    country: (c.country as string) ?? '',
    rating: (c.rating as string) ?? '',
    notes: (c.notes as string) ?? '',
    soldPrice: c.soldPrice !== undefined && c.soldPrice !== null ? (c.soldPrice as number) : null,
    soldDate: c.soldDate ? new Date(c.soldDate as string) : null,
    soldBy: (c.soldBy as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTransaction(row: MemoryRow): PortfolioTransaction {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    holdingId: (c.holdingId as string) ?? null,
    type: (c.type as TransactionType) ?? 'buy',
    quantity: (c.quantity as number) ?? 0,
    price: (c.price as number) ?? 0,
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    transactionDate: c.transactionDate ? new Date(c.transactionDate as string) : null,
    fees: (c.fees as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toAllocation(row: MemoryRow): PortfolioAllocation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    strategy: (c.strategy as AllocationStrategy) ?? 'balanced',
    targetWeights: (c.targetWeights as Record<string, number>) ?? {},
    currentWeights: (c.currentWeights as Record<string, number>) ?? {},
    driftThreshold: (c.driftThreshold as number) ?? 0,
    status: (c.status as string) ?? 'active',
    lastRebalancedAt: c.lastRebalancedAt ? new Date(c.lastRebalancedAt as string) : null,
    rebalancedBy: (c.rebalancedBy as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRisk(row: MemoryRow): PortfolioRisk {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    riskLevel: (c.riskLevel as RiskLevel) ?? 'medium',
    status: (c.status as RiskStatus) ?? 'within_limits',
    varAmount: (c.varAmount as number) ?? 0,
    beta: (c.beta as number) ?? 0,
    sharpeRatio: (c.sharpeRatio as number) ?? 0,
    maxDrawdown: (c.maxDrawdown as number) ?? 0,
    volatility: (c.volatility as number) ?? 0,
    concentration: (c.concentration as number) ?? 0,
    assessmentDate: c.assessmentDate ? new Date(c.assessmentDate as string) : null,
    mitigationPlan: (c.mitigationPlan as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const PortfolioService = {
  // ── Holdings ──

  async createHolding(organizationId: string, workspaceId: string, input: CreateHoldingInput, createdBy: string): Promise<PortfolioHolding> {
    const content = {
      name: input.name.trim(),
      assetClass: input.assetClass,
      ticker: input.ticker ?? '',
      isin: input.isin ?? '',
      quantity: input.quantity,
      purchasePrice: input.purchasePrice,
      currentPrice: input.currentPrice ?? input.purchasePrice,
      purchaseDate: input.purchaseDate,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'active',
      sector: input.sector ?? '',
      country: input.country ?? '',
      rating: input.rating ?? '',
      notes: input.notes ?? '',
      soldPrice: null,
      soldDate: null,
      soldBy: '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_holding',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_holding', content.assetClass, content.status]),
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
    if (opts.assetClass) conditions.push({ content: { contains: `"assetClass":"${opts.assetClass}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (opts.sector) conditions.push({ content: { contains: `"sector":"${opts.sector}"` } });
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
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.assetClass !== undefined && { assetClass: input.assetClass }),
      ...(input.ticker !== undefined && { ticker: input.ticker }),
      ...(input.isin !== undefined && { isin: input.isin }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.purchasePrice !== undefined && { purchasePrice: input.purchasePrice }),
      ...(input.currentPrice !== undefined && { currentPrice: input.currentPrice }),
      ...(input.purchaseDate !== undefined && { purchaseDate: input.purchaseDate }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.sector !== undefined && { sector: input.sector }),
      ...(input.country !== undefined && { country: input.country }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_holding', content.assetClass, content.status]) },
    }), null);
    if (!row) return null;
    return toHolding(row as MemoryRow);
  },

  async deleteHolding(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async sellHolding(id: string, sellPrice: number, sellDate: string, soldBy: string): Promise<PortfolioHolding | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, status: 'sold', soldPrice: sellPrice, soldDate: sellDate, soldBy };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_holding', c.assetClass, 'sold']) },
    }), null);
    if (!row) return null;
    return toHolding(row as MemoryRow);
  },

  // ── Transactions ──

  async createTransaction(organizationId: string, workspaceId: string, input: CreateTransactionInput, createdBy: string): Promise<PortfolioTransaction> {
    const content = {
      holdingId: input.holdingId ?? null,
      type: input.type,
      quantity: input.quantity ?? 0,
      price: input.price ?? 0,
      amount: input.amount ?? 0,
      currency: input.currency ?? 'USD',
      transactionDate: input.transactionDate ?? null,
      fees: input.fees ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_transaction',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.holdingId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_transaction', content.type]),
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
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.holdingId) conditions.push({ content: { contains: `"holdingId":"${opts.holdingId}"` } });
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
      ...(input.holdingId !== undefined && { holdingId: input.holdingId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.quantity !== undefined && { quantity: input.quantity }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.transactionDate !== undefined && { transactionDate: input.transactionDate }),
      ...(input.fees !== undefined && { fees: input.fees }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_transaction', content.type]) },
    }), null);
    if (!row) return null;
    return toTransaction(row as MemoryRow);
  },

  async deleteTransaction(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Allocations ──

  async createAllocation(organizationId: string, workspaceId: string, input: CreateAllocationInput, createdBy: string): Promise<PortfolioAllocation> {
    const content = {
      name: input.name.trim(),
      strategy: input.strategy,
      targetWeights: input.targetWeights ?? {},
      currentWeights: input.currentWeights ?? {},
      driftThreshold: input.driftThreshold ?? 0,
      status: input.status ?? 'active',
      lastRebalancedAt: null,
      rebalancedBy: '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_allocation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_allocation', content.strategy, content.status]),
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
    if (opts.strategy) conditions.push({ content: { contains: `"strategy":"${opts.strategy}"` } });
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
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.strategy !== undefined && { strategy: input.strategy }),
      ...(input.targetWeights !== undefined && { targetWeights: input.targetWeights }),
      ...(input.currentWeights !== undefined && { currentWeights: input.currentWeights }),
      ...(input.driftThreshold !== undefined && { driftThreshold: input.driftThreshold }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_allocation', content.strategy, content.status]) },
    }), null);
    if (!row) return null;
    return toAllocation(row as MemoryRow);
  },

  async deleteAllocation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async rebalanceAllocation(id: string, rebalancedBy: string): Promise<PortfolioAllocation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = { ...c, lastRebalancedAt: new Date().toISOString(), rebalancedBy };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_allocation', c.strategy, c.status]) },
    }), null);
    if (!row) return null;
    return toAllocation(row as MemoryRow);
  },

  // ── Risks ──

  async createRisk(organizationId: string, workspaceId: string, input: CreateRiskInput, createdBy: string): Promise<PortfolioRisk> {
    const content = {
      name: input.name.trim(),
      riskLevel: input.riskLevel,
      status: input.status ?? 'within_limits',
      varAmount: input.varAmount ?? 0,
      beta: input.beta ?? 0,
      sharpeRatio: input.sharpeRatio ?? 0,
      maxDrawdown: input.maxDrawdown ?? 0,
      volatility: input.volatility ?? 0,
      concentration: input.concentration ?? 0,
      assessmentDate: input.assessmentDate ?? null,
      mitigationPlan: input.mitigationPlan ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'portfolio_risk',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['portfolio_risk', content.riskLevel, content.status]),
        createdBy,
      },
    });
    return toRisk(row as MemoryRow);
  },

  async getRisk(id: string): Promise<PortfolioRisk | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'portfolio_risk') return null;
    return toRisk(row as MemoryRow);
  },

  async listRisks(organizationId: string, opts: ListRisksOpts = {}): Promise<PortfolioRisk[]> {
    const where: Record<string, unknown> = { organizationId, type: 'portfolio_risk' };
    const conditions: unknown[] = [];
    if (opts.riskLevel) conditions.push({ content: { contains: `"riskLevel":"${opts.riskLevel}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRisk);
  },

  async updateRisk(id: string, input: UpdateRiskInput): Promise<PortfolioRisk | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.riskLevel !== undefined && { riskLevel: input.riskLevel }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.varAmount !== undefined && { varAmount: input.varAmount }),
      ...(input.beta !== undefined && { beta: input.beta }),
      ...(input.sharpeRatio !== undefined && { sharpeRatio: input.sharpeRatio }),
      ...(input.maxDrawdown !== undefined && { maxDrawdown: input.maxDrawdown }),
      ...(input.volatility !== undefined && { volatility: input.volatility }),
      ...(input.concentration !== undefined && { concentration: input.concentration }),
      ...(input.assessmentDate !== undefined && { assessmentDate: input.assessmentDate }),
      ...(input.mitigationPlan !== undefined && { mitigationPlan: input.mitigationPlan }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['portfolio_risk', content.riskLevel, content.status]) },
    }), null);
    if (!row) return null;
    return toRisk(row as MemoryRow);
  },

  async deleteRisk(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Metrics & Stats ──

  async getPortfolioMetrics(organizationId: string): Promise<PortfolioMetrics> {
    const holdings = await PortfolioService.listHoldings(organizationId);
    const active = holdings.filter((h) => h.status === 'active');
    const totalValue = active.reduce((sum, h) => sum + h.currentPrice * h.quantity, 0);
    const totalCost = active.reduce((sum, h) => sum + h.purchasePrice * h.quantity, 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? Math.round((totalGainLoss / totalCost) * 100) : 0;
    return { totalValue, totalCost, totalGainLoss, totalGainLossPercent, activeHoldings: active.length };
  },

  async getPortfolioStats(organizationId: string): Promise<PortfolioStats> {
    const [holdings, transactions, allocations, risks] = await Promise.all([
      PortfolioService.listHoldings(organizationId),
      PortfolioService.listTransactions(organizationId),
      PortfolioService.listAllocations(organizationId),
      PortfolioService.listRisks(organizationId),
    ]);
    const byAssetClass: Record<string, number> = {};
    const byHoldingStatus: Record<string, number> = {};
    const byTransactionType: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};
    for (const h of holdings) { byAssetClass[h.assetClass] = (byAssetClass[h.assetClass] ?? 0) + 1; byHoldingStatus[h.status] = (byHoldingStatus[h.status] ?? 0) + 1; }
    for (const t of transactions) { byTransactionType[t.type] = (byTransactionType[t.type] ?? 0) + 1; }
    for (const r of risks) { byRiskLevel[r.riskLevel] = (byRiskLevel[r.riskLevel] ?? 0) + 1; }
    return {
      holdingCount: holdings.length,
      activeHoldingCount: holdings.filter((h) => h.status === 'active').length,
      transactionCount: transactions.length,
      allocationCount: allocations.length,
      riskCount: risks.length,
      byAssetClass, byHoldingStatus, byTransactionType, byRiskLevel,
    };
  },
};
