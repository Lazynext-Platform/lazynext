'use client';

import { useState, useMemo } from 'react';
import {
  HardHat, AlertTriangle, ClipboardCheck, GraduationCap,
  Shield, Eye, Search, BarChart3, CheckCircle, XCircle,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

// ── Types ──

type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'security' | 'other';
type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'fatal';
type IncidentStatus = 'reported' | 'investigating' | 'actioned' | 'closed';
type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
type TrainingStatus = 'active' | 'inactive' | 'archived';
type HazardCategory = 'physical' | 'chemical' | 'biological' | 'ergonomic' | 'psychosocial' | 'safety' | 'environmental';
type HazardRiskLevel = 'low' | 'medium' | 'high' | 'critical';
type HazardStatus = 'open' | 'mitigating' | 'mitigated' | 'closed';
type ObservationBehavior = 'safe' | 'unsafe';
type ObservationStatus = 'open' | 'reviewed' | 'actioned';

interface Incident {
  id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  location: string;
  occurredAt: Date;
  reportedBy: string;
  status: IncidentStatus;
  rootCause: string;
  createdAt: Date;
}

interface Inspection {
  id: string;
  title: string;
  area: string;
  inspector: string;
  date: Date;
  status: InspectionStatus;
  passRate: number;
  passedCount: number;
  failedCount: number;
  totalCount: number;
  createdAt: Date;
}

interface Training {
  id: string;
  name: string;
  description: string;
  category: string;
  requiredFor: string[];
  durationHours: number | null;
  frequencyMonths: number | null;
  provider: string;
  certification: string;
  status: TrainingStatus;
  createdAt: Date;
}

interface Hazard {
  id: string;
  title: string;
  description: string;
  category: HazardCategory;
  location: string;
  riskLevel: HazardRiskLevel;
  identifiedBy: string;
  identifiedDate: Date;
  mitigation: string;
  status: HazardStatus;
  createdAt: Date;
}

interface Observation {
  id: string;
  observer: string;
  date: Date;
  location: string;
  behavior: ObservationBehavior;
  description: string;
  category: string;
  status: ObservationStatus;
  createdAt: Date;
}

interface SafetyMetrics {
  trir: number;
  totalIncidents: number;
  recordableIncidents: number;
  openHazardsByRiskLevel: Record<string, number>;
  inspectionPassRate: number;
  totalInspections: number;
  trainingCompliance: number;
  totalTrainings: number;
  activeTrainings: number;
  observationsSafe: number;
  observationsUnsafe: number;
  totalObservations: number;
}

interface SafetyStats {
  incidentCount: number;
  openIncidentCount: number;
  inspectionCount: number;
  completedInspectionCount: number;
  trainingCount: number;
  activeTrainingCount: number;
  hazardCount: number;
  openHazardCount: number;
  observationCount: number;
  trir: number;
  inspectionPassRate: number;
  byIncidentType: Record<string, number>;
  byIncidentSeverity: Record<string, number>;
  byIncidentStatus: Record<string, number>;
  byHazardRiskLevel: Record<string, number>;
  byHazardStatus: Record<string, number>;
}

interface HealthSafetyDashboardProps {
  organizationId: string;
  incidents: Incident[];
  inspections: Inspection[];
  trainings: Training[];
  hazards: Hazard[];
  observations: Observation[];
  metrics: SafetyMetrics;
  stats: SafetyStats;
}

// ── Helpers ──

const severityVariant: Record<IncidentSeverity, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  minor: 'default',
  moderate: 'warning',
  serious: 'danger',
  fatal: 'danger',
};

const incidentStatusVariant: Record<IncidentStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  reported: 'danger',
  investigating: 'warning',
  actioned: 'info',
  closed: 'success',
};

const inspectionStatusVariant: Record<InspectionStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  scheduled: 'info',
  in_progress: 'accent',
  completed: 'success',
  failed: 'danger',
  cancelled: 'default',
};

const trainingStatusVariant: Record<TrainingStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  active: 'success',
  inactive: 'default',
  archived: 'default',
};

const riskLevelVariant: Record<HazardRiskLevel, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};

const hazardStatusVariant: Record<HazardStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'danger',
  mitigating: 'warning',
  mitigated: 'success',
  closed: 'default',
};

const observationStatusVariant: Record<ObservationStatus, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent'> = {
  open: 'warning',
  reviewed: 'info',
  actioned: 'success',
};

function formatDate(d: Date | string | null): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

// ── Component ──

type TabId = 'overview' | 'incidents' | 'inspections' | 'training' | 'hazards' | 'observations';

export function HealthSafetyDashboard({
  organizationId: _organizationId,
  incidents,
  inspections,
  trainings,
  hazards,
  observations,
  metrics,
  stats,
}: HealthSafetyDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredIncidents = useMemo(() => {
    if (!search) return incidents;
    const q = search.toLowerCase();
    return incidents.filter(
      (i) => i.title.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.location.toLowerCase().includes(q),
    );
  }, [incidents, search]);

  const filteredInspections = useMemo(() => {
    if (!search) return inspections;
    const q = search.toLowerCase();
    return inspections.filter(
      (i) => i.title.toLowerCase().includes(q) || i.inspector.toLowerCase().includes(q) || i.area.toLowerCase().includes(q),
    );
  }, [inspections, search]);

  const filteredTrainings = useMemo(() => {
    if (!search) return trainings;
    const q = search.toLowerCase();
    return trainings.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) || t.provider.toLowerCase().includes(q),
    );
  }, [trainings, search]);

  const filteredHazards = useMemo(() => {
    if (!search) return hazards;
    const q = search.toLowerCase();
    return hazards.filter(
      (h) => h.title.toLowerCase().includes(q) || h.category.toLowerCase().includes(q) || h.location.toLowerCase().includes(q),
    );
  }, [hazards, search]);

  const filteredObservations = useMemo(() => {
    if (!search) return observations;
    const q = search.toLowerCase();
    return observations.filter(
      (o) => o.observer.toLowerCase().includes(q) || o.location.toLowerCase().includes(q) || o.category.toLowerCase().includes(q),
    );
  }, [observations, search]);

  const tabs: { id: TabId; label: string; icon: typeof HardHat }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'inspections', label: 'Inspections', icon: ClipboardCheck },
    { id: 'training', label: 'Training', icon: GraduationCap },
    { id: 'hazards', label: 'Hazards', icon: Shield },
    { id: 'observations', label: 'Observations', icon: Eye },
  ];

  return (
    <div className="space-y-6">
      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Incidents</span>
          </div>
          <p className="text-2xl font-semibold">{stats.incidentCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openIncidentCount} open · TRIR {stats.trir}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardCheck className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Inspections</span>
          </div>
          <p className="text-2xl font-semibold">{stats.inspectionCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.inspectionPassRate}% pass rate</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Hazards</span>
          </div>
          <p className="text-2xl font-semibold">{stats.hazardCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{stats.openHazardCount} open</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-4 w-4 text-fg-secondary" />
            <span className="text-xs text-fg-secondary">Training</span>
          </div>
          <p className="text-2xl font-semibold">{stats.trainingCount}</p>
          <p className="text-xs text-fg-secondary mt-0.5">{metrics.trainingCompliance}% compliance</p>
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

      {/* Search */}
      {tab !== 'overview' && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
        </div>
      )}

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Safety Metrics</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">TRIR</span>
                  <span className="font-medium">{metrics.trir}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Total incidents</span>
                  <span className="font-medium">{metrics.totalIncidents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Recordable incidents</span>
                  <span className="font-medium">{metrics.recordableIncidents}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Inspection pass rate</span>
                  <span className="font-medium">{metrics.inspectionPassRate}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Training compliance</span>
                  <span className="font-medium">{metrics.trainingCompliance}%</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Observations (safe / unsafe)</span>
                  <span>{metrics.observationsSafe} / {metrics.observationsUnsafe}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <HardHat className="h-5 w-5 text-accent-primary" />
                <h2 className="heading-display text-lg">Counts</h2>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Incidents</span>
                  <span className="font-medium">{stats.incidentCount} ({stats.openIncidentCount} open)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Inspections</span>
                  <span className="font-medium">{stats.inspectionCount} ({stats.completedInspectionCount} completed)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Trainings</span>
                  <span className="font-medium">{stats.trainingCount} ({stats.activeTrainingCount} active)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-fg-secondary">Hazards</span>
                  <span className="font-medium">{stats.hazardCount} ({stats.openHazardCount} open)</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Observations</span>
                  <span>{stats.observationCount}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="font-semibold mb-3">Open Incidents</h3>
            {incidents.filter((i) => i.status !== 'closed').length === 0 ? (
              <p className="text-sm text-fg-secondary">No open incidents.</p>
            ) : (
              <div className="space-y-2">
                {incidents.filter((i) => i.status !== 'closed').slice(0, 5).map((i) => (
                  <div key={i.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{i.title}</p>
                      <p className="text-xs text-fg-secondary">{i.type} · {i.location || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={severityVariant[i.severity]}>{i.severity}</Badge>
                      <Badge variant={incidentStatusVariant[i.status]}>{i.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-4">
          {filteredIncidents.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={AlertTriangle}
                title="No incidents"
                description="Reported incidents will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Type</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Occurred</th>
                    <th className="p-3 font-medium">Severity</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{i.title}</td>
                      <td className="p-3 capitalize">{i.type}</td>
                      <td className="p-3">{i.location || '—'}</td>
                      <td className="p-3">{formatDate(i.occurredAt)}</td>
                      <td className="p-3">
                        <Badge variant={severityVariant[i.severity]}>{i.severity}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={incidentStatusVariant[i.status]}>{i.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'inspections' && (
        <div className="space-y-4">
          {filteredInspections.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={ClipboardCheck}
                title="No inspections"
                description="Create an inspection to see it here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Area</th>
                    <th className="p-3 font-medium">Inspector</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Pass Rate</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInspections.map((i) => (
                    <tr key={i.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{i.title}</td>
                      <td className="p-3">{i.area || '—'}</td>
                      <td className="p-3">{i.inspector}</td>
                      <td className="p-3">{formatDate(i.date)}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1">
                          {i.passRate >= 100 ? (
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                          ) : i.failedCount > 0 ? (
                            <XCircle className="h-3.5 w-3.5 text-danger" />
                          ) : null}
                          {i.passRate}% ({i.passedCount}/{i.totalCount})
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant={inspectionStatusVariant[i.status]}>{i.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'training' && (
        <div className="space-y-4">
          {filteredTrainings.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={GraduationCap}
                title="No trainings"
                description="Training programs will appear here."
              />
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTrainings.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{t.name}</h3>
                      <p className="text-xs text-fg-secondary">{t.category || 'Uncategorized'}</p>
                    </div>
                    <Badge variant={trainingStatusVariant[t.status]}>{t.status}</Badge>
                  </div>
                  {t.description && (
                    <p className="text-sm text-fg-secondary mb-3 line-clamp-2">{t.description}</p>
                  )}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Provider</span>
                      <span className="font-medium">{t.provider || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Duration</span>
                      <span className="font-medium">{t.durationHours ? `${t.durationHours}h` : '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Required for</span>
                      <span className="font-medium">{t.requiredFor.length} roles</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'hazards' && (
        <div className="space-y-4">
          {filteredHazards.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Shield}
                title="No hazards"
                description="Identified hazards will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Title</th>
                    <th className="p-3 font-medium">Category</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Risk Level</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHazards.map((h) => (
                    <tr key={h.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{h.title}</td>
                      <td className="p-3 capitalize">{h.category}</td>
                      <td className="p-3">{h.location || '—'}</td>
                      <td className="p-3">
                        <Badge variant={riskLevelVariant[h.riskLevel]}>{h.riskLevel}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={hazardStatusVariant[h.status]}>{h.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}

      {tab === 'observations' && (
        <div className="space-y-4">
          {filteredObservations.length === 0 ? (
            <Card className="p-8">
              <EmptyState
                icon={Eye}
                title="No observations"
                description="Safety observations will appear here."
              />
            </Card>
          ) : (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-fg-secondary">
                    <th className="p-3 font-medium">Observer</th>
                    <th className="p-3 font-medium">Location</th>
                    <th className="p-3 font-medium">Date</th>
                    <th className="p-3 font-medium">Behavior</th>
                    <th className="p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredObservations.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{o.observer}</td>
                      <td className="p-3">{o.location || '—'}</td>
                      <td className="p-3">{formatDate(o.date)}</td>
                      <td className="p-3">
                        <Badge variant={o.behavior === 'safe' ? 'success' : 'danger'}>{o.behavior}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge variant={observationStatusVariant[o.status]}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
