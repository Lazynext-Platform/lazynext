'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { PWAInstall, initInstallPrompt } from '@/lib/pwa/install-prompt';

const DISMISS_KEY = 'lazynext-install-dismissed';
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function InstallBanner() {
  const [installable, setInstallable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    initInstallPrompt();

    // Respect prior dismissal (with TTL).
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = Number(raw);
        if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) {
          setDismissed(true);
        }
      }
    } catch {
      // localStorage may be unavailable — ignore.
    }

    const state = PWAInstall.getInstallState();
    setInstalled(state.isInstalled);
    setInstallable(state.isInstallable);

    const offInstallable = PWAInstall.subscribeInstallable(() => {
      setInstallable(true);
    });
    const offInstalled = PWAInstall.subscribeInstalled(() => {
      setInstalled(true);
      setInstallable(false);
    });

    return () => {
      offInstallable();
      offInstalled();
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await PWAInstall.promptInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      setInstalled(true);
      setInstallable(false);
    } else if (outcome === 'dismissed') {
      dismiss();
    }
  };

  if (installed || dismissed || !installable) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[55] translate-y-0 animate-[slide-up_0.3s_ease-out] pb-safe"
      role="dialog"
      aria-label="Install Lazynext"
    >
      <div className="mx-auto max-w-md border-t border-line bg-app px-4 py-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00b2fc]/15">
            <Download className="h-5 w-5 text-[#00b2fc]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg">Install Lazynext</p>
            <p className="truncate text-xs text-fg-secondary">
              Add to your home screen for a faster, full-screen experience.
            </p>
          </div>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="btn-primary shrink-0 px-3 py-1.5 text-xs"
            style={{ touchAction: 'manipulation' }}
          >
            {installing ? 'Installing…' : 'Install'}
          </button>
          <button
            onClick={dismiss}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-fg-faint hover:bg-hover"
            aria-label="Not now"
            style={{ touchAction: 'manipulation' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
