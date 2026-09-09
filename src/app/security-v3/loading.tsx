import { Shield } from 'lucide-react';

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-accent-primary" />
          <h1 className="heading-display text-2xl">Security Center</h1>
        </div>
        <p className="text-sm text-fg-secondary mt-1">Loading security settings…</p>
      </div>
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-3 w-20 bg-fg-muted/20 rounded mb-2" />
              <div className="h-6 w-16 bg-fg-muted/20 rounded" />
            </div>
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 w-48 bg-fg-muted/20 rounded mb-3" />
            <div className="h-8 w-full bg-fg-muted/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
