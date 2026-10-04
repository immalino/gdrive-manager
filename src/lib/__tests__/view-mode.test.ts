import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { getViewModeSnapshot, getServerViewModeSnapshot, setSavedViewMode } from '../view-mode';

describe('view-mode preference helper', () => {
  const storageMock: Record<string, string> = {};

  beforeEach(() => {
    for (const k of Object.keys(storageMock)) delete storageMock[k];

    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => storageMock[key] ?? null,
        setItem: (key: string, val: string) => {
          storageMock[key] = String(val);
        },
        removeItem: (key: string) => {
          delete storageMock[key];
        },
      },
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mengembalikan list secara default di server snapshot', () => {
    expect(getServerViewModeSnapshot()).toBe('list');
  });

  it('mengembalikan list jika localStorage kosong', () => {
    expect(getViewModeSnapshot()).toBe('list');
  });

  it('mengembalikan grid jika disimpan grid', () => {
    setSavedViewMode('grid');
    expect(getViewModeSnapshot()).toBe('grid');
    expect(storageMock['gdrive_view_mode']).toBe('grid');
  });

  it('mengembalikan list jika disimpan list atau nilai tidak dikenal', () => {
    setSavedViewMode('list');
    expect(getViewModeSnapshot()).toBe('list');

    storageMock['gdrive_view_mode'] = 'unknown';
    expect(getViewModeSnapshot()).toBe('list');
  });
});
