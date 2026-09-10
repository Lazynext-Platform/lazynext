import { Package } from 'lucide-react';

export default function AssetTrackingLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center gap-2">
        <Package className="h-6 w-6 text-accent-primary" />
        <h1 className="heading-display text-2xl">Asset Tracking</h1>
      </div>
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-bg-secondary" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-bg-secondary" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-lg bg-bg-secondary" />
      </div>
    </div>
  );
}
