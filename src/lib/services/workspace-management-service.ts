import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type DeskType = 'standing' | 'sitting' | 'hot' | 'dedicated' | 'adjustable' | 'quiet' | 'collaborative';
export type DeskStatus = 'active' | 'inactive' | 'maintained' | 'reserved' | 'offline';
export type RoomType = 'conference' | 'huddle' | 'boardroom' | 'training' | 'meeting' | 'auditorium' | 'breakout' | 'focus';
export type RoomStatus = 'active' | 'maintained' | 'inactive' | 'reserved' | 'offline';
export type LayoutType = 'floor_plan' | 'zone' | 'seating' | 'emergency' | 'parking' | 'utility';
export type LayoutStatus = 'active' | 'archived' | 'revision' | 'draft';
export type BookingType = 'daily' | 'hourly' | 'recurring' | 'permanent' | 'temporary' | 'event';
export type BookingStatus = 'pending' | 'approved' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show';

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

export interface WorkspaceDesk {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: DeskType;
  description: string;
  status: DeskStatus;
  location: string;
  floor: string;
  zone: string;
  capacity: number;
  equipment: string[];
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeetingRoom {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: RoomType;
  description: string;
  status: RoomStatus;
  location: string;
  floor: string;
  capacity: number;
  equipment: string[];
  bookingRequired: boolean;
  hourlyRate: number;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfficeLayout {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  type: LayoutType;
  description: string;
  status: LayoutStatus;
  floor: string;
  zones: string[];
  dimensions: string;
  lastUpdated: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeskBooking {
  id: string;
  organizationId: string;
  workspaceId: string;
  deskId: string | null;
  type: BookingType;
  description: string;
  status: BookingStatus;
  bookedBy: string;
  department: string;
  startDate: Date | null;
  endDate: Date | null;
  checkInDate: Date | null;
  checkOutDate: Date | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceManagementMetrics {
  activeDesks: number;
  availableRooms: number;
  activeBookings: number;
  pendingBookings: number;
  maintainedDesks: number;
}

export interface WorkspaceManagementStats {
  deskCount: number;
  roomCount: number;
  layoutCount: number;
  bookingCount: number;
  byDeskType: Record<string, number>;
  byDeskStatus: Record<string, number>;
  byRoomType: Record<string, number>;
  byRoomStatus: Record<string, number>;
  byLayoutType: Record<string, number>;
  byLayoutStatus: Record<string, number>;
  byBookingType: Record<string, number>;
  byBookingStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateDeskInput {
  name: string;
  type: DeskType;
  description?: string;
  status?: DeskStatus;
  location?: string;
  floor?: string;
  zone?: string;
  capacity?: number;
  equipment?: string[];
  notes?: string;
}

export interface UpdateDeskInput {
  name?: string;
  type?: DeskType;
  description?: string;
  status?: DeskStatus;
  location?: string;
  floor?: string;
  zone?: string;
  capacity?: number;
  equipment?: string[];
  notes?: string;
}

export interface ListDesksOpts {
  type?: DeskType;
  status?: DeskStatus;
}

export interface CreateRoomInput {
  name: string;
  type: RoomType;
  description?: string;
  status?: RoomStatus;
  location?: string;
  floor?: string;
  capacity?: number;
  equipment?: string[];
  bookingRequired?: boolean;
  hourlyRate?: number;
  notes?: string;
}

export interface UpdateRoomInput {
  name?: string;
  type?: RoomType;
  description?: string;
  status?: RoomStatus;
  location?: string;
  floor?: string;
  capacity?: number;
  equipment?: string[];
  bookingRequired?: boolean;
  hourlyRate?: number;
  notes?: string;
}

export interface ListRoomsOpts {
  type?: RoomType;
  status?: RoomStatus;
}

export interface CreateLayoutInput {
  name: string;
  type: LayoutType;
  description?: string;
  status?: LayoutStatus;
  floor?: string;
  zones?: string[];
  dimensions?: string;
  lastUpdated?: string;
  notes?: string;
}

export interface UpdateLayoutInput {
  name?: string;
  type?: LayoutType;
  description?: string;
  status?: LayoutStatus;
  floor?: string;
  zones?: string[];
  dimensions?: string;
  lastUpdated?: string;
  notes?: string;
}

export interface ListLayoutsOpts {
  type?: LayoutType;
  status?: LayoutStatus;
}

export interface CreateBookingInput {
  deskId?: string;
  type: BookingType;
  description?: string;
  status?: BookingStatus;
  bookedBy?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
}

export interface UpdateBookingInput {
  deskId?: string;
  type?: BookingType;
  description?: string;
  status?: BookingStatus;
  bookedBy?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  checkInDate?: string;
  checkOutDate?: string;
  notes?: string;
}

export interface ListBookingsOpts {
  deskId?: string;
  type?: BookingType;
  status?: BookingStatus;
}

// ── Parsing helpers ──

function parseContent(content: string): Record<string, unknown> {
  try { return JSON.parse(content); } catch { return {}; }
}

function toDesk(row: MemoryRow): WorkspaceDesk {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as DeskType) ?? 'sitting',
    description: (c.description as string) ?? '',
    status: (c.status as DeskStatus) ?? 'active',
    location: (c.location as string) ?? '',
    floor: (c.floor as string) ?? '',
    zone: (c.zone as string) ?? '',
    capacity: (c.capacity as number) ?? 1,
    equipment: (c.equipment as string[]) ?? [],
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRoom(row: MemoryRow): MeetingRoom {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as RoomType) ?? 'meeting',
    description: (c.description as string) ?? '',
    status: (c.status as RoomStatus) ?? 'active',
    location: (c.location as string) ?? '',
    floor: (c.floor as string) ?? '',
    capacity: (c.capacity as number) ?? 1,
    equipment: (c.equipment as string[]) ?? [],
    bookingRequired: (c.bookingRequired as boolean) ?? true,
    hourlyRate: (c.hourlyRate as number) ?? 0,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toLayout(row: MemoryRow): OfficeLayout {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: (c.name as string) ?? '',
    type: (c.type as LayoutType) ?? 'floor_plan',
    description: (c.description as string) ?? '',
    status: (c.status as LayoutStatus) ?? 'draft',
    floor: (c.floor as string) ?? '',
    zones: (c.zones as string[]) ?? [],
    dimensions: (c.dimensions as string) ?? '',
    lastUpdated: c.lastUpdated ? new Date(c.lastUpdated as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toBooking(row: MemoryRow): DeskBooking {
  const c = parseContent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    deskId: (c.deskId as string) ?? null,
    type: (c.type as BookingType) ?? 'daily',
    description: (c.description as string) ?? '',
    status: (c.status as BookingStatus) ?? 'pending',
    bookedBy: (c.bookedBy as string) ?? '',
    department: (c.department as string) ?? '',
    startDate: c.startDate ? new Date(c.startDate as string) : null,
    endDate: c.endDate ? new Date(c.endDate as string) : null,
    checkInDate: c.checkInDate ? new Date(c.checkInDate as string) : null,
    checkOutDate: c.checkOutDate ? new Date(c.checkOutDate as string) : null,
    notes: (c.notes as string) ?? '',
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Service ──

export const WorkspaceManagementService = {
  // ── Desks ──

  async createDesk(organizationId: string, workspaceId: string, input: CreateDeskInput, createdBy: string): Promise<WorkspaceDesk> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      location: input.location ?? '',
      floor: input.floor ?? '',
      zone: input.zone ?? '',
      capacity: input.capacity ?? 1,
      equipment: input.equipment ?? [],
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'workspace_desk',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['workspace_desk', content.type, content.status]),
        createdBy,
      },
    });
    return toDesk(row as MemoryRow);
  },

  async getDesk(id: string): Promise<WorkspaceDesk | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'workspace_desk') return null;
    return toDesk(row as MemoryRow);
  },

  async listDesks(organizationId: string, opts: ListDesksOpts = {}): Promise<WorkspaceDesk[]> {
    const where: Record<string, unknown> = { organizationId, type: 'workspace_desk' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toDesk);
  },

  async updateDesk(id: string, input: UpdateDeskInput): Promise<WorkspaceDesk | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.floor !== undefined && { floor: input.floor }),
      ...(input.zone !== undefined && { zone: input.zone }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.equipment !== undefined && { equipment: input.equipment }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['workspace_desk', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toDesk(row as MemoryRow);
  },

  async deleteDesk(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateDesk(id: string, _activatedBy: string): Promise<WorkspaceDesk | null> {
    return WorkspaceManagementService.updateDesk(id, { status: 'active' });
  },

  async deactivateDesk(id: string, _deactivatedBy: string): Promise<WorkspaceDesk | null> {
    return WorkspaceManagementService.updateDesk(id, { status: 'inactive' });
  },

  async maintainDesk(id: string, _maintainedBy: string): Promise<WorkspaceDesk | null> {
    return WorkspaceManagementService.updateDesk(id, { status: 'maintained' });
  },

  // ── Rooms ──

  async createRoom(organizationId: string, workspaceId: string, input: CreateRoomInput, createdBy: string): Promise<MeetingRoom> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'active',
      location: input.location ?? '',
      floor: input.floor ?? '',
      capacity: input.capacity ?? 1,
      equipment: input.equipment ?? [],
      bookingRequired: input.bookingRequired ?? true,
      hourlyRate: input.hourlyRate ?? 0,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'meeting_room',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['meeting_room', content.type, content.status]),
        createdBy,
      },
    });
    return toRoom(row as MemoryRow);
  },

  async getRoom(id: string): Promise<MeetingRoom | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'meeting_room') return null;
    return toRoom(row as MemoryRow);
  },

  async listRooms(organizationId: string, opts: ListRoomsOpts = {}): Promise<MeetingRoom[]> {
    const where: Record<string, unknown> = { organizationId, type: 'meeting_room' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toRoom);
  },

  async updateRoom(id: string, input: UpdateRoomInput): Promise<MeetingRoom | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.floor !== undefined && { floor: input.floor }),
      ...(input.capacity !== undefined && { capacity: input.capacity }),
      ...(input.equipment !== undefined && { equipment: input.equipment }),
      ...(input.bookingRequired !== undefined && { bookingRequired: input.bookingRequired }),
      ...(input.hourlyRate !== undefined && { hourlyRate: input.hourlyRate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['meeting_room', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toRoom(row as MemoryRow);
  },

  async deleteRoom(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateRoom(id: string, _activatedBy: string): Promise<MeetingRoom | null> {
    return WorkspaceManagementService.updateRoom(id, { status: 'active' });
  },

  async maintainRoom(id: string, _maintainedBy: string): Promise<MeetingRoom | null> {
    return WorkspaceManagementService.updateRoom(id, { status: 'maintained' });
  },

  async deactivateRoom(id: string, _deactivatedBy: string): Promise<MeetingRoom | null> {
    return WorkspaceManagementService.updateRoom(id, { status: 'inactive' });
  },

  // ── Layouts ──

  async createLayout(organizationId: string, workspaceId: string, input: CreateLayoutInput, createdBy: string): Promise<OfficeLayout> {
    const content = {
      name: input.name.trim(),
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'draft',
      floor: input.floor ?? '',
      zones: input.zones ?? [],
      dimensions: input.dimensions ?? '',
      lastUpdated: input.lastUpdated ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'office_layout',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['office_layout', content.type, content.status]),
        createdBy,
      },
    });
    return toLayout(row as MemoryRow);
  },

  async getLayout(id: string): Promise<OfficeLayout | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'office_layout') return null;
    return toLayout(row as MemoryRow);
  },

  async listLayouts(organizationId: string, opts: ListLayoutsOpts = {}): Promise<OfficeLayout[]> {
    const where: Record<string, unknown> = { organizationId, type: 'office_layout' };
    const conditions: unknown[] = [];
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toLayout);
  },

  async updateLayout(id: string, input: UpdateLayoutInput): Promise<OfficeLayout | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.floor !== undefined && { floor: input.floor }),
      ...(input.zones !== undefined && { zones: input.zones }),
      ...(input.dimensions !== undefined && { dimensions: input.dimensions }),
      ...(input.lastUpdated !== undefined && { lastUpdated: input.lastUpdated }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['office_layout', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toLayout(row as MemoryRow);
  },

  async deleteLayout(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async activateLayout(id: string, _activatedBy: string): Promise<OfficeLayout | null> {
    return WorkspaceManagementService.updateLayout(id, { status: 'active', lastUpdated: new Date().toISOString() });
  },

  async archiveLayout(id: string, _archivedBy: string): Promise<OfficeLayout | null> {
    return WorkspaceManagementService.updateLayout(id, { status: 'archived' });
  },

  async revisionLayout(id: string, _revisedBy: string): Promise<OfficeLayout | null> {
    return WorkspaceManagementService.updateLayout(id, { status: 'revision', lastUpdated: new Date().toISOString() });
  },

  // ── Bookings ──

  async createBooking(organizationId: string, workspaceId: string, input: CreateBookingInput, createdBy: string): Promise<DeskBooking> {
    const content = {
      deskId: input.deskId ?? null,
      type: input.type,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      bookedBy: input.bookedBy ?? '',
      department: input.department ?? '',
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
      checkInDate: input.checkInDate ?? null,
      checkOutDate: input.checkOutDate ?? null,
      notes: input.notes ?? '',
    };
    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId, type: 'desk_booking',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.deskId ?? null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['desk_booking', content.type, content.status]),
        createdBy,
      },
    });
    return toBooking(row as MemoryRow);
  },

  async getBooking(id: string): Promise<DeskBooking | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'desk_booking') return null;
    return toBooking(row as MemoryRow);
  },

  async listBookings(organizationId: string, opts: ListBookingsOpts = {}): Promise<DeskBooking[]> {
    const where: Record<string, unknown> = { organizationId, type: 'desk_booking' };
    const conditions: unknown[] = [];
    if (opts.deskId) conditions.push({ content: { contains: `"deskId":"${opts.deskId}"` } });
    if (opts.type) conditions.push({ content: { contains: `"type":"${opts.type}"` } });
    if (opts.status) conditions.push({ content: { contains: `"status":"${opts.status}"` } });
    if (conditions.length) where.AND = conditions;
    const rows = await safePrisma(() => prisma.memory.findMany({ where, orderBy: { createdAt: 'desc' } }), []);
    return (rows as MemoryRow[]).map(toBooking);
  },

  async updateBooking(id: string, input: UpdateBookingInput): Promise<DeskBooking | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;
    const c = parseContent((existing as MemoryRow).content);
    const content = {
      ...c,
      ...(input.deskId !== undefined && { deskId: input.deskId }),
      ...(input.type !== undefined && { type: input.type }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.bookedBy !== undefined && { bookedBy: input.bookedBy }),
      ...(input.department !== undefined && { department: input.department }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
      ...(input.checkInDate !== undefined && { checkInDate: input.checkInDate }),
      ...(input.checkOutDate !== undefined && { checkOutDate: input.checkOutDate }),
      ...(input.notes !== undefined && { notes: input.notes }),
    };
    const row = await safePrisma(() => prisma.memory.update({
      where: { id },
      data: { content: JSON.stringify(content).slice(0, 50000), tags: JSON.stringify(['desk_booking', content.type, content.status]) },
    }), null);
    if (!row) return null;
    return toBooking(row as MemoryRow);
  },

  async deleteBooking(id: string): Promise<boolean> {
    try { await prisma.memory.delete({ where: { id } }); return true; } catch { return false; }
  },

  async approveBooking(id: string, _approvedBy: string): Promise<DeskBooking | null> {
    return WorkspaceManagementService.updateBooking(id, { status: 'approved' });
  },

  async cancelBooking(id: string, _cancelledBy: string): Promise<DeskBooking | null> {
    return WorkspaceManagementService.updateBooking(id, { status: 'cancelled' });
  },

  async checkInBooking(id: string, _checkedInBy: string): Promise<DeskBooking | null> {
    return WorkspaceManagementService.updateBooking(id, { status: 'checked_in', checkInDate: new Date().toISOString() });
  },

  async checkOutBooking(id: string, _checkedOutBy: string): Promise<DeskBooking | null> {
    return WorkspaceManagementService.updateBooking(id, { status: 'checked_out', checkOutDate: new Date().toISOString() });
  },

  async noShowBooking(id: string, _markedBy: string): Promise<DeskBooking | null> {
    return WorkspaceManagementService.updateBooking(id, { status: 'no_show' });
  },

  // ── Metrics & Stats ──

  async getWorkspaceManagementMetrics(organizationId: string): Promise<WorkspaceManagementMetrics> {
    const [desks, rooms, bookings] = await Promise.all([
      WorkspaceManagementService.listDesks(organizationId),
      WorkspaceManagementService.listRooms(organizationId),
      WorkspaceManagementService.listBookings(organizationId),
    ]);
    return {
      activeDesks: desks.filter((d) => d.status === 'active').length,
      availableRooms: rooms.filter((r) => r.status === 'active').length,
      activeBookings: bookings.filter((b) => b.status === 'approved' || b.status === 'checked_in').length,
      pendingBookings: bookings.filter((b) => b.status === 'pending').length,
      maintainedDesks: desks.filter((d) => d.status === 'maintained').length,
    };
  },

  async getWorkspaceManagementStats(organizationId: string): Promise<WorkspaceManagementStats> {
    const [desks, rooms, layouts, bookings] = await Promise.all([
      WorkspaceManagementService.listDesks(organizationId),
      WorkspaceManagementService.listRooms(organizationId),
      WorkspaceManagementService.listLayouts(organizationId),
      WorkspaceManagementService.listBookings(organizationId),
    ]);
    const byDeskType: Record<string, number> = {};
    const byDeskStatus: Record<string, number> = {};
    const byRoomType: Record<string, number> = {};
    const byRoomStatus: Record<string, number> = {};
    const byLayoutType: Record<string, number> = {};
    const byLayoutStatus: Record<string, number> = {};
    const byBookingType: Record<string, number> = {};
    const byBookingStatus: Record<string, number> = {};
    for (const d of desks) { byDeskType[d.type] = (byDeskType[d.type] ?? 0) + 1; byDeskStatus[d.status] = (byDeskStatus[d.status] ?? 0) + 1; }
    for (const r of rooms) { byRoomType[r.type] = (byRoomType[r.type] ?? 0) + 1; byRoomStatus[r.status] = (byRoomStatus[r.status] ?? 0) + 1; }
    for (const l of layouts) { byLayoutType[l.type] = (byLayoutType[l.type] ?? 0) + 1; byLayoutStatus[l.status] = (byLayoutStatus[l.status] ?? 0) + 1; }
    for (const b of bookings) { byBookingType[b.type] = (byBookingType[b.type] ?? 0) + 1; byBookingStatus[b.status] = (byBookingStatus[b.status] ?? 0) + 1; }
    return {
      deskCount: desks.length,
      roomCount: rooms.length,
      layoutCount: layouts.length,
      bookingCount: bookings.length,
      byDeskType, byDeskStatus, byRoomType, byRoomStatus, byLayoutType, byLayoutStatus, byBookingType, byBookingStatus,
    };
  },
};
