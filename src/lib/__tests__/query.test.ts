import { describe, expect, it } from 'vitest';
import { buildDriveQuery } from '@/lib/google-drive/query';

describe('buildDriveQuery', () => {
  it('selalu mengecualikan sampah', () => {
    expect(buildDriveQuery({})).toBe('trashed = false');
  });
  it('escape kutip pada search', () => {
    expect(buildDriveQuery({ search: "in'voice" })).toContain("name contains 'in\\'voice'");
  });
  it('kind image', () => {
    expect(buildDriveQuery({ kind: 'image' })).toContain("mimeType contains 'image/'");
  });
  it('kind document mengecualikan folder', () => {
    const q = buildDriveQuery({ kind: 'document' });
    expect(q).toContain("mimeType != 'application/vnd.google-apps.folder'");
  });
  it('gabungan search + kind', () => {
    const q = buildDriveQuery({ search: 'lapor', kind: 'video' });
    expect(q).toContain(' and ');
    expect(q).toContain("mimeType contains 'video/'");
  });
});
