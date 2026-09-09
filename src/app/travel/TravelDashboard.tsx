'use client';

import { useState, useMemo } from 'react';
import {
  Plane, MapPin, Calendar, Luggage, Plus, Search,
  CheckCircle, XCircle, Clock, DollarSign, Hotel, Car, Users,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type TravelStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
type TransportMode = 'flight' | 'train' | 'car' | 'bus' | 'other';
type ItineraryType = 'flight' | 'hotel' | 'car_rental' | 'meeting' | 'other';
type BookingType = 'flight' | 'hotel' | 'car_rental' | 'other';
type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

interface TravelRequest {
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

interface ItineraryItem {
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

interface TravelBooking {
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

interface TravelCostSummary {
  totalCost: number;
  byCategory: Record<string, number>;
  byTransportMode: Record<string, number>;
  requestCount: number;
}

interface TravelStats {
  requestCount: number;
  approvalRate: number;
  totalCost: number;
  pendingCount: number;
}

interface TravelDashboardProps {
  organizationId: string;
  requests: TravelRequest[];
  costSummary: TravelCostSummary;
  stats: TravelStats;
}

// ── Helpers ──

const statusVariant: Record<TravelStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'default',
};

const transportVariant: Record<TransportMode, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  flight: 'info',
  train: 'accent',
  car: 'success',
  bus: 'warning',
  other: 'default',
};

const bookingStatusVariant: Record<BookingStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
};

const itineraryIcon: Record<ItineraryType, typeof Plane> = {
  flight: Plane,
  hotel: Hotel,
  car_rental: Car,
  meeting: Users,
  other: MapPin,
};

function formatCurrency(amount: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

export function TravelDashboard({
  organizationId: _organizationId,
  requests,
  costSummary,
  stats,
}: TravelDashboardProps) {
  const [tab, setTab] = useState<'requests' | 'itineraries' | 'bookings' | 'cost'>('requests');
  const [search, setSearch] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [bookings, setBookings] = useState<TravelBooking[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Create-form state
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    employeeId: '',
    employeeName: '',
    destination: '',
    purpose: '',
    departureDate: '',
    returnDate: '',
    estimatedCost: '',
    transportMode: 'flight' as TransportMode,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const filteredRequests = useMemo(() => {
    if (!search) return requests;
    const q = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.destination.toLowerCase().includes(q) ||
        r.purpose.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q),
    );
  }, [requests, search]);

  const selectedRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) ?? null,
    [requests, selectedRequestId],
  );

  async function loadDetails(requestId: string) {
    setSelectedRequestId(requestId);
    setLoadingDetails(true);
    try {
      const [itRes, bkRes] = await Promise.all([
        fetch(`/api/travel/requests/${requestId}/itinerary`),
        fetch(`/api/travel/requests/${requestId}/bookings`),
      ]);
      const itData = await itRes.json().catch(() => ({ itinerary: [] }));
      const bkData = await bkRes.json().catch(() => ({ bookings: [] }));
      setItinerary(itData.itinerary ?? []);
      setBookings(bkData.bookings ?? []);
    } catch {
      setItinerary([]);
      setBookings([]);
    } finally {
      setLoadingDetails(false);
    }
  }

  async function handleCreate() {
    if (!form.employeeId || !form.employeeName || !form.destination || !form.purpose || !form.departureDate || !form.returnDate) {
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/travel/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({
          employeeId: '', employeeName: '', destination: '', purpose: '',
          departureDate: '', returnDate: '', estimatedCost: '',
          transportMode: 'flight', notes: '',
        });
        window.location.reload();
      }
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'reject' | 'cancel') {
    const payload: Record<string, unknown> = {};
    if (action === 'reject' || action === 'cancel') {
      const reason = window.prompt(`Reason for ${action}:`);
      if (!reason) return;
      payload.reason = reason;
    }
    try {
      const res = await fetch(`/api/travel/requests/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) window.location.reload();
    } catch {
      // ignore
    }
  }

  async function handleConvertExpense(id: string) {
    try {
      const res = await fetch(`/api/travel/requests/${id}/convert-expense`, { method: 'POST' });
      if (res.ok) {
        alert('Converted to expense successfully.');
      } else {
        alert('Failed to convert to expense.');
      }
    } catch {
      alert('Failed to convert to expense.');
    }
  }

  const tabs: { id: typeof tab; label: string; icon: typeof Plane }[] = [
    { id: 'requests', label: 'Requests', icon: Plane },
    { id: 'itineraries', label: 'Itineraries', icon: MapPin },
    { id: 'bookings', label: 'Bookings', icon: Luggage },
    { id: 'cost', label: 'Cost Summary', icon: DollarSign },
  ];

  const maxCategoryCost = Math.max(1, ...Object.values(costSummary.byCategory));

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Plane className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Requests</span>
          </div>
          <p className="text-2xl font-semibold">{stats.requestCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Approval Rate</span>
          </div>
          <p className="text-2xl font-semibold">{(stats.approvalRate * 100).toFixed(0)}%</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Pending</span>
          </div>
          <p className="text-2xl font-semibold">{stats.pendingCount}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Total Cost</span>
          </div>
          <p className="text-2xl font-semibold">{formatCurrency(stats.totalCost)}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-alt text-fg-secondary hover:text-fg-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search + Create */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          New Request
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">New Travel Request</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs text-fg-secondary">Employee ID</label>
              <input className="input w-full" value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Employee Name</label>
              <input className="input w-full" value={form.employeeName} onChange={(e) => setForm({ ...form, employeeName: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Destination</label>
              <input className="input w-full" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Purpose</label>
              <input className="input w-full" value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Departure Date</label>
              <input type="date" className="input w-full" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Return Date</label>
              <input type="date" className="input w-full" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Estimated Cost</label>
              <input type="number" className="input w-full" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Transport Mode</label>
              <select className="input w-full" value={form.transportMode} onChange={(e) => setForm({ ...form, transportMode: e.target.value as TransportMode })}>
                <option value="flight">Flight</option>
                <option value="train">Train</option>
                <option value="car">Car</option>
                <option value="bus">Bus</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs text-fg-secondary">Notes</label>
              <textarea className="input w-full" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={submitting}>{submitting ? 'Creating...' : 'Create Request'}</Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Tab content */}
      {tab === 'requests' && (
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Plane}
                title="No travel requests"
                description="Create a travel request to get started."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRequests.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{r.destination}</h3>
                      <p className="text-xs text-fg-secondary">{r.employeeName}</p>
                    </div>
                    <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{r.purpose}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-fg-secondary" />
                      <span>{formatDate(r.departureDate)} → {formatDate(r.returnDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Transport</span>
                      <Badge variant={transportVariant[r.transportMode]}>{r.transportMode}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Est. Cost</span>
                      <span className="font-medium">{formatCurrency(r.estimatedCost)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="ghost" onClick={() => { setTab('itineraries'); loadDetails(r.id); }}>Details</Button>
                    {r.status === 'pending' && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, 'approve')}>Approve</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, 'reject')}>Reject</Button>
                      </>
                    )}
                    {r.status !== 'cancelled' && r.status !== 'rejected' && (
                      <Button size="sm" variant="ghost" onClick={() => handleAction(r.id, 'cancel')}>Cancel</Button>
                    )}
                    {r.status === 'approved' && (
                      <Button size="sm" variant="ghost" onClick={() => handleConvertExpense(r.id)}>→ Expense</Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'itineraries' && (
        <div className="space-y-4">
          {!selectedRequest ? (
            <Card className="p-8">
              <EmptyState
                icon={MapPin}
                title="Select a request"
                description="Choose a travel request to view its itinerary timeline."
              />
            </Card>
          ) : loadingDetails ? (
            <Card className="p-8 text-center text-sm text-fg-secondary">Loading itinerary...</Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedRequest.destination}</h3>
                  <p className="text-xs text-fg-secondary">{selectedRequest.employeeName}</p>
                </div>
                <Badge variant={statusVariant[selectedRequest.status]}>{selectedRequest.status}</Badge>
              </div>
              {itinerary.length === 0 ? (
                <Card className="p-8">
                  <EmptyState icon={Calendar} title="No itinerary items" description="Add itinerary items to build the travel timeline." />
                </Card>
              ) : (
                <div className="relative space-y-3 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {itinerary
                    .slice()
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((item) => {
                      const Icon = itineraryIcon[item.type] ?? MapPin;
                      return (
                        <div key={item.id} className="relative flex gap-3 pl-8">
                          <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-surface-alt">
                            <Icon className="h-3.5 w-3.5 text-accent-primary" />
                          </div>
                          <Card className="flex-1 p-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{item.title}</p>
                                <p className="text-xs text-fg-secondary">{formatDate(item.date)}</p>
                                {item.location && <p className="text-xs text-fg-secondary">{item.location}</p>}
                              </div>
                              <div className="text-right">
                                <Badge variant="default">{item.type}</Badge>
                                {item.cost > 0 && <p className="text-xs font-medium mt-1">{formatCurrency(item.cost)}</p>}
                              </div>
                            </div>
                            {item.details && <p className="text-xs text-fg-secondary mt-2">{item.details}</p>}
                          </Card>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="space-y-4">
          {!selectedRequest ? (
            <Card className="p-8">
              <EmptyState
                icon={Luggage}
                title="Select a request"
                description="Choose a travel request to view its bookings."
              />
            </Card>
          ) : loadingDetails ? (
            <Card className="p-8 text-center text-sm text-fg-secondary">Loading bookings...</Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{selectedRequest.destination}</h3>
                  <p className="text-xs text-fg-secondary">{selectedRequest.employeeName}</p>
                </div>
                <Badge variant={statusVariant[selectedRequest.status]}>{selectedRequest.status}</Badge>
              </div>
              {bookings.length === 0 ? (
                <Card className="p-8">
                  <EmptyState icon={Luggage} title="No bookings" description="Add bookings to track reservations for this trip." />
                </Card>
              ) : (
                <Card className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-fg-secondary">
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium">Vendor</th>
                        <th className="p-3 font-medium">Confirmation</th>
                        <th className="p-3 font-medium">Cost</th>
                        <th className="p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((b) => (
                        <tr key={b.id} className="border-b last:border-0">
                          <td className="p-3"><Badge variant="default">{b.type}</Badge></td>
                          <td className="p-3">{b.vendor}</td>
                          <td className="p-3 text-fg-secondary">{b.confirmationNumber || '—'}</td>
                          <td className="p-3 font-medium">{formatCurrency(b.cost)}</td>
                          <td className="p-3"><Badge variant={bookingStatusVariant[b.status]}>{b.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'cost' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-fg-secondary" />
              <span className="text-xs text-fg-secondary">Total Travel Cost</span>
            </div>
            <p className="text-3xl font-semibold">{formatCurrency(costSummary.totalCost)}</p>
            <p className="text-xs text-fg-secondary mt-1">{costSummary.requestCount} request(s)</p>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Cost by Category</h3>
              {Object.keys(costSummary.byCategory).length === 0 ? (
                <p className="text-sm text-fg-secondary">No cost data.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(costSummary.byCategory).map(([cat, val]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-fg-secondary">{cat}</span>
                        <span className="font-medium">{formatCurrency(val)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                        <div className="h-full bg-accent-primary" style={{ width: `${(val / maxCategoryCost) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Cost by Transport Mode</h3>
              {Object.keys(costSummary.byTransportMode).length === 0 ? (
                <p className="text-sm text-fg-secondary">No cost data.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(costSummary.byTransportMode).map(([mode, val]) => (
                    <div key={mode}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-fg-secondary">{mode}</span>
                        <span className="font-medium">{formatCurrency(val)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                        <div className="h-full bg-accent-secondary" style={{ width: `${(val / maxCategoryCost) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
