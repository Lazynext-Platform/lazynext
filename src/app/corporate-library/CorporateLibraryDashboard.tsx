'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen, BookMarked, CalendarClock, ShoppingCart,
  Search, BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  LibraryItem, LibraryLoan, LibraryReservation, LibraryAcquisition,
  CorporateLibraryMetrics, CorporateLibraryStats,
} from '@/lib/services/corporate-library-service';

type TabId = 'overview' | 'items' | 'loans' | 'reservations' | 'acquisitions';

interface CorporateLibraryDashboardProps {
  organizationId: string;
  items: LibraryItem[];
  loans: LibraryLoan[];
  reservations: LibraryReservation[];
  acquisitions: LibraryAcquisition[];
  metrics: CorporateLibraryMetrics;
  stats: CorporateLibraryStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['available', 'returned', 'fulfilled', 'received'].includes(status)) return 'success';
  if (['active', 'reserved', 'pending', 'requested', 'approved', 'ordered', 'renewed', 'in_repair'].includes(status)) return 'warning';
  if (['lost', 'overdue', 'cancelled', 'rejected', 'archived', 'weeded'].includes(status)) return 'danger';
  return 'info';
};

export function CorporateLibraryDashboard({
  items, loans, reservations, acquisitions, metrics, stats,
}: CorporateLibraryDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.status.toLowerCase().includes(q) || i.author.toLowerCase().includes(q),
    );
  }, [items, search]);

  const filteredLoans = useMemo(() => {
    if (!search) return loans;
    const q = search.toLowerCase();
    return loans.filter(
      (l) => l.borrowerName.toLowerCase().includes(q) || l.status.toLowerCase().includes(q) || l.itemId.toLowerCase().includes(q),
    );
  }, [loans, search]);

  const filteredReservations = useMemo(() => {
    if (!search) return reservations;
    const q = search.toLowerCase();
    return reservations.filter(
      (r) => r.reserverName.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.itemId.toLowerCase().includes(q),
    );
  }, [reservations, search]);

  const filteredAcquisitions = useMemo(() => {
    if (!search) return acquisitions;
    const q = search.toLowerCase();
    return acquisitions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [acquisitions, search]);

  const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'items', label: 'Items', icon: BookOpen },
    { id: 'loans', label: 'Loans', icon: BookMarked },
    { id: 'reservations', label: 'Reservations', icon: CalendarClock },
    { id: 'acquisitions', label: 'Acquisitions', icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available Items</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Checked Out</div>
              <div className="mt-1 text-2xl font-bold">{metrics.checkedOutItems}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Loans</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueLoans}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Reservations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeReservations}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Item Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byItemType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Item Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byItemStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Loan Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byLoanStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Acquisition Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byAcquisitionStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'items' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="p-8"><EmptyState icon={BookOpen} title="No library items" description="Library items will appear here." /></Card>
          ) : (
            filteredItems.map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{i.title}</div>
                    <div className="text-sm text-fg-secondary">{i.type.replace('_', ' ')} · {i.author || 'Unknown author'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i.quantity > 0 && <Badge variant="default">Qty: {i.quantity}</Badge>}
                    <Badge variant={statusVariant(i.status)}>{i.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'loans' && (
        <div className="space-y-3">
          {filteredLoans.length === 0 ? (
            <Card className="p-8"><EmptyState icon={BookMarked} title="No loans" description="Library loans will appear here." /></Card>
          ) : (
            filteredLoans.map((l) => (
              <Card key={l.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{l.borrowerName}</div>
                    <div className="text-sm text-fg-secondary">Item: {l.itemId} · {l.dueDate ? new Date(l.dueDate).toLocaleDateString() : 'No due date'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.condition && <Badge variant="default">{l.condition}</Badge>}
                    <Badge variant={statusVariant(l.status)}>{l.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'reservations' && (
        <div className="space-y-3">
          {filteredReservations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CalendarClock} title="No reservations" description="Library reservations will appear here." /></Card>
          ) : (
            filteredReservations.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.reserverName}</div>
                    <div className="text-sm text-fg-secondary">Item: {r.itemId} · {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'No expiry'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'acquisitions' && (
        <div className="space-y-3">
          {filteredAcquisitions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ShoppingCart} title="No acquisitions" description="Library acquisitions will appear here." /></Card>
          ) : (
            filteredAcquisitions.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.supplier || 'No supplier'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.cost > 0 && <Badge variant="default">${a.cost.toLocaleString()}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
