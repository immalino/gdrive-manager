import { describe, expect, it } from 'vitest';
import { classifyMime } from '@/lib/files/mime';

describe('classifyMime', () => {
  it('klasifikasi dasar', () => {
    expect(classifyMime('application/vnd.google-apps.folder')).toBe('folder');
    expect(classifyMime('application/pdf')).toBe('document');
    expect(classifyMime('image/png')).toBe('image');
    expect(classifyMime('video/mp4')).toBe('video');
    expect(classifyMime('application/zip')).toBe('archive');
    expect(classifyMime('application/x-unknown')).toBe('other');
  });
});
