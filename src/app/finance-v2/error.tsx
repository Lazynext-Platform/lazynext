'use client';

import { Button } from '@/components/ui';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="mb-8">
      <h1 className="heading-display text-2xl">Finance</h1>
    </div>
    <div className="rounded-lg border border-fg-danger/30 bg-fg-danger/5 p-6">
      <h2 className="text-sm font-medium text-fg-danger mb-2">Failed to load finance dashboard</h2>
      <p className="text-xs text-fg-secondary mb-4">An error occurred while loading financial data.</p>
      <Button onClick={reset} variant="primary">Try again</Button>
    </div>
    </div>
  );
}
