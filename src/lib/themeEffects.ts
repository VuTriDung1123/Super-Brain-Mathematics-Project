'use client';

const SAKURA_KEY = 'brain_sakura_enabled_v1';
export const SAKURA_CHANGE_EVENT = 'brain-sakura-change';

export function isSakuraEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(SAKURA_KEY);
  return saved === null ? true : saved === 'true';
}

export function getSakuraServerSnapshot(): boolean {
  return true;
}

export function subscribeSakura(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SAKURA_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SAKURA_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function toggleSakura(): boolean {
  if (typeof window === 'undefined') return true;
  const next = !isSakuraEnabled();
  window.localStorage.setItem(SAKURA_KEY, String(next));
  window.dispatchEvent(new Event(SAKURA_CHANGE_EVENT));
  return next;
}
