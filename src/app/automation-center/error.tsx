'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function SegmentError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-md text-center px-6">
        <AlertCircle className="h-10 w-10 mx-auto mb-4 text-fg-muted" />
        <h1 className="heading-display text-lg">Something went wrong</h1>
        <p className="mt-2 text-sm text-fg-secondary">{error.message || 'An unexpected error occurred.'}</p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button onClick={reset} className="text-sm text-fg-secondary hover:text-fg transition">Try again</button>
          <a href="/dashboard" className="text-sm text-fg-secondary hover:text-fg transition">Go to dashboard</a>
        </div>
      </div>
    </div>
  );
}
