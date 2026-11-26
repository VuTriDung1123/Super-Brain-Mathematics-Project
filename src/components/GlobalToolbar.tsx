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
import {
  isSakuraEnabled,
  getSakuraServerSnapshot,
  subscribeSakura,
  toggleSakura,
} from '@/lib/themeEffects';
import { getStatsSnapshot, getStatsServerSnapshot, subscribeStats } from '@/lib/stats';

export default function GlobalToolbar() {
  const pathname = usePathname();
  const soundOn = useSyncExternalStore(subscribeSound, isSoundEnabled, getSoundServerSnapshot);
  const sakuraOn = useSyncExternalStore(
    subscribeSakura,
    isSakuraEnabled,
    getSakuraServerSnapshot
  );
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsServerSnapshot);

  return (
    <nav
      aria-label="Thanh công cụ Đạo Quán"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 bg-[#1b1115]/90 backdrop-blur-md border border-[#d9b56c]/35 rounded-full px-2.5 py-1.5 shadow-xl shadow-black/60"
    >
      <Link
        href="/"
        onClick={() => playClick()}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
          pathname === '/'
            ? 'bg-[#c83e37]/90 text-[#fff7f0] shadow shadow-[#c83e37]/30'
            : 'text-[#dfd0c8] hover:bg-[#2b1d23] hover:text-[#f6efe4]'
        }`}
      >
        <span>⛩️</span>
        <span className="hidden sm:inline">Đạo Quán</span>
      </Link>

      <div className="w-px h-4 bg-[#d9b56c]/25" />

      <Link
        href="/profile"
        onClick={() => playClick()}
        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
          pathname === '/profile'
            ? 'bg-[#d9b56c]/25 text-[#f6d58e] border border-[#d9b56c]/50'
            : 'text-[#dfd0c8] hover:bg-[#2b1d23] hover:text-[#f6efe4]'
        }`}
      >
        <span>📜</span>
        <span className="hidden sm:inline">Hồ Sơ</span>
        {stats.currentStreak > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#c83e37]/25 text-[#f6c2d0] border border-[#f4b8c8]/35 text-[10px] font-mono">
            🔥{stats.currentStreak}
          </span>
        )}
      </Link>

      <div className="w-px h-4 bg-[#d9b56c]/25" />

      <button
        type="button"
        onClick={() => {
          toggleSakura();
          playClick();
        }}
        title={sakuraOn ? 'Tắt hiệu ứng hoa anh đào rơi' : 'Bật hiệu ứng hoa anh đào rơi'}
        aria-label={sakuraOn ? 'Tắt hoa anh đào rơi' : 'Bật hoa anh đào rơi'}
        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
          sakuraOn
            ? 'text-[#f4b8c8] hover:bg-[#2b1d23]'
            : 'text-[#7d626a] hover:bg-[#2b1d23] hover:text-[#c7b2b5]'
        }`}
      >
        <span>🌸</span>
        <span className="hidden md:inline">{sakuraOn ? 'Hoa' : 'Ẩn'}</span>
      </button>

      <div className="w-px h-4 bg-[#d9b56c]/25" />

      <button
        type="button"
        onClick={() => toggleSound()}
        title={soundOn ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
        aria-label={soundOn ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
          soundOn
            ? 'text-[#e6c173] hover:bg-[#2b1d23]'
            : 'text-[#7d626a] hover:bg-[#2b1d23] hover:text-[#c7b2b5]'
        }`}
      >
        <span>{soundOn ? '🔔' : '🔇'}</span>
        <span className="hidden md:inline">{soundOn ? 'Âm' : 'Tắt'}</span>
      </button>
    </nav>
  );
}
