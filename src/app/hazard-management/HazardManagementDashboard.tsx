'use client';

import { useState, useMemo } from 'react';
import {
  ShieldAlert, AlertOctagon, ClipboardCheck, ShieldCheck, FileCheck, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  Hazard, RiskAssessment, ControlMeasure, JobSafetyAnalysis,
  HazardManagementMetrics, HazardManagementStats,
} from '@/lib/services/hazard-management-service';

type TabId = 'overview' | 'hazards' | 'assessments' | 'controls' | 'jsas';

interface HazardManagementDashboardProps {
  organizationId: string;
  hazards: Hazard[];
  assessments: RiskAssessment[];
  controls: ControlMeasure[];
  jsas: JobSafetyAnalysis[];
  metrics: HazardManagementMetrics;
  stats: HazardManagementStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['active', 'completed', 'verified', 'executed', 'preferred', 'administered', 'boosted', 'resolved', 'mitigated', 'monitored', 'closed', 'reviewed', 'eliminated', 'implemented', 'approved', 'compliant', 'renewed'].includes(status)) return 'success';
  if (['draft', 'pending', 'placed', 'scheduled', 'planned', 'set', 'submitted', 'under_review', 'in_progress', 'in_review', 'investigating', 'reported', 'identified', 'assessed', 'controlled', 'enrolled'].includes(status)) return 'warning';
  if (['cancelled', 'expired', 'terminated', 'deactivated', 'missed', 'failed', 'suspended', 'overdue', 'refused', 'revoked', 'no_show', 'non_compliant', 'ineffective', 'deprecated', 'reopened'].includes(status)) return 'danger';
  return 'info';
};

export function HazardManagementDashboard({
  hazards, assessments, controls, jsas, metrics, stats,
}: HazardManagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const filteredHazards = useMemo(() => {
    if (!search) return hazards;
    const q = search.toLowerCase();
    return hazards.filter(
      (h) => h.name.toLowerCase().includes(q) || h.type.toLowerCase().includes(q) || h.status.toLowerCase().includes(q),
    );
  }, [hazards, search]);

  const filteredAssessments = useMemo(() => {
    if (!search) return assessments;
    const q = search.toLowerCase();
    return assessments.filter(
      (a) => a.name.toLowerCase().includes(q) || a.type.toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assessments, search]);

  const filteredControls = useMemo(() => {
    if (!search) return controls;
    const q = search.toLowerCase();
    return controls.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [controls, search]);

  const filteredJSAs = useMemo(() => {
    if (!search) return jsas;
    const q = search.toLowerCase();
    return jsas.filter(
      (j) => j.name.toLowerCase().includes(q) || j.type.toLowerCase().includes(q) || j.status.toLowerCase().includes(q),
    );
  }, [jsas, search]);

  const tabs: { id: TabId; label: string; icon: typeof ShieldAlert }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'hazards', label: 'Hazards', icon: ShieldAlert },
    { id: 'assessments', label: 'Risk Assessments', icon: AlertOctagon },
    { id: 'controls', label: 'Controls', icon: ShieldCheck },
    { id: 'jsas', label: 'JSAs', icon: FileCheck },
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
              <div className="text-xs text-fg-tertiary">Identified Hazards</div>
              <div className="mt-1 text-2xl font-bold">{metrics.identifiedHazards}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Assessments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAssessments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Implemented Controls</div>
              <div className="mt-1 text-2xl font-bold">{metrics.implementedControls}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active JSAs</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeJSAs}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">High Risk Hazards</div>
              <div className="mt-1 text-2xl font-bold">{metrics.highRiskHazards}</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Hazard Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byHazardType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Hazard Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byHazardStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Risk Assessment Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byRiskAssessmentStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Control Measure Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byControlMeasureStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'hazards' && (
        <div className="space-y-3">
          {filteredHazards.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ShieldAlert} title="No hazards" description="Hazard records will appear here." /></Card>
          ) : (
            filteredHazards.map((h) => (
              <Card key={h.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-sm text-fg-secondary">{h.type.replace('_', ' ')} · {h.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {h.riskLevel && <Badge variant="default">{h.riskLevel}</Badge>}
                    <Badge variant={statusVariant(h.status)}>{h.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'assessments' && (
        <div className="space-y-3">
          {filteredAssessments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={AlertOctagon} title="No risk assessments" description="Risk assessment records will appear here." /></Card>
          ) : (
            filteredAssessments.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.name}</div>
                    <div className="text-sm text-fg-secondary">{a.type.replace('_', ' ')} · {a.assessor || 'No assessor'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.riskScore > 0 && <Badge variant="default">Score {a.riskScore}</Badge>}
                    {a.riskLevel && <Badge variant="default">{a.riskLevel}</Badge>}
                    <Badge variant={statusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'controls' && (
        <div className="space-y-3">
          {filteredControls.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ShieldCheck} title="No control measures" description="Control measure records will appear here." /></Card>
          ) : (
            filteredControls.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.effectiveness || 'No effectiveness'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.cost > 0 && <Badge variant="default">${c.cost}</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'jsas' && (
        <div className="space-y-3">
          {filteredJSAs.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileCheck} title="No job safety analyses" description="Job safety analysis records will appear here." /></Card>
          ) : (
            filteredJSAs.map((j) => (
              <Card key={j.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{j.name}</div>
                    <div className="text-sm text-fg-secondary">{j.type.replace('_', ' ')} · {j.jobTitle || 'No job title'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.department && <Badge variant="default">{j.department}</Badge>}
                    <Badge variant={statusVariant(j.status)}>{j.status.replace('_', ' ')}</Badge>
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
