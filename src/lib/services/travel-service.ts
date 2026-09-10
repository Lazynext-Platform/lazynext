import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type TravelStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type TransportMode = 'flight' | 'train' | 'car' | 'bus' | 'other';
export type ItineraryType = 'flight' | 'hotel' | 'car_rental' | 'meeting' | 'other';
export type BookingType = 'flight' | 'hotel' | 'car_rental' | 'other';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

/** Raw Memory row as stored in the database. */
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

/** Parsed content payload for a travel request Memory. */
interface TravelRequestContent {
  employeeId: string;
  employeeName: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  estimatedCost: number;
  transportMode: TransportMode;
  notes: string;
  status: TravelStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelReason?: string;
}

/** Parsed content payload for a travel itinerary item Memory. */
interface ItineraryContent {
  type: ItineraryType;
  title: string;
  date: string;
  location: string;
  details: string;
  cost: number;
}

/** Parsed content payload for a travel booking Memory. */
interface BookingContent {
  type: BookingType;
  vendor: string;
  confirmationNumber: string;
  cost: number;
  bookingDate: string;
  status: BookingStatus;
}

/** A structured travel request returned to callers. */
export interface TravelRequest {
  id: string;
  organizationId: string;
  workspaceId: string;
  employeeId: string;
  employeeName: string;
  destination: string;
  purpose: string;
  departureDate: string;
  returnDate: string;
  estimatedCost: number;
  transportMode: TransportMode;
  notes: string;
  status: TravelStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured itinerary item returned to callers. */
export interface ItineraryItem {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  type: ItineraryType;
  title: string;
  date: string;
  location: string;
  details: string;
  cost: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A structured booking returned to callers. */
export interface TravelBooking {
  id: string;
  organizationId: string;
  workspaceId: string;
  requestId: string;
  type: BookingType;
  vendor: string;
  confirmationNumber: string;
  cost: number;
  bookingDate: string;
  status: BookingStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTravelRequestInput {
  employeeId: string;
  employeeName: string;
  destination: string;
  purpose: string;
  departureDate: Date;
  returnDate: Date;
  estimatedCost?: number;
  transportMode?: TransportMode;
  notes?: string;
}

export interface UpdateTravelRequestInput {
  destination?: string;
  purpose?: string;
  departureDate?: Date;
  returnDate?: Date;
  estimatedCost?: number;
  transportMode?: TransportMode;
  notes?: string;
}

export interface ListTravelRequestsOpts {
  status?: TravelStatus;
  employeeId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AddItineraryInput {
  type: ItineraryType;
  title: string;
  date: Date;
  location?: string;
  details?: string;
  cost?: number;
}

export interface AddBookingInput {
  type: BookingType;
  vendor: string;
  confirmationNumber?: string;
  cost: number;
  bookingDate?: Date;
  status?: BookingStatus;
}

export interface PolicyComplianceResult {
  compliant: boolean;
  violations: string[];
}

export interface TravelCostSummary {
  totalCost: number;
  byCategory: Record<string, number>;
  byTransportMode: Record<string, number>;
  requestCount: number;
}

export interface TravelStats {
  requestCount: number;
  approvalRate: number;
  totalCost: number;
  pendingCount: number;
}

// ── Helpers ──

const fallbackRequestContent: TravelRequestContent = {
  employeeId: '',
  employeeName: '',
  destination: '',
  purpose: '',
  departureDate: '',
  returnDate: '',
  estimatedCost: 0,
  transportMode: 'other',
  notes: '',
  status: 'pending',
};

const fallbackItineraryContent: ItineraryContent = {
  type: 'other',
  title: '',
  date: '',
  location: '',
  details: '',
  cost: 0,
};

const fallbackBookingContent: BookingContent = {
  type: 'other',
  vendor: '',
  confirmationNumber: '',
  cost: 0,
  bookingDate: '',
  status: 'pending',
};

function parseRequestContent(raw: string): TravelRequestContent {
  if (!raw) return fallbackRequestContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      employeeId: parsed.employeeId ?? '',
      employeeName: parsed.employeeName ?? '',
      destination: parsed.destination ?? '',
      purpose: parsed.purpose ?? '',
      departureDate: parsed.departureDate ?? '',
      returnDate: parsed.returnDate ?? '',
      estimatedCost: Number(parsed.estimatedCost) || 0,
      transportMode: (parsed.transportMode as TransportMode) ?? 'other',
      notes: parsed.notes ?? '',
      status: (parsed.status as TravelStatus) ?? 'pending',
      approvedBy: parsed.approvedBy,
      approvedAt: parsed.approvedAt,
      rejectedBy: parsed.rejectedBy,
      rejectedAt: parsed.rejectedAt,
      rejectionReason: parsed.rejectionReason,
      cancelReason: parsed.cancelReason,
    };
  } catch {
    return fallbackRequestContent;
  }
}

function parseItineraryContent(raw: string): ItineraryContent {
  if (!raw) return fallbackItineraryContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      type: (parsed.type as ItineraryType) ?? 'other',
      title: parsed.title ?? '',
      date: parsed.date ?? '',
      location: parsed.location ?? '',
      details: parsed.details ?? '',
      cost: Number(parsed.cost) || 0,
    };
  } catch {
    return fallbackItineraryContent;
  }
}

function parseBookingContent(raw: string): BookingContent {
  if (!raw) return fallbackBookingContent;
  try {
    const parsed = JSON.parse(raw);
    return {
      type: (parsed.type as BookingType) ?? 'other',
      vendor: parsed.vendor ?? '',
      confirmationNumber: parsed.confirmationNumber ?? '',
      cost: Number(parsed.cost) || 0,
      bookingDate: parsed.bookingDate ?? '',
      status: (parsed.status as BookingStatus) ?? 'pending',
    };
  } catch {
    return fallbackBookingContent;
  }
}

function toRequest(row: MemoryRow): TravelRequest {
  const content = parseRequestContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    employeeId: content.employeeId,
    employeeName: content.employeeName,
    destination: content.destination,
    purpose: content.purpose,
    departureDate: content.departureDate,
    returnDate: content.returnDate,
    estimatedCost: content.estimatedCost,
    transportMode: content.transportMode,
    notes: content.notes,
    status: content.status,
    approvedBy: content.approvedBy,
    approvedAt: content.approvedAt,
    rejectedBy: content.rejectedBy,
    rejectedAt: content.rejectedAt,
    rejectionReason: content.rejectionReason,
    cancelReason: content.cancelReason,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toItinerary(row: MemoryRow): ItineraryItem {
  const content = parseItineraryContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    requestId: row.sourceId ?? '',
    type: content.type,
    title: content.title,
    date: content.date,
    location: content.location,
    details: content.details,
    cost: content.cost,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toBooking(row: MemoryRow): TravelBooking {
  const content = parseBookingContent(row.content);
  return {
    id: row.id,
    organizationId: row.organizationId,
    workspaceId: row.workspaceId,
    requestId: row.sourceId ?? '',
    type: content.type,
    vendor: content.vendor,
    confirmationNumber: content.confirmationNumber,
    cost: content.cost,
    bookingDate: content.bookingDate,
    status: content.status,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const APPROVED_TRANSPORT_MODES: TransportMode[] = ['flight', 'train', 'car', 'bus'];
const MAX_COST = 5000;
const ADVANCE_BOOKING_DAYS = 7;

// ── Travel Service ──

export const TravelService = {
  /**
   * Create a new travel request. Stored as a Memory with type='travel_request'.
   */
  async createTravelRequest(
    organizationId: string,
    workspaceId: string,
    input: CreateTravelRequestInput,
    createdBy: string,
  ): Promise<TravelRequest> {
    const content: TravelRequestContent = {
      employeeId: input.employeeId,
      employeeName: input.employeeName,
      destination: input.destination,
      purpose: input.purpose,
      departureDate: input.departureDate.toISOString(),
      returnDate: input.returnDate.toISOString(),
      estimatedCost: input.estimatedCost ?? 0,
      transportMode: input.transportMode ?? 'other',
      notes: input.notes ?? '',
      status: 'pending',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'travel_request',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: null,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['travel_request', 'pending', content.transportMode]),
        createdBy,
      },
    });

    return toRequest(row as MemoryRow);
  },

  /**
   * Get a single travel request by ID.
   */
  async getTravelRequest(id: string): Promise<TravelRequest | null> {
    const row = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!row) return null;
    return toRequest(row as MemoryRow);
  },

  /**
   * List travel requests for an organization with optional filters.
   */
  async listTravelRequests(
    organizationId: string,
    opts: ListTravelRequestsOpts = {},
  ): Promise<TravelRequest[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'travel_request',
            organizationId,
          },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        }),
      [],
    );

    let requests = rows.map((r) => toRequest(r as MemoryRow));

    if (opts.status) {
      requests = requests.filter((r) => r.status === opts.status);
    }
    if (opts.employeeId) {
      requests = requests.filter((r) => r.employeeId === opts.employeeId);
    }
    if (opts.fromDate) {
      const fromMs = opts.fromDate.getTime();
      requests = requests.filter((r) => new Date(r.departureDate).getTime() >= fromMs);
    }
    if (opts.toDate) {
      const toMs = opts.toDate.getTime();
      requests = requests.filter((r) => new Date(r.returnDate).getTime() <= toMs);
    }

    return requests;
  },

  /**
   * Update a travel request's editable fields.
   */
  async updateTravelRequest(
    id: string,
    input: UpdateTravelRequestInput,
  ): Promise<TravelRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRequestContent(existing.content);
    if (input.destination !== undefined) content.destination = input.destination;
    if (input.purpose !== undefined) content.purpose = input.purpose;
    if (input.departureDate !== undefined) content.departureDate = input.departureDate.toISOString();
    if (input.returnDate !== undefined) content.returnDate = input.returnDate.toISOString();
    if (input.estimatedCost !== undefined) content.estimatedCost = input.estimatedCost;
    if (input.transportMode !== undefined) content.transportMode = input.transportMode;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['travel_request', content.status, content.transportMode]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRequest(row as MemoryRow);
  },

  /**
   * Approve a travel request.
   */
  async approveTravelRequest(
    id: string,
    approvedBy: string,
  ): Promise<TravelRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRequestContent(existing.content);
    content.status = 'approved';
    content.approvedBy = approvedBy;
    content.approvedAt = new Date().toISOString();

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['travel_request', 'approved', content.transportMode]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRequest(row as MemoryRow);
  },

  /**
   * Reject a travel request with a reason.
   */
  async rejectTravelRequest(
    id: string,
    reason: string,
    rejectedBy: string,
  ): Promise<TravelRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRequestContent(existing.content);
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
            tags: JSON.stringify(['travel_request', 'rejected', content.transportMode]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRequest(row as MemoryRow);
  },

  /**
   * Cancel a travel request with a reason.
   */
  async cancelTravelRequest(
    id: string,
    reason: string,
  ): Promise<TravelRequest | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseRequestContent(existing.content);
    content.status = 'cancelled';
    content.cancelReason = reason;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['travel_request', 'cancelled', content.transportMode]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toRequest(row as MemoryRow);
  },

  /**
   * Add an itinerary item to a travel request.
   * Stored as a Memory with type='travel_itinerary', sourceId=requestId.
   */
  async addItineraryItem(
    requestId: string,
    organizationId: string,
    workspaceId: string,
    input: AddItineraryInput,
    createdBy: string,
  ): Promise<ItineraryItem> {
    const content: ItineraryContent = {
      type: input.type,
      title: input.title,
      date: input.date.toISOString(),
      location: input.location ?? '',
      details: input.details ?? '',
      cost: input.cost ?? 0,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'travel_itinerary',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: requestId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['travel_itinerary', input.type]),
        createdBy,
      },
    });

    return toItinerary(row as MemoryRow);
  },

  /**
   * List itinerary items for a travel request.
   */
  async getItinerary(requestId: string): Promise<ItineraryItem[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'travel_itinerary',
            sourceId: requestId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    return rows.map((r) => toItinerary(r as MemoryRow));
  },

  /**
   * Remove an itinerary item.
   */
  async removeItineraryItem(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Add a booking to a travel request.
   * Stored as a Memory with type='travel_booking', sourceId=requestId.
   */
  async addBooking(
    requestId: string,
    organizationId: string,
    workspaceId: string,
    input: AddBookingInput,
    createdBy: string,
  ): Promise<TravelBooking> {
    const content: BookingContent = {
      type: input.type,
      vendor: input.vendor,
      confirmationNumber: input.confirmationNumber ?? '',
      cost: input.cost,
      bookingDate: (input.bookingDate ?? new Date()).toISOString(),
      status: input.status ?? 'pending',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId,
        organizationId,
        type: 'travel_booking',
        content: JSON.stringify(content).slice(0, 10000),
        source: 'user',
        sourceId: requestId,
        confidence: 1.0,
        lifecycle: 'permanent',
        tags: JSON.stringify(['travel_booking', content.status, content.type]),
        createdBy,
      },
    });

    return toBooking(row as MemoryRow);
  },

  /**
   * List bookings for a travel request.
   */
  async getBookings(requestId: string): Promise<TravelBooking[]> {
    const rows = await safePrisma(
      () =>
        prisma.memory.findMany({
          where: {
            type: 'travel_booking',
            sourceId: requestId,
          },
          orderBy: { createdAt: 'asc' },
          take: 500,
        }),
      [],
    );

    return rows.map((r) => toBooking(r as MemoryRow));
  },

  /**
   * Update a booking's status.
   */
  async updateBookingStatus(
    id: string,
    status: BookingStatus,
  ): Promise<TravelBooking | null> {
    const existing = await safePrisma(
      () => prisma.memory.findUnique({ where: { id } }),
      null,
    );
    if (!existing) return null;

    const content = parseBookingContent(existing.content);
    content.status = status;

    const row = await safePrisma(
      () =>
        prisma.memory.update({
          where: { id },
          data: {
            content: JSON.stringify(content).slice(0, 10000),
            tags: JSON.stringify(['travel_booking', status, content.type]),
          },
        }),
      null,
    );
    if (!row) return null;
    return toBooking(row as MemoryRow);
  },

  /**
   * Convert a travel request into an Expense record.
   * Uses category='travel', vendor from request destination,
   * amount from estimatedCost + bookings total.
   */
  async convertToExpense(
    requestId: string,
    organizationId: string,
    workspaceId: string,
    createdBy: string,
  ) {
    const request = await TravelService.getTravelRequest(requestId);
    if (!request) return null;

    const bookings = await TravelService.getBookings(requestId);
    const bookingsTotal = bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + b.cost, 0);
    const totalAmount = Math.round((request.estimatedCost + bookingsTotal) * 100) / 100;

    const expense = await prisma.expense.create({
      data: {
        organizationId,
        workspaceId,
        vendor: request.destination,
        description: `Travel to ${request.destination} — ${request.purpose}`,
        category: 'travel',
        amount: totalAmount,
        currency: 'USD',
        status: 'pending',
        expenseDate: new Date(),
        submittedBy: createdBy,
        tags: JSON.stringify(['travel', requestId]),
      },
    });

    return expense;
  },

  /**
   * Check a travel request against basic policy rules:
   * max cost ($5000), advance booking (departure >= 7 days from now),
   * approved transport modes.
   */
  async checkPolicyCompliance(
    requestId: string,
  ): Promise<PolicyComplianceResult> {
    const request = await TravelService.getTravelRequest(requestId);
    if (!request) {
      return { compliant: false, violations: ['request_not_found'] };
    }

    const violations: string[] = [];

    if (request.estimatedCost > MAX_COST) {
      violations.push(`estimated_cost_exceeds_${MAX_COST}`);
    }

    const departureDate = new Date(request.departureDate);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysUntilDeparture = Math.floor(
      (departureDate.getTime() - now.getTime()) / msPerDay,
    );
    if (daysUntilDeparture < ADVANCE_BOOKING_DAYS) {
      violations.push(`advance_booking_less_than_${ADVANCE_BOOKING_DAYS}_days`);
    }

    if (!APPROVED_TRANSPORT_MODES.includes(request.transportMode)) {
      violations.push('transport_mode_not_approved');
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  },

  /**
   * Get a cost summary for an organization: total costs by category.
   */
  async getTravelCostSummary(
    organizationId: string,
    opts: { fromDate?: Date; toDate?: Date } = {},
  ): Promise<TravelCostSummary> {
    const requests = await TravelService.listTravelRequests(organizationId, {
      fromDate: opts.fromDate,
      toDate: opts.toDate,
    });

    const byCategory: Record<string, number> = {};
    const byTransportMode: Record<string, number> = {};
    let totalCost = 0;

    for (const r of requests) {
      if (r.status === 'cancelled') continue;
      const cost = r.estimatedCost;
      byCategory['travel_request'] = (byCategory['travel_request'] || 0) + cost;
      byTransportMode[r.transportMode] = (byTransportMode[r.transportMode] || 0) + cost;
      totalCost += cost;
    }

    // Include booking costs
    for (const r of requests) {
      if (r.status === 'cancelled') continue;
      const bookings = await TravelService.getBookings(r.id);
      for (const b of bookings) {
        if (b.status === 'cancelled') continue;
        byCategory[`booking_${b.type}`] = (byCategory[`booking_${b.type}`] || 0) + b.cost;
        totalCost += b.cost;
      }
    }

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      byCategory,
      byTransportMode,
      requestCount: requests.length,
    };
  },

  /**
   * Get aggregate stats for travel requests in an organization.
   */
  async getStats(organizationId: string): Promise<TravelStats> {
    const requests = await TravelService.listTravelRequests(organizationId);

    const requestCount = requests.length;
    const pendingCount = requests.filter((r) => r.status === 'pending').length;
    const approvedCount = requests.filter((r) => r.status === 'approved').length;
    const decidedCount = requests.filter(
      (r) => r.status === 'approved' || r.status === 'rejected',
    ).length;
    const approvalRate = decidedCount > 0 ? approvedCount / decidedCount : 0;

    const totalCost = requests
      .filter((r) => r.status !== 'cancelled')
      .reduce((sum, r) => sum + r.estimatedCost, 0);

    return {
      requestCount,
      approvalRate: Math.round(approvalRate * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      pendingCount,
    };
  },
};
