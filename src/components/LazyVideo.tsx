'use client';

import { useRef } from 'react';

/**
 * Card preview video. Previous implementation: preload='auto' + play() on entering viewport,
 * a screen with a dozen cards → a dozen videos all fully loading at once (all via worker R2 proxy)
 * → page freezes completely.
 *
 * Now: default preload='metadata' + `#t=0.1` only fetches the first frame as poster (not blank, negligible bandwidth),
 * only truly loads and plays on hover (usually only 1 playing at a time). Missing src renders a placeholder (no 404).
 */
export function LazyVideo({ src, className }: { src?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  if (!src) return <div className={`${className || ''} bg-elevated`} aria-hidden />;
  return (
    <video
      ref={ref}
      src={`${src}#t=0.1`}
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => ref.current?.pause()}
    />
  );
}
