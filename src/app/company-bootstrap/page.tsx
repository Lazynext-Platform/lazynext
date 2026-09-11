'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Rocket, Loader2, AlertCircle, Check, X, FileText, Target, ListTodo, Mail, Brain } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';

interface BootstrapResult {
  jobId: string;
  status: 'completed' | 'failed' | 'partial';
  steps: {
    research: boolean;
    landingPage: boolean;
    goals: boolean;
    tasks: boolean;
    documents: boolean;
    welcomeEmail: boolean;
    memories: boolean;
  };
  artifacts: {
    landingPageDocId?: string;
    goalIds: string[];
    taskIds: string[];
    documentIds: string[];
    memoryIds: string[];
  };
  research?: string;
  error?: string;
}

const CREDIT_COST = 10;

const STEP_ICONS: Record<string, typeof FileText> = {
  research: Brain,
  landingPage: FileText,
  goals: Target,
  tasks: ListTodo,
  documents: FileText,
  welcomeEmail: Mail,
  memories: Brain,
};

const STEP_LABELS: Record<string, string> = {
  research: 'Research',
  landingPage: 'Landing Page',
  goals: 'Starter Goals',
  tasks: 'Starter Tasks',
  documents: 'Starter Documents',
  welcomeEmail: 'Welcome Email',
  memories: 'Initial Memories',
};

export default function CompanyBootstrapperPage() {
  const { data: session } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [targetMarket, setTargetMarket] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BootstrapResult | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  const run = useCallback(async () => {
    if (!name.trim() || !description.trim()) return;
    if (!session?.user) {
      setShowAuth(true);
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/company/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, industry, targetMarket }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'bootstrap_failed');
        return;
      }
      setResult(data.result);
    } catch {
      setError('network_error');
    } finally {
      setLoading(false);
    }
  }, [name, description, industry, targetMarket, session]);

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="w-6 h-6 text-brand-accent" />
          Company Bootstrapper
        </h1>
        <p className="text-muted text-sm mt-1">
          The wow moment. Describe your company and Lazynext will research it, generate a landing page, create starter goals, tasks, documents, send a welcome email, and write initial memories — all in one step.
        </p>
        <p className="text-xs text-muted mt-1">Cost: {CREDIT_COST} credits</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium">Company name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Inc."
            className="w-full mt-1 p-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
            maxLength={100}
          />
        </div>
        <div>
          <label className="text-sm font-medium">What does your company do? *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="We help small businesses manage their inventory..."
            className="w-full mt-1 min-h-[100px] p-3 rounded-lg border border-border bg-surface text-sm resize-y focus:outline-none focus:ring-2 focus:ring-brand-accent"
            maxLength={2000}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium">Industry (optional)</label>
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="SaaS, E-commerce, etc."
              className="w-full mt-1 p-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Target market (optional)</label>
            <input
              value={targetMarket}
              onChange={(e) => setTargetMarket(e.target.value)}
              placeholder="Small businesses, enterprise, etc."
              className="w-full mt-1 p-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
              maxLength={100}
            />
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading || !name.trim() || !description.trim()}
          className="w-full px-4 py-3 rounded-lg bg-brand-accent text-white text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
          {loading ? 'Bootstrapping...' : `Bootstrap Company (${CREDIT_COST} credits)`}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-danger/30 bg-danger/10 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg border border-border bg-surface">
            <div className="flex items-center gap-2">
              {result.status === 'completed' ? (
                <Check className="w-5 h-5 text-success" />
              ) : result.status === 'partial' ? (
                <AlertCircle className="w-5 h-5 text-warning" />
              ) : (
                <X className="w-5 h-5 text-danger" />
              )}
              <span className="text-lg font-bold capitalize">{result.status}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-medium">Pipeline Steps</h2>
            {Object.entries(result.steps).map(([step, done]) => {
              const Icon = STEP_ICONS[step] || FileText;
              return (
                <div key={step} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-surface text-sm">
                  <Icon className="w-4 h-4 text-muted shrink-0" />
                  <span className="flex-1">{STEP_LABELS[step] || step}</span>
                  {done ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <X className="w-4 h-4 text-danger" />
                  )}
                </div>
              );
            })}
          </div>

          {result.research && (
            <div className="space-y-2">
              <h2 className="text-sm font-medium">Research Summary</h2>
              <div className="p-3 rounded-lg border border-border bg-surface text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                {result.research}
              </div>
            </div>
          )}

          {result.artifacts.goalIds.length > 0 && (
            <div className="text-xs text-muted">
              Created {result.artifacts.goalIds.length} goals, {result.artifacts.taskIds.length} tasks, {result.artifacts.documentIds.length} documents, {result.artifacts.memoryIds.length} memories
            </div>
          )}
        </div>
      )}

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
