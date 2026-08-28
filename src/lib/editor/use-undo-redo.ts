'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Undo/redo stack for timeline editing.
 * Stores snapshots of the timeline state.
 * Limits to 50 entries to avoid memory bloat.
 */
export function useUndoRedo<T>(initial: T, maxStack = 50) {
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initial);
  const skipNextRef = useRef(false);

  // Set a new state without recording history (e.g., loading from DB)
  const reset = useCallback((value: T) => {
    skipNextRef.current = true;
    setPast([]);
    setFuture([]);
    setPresent(value);
  }, []);

  // Set a new state and record the previous one in history
  const commit = useCallback((value: T | ((prev: T) => T)) => {
    setPresent(prev => {
      const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value;
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return next;
      }
      setPast(p => [...p.slice(-(maxStack - 1)), prev]);
      setFuture([]);
      return next;
    });
  }, [maxStack]);

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p;
      const previous = p[p.length - 1];
      setPresent(cur => {
        setFuture(f => [cur, ...f]);
        return previous;
      });
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      setPresent(cur => {
        setPast(p => [...p, cur]);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  return { present, commit, reset, undo, redo, canUndo, canRedo };
}
