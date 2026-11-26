'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  CATEGORY_META,
  GAME_CATALOG,
  computeCategoryRatings,
  getStatsSnapshot,
  getStatsServerSnapshot,
  subscribeStats,
  resetStats,
  type CategoryId,
} from '@/lib/stats';

const RADAR_CATEGORIES: CategoryId[] = [
  'mental-math',
  'sudoku-logic',
  'spatial',
  'applied-math',
  'battle',
];

function BrainRadarChart({ ratings }: { ratings: Record<CategoryId, number> }) {
  const cx = 190;
  const cy = 175;
  const maxR = 115;

  const getPoint = (idx: number, pct: number): [number, number] => {
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / RADAR_CATEGORIES.length;
    const r = (pct / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const dataPolygon = RADAR_CATEGORIES.map((cat, idx) => {
    const [x, y] = getPoint(idx, Math.max(8, ratings[cat]));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 380 350" className="w-full max-w-sm h-auto mx-auto">
      {/* Concentric pentagon rings */}
      {[25, 50, 75, 100].map((level) => (
        <polygon
          key={level}
          points={RADAR_CATEGORIES.map((_, i) => {
            const [x, y] = getPoint(i, level);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ')}
          fill="none"
          stroke="#1e293b"
          strokeWidth="1.5"
        />
      ))}

      {/* Axis spokes */}
      {RADAR_CATEGORIES.map((cat, i) => {
        const [x, y] = getPoint(i, 100);
        const [lx, ly] = getPoint(i, 126);
        return (
          <g key={cat}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#334155" strokeWidth="1.2" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="bold"
            >
              {CATEGORY_META[cat].shortLabel}
            </text>
            <text
              x={lx}
              y={ly + 14}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={CATEGORY_META[cat].colorHex}
              fontSize="11"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {ratings[cat]}
            </text>
          </g>
        );
      })}

      {/* Player Skill Polygon */}
      <polygon
        points={dataPolygon}
        fill="rgba(56, 189, 248, 0.25)"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Vertex dots */}
      {RADAR_CATEGORIES.map((cat, i) => {
        const [x, y] = getPoint(i, Math.max(8, ratings[cat]));
        return (
          <circle
            key={`dot-${cat}`}
            cx={x}
            cy={y}
            r="5"
            fill={CATEGORY_META[cat].colorHex}
            stroke="#ffffff"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

export default function ProfileDashboardPage() {
  const stats = useSyncExternalStore(subscribeStats, getStatsSnapshot, getStatsServerSnapshot);
  const [confirmReset, setConfirmReset] = useState(false);

  const ratings = computeCategoryRatings(stats);
  const overallBrainIndex = Math.round(
    RADAR_CATEGORIES.reduce((sum, cat) => sum + ratings[cat], 0) / RADAR_CATEGORIES.length
  );
  const conqueredCount = GAME_CATALOG.filter((g) => (stats.games[g.id]?.wins ?? 0) > 0).length;
  const winRate =
    stats.totalPlays > 0 ? Math.round((stats.totalWins / stats.totalPlays) * 100) : 0;

  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-20 pb-20 px-6 selection:bg-blue-500 selection:text-white">
      <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors mb-3 group text-sm"
            >
              <span className="mr-2 text-lg group-hover:-translate-x-1 transition-transform">←</span>
              Quay lại Trang Chủ
            </Link>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">
              HỒ SƠ SIÊU TRÍ TUỆ
            </h1>
            <p className="text-slate-400 mt-1">
              Theo dõi chỉ số 5 nhóm kỹ năng, kỷ lục cá nhân và lịch sử rèn luyện trên trình duyệt của bạn.
            </p>
          </div>

          <div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-red-950/60 border border-slate-700 hover:border-red-500/60 text-xs font-bold text-slate-400 hover:text-red-300 transition-colors"
              >
                Xóa Dữ Liệu Luyện Tập
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-950/50 border border-red-500/60 px-3 py-2 rounded-xl">
                <span className="text-xs text-red-200 font-bold">Xác nhận xóa toàn bộ?</span>
                <button
                  onClick={() => {
                    resetStats();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white"
                >
                  Xóa
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top KPI + Radar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center">
            <div className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">
              Biểu Đồ Năng Lực 5 Trục
            </div>
            <BrainRadarChart ratings={ratings} />
            <div className="mt-2 text-center">
              <span className="text-xs uppercase text-slate-500 font-bold block">
                Chỉ Số Não Bộ Tổng Hợp
              </span>
              <span className="text-4xl font-mono font-black text-white">
                {overallBrainIndex}
                <span className="text-lg text-slate-500">/100</span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-slate-500">Tổng lượt luyện tập</span>
              <div className="text-5xl font-mono font-black text-white mt-4">{stats.totalPlays}</div>
              <span className="text-xs text-slate-400 mt-2">
                {stats.totalWins} lượt đạt chuẩn chiến thắng
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-slate-500">Tỉ lệ hoàn thành</span>
              <div className="text-5xl font-mono font-black text-emerald-400 mt-4">{winRate}%</div>
              <span className="text-xs text-slate-400 mt-2">
                Tính trên toàn bộ 17 bộ môn
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-slate-500">Chuỗi ngày liên tiếp</span>
              <div className="text-5xl font-mono font-black text-amber-400 mt-4">
                🔥 {stats.currentStreak}
              </div>
              <span className="text-xs text-slate-400 mt-2">
                Kỷ lục dài nhất: {stats.longestStreak} ngày
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-slate-500">Độ phủ 17 thử thách</span>
              <div className="text-5xl font-mono font-black text-cyan-400 mt-4">
                {conqueredCount}
                <span className="text-2xl text-slate-500">/{GAME_CATALOG.length}</span>
              </div>
              <span className="text-xs text-slate-400 mt-2">Số trò chơi đã thắng ít nhất 1 lần</span>
            </div>
          </div>
        </div>

        {/* 17-Game Personal Records */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white">Kỷ Lục Từng Trò Chơi (17 Bộ Môn)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_CATALOG.map((game) => {
              const rec = stats.games[game.id];
              const meta = CATEGORY_META[game.category];
              return (
                <Link
                  key={game.id}
                  href={game.href}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-600 rounded-2xl p-5 transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-white">{game.vnName}</div>
                      <div className="text-xs text-slate-500 font-mono">{game.name}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                    >
                      {meta.shortLabel}
                    </span>
                  </div>

                  {rec ? (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Lượt</div>
                        <div className="text-sm font-bold text-white">
                          {rec.wins}/{rec.plays}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Tốt nhất</div>
                        <div className="text-sm font-bold text-emerald-400">
                          {rec.bestAccuracy}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Gần nhất</div>
                        <div className="text-xs font-bold text-amber-300 truncate">
                          {rec.lastScoreLabel}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                      <span>Chưa thử thách</span>
                      <span className="text-blue-400 font-bold">Chơi ngay →</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent History */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-white">Lịch Sử Luyện Tập Gần Đây</h2>
          {stats.history.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center text-slate-400">
              Chưa có phiên luyện tập nào được ghi lại. Hãy chọn một trò chơi và hoàn thành lượt đầu tiên!
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-xs uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-5">Thời gian</th>
                      <th className="py-3.5 px-5">Trò chơi</th>
                      <th className="py-3.5 px-5">Hạng mục</th>
                      <th className="py-3.5 px-5">Kết quả</th>
                      <th className="py-3.5 px-5 text-right">Độ chính xác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {stats.history.slice(0, 25).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-5 font-mono text-xs text-slate-400 whitespace-nowrap">
                          {formatDateTime(item.timestamp)}
                        </td>
                        <td className="py-3 px-5 font-bold text-white">{item.gameName}</td>
                        <td className="py-3 px-5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              CATEGORY_META[item.category].badgeClass
                            }`}
                          >
                            {CATEGORY_META[item.category].shortLabel}
                          </span>
                        </td>
                        <td className="py-3 px-5 font-mono text-xs">
                          <span
                            className={`font-bold ${
                              item.won ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {item.won ? '✔' : '✖'} {item.scoreLabel}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-bold text-slate-200">
                          {item.accuracy}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
