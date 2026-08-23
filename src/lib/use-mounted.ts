'use client';

import { useEffect, useState } from 'react';

/**
 * Prevents components depending on client-only state (next-auth session / localStorage locale etc.) from having
 * hydration mismatch between first frame and SSR render (React #418/#423). First frame uniformly returns false
 * (aligns with SSR rendering placeholder/null), and only renders real state after mounted (useEffect only runs on client).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
