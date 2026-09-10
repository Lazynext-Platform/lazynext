'use client';

import { Button } from '@/components/ui';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="border-[3px] bg-surface p-8 text-center" style={{ borderColor: 'var(--c-ink)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-hard-lg)' }}>
          <h1 className="heading-display text-xl mb-2">Something went wrong</h1>
          <p className="text-sm text-fg-secondary mb-6">
            We couldn&apos;t load the onboarding wizard. Please try again.
          </p>
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
