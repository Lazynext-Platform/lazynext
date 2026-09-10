'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { OfflineManager, initOfflineManager, isOnline } from '@/lib/pwa/offline-manager';

export function OfflineIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    initOfflineManager();
    setOnline(isOnline());

    const unsubscribe = OfflineManager.subscribeStatusChange((status) => {
      setOnline(status);
    });

    return unsubscribe;
  }, []);

  if (online) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[70] pt-safe"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 bg-warning px-4 py-2 text-center text-xs font-medium text-white">
        <WifiOff className="h-4 w-4 shrink-0" />
        <span>You&apos;re offline — some features may be unavailable</span>
      </div>
    </div>
  );
}
