'use client';

import { useState } from 'react';
import {
  Receipt,
  Calculator,
  CalendarClock,
  Percent,
  BarChart3,
  Plus,
  CheckCircle,
  DollarSign,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface TaxRecord {
  id: string;
  period: string;
  type: 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
  jurisdiction: string;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  status: 'calculated' | 'filed' | 'paid';
  filedAt: Date | null;
  paidAt: Date | null;
  notes: string;
  createdAt: Date;
}

interface TaxStats {
  totalCount: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalTaxAmount: number;
  totalTaxableAmount: number;
}

interface TaxObligation {
  id: string;
  period: string;
  type: 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
  jurisdiction: string;
  taxAmount: number;
  status: 'calculated' | 'filed' | 'paid';
  dueDate: Date | null;
}

interface TaxRateSetting {
  id: string;
  jurisdiction: string;
  type: 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
  rate: number;
  effectiveDate: string;
  notes: string;
}

interface FilingSchedule {
  id: string;
  jurisdiction: string;
  type: 'sales_tax' | 'income_tax' | 'payroll_tax' | 'vat' | 'gst';
  frequency: 'monthly' | 'quarterly' | 'annually';
  dueDay: number;
  notes: string;
}

type Tab = 'overview' | 'records' | 'calculations' | 'schedule' | 'rates';

const tabs: Array<{ id: Tab; label: string; icon: typeof Receipt }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'records', label: 'Tax Records', icon: Receipt },
  { id: 'calculations', label: 'Calculations', icon: Calculator },
  { id: 'schedule', label: 'Filing Schedule', icon: CalendarClock },
  { id: 'rates', label: 'Rates', icon: Percent },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  calculated: 'warning',
  filed: 'info',
  paid: 'success',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function TaxManagementDashboard({
  organizationId,
  records,
  stats,
  obligations,
  rates,
  schedules,
}: {
  organizationId: string;
  records: TaxRecord[];
  stats: TaxStats;
  obligations: TaxObligation[];
  rates: TaxRateSetting[];
  schedules: FilingSchedule[];
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const [calcAmount, setCalcAmount] = useState('');
  const [calcType, setCalcType] = useState('sales_tax');
  const [calcRate, setCalcRate] = useState('');
  const [calcResult, setCalcResult] = useState<{ amount: number; taxAmount: number; total: number; rate: number } | null>(null);
  const [calcError, setCalcError] = useState('');

  async function runCalculation() {
    setCalcError('');
    setCalcResult(null);
    const amount = Number(calcAmount);
    if (!amount) {
      setCalcError('Enter an amount');
      return;
    }
    try {
      const res = await fetch('/api/tax-management/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          amount,
          type: calcType,
          rate: calcRate ? Number(calcRate) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCalcError(data.error || 'Calculation failed');
        return;
      }
      setCalcResult(data.result);
    } catch {
      setCalcError('Request failed');
    }
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-fg-muted/20 pb-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? 'bg-accent-primary/10 text-accent-primary' : 'text-fg-secondary hover:bg-fg-muted/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Records</div>
              <div className="mt-1 text-2xl font-semibold">{stats.totalCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Taxable Amount</div>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(stats.totalTaxableAmount)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Tax Amount</div>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(stats.totalTaxAmount)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Pending Obligations</div>
              <div className="mt-1 text-2xl font-semibold">{obligations.length}</div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">By Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byStatus).length === 0 && (
                <span className="text-xs text-fg-secondary">No records yet</span>
              )}
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant[status] || 'default'}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">By Type</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byType).length === 0 && (
                <span className="text-xs text-fg-secondary">No records yet</span>
              )}
              {Object.entries(stats.byType).map(([type, count]) => (
                <Badge key={type} variant="info">{type}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">Upcoming Obligations</h3>
            {obligations.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No pending obligations" description="All tax records are paid." />
            ) : (
              <div className="space-y-2">
                {obligations.slice(0, 10).map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-lg border border-fg-muted/20 p-3">
                    <div>
                      <div className="text-sm font-medium">{o.period} · {o.type}</div>
                      <div className="text-xs text-fg-secondary">{o.jurisdiction || '—'}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(o.taxAmount)}</span>
                      <Badge variant={statusVariant[o.status] || 'default'}>{o.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'records' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Tax Records</h3>
            <Button variant="primary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Record
            </Button>
          </div>
          {records.length === 0 ? (
            <EmptyState icon={Receipt} title="No tax records" description="Create a tax record to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fg-muted/20 text-left text-xs text-fg-secondary">
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Jurisdiction</th>
                    <th className="pb-2 pr-4">Taxable</th>
                    <th className="pb-2 pr-4">Rate</th>
                    <th className="pb-2 pr-4">Tax</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-fg-muted/10">
                      <td className="py-2 pr-4">{r.period}</td>
                      <td className="py-2 pr-4">{r.type}</td>
                      <td className="py-2 pr-4">{r.jurisdiction || '—'}</td>
                      <td className="py-2 pr-4">{formatCurrency(r.taxableAmount)}</td>
                      <td className="py-2 pr-4">{r.taxRate}%</td>
                      <td className="py-2 pr-4">{formatCurrency(r.taxAmount)}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusVariant[r.status] || 'default'}>{r.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'calculations' && (
        <Card className="p-4">
          <h3 className="mb-4 text-sm font-medium">Tax Calculator</h3>
          <div className="grid max-w-md gap-3">
            <div>
              <label className="text-xs text-fg-secondary">Amount (USD)</label>
              <input
                type="number"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fg-muted/30 bg-transparent px-3 py-2 text-sm"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Tax Type</label>
              <select
                value={calcType}
                onChange={(e) => setCalcType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fg-muted/30 bg-transparent px-3 py-2 text-sm"
              >
                <option value="sales_tax">Sales Tax</option>
                <option value="income_tax">Income Tax</option>
                <option value="payroll_tax">Payroll Tax</option>
                <option value="vat">VAT</option>
                <option value="gst">GST</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-fg-secondary">Rate % (optional — uses default if blank)</label>
              <input
                type="number"
                value={calcRate}
                onChange={(e) => setCalcRate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fg-muted/30 bg-transparent px-3 py-2 text-sm"
                placeholder="8.5"
              />
            </div>
            {calcError && <div className="text-xs text-fg-danger">{calcError}</div>}
            <Button variant="primary" onClick={runCalculation} className="flex items-center gap-1">
              <Calculator className="h-4 w-4" /> Calculate
            </Button>
            {calcResult && (
              <div className="mt-2 rounded-lg border border-fg-muted/20 p-4 text-sm">
                <div className="flex justify-between"><span className="text-fg-secondary">Base amount</span><span>{formatCurrency(calcResult.amount)}</span></div>
                <div className="flex justify-between"><span className="text-fg-secondary">Tax ({calcResult.rate}%)</span><span>{formatCurrency(calcResult.taxAmount)}</span></div>
                <div className="mt-2 flex justify-between border-t border-fg-muted/20 pt-2 font-semibold"><span>Total</span><span>{formatCurrency(calcResult.total)}</span></div>
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'schedule' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Filing Schedules</h3>
            <Button variant="primary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Schedule
            </Button>
          </div>
          {schedules.length === 0 ? (
            <EmptyState icon={CalendarClock} title="No filing schedules" description="Create a filing schedule to track due dates." />
          ) : (
            <div className="space-y-2">
              {schedules.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-fg-muted/20 p-3">
                  <div>
                    <div className="text-sm font-medium">{s.jurisdiction} · {s.type}</div>
                    <div className="text-xs text-fg-secondary">{s.frequency} · due day {s.dueDay}</div>
                  </div>
                  <Badge variant="info">{s.frequency}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'rates' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Tax Rates</h3>
            <Button variant="primary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Rate
            </Button>
          </div>
          {rates.length === 0 ? (
            <EmptyState icon={Percent} title="No tax rates" description="Set tax rates for your jurisdictions." />
          ) : (
            <div className="space-y-2">
              {rates.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-fg-muted/20 p-3">
                  <div>
                    <div className="text-sm font-medium">{r.jurisdiction} · {r.type}</div>
                    <div className="text-xs text-fg-secondary">Effective: {r.effectiveDate}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{r.rate}%</span>
                    <DollarSign className="h-4 w-4 text-fg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
