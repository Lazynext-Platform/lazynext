'use client';

import { useState } from 'react';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  Lightbulb,
  Target,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';

interface DashboardData {
  recentOutcomes: Array<{
    id: string;
    content: string;
    source: string;
    createdAt: string;
    confidence: number;
  }>;
  topInsights: Array<{
    insight: string;
    confidence: number;
    evidence: string[];
    recommendation: string;
  }>;
  atRiskPlans: Array<{
    id: string;
    title: string;
    status: string;
    objective: string;
  }>;
  cycleHistory: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
  recommendations: Array<{
    insight: string;
    recommendation: string;
    confidence: number;
  }>;
  stats: {
    totalOutcomes: number;
    successRate: number;
    lastCycleAt: string | null;
  };
}

interface LearningDashboardProps {
  dashboard: DashboardData;
  workspaceId: string;
  organizationId: string;
}

function getOutcomeIcon(content: string) {
  const lower = content.toLowerCase();
  if (lower.includes('success')) return <CheckCircle className="h-4 w-4 text-success" />;
  if (lower.includes('failure')) return <XCircle className="h-4 w-4 text-danger" />;
  return <AlertTriangle className="h-4 w-4 text-warning" />;
}

function getOutcomeVariant(content: string): 'success' | 'danger' | 'warning' | 'default' {
  const lower = content.toLowerCase();
  if (lower.includes('success')) return 'success';
  if (lower.includes('failure')) return 'danger';
  if (lower.includes('partial')) return 'warning';
  return 'default';
}

function confidenceVariant(confidence: number): 'success' | 'warning' | 'default' {
  if (confidence >= 0.8) return 'success';
  if (confidence >= 0.5) return 'warning';
  return 'default';
}

export function LearningDashboard({ dashboard, workspaceId, organizationId }: LearningDashboardProps) {
  const [running, setRunning] = useState(false);
  const [cycleResult, setCycleResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRunCycle() {
    setRunning(true);
    setError(null);
    setCycleResult(null);
    try {
      const res = await fetch('/api/learning/cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, organizationId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_run_cycle');
      }
      const data = await res.json();
      const s = data.summary;
      setCycleResult(
        `Cycle complete: ${s.evaluated} evaluated, ${s.insights.length} insights, ${s.plansUpdated} plans updated, ${s.tasksReprioritized} tasks reprioritized, ${s.goalsAdjusted} goals adjusted.`,
      );
      setTimeout(() => window.location.reload(), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setRunning(false);
    }
  }

  const { recentOutcomes, topInsights, atRiskPlans, cycleHistory, recommendations, stats } = dashboard;

  return (
    <div className="space-y-6">
      {/* Stats + Run Cycle */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Brain className="h-3 w-3" /> Outcomes
          </div>
          <div className="text-2xl font-semibold">{stats.totalOutcomes}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <TrendingUp className="h-3 w-3" /> Success Rate
          </div>
          <div className="text-2xl font-semibold">{Math.round(stats.successRate * 100)}%</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-fg-secondary text-xs mb-1">
            <Clock className="h-3 w-3" /> Last Cycle
          </div>
          <div className="text-sm font-medium">
            {stats.lastCycleAt ? new Date(stats.lastCycleAt).toLocaleDateString() : 'Never'}
          </div>
        </Card>
        <Card className="p-4 flex items-center justify-center">
          <Button size="sm" onClick={handleRunCycle} disabled={running}>
            <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Running…' : 'Run Learning Cycle'}
          </Button>
        </Card>
      </div>

      {cycleResult && (
        <Card className="p-4 border-success">
          <p className="text-sm text-success">{cycleResult}</p>
        </Card>
      )}
      {error && (
        <Card className="p-4 border-danger">
          <p className="text-sm text-danger">{error}</p>
        </Card>
      )}

      {/* Top Insights */}
      <div>
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4" /> Top Insights
        </h2>
        {topInsights.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Lightbulb}
              title="No insights yet"
              description="Run a learning cycle to extract insights from outcomes."
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {topInsights.slice(0, 5).map((insight, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{insight.insight}</span>
                      <Badge variant={confidenceVariant(insight.confidence)} className="text-xs">
                        {Math.round(insight.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-fg-secondary">{insight.recommendation}</p>
                    {insight.evidence.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-fg-muted cursor-pointer">Evidence ({insight.evidence.length})</summary>
                        <ul className="mt-1 space-y-1">
                          {insight.evidence.map((ev, j) => (
                            <li key={j} className="text-xs text-fg-muted">{ev}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recent Outcomes */}
      <div>
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4" /> Recent Outcomes
        </h2>
        {recentOutcomes.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Brain}
              title="No outcomes recorded"
              description="Outcomes will appear here after tasks and agent runs are evaluated."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {recentOutcomes.slice(0, 10).map((outcome) => (
              <Card key={outcome.id} className="p-3">
                <div className="flex items-start gap-3">
                  {getOutcomeIcon(outcome.content)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{outcome.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getOutcomeVariant(outcome.content)} className="text-xs">
                        {outcome.source}
                      </Badge>
                      <span className="text-xs text-fg-muted">
                        {new Date(outcome.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* At-Risk Plans */}
      <div>
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> At-Risk Plans
        </h2>
        {atRiskPlans.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={CheckCircle}
              title="No at-risk plans"
              description="All plans are on track."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {atRiskPlans.map((plan) => (
              <Card key={plan.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="danger" className="text-xs">{plan.status}</Badge>
                  <span className="text-sm font-semibold">{plan.title}</span>
                </div>
                <p className="text-sm text-fg-secondary">{plan.objective}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div>
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Target className="h-4 w-4" /> Recommendations
        </h2>
        {recommendations.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Target}
              title="No recommendations yet"
              description="Run a learning cycle to generate recommendations."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-start gap-2">
                  <ArrowUp className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{rec.insight}</p>
                    <p className="text-xs text-fg-secondary mt-1">{rec.recommendation}</p>
                  </div>
                  <Badge variant={confidenceVariant(rec.confidence)} className="text-xs shrink-0">
                    {Math.round(rec.confidence * 100)}%
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Learning History */}
      <div>
        <h2 className="heading-display text-sm mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" /> Learning History
        </h2>
        {cycleHistory.length === 0 ? (
          <Card className="p-6">
            <EmptyState
              icon={Clock}
              title="No learning cycles yet"
              description="Run your first learning cycle to see history here."
            />
          </Card>
        ) : (
          <div className="space-y-2">
            {cycleHistory.map((entry) => (
              <Card key={entry.id} className="p-3">
                <div className="flex items-start gap-3">
                  <RefreshCw className="h-4 w-4 text-fg-muted mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.content}</p>
                    <span className="text-xs text-fg-muted">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
