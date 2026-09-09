import { Workflow } from 'lucide-react';

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Workflow className="h-6 w-6 text-accent-primary animate-pulse" />
          <h1 className="heading-display text-2xl">Workflow Builder</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Design, test, and publish automated workflows.</p>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-3 w-16 bg-border rounded mb-2" />
            <div className="h-6 w-12 bg-border rounded" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-3 animate-pulse">
              <div className="h-4 w-24 bg-border rounded mb-2" />
              <div className="h-3 w-16 bg-border rounded" />
            </div>
          ))}
        </div>
        <div className="lg:col-span-6">
          <div className="card p-8 min-h-[400px] animate-pulse">
            <div className="h-6 w-32 bg-border rounded mx-auto" />
          </div>
        </div>
        <div className="lg:col-span-3 space-y-2">
          <div className="card p-3 animate-pulse">
            <div className="h-4 w-20 bg-border rounded mb-2" />
            <div className="h-8 w-full bg-border rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
