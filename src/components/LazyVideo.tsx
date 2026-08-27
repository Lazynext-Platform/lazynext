'use client';

import { useRef, useState, useEffect } from 'react';

/**
 * Card preview video with IntersectionObserver-based lazy loading.
 *
 * - src is NOT set until the card scrolls near the viewport (rootMargin 200px).
 * - Before intersection: renders a lightweight placeholder div (0 network requests).
 * - After intersection: sets src with `#t=0.1` + preload='metadata' (fetches first frame only).
 * - Plays on hover, pauses on mouse leave (usually only 1 playing at a time).
 * - Missing src renders a placeholder (no 404).
 */
export function LazyVideo({ src, className }: { src?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  if (!src) return <div ref={containerRef} className={`${className || ''} bg-elevated`} aria-hidden />;
  return (
    <div ref={containerRef} className={className} aria-hidden>
      {visible ? (
        <video
          ref={ref}
          src={`${src}#t=0.1`}
          muted
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover"
          onMouseEnter={() => ref.current?.play().catch(() => {})}
          onMouseLeave={() => ref.current?.pause()}
        />
      ) : (
        <div className="absolute inset-0 bg-elevated" />
      )}
    </div>
  );
}
