'use client';

import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui';

export default function CorporateLibraryError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-accent-primary" />
        <h1 className="heading-display text-2xl">Corporate Library</h1>
      </div>
      <div className="rounded-lg border border-border-danger bg-bg-danger-subtle p-8 text-center">
        <h2 className="text-lg font-semibold text-fg-danger">Something went wrong</h2>
        <p className="mt-2 text-sm text-fg-secondary">
          An error occurred while loading the corporate library dashboard.
        </p>
        <div className="mt-4">
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
