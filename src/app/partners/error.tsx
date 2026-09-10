'use client';

export default function Error() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center">
        <h1 className="heading-display text-xl mb-2">Something went wrong</h1>
        <p className="text-sm text-fg-secondary mb-4">Failed to load partner management data.</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
