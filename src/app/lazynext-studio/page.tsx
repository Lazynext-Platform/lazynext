'use client';

// Phase 30 perf: code-split the heavy marketing studio UI so the initial
// page bundle stays small. The full interactive component (and its transitive
// imports — formats, hooks, polling, resume, etc.) is loaded on demand.
import dynamic from 'next/dynamic';

const MarketingStudioPage = dynamic(
  () => import('./MarketingStudioContent').then((m) => m.MarketingStudioPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg-secondary border-t-transparent" />
      </div>
    ),
  },
);

export default function LazynextStudioPage() {
  return <MarketingStudioPage />;
}
