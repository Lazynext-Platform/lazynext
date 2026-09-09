'use client';

import { useState, useMemo } from 'react';
import {
  Users, Calendar, Star, DollarSign, Search, ChevronRight, ChevronDown,
  Briefcase, UserCheck, Clock, TrendingUp,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';

// ── Types ──

interface EmployeeRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  status: string;
  employmentType: string;
  manager?: { id: string; firstName: string; lastName: string } | null;
  _count?: { directReports: number };
}

interface TimeOffRecord {
  id: string;
  employeeId: string;
  type: string;
  startDate: Date;
  endDate: Date;
  days: number;
  status: string;
  reason: string;
}

interface ReviewRecord {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  type: string;
  status: string;
  overallRating: number | null;
}

interface OrgNode {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  children?: OrgNode[];
}

interface PayrollSummary {
  totalRecords: number;
  totalGross: number;
  totalTax: number;
  totalNet: number;
  totalBenefits: number;
  totalDeductions: number;
  byStatus: Record<string, number>;
  byPeriod: Record<string, { gross: number; net: number; count: number }>;
}

interface EmployeeStats {
  total: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
  byEmploymentType: Record<string, number>;
  averageSalary: number;
  activeCount: number;
}

interface TimeOffStats {
  total: number;
  pending: number;
  approved: number;
  denied: number;
  cancelled: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  totalDays: number;
}

interface ReviewStats {
  total: number;
  draft: number;
  inProgress: number;
  submitted: number;
  completed: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPeriod: Record<string, number>;
  averageRating: number;
}

interface PayrollStats {
  total: number;
  draft: number;
  processed: number;
  paid: number;
  failed: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byPeriod: Record<string, number>;
  totalGross: number;
  totalNet: number;
}

// ── Component ──

const statusVariant: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  on_leave: 'warning',
  terminated: 'danger',
  suspended: 'danger',
  pending: 'warning',
  approved: 'success',
  denied: 'danger',
  cancelled: 'default',
  draft: 'default',
  in_progress: 'info',
  submitted: 'warning',
  completed: 'success',
  paid: 'success',
  processed: 'info',
  failed: 'danger',
};

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function OrgTreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className="flex items-center gap-2 py-1.5 cursor-pointer hover:bg-fg-muted/10 rounded px-2"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 text-fg-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-fg-secondary" />
        ) : (
          <span className="w-3.5" />
        )}
        <span className="text-sm font-medium">{node.firstName} {node.lastName}</span>
        {node.position && <span className="text-xs text-fg-secondary">— {node.position}</span>}
        {node.department && <Badge variant="default" className="text-xs">{node.department}</Badge>}
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <OrgTreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function HRDashboard({
  organizationId,
  employees: initialEmployees,
  departments,
  pendingTimeOff,
  inProgressReviews,
  payrollSummary,
  employeeStats,
  timeOffStats,
  reviewStats,
  payrollStats,
}: {
  organizationId: string;
  employees: EmployeeRecord[];
  departments: string[];
  pendingTimeOff: TimeOffRecord[];
  inProgressReviews: ReviewRecord[];
  payrollSummary: PayrollSummary;
  employeeStats: EmployeeStats;
  timeOffStats: TimeOffStats;
  reviewStats: ReviewStats;
  payrollStats: PayrollStats;
}) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'employees' | 'orgchart' | 'timeoff' | 'reviews' | 'payroll'>('overview');

  const filteredEmployees = useMemo(() => {
    return initialEmployees.filter((emp) => {
      if (deptFilter && emp.department !== deptFilter) return false;
      if (statusFilter && emp.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const full = `${emp.firstName} ${emp.lastName} ${emp.email} ${emp.position}`.toLowerCase();
        if (!full.includes(q)) return false;
      }
      return true;
    });
  }, [initialEmployees, search, deptFilter, statusFilter]);

  // Build org chart from employees (those without a manager are roots)
  const orgChart = useMemo<OrgNode[]>(() => {
    const byManager = new Map<string | null, EmployeeRecord[]>();
    for (const emp of initialEmployees) {
      const key = emp.manager?.id ?? null;
      const arr = byManager.get(key) ?? [];
      arr.push(emp);
      byManager.set(key, arr);
    }
    function build(parentId: string | null): OrgNode[] {
      const children = byManager.get(parentId) ?? [];
      return children.map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        position: emp.position,
        department: emp.department,
        children: build(emp.id),
      }));
    }
    return build(null);
  }, [initialEmployees]);

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => setActiveTab('employees')}>
          <Users className="h-4 w-4" /> Employees
        </Button>
        <Button variant="secondary" onClick={() => setActiveTab('orgchart')}>
          <Briefcase className="h-4 w-4" /> Org Chart
        </Button>
        <Button variant="secondary" onClick={() => setActiveTab('timeoff')}>
          <Calendar className="h-4 w-4" /> Time Off
        </Button>
        <Button variant="secondary" onClick={() => setActiveTab('reviews')}>
          <Star className="h-4 w-4" /> Reviews
        </Button>
        <Button variant="secondary" onClick={() => setActiveTab('payroll')}>
          <DollarSign className="h-4 w-4" /> Payroll
        </Button>
      </div>

      {/* Overview Stats */}
      {(activeTab === 'overview' || activeTab === 'employees') && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-accent-primary" />
              <span className="text-xs text-fg-secondary">Total Employees</span>
            </div>
            <div className="text-2xl font-bold">{employeeStats.total}</div>
            <div className="text-xs text-fg-secondary mt-1">{employeeStats.activeCount} active</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-warning" />
              <span className="text-xs text-fg-secondary">Pending Time Off</span>
            </div>
            <div className="text-2xl font-bold">{timeOffStats.pending}</div>
            <div className="text-xs text-fg-secondary mt-1">{timeOffStats.totalDays} days total</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-info" />
              <span className="text-xs text-fg-secondary">Active Reviews</span>
            </div>
            <div className="text-2xl font-bold">{reviewStats.inProgress + reviewStats.draft}</div>
            <div className="text-xs text-fg-secondary mt-1">{reviewStats.completed} completed</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-success" />
              <span className="text-xs text-fg-secondary">Payroll (Net)</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(payrollSummary.totalNet)}</div>
            <div className="text-xs text-fg-secondary mt-1">{payrollSummary.totalRecords} records</div>
          </Card>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Department breakdown */}
          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">By Department</h3>
            <div className="space-y-2">
              {Object.entries(employeeStats.byDepartment).length === 0 ? (
                <div className="text-sm text-fg-secondary">No departments yet.</div>
              ) : (
                Object.entries(employeeStats.byDepartment).map(([dept, count]) => (
                  <div key={dept} className="flex items-center justify-between">
                    <span className="text-sm">{dept}</span>
                    <Badge variant="default" className="text-xs">{count}</Badge>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Recent pending time-off */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="heading-display text-sm">Pending Time-Off Requests</h3>
              <Button variant="secondary" onClick={() => setActiveTab('timeoff')}>View all</Button>
            </div>
            {pendingTimeOff.length === 0 ? (
              <div className="text-sm text-fg-secondary">No pending requests.</div>
            ) : (
              <div className="space-y-2">
                {pendingTimeOff.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-sm">
                    <span>{req.type} — {req.days} day(s)</span>
                    <Badge variant="warning" className="text-xs">{req.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-secondary" />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-9"
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="input max-w-[180px]"
            >
              <option value="">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input max-w-[150px]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="terminated">Terminated</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Employee List */}
          {filteredEmployees.length === 0 ? (
            <Card className="p-6"><div className="text-sm text-fg-secondary">No employees found.</div></Card>
          ) : (
            <div className="space-y-2">
              {filteredEmployees.map((emp) => (
                <Card key={emp.id} className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-accent-primary/10 text-accent-primary text-sm font-medium">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{emp.firstName} {emp.lastName}</div>
                      <div className="text-xs text-fg-secondary">{emp.position || '—'} {emp.department && `· ${emp.department}`}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {emp.manager && (
                      <span className="text-xs text-fg-secondary hidden sm:inline">
                        Reports to {emp.manager.firstName} {emp.manager.lastName}
                      </span>
                    )}
                    {emp._count && emp._count.directReports > 0 && (
                      <Badge variant="info" className="text-xs">{emp._count.directReports} reports</Badge>
                    )}
                    <Badge variant={statusVariant[emp.status] || 'default'} className="text-xs">{emp.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Org Chart Tab */}
      {activeTab === 'orgchart' && (
        <Card className="p-4">
          <h3 className="heading-display text-sm mb-3">Organization Chart</h3>
          {orgChart.length === 0 ? (
            <div className="text-sm text-fg-secondary">No employees to display.</div>
          ) : (
            <div>
              {orgChart.map((node) => (
                <OrgTreeNode key={node.id} node={node} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Time Off Tab */}
      {activeTab === 'timeoff' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Pending</div>
              <div className="text-xl font-bold">{timeOffStats.pending}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Approved</div>
              <div className="text-xl font-bold">{timeOffStats.approved}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Denied</div>
              <div className="text-xl font-bold">{timeOffStats.denied}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Total Days</div>
              <div className="text-xl font-bold">{timeOffStats.totalDays}</div>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">Pending Requests</h3>
            {pendingTimeOff.length === 0 ? (
              <div className="text-sm text-fg-secondary">No pending time-off requests.</div>
            ) : (
              <div className="space-y-2">
                {pendingTimeOff.map((req) => (
                  <div key={req.id} className="flex items-center justify-between text-sm border-b border-fg-muted/10 pb-2 last:border-0">
                    <div>
                      <span className="font-medium capitalize">{req.type}</span>
                      <span className="text-fg-secondary ml-2">
                        {new Date(req.startDate).toLocaleDateString()} — {new Date(req.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-fg-secondary">{req.days} day(s)</span>
                      <Badge variant="warning" className="text-xs">{req.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Draft</div>
              <div className="text-xl font-bold">{reviewStats.draft}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">In Progress</div>
              <div className="text-xl font-bold">{reviewStats.inProgress}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Completed</div>
              <div className="text-xl font-bold">{reviewStats.completed}</div>
            </Card>
            <Card className="p-3">
              <div className="flex items-center gap-1 text-xs text-fg-secondary mb-1">
                <TrendingUp className="h-3 w-3" /> Avg Rating
              </div>
              <div className="text-xl font-bold">{reviewStats.averageRating.toFixed(1)}</div>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">In-Progress Reviews</h3>
            {inProgressReviews.length === 0 ? (
              <div className="text-sm text-fg-secondary">No reviews in progress.</div>
            ) : (
              <div className="space-y-2">
                {inProgressReviews.map((rev) => (
                  <div key={rev.id} className="flex items-center justify-between text-sm border-b border-fg-muted/10 pb-2 last:border-0">
                    <div>
                      <span className="font-medium">{rev.reviewPeriod || 'No period'}</span>
                      <span className="text-fg-secondary ml-2 capitalize">{rev.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {rev.overallRating != null && (
                        <span className="text-xs text-fg-secondary">{rev.overallRating.toFixed(1)}/5</span>
                      )}
                      <Badge variant="info" className="text-xs">{rev.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Total Gross</div>
              <div className="text-xl font-bold">{formatCurrency(payrollSummary.totalGross)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Total Net</div>
              <div className="text-xl font-bold">{formatCurrency(payrollSummary.totalNet)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Total Tax</div>
              <div className="text-xl font-bold">{formatCurrency(payrollSummary.totalTax)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-fg-secondary mb-1">Records</div>
              <div className="text-xl font-bold">{payrollSummary.totalRecords}</div>
            </Card>
          </div>
          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">Payroll by Period</h3>
            {Object.keys(payrollSummary.byPeriod).length === 0 ? (
              <div className="text-sm text-fg-secondary">No payroll records yet.</div>
            ) : (
              <div className="space-y-2">
                {Object.entries(payrollSummary.byPeriod).map(([period, data]) => (
                  <div key={period} className="flex items-center justify-between text-sm border-b border-fg-muted/10 pb-2 last:border-0">
                    <span className="font-medium">{period}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-fg-secondary">{data.count} records</span>
                      <span className="text-sm">{formatCurrency(data.net)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="heading-display text-sm mb-3">Payroll Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(payrollStats.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <Badge variant={statusVariant[status] || 'default'} className="text-xs">{status}</Badge>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
