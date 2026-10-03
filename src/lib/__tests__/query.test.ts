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
  it('rentang ukuran dan tanggal', () => {
    const q = buildDriveQuery({
      sizeMin: 1024,
      sizeMax: 1048576,
      modifiedAfter: '2026-01-01T00:00:00Z',
      modifiedBefore: '2026-02-01T00:00:00Z',
    });
    expect(q).toContain('size > 1024');
    expect(q).toContain('size < 1048576');
    expect(q).toContain("modifiedTime > '2026-01-01T00:00:00.000Z'");
    expect(q).toContain("modifiedTime < '2026-02-01T00:00:00.000Z'");
  });
  it('sortir partikel tidak merusak query', () => {
    expect(buildDriveQuery({ search: "a' and name contains 'b" })).not.toContain(
      "contains 'a' and name contains 'b'",
    );
  });
  it('folderId menyaring file dalam parent folder', () => {
    const q = buildDriveQuery({ folderId: 'folder_abc123' });
    expect(q).toBe("trashed = false and 'folder_abc123' in parents");
  });
  it('folderId dengan escape quote dan search', () => {
    const q = buildDriveQuery({ folderId: "fol'der", search: 'test' });
    expect(q).toBe("trashed = false and 'fol\\'der' in parents and name contains 'test'");
  });
});
