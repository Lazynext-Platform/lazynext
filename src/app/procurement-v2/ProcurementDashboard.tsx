'use client';

import { useState, useMemo } from 'react';
import {
  Package, TrendingUp, TrendingDown, Award, DollarSign,
  FileText, ShoppingCart, Clock, CheckCircle, XCircle,
  Plus, Search, Truck, AlertCircle, Send, Inbox,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type SupplierGrade = 'A' | 'B' | 'C' | 'D' | 'F';
type POStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'received'
  | 'cancelled';
type RFQStatus = 'open' | 'closed' | 'cancelled';

interface SupplierScorecard {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  vendorName: string;
  period: string;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  complianceScore: number;
  overallScore: number;
  grade: SupplierGrade;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface POItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
}

interface PurchaseOrder {
  id: string;
  organizationId: string;
  workspaceId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  items: POItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: POStatus;
  expectedDeliveryDate: string | null;
  receivedDate: string | null;
  receivedItems: { description: string; quantityReceived: number; condition?: string }[];
  approvedBy: string | null;
  rejectionReason: string | null;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RFQItem {
  description: string;
  quantity: number;
  specs?: string;
}

interface Quote {
  id: string;
  vendorId: string;
  vendorName: string;
  items: { description: string; unitPrice: number; leadTime?: string }[];
  totalQuote: number;
  validUntil: string | null;
  notes: string;
  status: 'pending' | 'accepted' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
}

interface RFQ {
  id: string;
  organizationId: string;
  workspaceId: string;
  rfqNumber: string;
  title: string;
  description: string;
  items: RFQItem[];
  status: RFQStatus;
  dueDate: string | null;
  quotes: Quote[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ScorecardStats {
  totalScorecards: number;
  avgScore: number;
  gradeDistribution: Record<SupplierGrade, number>;
}

interface POStats {
  totalPOs: number;
  byStatus: Record<POStatus, number>;
  totalValue: number;
  pendingCount: number;
  avgPOValue: number;
}

interface RFQStats {
  totalRFQs: number;
  byStatus: Record<RFQStatus, number>;
  totalQuotesReceived: number;
  acceptedCount: number;
}

interface ProcurementDashboardProps {
  organizationId: string;
  scorecards: SupplierScorecard[];
  topSuppliers: SupplierScorecard[];
  bottomSuppliers: SupplierScorecard[];
  gradeDistribution: Record<SupplierGrade, number>;
  scorecardStats: ScorecardStats;
  purchaseOrders: PurchaseOrder[];
  pendingApprovals: PurchaseOrder[];
  openPOs: PurchaseOrder[];
  poByStatus: Record<POStatus, PurchaseOrder[]>;
  poByVendor: Record<string, PurchaseOrder[]>;
  poStats: POStats;
  totalSpend: number;
  spendByVendor: Record<string, number>;
  rfqs: RFQ[];
  openRFQs: RFQ[];
  rfqStats: RFQStats;
}

// ── Helpers ──

const gradeVariant: Record<SupplierGrade, 'success' | 'accent' | 'info' | 'warning' | 'danger'> = {
  A: 'success',
  B: 'accent',
  C: 'info',
  D: 'warning',
  F: 'danger',
};

const poStatusVariant: Record<POStatus, 'default' | 'warning' | 'info' | 'danger' | 'accent' | 'success'> = {
  draft: 'default',
  pending_approval: 'warning',
  approved: 'info',
  rejected: 'danger',
  sent: 'accent',
  received: 'success',
  cancelled: 'default',
};

const rfqStatusVariant: Record<RFQStatus, 'success' | 'default' | 'danger'> = {
  open: 'success',
  closed: 'default',
  cancelled: 'danger',
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

export function ProcurementDashboard({
  organizationId: _organizationId,
  scorecards,
  topSuppliers,
  bottomSuppliers,
  gradeDistribution,
  scorecardStats,
  purchaseOrders,
  pendingApprovals,
  openPOs,
  poByStatus,
  poByVendor: _poByVendor,
  poStats,
  totalSpend,
  spendByVendor,
  rfqs,
  openRFQs,
  rfqStats,
}: ProcurementDashboardProps) {
  const [tab, setTab] = useState<'overview' | 'suppliers' | 'orders' | 'rfqs' | 'spend'>('overview');
  const [search, setSearch] = useState('');
  const [showCreateScorecard, setShowCreateScorecard] = useState(false);
  const [showCreatePO, setShowCreatePO] = useState(false);
  const [showCreateRFQ, setShowCreateRFQ] = useState(false);

  const filteredScorecards = useMemo(() => {
    if (!search) return scorecards;
    const q = search.toLowerCase();
    return scorecards.filter(
      (s) =>
        s.vendorName.toLowerCase().includes(q) ||
        s.period.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q),
    );
  }, [scorecards, search]);

  const filteredPOs = useMemo(() => {
    if (!search) return purchaseOrders;
    const q = search.toLowerCase();
    return purchaseOrders.filter(
      (p) =>
        p.poNumber.toLowerCase().includes(q) ||
        p.vendorName.toLowerCase().includes(q) ||
        p.notes.toLowerCase().includes(q),
    );
  }, [purchaseOrders, search]);

  const filteredRFQs = useMemo(() => {
    if (!search) return rfqs;
    const q = search.toLowerCase();
    return rfqs.filter(
      (r) =>
        r.rfqNumber.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }, [rfqs, search]);

  const topSpendVendors = useMemo(() => {
    return Object.entries(spendByVendor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [spendByVendor]);

  const maxSpend = useMemo(() => {
    const vals = Object.values(spendByVendor);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [spendByVendor]);

  const gradeKeys: SupplierGrade[] = ['A', 'B', 'C', 'D', 'F'];
  const poStatusKeys: POStatus[] = ['draft', 'pending_approval', 'approved', 'rejected', 'sent', 'received', 'cancelled'];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Scorecards</span>
          </div>
          <div className="heading-display text-2xl">{scorecardStats.totalScorecards}</div>
          <div className="text-xs text-fg-muted mt-1">Avg {scorecardStats.avgScore.toFixed(1)}/10</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Purchase Orders</span>
          </div>
          <div className="heading-display text-2xl">{poStats.totalPOs}</div>
          <div className="text-xs text-fg-muted mt-1">Avg {formatCurrency(poStats.avgPOValue)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-xs text-fg-secondary">Pending Approval</span>
          </div>
          <div className="heading-display text-2xl">{pendingApprovals.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-info" />
            <span className="text-xs text-fg-secondary">Open POs</span>
          </div>
          <div className="heading-display text-2xl">{openPOs.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ShoppingCart className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Open RFQs</span>
          </div>
          <div className="heading-display text-2xl">{openRFQs.length}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-xs text-fg-secondary">Total Spend</span>
          </div>
          <div className="heading-display text-2xl">{formatCurrency(totalSpend)}</div>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border">
        {([
          { id: 'overview', label: 'Overview', icon: Package },
          { id: 'suppliers', label: 'Suppliers', icon: Award },
          { id: 'orders', label: 'Purchase Orders', icon: FileText },
          { id: 'rfqs', label: 'RFQs', icon: ShoppingCart },
          { id: 'spend', label: 'Spend Analysis', icon: DollarSign },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-fg-secondary hover:text-fg-primary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== 'overview' && tab !== 'spend' && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 w-full"
          />
        </div>
      )}

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Grade Distribution */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="h-5 w-5 text-accent-primary" />
              <h2 className="heading-display text-lg">Grade Distribution</h2>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {gradeKeys.map((g) => (
                <div key={g} className="text-center p-3 rounded-lg border border-border">
                  <Badge variant={gradeVariant[g]} className="mb-2">{g}</Badge>
                  <div className="heading-display text-xl">{gradeDistribution[g] || 0}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Suppliers */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-success" />
                <h2 className="heading-display text-lg">Top Suppliers</h2>
              </div>
              {topSuppliers.length === 0 ? (
                <EmptyState icon={Award} title="No data" description="Top suppliers will appear here." />
              ) : (
                <div className="space-y-2">
                  {topSuppliers.slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-fg-muted w-5">#{i + 1}</span>
                        <span className="text-sm truncate">{s.vendorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted">{s.overallScore.toFixed(1)}</span>
                        <Badge variant={gradeVariant[s.grade]}>{s.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Bottom Suppliers */}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="h-5 w-5 text-danger" />
                <h2 className="heading-display text-lg">Needs Improvement</h2>
              </div>
              {bottomSuppliers.length === 0 ? (
                <EmptyState icon={AlertCircle} title="No data" description="Bottom suppliers will appear here." />
              ) : (
                <div className="space-y-2">
                  {bottomSuppliers.slice(0, 5).map((s, i) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded bg-surface-alt">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-fg-muted w-5">#{i + 1}</span>
                        <span className="text-sm truncate">{s.vendorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-fg-muted">{s.overallScore.toFixed(1)}</span>
                        <Badge variant={gradeVariant[s.grade]}>{s.grade}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Pending Approvals */}
          {pendingApprovals.length > 0 && (
            <Card className="p-4 border-l-4" style={{ borderLeftColor: 'var(--c-warning)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-5 w-5 text-warning" />
                <h2 className="heading-display text-lg">Pending Approvals ({pendingApprovals.length})</h2>
              </div>
              <div className="space-y-1">
                {pendingApprovals.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                    <span className="truncate">{p.poNumber} — {p.vendorName}</span>
                    <span className="text-fg-muted">{formatCurrency(p.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Open RFQs */}
          {openRFQs.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShoppingCart className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Open RFQs ({openRFQs.length})</h2>
              </div>
              <div className="space-y-1">
                {openRFQs.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                    <span className="truncate">{r.rfqNumber} — {r.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-fg-muted">{r.quotes.length} quotes</span>
                      <Badge variant="success">open</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-display text-lg">Supplier Scorecards</h2>
            <Button size="sm" onClick={() => setShowCreateScorecard(!showCreateScorecard)}>
              <Plus className="h-4 w-4 mr-1" />
              New Scorecard
            </Button>
          </div>

          {showCreateScorecard && (
            <CreateScorecardForm onClose={() => setShowCreateScorecard(false)} />
          )}

          {filteredScorecards.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Award}
                title="No scorecards"
                description="Create a supplier scorecard to track performance."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredScorecards.map((s) => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{s.vendorName}</span>
                        <Badge variant={gradeVariant[s.grade]}>{s.grade}</Badge>
                      </div>
                      <div className="text-xs text-fg-secondary mt-1">{s.period}</div>
                    </div>
                    <div className="text-right">
                      <div className="heading-display text-xl">{s.overallScore.toFixed(1)}</div>
                      <div className="text-xs text-fg-muted">Overall / 10</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 mt-3">
                    {([
                      { label: 'Quality', value: s.qualityScore },
                      { label: 'Delivery', value: s.deliveryScore },
                      { label: 'Cost', value: s.costScore },
                      { label: 'Service', value: s.serviceScore },
                      { label: 'Compliance', value: s.complianceScore },
                    ]).map((d) => (
                      <div key={d.label} className="text-center">
                        <div className="text-xs text-fg-secondary">{d.label}</div>
                        <div className="text-sm font-medium">{d.value.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                  {s.notes && (
                    <div className="text-xs text-fg-secondary mt-2 border-t border-border pt-2">{s.notes}</div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Purchase Orders Tab */}
      {tab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-display text-lg">Purchase Orders</h2>
            <Button size="sm" onClick={() => setShowCreatePO(!showCreatePO)}>
              <Plus className="h-4 w-4 mr-1" />
              New PO
            </Button>
          </div>

          {showCreatePO && (
            <CreatePOForm onClose={() => setShowCreatePO(false)} />
          )}

          {/* Status Summary */}
          <div className="grid grid-cols-4 gap-3 md:grid-cols-7">
            {poStatusKeys.map((st) => (
              <Card key={st} className="p-3 text-center">
                <div className="text-xs text-fg-secondary mb-1 capitalize">{st.replace('_', ' ')}</div>
                <div className="heading-display text-lg">{poByStatus[st]?.length || 0}</div>
              </Card>
            ))}
          </div>

          {filteredPOs.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={FileText}
                title="No purchase orders"
                description="Create a PO to start tracking procurement."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredPOs.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.poNumber}</span>
                        <Badge variant={poStatusVariant[p.status]}>{p.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="text-xs text-fg-secondary mt-1">{p.vendorName}</div>
                    </div>
                    <div className="text-right">
                      <div className="heading-display text-lg">{formatCurrency(p.total)}</div>
                      <div className="text-xs text-fg-muted">{p.items.length} items</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-fg-secondary">Expected: </span>
                      <span>{formatDate(p.expectedDeliveryDate)}</span>
                    </div>
                    <div>
                      <span className="text-fg-secondary">Subtotal: </span>
                      <span>{formatCurrency(p.subtotal)}</span>
                    </div>
                    <div>
                      <span className="text-fg-secondary">Tax: </span>
                      <span>{formatCurrency(p.tax)}</span>
                    </div>
                  </div>
                  {p.notes && (
                    <div className="text-xs text-fg-secondary mt-2 border-t border-border pt-2">{p.notes}</div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RFQs Tab */}
      {tab === 'rfqs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="heading-display text-lg">Request for Quotations</h2>
            <Button size="sm" onClick={() => setShowCreateRFQ(!showCreateRFQ)}>
              <Plus className="h-4 w-4 mr-1" />
              New RFQ
            </Button>
          </div>

          {showCreateRFQ && (
            <CreateRFQForm onClose={() => setShowCreateRFQ(false)} />
          )}

          {/* RFQ Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Total RFQs</div>
              <div className="heading-display text-xl">{rfqStats.totalRFQs}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Open</div>
              <div className="heading-display text-xl">{rfqStats.byStatus.open || 0}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Quotes Received</div>
              <div className="heading-display text-xl">{rfqStats.totalQuotesReceived}</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xs text-fg-secondary">Accepted</div>
              <div className="heading-display text-xl">{rfqStats.acceptedCount}</div>
            </Card>
          </div>

          {filteredRFQs.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={ShoppingCart}
                title="No RFQs"
                description="Create an RFQ to collect supplier quotes."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredRFQs.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{r.rfqNumber}</span>
                        <Badge variant={rfqStatusVariant[r.status]}>{r.status}</Badge>
                      </div>
                      <div className="text-sm mt-1">{r.title}</div>
                      {r.description && (
                        <div className="text-xs text-fg-secondary mt-1">{r.description}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-fg-muted">{r.items.length} items</div>
                      <div className="text-xs text-fg-muted">{r.quotes.length} quotes</div>
                    </div>
                  </div>
                  {r.dueDate && (
                    <div className="text-xs text-fg-secondary mt-2">
                      Due: {formatDate(r.dueDate)}
                    </div>
                  )}
                  {r.quotes.length > 0 && (
                    <div className="mt-3 border-t border-border pt-2">
                      <div className="text-xs font-medium mb-1">Quotes</div>
                      <div className="space-y-1">
                        {r.quotes.slice(0, 3).map((q) => (
                          <div key={q.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{q.vendorName}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-fg-muted">{formatCurrency(q.totalQuote)}</span>
                              <Badge variant={
                                q.status === 'accepted' ? 'success' :
                                q.status === 'rejected' ? 'danger' : 'default'
                              }>{q.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Spend Analysis Tab */}
      {tab === 'spend' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-success" />
              <h2 className="heading-display text-lg">Spend by Vendor</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <div className="text-xs text-fg-secondary">Total Spend</div>
                <div className="heading-display text-xl">{formatCurrency(totalSpend)}</div>
              </div>
              <div>
                <div className="text-xs text-fg-secondary">Vendors</div>
                <div className="heading-display text-xl">{Object.keys(spendByVendor).length}</div>
              </div>
            </div>
            {topSpendVendors.length === 0 ? (
              <EmptyState icon={DollarSign} title="No spend data" description="Spend will appear here once POs are approved." />
            ) : (
              <div className="space-y-2">
                {topSpendVendors.map(([vendorId, amount]) => (
                  <div key={vendorId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate">{vendorId}</span>
                      <span className="text-fg-muted">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-alt overflow-hidden">
                      <div
                        className="h-full bg-accent-primary rounded-full"
                        style={{ width: `${maxSpend > 0 ? (amount / maxSpend) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── Create Forms ──

function CreateScorecardForm({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">New Supplier Scorecard</h3>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onClose(); }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-secondary">Vendor Name</label>
            <input className="input w-full" placeholder="Acme Corp" />
          </div>
          <div>
            <label className="text-xs text-fg-secondary">Period</label>
            <input className="input w-full" placeholder="2025-Q1" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {['Quality', 'Delivery', 'Cost', 'Service', 'Compliance'].map((label) => (
            <div key={label}>
              <label className="text-xs text-fg-secondary">{label}</label>
              <input type="number" min={0} max={10} step={0.1} className="input w-full" placeholder="8.0" />
            </div>
          ))}
        </div>
        <div>
          <label className="text-xs text-fg-secondary">Notes</label>
          <textarea className="input w-full" rows={2} placeholder="Optional notes..." />
        </div>
        <Button type="submit" size="sm">Create Scorecard</Button>
      </form>
    </Card>
  );
}

function CreatePOForm({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">New Purchase Order</h3>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onClose(); }}
        className="space-y-3"
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-secondary">Vendor Name</label>
            <input className="input w-full" placeholder="Acme Corp" />
          </div>
          <div>
            <label className="text-xs text-fg-secondary">Expected Delivery</label>
            <input type="date" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="text-xs text-fg-secondary">Notes</label>
          <textarea className="input w-full" rows={2} placeholder="Optional notes..." />
        </div>
        <Button type="submit" size="sm">
          <Send className="h-4 w-4 mr-1" />
          Create PO
        </Button>
      </form>
    </Card>
  );
}

function CreateRFQForm({ onClose }: { onClose: () => void }) {
  return (
    <Card className="p-4 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">New Request for Quotation</h3>
        <button onClick={onClose} className="text-fg-muted hover:text-fg-primary">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); onClose(); }}
        className="space-y-3"
      >
        <div>
          <label className="text-xs text-fg-secondary">Title</label>
          <input className="input w-full" placeholder="Q1 Office Supplies" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-fg-secondary">Due Date</label>
            <input type="date" className="input w-full" />
          </div>
          <div>
            <label className="text-xs text-fg-secondary">Description</label>
            <input className="input w-full" placeholder="Optional description" />
          </div>
        </div>
        <Button type="submit" size="sm">
          <Inbox className="h-4 w-4 mr-1" />
          Create RFQ
        </Button>
      </form>
    </Card>
  );
}
