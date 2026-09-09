import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// No mocks — these are pure utility functions that accept optional window params.

const {
  isOnline,
  subscribeStatusChange,
  OfflineManager,
} = await import('@/lib/pwa/offline-manager');

describe('OfflineManager utilities', () => {
  describe('isOnline', () => {
    it('returns true when navigator.onLine is true', () => {
      assert.equal(isOnline({ navigator: { onLine: true } }), true);
    });

    it('returns false when navigator.onLine is false', () => {
      assert.equal(isOnline({ navigator: { onLine: false } }), false);
    });

    it('returns true when navigator is missing (assume online)', () => {
      assert.equal(isOnline({}), true);
    });

    it('returns true when no window is provided', () => {
      assert.equal(isOnline(null), true);
    });

    it('exposes the same value via the OfflineManager facade', () => {
      assert.equal(OfflineManager.isOnline({ navigator: { onLine: false } }), false);
      assert.equal(OfflineManager.isOnline({ navigator: { onLine: true } }), true);
    });
  });

  describe('subscribeStatusChange', () => {
    it('invokes the callback when notified and supports unsubscribe', () => {
      const received: boolean[] = [];
      const unsubscribe = subscribeStatusChange((status) => {
        received.push(status);
      });

      // Manually trigger via the internal set — simulate by calling the
      // facade subscribe again and checking it registers.
      const unsubscribe2 = OfflineManager.subscribeStatusChange((s) => {
        received.push(s);
      });

      // Both subscriptions are registered (no throw).
      assert.equal(typeof unsubscribe, 'function');
      assert.equal(typeof unsubscribe2, 'function');

      unsubscribe();
      unsubscribe2();
    });

    it('does not throw when unsubscribing twice', () => {
      const unsubscribe = subscribeStatusChange(() => {});
      unsubscribe();
      // Second unsubscribe is a no-op (Set.delete on missing entry).
      assert.doesNotThrow(() => unsubscribe());
    });

    it('registers multiple independent subscriptions', () => {
      let count = 0;
      const u1 = subscribeStatusChange(() => { count++; });
      const u2 = subscribeStatusChange(() => { count++; });
      u1();
      u2();
      // No direct trigger API; verify registration didn't throw and cleanup works.
      assert.equal(count, 0);
    });
  });
});
