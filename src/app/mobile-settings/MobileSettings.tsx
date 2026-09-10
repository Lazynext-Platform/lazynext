'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  Bell,
  BellOff,
  Wifi,
  Trash2,
  Smartphone,
  Monitor,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import {
  PWAInstall,
  initInstallPrompt,
  type Platform,
} from '@/lib/pwa/install-prompt';
import {
  OfflineManager,
  initOfflineManager,
  isOnline,
} from '@/lib/pwa/offline-manager';

interface StorageInfo {
  usage: number;
  quota: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export function MobileSettings() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [standalone, setStandalone] = useState(false);
  const [installable, setInstallable] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [online, setOnline] = useState(true);
  const [storage, setStorage] = useState<StorageInfo>({ usage: 0, quota: 0 });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    initInstallPrompt();
    initOfflineManager();

    const state = PWAInstall.getInstallState();
    setPlatform(state.platform);
    setStandalone(state.isInstalled);
    setInstallable(state.isInstallable);
    setOnline(isOnline());

    const offInstallable = PWAInstall.subscribeInstallable(() => setInstallable(true));
    const offInstalled = PWAInstall.subscribeInstalled(() => {
      setStandalone(true);
      setInstallable(false);
    });
    const offStatus = OfflineManager.subscribeStatusChange(setOnline);

    OfflineManager.getStorageEstimate().then(setStorage).catch(() => {});

    return () => {
      offInstallable();
      offInstalled();
      offStatus();
    };
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    const outcome = await PWAInstall.promptInstall();
    setInstalling(false);
    if (outcome === 'accepted') {
      setStandalone(true);
      setInstallable(false);
      setMessage('Installed successfully.');
    }
  };

  const handlePushToggle = useCallback(async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        // Unsubscribe — use the current service worker subscription.
        const reg = await navigator.serviceWorker?.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        if (sub) {
          await sub.unsubscribe();
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
        }
        setPushEnabled(false);
        setMessage('Push notifications disabled.');
      } else {
        // Subscribe — fetch VAPID key, then subscribe via PushManager.
        const keyRes = await fetch('/api/push/vapid-key');
        const { publicKey } = await keyRes.json();
        if (!publicKey) {
          setMessage('Push notifications are not configured.');
          setPushLoading(false);
          return;
        }
        const reg = await navigator.serviceWorker?.getRegistration();
        if (!reg) {
          setMessage('Service worker not registered.');
          setPushLoading(false);
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: publicKey,
        });
        const json = sub.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            keys: json.keys,
            expirationTime: sub.expirationTime,
          }),
        });
        setPushEnabled(true);
        setMessage('Push notifications enabled.');
      }
    } catch {
      setMessage('Could not change push notification settings.');
    } finally {
      setPushLoading(false);
    }
  }, [pushEnabled]);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const count = await OfflineManager.clearCache();
      setMessage(`Cleared ${count} cache${count === 1 ? '' : 's'}.`);
      setStorage(await OfflineManager.getStorageEstimate());
    } catch {
      setMessage('Could not clear cache.');
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-fg">
          <CheckCircle2 className="h-4 w-4 text-success" />
          {message}
        </div>
      )}

      {/* PWA Install status */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Download className="h-4 w-4 text-fg-muted" />
          <h2 className="text-sm font-bold text-fg">App Installation</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Status</span>
            {standalone ? (
              <Badge variant="success">Installed</Badge>
            ) : installable ? (
              <Badge variant="info">Installable</Badge>
            ) : (
              <Badge variant="default">Browser</Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Display mode</span>
            <span className="text-fg">
              {standalone ? 'Standalone PWA' : 'Browser tab'}
            </span>
          </div>
          {installable && !standalone && (
            <Button
              onClick={handleInstall}
              disabled={installing}
              className="mt-2 w-full"
            >
              {installing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Installing…
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Install Lazynext
                </>
              )}
            </Button>
          )}
        </div>
      </Card>

      {/* Push notifications */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {pushEnabled ? (
            <Bell className="h-4 w-4 text-fg-muted" />
          ) : (
            <BellOff className="h-4 w-4 text-fg-muted" />
          )}
          <h2 className="text-sm font-bold text-fg">Push Notifications</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Enabled</span>
            <Badge variant={pushEnabled ? 'success' : 'default'}>
              {pushEnabled ? 'On' : 'Off'}
            </Badge>
          </div>
          <Button
            onClick={handlePushToggle}
            disabled={pushLoading}
            variant={pushEnabled ? 'danger' : 'primary'}
            className="mt-2 w-full"
          >
            {pushLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Working…
              </>
            ) : pushEnabled ? (
              'Disable push notifications'
            ) : (
              'Enable push notifications'
            )}
          </Button>
        </div>
      </Card>

      {/* Offline storage */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wifi className="h-4 w-4 text-fg-muted" />
          <h2 className="text-sm font-bold text-fg">Offline &amp; Storage</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Connection</span>
            <Badge variant={online ? 'success' : 'warning'}>
              {online ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Storage used</span>
            <span className="text-fg">
              {formatBytes(storage.usage)}
              {storage.quota > 0 && ` / ${formatBytes(storage.quota)}`}
            </span>
          </div>
          <Button
            onClick={handleClearCache}
            disabled={clearing}
            variant="secondary"
            className="mt-2 w-full"
          >
            {clearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing…
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear cache
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Platform info */}
      <Card className="p-4">
        <div className="mb-3 flex items-center gap-2">
          {standalone ? (
            <Smartphone className="h-4 w-4 text-fg-muted" />
          ) : (
            <Monitor className="h-4 w-4 text-fg-muted" />
          )}
          <h2 className="text-sm font-bold text-fg">Platform</h2>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Platform</span>
            <span className="capitalize text-fg">{platform}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-fg-secondary">Display mode</span>
            <span className="text-fg">
              {standalone ? 'Standalone' : 'Browser'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
