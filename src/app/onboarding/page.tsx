'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, FolderKanban, Sparkles, Zap } from 'lucide-react';
import { Button, Input, Textarea } from '@/components/ui';

const STEPS = ['welcome', 'workspace', 'project', 'done'] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [workspaceName, setWorkspaceName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function completeOnboarding(skipProject: boolean) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceName: workspaceName.trim() || undefined,
          projectName: skipProject ? undefined : projectName.trim(),
          projectDescription: projectDescription.trim() || undefined,
          skipProject,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to complete onboarding');
      }
      setStep('done');
      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
      setLoading(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span
            className="flex h-12 w-12 items-center justify-center border-2 text-xl font-black"
            style={{
              borderColor: 'var(--c-ink)',
              backgroundColor: 'var(--c-accent)',
              color: 'var(--c-accent-fg)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hard)',
            }}
          >
            L
          </span>
          <span className="heading-display text-2xl">Lazynext</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="flex-1 h-2 border-2 transition-all"
              style={{
                borderColor: 'var(--c-ink)',
                backgroundColor: i <= stepIndex ? 'var(--c-accent)' : 'var(--c-surface)',
                borderRadius: 'var(--radius-sm)',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div
          className="border-[3px] bg-surface p-8"
          style={{
            borderColor: 'var(--c-ink)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-hard-lg)',
          }}
        >
          {step === 'welcome' && (
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--c-accent)' }} />
              <h1 className="heading-display text-xl mb-2">Welcome to Lazynext!</h1>
              <p className="text-sm text-fg-secondary mb-6">
                Let&apos;s set up your workspace in a few quick steps. You&apos;ll be ready to work in under a minute.
              </p>
              <Button onClick={() => setStep('workspace')} className="w-full">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-3 text-sm text-fg-muted hover:text-fg transition-colors"
              >
                Skip for now
              </button>
            </div>
          )}

          {step === 'workspace' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-10 w-10 items-center justify-center border-2"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="heading-display text-lg">Name your workspace</h1>
                  <p className="text-xs text-fg-secondary">This is where you and your team will work.</p>
                </div>
              </div>
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. My Team Workspace"
                autoFocus
                className="mb-4"
              />
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setStep('project')}
                  disabled={loading}
                  className="flex-1"
                >
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setStep('project')}
                  variant="ghost"
                >
                  Use default
                </Button>
              </div>
            </div>
          )}

          {step === 'project' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="flex h-10 w-10 items-center justify-center border-2"
                  style={{ borderColor: 'var(--c-ink)', backgroundColor: 'var(--c-surface-alt)', borderRadius: 'var(--radius-sm)' }}
                >
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="heading-display text-lg">Create your first project</h1>
                  <p className="text-xs text-fg-secondary">Projects organize tasks, documents, and files.</p>
                </div>
              </div>
              <div className="flex flex-col gap-3 mb-4">
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Project name (e.g. Launch Campaign)"
                  autoFocus
                />
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="What is this project about? (optional)"
                  rows={3}
                />
              </div>
              {error && <p className="text-sm text-danger mb-3">{error}</p>}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => completeOnboarding(false)}
                  disabled={loading || !projectName.trim()}
                  className="flex-1"
                >
                  {loading ? 'Setting up...' : 'Create project & finish'}
                </Button>
                <Button
                  onClick={() => completeOnboarding(true)}
                  variant="ghost"
                  disabled={loading}
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center">
              <div
                className="flex h-16 w-16 mx-auto items-center justify-center border-2 mb-4"
                style={{
                  borderColor: 'var(--c-ink)',
                  backgroundColor: 'var(--c-success)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-hard)',
                }}
              >
                <Check className="h-8 w-8" style={{ color: 'var(--c-surface)' }} strokeWidth={3} />
              </div>
              <h1 className="heading-display text-xl mb-2">You&apos;re all set!</h1>
              <p className="text-sm text-fg-secondary mb-4">
                Your workspace is ready. Redirecting to your dashboard...
              </p>
              <div className="flex items-center justify-center gap-1 text-sm text-fg-muted">
                <span className="inline-block h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--c-accent)' }} />
                Loading...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
