'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Building2, Search, FileText, Star, AlertCircle, DollarSign,
  CheckCircle, Plus, Mail, Phone, Globe, MapPin, TrendingUp,
  Shield, Clock, X,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type VendorStatus = 'active' | 'inactive' | 'preferred' | 'blocked';
type ContractStatus = 'active' | 'expired' | 'pending' | 'terminated' | 'renewal';
type ContractType = 'service' | 'subscription' | 'one_time' | 'master' | 'nda';
type ComplianceType = 'insurance' | 'certification' | 'security' | 'regulatory' | 'contractual';
type ComplianceStatus = 'compliant' | 'non_compliant' | 'pending' | 'expired';

interface Vendor {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  category: string;
  status: VendorStatus;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  taxId: string;
  paymentTerms: string;
  notes: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorContract {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  title: string;
  contractType: ContractType;
  startDate: Date;
  endDate: Date;
  value: number;
  currency: string;
  status: ContractStatus;
  terms: string;
  renewalDate: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorPerformance {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  rating: number;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  serviceScore: number;
  overallScore: number;
  comments: string;
  reviewDate: Date;
  reviewerId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorSpend {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  amount: number;
  currency: string;
  category: string;
  date: Date;
  description: string;
  invoiceNumber: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorCompliance {
  id: string;
  organizationId: string;
  workspaceId: string;
  vendorId: string;
  type: ComplianceType;
  name: string;
  status: ComplianceStatus;
  expiryDate: Date | null;
  documentUrl: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorStats {
  totalVendors: number;
  byCategory: Record<string, number>;
  byStatus: Record<VendorStatus, number>;
  activeContracts: number;
  totalSpend: number;
}

interface ContractStats {
  totalContracts: number;
  byStatus: Record<ContractStatus, number>;
  byType: Record<ContractType, number>;
  totalValue: number;
  expiringCount: number;
}

interface PerformanceStats {
  totalReviews: number;
  avgRating: number;
  avgOverallScore: number;
  distribution: Record<number, number>;
}

interface Performer {
  vendorId: string;
  avgScore: number;
  reviewCount: number;
}

interface SpendStats {
  totalSpend: number;
  byCategory: Record<string, number>;
  byVendor: Record<string, number>;
  trend: { month: string; amount: number }[];
}

interface ComplianceStats {
  totalRecords: number;
  byType: Record<ComplianceType, number>;
  byStatus: Record<ComplianceStatus, number>;
  nonCompliantCount: number;
}

interface VendorDashboardProps {
  organizationId: string;
  initialVendors: Vendor[];
  vendorStats: VendorStats;
  initialContracts: VendorContract[];
  contractStats: ContractStats;
  expiringContracts: VendorContract[];
  renewalAlerts: VendorContract[];
  initialPerformanceReviews: VendorPerformance[];
  performanceStats: PerformanceStats;
  topPerformers: Performer[];
  spendStats: SpendStats;
  initialComplianceRecords: VendorCompliance[];
  complianceStats: ComplianceStats;
  nonCompliant: VendorCompliance[];
  expiringCompliance: VendorCompliance[];
}

// ── Helpers ──

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  preferred: 'accent',
  blocked: 'danger',
  expired: 'danger',
  pending: 'warning',
  terminated: 'default',
  renewal: 'warning',
  compliant: 'success',
  non_compliant: 'danger',
};

function formatDate(d: Date | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function formatCurrency(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function ratingStars(rating: number): string {
  const rounded = Math.round(rating);
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

// ── Component ──

export function VendorDashboard({
  organizationId: _organizationId,
  initialVendors,
  vendorStats,
  initialContracts,
  contractStats,
  expiringContracts,
  renewalAlerts,
  initialPerformanceReviews,
  performanceStats,
  topPerformers,
  spendStats,
  initialComplianceRecords,
  complianceStats,
  nonCompliant,
  expiringCompliance,
}: VendorDashboardProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const v of initialVendors) set.add(v.category);
    return Array.from(set).sort();
  }, [initialVendors]);

  const filteredVendors = useMemo(() => {
    let list = initialVendors;
    if (categoryFilter) {
      list = list.filter((v) => v.category === categoryFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.contactName.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q),
      );
    }
    return list;
  }, [initialVendors, search, categoryFilter]);

  const selectedVendor = useMemo(
    () => initialVendors.find((v) => v.id === selectedVendorId) || null,
    [initialVendors, selectedVendorId],
  );

  const vendorContracts = useMemo(
    () => (selectedVendorId ? initialContracts.filter((c) => c.vendorId === selectedVendorId) : []),
    [initialContracts, selectedVendorId],
  );

  const vendorPerformance = useMemo(
    () => (selectedVendorId ? initialPerformanceReviews.filter((p) => p.vendorId === selectedVendorId) : []),
    [initialPerformanceReviews, selectedVendorId],
  );

  const vendorCompliance = useMemo(
    () => (selectedVendorId ? initialComplianceRecords.filter((c) => c.vendorId === selectedVendorId) : []),
    [initialComplianceRecords, selectedVendorId],
  );

  const vendorSpendTotal = useMemo(() => {
    if (!selectedVendorId) return 0;
    return spendStats.byVendor[selectedVendorId] || 0;
  }, [spendStats.byVendor, selectedVendorId]);

  const handleSelectVendor = useCallback((id: string) => {
    setSelectedVendorId(id);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedVendorId(null);
  }, []);

  const maxSpend = useMemo(() => {
    const vals = Object.values(spendStats.byCategory);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [spendStats.byCategory]);

  const maxTrend = useMemo(() => {
    const vals = spendStats.trend.map((t) => t.amount);
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [spendStats.trend]);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Total Vendors</span>
          </div>
          <div className="heading-display text-2xl">{vendorStats.totalVendors}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Active Contracts</span>
          </div>
          <div className="heading-display text-2xl">{vendorStats.activeContracts}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-fg-secondary">Total Spend</span>
          </div>
          <div className="heading-display text-2xl">{formatCurrency(vendorStats.totalSpend)}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-danger" />
            <span className="text-xs text-fg-secondary">Non-Compliant</span>
          </div>
          <div className="heading-display text-2xl">{complianceStats.nonCompliantCount}</div>
        </Card>
      </div>

      {/* Alerts Row */}
      {(expiringContracts.length > 0 || renewalAlerts.length > 0 || nonCompliant.length > 0 || expiringCompliance.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {expiringContracts.length > 0 && (
            <Card className="p-4 border-l-4" style={{ borderLeftColor: 'var(--c-warning)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Expiring Contracts ({expiringContracts.length})</span>
              </div>
              <div className="space-y-1">
                {expiringContracts.slice(0, 5).map((c) => (
                  <div key={c.id} className="text-xs text-fg-secondary">
                    {c.title} — expires {formatDate(c.endDate)}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {nonCompliant.length > 0 && (
            <Card className="p-4 border-l-4" style={{ borderLeftColor: 'var(--c-danger)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-danger" />
                <span className="text-sm font-medium">Compliance Issues ({nonCompliant.length})</span>
              </div>
              <div className="space-y-1">
                {nonCompliant.slice(0, 5).map((r) => (
                  <div key={r.id} className="text-xs text-fg-secondary">
                    {r.name} — {r.status.replace('_', ' ')}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vendor List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="heading-display text-lg">Vendors</h2>
              <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            <div className="space-y-2 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-9 w-full"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="input w-full"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {showCreate && (
              <CreateVendorForm
                onClose={() => setShowCreate(false)}
                onCreated={() => setShowCreate(false)}
              />
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredVendors.length === 0 ? (
                <EmptyState
                  icon={Building2}
                  title="No vendors"
                  description="Add a vendor to get started."
                />
              ) : (
                filteredVendors.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleSelectVendor(v.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedVendorId === v.id
                        ? 'border-accent-primary bg-accent-primary/5'
                        : 'border-border hover:bg-surface-alt'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{v.name}</span>
                      <Badge variant={statusVariant[v.status] || 'default'}>{v.status}</Badge>
                    </div>
                    <div className="text-xs text-fg-secondary truncate">{v.category}</div>
                  </button>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Detail / Panels */}
        <div className="lg:col-span-2 space-y-4">
          {selectedVendor ? (
            <VendorDetailPanel
              vendor={selectedVendor}
              contracts={vendorContracts}
              performance={vendorPerformance}
              compliance={vendorCompliance}
              spendTotal={vendorSpendTotal}
              onClose={handleCloseDetail}
            />
          ) : (
            <>
              {/* Contract Management Panel */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-accent-primary" />
                  <h2 className="heading-display text-lg">Contracts</h2>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-fg-secondary">Total</div>
                    <div className="heading-display text-xl">{contractStats.totalContracts}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Total Value</div>
                    <div className="heading-display text-xl">{formatCurrency(contractStats.totalValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Expiring</div>
                    <div className="heading-display text-xl">{contractStats.expiringCount}</div>
                  </div>
                </div>
                {renewalAlerts.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-warning mb-2">Renewal Alerts</div>
                    <div className="space-y-1">
                      {renewalAlerts.slice(0, 5).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                          <span className="truncate">{c.title}</span>
                          <Badge variant="warning">{c.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {initialContracts.length === 0 ? (
                  <EmptyState icon={FileText} title="No contracts" description="Contracts will appear here." />
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {initialContracts.slice(0, 10).map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded border border-border">
                        <span className="truncate">{c.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-fg-muted">{formatCurrency(c.value, c.currency)}</span>
                          <Badge variant={statusVariant[c.status] || 'default'}>{c.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Performance Panel */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-accent-primary" />
                  <h2 className="heading-display text-lg">Performance</h2>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-fg-secondary">Reviews</div>
                    <div className="heading-display text-xl">{performanceStats.totalReviews}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Avg Rating</div>
                    <div className="heading-display text-xl">{performanceStats.avgRating.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Avg Score</div>
                    <div className="heading-display text-xl">{performanceStats.avgOverallScore.toFixed(1)}</div>
                  </div>
                </div>
                {topPerformers.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-2">Top Performers</div>
                    <div className="space-y-1">
                      {topPerformers.slice(0, 5).map((p) => (
                        <div key={p.vendorId} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                          <span className="truncate">{p.vendorId}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-fg-muted">{p.reviewCount} reviews</span>
                            <Badge variant="success">{p.avgScore.toFixed(1)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Spend Analysis Panel */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-5 w-5 text-accent-primary" />
                  <h2 className="heading-display text-lg">Spend Analysis</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-fg-secondary">Total Spend</div>
                    <div className="heading-display text-xl">{formatCurrency(spendStats.totalSpend)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Categories</div>
                    <div className="heading-display text-xl">{Object.keys(spendStats.byCategory).length}</div>
                  </div>
                </div>
                {Object.keys(spendStats.byCategory).length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium mb-2">By Category</div>
                    <div className="space-y-2">
                      {Object.entries(spendStats.byCategory)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([cat, amt]) => (
                          <div key={cat}>
                            <div className="flex justify-between text-xs mb-1">
                              <span>{cat}</span>
                              <span className="text-fg-muted">{formatCurrency(amt)}</span>
                            </div>
                            <div className="h-2 rounded bg-surface-alt overflow-hidden">
                              <div
                                className="h-full bg-accent-primary"
                                style={{ width: `${maxSpend > 0 ? (amt / maxSpend) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
                {spendStats.trend.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Monthly Trend
                    </div>
                    <div className="flex items-end gap-1 h-24">
                      {spendStats.trend.slice(-12).map((t) => (
                        <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-accent-primary/70 rounded-t"
                            style={{ height: `${maxTrend > 0 ? (t.amount / maxTrend) * 100 : 0}%`, minHeight: '2px' }}
                            title={formatCurrency(t.amount)}
                          />
                          <span className="text-[10px] text-fg-muted">{t.month.slice(5)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Compliance Panel */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-5 w-5 text-accent-primary" />
                  <h2 className="heading-display text-lg">Compliance</h2>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div>
                    <div className="text-xs text-fg-secondary">Records</div>
                    <div className="heading-display text-xl">{complianceStats.totalRecords}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Non-Compliant</div>
                    <div className="heading-display text-xl text-danger">{complianceStats.nonCompliantCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-fg-secondary">Expiring</div>
                    <div className="heading-display text-xl">{expiringCompliance.length}</div>
                  </div>
                </div>
                {expiringCompliance.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-warning mb-2">Expiring Documents</div>
                    <div className="space-y-1">
                      {expiringCompliance.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded bg-surface-alt">
                          <span className="truncate">{r.name}</span>
                          <span className="text-fg-muted">{formatDate(r.expiryDate)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {initialComplianceRecords.length === 0 ? (
                  <EmptyState icon={Shield} title="No compliance records" description="Compliance records will appear here." />
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {initialComplianceRecords.slice(0, 10).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded border border-border">
                        <span className="truncate">{r.name}</span>
                        <Badge variant={statusVariant[r.status] || 'default'}>{r.status.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vendor Detail Panel ──

function VendorDetailPanel({
  vendor,
  contracts,
  performance,
  compliance,
  spendTotal,
  onClose,
}: {
  vendor: Vendor;
  contracts: VendorContract[];
  performance: VendorPerformance[];
  compliance: VendorCompliance[];
  spendTotal: number;
  onClose: () => void;
}) {
  const avgRating = performance.length > 0
    ? performance.reduce((a, p) => a + p.rating, 0) / performance.length
    : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-accent-primary" />
            <h2 className="heading-display text-lg">{vendor.name}</h2>
            <Badge variant={statusVariant[vendor.status] || 'default'}>{vendor.status}</Badge>
          </div>
          <div className="text-xs text-fg-secondary">{vendor.category}</div>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-alt">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        {vendor.contactName && (
          <div className="flex items-center gap-2"><Building2 className="h-3 w-3 text-fg-muted" /> {vendor.contactName}</div>
        )}
        {vendor.email && (
          <div className="flex items-center gap-2"><Mail className="h-3 w-3 text-fg-muted" /> {vendor.email}</div>
        )}
        {vendor.phone && (
          <div className="flex items-center gap-2"><Phone className="h-3 w-3 text-fg-muted" /> {vendor.phone}</div>
        )}
        {vendor.website && (
          <div className="flex items-center gap-2"><Globe className="h-3 w-3 text-fg-muted" /> {vendor.website}</div>
        )}
        {vendor.address && (
          <div className="flex items-center gap-2"><MapPin className="h-3 w-3 text-fg-muted" /> {vendor.address}</div>
        )}
        {vendor.paymentTerms && (
          <div className="flex items-center gap-2"><DollarSign className="h-3 w-3 text-fg-muted" /> {vendor.paymentTerms}</div>
        )}
      </div>

      {vendor.notes && (
        <div className="mb-4 p-3 rounded bg-surface-alt text-xs">
          <div className="text-fg-secondary mb-1">Notes</div>
          {vendor.notes}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-2 rounded border border-border">
          <div className="text-xs text-fg-secondary">Contracts</div>
          <div className="heading-display text-lg">{contracts.length}</div>
        </div>
        <div className="p-2 rounded border border-border">
          <div className="text-xs text-fg-secondary">Total Spend</div>
          <div className="heading-display text-lg">{formatCurrency(spendTotal)}</div>
        </div>
        <div className="p-2 rounded border border-border">
          <div className="text-xs text-fg-secondary">Avg Rating</div>
          <div className="heading-display text-lg">{avgRating.toFixed(1)} {ratingStars(avgRating)}</div>
        </div>
      </div>

      {/* Contracts */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Contracts</div>
        {contracts.length === 0 ? (
          <div className="text-xs text-fg-secondary">No contracts.</div>
        ) : (
          <div className="space-y-1">
            {contracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded border border-border">
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-fg-muted">{c.contractType} · {formatDate(c.startDate)} → {formatDate(c.endDate)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-fg-muted">{formatCurrency(c.value, c.currency)}</span>
                  <Badge variant={statusVariant[c.status] || 'default'}>{c.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance */}
      <div className="mb-4">
        <div className="text-sm font-medium mb-2">Performance Reviews</div>
        {performance.length === 0 ? (
          <div className="text-xs text-fg-secondary">No reviews.</div>
        ) : (
          <div className="space-y-1">
            {performance.map((p) => (
              <div key={p.id} className="text-xs p-2 rounded border border-border">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{ratingStars(p.rating)} ({p.rating}/5)</span>
                  <span className="text-fg-muted">{formatDate(p.reviewDate)}</span>
                </div>
                <div className="text-fg-muted">
                  Quality: {p.qualityScore} · Delivery: {p.deliveryScore} · Cost: {p.costScore} · Service: {p.serviceScore}
                </div>
                {p.comments && <div className="mt-1">{p.comments}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compliance */}
      <div>
        <div className="text-sm font-medium mb-2">Compliance</div>
        {compliance.length === 0 ? (
          <div className="text-xs text-fg-secondary">No compliance records.</div>
        ) : (
          <div className="space-y-1">
            {compliance.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs p-2 rounded border border-border">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-fg-muted">{r.type} · expires {formatDate(r.expiryDate)}</div>
                </div>
                <Badge variant={statusVariant[r.status] || 'default'}>
                  {r.status === 'compliant' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {r.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Create Vendor Form ──

function CreateVendorForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, contactName, email, phone }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create vendor');
      }
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vendor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-3 p-3 rounded border border-border space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">New Vendor</span>
        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-surface-alt">
          <X className="h-3 w-3" />
        </button>
      </div>
      <input
        type="text"
        placeholder="Name *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="input w-full text-sm"
      />
      <input
        type="text"
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="input w-full text-sm"
      />
      <input
        type="text"
        placeholder="Contact name"
        value={contactName}
        onChange={(e) => setContactName(e.target.value)}
        className="input w-full text-sm"
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input w-full text-sm"
      />
      <input
        type="text"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="input w-full text-sm"
      />
      {error && <div className="text-xs text-danger">{error}</div>}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </Button>
    </form>
  );
}
