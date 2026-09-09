'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center py-16">
      <div className="max-w-md px-6 text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-fg-muted" />
        <h1 className="heading-display text-lg">Something went wrong</h1>
        <p className="mt-2 text-sm text-fg-secondary">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="text-sm text-fg-secondary transition hover:text-fg"
          >
            Try again
          </button>
          <a
            href="/dashboard"
            className="text-sm text-fg-secondary transition hover:text-fg"
          >
            Go to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
