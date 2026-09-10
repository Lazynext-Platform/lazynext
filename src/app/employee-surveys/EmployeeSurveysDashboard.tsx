'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ClipboardList, FileText, HelpCircle, Megaphone, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  SurveyForm, SurveyResponse, SurveyQuestion, SurveyCampaign,
  EmployeeSurveyMetrics, EmployeeSurveyStats,
} from '@/lib/services/employee-surveys-service';

type TabId = 'overview' | 'surveys' | 'responses' | 'questions' | 'campaigns';

interface EmployeeSurveysDashboardProps {
  organizationId: string;
  surveys: SurveyForm[];
  responses: SurveyResponse[];
  questions: SurveyQuestion[];
  campaigns: SurveyCampaign[];
  metrics: EmployeeSurveyMetrics;
  stats: EmployeeSurveyStats;
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (['completed', 'submitted', 'closed', 'verified'].includes(status)) return 'success';
  if (['draft', 'published', 'active', 'planned', 'pending', 'partial'].includes(status)) return 'warning';
  if (['cancelled', 'archived', 'paused'].includes(status)) return 'danger';
  return 'info';
};

export function EmployeeSurveysDashboard({
  surveys, responses, questions, campaigns, metrics, stats,
}: EmployeeSurveysDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const surveyTitle = useCallback((id: string) => surveys.find((s) => s.id === id)?.title || id, [surveys]);

  const filteredSurveys = useMemo(() => {
    if (!search) return surveys;
    const q = search.toLowerCase();
    return surveys.filter(
      (s) => s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [surveys, search]);

  const filteredResponses = useMemo(() => {
    if (!search) return responses;
    const q = search.toLowerCase();
    return responses.filter(
      (r) => r.respondentName.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || surveyTitle(r.surveyId).toLowerCase().includes(q),
    );
  }, [responses, search, surveyTitle]);

  const filteredQuestions = useMemo(() => {
    if (!search) return questions;
    const q = search.toLowerCase();
    return questions.filter(
      (qu) => qu.text.toLowerCase().includes(q) || qu.type.toLowerCase().includes(q) || surveyTitle(qu.surveyId).toLowerCase().includes(q),
    );
  }, [questions, search, surveyTitle]);

  const filteredCampaigns = useMemo(() => {
    if (!search) return campaigns;
    const q = search.toLowerCase();
    return campaigns.filter(
      (c) => c.name.toLowerCase().includes(q) || c.type.toLowerCase().includes(q) || c.status.toLowerCase().includes(q),
    );
  }, [campaigns, search]);

  const tabs: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'surveys', label: 'Surveys', icon: ClipboardList },
    { id: 'responses', label: 'Responses', icon: FileText },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
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
              <div className="text-xs text-fg-tertiary">Total Surveys</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalSurveys}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Surveys</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeSurveys}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Responses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalResponses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Submitted Responses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.submittedResponses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Campaigns</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeCampaigns}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Average Score</div>
              <div className="mt-1 text-2xl font-bold">{metrics.averageScore}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Participation Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.participationRate}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Survey Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySurveyType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Survey Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.bySurveyStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Response Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byResponseStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Campaign Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCampaignType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Campaign Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byCampaignStatus).map(([status, count]) => (
                <Badge key={status} variant={statusVariant(status)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'surveys' && (
        <div className="space-y-3">
          {filteredSurveys.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No surveys" description="Employee surveys will appear here." /></Card>
          ) : (
            filteredSurveys.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-fg-secondary">{s.type.replace('_', ' ')} · {s.anonymous ? 'Anonymous' : 'Identified'} · {s.responseCount}/{s.targetCount} responses</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.targetCount > 0 && <Badge variant="default">{s.targetCount} target</Badge>}
                    <Badge variant={statusVariant(s.status)}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'responses' && (
        <div className="space-y-3">
          {filteredResponses.length === 0 ? (
            <Card className="p-8"><EmptyState icon={FileText} title="No responses" description="Survey responses will appear here." /></Card>
          ) : (
            filteredResponses.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.respondentName || 'Anonymous'}</div>
                    <div className="text-sm text-fg-secondary">{surveyTitle(r.surveyId)} · {r.submittedDate ? new Date(r.submittedDate).toLocaleDateString() : 'Not submitted'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.score > 0 && <Badge variant="default">{r.score}</Badge>}
                    <Badge variant={statusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div className="space-y-3">
          {filteredQuestions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={HelpCircle} title="No questions" description="Survey questions will appear here." /></Card>
          ) : (
            filteredQuestions.map((qu) => (
              <Card key={qu.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{qu.text}</div>
                    <div className="text-sm text-fg-secondary">{surveyTitle(qu.surveyId)} · {qu.type.replace('_', ' ')} · Order {qu.order}{qu.required ? ' · Required' : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {qu.options.length > 0 && <Badge variant="default">{qu.options.length} options</Badge>}
                    {qu.scale > 0 && <Badge variant="default">Scale {qu.scale}</Badge>}
                    <Badge variant="info">{qu.type.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="space-y-3">
          {filteredCampaigns.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Megaphone} title="No campaigns" description="Survey campaigns will appear here." /></Card>
          ) : (
            filteredCampaigns.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-sm text-fg-secondary">{c.type.replace('_', ' ')} · {c.surveyIds.length} surveys · {c.targetAudience || 'All staff'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.participationRate > 0 && <Badge variant="default">{c.participationRate}%</Badge>}
                    <Badge variant={statusVariant(c.status)}>{c.status.replace('_', ' ')}</Badge>
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
