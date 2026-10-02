import { describe, expect, it } from 'vitest';
import { formatBytes } from '@/lib/format';

describe('formatBytes', () => {
  it('menangani 0 dan null', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(undefined)).toBe('—');
  });
  it('format GB/TB', () => {
    expect(formatBytes(1024 ** 3)).toBe('1.0 GB');
    expect(formatBytes(15 * 1024 ** 3)).toBe('15.0 GB');
    expect(formatBytes(1.5 * 1024 ** 4)).toBe('1.5 TB');
  });
});
