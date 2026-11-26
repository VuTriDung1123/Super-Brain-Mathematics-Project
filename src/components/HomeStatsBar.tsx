'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  GAME_CATALOG,
  getStatsSnapshot,
  getStatsServerSnapshot,
  subscribeStats,
  type CategoryId,
} from '@/lib/stats';

export function HomeStatsBar() {
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsServerSnapshot);
  const conqueredGames = GAME_CATALOG.filter((g) => (stats.games[g.id]?.wins ?? 0) > 0).length;
  const winRate =
    stats.totalPlays > 0 ? Math.round((stats.totalWins / stats.totalPlays) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto mb-10 wafu-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 animate-fade-in relative overflow-hidden">
      {/* Subtle Kintsugi corner flourishes */}
      <span className="pointer-events-none absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#d4af37]/60 rounded-tl-2xl" />
      <span className="pointer-events-none absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#d4af37]/60 rounded-br-2xl" />

      <div className="flex flex-wrap items-center gap-6 sm:gap-9">
        <div>
          <div className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#b496a0]">
            Lượt tu luyện
          </div>
          <div className="text-2xl font-mono font-black text-[#fdf6ec]">{stats.totalPlays}</div>
        </div>
        <div className="hidden sm:block w-px h-8 bg-[#d4af37]/20" />
        <div>
          <div className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#b496a0]">
            Bí kíp đã mở
          </div>
          <div className="text-2xl font-mono font-black text-[#f7c6d4]">
            {conqueredGames}/{GAME_CATALOG.length}
          </div>
        </div>
        <div className="hidden sm:block w-px h-8 bg-[#d4af37]/20" />
        <div>
          <div className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#b496a0]">
            Tỉ lệ thắng
          </div>
          <div className="text-2xl font-mono font-black text-[#8fd4ac]">{winRate}%</div>
        </div>
        <div className="hidden sm:block w-px h-8 bg-[#d4af37]/20" />
        <div>
          <div className="text-[10px] uppercase font-bold tracking-[0.18em] text-[#b496a0]">
            Chuỗi ngày
          </div>
          <div className="text-2xl font-mono font-black text-[#e6c173]">
            🔥 {stats.currentStreak}
          </div>
        </div>
      </div>

      <Link
        href="/profile"
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#b8322a] to-[#c83e37] hover:from-[#c83e37] hover:to-[#e05248] border border-[#f7c6d4]/30 text-sm font-bold text-[#fff8f5] shadow-lg shadow-[#c83e37]/25 transition-all"
      >
        📜 Mở Cuộn Hồ Sơ →
      </Link>
    </div>
  );
}

export function CategoryProgressBadge({ category }: { category: CategoryId }) {
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsServerSnapshot);
  const catGames = GAME_CATALOG.filter((g) => g.category === category);
  const wonCount = catGames.filter((g) => (stats.games[g.id]?.wins ?? 0) > 0).length;

  return (
    <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-[#2a1d24] text-[#f3d37a] border border-[#d4af37]/35">
      {wonCount}/{catGames.length} hoàn thành
    </span>
  );
}
