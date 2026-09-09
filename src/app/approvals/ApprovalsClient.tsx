'use client';

import { useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Button, Badge } from '@/components/ui';

interface ApprovalsClientProps {
  approvalId: string;
}

export function ApprovalsClient({ approvalId }: ApprovalsClientProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<'approved' | 'rejected' | null>(null);

  async function handleDecision(decision: 'approve' | 'reject') {
    setLoading(decision);
    setError(null);
    try {
      const res = await fetch(`/api/approvals/${approvalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed_to_decide');
      }
      setDecided(decision === 'approve' ? 'approved' : 'rejected');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  }

  if (decided) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        {decided === 'approved' ? (
          <Badge variant="success" className="text-xs">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        ) : (
          <Badge variant="danger" className="text-xs">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="primary"
          disabled={loading !== null}
          onClick={() => handleDecision('approve')}
        >
          {loading === 'approve' ? 'Approving…' : 'Approve'}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={loading !== null}
          onClick={() => handleDecision('reject')}
        >
          {loading === 'reject' ? 'Rejecting…' : 'Reject'}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
