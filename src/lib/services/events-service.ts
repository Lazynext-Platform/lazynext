import { prisma } from '@/lib/prisma';
import { safePrisma } from '@/lib/safe-prisma';

// ── Types ──

export type EventType = 'conference' | 'seminar' | 'workshop' | 'trade_show' | 'webinar' | 'product_launch' | 'team_building' | 'corporate_meeting' | 'awards_ceremony' | 'other';
export type EventStatus = 'planning' | 'scheduled' | 'registration_open' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type RegistrationStatus = 'registered' | 'confirmed' | 'attended' | 'cancelled' | 'waitlisted';
export type SpeakerStatus = 'invited' | 'confirmed' | 'declined' | 'cancelled';
export type VenueStatus = 'available' | 'booked' | 'unavailable';

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

interface CorpEventContent {
  title: string;
  type: EventType;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  capacity: number;
  budget: number;
  status: EventStatus;
  organizer: string;
  targetAudience: string;
  notes: string;
}

interface EventRegistrationContent {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  company: string;
  jobTitle: string;
  dietaryRequirements: string;
  status: RegistrationStatus;
  registeredDate: string;
}

interface EventSpeakerContent {
  eventId: string;
  name: string;
  title: string;
  bio: string;
  company: string;
  email: string;
  phone: string;
  photoUrl: string;
  topic: string;
  status: SpeakerStatus;
  presentationTitle: string;
  presentationDuration: number;
}

interface EventVenueContent {
  name: string;
  address: string;
  capacity: number;
  description: string;
  facilities: string;
  rentalCost: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: VenueStatus;
}

// ── Public interfaces ──

export interface CorpEvent {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: EventType;
  description: string;
  startDate: Date;
  endDate: Date | null;
  location: string;
  capacity: number;
  budget: number;
  status: EventStatus;
  organizer: string;
  targetAudience: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventRegistration {
  id: string;
  organizationId: string;
  workspaceId: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone: string;
  company: string;
  jobTitle: string;
  dietaryRequirements: string;
  status: RegistrationStatus;
  registeredDate: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventSpeaker {
  id: string;
  organizationId: string;
  workspaceId: string;
  eventId: string;
  name: string;
  title: string;
  bio: string;
  company: string;
  email: string;
  phone: string;
  photoUrl: string;
  topic: string;
  status: SpeakerStatus;
  presentationTitle: string;
  presentationDuration: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventVenue {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  address: string;
  capacity: number;
  description: string;
  facilities: string;
  rentalCost: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  status: VenueStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventMetrics {
  upcomingEvents: number;
  totalRegistrations: number;
  confirmedSpeakers: number;
  totalBudget: number;
  venueUtilization: number;
}

export interface EventStats {
  eventCount: number;
  activeEventCount: number;
  registrationCount: number;
  confirmedRegistrationCount: number;
  speakerCount: number;
  confirmedSpeakerCount: number;
  venueCount: number;
  bookedVenueCount: number;
  byEventType: Record<string, number>;
  byEventStatus: Record<string, number>;
  byRegistrationStatus: Record<string, number>;
  bySpeakerStatus: Record<string, number>;
}

// ── Input / Options ──

export interface CreateEventInput {
  title: string;
  type: EventType;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  capacity?: number;
  budget?: number;
  status?: EventStatus;
  organizer?: string;
  targetAudience?: string;
  notes?: string;
}

export interface UpdateEventInput {
  title?: string;
  type?: EventType;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  capacity?: number;
  budget?: number;
  status?: EventStatus;
  organizer?: string;
  targetAudience?: string;
  notes?: string;
}

export interface ListEventsOpts {
  type?: EventType;
  status?: EventStatus;
  organizer?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateRegistrationInput {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeePhone?: string;
  company?: string;
  jobTitle?: string;
  dietaryRequirements?: string;
  status?: RegistrationStatus;
  registeredDate?: string;
}

export interface UpdateRegistrationInput {
  attendeeName?: string;
  attendeeEmail?: string;
  attendeePhone?: string;
  company?: string;
  jobTitle?: string;
  dietaryRequirements?: string;
  status?: RegistrationStatus;
}

export interface ListRegistrationsOpts {
  eventId?: string;
  status?: RegistrationStatus;
  attendeeName?: string;
}

export interface CreateSpeakerInput {
  eventId: string;
  name: string;
  title: string;
  bio?: string;
  company?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  topic?: string;
  status?: SpeakerStatus;
  presentationTitle?: string;
  presentationDuration?: number;
}

export interface UpdateSpeakerInput {
  name?: string;
  title?: string;
  bio?: string;
  company?: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  topic?: string;
  status?: SpeakerStatus;
  presentationTitle?: string;
  presentationDuration?: number;
}

export interface ListSpeakersOpts {
  eventId?: string;
  status?: SpeakerStatus;
}

export interface CreateVenueInput {
  name: string;
  address: string;
  capacity: number;
  description?: string;
  facilities?: string;
  rentalCost?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: VenueStatus;
}

export interface UpdateVenueInput {
  name?: string;
  address?: string;
  capacity?: number;
  description?: string;
  facilities?: string;
  rentalCost?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  status?: VenueStatus;
}

export interface ListVenuesOpts {
  status?: VenueStatus;
  capacityMin?: number;
}

// ── Helpers ──

const fallbackEvent: CorpEventContent = {
  title: '', type: 'conference', description: '', startDate: '', endDate: '',
  location: '', capacity: 0, budget: 0, status: 'planning', organizer: '',
  targetAudience: '', notes: '',
};

const fallbackRegistration: EventRegistrationContent = {
  eventId: '', attendeeName: '', attendeeEmail: '', attendeePhone: '',
  company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '',
};

const fallbackSpeaker: EventSpeakerContent = {
  eventId: '', name: '', title: '', bio: '', company: '', email: '', phone: '',
  photoUrl: '', topic: '', status: 'invited', presentationTitle: '', presentationDuration: 0,
};

const fallbackVenue: EventVenueContent = {
  name: '', address: '', capacity: 0, description: '', facilities: '',
  rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'available',
};

function parseEvent(raw: string): CorpEventContent {
  if (!raw) return fallbackEvent;
  try {
    const p = JSON.parse(raw);
    return {
      title: p.title ?? '',
      type: (p.type as EventType) ?? 'conference',
      description: p.description ?? '',
      startDate: p.startDate ?? '',
      endDate: p.endDate ?? '',
      location: p.location ?? '',
      capacity: p.capacity ?? 0,
      budget: p.budget ?? 0,
      status: (p.status as EventStatus) ?? 'planning',
      organizer: p.organizer ?? '',
      targetAudience: p.targetAudience ?? '',
      notes: p.notes ?? '',
    };
  } catch { return fallbackEvent; }
}

function parseRegistration(raw: string): EventRegistrationContent {
  if (!raw) return fallbackRegistration;
  try {
    const p = JSON.parse(raw);
    return {
      eventId: p.eventId ?? '',
      attendeeName: p.attendeeName ?? '',
      attendeeEmail: p.attendeeEmail ?? '',
      attendeePhone: p.attendeePhone ?? '',
      company: p.company ?? '',
      jobTitle: p.jobTitle ?? '',
      dietaryRequirements: p.dietaryRequirements ?? '',
      status: (p.status as RegistrationStatus) ?? 'registered',
      registeredDate: p.registeredDate ?? '',
    };
  } catch { return fallbackRegistration; }
}

function parseSpeaker(raw: string): EventSpeakerContent {
  if (!raw) return fallbackSpeaker;
  try {
    const p = JSON.parse(raw);
    return {
      eventId: p.eventId ?? '',
      name: p.name ?? '',
      title: p.title ?? '',
      bio: p.bio ?? '',
      company: p.company ?? '',
      email: p.email ?? '',
      phone: p.phone ?? '',
      photoUrl: p.photoUrl ?? '',
      topic: p.topic ?? '',
      status: (p.status as SpeakerStatus) ?? 'invited',
      presentationTitle: p.presentationTitle ?? '',
      presentationDuration: p.presentationDuration ?? 0,
    };
  } catch { return fallbackSpeaker; }
}

function parseVenue(raw: string): EventVenueContent {
  if (!raw) return fallbackVenue;
  try {
    const p = JSON.parse(raw);
    return {
      name: p.name ?? '',
      address: p.address ?? '',
      capacity: p.capacity ?? 0,
      description: p.description ?? '',
      facilities: p.facilities ?? '',
      rentalCost: p.rentalCost ?? 0,
      contactName: p.contactName ?? '',
      contactPhone: p.contactPhone ?? '',
      contactEmail: p.contactEmail ?? '',
      status: (p.status as VenueStatus) ?? 'available',
    };
  } catch { return fallbackVenue; }
}

function toEvent(row: MemoryRow): CorpEvent {
  const c = parseEvent(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    title: c.title, type: c.type, description: c.description,
    startDate: c.startDate ? new Date(c.startDate) : row.createdAt,
    endDate: c.endDate ? new Date(c.endDate) : null,
    location: c.location, capacity: c.capacity, budget: c.budget, status: c.status,
    organizer: c.organizer, targetAudience: c.targetAudience, notes: c.notes,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toRegistration(row: MemoryRow): EventRegistration {
  const c = parseRegistration(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    eventId: c.eventId, attendeeName: c.attendeeName, attendeeEmail: c.attendeeEmail,
    attendeePhone: c.attendeePhone, company: c.company, jobTitle: c.jobTitle,
    dietaryRequirements: c.dietaryRequirements, status: c.status,
    registeredDate: c.registeredDate ? new Date(c.registeredDate) : row.createdAt,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toSpeaker(row: MemoryRow): EventSpeaker {
  const c = parseSpeaker(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    eventId: c.eventId, name: c.name, title: c.title, bio: c.bio, company: c.company,
    email: c.email, phone: c.phone, photoUrl: c.photoUrl, topic: c.topic, status: c.status,
    presentationTitle: c.presentationTitle, presentationDuration: c.presentationDuration,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

function toVenue(row: MemoryRow): EventVenue {
  const c = parseVenue(row.content);
  return {
    id: row.id, organizationId: row.organizationId, workspaceId: row.workspaceId,
    name: c.name, address: c.address, capacity: c.capacity, description: c.description,
    facilities: c.facilities, rentalCost: c.rentalCost, contactName: c.contactName,
    contactPhone: c.contactPhone, contactEmail: c.contactEmail, status: c.status,
    createdBy: row.createdBy, createdAt: row.createdAt, updatedAt: row.updatedAt,
  };
}

// ── Events Service ──

export const EventsService = {
  // ── Events ──

  async createEvent(
    organizationId: string,
    workspaceId: string,
    input: CreateEventInput,
    createdBy: string,
  ): Promise<CorpEvent> {
    const content: CorpEventContent = {
      title: input.title.trim(),
      type: input.type,
      description: input.description ?? '',
      startDate: input.startDate,
      endDate: input.endDate ?? '',
      location: input.location ?? '',
      capacity: input.capacity ?? 0,
      budget: input.budget ?? 0,
      status: input.status ?? 'planning',
      organizer: input.organizer ?? '',
      targetAudience: input.targetAudience ?? '',
      notes: input.notes ?? '',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'corp_event',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['corp_event', content.type, content.status]),
        createdBy,
      },
    });

    return toEvent(row as MemoryRow);
  },

  async getEvent(id: string): Promise<CorpEvent | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'corp_event') return null;
    return toEvent(row as MemoryRow);
  },

  async listEvents(organizationId: string, opts: ListEventsOpts = {}): Promise<CorpEvent[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'corp_event', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toEvent(r as MemoryRow));
    if (opts.type) records = records.filter((e) => e.type === opts.type);
    if (opts.status) records = records.filter((e) => e.status === opts.status);
    if (opts.organizer) records = records.filter((e) => e.organizer === opts.organizer);
    if (opts.dateFrom) records = records.filter((e) => e.startDate >= new Date(opts.dateFrom!));
    if (opts.dateTo) records = records.filter((e) => e.startDate <= new Date(opts.dateTo!));
    return records;
  },

  async updateEvent(id: string, input: UpdateEventInput): Promise<CorpEvent | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEvent(existing.content);
    if (input.title !== undefined) content.title = input.title.trim();
    if (input.type !== undefined) content.type = input.type;
    if (input.description !== undefined) content.description = input.description;
    if (input.startDate !== undefined) content.startDate = input.startDate;
    if (input.endDate !== undefined) content.endDate = input.endDate;
    if (input.location !== undefined) content.location = input.location;
    if (input.capacity !== undefined) content.capacity = input.capacity;
    if (input.budget !== undefined) content.budget = input.budget;
    if (input.status !== undefined) content.status = input.status;
    if (input.organizer !== undefined) content.organizer = input.organizer;
    if (input.targetAudience !== undefined) content.targetAudience = input.targetAudience;
    if (input.notes !== undefined) content.notes = input.notes;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['corp_event', content.type, content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toEvent(row as MemoryRow);
  },

  async deleteEvent(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async openRegistration(id: string, openedBy: string): Promise<CorpEvent | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEvent(existing.content);
    content.status = 'registration_open';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['corp_event', content.type, 'registration_open']),
          verifiedBy: openedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toEvent(row as MemoryRow);
  },

  async completeEvent(id: string, completedBy: string): Promise<CorpEvent | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseEvent(existing.content);
    content.status = 'completed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['corp_event', content.type, 'completed']),
          verifiedBy: completedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toEvent(row as MemoryRow);
  },

  // ── Registrations ──

  async createRegistration(
    organizationId: string,
    workspaceId: string,
    input: CreateRegistrationInput,
    createdBy: string,
  ): Promise<EventRegistration> {
    const content: EventRegistrationContent = {
      eventId: input.eventId,
      attendeeName: input.attendeeName.trim(),
      attendeeEmail: input.attendeeEmail,
      attendeePhone: input.attendeePhone ?? '',
      company: input.company ?? '',
      jobTitle: input.jobTitle ?? '',
      dietaryRequirements: input.dietaryRequirements ?? '',
      status: input.status ?? 'registered',
      registeredDate: input.registeredDate ?? new Date().toISOString(),
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'event_registration',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.eventId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['event_registration', content.status]),
        createdBy,
      },
    });

    return toRegistration(row as MemoryRow);
  },

  async getRegistration(id: string): Promise<EventRegistration | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'event_registration') return null;
    return toRegistration(row as MemoryRow);
  },

  async listRegistrations(organizationId: string, opts: ListRegistrationsOpts = {}): Promise<EventRegistration[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'event_registration', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toRegistration(r as MemoryRow));
    if (opts.eventId) records = records.filter((r) => r.eventId === opts.eventId);
    if (opts.status) records = records.filter((r) => r.status === opts.status);
    if (opts.attendeeName) records = records.filter((r) => r.attendeeName.toLowerCase().includes(opts.attendeeName!.toLowerCase()));
    return records;
  },

  async updateRegistration(id: string, input: UpdateRegistrationInput): Promise<EventRegistration | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRegistration(existing.content);
    if (input.attendeeName !== undefined) content.attendeeName = input.attendeeName;
    if (input.attendeeEmail !== undefined) content.attendeeEmail = input.attendeeEmail;
    if (input.attendeePhone !== undefined) content.attendeePhone = input.attendeePhone;
    if (input.company !== undefined) content.company = input.company;
    if (input.jobTitle !== undefined) content.jobTitle = input.jobTitle;
    if (input.dietaryRequirements !== undefined) content.dietaryRequirements = input.dietaryRequirements;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_registration', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toRegistration(row as MemoryRow);
  },

  async cancelRegistration(id: string, reason: string, cancelledBy: string): Promise<EventRegistration | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRegistration(existing.content);
    content.status = 'cancelled';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_registration', 'cancelled']),
          verifiedBy: cancelledBy,
        },
      }), null,
    );
    if (!row) return null;
    return toRegistration(row as MemoryRow);
  },

  async confirmRegistration(id: string, confirmedBy: string): Promise<EventRegistration | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseRegistration(existing.content);
    content.status = 'confirmed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_registration', 'confirmed']),
          verifiedBy: confirmedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toRegistration(row as MemoryRow);
  },

  // ── Speakers ──

  async createSpeaker(
    organizationId: string,
    workspaceId: string,
    input: CreateSpeakerInput,
    createdBy: string,
  ): Promise<EventSpeaker> {
    const content: EventSpeakerContent = {
      eventId: input.eventId,
      name: input.name.trim(),
      title: input.title,
      bio: input.bio ?? '',
      company: input.company ?? '',
      email: input.email ?? '',
      phone: input.phone ?? '',
      photoUrl: input.photoUrl ?? '',
      topic: input.topic ?? '',
      status: input.status ?? 'invited',
      presentationTitle: input.presentationTitle ?? '',
      presentationDuration: input.presentationDuration ?? 0,
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'event_speaker',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: input.eventId, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['event_speaker', content.status]),
        createdBy,
      },
    });

    return toSpeaker(row as MemoryRow);
  },

  async getSpeaker(id: string): Promise<EventSpeaker | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'event_speaker') return null;
    return toSpeaker(row as MemoryRow);
  },

  async listSpeakers(organizationId: string, opts: ListSpeakersOpts = {}): Promise<EventSpeaker[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'event_speaker', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toSpeaker(r as MemoryRow));
    if (opts.eventId) records = records.filter((s) => s.eventId === opts.eventId);
    if (opts.status) records = records.filter((s) => s.status === opts.status);
    return records;
  },

  async updateSpeaker(id: string, input: UpdateSpeakerInput): Promise<EventSpeaker | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSpeaker(existing.content);
    if (input.name !== undefined) content.name = input.name;
    if (input.title !== undefined) content.title = input.title;
    if (input.bio !== undefined) content.bio = input.bio;
    if (input.company !== undefined) content.company = input.company;
    if (input.email !== undefined) content.email = input.email;
    if (input.phone !== undefined) content.phone = input.phone;
    if (input.photoUrl !== undefined) content.photoUrl = input.photoUrl;
    if (input.topic !== undefined) content.topic = input.topic;
    if (input.status !== undefined) content.status = input.status;
    if (input.presentationTitle !== undefined) content.presentationTitle = input.presentationTitle;
    if (input.presentationDuration !== undefined) content.presentationDuration = input.presentationDuration;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_speaker', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toSpeaker(row as MemoryRow);
  },

  async confirmSpeaker(id: string, confirmedBy: string): Promise<EventSpeaker | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSpeaker(existing.content);
    content.status = 'confirmed';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_speaker', 'confirmed']),
          verifiedBy: confirmedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toSpeaker(row as MemoryRow);
  },

  async declineSpeaker(id: string, reason: string, declinedBy: string): Promise<EventSpeaker | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseSpeaker(existing.content);
    content.status = 'declined';
    content.bio = content.bio
      ? `${content.bio}\n[Declined by ${declinedBy}: ${reason}]`
      : `[Declined by ${declinedBy}: ${reason}]`;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_speaker', 'declined']),
          verifiedBy: declinedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toSpeaker(row as MemoryRow);
  },

  // ── Venues ──

  async createVenue(
    organizationId: string,
    workspaceId: string,
    input: CreateVenueInput,
    createdBy: string,
  ): Promise<EventVenue> {
    const content: EventVenueContent = {
      name: input.name.trim(),
      address: input.address,
      capacity: input.capacity,
      description: input.description ?? '',
      facilities: input.facilities ?? '',
      rentalCost: input.rentalCost ?? 0,
      contactName: input.contactName ?? '',
      contactPhone: input.contactPhone ?? '',
      contactEmail: input.contactEmail ?? '',
      status: input.status ?? 'available',
    };

    const row = await prisma.memory.create({
      data: {
        workspaceId, organizationId,
        type: 'event_venue',
        content: JSON.stringify(content).slice(0, 50000),
        source: 'user', sourceId: null, confidence: 1.0, lifecycle: 'permanent',
        tags: JSON.stringify(['event_venue', content.status]),
        createdBy,
      },
    });

    return toVenue(row as MemoryRow);
  },

  async getVenue(id: string): Promise<EventVenue | null> {
    const row = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!row) return null;
    if ((row as MemoryRow).type !== 'event_venue') return null;
    return toVenue(row as MemoryRow);
  },

  async listVenues(organizationId: string, opts: ListVenuesOpts = {}): Promise<EventVenue[]> {
    const rows = await safePrisma(
      () => prisma.memory.findMany({
        where: { type: 'event_venue', organizationId },
        orderBy: { createdAt: 'desc' }, take: 500,
      }), [],
    );

    let records = rows.map((r) => toVenue(r as MemoryRow));
    if (opts.status) records = records.filter((v) => v.status === opts.status);
    if (opts.capacityMin !== undefined) records = records.filter((v) => v.capacity >= opts.capacityMin!);
    return records;
  },

  async updateVenue(id: string, input: UpdateVenueInput): Promise<EventVenue | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseVenue(existing.content);
    if (input.name !== undefined) content.name = input.name.trim();
    if (input.address !== undefined) content.address = input.address;
    if (input.capacity !== undefined) content.capacity = input.capacity;
    if (input.description !== undefined) content.description = input.description;
    if (input.facilities !== undefined) content.facilities = input.facilities;
    if (input.rentalCost !== undefined) content.rentalCost = input.rentalCost;
    if (input.contactName !== undefined) content.contactName = input.contactName;
    if (input.contactPhone !== undefined) content.contactPhone = input.contactPhone;
    if (input.contactEmail !== undefined) content.contactEmail = input.contactEmail;
    if (input.status !== undefined) content.status = input.status;

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_venue', content.status]),
        },
      }), null,
    );
    if (!row) return null;
    return toVenue(row as MemoryRow);
  },

  async deleteVenue(id: string): Promise<boolean> {
    try {
      await prisma.memory.delete({ where: { id } });
      return true;
    } catch { return false; }
  },

  async bookVenue(id: string, bookedBy: string): Promise<EventVenue | null> {
    const existing = await safePrisma(() => prisma.memory.findUnique({ where: { id } }), null);
    if (!existing) return null;

    const content = parseVenue(existing.content);
    content.status = 'booked';

    const row = await safePrisma(
      () => prisma.memory.update({
        where: { id },
        data: {
          content: JSON.stringify(content).slice(0, 50000),
          tags: JSON.stringify(['event_venue', 'booked']),
          verifiedBy: bookedBy,
        },
      }), null,
    );
    if (!row) return null;
    return toVenue(row as MemoryRow);
  },

  // ── Metrics ──

  async getEventMetrics(organizationId: string): Promise<EventMetrics> {
    const [events, registrations, speakers, venues] = await Promise.all([
      EventsService.listEvents(organizationId),
      EventsService.listRegistrations(organizationId),
      EventsService.listSpeakers(organizationId),
      EventsService.listVenues(organizationId),
    ]);

    const now = new Date();
    const upcomingEvents = events.filter(
      (e) => e.startDate > now && e.status !== 'cancelled' && e.status !== 'completed',
    ).length;
    const totalRegistrations = registrations.filter((r) => r.status !== 'cancelled').length;
    const confirmedSpeakers = speakers.filter((s) => s.status === 'confirmed').length;
    const totalBudget = events.filter((e) => e.status !== 'cancelled').reduce((sum, e) => sum + e.budget, 0);
    const bookedVenues = venues.filter((v) => v.status === 'booked').length;
    const venueUtilization = venues.length > 0 ? Math.round((bookedVenues / venues.length) * 100) : 0;

    return {
      upcomingEvents,
      totalRegistrations,
      confirmedSpeakers,
      totalBudget,
      venueUtilization,
    };
  },

  // ── Stats ──

  async getEventStats(organizationId: string): Promise<EventStats> {
    const [events, registrations, speakers, venues] = await Promise.all([
      EventsService.listEvents(organizationId),
      EventsService.listRegistrations(organizationId),
      EventsService.listSpeakers(organizationId),
      EventsService.listVenues(organizationId),
    ]);

    const byEventType: Record<string, number> = {};
    const byEventStatus: Record<string, number> = {};
    for (const e of events) {
      byEventType[e.type] = (byEventType[e.type] || 0) + 1;
      byEventStatus[e.status] = (byEventStatus[e.status] || 0) + 1;
    }

    const byRegistrationStatus: Record<string, number> = {};
    for (const r of registrations) {
      byRegistrationStatus[r.status] = (byRegistrationStatus[r.status] || 0) + 1;
    }

    const bySpeakerStatus: Record<string, number> = {};
    for (const s of speakers) {
      bySpeakerStatus[s.status] = (bySpeakerStatus[s.status] || 0) + 1;
    }

    return {
      eventCount: events.length,
      activeEventCount: events.filter((e) => e.status === 'in_progress' || e.status === 'registration_open').length,
      registrationCount: registrations.length,
      confirmedRegistrationCount: registrations.filter((r) => r.status === 'confirmed').length,
      speakerCount: speakers.length,
      confirmedSpeakerCount: speakers.filter((s) => s.status === 'confirmed').length,
      venueCount: venues.length,
      bookedVenueCount: venues.filter((v) => v.status === 'booked').length,
      byEventType,
      byEventStatus,
      byRegistrationStatus,
      bySpeakerStatus,
    };
  },
};
