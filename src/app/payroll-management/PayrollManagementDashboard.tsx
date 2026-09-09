'use client';

import { useState } from 'react';
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Plus,
  CheckCircle,
  Banknote,
  FileText,
  BarChart3,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface PayrollRecord {
  id: string;
  employeeName: string;
  employeeId: string | null;
  period: string;
  grossAmount: number;
  taxWithheld: number;
  netAmount: number;
  benefits: number;
  deductions: number;
  status: string;
  payDate: Date | string | null;
  currency: string;
}

interface PayrollRun {
  id: string;
  period?: string;
  status?: string;
  createdAt: Date | string;
}

interface PayrollStats {
  total: number;
  byStatus: Record<string, number>;
  totalGross: number;
  totalNet: number;
}

interface PayrollSummary {
  totalRecords: number;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  totalBenefits: number;
  totalDeductions: number;
}

type Tab = 'overview' | 'runs' | 'records' | 'summary';

const tabs: Array<{ id: Tab; label: string; icon: typeof Wallet }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'runs', label: 'Payroll Runs', icon: FileText },
  { id: 'records', label: 'Records', icon: DollarSign },
  { id: 'summary', label: 'Summary', icon: TrendingUp },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  draft: 'default',
  approved: 'info',
  paid: 'success',
  pending: 'warning',
  processed: 'accent',
  failed: 'danger',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

function formatDate(value: Date | string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PayrollManagementDashboard({
  organizationId,
  records,
  runs,
  stats,
  summary,
}: {
  organizationId: string;
  records: PayrollRecord[];
  runs: PayrollRun[];
  stats: PayrollStats;
  summary: PayrollSummary;
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [showCreateRecord, setShowCreateRecord] = useState(false);
  const [showCreateRun, setShowCreateRun] = useState(false);

  // Create record form state
  const [recEmployeeName, setRecEmployeeName] = useState('');
  const [recPeriod, setRecPeriod] = useState('');
  const [recGross, setRecGross] = useState('');
  const [recTax, setRecTax] = useState('');
  const [recDeductions, setRecDeductions] = useState('');
  const [recBenefits, setRecBenefits] = useState('');
  const [recCreating, setRecCreating] = useState(false);

  // Create run form state
  const [runPeriod, setRunPeriod] = useState('');
  const [runCreating, setRunCreating] = useState(false);

  async function handleCreateRecord() {
    if (!recEmployeeName || !recPeriod || !recGross) return;
    setRecCreating(true);
    try {
      await fetch('/api/payroll-management', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          employeeName: recEmployeeName,
          period: recPeriod,
          grossAmount: Number(recGross),
          taxWithheld: recTax ? Number(recTax) : undefined,
          deductions: recDeductions ? Number(recDeductions) : undefined,
          benefits: recBenefits ? Number(recBenefits) : undefined,
        }),
      });
      setShowCreateRecord(false);
      setRecEmployeeName('');
      setRecPeriod('');
      setRecGross('');
      setRecTax('');
      setRecDeductions('');
      setRecBenefits('');
      window.location.reload();
    } finally {
      setRecCreating(false);
    }
  }

  async function handleCreateRun() {
    if (!runPeriod) return;
    setRunCreating(true);
    try {
      await fetch('/api/payroll-management/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, period: runPeriod }),
      });
      setShowCreateRun(false);
      setRunPeriod('');
      window.location.reload();
    } finally {
      setRunCreating(false);
    }
  }

  async function handleAction(id: string, action: 'approve' | 'pay') {
    await fetch(`/api/payroll-management/${id}/${action}`, { method: 'POST' });
    window.location.reload();
  }

  async function handleFinalizeRun(id: string) {
    await fetch(`/api/payroll-management/runs/${id}/finalize?organizationId=${organizationId}`, { method: 'POST' });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-fg-muted/20 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                tab === t.id ? 'bg-accent text-accent-fg' : 'text-fg-secondary hover:bg-fg-muted/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-fg-secondary">
                <FileText className="h-4 w-4" /> Total Records
              </div>
              <div className="mt-2 text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-fg-secondary">
                <DollarSign className="h-4 w-4" /> Total Gross
              </div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(stats.totalGross)}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-fg-secondary">
                <Banknote className="h-4 w-4" /> Total Net
              </div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(stats.totalNet)}</div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-xs text-fg-secondary">
                <TrendingUp className="h-4 w-4" /> Payroll Runs
              </div>
              <div className="mt-2 text-2xl font-semibold">{runs.length}</div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">Records by Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byStatus).length === 0 && (
                <span className="text-xs text-fg-secondary">No records yet.</span>
              )}
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant[status] ?? 'default'}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Payroll Runs Tab */}
      {tab === 'runs' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateRun(!showCreateRun)} variant="primary">
              <Plus className="mr-1 h-4 w-4" /> New Run
            </Button>
          </div>

          {showCreateRun && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Create Payroll Run</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  className="input"
                  placeholder="Period (YYYY-MM)"
                  value={runPeriod}
                  onChange={(e) => setRunPeriod(e.target.value)}
                />
                <Button onClick={handleCreateRun} variant="primary" disabled={runCreating || !runPeriod}>
                  {runCreating ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </Card>
          )}

          {runs.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={FileText} title="No payroll runs" description="Create a payroll run to get started." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-fg-muted/20 text-left text-xs text-fg-secondary">
                  <tr>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-fg-muted/10">
                      <td className="px-4 py-2">{run.period ?? '—'}</td>
                      <td className="px-4 py-2">
                        <Badge variant={run.status === 'finalized' ? 'success' : 'info'}>
                          {run.status ?? 'open'}
                        </Badge>
                      </td>
                      <td className="px-4 py-2">{formatDate(run.createdAt)}</td>
                      <td className="px-4 py-2">
                        {run.status !== 'finalized' && (
                          <Button onClick={() => handleFinalizeRun(run.id)} variant="secondary">
                            Finalize
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Records Tab */}
      {tab === 'records' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCreateRecord(!showCreateRecord)} variant="primary">
              <Plus className="mr-1 h-4 w-4" /> New Record
            </Button>
          </div>

          {showCreateRecord && (
            <Card className="p-4">
              <h3 className="mb-3 text-sm font-medium">Add Payroll Record</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <input className="input" placeholder="Employee Name" value={recEmployeeName} onChange={(e) => setRecEmployeeName(e.target.value)} />
                <input className="input" placeholder="Period (YYYY-MM)" value={recPeriod} onChange={(e) => setRecPeriod(e.target.value)} />
                <input className="input" type="number" placeholder="Gross Amount" value={recGross} onChange={(e) => setRecGross(e.target.value)} />
                <input className="input" type="number" placeholder="Tax Withheld" value={recTax} onChange={(e) => setRecTax(e.target.value)} />
                <input className="input" type="number" placeholder="Deductions" value={recDeductions} onChange={(e) => setRecDeductions(e.target.value)} />
                <input className="input" type="number" placeholder="Benefits" value={recBenefits} onChange={(e) => setRecBenefits(e.target.value)} />
              </div>
              <div className="mt-3">
                <Button onClick={handleCreateRecord} variant="primary" disabled={recCreating || !recEmployeeName || !recPeriod || !recGross}>
                  {recCreating ? 'Creating…' : 'Add Record'}
                </Button>
              </div>
            </Card>
          )}

          {records.length === 0 ? (
            <Card className="p-8">
              <EmptyState icon={DollarSign} title="No payroll records" description="Add a payroll record to get started." />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-fg-muted/20 text-left text-xs text-fg-secondary">
                  <tr>
                    <th className="px-4 py-2">Employee</th>
                    <th className="px-4 py-2">Period</th>
                    <th className="px-4 py-2">Gross</th>
                    <th className="px-4 py-2">Net</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Pay Date</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id} className="border-b border-fg-muted/10">
                      <td className="px-4 py-2">{rec.employeeName}</td>
                      <td className="px-4 py-2">{rec.period}</td>
                      <td className="px-4 py-2">{formatCurrency(rec.grossAmount)}</td>
                      <td className="px-4 py-2">{formatCurrency(rec.netAmount)}</td>
                      <td className="px-4 py-2">
                        <Badge variant={statusVariant[rec.status] ?? 'default'}>{rec.status}</Badge>
                      </td>
                      <td className="px-4 py-2">{formatDate(rec.payDate)}</td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          {rec.status === 'draft' && (
                            <Button onClick={() => handleAction(rec.id, 'approve')} variant="secondary">
                              <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                            </Button>
                          )}
                          {(rec.status === 'approved' || rec.status === 'draft') && (
                            <Button onClick={() => handleAction(rec.id, 'pay')} variant="primary">
                              <Banknote className="mr-1 h-3.5 w-3.5" /> Pay
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Records</div>
              <div className="mt-2 text-2xl font-semibold">{summary.totalRecords}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Gross</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalGross)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Net</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalNet)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Tax</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalTax)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Benefits</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalBenefits)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Deductions</div>
              <div className="mt-2 text-2xl font-semibold">{formatCurrency(summary.totalDeductions)}</div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
