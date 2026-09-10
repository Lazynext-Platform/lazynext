'use client';

import { useEffect } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[security-v3] error:', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Security Center</h1>
        </div>
      </div>
      <div className="card p-8">
        <div className="flex flex-col items-center text-center">
          <Shield className="h-12 w-12 text-fg-muted mb-4" />
          <h2 className="heading-display text-lg mb-2">Something went wrong</h2>
          <p className="text-sm text-fg-secondary mb-6">
            Failed to load security settings. Please try again.
          </p>
          <Button variant="primary" onClick={reset}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
