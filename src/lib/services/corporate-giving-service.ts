import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type DonationType = 'cash' | 'in_kind' | 'product' | 'service' | 'matching' | 'disaster_relief' | 'scholarship';
export type DonationStatus = 'proposed' | 'approved' | 'completed' | 'rejected' | 'cancelled';
export type SponsorshipType = 'event' | 'organization' | 'team' | 'individual' | 'program' | 'venue' | 'conference';
export type SponsorshipStatus = 'proposed' | 'active' | 'completed' | 'expired' | 'cancelled';
export type GrantType = 'foundation' | 'corporate' | 'matching' | 'emergency' | 'research' | 'community' | 'education';
export type GrantStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed' | 'completed' | 'cancelled';
export type ProgramType = 'employee_volunteer' | 'skills_based' | 'team_building' | 'board_service' | 'pro_bono' | 'mentoring' | 'disaster_response';
export type ProgramStatus = 'planned' | 'active' | 'paused' | 'completed' | 'cancelled';

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

export interface GivingDonation {
  id: string;
  organizationId: string;
  workspaceId: string;
  recipient: string;
  type: DonationType;
  amount: number;
  description: string;
  status: DonationStatus;
  date: Date | null;
  category: string;
  purpose: string;
  restrictions: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GivingSponsorship {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: SponsorshipType;
  recipient: string;
  amount: number;
  description: string;
  status: SponsorshipStatus;
  startDate: Date | null;
  endDate: Date | null;
  benefits: string;
  terms: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GivingGrant {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: GrantType;
  recipient: string;
  amount: number;
  description: string;
  status: GrantStatus;
  applicationDate: Date | null;
  decisionDate: Date | null;
  disbursementDate: Date | null;
  period: string;
  requirements: string;
  reportDue: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VolunteerProgram {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: ProgramType;
  description: string;
  status: ProgramStatus;
  startDate: Date | null;
  endDate: Date | null;
  coordinator: string;
  participants: number;
  hours: number;
  partner: string;
  location: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CorporateGivingMetrics {
  totalDonations: number;
  activeSponsorships: number;
  activeGrants: number;
  activePrograms: number;
  totalVolunteerHours: number;
}

export interface CorporateGivingStats {
  donationCount: number;
  sponsorshipCount: number;
  grantCount: number;
  programCount: number;
  byDonationType: Record<string, number>;
  byDonationStatus: Record<string, number>;
  bySponsorshipType: Record<string, number>;
  bySponsorshipStatus: Record<string, number>;
  byGrantType: Record<string, number>;
  byGrantStatus: Record<string, number>;
  byProgramType: Record<string, number>;
  byProgramStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateDonationInput {
  recipient: string;
  type: DonationType;
  amount?: number;
  description?: string;
  status?: DonationStatus;
  date?: string;
  category?: string;
  purpose?: string;
  restrictions?: string;
  notes?: string;
}

export interface UpdateDonationInput {
  recipient?: string;
  type?: DonationType;
  amount?: number;
  description?: string;
  status?: DonationStatus;
  date?: string;
  category?: string;
  purpose?: string;
  restrictions?: string;
  notes?: string;
}

export interface ListDonationsOpts {
  type?: DonationType;
  status?: DonationStatus;
}

export interface CreateSponsorshipInput {
  name: string;
  type: SponsorshipType;
  recipient?: string;
  amount?: number;
  description?: string;
  status?: SponsorshipStatus;
  startDate?: string;
  endDate?: string;
  benefits?: string;
  terms?: string;
  notes?: string;
}

export interface UpdateSponsorshipInput {
  name?: string;
  type?: SponsorshipType;
  recipient?: string;
  amount?: number;
  description?: string;
  status?: SponsorshipStatus;
  startDate?: string;
  endDate?: string;
  benefits?: string;
  terms?: string;
  notes?: string;
}

export interface ListSponsorshipsOpts {
  type?: SponsorshipType;
  status?: SponsorshipStatus;
}

export interface CreateGrantInput {
  title: string;
  type: GrantType;
  recipient?: string;
  amount?: number;
  description?: string;
  status?: GrantStatus;
  applicationDate?: string;
  decisionDate?: string;
  disbursementDate?: string;
  period?: string;
  requirements?: string;
  reportDue?: string;
  notes?: string;
}

export interface UpdateGrantInput {
  title?: string;
  type?: GrantType;
  recipient?: string;
  amount?: number;
  description?: string;
  status?: GrantStatus;
  applicationDate?: string;
  decisionDate?: string;
  disbursementDate?: string;
  period?: string;
  requirements?: string;
  reportDue?: string;
  notes?: string;
}

export interface ListGrantsOpts {
  type?: GrantType;
  status?: GrantStatus;
}

export interface CreateProgramInput {
  name: string;
  type: ProgramType;
  description?: string;
  status?: ProgramStatus;
  startDate?: string;
  endDate?: string;
  coordinator?: string;
  participants?: number;
  hours?: number;
  partner?: string;
  location?: string;
  notes?: string;
}

export interface UpdateProgramInput {
  name?: string;
  type?: ProgramType;
  description?: string;
  status?: ProgramStatus;
  startDate?: string;
  endDate?: string;
  coordinator?: string;
  participants?: number;
  hours?: number;
  partner?: string;
  location?: string;
  notes?: string;
}

export interface ListProgramsOpts {
  type?: ProgramType;
  status?: ProgramStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toDonation(row: MemoryRow): GivingDonation {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    recipient: (c.recipient as string) ?? '',
    type: (c.type as DonationType) ?? 'cash',
    amount: (c.amount as number) ?? 0,
    description: (c.description as string) ?? '',
    status: (c.status as DonationStatus) ?? 'proposed',
    date: c.date ? new Date(c.date as string) : null,
    category: (c.category as string) ?? '',
    purpose: (c.purpose as string) ?? '',
    restrictions: (c.restrictions as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSponsorship(row: MemoryRow): GivingSponsorship {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as SponsorshipType) ?? 'event',
    recipient: (c.recipient as string) ?? '',
    amount: (c.amount as number) ?? 0,
    description: (c.description as string) ?? '',
    status: (c.status as SponsorshipStatus) ?? 'proposed',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    benefits: (c.benefits as string) ?? '',
    terms: (c.terms as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toGrant(row: MemoryRow): GivingGrant {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: (c.title as string) ?? '',
    type: (c.type as GrantType) ?? 'foundation',
    recipient: (c.recipient as string) ?? '',
    amount: (c.amount as number) ?? 0,
    description: (c.description as string) ?? '',
    status: (c.status as GrantStatus) ?? 'draft',
    applicationDate: c.applicationDate ? new Date(c.applicationDate as string) : null,
    decisionDate: c.decisionDate ? new Date(c.decisionDate as string) : null,
    disbursementDate: c.disbursementDate ? new Date(c.disbursementDate as string) : null,
    period: (c.period as string) ?? '',
    requirements: (c.requirements as string) ?? '',
    reportDue: c.reportDue ? new Date(c.reportDue as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toProgram(row: MemoryRow): VolunteerProgram {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as ProgramType) ?? 'employee_volunteer',
    description: (c.description as string) ?? '',
    status: (c.status as ProgramStatus) ?? 'planned',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    coordinator: (c.coordinator as string) ?? '',
    participants: (c.participants as number) ?? 0,
    hours: (c.hours as number) ?? 0,
    partner: (c.partner as string) ?? '',
    location: (c.location as string) ?? '',
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const CorporateGivingService = {
  // ── Donations ──

  async createDonation(organizationId: string, workspaceId: string, input: CreateDonationInput, createdBy: string): Promise<GivingDonation> {
    const content = {
      recipient: input.recipient.trim(),
      type: input.type,
      amount: input.amount ?? 0,
      description: input.description ?? '',
      status: input.status ?? 'proposed',
      date: input.date ?? null,
      category: input.category ?? '',
      purpose: input.purpose ?? '',
      restrictions: input.restrictions ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'giving_donation',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['giving_donation', content.type, content.status]),
        createdBy,
      },
    });
    return toDonation(row as MemoryRow);
  },

  async getDonation(id: string): Promise<GivingDonation | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'giving_donation') return null;
    return toDonation(row as MemoryRow);
  },

  async listDonations(organizationId: string, opts: ListDonationsOpts = {}): Promise<GivingDonation[]> {
    const where: Record<string, unknown> = { organizationId, type: 'giving_donation' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDonation);
  },

  async updateDonation(id: string, input: UpdateDonationInput): Promise<GivingDonation | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.recipient !== undefined && { recipient: input.recipient.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.category !== undefined && { category: input.category }),
      ...(input.purpose !== undefined && { purpose: input.purpose }),
      ...(input.restrictions !== undefined && { restrictions: input.restrictions }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['giving_donation', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDonation(row as MemoryRow);
  },

  async deleteDonation(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveDonation(id: string, _approvedBy: string): Promise<GivingDonation | null> {
    return CorporateGivingService.updateDonation(id, { status: 'approved' });
  },

  async completeDonation(id: string, _completedBy: string): Promise<GivingDonation | null> {
    return CorporateGivingService.updateDonation(id, { status: 'completed', date: new Date().toISOString() });
  },

  async rejectDonation(id: string, _rejectedBy: string): Promise<GivingDonation | null> {
    return CorporateGivingService.updateDonation(id, { status: 'rejected' });
  },

  // ── Sponsorships ──

  async createSponsorship(organizationId: string, workspaceId: string, input: CreateSponsorshipInput, createdBy: string): Promise<GivingSponsorship> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      recipient: input.recipient ?? '',
      amount: input.amount ?? 0,
      description: input.description ?? '',
      status: input.status ?? 'proposed',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      benefits: input.benefits ?? '',
      terms: input.terms ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'giving_sponsorship',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['giving_sponsorship', content.type, content.status]),
        createdBy,
      },
    });
    return toSponsorship(row as MemoryRow);
  },

  async getSponsorship(id: string): Promise<GivingSponsorship | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'giving_sponsorship') return null;
    return toSponsorship(row as MemoryRow);
  },

  async listSponsorships(organizationId: string, opts: ListSponsorshipsOpts = {}): Promise<GivingSponsorship[]> {
    const where: Record<string, unknown> = { organizationId, type: 'giving_sponsorship' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toSponsorship);
  },

  async updateSponsorship(id: string, input: UpdateSponsorshipInput): Promise<GivingSponsorship | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.recipient !== undefined && { recipient: input.recipient }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.benefits !== undefined && { benefits: input.benefits }),
      ...(input.terms !== undefined && { terms: input.terms }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['giving_sponsorship', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toSponsorship(row as MemoryRow);
  },

  async deleteSponsorship(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateSponsorship(id: string, _activatedBy: string): Promise<GivingSponsorship | null> {
    return CorporateGivingService.updateSponsorship(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async completeSponsorship(id: string, _completedBy: string): Promise<GivingSponsorship | null> {
    return CorporateGivingService.updateSponsorship(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  async cancelSponsorship(id: string, _cancelledBy: string): Promise<GivingSponsorship | null> {
    return CorporateGivingService.updateSponsorship(id, { status: 'cancelled' });
  },

  // ── Grants ──

  async createGrant(organizationId: string, workspaceId: string, input: CreateGrantInput, createdBy: string): Promise<GivingGrant> {
    const content = {
      title: input.title.trim(),
      type: input.type,
      recipient: input.recipient ?? '',
      amount: input.amount ?? 0,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      applicationDate: input.applicationDate ?? null,
      decisionDate: input.decisionDate ?? null,
      disbursementDate: input.disbursementDate ?? null,
      period: input.period ?? '',
      requirements: input.requirements ?? '',
      reportDue: input.reportDue ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'giving_grant',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['giving_grant', content.type, content.status]),
        createdBy,
      },
    });
    return toGrant(row as MemoryRow);
  },

  async getGrant(id: string): Promise<GivingGrant | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'giving_grant') return null;
    return toGrant(row as MemoryRow);
  },

  async listGrants(organizationId: string, opts: ListGrantsOpts = {}): Promise<GivingGrant[]> {
    const where: Record<string, unknown> = { organizationId, type: 'giving_grant' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toGrant);
  },

  async updateGrant(id: string, input: UpdateGrantInput): Promise<GivingGrant | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.title !== undefined && { title: input.title.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.recipient !== undefined && { recipient: input.recipient }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.applicationDate !== undefined && { applicationDate: input.applicationDate }),
      ...(input.decisionDate !== undefined && { decisionDate: input.decisionDate }),
      ...(input.disbursementDate !== undefined && { disbursementDate: input.disbursementDate }),
      ...(input.period !== undefined && { period: input.period }),
      ...(input.requirements !== undefined && { requirements: input.requirements }),
      ...(input.reportDue !== undefined && { reportDue: input.reportDue }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['giving_grant', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toGrant(row as MemoryRow);
  },

  async deleteGrant(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async submitGrant(id: string, _submittedBy: string): Promise<GivingGrant | null> {
    return CorporateGivingService.updateGrant(id, { status: 'submitted', applicationDate: new Date().toISOString() });
  },

  async approveGrant(id: string, _approvedBy: string): Promise<GivingGrant | null> {
    return CorporateGivingService.updateGrant(id, { status: 'approved', decisionDate: new Date().toISOString() });
  },

  async rejectGrant(id: string, _rejectedBy: string): Promise<GivingGrant | null> {
    return CorporateGivingService.updateGrant(id, { status: 'rejected', decisionDate: new Date().toISOString() });
  },

  async disburseGrant(id: string, _disbursedBy: string): Promise<GivingGrant | null> {
    return CorporateGivingService.updateGrant(id, { status: 'disbursed', disbursementDate: new Date().toISOString() });
  },

  async completeGrant(id: string, _completedBy: string): Promise<GivingGrant | null> {
    return CorporateGivingService.updateGrant(id, { status: 'completed' });
  },

  // ── Volunteer Programs ──

  async createProgram(organizationId: string, workspaceId: string, input: CreateProgramInput, createdBy: string): Promise<VolunteerProgram> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'planned',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      coordinator: input.coordinator ?? '',
      participants: input.participants ?? 0,
      hours: input.hours ?? 0,
      partner: input.partner ?? '',
      location: input.location ?? '',
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'volunteer_program',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['volunteer_program', content.type, content.status]),
        createdBy,
      },
    });
    return toProgram(row as MemoryRow);
  },

  async getProgram(id: string): Promise<VolunteerProgram | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'volunteer_program') return null;
    return toProgram(row as MemoryRow);
  },

  async listPrograms(organizationId: string, opts: ListProgramsOpts = {}): Promise<VolunteerProgram[]> {
    const where: Record<string, unknown> = { organizationId, type: 'volunteer_program' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toProgram);
  },

  async updateProgram(id: string, input: UpdateProgramInput): Promise<VolunteerProgram | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.coordinator !== undefined && { coordinator: input.coordinator }),
      ...(input.participants !== undefined && { participants: input.participants }),
      ...(input.hours !== undefined && { hours: input.hours }),
      ...(input.partner !== undefined && { partner: input.partner }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['volunteer_program', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toProgram(row as MemoryRow);
  },

  async deleteProgram(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async startProgram(id: string, _startedBy: string): Promise<VolunteerProgram | null> {
    return CorporateGivingService.updateProgram(id, { status: 'active', startDate: new Date().toISOString() });
  },

  async pauseProgram(id: string, _pausedBy: string): Promise<VolunteerProgram | null> {
    return CorporateGivingService.updateProgram(id, { status: 'paused' });
  },

  async completeProgram(id: string, _completedBy: string): Promise<VolunteerProgram | null> {
    return CorporateGivingService.updateProgram(id, { status: 'completed', endDate: new Date().toISOString() });
  },

  // ── Metrics & Stats ──

  async getCorporateGivingMetrics(organizationId: string): Promise<CorporateGivingMetrics> {
    const [donations, sponsorships, grants, programs] = await Promise.all([
      CorporateGivingService.listDonations(organizationId),
      CorporateGivingService.listSponsorships(organizationId),
      CorporateGivingService.listGrants(organizationId),
      CorporateGivingService.listPrograms(organizationId),
    ]);
    const totalDonations = donations.filter((d) => d.status === 'completed').reduce((sum, d) => sum + d.amount, 0);
    const activeSponsorships = sponsorships.filter((s) => s.status === 'active').length;
    const activeGrants = grants.filter((g) => g.status === 'approved' || g.status === 'disbursed').length;
    const activePrograms = programs.filter((p) => p.status === 'active').length;
    const totalVolunteerHours = programs.filter((p) => p.status === 'completed' || p.status === 'active').reduce((sum, p) => sum + p.hours, 0);
    return { totalDonations, activeSponsorships, activeGrants, activePrograms, totalVolunteerHours };
  },

  async getCorporateGivingStats(organizationId: string): Promise<CorporateGivingStats> {
    const [donations, sponsorships, grants, programs] = await Promise.all([
      CorporateGivingService.listDonations(organizationId),
      CorporateGivingService.listSponsorships(organizationId),
      CorporateGivingService.listGrants(organizationId),
      CorporateGivingService.listPrograms(organizationId),
    ]);
    const byDonationType: Record<string, number> = {};
    const byDonationStatus: Record<string, number> = {};
    const bySponsorshipType: Record<string, number> = {};
    const bySponsorshipStatus: Record<string, number> = {};
    const byGrantType: Record<string, number> = {};
    const byGrantStatus: Record<string, number> = {};
    const byProgramType: Record<string, number> = {};
    const byProgramStatus: Record<string, number> = {};
    for (const d of donations) {
      byDonationType[d.type] = (byDonationType[d.type] ?? 0) + 1;
      byDonationStatus[d.status] = (byDonationStatus[d.status] ?? 0) + 1;
    }
    for (const s of sponsorships) {
      bySponsorshipType[s.type] = (bySponsorshipType[s.type] ?? 0) + 1;
      bySponsorshipStatus[s.status] = (bySponsorshipStatus[s.status] ?? 0) + 1;
    }
    for (const g of grants) {
      byGrantType[g.type] = (byGrantType[g.type] ?? 0) + 1;
      byGrantStatus[g.status] = (byGrantStatus[g.status] ?? 0) + 1;
    }
    for (const p of programs) {
      byProgramType[p.type] = (byProgramType[p.type] ?? 0) + 1;
      byProgramStatus[p.status] = (byProgramStatus[p.status] ?? 0) + 1;
    }
    return {
      donationCount: donations.length,
      sponsorshipCount: sponsorships.length,
      grantCount: grants.length,
      programCount: programs.length,
      byDonationType, byDonationStatus,
      bySponsorshipType, bySponsorshipStatus,
      byGrantType, byGrantStatus,
      byProgramType, byProgramStatus,
    };
  },
};
