'use client';

import { useState, useCallback } from 'react';
import {
  BarChart3, Plus, Play, Copy, Trash2, Download, FileText,
  LayoutTemplate, Search, X, RefreshCw,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type ReportDataSource = 'tasks' | 'projects' | 'invoices' | 'expenses';
type ReportSchedule = 'none' | 'daily' | 'weekly' | 'monthly';
type ReportFormat = 'csv' | 'json' | 'excel' | 'html' | 'markdown';

interface ReportColumn {
  field: string;
  label: string;
  aggregate?: 'sum' | 'avg' | 'count' | 'min' | 'max';
}

interface ReportFilter {
  field: string;
  operator: string;
  value: unknown;
}

interface ReportGroupBy {
  field: string;
  label?: string;
}

interface CustomReport {
  id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  description: string;
  dataSource: ReportDataSource;
  columns: ReportColumn[];
  filters: ReportFilter[];
  groupBy: ReportGroupBy[];
  orderBy: { field: string; direction: 'asc' | 'desc' };
  schedule: ReportSchedule;
  format: ReportFormat;
  isPublic: boolean;
  executions: { id: string; executedAt: Date; rowCount: number; durationMs: number; executedBy: string }[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  dataSource: ReportDataSource;
  isBuiltIn: boolean;
  icon: string;
  tags: string[];
}

interface ReportStats {
  totalReports: number;
  byDataSource: Record<string, number>;
  bySchedule: Record<string, number>;
  totalExecutions: number;
  scheduledReports: number;
}

interface ExecutionResult {
  reportId: string;
  columns: { field: string; label: string }[];
  rows: Record<string, unknown>[];
  totalCount: number;
  executedAt: Date;
  durationMs: number;
}

interface ReportDashboardProps {
  organizationId: string;
  initialReports: CustomReport[];
  initialTemplates: ReportTemplate[];
  initialStats: ReportStats;
}

const dataSourceLabels: Record<string, string> = {
  tasks: 'Tasks',
  projects: 'Projects',
  invoices: 'Invoices',
  expenses: 'Expenses',
};

const scheduleLabels: Record<string, string> = {
  none: 'On-demand',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

export function ReportDashboard({
  organizationId: _organizationId,
  initialReports,
  initialTemplates,
  initialStats,
}: ReportDashboardProps) {
  const [reports, setReports] = useState<CustomReport[]>(initialReports);
  const [templates] = useState<ReportTemplate[]>(initialTemplates);
  const [stats, setStats] = useState<ReportStats>(initialStats);
  const [activeTab, setActiveTab] = useState<'reports' | 'builder' | 'templates' | 'results' | 'stats'>('reports');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Builder form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDataSource, setFormDataSource] = useState<ReportDataSource>('tasks');
  const [formSchedule, setFormSchedule] = useState<ReportSchedule>('none');
  const [formFormat, setFormFormat] = useState<ReportFormat>('csv');

  const filteredReports = searchQuery
    ? reports.filter((r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : reports;

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/reports/stats');
      const data = await res.json();
      setStats(data);
    } catch { /* ignore */ }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          dataSource: formDataSource,
          schedule: formSchedule,
          format: formFormat,
        }),
      });
      const data = await res.json();
      if (data.report) {
        setReports((prev) => [data.report, ...prev]);
        setFormName('');
        setFormDescription('');
        setActiveTab('reports');
        refreshStats();
      }
    } finally {
      setLoading(false);
    }
  }, [formName, formDescription, formDataSource, formSchedule, formFormat, refreshStats]);

  const handleExecute = useCallback(async (reportId: string) => {
    setLoading(true);
    setSelectedReportId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}/execute`, { method: 'POST' });
      const data = await res.json();
      if (data.result) {
        setExecutionResult(data.result);
        setActiveTab('results');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDuplicate = useCallback(async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.report) {
        setReports((prev) => [data.report, ...prev]);
        refreshStats();
      }
    } catch { /* ignore */ }
  }, [refreshStats]);

  const handleDelete = useCallback(async (reportId: string) => {
    try {
      await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      refreshStats();
    } catch { /* ignore */ }
  }, [refreshStats]);

  const handleExport = useCallback(async (reportId: string, format: ReportFormat) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/export?format=${format}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report.${format === 'excel' ? 'xml' : format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  }, []);

  const handleInstantiate = useCallback(async (templateId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/report-templates/${templateId}/instantiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.report) {
        setReports((prev) => [data.report, ...prev]);
        setActiveTab('reports');
        refreshStats();
      }
    } finally {
      setLoading(false);
    }
  }, [refreshStats]);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Total Reports</div>
          <div className="text-xl font-bold">{stats.totalReports}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Scheduled</div>
          <div className="text-xl font-bold">{stats.scheduledReports}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Executions</div>
          <div className="text-xl font-bold">{stats.totalExecutions}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Templates</div>
          <div className="text-xl font-bold">{templates.length}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-fg-secondary mb-1">Data Sources</div>
          <div className="text-xl font-bold">{Object.keys(stats.byDataSource).length}</div>
        </Card>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 flex-wrap">
        {([
          ['reports', 'Reports'],
          ['builder', 'Builder'],
          ['templates', 'Templates'],
          ['results', 'Results'],
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

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading-display text-sm">Custom Reports</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-fg-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-7 pr-3 py-1 text-xs border rounded-lg bg-transparent"
                />
              </div>
              <Button variant="secondary" size="sm" className="text-xs" onClick={() => setActiveTab('builder')}>
                <Plus className="h-3 w-3" /> New
              </Button>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No reports yet"
              description="Create your first custom report to get started."
              action={<Button size="sm" onClick={() => setActiveTab('builder')}><Plus className="h-3 w-3" /> New Report</Button>}
            />
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent-primary shrink-0" />
                      <span className="font-medium text-sm truncate">{report.name}</span>
                      <Badge variant="info" className="text-xs">{dataSourceLabels[report.dataSource]}</Badge>
                      {report.schedule !== 'none' && (
                        <Badge variant="accent" className="text-xs">{scheduleLabels[report.schedule]}</Badge>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-xs text-fg-secondary mt-1 truncate">{report.description}</p>
                    )}
                    <div className="text-xs text-fg-muted mt-1">
                      {report.executions.length} execution(s) · {report.columns.length} column(s)
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleExecute(report.id)} disabled={loading}>
                      <Play className="h-3 w-3" /> Run
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleDuplicate(report.id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleExport(report.id, 'csv')}>
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-danger" onClick={() => handleDelete(report.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Builder Tab */}
      {activeTab === 'builder' && (
        <Card className="p-4">
          <h2 className="heading-display text-sm mb-3">Report Builder</h2>
          <div className="space-y-3 max-w-lg">
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="My Custom Report"
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-fg-secondary mb-1 block">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="What does this report show?"
                className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Data Source</label>
                <select
                  value={formDataSource}
                  onChange={(e) => setFormDataSource(e.target.value as ReportDataSource)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                >
                  <option value="tasks">Tasks</option>
                  <option value="projects">Projects</option>
                  <option value="invoices">Invoices</option>
                  <option value="expenses">Expenses</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Schedule</label>
                <select
                  value={formSchedule}
                  onChange={(e) => setFormSchedule(e.target.value as ReportSchedule)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                >
                  <option value="none">On-demand</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-fg-secondary mb-1 block">Format</label>
                <select
                  value={formFormat}
                  onChange={(e) => setFormFormat(e.target.value as ReportFormat)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-transparent"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="excel">Excel</option>
                  <option value="html">HTML</option>
                  <option value="markdown">Markdown</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleCreate} disabled={loading || !formName.trim()}>
                <Plus className="h-3 w-3" /> Create Report
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('reports')}>
                <X className="h-3 w-3" /> Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <LayoutTemplate className="h-4 w-4 text-accent-primary" />
            <h2 className="heading-display text-sm">Template Library</h2>
          </div>
          {templates.length === 0 ? (
            <EmptyState
              icon={LayoutTemplate}
              title="No templates yet"
              description="Report templates will appear here."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((tpl) => (
                <div key={tpl.id} className="p-3 border rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{tpl.name}</span>
                    {tpl.isBuiltIn && <Badge variant="accent" className="text-xs">Built-in</Badge>}
                  </div>
                  <p className="text-xs text-fg-secondary mb-2">{tpl.description}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="info" className="text-xs">{dataSourceLabels[tpl.dataSource]}</Badge>
                    <Badge variant="default" className="text-xs">{tpl.category}</Badge>
                  </div>
                  <Button size="sm" className="text-xs" onClick={() => handleInstantiate(tpl.id)} disabled={loading}>
                    <Plus className="h-3 w-3" /> Instantiate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Results Tab */}
      {activeTab === 'results' && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="heading-display text-sm">Execution Results</h2>
            {selectedReportId && (
              <div className="flex gap-1">
                {(['csv', 'json', 'excel', 'html', 'markdown'] as const).map((fmt) => (
                  <Button
                    key={fmt}
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleExport(selectedReportId, fmt)}
                  >
                    <Download className="h-3 w-3" /> {fmt.toUpperCase()}
                  </Button>
                ))}
              </div>
            )}
          </div>
          {!executionResult ? (
            <EmptyState
              icon={Play}
              title="No results yet"
              description="Execute a report to see results here."
            />
          ) : (
            <div>
              <div className="text-xs text-fg-secondary mb-2">
                {executionResult.totalCount} row(s) · {executionResult.durationMs}ms
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      {executionResult.columns.map((col) => (
                        <th key={col.field} className="text-left p-2 font-medium">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {executionResult.rows.slice(0, 100).map((row, i) => (
                      <tr key={i} className="border-b">
                        {executionResult.columns.map((col) => (
                          <td key={col.field} className="p-2">
                            {String(row[col.field] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {executionResult.rows.length > 100 && (
                  <div className="text-xs text-fg-secondary text-center py-2">
                    Showing 100 of {executionResult.rows.length} rows
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="heading-display text-sm">Report Statistics</h2>
              <Button variant="ghost" size="sm" className="text-xs" onClick={refreshStats}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs text-fg-secondary uppercase mb-2">By Data Source</h3>
                <div className="space-y-1">
                  {Object.entries(stats.byDataSource).map(([source, count]) => (
                    <div key={source} className="flex justify-between text-sm">
                      <span>{dataSourceLabels[source] || source}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.byDataSource).length === 0 && (
                    <div className="text-xs text-fg-secondary">No data</div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-xs text-fg-secondary uppercase mb-2">By Schedule</h3>
                <div className="space-y-1">
                  {Object.entries(stats.bySchedule).map(([sched, count]) => (
                    <div key={sched} className="flex justify-between text-sm">
                      <span>{scheduleLabels[sched] || sched}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.bySchedule).length === 0 && (
                    <div className="text-xs text-fg-secondary">No data</div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
