import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─────────────────────────────────────────────────────────────────────────────
// Mock setup
// ─────────────────────────────────────────────────────────────────────────────

interface CallRecord { method: string; args?: unknown; }
const calls: CallRecord[] = [];

type FindManyArgs = { where: Record<string, unknown>; orderBy?: unknown; take?: number };
type FindUniqueArgs = { where: Record<string, unknown>; select?: unknown; include?: unknown };
type CreateArgs = { data: Record<string, unknown> };
type UpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type DeleteArgs = { where: Record<string, unknown> };
type CountArgs = { where: Record<string, unknown> };

let memFindManyImpl: (args: FindManyArgs) => Promise<unknown[]> = async () => [];
let memFindUniqueImpl: (args: FindUniqueArgs) => Promise<unknown> = async () => null;
let memCreateImpl: (args: CreateArgs) => Promise<unknown> = async () => ({});
let memUpdateImpl: (args: UpdateArgs) => Promise<unknown> = async () => ({});
let memDeleteImpl: (args: DeleteArgs) => Promise<unknown> = async () => ({});
let memCountImpl: (args: CountArgs) => Promise<number> = async () => 0;

const prismaMock = {
  memory: {
    findMany: (args: FindManyArgs): Promise<unknown[]> => { calls.push({ method: 'memory.findMany', args }); return memFindManyImpl(args); },
    findUnique: (args: FindUniqueArgs): Promise<unknown> => { calls.push({ method: 'memory.findUnique', args }); return memFindUniqueImpl(args); },
    create: (args: CreateArgs): Promise<unknown> => { calls.push({ method: 'memory.create', args }); return memCreateImpl(args); },
    update: (args: UpdateArgs): Promise<unknown> => { calls.push({ method: 'memory.update', args }); return memUpdateImpl(args); },
    delete: (args: DeleteArgs): Promise<unknown> => { calls.push({ method: 'memory.delete', args }); return memDeleteImpl(args); },
    count: (args: CountArgs): Promise<number> => { calls.push({ method: 'memory.count', args }); return memCountImpl(args); },
  },
};

mock.module('@/lib/prisma', { namedExports: { prisma: prismaMock } });
mock.module('@/lib/safe-prisma', {
  namedExports: {
    safePrisma: async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try { return await fn(); } catch { return fallback; }
    },
  },
});

function makeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'mem-1', workspaceId: 'ws-1', organizationId: 'org-1', type: 'corp_event',
    content: JSON.stringify({
      title: 'Annual Conference', type: 'conference', description: 'Big event',
      startDate: '2024-09-01', endDate: '2024-09-03', location: 'NYC',
      capacity: 500, budget: 100000, status: 'planning', organizer: 'Events Team',
      targetAudience: 'All', notes: '',
    }),
    source: 'user', sourceId: null, confidence: 1.0, owner: null, accessPolicy: null,
    lifecycle: 'permanent', expiresAt: null, tags: JSON.stringify(['corp_event', 'conference', 'planning']),
    relatedMemoryIds: null, verifiedBy: null, verifiedAt: null,
    createdBy: 'user-1', createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function resetMock(): void {
  calls.length = 0;
  memFindManyImpl = async () => [];
  memFindUniqueImpl = async () => null;
  memCreateImpl = async () => ({});
  memUpdateImpl = async () => ({});
  memDeleteImpl = async () => ({});
  memCountImpl = async () => 0;
}

const { EventsService } = await import('@/lib/services/events-service');

// ─────────────────────────────────────────────────────────────────────────────

describe('EventsService — Events', () => {
  beforeEach(() => resetMock());

  it('creates an event with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const e = await EventsService.createEvent('org-1', 'ws-1', {
      title: 'Tech Summit', type: 'conference', startDate: '2024-09-01',
    }, 'user-1');
    assert.equal(e.title, 'Tech Summit');
    assert.equal(e.status, 'planning');
    assert.equal(e.capacity, 0);
    assert.equal(e.budget, 0);
  });

  it('creates an event with full input', async () => {
    memCreateImpl = async (args) => makeRow({ content: args.data.content as string });
    const e = await EventsService.createEvent('org-1', 'ws-1', {
      title: 'Workshop', type: 'workshop', startDate: '2024-10-01', endDate: '2024-10-02',
      location: 'SF', capacity: 100, budget: 25000, status: 'scheduled',
      organizer: 'HR', targetAudience: 'Engineers', notes: 'Hands-on',
    }, 'user-1');
    assert.equal(e.location, 'SF');
    assert.equal(e.capacity, 100);
    assert.equal(e.status, 'scheduled');
  });

  it('gets an event by id', async () => {
    memFindUniqueImpl = async () => makeRow();
    const e = await EventsService.getEvent('mem-1');
    assert.ok(e);
    assert.equal(e!.title, 'Annual Conference');
  });

  it('returns null for non-event type', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'other' });
    const e = await EventsService.getEvent('mem-1');
    assert.equal(e, null);
  });

  it('returns null when event not found', async () => {
    memFindUniqueImpl = async () => null;
    const e = await EventsService.getEvent('nope');
    assert.equal(e, null);
  });

  it('lists events by organization', async () => {
    memFindManyImpl = async () => [makeRow(), makeRow({ id: 'mem-2', content: JSON.stringify({ title: 'Second', type: 'seminar', description: '', startDate: '2024-10-01', endDate: '', location: '', capacity: 0, budget: 0, status: 'planning', organizer: '', targetAudience: '', notes: '' }) })];
    const list = await EventsService.listEvents('org-1');
    assert.equal(list.length, 2);
  });

  it('filters events by type', async () => {
    memFindManyImpl = async () => [
      makeRow({ content: JSON.stringify({ title: 'C', type: 'conference', description: '', startDate: '2024-01-01', endDate: '', location: '', capacity: 0, budget: 0, status: 'planning', organizer: '', targetAudience: '', notes: '' }) }),
      makeRow({ id: 'm2', content: JSON.stringify({ title: 'W', type: 'workshop', description: '', startDate: '2024-01-01', endDate: '', location: '', capacity: 0, budget: 0, status: 'planning', organizer: '', targetAudience: '', notes: '' }) }),
    ];
    const list = await EventsService.listEvents('org-1', { type: 'workshop' });
    assert.equal(list.length, 1);
    assert.equal(list[0].type, 'workshop');
  });

  it('updates an event', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async (args) => makeRow({ content: args.data.content as string });
    const e = await EventsService.updateEvent('mem-1', { budget: 200000 });
    assert.ok(e);
    assert.equal(e!.budget, 200000);
  });

  it('deletes an event', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EventsService.deleteEvent('mem-1');
    assert.equal(ok, true);
  });

  it('opens registration', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({ title: 'E', type: 'conference', description: '', startDate: '2024-01-01', endDate: '', location: '', capacity: 0, budget: 0, status: 'registration_open', organizer: '', targetAudience: '', notes: '' }) });
    const e = await EventsService.openRegistration('mem-1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'registration_open');
  });

  it('completes an event', async () => {
    memFindUniqueImpl = async () => makeRow();
    memUpdateImpl = async () => makeRow({ content: JSON.stringify({ title: 'E', type: 'conference', description: '', startDate: '2024-01-01', endDate: '', location: '', capacity: 0, budget: 0, status: 'completed', organizer: '', targetAudience: '', notes: '' }) });
    const e = await EventsService.completeEvent('mem-1', 'user-1');
    assert.ok(e);
    assert.equal(e!.status, 'completed');
  });
});

describe('EventsService — Registrations', () => {
  beforeEach(() => resetMock());

  it('creates a registration with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'event_registration', content: args.data.content as string });
    const r = await EventsService.createRegistration('org-1', 'ws-1', {
      eventId: 'e-1', attendeeName: 'John', attendeeEmail: 'john@test.com',
    }, 'user-1');
    assert.equal(r.eventId, 'e-1');
    assert.equal(r.attendeeName, 'John');
    assert.equal(r.status, 'registered');
  });

  it('creates a registration with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'event_registration', content: args.data.content as string });
    const r = await EventsService.createRegistration('org-1', 'ws-1', {
      eventId: 'e-1', attendeeName: 'Jane', attendeeEmail: 'jane@test.com',
      attendeePhone: '555-0100', company: 'Acme', jobTitle: 'CEO',
      dietaryRequirements: 'Vegan', status: 'confirmed',
    }, 'user-1');
    assert.equal(r.company, 'Acme');
    assert.equal(r.status, 'confirmed');
  });

  it('gets a registration by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '2024-01-01',
    }) });
    const r = await EventsService.getRegistration('mem-1');
    assert.ok(r);
    assert.equal(r!.attendeeName, 'A');
  });

  it('lists registrations', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '2024-01-01',
    }) })];
    const list = await EventsService.listRegistrations('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a registration', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '2024-01-01',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'event_registration', content: args.data.content as string });
    const r = await EventsService.updateRegistration('mem-1', { company: 'NewCo' });
    assert.ok(r);
  });

  it('confirms a registration', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '2024-01-01',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'confirmed', registeredDate: '2024-01-01',
    }) });
    const r = await EventsService.confirmRegistration('mem-1', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'confirmed');
  });

  it('cancels a registration', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '2024-01-01',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'event_registration', content: JSON.stringify({
      eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'cancelled', registeredDate: '2024-01-01',
    }) });
    const r = await EventsService.cancelRegistration('mem-1', 'No show', 'user-1');
    assert.ok(r);
    assert.equal(r!.status, 'cancelled');
  });
});

describe('EventsService — Speakers', () => {
  beforeEach(() => resetMock());

  it('creates a speaker with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'event_speaker', content: args.data.content as string });
    const s = await EventsService.createSpeaker('org-1', 'ws-1', {
      eventId: 'e-1', name: 'Dr. Smith', title: 'CTO',
    }, 'user-1');
    assert.equal(s.eventId, 'e-1');
    assert.equal(s.name, 'Dr. Smith');
    assert.equal(s.status, 'invited');
  });

  it('creates a speaker with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'event_speaker', content: args.data.content as string });
    const s = await EventsService.createSpeaker('org-1', 'ws-1', {
      eventId: 'e-1', name: 'Jane', title: 'VP', bio: 'Expert', company: 'Tech',
      email: 'jane@tech.com', phone: '555', topic: 'AI', status: 'confirmed',
      presentationTitle: 'Future of AI', presentationDuration: 45,
    }, 'user-1');
    assert.equal(s.company, 'Tech');
    assert.equal(s.status, 'confirmed');
    assert.equal(s.presentationDuration, 45);
  });

  it('gets a speaker by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_speaker', content: JSON.stringify({
      eventId: 'e1', name: 'S', title: 'T', bio: '', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'invited', presentationTitle: '', presentationDuration: 0,
    }) });
    const s = await EventsService.getSpeaker('mem-1');
    assert.ok(s);
  });

  it('lists speakers', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'event_speaker', content: JSON.stringify({
      eventId: 'e1', name: 'S', title: 'T', bio: '', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'invited', presentationTitle: '', presentationDuration: 0,
    }) })];
    const list = await EventsService.listSpeakers('org-1');
    assert.equal(list.length, 1);
  });

  it('confirms a speaker', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_speaker', content: JSON.stringify({
      eventId: 'e1', name: 'S', title: 'T', bio: '', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'invited', presentationTitle: '', presentationDuration: 0,
    }) });
    memUpdateImpl = async () => makeRow({ type: 'event_speaker', content: JSON.stringify({
      eventId: 'e1', name: 'S', title: 'T', bio: '', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'confirmed', presentationTitle: '', presentationDuration: 0,
    }) });
    const s = await EventsService.confirmSpeaker('mem-1', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'confirmed');
  });

  it('declines a speaker with reason', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_speaker', content: JSON.stringify({
      eventId: 'e1', name: 'S', title: 'T', bio: '', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'invited', presentationTitle: '', presentationDuration: 0,
    }) });
    memUpdateImpl = async () => makeRow({ type: 'event_speaker', content: JSON.stringify({
      eventId: 'e1', name: 'S', title: 'T', bio: '[Declined by user-1: Conflict]', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'declined', presentationTitle: '', presentationDuration: 0,
    }) });
    const s = await EventsService.declineSpeaker('mem-1', 'Conflict', 'user-1');
    assert.ok(s);
    assert.equal(s!.status, 'declined');
    assert.ok(s!.bio.includes('Declined'));
  });
});

describe('EventsService — Venues', () => {
  beforeEach(() => resetMock());

  it('creates a venue with defaults', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'event_venue', content: args.data.content as string });
    const v = await EventsService.createVenue('org-1', 'ws-1', {
      name: 'Grand Hall', address: '123 Main St', capacity: 300,
    }, 'user-1');
    assert.equal(v.name, 'Grand Hall');
    assert.equal(v.capacity, 300);
    assert.equal(v.status, 'available');
  });

  it('creates a venue with full input', async () => {
    memCreateImpl = async (args) => makeRow({ type: 'event_venue', content: args.data.content as string });
    const v = await EventsService.createVenue('org-1', 'ws-1', {
      name: 'Conference Center', address: '456 Oak', capacity: 500,
      description: 'Large', facilities: 'AV, Catering', rentalCost: 10000,
      contactName: 'Bob', contactPhone: '555', contactEmail: 'bob@cc.com',
    }, 'user-1');
    assert.equal(v.rentalCost, 10000);
    assert.equal(v.contactName, 'Bob');
  });

  it('gets a venue by id', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_venue', content: JSON.stringify({
      name: 'V', address: 'A', capacity: 100, description: '', facilities: '', rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'available',
    }) });
    const v = await EventsService.getVenue('mem-1');
    assert.ok(v);
  });

  it('lists venues', async () => {
    memFindManyImpl = async () => [makeRow({ type: 'event_venue', content: JSON.stringify({
      name: 'V', address: 'A', capacity: 100, description: '', facilities: '', rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'available',
    }) })];
    const list = await EventsService.listVenues('org-1');
    assert.equal(list.length, 1);
  });

  it('updates a venue', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_venue', content: JSON.stringify({
      name: 'V', address: 'A', capacity: 100, description: '', facilities: '', rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'available',
    }) });
    memUpdateImpl = async (args) => makeRow({ type: 'event_venue', content: args.data.content as string });
    const v = await EventsService.updateVenue('mem-1', { capacity: 200 });
    assert.ok(v);
    assert.equal(v!.capacity, 200);
  });

  it('deletes a venue', async () => {
    memDeleteImpl = async () => ({ id: 'mem-1' });
    const ok = await EventsService.deleteVenue('mem-1');
    assert.equal(ok, true);
  });

  it('books a venue', async () => {
    memFindUniqueImpl = async () => makeRow({ type: 'event_venue', content: JSON.stringify({
      name: 'V', address: 'A', capacity: 100, description: '', facilities: '', rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'available',
    }) });
    memUpdateImpl = async () => makeRow({ type: 'event_venue', content: JSON.stringify({
      name: 'V', address: 'A', capacity: 100, description: '', facilities: '', rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'booked',
    }) });
    const v = await EventsService.bookVenue('mem-1', 'user-1');
    assert.ok(v);
    assert.equal(v!.status, 'booked');
  });
});

describe('EventsService — Metrics & Stats', () => {
  beforeEach(() => resetMock());

  it('returns metrics', async () => {
    const allRows = [
      makeRow({ type: 'corp_event', content: JSON.stringify({ title: 'E', type: 'conference', description: '', startDate: '2028-09-01', endDate: '', location: '', capacity: 0, budget: 50000, status: 'scheduled', organizer: '', targetAudience: '', notes: '' }) }),
      makeRow({ id: 'm2', type: 'event_registration', content: JSON.stringify({ eventId: 'e1', attendeeName: 'A', attendeeEmail: 'a@b.com', attendeePhone: '', company: '', jobTitle: '', dietaryRequirements: '', status: 'registered', registeredDate: '2024-01-01' }) }),
      makeRow({ id: 'm3', type: 'event_speaker', content: JSON.stringify({ eventId: 'e1', name: 'S', title: 'T', bio: '', company: '', email: '', phone: '', photoUrl: '', topic: '', status: 'confirmed', presentationTitle: '', presentationDuration: 0 }) }),
      makeRow({ id: 'm4', type: 'event_venue', content: JSON.stringify({ name: 'V', address: 'A', capacity: 100, description: '', facilities: '', rentalCost: 0, contactName: '', contactPhone: '', contactEmail: '', status: 'booked' }) }),
    ];
    memFindManyImpl = async (args) => {
      const type = args.where?.type as string | undefined;
      if (type) return allRows.filter((r) => r.type === type);
      return allRows;
    };
    const m = await EventsService.getEventMetrics('org-1');
    assert.equal(m.upcomingEvents, 1);
    assert.equal(m.totalRegistrations, 1);
    assert.equal(m.confirmedSpeakers, 1);
    assert.equal(m.venueUtilization, 100);
  });

  it('returns stats with counts', async () => {
    const allRows = [
      makeRow({ type: 'corp_event', content: JSON.stringify({ title: 'E', type: 'conference', description: '', startDate: '2024-01-01', endDate: '', location: '', capacity: 0, budget: 0, status: 'planning', organizer: '', targetAudience: '', notes: '' }) }),
    ];
    memFindManyImpl = async (args) => {
      const type = args.where?.type as string | undefined;
      if (type) return allRows.filter((r) => r.type === type);
      return allRows;
    };
    const s = await EventsService.getEventStats('org-1');
    assert.ok(s.eventCount >= 0);
    assert.ok(typeof s.byEventType === 'object');
  });
});
