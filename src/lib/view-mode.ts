'use client';

import { useSyncExternalStore } from 'react';

export function getViewModeSnapshot(): 'list' | 'grid' {
  if (typeof window === 'undefined') return 'list';
  const val = window.localStorage.getItem('gdrive_view_mode');
  return val === 'grid' ? 'grid' : 'list';
}

export function getServerViewModeSnapshot(): 'list' | 'grid' {
  return 'list';
}

export function setSavedViewMode(next: 'list' | 'grid') {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('gdrive_view_mode', next);
    window.dispatchEvent(new Event('storage'));
  }
}

export function useViewModePreference() {
  const mode = useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined') return () => {};
      window.addEventListener('storage', callback);
      return () => window.removeEventListener('storage', callback);
    },
    getViewModeSnapshot,
    getServerViewModeSnapshot,
  );

  return [mode, setSavedViewMode] as const;
}
