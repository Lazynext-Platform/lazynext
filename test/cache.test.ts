import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { cache } from '@/lib/cache';

describe('Cache', () => {
  beforeEach(() => {
    cache.clear();
    cache.resetStats();
  });

  it('get returns null on miss', () => {
    const result = cache.get<string>('missing');
    assert.equal(result, null);
  });

  it('set + get returns the cached value', () => {
    cache.set('key1', 'value1');
    const result = cache.get<string>('key1');
    assert.equal(result, 'value1');
  });

  it('delete removes a cached entry', () => {
    cache.set('key2', 'value2');
    cache.delete('key2');
    const result = cache.get<string>('key2');
    assert.equal(result, null);
  });

  it('clear removes all entries', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    cache.clear();
    assert.equal(cache.get<number>('a'), null);
    assert.equal(cache.get<number>('b'), null);
    assert.equal(cache.get<number>('c'), null);
  });

  it('wrap calls fn on first call and returns cached on second', async () => {
    let callCount = 0;
    const fn = async (): Promise<string> => {
      callCount++;
      return `result-${callCount}`;
    };

    const first = await cache.wrap('wrap-key', fn);
    assert.equal(first, 'result-1');
    assert.equal(callCount, 1);

    const second = await cache.wrap('wrap-key', fn);
    assert.equal(second, 'result-1'); // cached, fn not called again
    assert.equal(callCount, 1);
  });

  it('wrap respects TTL and re-calls fn after expiry', async () => {
    let callCount = 0;
    const fn = async (): Promise<number> => {
      callCount++;
      return callCount;
    };

    const first = await cache.wrap('ttl-key', fn, 50); // 50ms TTL
    assert.equal(first, 1);

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    const second = await cache.wrap('ttl-key', fn, 50);
    assert.equal(second, 2); // fn called again
    assert.equal(callCount, 2);
  });

  it('getStats returns correct hits, misses, and hitRate', () => {
    cache.set('hit1', 'val1');
    cache.get<string>('hit1'); // hit
    cache.get<string>('hit1'); // hit
    cache.get<string>('miss1'); // miss

    const stats = cache.getStats();
    assert.equal(stats.hits, 2);
    assert.equal(stats.misses, 1);
    assert.equal(stats.hitRate, 0.667);
  });

  it('getStats size reflects current entries', () => {
    cache.set('k1', 'v1');
    cache.set('k2', 'v2');
    assert.equal(cache.getStats().size, 2);

    cache.delete('k1');
    assert.equal(cache.getStats().size, 1);
  });

  it('getStats returns hitRate 0 when no accesses', () => {
    const stats = cache.getStats();
    assert.equal(stats.hitRate, 0);
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
  });

  it('expired entries are evicted on read', async () => {
    cache.set('expire-key', 'value', 30); // 30ms TTL
    assert.equal(cache.get<string>('expire-key'), 'value'); // still valid

    await new Promise((resolve) => setTimeout(resolve, 40));

    const result = cache.get<string>('expire-key');
    assert.equal(result, null); // expired
    assert.equal(cache.getStats().size, 0); // evicted
  });

  it('set with Infinity TTL never expires', async () => {
    cache.set('forever', 'val', Infinity);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(cache.get<string>('forever'), 'val');
  });

  it('resetStats zeroes hit and miss counters', () => {
    cache.set('k', 'v');
    cache.get<string>('k'); // hit
    cache.get<string>('nope'); // miss

    cache.resetStats();
    const stats = cache.getStats();
    assert.equal(stats.hits, 0);
    assert.equal(stats.misses, 0);
  });
});
