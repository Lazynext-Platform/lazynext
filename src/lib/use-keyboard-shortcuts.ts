'use client';

import { useEffect, useState } from 'react';

export interface ShortcutDef {
  key: string;          // e.g. 'j', 'k', 'l', '1', '2', '3', '?'
  description: string;  // human-readable description for help overlay
  handler: () => void;
  ctrl?: boolean;       // require Ctrl/Cmd
  shift?: boolean;      // require Shift
  alt?: boolean;        // require Alt
  preventDefault?: boolean;
}

/**
 * Register keyboard shortcuts. Returns a function to toggle the help overlay.
 * Shortcuts are ignored when focus is in an input, textarea, or select element
 * (except for Escape and ?).
 */
export function useKeyboardShortcuts(shortcuts: ShortcutDef[], helpTitle: string) {
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Show/hide help overlay
      if (e.key === '?' && !isTyping(e)) {
        e.preventDefault();
        setShowHelp(prev => !prev);
        return;
      }
      if (e.key === 'Escape') {
        setShowHelp(false);
        return;
      }

      // Don't trigger shortcuts while typing in inputs
      if (isTyping(e)) return;

      for (const shortcut of shortcuts) {
        if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;
        if (!!shortcut.ctrl !== (e.ctrlKey || e.metaKey)) continue;
        if (!!shortcut.shift !== e.shiftKey) continue;
        if (!!shortcut.alt !== e.altKey) continue;
        if (shortcut.preventDefault !== false) e.preventDefault();
        shortcut.handler();
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);

  return { showHelp, setShowHelp, helpTitle };
}

function isTyping(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}
