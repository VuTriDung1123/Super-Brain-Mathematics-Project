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
    <div className="max-w-6xl mx-auto mb-10 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl animate-fade-in">
      <div className="flex flex-wrap items-center gap-6 sm:gap-8">
        <div>
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
            Lượt luyện tập
          </div>
          <div className="text-2xl font-mono font-black text-white">{stats.totalPlays}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
            Đã chinh phục
          </div>
          <div className="text-2xl font-mono font-black text-cyan-400">
            {conqueredGames}/{GAME_CATALOG.length}
          </div>
        </div>
        <div>
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
            Tỉ lệ thắng
          </div>
          <div className="text-2xl font-mono font-black text-emerald-400">{winRate}%</div>
        </div>
        <div>
          <div className="text-[11px] uppercase font-bold tracking-wider text-slate-500">
            Chuỗi ngày
          </div>
          <div className="text-2xl font-mono font-black text-amber-400">
            🔥 {stats.currentStreak}
          </div>
        </div>
      </div>

      <Link
        href="/profile"
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-sm font-bold text-white shadow-lg transition-all"
      >
        Xem Biểu Đồ &amp; Kỷ Lục →
      </Link>
    </div>
  );
}

export function CategoryProgressBadge({ category }: { category: CategoryId }) {
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsServerSnapshot);
  const catGames = GAME_CATALOG.filter((g) => g.category === category);
  const wonCount = catGames.filter((g) => (stats.games[g.id]?.wins ?? 0) > 0).length;

  return (
    <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded-full bg-slate-800/90 text-slate-300 border border-slate-700">
      {wonCount}/{catGames.length} hoàn thành
    </span>
  );
}
