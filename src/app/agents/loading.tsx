import { Loader2 } from 'lucide-react';

export default function SegmentLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-fg-muted" />
    </div>
  );
}
