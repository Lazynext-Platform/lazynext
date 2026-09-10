'use client';

import { useState } from 'react';
import {
  PieChart,
  Wallet,
  TrendingUp,
  GitBranch,
  BarChart3,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface Budget {
  id: string;
  scope: string;
  period: string;
  limitUsd: number;
  spentUsd: number;
  limitCredits: number;
  spentCredits: number;
  currency: string;
  status: string;
  startDate: Date;
  endDate: Date | null;
  department?: string;
  category?: string;
}

interface BudgetingStats {
  budgetCount: number;
  forecastCount: number;
  scenarioCount: number;
  totalBudgeted: number;
  totalSpent: number;
}

interface BudgetVsActual {
  budgetId: string;
  scope: string;
  period: string;
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  utilizationPct: number;
  status: string;
}

interface Forecast {
  id: string;
  name: string;
  period: string;
  scenarios: Array<{ name: string; type: string; revenue: number; expenses: number; notes?: string }>;
  notes?: string;
}

interface Scenario {
  id: string;
  name: string;
  type: string;
  period: string;
  revenue: number;
  expenses: number;
  growthRate?: number;
}

interface Variance {
  budgetId: string;
  scope: string;
  period: string;
  budgetUsd: number;
  actualUsd: number;
  variance: number;
  variancePct: number;
}

interface RollingForecastPoint {
  period: string;
  projectedSpend: number;
  basedOnMonths: number;
}

type Tab = 'overview' | 'budgets' | 'forecasts' | 'scenarios' | 'variance';

const tabs: Array<{ id: Tab; label: string; icon: typeof PieChart }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'budgets', label: 'Budgets', icon: Wallet },
  { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
  { id: 'scenarios', label: 'Scenarios', icon: GitBranch },
  { id: 'variance', label: 'Variance Analysis', icon: PieChart },
];

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  exceeded: 'danger',
  paused: 'warning',
  expired: 'default',
};

const scenarioVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  optimistic: 'success',
  realistic: 'info',
  pessimistic: 'danger',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function BudgetingDashboard({
  organizationId,
  budgets,
  stats,
  comparisons,
  forecasts,
  scenarios,
  variances,
  rollingForecast,
}: {
  organizationId: string;
  budgets: Budget[];
  stats: BudgetingStats;
  comparisons: BudgetVsActual[];
  forecasts: Forecast[];
  scenarios: Scenario[];
  variances: Variance[];
  rollingForecast: RollingForecastPoint[];
}) {
  const [tab, setTab] = useState<Tab>('overview');

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
              <div className="text-xs text-fg-secondary">Budgets</div>
              <div className="mt-1 text-2xl font-semibold">{stats.budgetCount}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Budgeted</div>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(stats.totalBudgeted)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Total Spent</div>
              <div className="mt-1 text-2xl font-semibold">{formatCurrency(stats.totalSpent)}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-secondary">Forecasts</div>
              <div className="mt-1 text-2xl font-semibold">{stats.forecastCount}</div>
            </Card>
          </div>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">Budget vs Actual</h3>
            {comparisons.length === 0 ? (
              <EmptyState icon={Wallet} title="No budgets" description="Create a budget to see utilization." />
            ) : (
              <div className="space-y-2">
                {comparisons.slice(0, 10).map((c) => (
                  <div key={c.budgetId} className="rounded-lg border border-fg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{c.scope} · {c.period}</div>
                      <Badge variant={statusVariant[c.status] || 'default'}>{c.status}</Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-fg-secondary">
                      <span>Limit: {formatCurrency(c.limitUsd)}</span>
                      <span>Spent: {formatCurrency(c.spentUsd)}</span>
                      <span>Remaining: {formatCurrency(c.remainingUsd)}</span>
                      <span className={c.utilizationPct > 90 ? 'text-fg-danger' : ''}>{c.utilizationPct}% used</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-fg-muted/20">
                      <div
                        className={`h-full ${c.utilizationPct > 90 ? 'bg-fg-danger' : 'bg-accent-primary'}`}
                        style={{ width: `${Math.min(100, c.utilizationPct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-medium">Rolling Forecast (6 months)</h3>
            {rollingForecast.length === 0 ? (
              <EmptyState icon={TrendingUp} title="No forecast data" description="Create budgets with spending to generate a rolling forecast." />
            ) : (
              <div className="space-y-2">
                {rollingForecast.map((p) => (
                  <div key={p.period} className="flex items-center justify-between rounded-lg border border-fg-muted/20 p-3">
                    <div className="text-sm font-medium">{p.period}</div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{formatCurrency(p.projectedSpend)}</span>
                      <span className="text-xs text-fg-secondary">based on {p.basedOnMonths} mo</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'budgets' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Budgets</h3>
            <Button variant="primary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Budget
            </Button>
          </div>
          {budgets.length === 0 ? (
            <EmptyState icon={Wallet} title="No budgets" description="Create a budget to track spending." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fg-muted/20 text-left text-xs text-fg-secondary">
                    <th className="pb-2 pr-4">Scope</th>
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2 pr-4">Department</th>
                    <th className="pb-2 pr-4">Limit</th>
                    <th className="pb-2 pr-4">Spent</th>
                    <th className="pb-2 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => (
                    <tr key={b.id} className="border-b border-fg-muted/10">
                      <td className="py-2 pr-4">{b.scope}</td>
                      <td className="py-2 pr-4">{b.period}</td>
                      <td className="py-2 pr-4">{b.department || '—'}</td>
                      <td className="py-2 pr-4">{formatCurrency(b.limitUsd)}</td>
                      <td className="py-2 pr-4">{formatCurrency(b.spentUsd)}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusVariant[b.status] || 'default'}>{b.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {tab === 'forecasts' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Forecasts</h3>
            <Button variant="primary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Forecast
            </Button>
          </div>
          {forecasts.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No forecasts" description="Create a forecast to project future revenue and expenses." />
          ) : (
            <div className="space-y-3">
              {forecasts.map((f) => (
                <div key={f.id} className="rounded-lg border border-fg-muted/20 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{f.name}</div>
                    <Badge variant="info">{f.period}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {f.scenarios.map((s, i) => (
                      <div key={i} className="flex items-center justify-between rounded border border-fg-muted/10 p-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Badge variant={scenarioVariant[s.type] || 'default'}>{s.type}</Badge>
                          <span>{s.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>Rev: {formatCurrency(s.revenue)}</span>
                          <span>Exp: {formatCurrency(s.expenses)}</span>
                          <span className={s.revenue - s.expenses >= 0 ? 'text-fg-success' : 'text-fg-danger'}>
                            Net: {formatCurrency(s.revenue - s.expenses)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'scenarios' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium">Scenarios</h3>
            <Button variant="primary" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Scenario
            </Button>
          </div>
          {scenarios.length === 0 ? (
            <EmptyState icon={GitBranch} title="No scenarios" description="Create scenarios to model different outcomes." />
          ) : (
            <div className="space-y-2">
              {scenarios.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-fg-muted/20 p-3">
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-fg-secondary">{s.period}{s.growthRate !== undefined ? ` · growth ${s.growthRate}%` : ''}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={scenarioVariant[s.type] || 'default'}>{s.type}</Badge>
                    <span className="text-sm">Net: {formatCurrency(s.revenue - s.expenses)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'variance' && (
        <Card className="p-4">
          <h3 className="mb-4 text-sm font-medium">Variance Analysis</h3>
          {variances.length === 0 ? (
            <EmptyState icon={PieChart} title="No variance data" description="Create budgets with spending to see variance analysis." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-fg-muted/20 text-left text-xs text-fg-secondary">
                    <th className="pb-2 pr-4">Scope</th>
                    <th className="pb-2 pr-4">Period</th>
                    <th className="pb-2 pr-4">Budget</th>
                    <th className="pb-2 pr-4">Actual</th>
                    <th className="pb-2 pr-4">Variance</th>
                    <th className="pb-2 pr-4">Variance %</th>
                  </tr>
                </thead>
                <tbody>
                  {variances.map((v) => (
                    <tr key={v.budgetId} className="border-b border-fg-muted/10">
                      <td className="py-2 pr-4">{v.scope}</td>
                      <td className="py-2 pr-4">{v.period}</td>
                      <td className="py-2 pr-4">{formatCurrency(v.budgetUsd)}</td>
                      <td className="py-2 pr-4">{formatCurrency(v.actualUsd)}</td>
                      <td className={`py-2 pr-4 ${v.variance > 0 ? 'text-fg-danger' : 'text-fg-success'}`}>
                        <span className="flex items-center gap-1">
                          {v.variance > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {formatCurrency(Math.abs(v.variance))}
                        </span>
                      </td>
                      <td className={`py-2 pr-4 ${v.variancePct > 0 ? 'text-fg-danger' : 'text-fg-success'}`}>
                        {v.variancePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
