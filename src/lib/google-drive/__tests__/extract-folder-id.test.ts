import { describe, expect, it } from 'vitest';
import { extractFolderId } from '@/lib/google-drive/extract-folder-id';

describe('extractFolderId', () => {
  it('mengekstrak folder ID dari string ID langsung', () => {
    expect(extractFolderId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt')).toBe(
      '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt',
    );
  });

  it('mengekstrak folder ID dari URL Google Drive standar', () => {
    expect(
      extractFolderId('https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt'),
    ).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt');
  });

  it('mengekstrak folder ID dari URL Google Drive dengan multi-user path (/u/1/) dan query params', () => {
    expect(
      extractFolderId(
        'https://drive.google.com/drive/u/1/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt?usp=sharing',
      ),
    ).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptnyt');
  });

  it('menangani string kosong atau whitespace', () => {
    expect(extractFolderId('')).toBe('');
    expect(extractFolderId('   ')).toBe('');
  });
});
