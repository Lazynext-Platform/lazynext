'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ClipboardList, HelpCircle, MessageSquare, CheckCircle, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  EngagementSurvey, SurveyQuestion, SurveyResponse, EngagementAction,
  EngagementMetrics, EngagementStats,
  SurveyStatus, ResponseStatus, ActionStatus, ActionPriority,
} from '@/lib/services/engagement-service';

type TabId = 'overview' | 'surveys' | 'questions' | 'responses' | 'actions';

interface EngagementDashboardProps {
  organizationId: string;
  surveys: EngagementSurvey[];
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  actions: EngagementAction[];
  metrics: EngagementMetrics;
  stats: EngagementStats;
}

const surveyStatusVariant = (status: SurveyStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'active' || status === 'published') return 'success';
  if (status === 'draft') return 'warning';
  if (status === 'closed' || status === 'archived') return 'danger';
  return 'info';
};

const responseStatusVariant = (status: ResponseStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'submitted') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'pending') return 'default';
  return 'info';
};

const actionStatusVariant = (status: ActionStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'warning';
  if (status === 'cancelled') return 'danger';
  if (status === 'planned') return 'default';
  return 'info';
};

const priorityVariant = (priority: ActionPriority): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'critical') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'medium') return 'info';
  if (priority === 'low') return 'default';
  return 'info';
};

export function EngagementDashboard({
  surveys, questions, responses, actions, metrics, stats,
}: EngagementDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const surveyTitle = useCallback(
    (id: string) => surveys.find((s) => s.id === id)?.title || id,
    [surveys],
  );

  const filteredSurveys = useMemo(() => {
    if (!search) return surveys;
    const q = search.toLowerCase();
    return surveys.filter(
      (s) => s.title.toLowerCase().includes(q) || s.surveyType.toLowerCase().includes(q) || s.status.toLowerCase().includes(q),
    );
  }, [surveys, search]);

  const filteredQuestions = useMemo(() => {
    if (!search) return questions;
    const q = search.toLowerCase();
    return questions.filter(
      (qu) => qu.questionText.toLowerCase().includes(q) || qu.questionType.toLowerCase().includes(q) || surveyTitle(qu.surveyId).toLowerCase().includes(q),
    );
  }, [questions, search, surveyTitle]);

  const filteredResponses = useMemo(() => {
    if (!search) return responses;
    const q = search.toLowerCase();
    return responses.filter(
      (r) => surveyTitle(r.surveyId).toLowerCase().includes(q) || r.responseValue.toLowerCase().includes(q) || r.status.toLowerCase().includes(q),
    );
  }, [responses, search, surveyTitle]);

  const filteredActions = useMemo(() => {
    if (!search) return actions;
    const q = search.toLowerCase();
    return actions.filter(
      (a) => a.title.toLowerCase().includes(q) || a.owner.toLowerCase().includes(q) || a.status.toLowerCase().includes(q) || a.priority.toLowerCase().includes(q),
    );
  }, [actions, search]);

  const tabs: { id: TabId; label: string; icon: typeof ClipboardList }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'surveys', label: 'Surveys', icon: ClipboardList },
    { id: 'questions', label: 'Questions', icon: HelpCircle },
    { id: 'responses', label: 'Responses', icon: MessageSquare },
    { id: 'actions', label: 'Actions', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
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

      {/* Search */}
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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Response Rate</div>
              <div className="mt-1 text-2xl font-bold">{metrics.responseRate}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Avg Score</div>
              <div className="mt-1 text-2xl font-bold">{metrics.averageScore}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Action Completion</div>
              <div className="mt-1 text-2xl font-bold">{metrics.actionCompletion}%</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Surveys</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalSurveys}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Total Responses</div>
              <div className="mt-1 text-2xl font-bold">{metrics.totalResponses}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Surveys</div>
              <div className="mt-1 text-2xl font-bold">{stats.activeSurveyCount}</div>
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
                <Badge key={status} variant={surveyStatusVariant(status as SurveyStatus)}>{status}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Action Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byActionStatus).map(([status, count]) => (
                <Badge key={status} variant={actionStatusVariant(status as ActionStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Action Priority Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byActionPriority).map(([priority, count]) => (
                <Badge key={priority} variant={priorityVariant(priority as ActionPriority)}>{priority}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'surveys' && (
        <div className="space-y-3">
          {filteredSurveys.length === 0 ? (
            <Card className="p-8"><EmptyState icon={ClipboardList} title="No surveys" description="Engagement surveys will appear here." /></Card>
          ) : (
            filteredSurveys.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-sm text-fg-secondary">{s.surveyType.replace('_', ' ')} · {s.targetAudience || 'All staff'} · {s.expectedResponses} expected</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.anonymous && <Badge variant="default">Anonymous</Badge>}
                    <Badge variant={surveyStatusVariant(s.status)}>{s.status}</Badge>
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
                    <div className="font-medium">{qu.questionText}</div>
                    <div className="text-sm text-fg-secondary">{surveyTitle(qu.surveyId)} · {qu.questionType.replace('_', ' ')} · Order {qu.order}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {qu.required && <Badge variant="default">Required</Badge>}
                    <Badge variant="info">{qu.questionType.replace('_', ' ')}</Badge>
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
            <Card className="p-8"><EmptyState icon={MessageSquare} title="No responses" description="Survey responses will appear here." /></Card>
          ) : (
            filteredResponses.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{surveyTitle(r.surveyId)} — {r.respondentId}</div>
                    <div className="text-sm text-fg-secondary">{r.responseValue || '—'} · Rating {r.ratingValue}{r.comments ? ` · ${r.comments}` : ''}</div>
                  </div>
                  <Badge variant={responseStatusVariant(r.status)}>{r.status.replace('_', ' ')}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'actions' && (
        <div className="space-y-3">
          {filteredActions.length === 0 ? (
            <Card className="p-8"><EmptyState icon={CheckCircle} title="No actions" description="Engagement action plans will appear here." /></Card>
          ) : (
            filteredActions.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-sm text-fg-secondary">{a.owner || 'Unassigned'} · {a.progress}% complete{a.dueDate ? ` · Due ${new Date(a.dueDate).toLocaleDateString()}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(a.priority)}>{a.priority}</Badge>
                    <Badge variant={actionStatusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
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
