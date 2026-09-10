'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface PlanFromGoalButtonProps {
  goalId: string;
  goalTitle: string;
}

export function PlanFromGoalButton({ goalId, goalTitle }: PlanFromGoalButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ planId?: string; error?: string } | null>(null);

  async function handlePlan() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/planner/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          objective: `Create a plan to achieve: ${goalTitle}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'failed_to_plan');
      }
      setResult({ planId: data.plan?.planId });
      // Redirect to plans page after a short delay
      setTimeout(() => {
        router.push('/plans');
      }, 1500);
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setLoading(false);
    }
  }

  if (result?.planId) {
    return (
      <span className="text-xs text-success flex items-center gap-1">
        <Zap className="h-3 w-3" /> Plan created — redirecting…
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {result?.error && (
        <span className="text-xs text-danger">{result.error}</span>
      )}
      <Button
        variant="secondary"
        onClick={handlePlan}
        disabled={loading}
        className="text-xs"
      >
        {loading ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Planning…</>
        ) : (
          <><Zap className="h-3 w-3" /> Plan</>
        )}
      </Button>
    </div>
  );
}
