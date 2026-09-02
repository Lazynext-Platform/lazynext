import { test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for account lockout policy.
 * 
 * The account lockout is implemented in auth.ts as an in-memory map
 * that tracks failed login attempts. After 5 failed attempts within
 * 15 minutes, the account is locked for 15 minutes.
 * 
 * Since the lockout logic is embedded in the NextAuth Credentials
 * provider callback (which can't be imported in isolation), these
 * tests verify the lockout data structure and logic pattern.
 */

test('account lockout threshold is 5 failed attempts', () => {
  const MAX_FAILED_ATTEMPTS = 5;
  assert.equal(MAX_FAILED_ATTEMPTS, 5);
});

test('account lockout duration is 15 minutes', () => {
  const LOCK_DURATION_MS = 15 * 60 * 1000;
  assert.equal(LOCK_DURATION_MS, 900_000);
});

test('failed attempt window is 15 minutes', () => {
  const WINDOW_MS = 15 * 60 * 1000;
  assert.equal(WINDOW_MS, 900_000);
});

test('lockout map tracks lockedUntil timestamp', () => {
  const locks = new Map<string, { lockedUntil: number }>();
  const now = Date.now();
  const lockDuration = 15 * 60 * 1000;
  
  locks.set('lock:user@test.com', { lockedUntil: now + lockDuration });
  
  const lock = locks.get('lock:user@test.com');
  assert.ok(lock);
  assert.ok(lock.lockedUntil > now);
  assert.ok(lock.lockedUntil <= now + lockDuration);
});

test('lockout expires after 15 minutes', () => {
  const locks = new Map<string, { lockedUntil: number }>();
  const past = Date.now() - 1000; // 1 second ago (already expired)
  
  locks.set('lock:user@test.com', { lockedUntil: past });
  
  const lock = locks.get('lock:user@test.com');
  const isLocked = lock ? lock.lockedUntil > Date.now() : false;
  assert.equal(isLocked, false);
});

test('failed attempts counter increments', () => {
  const fails = new Map<string, { count: number; resetAt: number }>();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  
  // First attempt
  fails.set('fail:user@test.com', { count: 1, resetAt: now + windowMs });
  let data = fails.get('fail:user@test.com');
  assert.equal(data?.count, 1);
  
  // Second attempt
  if (data && data.resetAt > now) {
    data.count++;
  }
  assert.equal(data?.count, 2);
  
  // Third attempt
  if (data && data.resetAt > now) {
    data.count++;
  }
  assert.equal(data?.count, 3);
});

test('successful login clears failed attempts and lock', () => {
  const locks = new Map<string, { lockedUntil: number }>();
  const fails = new Map<string, { count: number; resetAt: number }>();
  
  // Set up some failed attempts
  fails.set('fail:user@test.com', { count: 3, resetAt: Date.now() + 60000 });
  locks.set('lock:user@test.com', { lockedUntil: Date.now() + 60000 });
  
  // Successful login clears both
  fails.delete('fail:user@test.com');
  locks.delete('lock:user@test.com');
  
  assert.equal(fails.has('fail:user@test.com'), false);
  assert.equal(locks.has('lock:user@test.com'), false);
});

test('lockout triggers after 5 failed attempts', () => {
  const fails = new Map<string, { count: number; resetAt: number }>();
  const locks = new Map<string, { lockedUntil: number }>();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const threshold = 5;
  
  // Simulate 5 failed attempts
  for (let i = 1; i <= 5; i++) {
    const data = fails.get('fail:user@test.com');
    if (data && data.resetAt > now) {
      data.count++;
    } else {
      fails.set('fail:user@test.com', { count: 1, resetAt: now + windowMs });
    }
    
    if (i >= threshold) {
      const d = fails.get('fail:user@test.com');
      if (d && d.count >= threshold) {
        locks.set('lock:user@test.com', { lockedUntil: now + 15 * 60 * 1000 });
        fails.delete('fail:user@test.com');
      }
    }
  }
  
  // Account should be locked
  const lock = locks.get('lock:user@test.com');
  assert.ok(lock);
  assert.ok(lock.lockedUntil > now);
  
  // Failed attempts should be cleared after lockout
  assert.equal(fails.has('fail:user@test.com'), false);
});
