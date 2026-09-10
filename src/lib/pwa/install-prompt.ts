/**
 * PWA install-prompt manager.
 *
 * Tracks the deferred `beforeinstallprompt` event so the UI can trigger the
 * native install dialog on demand, detects whether the app is already running
 * as an installed standalone PWA, and reports the host platform.
 *
 * The core detection helpers (`isStandalone`, `getPlatform`, `getInstallState`)
 * accept optional `win`/`nav` parameters so they can be unit-tested in Node
 * without a real browser environment.
 */

export type Platform = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';

export interface InstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  platform: Platform;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallableCallback = (evt: BeforeInstallPromptEvent) => void;
type InstalledCallback = () => void;

const installableCallbacks = new Set<InstallableCallback>();
const installedCallbacks = new Set<InstalledCallback>();

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let initialized = false;

/**
 * Detect the host platform from the user-agent string.
 * Accepts an optional navigator-like object for testability.
 */
export function getPlatform(nav?: { userAgent?: string } | null): Platform {
  const ua = nav?.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/windows/i.test(ua)) return 'windows';
  if (/mac os|macintosh|macpowerpc/i.test(ua)) return 'mac';
  if (/linux/i.test(ua)) return 'linux';
  return 'unknown';
}

/**
 * Determine whether the app is running as a standalone (installed) PWA.
 * Accepts an optional window-like object for testability.
 */
export function isStandalone(
  win?: {
    matchMedia?: (q: string) => { matches: boolean };
    navigator?: { standalone?: boolean; userAgent?: string };
  } | null,
): boolean {
  const w = win || (typeof window !== 'undefined' ? window : null);
  if (!w) return false;
  // iOS Safari exposes navigator.standalone
  const nav = w.navigator as { standalone?: boolean } | undefined;
  if (nav?.standalone === true) return true;
  // Chrome / Edge / Firefox expose the display-mode media query
  if (w.matchMedia && w.matchMedia('(display-mode: standalone)').matches) return true;
  return false;
}

/**
 * Return the current install state: installable, installed, and platform.
 */
export function getInstallState(
  win?: {
    matchMedia?: (q: string) => { matches: boolean };
    navigator?: { userAgent?: string; standalone?: boolean };
  } | null,
): InstallState {
  const w = win || (typeof window !== 'undefined' ? window : null);
  return {
    isInstallable: deferredPrompt !== null,
    isInstalled: isStandalone(w),
    platform: getPlatform(w?.navigator ?? null),
  };
}

/**
 * Trigger the native install prompt if a deferred event is available.
 * Returns the user's choice, or null if no prompt is available.
 */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!deferredPrompt) return null;
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return choice.outcome;
}

/**
 * Subscribe to the `beforeinstallprompt` event (app becomes installable).
 * Returns an unsubscribe function.
 */
export function subscribeInstallable(callback: InstallableCallback): () => void {
  installableCallbacks.add(callback);
  return () => installableCallbacks.delete(callback);
}

/**
 * Subscribe to the `appinstalled` event (app was installed).
 * Returns an unsubscribe function.
 */
export function subscribeInstalled(callback: InstalledCallback): () => void {
  installedCallbacks.add(callback);
  return () => installedCallbacks.delete(callback);
}

/**
 * Attach the browser event listeners. Safe to call once on the client.
 */
export function initInstallPrompt(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installableCallbacks.forEach((cb) => cb(deferredPrompt!));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installedCallbacks.forEach((cb) => cb());
  });
}

/**
 * Singleton facade matching the requested API shape.
 */
export const PWAInstall = {
  getInstallState,
  promptInstall,
  isStandalone,
  getPlatform,
  subscribeInstallable,
  subscribeInstalled,
  init: initInstallPrompt,
};
