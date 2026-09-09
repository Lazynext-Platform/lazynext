import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type PropertyType = 'office' | 'retail' | 'industrial' | 'residential' | 'land' | 'warehouse' | 'mixed_use' | 'special_purpose';
export type PropertyStatus = 'available' | 'leased' | 'under_renovation' | 'off_market' | 'sold';
export type ContractType = 'fixed' | 'triple_net' | 'gross' | 'modified_gross' | 'percentage' | 'ground_lease' | 'sublease';
export type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'renewed' | 'pending_renewal' | 'cancelled';
export type TenantType = 'individual' | 'corporate' | 'government' | 'nonprofit' | 'subsidiary';
export type TenantStatus = 'active' | 'inactive' | 'prospective' | 'former';
export type PaymentType = 'rent' | 'deposit' | 'late_fee' | 'penalty' | 'reimbursement' | 'adjustment' | 'cam';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'cancelled' | 'refunded';

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

export interface LeaseProperty {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: PropertyType;
  description: string;
  status: PropertyStatus;
  address: string;
  size: number;
  units: number;
  marketValue: number;
  monthlyRent: number;
  amenities: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseContract {
  id: string;
  organizationId: string;
  workspaceId: string;
  propertyId: string;
  tenantId: string;
  type: ContractType;
  description: string;
  status: ContractStatus;
  startDate: Date | null;
  endDate: Date | null;
  monthlyRent: number;
  securityDeposit: number;
  terms: string;
  options: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseTenant {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: TenantType;
  description: string;
  status: TenantStatus;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  creditScore: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeasePayment {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string;
  type: PaymentType;
  amount: number;
  currency: string;
  status: PaymentStatus;
  dueDate: Date | null;
  paidDate: Date | null;
  method: string;
  reference: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeaseManagementMetrics {
  activeContracts: number;
  totalMonthlyRent: number;
  pendingPayments: number;
  overduePayments: number;
  availableProperties: number;
  leasedProperties: number;
  activeTenants: number;
}

export interface LeaseManagementStats {
  propertyCount: number;
  contractCount: number;
  tenantCount: number;
  paymentCount: number;
  byPropertyType: Record<string, number>;
  byPropertyStatus: Record<string, number>;
  byContractType: Record<string, number>;
  byContractStatus: Record<string, number>;
  byTenantType: Record<string, number>;
  byTenantStatus: Record<string, number>;
  byPaymentType: Record<string, number>;
  byPaymentStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreatePropertyInput {
  name: string;
  type: PropertyType;
  description?: string;
  status?: PropertyStatus;
  address?: string;
  size?: number;
  units?: number;
  marketValue?: number;
  monthlyRent?: number;
  amenities?: string[];
  notes?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  type?: PropertyType;
  description?: string;
  status?: PropertyStatus;
  address?: string;
  size?: number;
  units?: number;
  marketValue?: number;
  monthlyRent?: number;
  amenities?: string[];
  notes?: string;
}

export interface ListPropertiesOpts {
  type?: PropertyType;
  status?: PropertyStatus;
}

export interface CreateContractInput {
  propertyId: string;
  tenantId: string;
  type: ContractType;
  description?: string;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  terms?: string;
  options?: string[];
  notes?: string;
}

export interface UpdateContractInput {
  propertyId?: string;
  tenantId?: string;
  type?: ContractType;
  description?: string;
  status?: ContractStatus;
  startDate?: string;
  endDate?: string;
  monthlyRent?: number;
  securityDeposit?: number;
  terms?: string;
  options?: string[];
  notes?: string;
}

export interface ListContractsOpts {
  propertyId?: string;
  tenantId?: string;
  type?: ContractType;
  status?: ContractStatus;
}

export interface CreateTenantInput {
  name: string;
  type: TenantType;
  description?: string;
  status?: TenantStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditScore?: number;
  notes?: string;
}

export interface UpdateTenantInput {
  name?: string;
  type?: TenantType;
  description?: string;
  status?: TenantStatus;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditScore?: number;
  notes?: string;
}

export interface ListTenantsOpts {
  type?: TenantType;
  status?: TenantStatus;
}

export interface CreatePaymentInput {
  contractId: string;
  type: PaymentType;
  amount: number;
  currency?: string;
  status?: PaymentStatus;
  dueDate?: string;
  paidDate?: string;
  method?: string;
  reference?: string;
  notes?: string;
}

export interface UpdatePaymentInput {
  contractId?: string;
  type?: PaymentType;
  amount?: number;
  currency?: string;
  status?: PaymentStatus;
  dueDate?: string;
  paidDate?: string;
  method?: string;
  reference?: string;
  notes?: string;
}

export interface ListPaymentsOpts {
  contractId?: string;
  type?: PaymentType;
  status?: PaymentStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toProperty(row: MemoryRow): LeaseProperty {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as PropertyType) ?? 'office',
    description: (c.description as string) ?? '',
    status: (c.status as PropertyStatus) ?? 'available',
    address: (c.address as string) ?? '',
    size: (c.size as number) ?? 0,
    units: (c.units as number) ?? 0,
    marketValue: (c.marketValue as number) ?? 0,
    monthlyRent: (c.monthlyRent as number) ?? 0,
    amenities: (c.amenities as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toContract(row: MemoryRow): LeaseContract {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    propertyId: (c.propertyId as string) ?? '',
    tenantId: (c.tenantId as string) ?? '',
    type: (c.type as ContractType) ?? 'fixed',
    description: (c.description as string) ?? '',
    status: (c.status as ContractStatus) ?? 'draft',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    monthlyRent: (c.monthlyRent as number) ?? 0,
    securityDeposit: (c.securityDeposit as number) ?? 0,
    terms: (c.terms as string) ?? '',
    options: (c.options as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toTenant(row: MemoryRow): LeaseTenant {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as TenantType) ?? 'individual',
    description: (c.description as string) ?? '',
    status: (c.status as TenantStatus) ?? 'prospective',
    contactName: (c.contactName as string) ?? '',
    email: (c.email as string) ?? '',
    phone: (c.phone as string) ?? '',
    address: (c.address as string) ?? '',
    creditScore: (c.creditScore as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toPayment(row: MemoryRow): LeasePayment {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    contractId: (c.contractId as string) ?? '',
    type: (c.type as PaymentType) ?? 'rent',
    amount: (c.amount as number) ?? 0,
    currency: (c.currency as string) ?? 'USD',
    status: (c.status as PaymentStatus) ?? 'pending',
    dueDate: c.dueDate ? new Date(c.dueDate as string) : null,
    paidDate: c.paidDate ? new Date(c.paidDate as string) : null,
    method: (c.method as string) ?? '',
    reference: (c.reference as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const LeaseManagementService = {
  // ── Properties ──

  async createProperty(organizationId: string, workspaceId: string, input: CreatePropertyInput, createdBy: string): Promise<LeaseProperty> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'available',
      address: input.address ?? '',
      size: input.size ?? 0,
      units: input.units ?? 0,
      marketValue: input.marketValue ?? 0,
      monthlyRent: input.monthlyRent ?? 0,
      amenities: input.amenities ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lease_property',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lease_property', content.type, content.status]),
        createdBy,
      },
    });
    return toProperty(row as MemoryRow);
  },

  async getProperty(id: string): Promise<LeaseProperty | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lease_property') return null;
    return toProperty(row as MemoryRow);
  },

  async listProperties(organizationId: string, opts: ListPropertiesOpts = {}): Promise<LeaseProperty[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lease_property' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProperty);
  },

  async updateProperty(id: string, input: UpdatePropertyInput): Promise<LeaseProperty | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.size !== undefined && { size: input.size }),
      ...(input.units !== undefined && { units: input.units }),
      ...(input.marketValue !== undefined && { marketValue: input.marketValue }),
      ...(input.monthlyRent !== undefined && { monthlyRent: input.monthlyRent }),
      ...(input.amenities !== undefined && { amenities: input.amenities }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lease_property', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toProperty(row as MemoryRow);
  },

  async deleteProperty(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  // ── Contracts ──

  async createContract(organizationId: string, workspaceId: string, input: CreateContractInput, createdBy: string): Promise<LeaseContract> {
    const content = {
      propertyId: input.propertyId,
      tenantId: input.tenantId,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      monthlyRent: input.monthlyRent ?? 0,
      securityDeposit: input.securityDeposit ?? 0,
      terms: input.terms ?? '',
      options: input.options ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lease_contract',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.propertyId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lease_contract', content.type, content.status]),
        createdBy,
      },
    });
    return toContract(row as MemoryRow);
  },

  async getContract(id: string): Promise<LeaseContract | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lease_contract') return null;
    return toContract(row as MemoryRow);
  },

  async listContracts(organizationId: string, opts: ListContractsOpts = {}): Promise<LeaseContract[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lease_contract' };
    const conditions: unknown[] = [];
    if (opts.propertyId) conditions.push({ content: { contains: `"propertyId":"${opts.propertyId}"` } });
    if (opts.tenantId) conditions.push({ content: { contains: `"tenantId":"${opts.tenantId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toContract);
  },

  async updateContract(id: string, input: UpdateContractInput): Promise<LeaseContract | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.propertyId !== undefined && { propertyId: input.propertyId }),
      ...(input.tenantId !== undefined && { tenantId: input.tenantId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.monthlyRent !== undefined && { monthlyRent: input.monthlyRent }),
      ...(input.securityDeposit !== undefined && { securityDeposit: input.securityDeposit }),
      ...(input.terms !== undefined && { terms: input.terms }),
      ...(input.options !== undefined && { options: input.options }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lease_contract', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toContract(row as MemoryRow);
  },

  async deleteContract(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateContract(id: string, _activatedBy: string): Promise<LeaseContract | null> {
    return LeaseManagementService.updateContract(id, { status: 'active' });
  },

  async expireContract(id: string, _expiredBy: string): Promise<LeaseContract | null> {
    return LeaseManagementService.updateContract(id, { status: 'expired' });
  },

  async terminateContract(id: string, _terminatedBy: string): Promise<LeaseContract | null> {
    return LeaseManagementService.updateContract(id, { status: 'terminated' });
  },

  async renewContract(id: string, _renewedBy: string): Promise<LeaseContract | null> {
    return LeaseManagementService.updateContract(id, { status: 'renewed' });
  },

  // ── Tenants ──

  async createTenant(organizationId: string, workspaceId: string, input: CreateTenantInput, createdBy: string): Promise<LeaseTenant> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'prospective',
      contactName: input.contactName ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      address: input.address ?? '',
      creditScore: input.creditScore ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lease_tenant',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lease_tenant', content.type, content.status]),
        createdBy,
      },
    });
    return toTenant(row as MemoryRow);
  },

  async getTenant(id: string): Promise<LeaseTenant | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lease_tenant') return null;
    return toTenant(row as MemoryRow);
  },

  async listTenants(organizationId: string, opts: ListTenantsOpts = {}): Promise<LeaseTenant[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lease_tenant' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toTenant);
  },

  async updateTenant(id: string, input: UpdateTenantInput): Promise<LeaseTenant | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.contactName !== undefined && { contactName: input.contactName }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.creditScore !== undefined && { creditScore: input.creditScore }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lease_tenant', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toTenant(row as MemoryRow);
  },

  async deleteTenant(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateTenant(id: string, _activatedBy: string): Promise<LeaseTenant | null> {
    return LeaseManagementService.updateTenant(id, { status: 'active' });
  },

  async deactivateTenant(id: string, _deactivatedBy: string): Promise<LeaseTenant | null> {
    return LeaseManagementService.updateTenant(id, { status: 'inactive' });
  },

  // ── Payments ──

  async createPayment(organizationId: string, workspaceId: string, input: CreatePaymentInput, createdBy: string): Promise<LeasePayment> {
    const content = {
      contractId: input.contractId,
      type: input.type,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      status: input.status ?? 'pending',
      dueDate: input.dueDate ?? null,
      paidDate: input.paidDate ?? null,
      method: input.method ?? '',
      reference: input.reference ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'lease_payment',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.contractId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['lease_payment', content.type, content.status]),
        createdBy,
      },
    });
    return toPayment(row as MemoryRow);
  },

  async getPayment(id: string): Promise<LeasePayment | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'lease_payment') return null;
    return toPayment(row as MemoryRow);
  },

  async listPayments(organizationId: string, opts: ListPaymentsOpts = {}): Promise<LeasePayment[]> {
    const where: Record<string, unknown> = { organizationId, type: 'lease_payment' };
    const conditions: unknown[] = [];
    if (opts.contractId) conditions.push({ content: { contains: `"contractId":"${opts.contractId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toPayment);
  },

  async updatePayment(id: string, input: UpdatePaymentInput): Promise<LeasePayment | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.contractId !== undefined && { contractId: input.contractId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
      ...(input.method !== undefined && { method: input.method }),
      ...(input.reference !== undefined && { reference: input.reference }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['lease_payment', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toPayment(row as MemoryRow);
  },

  async deletePayment(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async markPaid(id: string, _paidBy: string): Promise<LeasePayment | null> {
    return LeaseManagementService.updatePayment(id, { status: 'paid', paidDate: new Date().toISOString() });
  },

  async markOverdue(id: string, _markedBy: string): Promise<LeasePayment | null> {
    return LeaseManagementService.updatePayment(id, { status: 'overdue' });
  },

  async refundPayment(id: string, _refundedBy: string): Promise<LeasePayment | null> {
    return LeaseManagementService.updatePayment(id, { status: 'refunded' });
  },

  // ── Metrics & Stats ──

  async getLeaseManagementMetrics(organizationId: string): Promise<LeaseManagementMetrics> {
    const [contracts, payments, properties, tenants] = await Promise.all([
      LeaseManagementService.listContracts(organizationId),
      LeaseManagementService.listPayments(organizationId),
      LeaseManagementService.listProperties(organizationId),
      LeaseManagementService.listTenants(organizationId),
    ]);
    const activeContracts = contracts.filter((c) => c.status === 'active').length;
    const totalMonthlyRent = contracts.filter((c) => c.status === 'active').reduce((sum, c) => sum + c.monthlyRent, 0);
    const pendingPayments = payments.filter((p) => p.status === 'pending').length;
    const overduePayments = payments.filter((p) => p.status === 'overdue').length;
    const availableProperties = properties.filter((p) => p.status === 'available').length;
    const leasedProperties = properties.filter((p) => p.status === 'leased').length;
    const activeTenants = tenants.filter((t) => t.status === 'active').length;
    return { activeContracts, totalMonthlyRent, pendingPayments, overduePayments, availableProperties, leasedProperties, activeTenants };
  },

  async getLeaseManagementStats(organizationId: string): Promise<LeaseManagementStats> {
    const [properties, contracts, tenants, payments] = await Promise.all([
      LeaseManagementService.listProperties(organizationId),
      LeaseManagementService.listContracts(organizationId),
      LeaseManagementService.listTenants(organizationId),
      LeaseManagementService.listPayments(organizationId),
    ]);
    const byPropertyType: Record<string, number> = {};
    const byPropertyStatus: Record<string, number> = {};
    const byContractType: Record<string, number> = {};
    const byContractStatus: Record<string, number> = {};
    const byTenantType: Record<string, number> = {};
    const byTenantStatus: Record<string, number> = {};
    const byPaymentType: Record<string, number> = {};
    const byPaymentStatus: Record<string, number> = {};
    for (const p of properties) { byPropertyType[p.type] = (byPropertyType[p.type] ?? 0) + 1; byPropertyStatus[p.status] = (byPropertyStatus[p.status] ?? 0) + 1; }
    for (const c of contracts) { byContractType[c.type] = (byContractType[c.type] ?? 0) + 1; byContractStatus[c.status] = (byContractStatus[c.status] ?? 0) + 1; }
    for (const t of tenants) { byTenantType[t.type] = (byTenantType[t.type] ?? 0) + 1; byTenantStatus[t.status] = (byTenantStatus[t.status] ?? 0) + 1; }
    for (const p of payments) { byPaymentType[p.type] = (byPaymentType[p.type] ?? 0) + 1; byPaymentStatus[p.status] = (byPaymentStatus[p.status] ?? 0) + 1; }
    return {
      propertyCount: properties.length,
      contractCount: contracts.length,
      tenantCount: tenants.length,
      paymentCount: payments.length,
      byPropertyType, byPropertyStatus, byContractType, byContractStatus, byTenantType, byTenantStatus, byPaymentType, byPaymentStatus,
    };
  },
};
