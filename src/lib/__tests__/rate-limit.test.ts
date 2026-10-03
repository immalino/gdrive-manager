import { describe, expect, it } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('memblokir setelah limit tercapai dalam window', () => {
    let now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      expect(rateLimit('u1', 10, 60_000, now).ok).toBe(true);
      now += 10;
    }
    const blocked = rateLimit('u1', 10, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it('window bergeser → izin lagi', () => {
    const now = 2_000_000;
    for (let i = 0; i < 10; i++) rateLimit('u2', 10, 60_000, now);
    expect(rateLimit('u2', 10, 60_000, now + 61_000).ok).toBe(true);
  });

  it('key berbeda tidak saling pengaruh', () => {
    const now = 3_000_000;
    for (let i = 0; i < 10; i++) rateLimit('u3', 10, 60_000, now);
    expect(rateLimit('u4', 10, 60_000, now).ok).toBe(true);
  });
});
