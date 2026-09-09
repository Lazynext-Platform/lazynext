import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// No mocks — these are pure utility functions that accept optional window/navigator.

const {
  getPlatform,
  isStandalone,
  getInstallState,
  PWAInstall,
} = await import('@/lib/pwa/install-prompt');

describe('PWAInstall utilities', () => {
  beforeEach(() => {
    // Ensure no deferred prompt leaks between tests.
  });

  describe('getPlatform', () => {
    it('detects iOS from iPhone user-agent', () => {
      assert.equal(
        getPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' }),
        'ios',
      );
    });

    it('detects Android from user-agent', () => {
      assert.equal(
        getPlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)' }),
        'android',
      );
    });

    it('detects Windows from user-agent', () => {
      assert.equal(
        getPlatform({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }),
        'windows',
      );
    });

    it('detects Mac from user-agent', () => {
      assert.equal(
        getPlatform({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)' }),
        'mac',
      );
    });

    it('detects Linux from user-agent', () => {
      assert.equal(
        getPlatform({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }),
        'linux',
      );
    });

    it('returns unknown for empty/missing user-agent', () => {
      assert.equal(getPlatform({}), 'unknown');
      assert.equal(getPlatform(null), 'unknown');
    });
  });

  describe('isStandalone', () => {
    it('returns true when iOS navigator.standalone is true', () => {
      assert.equal(isStandalone({ navigator: { standalone: true } }), true);
    });

    it('returns true when display-mode: standalone media query matches', () => {
      assert.equal(
        isStandalone({
          matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' }),
        }),
        true,
      );
    });

    it('returns false in regular browser mode', () => {
      assert.equal(
        isStandalone({
          matchMedia: () => ({ matches: false }),
          navigator: { standalone: false },
        }),
        false,
      );
    });

    it('returns false when no window is provided', () => {
      assert.equal(isStandalone(null), false);
    });
  });

  describe('getInstallState', () => {
    it('reports installed + platform from a standalone iOS window', () => {
      const state = getInstallState({
        navigator: { userAgent: 'iPhone', standalone: true },
      });
      assert.equal(state.isInstalled, true);
      assert.equal(state.platform, 'ios');
      assert.equal(state.isInstallable, false);
    });

    it('reports not installed in a regular browser', () => {
      const state = getInstallState({
        matchMedia: () => ({ matches: false }),
        navigator: { userAgent: 'Android' },
      });
      assert.equal(state.isInstalled, false);
      assert.equal(state.platform, 'android');
    });

    it('exposes the same values via the PWAInstall facade', () => {
      assert.equal(PWAInstall.getPlatform({ userAgent: 'Windows NT 10.0' }), 'windows');
      assert.equal(PWAInstall.isStandalone({ navigator: { standalone: true } }), true);
      const state = PWAInstall.getInstallState({ navigator: { userAgent: 'Linux', standalone: false } });
      assert.equal(state.platform, 'linux');
      assert.equal(state.isInstalled, false);
    });
  });
});
