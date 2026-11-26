'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  isSoundEnabled,
  getSoundServerSnapshot,
  subscribeSound,
  toggleSound,
  playClick,
} from '@/lib/sound';
import { getStatsSnapshot, getStatsServerSnapshot, subscribeStats } from '@/lib/stats';

export default function GlobalToolbar() {
  const pathname = usePathname();
  const soundOn = useSyncExternalStore(subscribeSound, isSoundEnabled, getSoundServerSnapshot);
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsServerSnapshot);

  return (
    <nav
      aria-label="Thanh công cụ toàn cục"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 rounded-full px-2.5 py-1.5 shadow-xl shadow-black/40"
    >
      <Link
        href="/"
        onClick={() => playClick()}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
          pathname === '/'
            ? 'bg-slate-700 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span>🧠</span>
        <span className="hidden sm:inline">Trang Chủ</span>
      </Link>

      <div className="w-px h-4 bg-slate-700" />

      <Link
        href="/profile"
        onClick={() => playClick()}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
          pathname === '/profile'
            ? 'bg-blue-600 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <span>📊</span>
        <span className="hidden sm:inline">Hồ Sơ</span>
        {stats.currentStreak > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono">
            🔥{stats.currentStreak}
          </span>
        )}
      </Link>

      <div className="w-px h-4 bg-slate-700" />

      <button
        type="button"
        onClick={() => toggleSound()}
        title={soundOn ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
        aria-label={soundOn ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
          soundOn
            ? 'text-emerald-400 hover:bg-slate-800'
            : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300'
        }`}
      >
        <span>{soundOn ? '🔊' : '🔇'}</span>
        <span className="hidden md:inline">{soundOn ? 'SFX' : 'Tắt'}</span>
      </button>
    </nav>
  );
}
