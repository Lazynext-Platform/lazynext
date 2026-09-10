'use client';

// Phase 30 perf: code-split the heavy creative-assets gallery UI so the
// initial page bundle stays small. The full interactive component is loaded
// on demand.
import dynamic from 'next/dynamic';

const CreativeAssetsPage = dynamic(
  () => import('./CreativeAssetsContent').then((m) => m.CreativeAssetsPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-fg-secondary border-t-transparent" />
      </div>
    ),
  },
);

export default function CreativeAssetsRoutePage() {
  return <CreativeAssetsPage />;
}
