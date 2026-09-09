'use client';

import { useState, useMemo } from 'react';
import {
  HeartPulse, Stethoscope, ClipboardList, Wind, Syringe, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  MedicalSurveillance, MedicalExam, HealthExposure, VaccinationRecord,
  OccupationalHealthMetrics, OccupationalHealthStats,
} from '@/lib/services/occupational-health-service';

type TabId = 'overview' | 'surveillances' | 'exams' | 'exposures' | 'vaccinations';

interface OccupationalHealthDashboardProps {
  organizationId: string;
  surveillances: MedicalSurveillance[];
  exams: MedicalExam[];
  exposures: HealthExposure[];
  vaccinations: VaccinationRecord[];
  metrics: OccupationalHealthMetrics;
  stats: OccupationalHealthStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'administered', 'boosted', 'resolved', 'mitigated', 'monitored'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'in_review', 'investigating', 'reported', 'identified', 'assessed', 'controlled', 'enrolled'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'overdue', 'refused', 'revoked', 'no_show', 'non_compliant', 'ineffective', 'deprecated', 'reopened'].includes(status)) return 'danger';
  return 'info';
};

export function OccupationalHealthDashboard({
  surveillances, exams, exposures, vaccinations, metrics, stats,
}: OccupationalHealthDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredSurveillances = useMemo(() => {
    if (!search) return surveillances;
    const q = search.toLowerCase();
    return surveillances.filter(
      (s) => s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [surveillances, search]);

  const filteredExams = useMemo(() => {
    if (!search) return exams;
    const q = search.toLowerCase();
    return exams.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [exams, search]);

  const filteredExposures = useMemo(() => {
    if (!search) return exposures;
    const q = search.toLowerCase();
    return exposures.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [exposures, search]);

  const filteredVaccinations = useMemo(() => {
    if (!search) return vaccinations;
    const q = search.toLowerCase();
    return vaccinations.filter(
      (v) => v.name.toLowerCase().includes(q) || v.type.toLowerCase().includes(q) || v.status.toLowerCase().includes(q),
    );
  }, [vaccinations, search]);

  const tabs: { id: TabId; label: string; icon: typeof HeartPulse }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'surveillances', label: 'Surveillances', icon: Stethoscope },
    { id: 'exams', label: 'Exams', icon: ClipboardList },
    { id: 'exposures', label: 'Exposures', icon: Wind },
    { id: 'vaccinations', label: 'Vaccinations', icon: Syringe },
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
              <div className="text-xs text-fg-tertiary">Scheduled Surveillances</div>
              <div className="mt-1 text-2xl font-bold">{metrics.scheduledSurveillances}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Exams</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedExams}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Exposures</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeExposures}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Administered Vaccinations</div>
              <div className="mt-1 text-2xl font-bold">{metrics.administeredVaccinations}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Overdue Surveillances</div>
              <div className="mt-1 text-2xl font-bold">{metrics.overdueSurveillances}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Surveillance Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySurveillanceType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Surveillance Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySurveillanceStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Exam Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byExamType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Exam Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byExamStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'surveillances' && (
        <div className="space-y-3">
          {filteredSurveillances.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Stethoscope} title="No medical surveillances" description="Medical surveillance records will appear here." /></Card>
          ) : (
            filteredSurveillances.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.frequency && <Badge variant="default">{s.frequency}</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'exams' && (
        <div className="space-y-3">
          {filteredExams.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No medical exams" description="Medical examination records will appear here." /></Card>
          ) : (
            filteredExams.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.provider && <Badge variant="default">{e.provider}</Badge>}
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'exposures' && (
        <div className="space-y-3">
          {filteredExposures.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wind} title="No health exposures" description="Health exposure records will appear here." /></Card>
          ) : (
            filteredExposures.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.severity && <Badge variant="default">{e.severity}</Badge>}
                    <Badge variant={statusVariant(e.status)}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'vaccinations' && (
        <div className="space-y-3">
          {filteredVaccinations.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Syringe} title="No vaccination records" description="Vaccination records will appear here." /></Card>
          ) : (
            filteredVaccinations.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-sm text-fg-secondary">{v.type.replace('_', ' ')} · {v.employeeName || 'No employee'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.doseNumber > 0 && <Badge variant="default">Dose {v.doseNumber}</Badge>}
                    <Badge variant={statusVariant(v.status)}>{v.status.replace('_', ' ')}</Badge>
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
