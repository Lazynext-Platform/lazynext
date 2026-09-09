'use client';

import { useState, useCallback } from 'react';
import {
  Scale, FileText, Gavel, CheckCircle, Clock, AlertTriangle,
  Plus, X, Search, Shield,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

type ContractType =
  | 'nda' | 'employment' | 'vendor' | 'client' | 'partnership'
  | 'license' | 'lease' | 'service_agreement' | 'other';

type ContractStatus = 'draft' | 'active' | 'expired' | 'terminated' | 'under_review';
type MatterType = 'litigation' | 'transaction' | 'compliance' | 'ip' | 'employment' | 'regulatory' | 'other';
type MatterStatus = 'open' | 'in_progress' | 'closed' | 'on_hold';
type MatterPriority = 'low' | 'medium' | 'high' | 'urgent';
type ObligationType = 'payment' | 'delivery' | 'reporting' | 'compliance' | 'confidentiality' | 'non_compete' | 'other';
type ObligationStatus = 'pending' | 'fulfilled' | 'breached' | 'waived';

interface LegalContract {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  type: ContractType;
  partyName: string;
  partyType: 'individual' | 'company';
  effectiveDate: Date;
  endDate: Date | null;
  value: number | null;
  currency: string;
  status: ContractStatus;
  jurisdiction: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContractStats {
  totalContracts: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  activeCount: number;
  expiringCount: number;
  totalValue: number;
}

interface LegalMatter {
  id: string;
  organizationId: string;
  workspaceId: string;
  title: string;
  description: string;
  type: MatterType;
  status: MatterStatus;
  priority: MatterPriority;
  assignedTo: string | null;
  opposingParty: string;
  caseNumber: string;
  court: string;
  filedDate: Date | null;
  closedDate: Date | null;
  estimatedCost: number | null;
  actualCost: number | null;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MatterStats {
  totalMatters: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  openCount: number;
  totalEstimatedCost: number;
  totalActualCost: number;
}

interface LegalObligation {
  id: string;
  organizationId: string;
  workspaceId: string;
  contractId: string | null;
  matterId: string | null;
  title: string;
  description: string;
  type: ObligationType;
  dueDate: Date | null;
  status: ObligationStatus;
  responsibleParty: string;
  notes: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ObligationStats {
  totalObligations: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  overdueCount: number;
  upcomingCount: number;
}

interface LegalDashboardProps {
  organizationId: string;
  initialContracts: LegalContract[];
  initialContractStats: ContractStats;
  initialExpiringContracts: LegalContract[];
  initialExpiredContracts: LegalContract[];
  initialMatters: LegalMatter[];
  initialMatterStats: MatterStats;
  initialOpenMatters: LegalMatter[];
  initialObligations: LegalObligation[];
  initialObligationStats: ObligationStats;
  initialOverdueObligations: LegalObligation[];
  initialBreachedObligations: LegalObligation[];
  initialUpcomingObligations: LegalObligation[];
}

const contractStatusVariant: Record<ContractStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  active: 'success',
  expired: 'warning',
  terminated: 'danger',
  under_review: 'info',
};

const matterStatusVariant: Record<MatterStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'info',
  in_progress: 'warning',
  closed: 'success',
  on_hold: 'default',
};

const priorityVariant: Record<MatterPriority, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'success',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
};

const obligationStatusVariant: Record<ObligationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  pending: 'info',
  fulfilled: 'success',
  breached: 'danger',
  waived: 'default',
};

const contractTypes: ContractType[] = ['nda', 'employment', 'vendor', 'client', 'partnership', 'license', 'lease', 'service_agreement', 'other'];
const matterTypes: MatterType[] = ['litigation', 'transaction', 'compliance', 'ip', 'employment', 'regulatory', 'other'];
const obligationTypes: ObligationType[] = ['payment', 'delivery', 'reporting', 'compliance', 'confidentiality', 'non_compete', 'other'];
const priorities: MatterPriority[] = ['low', 'medium', 'high', 'urgent'];

export function LegalDashboard({
  organizationId: _organizationId,
  initialContracts,
  initialContractStats,
  initialExpiringContracts,
  initialExpiredContracts,
  initialMatters,
  initialMatterStats,
  initialOpenMatters,
  initialObligations,
  initialObligationStats,
  initialOverdueObligations,
  initialBreachedObligations,
  initialUpcomingObligations,
}: LegalDashboardProps) {
  const [contracts, setContracts] = useState<LegalContract[]>(initialContracts);
  const [contractStats] = useState<ContractStats>(initialContractStats);
  const [expiringContracts] = useState<LegalContract[]>(initialExpiringContracts);
  const [expiredContracts] = useState<LegalContract[]>(initialExpiredContracts);
  const [matters, setMatters] = useState<LegalMatter[]>(initialMatters);
  const [matterStats] = useState<MatterStats>(initialMatterStats);
  const [openMatters] = useState<LegalMatter[]>(initialOpenMatters);
  const [obligations, setObligations] = useState<LegalObligation[]>(initialObligations);
  const [obligationStats] = useState<ObligationStats>(initialObligationStats);
  const [overdueObligations] = useState<LegalObligation[]>(initialOverdueObligations);
  const [breachedObligations] = useState<LegalObligation[]>(initialBreachedObligations);
  const [upcomingObligations] = useState<LegalObligation[]>(initialUpcomingObligations);

  const [activeTab, setActiveTab] = useState<'contracts' | 'matters' | 'obligations' | 'stats'>('contracts');
  const [showCreateForm, setShowCreateForm] = useState<'' | 'contract' | 'matter' | 'obligation'>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Contract form
  const [cTitle, setCTitle] = useState('');
  const [cType, setCType] = useState<ContractType>('nda');
  const [cPartyName, setCPartyName] = useState('');
  const [cEffectiveDate, setCEffectiveDate] = useState('');
  const [cEndDate, setCEndDate] = useState('');
  const [cValue, setCValue] = useState('');
  const [creating, setCreating] = useState(false);

  // Matter form
  const [mTitle, setMTitle] = useState('');
  const [mType, setMType] = useState<MatterType>('litigation');
  const [mPriority, setMPriority] = useState<MatterPriority>('medium');
  const [mOpposingParty, setMOpposingParty] = useState('');

  // Obligation form
  const [oTitle, setOTitle] = useState('');
  const [oType, setOType] = useState<ObligationType>('payment');
  const [oDueDate, setODueDate] = useState('');
  const [oResponsibleParty, setOResponsibleParty] = useState('');

  const handleCreateContract = useCallback(async () => {
    if (!cTitle.trim() || !cPartyName.trim() || !cEffectiveDate) return;
    setCreating(true);
    try {
      const res = await fetch('/api/legal/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: cTitle.trim(),
          type: cType,
          partyName: cPartyName.trim(),
          effectiveDate: cEffectiveDate,
          endDate: cEndDate || undefined,
          value: cValue ? Number(cValue) : undefined,
        }),
      });
      const data = await res.json();
      if (data.contract) {
        setContracts((prev) => [...prev, data.contract]);
        setShowCreateForm('');
        setCTitle(''); setCPartyName(''); setCEffectiveDate(''); setCEndDate(''); setCValue('');
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  }, [cTitle, cType, cPartyName, cEffectiveDate, cEndDate, cValue]);

  const handleCreateMatter = useCallback(async () => {
    if (!mTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/legal/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mTitle.trim(),
          type: mType,
          priority: mPriority,
          opposingParty: mOpposingParty || undefined,
        }),
      });
      const data = await res.json();
      if (data.matter) {
        setMatters((prev) => [...prev, data.matter]);
        setShowCreateForm('');
        setMTitle(''); setMOpposingParty('');
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  }, [mTitle, mType, mPriority, mOpposingParty]);

  const handleCreateObligation = useCallback(async () => {
    if (!oTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/legal/obligations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: oTitle.trim(),
          type: oType,
          dueDate: oDueDate || undefined,
          responsibleParty: oResponsibleParty || undefined,
        }),
      });
      const data = await res.json();
      if (data.obligation) {
        setObligations((prev) => [...prev, data.obligation]);
        setShowCreateForm('');
        setOTitle(''); setODueDate(''); setOResponsibleParty('');
      }
    } catch { /* ignore */ } finally {
      setCreating(false);
    }
  }, [oTitle, oType, oDueDate, oResponsibleParty]);

  async function handleContractStatusChange(id: string, status: ContractStatus) {
    try {
      const res = await fetch(`/api/legal/contracts/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.contract) {
        setContracts((prev) => prev.map((c) => (c.id === id ? data.contract : c)));
      }
    } catch { /* ignore */ }
  }

  async function handleMatterStatusChange(id: string, status: MatterStatus) {
    try {
      const res = await fetch(`/api/legal/matters/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.matter) {
        setMatters((prev) => prev.map((m) => (m.id === id ? data.matter : m)));
      }
    } catch { /* ignore */ }
  }

  async function handleObligationStatusChange(id: string, status: ObligationStatus) {
    try {
      const res = await fetch(`/api/legal/obligations/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.obligation) {
        setObligations((prev) => prev.map((o) => (o.id === id ? data.obligation : o)));
      }
    } catch { /* ignore */ }
  }

  const filteredContracts = contracts.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(q) || c.partyName.toLowerCase().includes(q);
  });

  const filteredMatters = matters.filter((m) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.title.toLowerCase().includes(q) || m.opposingParty.toLowerCase().includes(q) || m.caseNumber.toLowerCase().includes(q);
  });

  const filteredObligations = obligations.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return o.title.toLowerCase().includes(q) || o.responsibleParty.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <FileText className="h-3 w-3" /> Contracts
          </div>
          <div className="text-xl font-bold">{contractStats.totalContracts}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <CheckCircle className="h-3 w-3" /> Active
          </div>
          <div className="text-xl font-bold text-success">{contractStats.activeCount}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <Clock className="h-3 w-3" /> Expiring
          </div>
          <div className="text-xl font-bold text-warning">{contractStats.expiringCount}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <Gavel className="h-3 w-3" /> Matters
          </div>
          <div className="text-xl font-bold">{matterStats.totalMatters}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <AlertTriangle className="h-3 w-3" /> Overdue Obl.
          </div>
          <div className="text-xl font-bold text-danger">{obligationStats.overdueCount}</div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
            <Shield className="h-3 w-3" /> Breached
          </div>
          <div className="text-xl font-bold text-danger">{obligationStats.byStatus.breached ?? 0}</div>
        </Card>
      </div>

      {/* Tab Bar + Create buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          {([
            ['contracts', 'Contracts'],
            ['matters', 'Legal Matters'],
            ['obligations', 'Obligations'],
            ['stats', 'Stats'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 text-sm rounded-lg ${activeTab === key ? 'bg-accent-primary text-white' : 'text-fg-secondary hover:bg-fg-muted/10'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => setShowCreateForm(showCreateForm === 'contract' ? '' : 'contract')}>
            {showCreateForm === 'contract' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Contract
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCreateForm(showCreateForm === 'matter' ? '' : 'matter')}>
            {showCreateForm === 'matter' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Matter
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCreateForm(showCreateForm === 'obligation' ? '' : 'obligation')}>
            {showCreateForm === 'obligation' ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} Obligation
          </Button>
        </div>
      </div>

      {/* Create Contract Form */}
      {showCreateForm === 'contract' && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-primary" /> Create Contract
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Title</label>
              <input type="text" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Contract title" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Type</label>
              <select value={cType} onChange={(e) => setCType(e.target.value as ContractType)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent">
                {contractTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Party Name</label>
              <input type="text" value={cPartyName} onChange={(e) => setCPartyName(e.target.value)} placeholder="Counterparty" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Value</label>
              <input type="number" value={cValue} onChange={(e) => setCValue(e.target.value)} placeholder="Contract value" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Effective Date</label>
              <input type="date" value={cEffectiveDate} onChange={(e) => setCEffectiveDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">End Date</label>
              <input type="date" value={cEndDate} onChange={(e) => setCEndDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleCreateContract} disabled={creating || !cTitle.trim() || !cPartyName.trim() || !cEffectiveDate}>
              {creating ? 'Creating...' : 'Create Contract'}
            </Button>
          </div>
        </Card>
      )}

      {/* Create Matter Form */}
      {showCreateForm === 'matter' && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-primary" /> Create Legal Matter
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Title</label>
              <input type="text" value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Matter title" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Type</label>
              <select value={mType} onChange={(e) => setMType(e.target.value as MatterType)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent">
                {matterTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Priority</label>
              <select value={mPriority} onChange={(e) => setMPriority(e.target.value as MatterPriority)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent">
                {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Opposing Party</label>
              <input type="text" value={mOpposingParty} onChange={(e) => setMOpposingParty(e.target.value)} placeholder="Opposing party" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleCreateMatter} disabled={creating || !mTitle.trim()}>
              {creating ? 'Creating...' : 'Create Matter'}
            </Button>
          </div>
        </Card>
      )}

      {/* Create Obligation Form */}
      {showCreateForm === 'obligation' && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent-primary" /> Create Obligation
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Title</label>
              <input type="text" value={oTitle} onChange={(e) => setOTitle(e.target.value)} placeholder="Obligation title" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Type</label>
              <select value={oType} onChange={(e) => setOType(e.target.value as ObligationType)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent">
                {obligationTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Due Date</label>
              <input type="date" value={oDueDate} onChange={(e) => setODueDate(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Responsible Party</label>
              <input type="text" value={oResponsibleParty} onChange={(e) => setOResponsibleParty(e.target.value)} placeholder="Responsible party" className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={handleCreateObligation} disabled={creating || !oTitle.trim()}>
              {creating ? 'Creating...' : 'Create Obligation'}
            </Button>
          </div>
        </Card>
      )}

      {/* Search */}
      {activeTab !== 'stats' && (
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-7 pr-3 py-1.5 text-sm border rounded-lg bg-transparent"
          />
        </div>
      )}

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {/* Expiring & Expired panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Expiring Soon
                <Badge variant="warning" className="text-xs">{expiringContracts.length}</Badge>
              </h3>
              <div className="space-y-1">
                {expiringContracts.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-4">No expiring contracts.</div>
                ) : (
                  expiringContracts.map((c) => (
                    <div key={c.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-fg-secondary">{c.partyName} — ends {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-danger" /> Expired
                <Badge variant="danger" className="text-xs">{expiredContracts.length}</Badge>
              </h3>
              <div className="space-y-1">
                {expiredContracts.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-4">No expired contracts.</div>
                ) : (
                  expiredContracts.map((c) => (
                    <div key={c.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{c.title}</div>
                      <div className="text-fg-secondary">{c.partyName} — ended {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Contract list */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent-primary" /> All Contracts
            </h3>
            {filteredContracts.length === 0 ? (
              <div className="text-sm text-fg-secondary text-center py-8">No contracts found.</div>
            ) : (
              filteredContracts.map((c) => (
                <div key={c.id} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{c.title}</span>
                        <Badge variant={contractStatusVariant[c.status]} className="text-xs">{c.status}</Badge>
                        <Badge variant="default" className="text-xs">{c.type}</Badge>
                      </div>
                      <div className="text-xs text-fg-secondary mt-1">
                        {c.partyName} · Effective: {new Date(c.effectiveDate).toLocaleDateString()}
                        {c.endDate && ` → ${new Date(c.endDate).toLocaleDateString()}`}
                      </div>
                      {c.value !== null && <div className="text-xs text-fg-muted">Value: {c.currency} {c.value.toLocaleString()}</div>}
                    </div>
                    <select
                      value={c.status}
                      onChange={(e) => handleContractStatusChange(c.id, e.target.value as ContractStatus)}
                      className="px-2 py-0.5 text-xs border rounded bg-transparent"
                    >
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="under_review">under_review</option>
                      <option value="expired">expired</option>
                      <option value="terminated">terminated</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* Matters Tab */}
      {activeTab === 'matters' && (
        <div className="space-y-4">
          {/* Open matters panel */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Gavel className="h-4 w-4 text-accent-primary" /> Open Matters
              <Badge variant="info" className="text-xs">{openMatters.length}</Badge>
            </h3>
            <div className="space-y-1">
              {openMatters.length === 0 ? (
                <div className="text-sm text-fg-secondary text-center py-4">No open matters.</div>
              ) : (
                openMatters.slice(0, 5).map((m) => (
                  <div key={m.id} className="text-xs border rounded-lg p-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{m.title}</span>
                      {m.opposingParty && <span className="text-fg-secondary"> vs {m.opposingParty}</span>}
                    </div>
                    <Badge variant={priorityVariant[m.priority]} className="text-xs">{m.priority}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* All matters */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Scale className="h-4 w-4 text-accent-primary" /> All Matters
            </h3>
            {filteredMatters.length === 0 ? (
              <div className="text-sm text-fg-secondary text-center py-8">No matters found.</div>
            ) : (
              filteredMatters.map((m) => (
                <div key={m.id} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{m.title}</span>
                        <Badge variant={matterStatusVariant[m.status]} className="text-xs">{m.status}</Badge>
                        <Badge variant={priorityVariant[m.priority]} className="text-xs">{m.priority}</Badge>
                        <Badge variant="default" className="text-xs">{m.type}</Badge>
                      </div>
                      {m.description && <div className="text-xs text-fg-secondary mt-1">{m.description}</div>}
                      <div className="text-xs text-fg-muted mt-1">
                        {m.opposingParty && `Opposing: ${m.opposingParty} · `}
                        {m.caseNumber && `Case: ${m.caseNumber} · `}
                        {m.assignedTo && `Assigned: ${m.assignedTo}`}
                      </div>
                      {(m.estimatedCost !== null || m.actualCost !== null) && (
                        <div className="text-xs text-fg-muted">
                          {m.estimatedCost !== null && `Est: $${m.estimatedCost.toLocaleString()}`}
                          {m.actualCost !== null && ` · Actual: $${m.actualCost.toLocaleString()}`}
                        </div>
                      )}
                    </div>
                    <select
                      value={m.status}
                      onChange={(e) => handleMatterStatusChange(m.id, e.target.value as MatterStatus)}
                      className="px-2 py-0.5 text-xs border rounded bg-transparent"
                    >
                      <option value="open">open</option>
                      <option value="in_progress">in_progress</option>
                      <option value="closed">closed</option>
                      <option value="on_hold">on_hold</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* Obligations Tab */}
      {activeTab === 'obligations' && (
        <div className="space-y-4">
          {/* Overdue & Breached panels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" /> Upcoming
                <Badge variant="info" className="text-xs">{upcomingObligations.length}</Badge>
              </h3>
              <div className="space-y-1">
                {upcomingObligations.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-4">None upcoming.</div>
                ) : (
                  upcomingObligations.slice(0, 5).map((o) => (
                    <div key={o.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-fg-secondary">Due: {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Overdue
                <Badge variant="warning" className="text-xs">{overdueObligations.length}</Badge>
              </h3>
              <div className="space-y-1">
                {overdueObligations.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-4">None overdue.</div>
                ) : (
                  overdueObligations.slice(0, 5).map((o) => (
                    <div key={o.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-fg-secondary">Was due: {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-danger" /> Breached
                <Badge variant="danger" className="text-xs">{breachedObligations.length}</Badge>
              </h3>
              <div className="space-y-1">
                {breachedObligations.length === 0 ? (
                  <div className="text-sm text-fg-secondary text-center py-4">None breached.</div>
                ) : (
                  breachedObligations.slice(0, 5).map((o) => (
                    <div key={o.id} className="text-xs border rounded-lg p-2">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-fg-secondary">{o.responsibleParty || 'Unassigned'}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* All obligations */}
          <Card className="p-4 space-y-2">
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent-primary" /> All Obligations
            </h3>
            {filteredObligations.length === 0 ? (
              <div className="text-sm text-fg-secondary text-center py-8">No obligations found.</div>
            ) : (
              filteredObligations.map((o) => (
                <div key={o.id} className="p-3 border rounded-lg space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{o.title}</span>
                        <Badge variant={obligationStatusVariant[o.status]} className="text-xs">{o.status}</Badge>
                        <Badge variant="default" className="text-xs">{o.type}</Badge>
                      </div>
                      {o.description && <div className="text-xs text-fg-secondary mt-1">{o.description}</div>}
                      <div className="text-xs text-fg-muted mt-1">
                        {o.dueDate && `Due: ${new Date(o.dueDate).toLocaleDateString()} · `}
                        {o.responsibleParty && `Responsible: ${o.responsibleParty}`}
                      </div>
                    </div>
                    <select
                      value={o.status}
                      onChange={(e) => handleObligationStatusChange(o.id, e.target.value as ObligationStatus)}
                      className="px-2 py-0.5 text-xs border rounded bg-transparent"
                    >
                      <option value="pending">pending</option>
                      <option value="fulfilled">fulfilled</option>
                      <option value="breached">breached</option>
                      <option value="waived">waived</option>
                    </select>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Contract Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Total" value={contractStats.totalContracts} />
              <StatBox label="Active" value={contractStats.activeCount} />
              <StatBox label="Expiring" value={contractStats.expiringCount} />
              <StatBox label="Total Value" value={contractStats.totalValue} />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Contracts by Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {contractTypes.map((t) => (
                <StatBox key={t} label={t} value={contractStats.byType[t] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Matter Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Total" value={matterStats.totalMatters} />
              <StatBox label="Open" value={matterStats.openCount} />
              <StatBox label="Est. Cost" value={matterStats.totalEstimatedCost} />
              <StatBox label="Actual Cost" value={matterStats.totalActualCost} />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Matters by Priority</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {priorities.map((p) => (
                <StatBox key={p} label={p} value={matterStats.byPriority[p] ?? 0} />
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Obligation Stats</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox label="Total" value={obligationStats.totalObligations} />
              <StatBox label="Overdue" value={obligationStats.overdueCount} />
              <StatBox label="Upcoming" value={obligationStats.upcomingCount} />
              <StatBox label="Breached" value={obligationStats.byStatus.breached ?? 0} />
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Obligations by Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {obligationTypes.map((t) => (
                <StatBox key={t} label={t} value={obligationStats.byType[t] ?? 0} />
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-lg p-2">
      <div className="text-xs text-fg-secondary">{label}</div>
      <div className="text-lg font-bold">{value.toLocaleString()}</div>
    </div>
  );
}
