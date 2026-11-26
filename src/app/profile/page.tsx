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
  'classic',
];

function getDojoRank(brainIndex: number): { vn: string; kanji: string } {
  if (brainIndex >= 90) return { vn: 'Siêu Trí Tuệ', kanji: '超頭脳' };
  if (brainIndex >= 70) return { vn: 'Sư Phạm Đạo Quán', kanji: '師範' };
  if (brainIndex >= 45) return { vn: 'Đạt Nhân', kanji: '達人' };
  if (brainIndex >= 20) return { vn: 'Tu Hành Giả', kanji: '修行者' };
  return { vn: 'Môn Hạ Sinh', kanji: '門下生' };
}

function BrainRadarChart({ ratings }: { ratings: Record<CategoryId, number> }) {
  const cx = 190;
  const cy = 175;
  const maxR = 112;

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
      {[25, 50, 75, 100].map((level) => (
        <polygon
          key={level}
          points={RADAR_CATEGORIES.map((_, i) => {
            const [x, y] = getPoint(i, level);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          }).join(' ')}
          fill="none"
          stroke="#48313a"
          strokeWidth="1.3"
        />
      ))}

      {RADAR_CATEGORIES.map((cat, i) => {
        const [x, y] = getPoint(i, 100);
        const [lx, ly] = getPoint(i, 128);
        return (
          <g key={cat}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#5c4049" strokeWidth="1.1" />
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#e7dad2"
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

      {/* Sakura & Kintsugi Gold Skill Polygon */}
      <polygon
        points={dataPolygon}
        fill="rgba(244, 184, 200, 0.24)"
        stroke="#f4b8c8"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />

      {RADAR_CATEGORIES.map((cat, i) => {
        const [x, y] = getPoint(i, Math.max(8, ratings[cat]));
        return (
          <circle
            key={`dot-${cat}`}
            cx={x}
            cy={y}
            r="5"
            fill={CATEGORY_META[cat].colorHex}
            stroke="#f6efe4"
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
  const rank = getDojoRank(overallBrainIndex);
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
    <div className="min-h-screen text-[#f6efe4] font-sans pt-20 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#d9b56c]/25 pb-6">
          <div>
            <Link
              href="/"
              className="inline-flex items-center text-[#c7b2b5] hover:text-[#f4b8c8] transition-colors mb-3 group text-sm"
            >
              <span className="mr-2 text-lg group-hover:-translate-x-1 transition-transform">←</span>
              Quay lại Đạo Quán
            </Link>
            <div className="flex items-center gap-3 mb-1">
              <span className="jp-hanko px-2.5 py-0.5 rounded text-xs font-bold tracking-widest">
                {rank.kanji}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-[#d9b56c]">
                Danh hiệu: {rank.vn}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#f6d58e] via-[#f4b8c8] to-[#e06a78]">
              HỒ SƠ ĐẠO QUÁN
            </h1>
            <p className="text-[#c7b2b5] mt-1">
              Theo dõi chỉ số 6 nhóm kỹ năng, kỷ lục cá nhân và lịch sử tu luyện trên trình duyệt của bạn.
            </p>
          </div>

          <div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 rounded-xl bg-[#24181d] hover:bg-[#3a191e] border border-[#d9b56c]/25 hover:border-[#c83e37] text-xs font-bold text-[#c7b2b5] hover:text-[#f4b8c8] transition-colors cursor-pointer"
              >
                Xóa Dữ Liệu Luyện Tập
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-[#3a191e]/80 border border-[#c83e37] px-3 py-2 rounded-xl">
                <span className="text-xs text-[#f9d3dd] font-bold">Xác nhận xóa toàn bộ?</span>
                <button
                  onClick={() => {
                    resetStats();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#c83e37] hover:bg-[#d94a43] text-xs font-bold text-white cursor-pointer"
                >
                  Xóa
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1 rounded-lg bg-[#2b1d23] hover:bg-[#3e2b33] text-xs font-bold text-[#dfd0c8] cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Top KPI + Radar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 jp-lacquer-card rounded-3xl p-6 flex flex-col items-center justify-center">
            <div className="text-xs font-bold uppercase tracking-widest text-[#e6c173] mb-2">
              Biểu Đồ Năng Lực 6 Trục (六角能力)
            </div>
            <BrainRadarChart ratings={ratings} />
            <div className="mt-2 text-center">
              <span className="text-xs uppercase text-[#a88c93] font-bold block">
                Chỉ Số Não Bộ Tổng Hợp
              </span>
              <span className="text-4xl font-mono font-black text-[#f6efe4]">
                {overallBrainIndex}
                <span className="text-lg text-[#997e85]">/100</span>
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            <div className="jp-lacquer-card rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-[#a88c93]">Tổng lượt tu luyện</span>
              <div className="text-5xl font-mono font-black text-[#f6efe4] mt-4">
                {stats.totalPlays}
              </div>
              <span className="text-xs text-[#c7b2b5] mt-2">
                {stats.totalWins} lượt đạt chuẩn chiến thắng
              </span>
            </div>

            <div className="jp-lacquer-card rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-[#a88c93]">Tỉ lệ hoàn thành</span>
              <div className="text-5xl font-mono font-black text-[#9ed1b5] mt-4">{winRate}%</div>
              <span className="text-xs text-[#c7b2b5] mt-2">
                Tính trên toàn bộ {GAME_CATALOG.length} bộ môn
              </span>
            </div>

            <div className="jp-lacquer-card rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-[#a88c93]">Chuỗi ngày liên tiếp</span>
              <div className="text-5xl font-mono font-black text-[#e6c173] mt-4">
                🔥 {stats.currentStreak}
              </div>
              <span className="text-xs text-[#c7b2b5] mt-2">
                Kỷ lục dài nhất: {stats.longestStreak} ngày
              </span>
            </div>

            <div className="jp-lacquer-card rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs uppercase font-bold text-[#a88c93]">
                Độ phủ {GAME_CATALOG.length} thử thách
              </span>
              <div className="text-5xl font-mono font-black text-[#f4b8c8] mt-4">
                {conqueredCount}
                <span className="text-2xl text-[#997e85]">/{GAME_CATALOG.length}</span>
              </div>
              <span className="text-xs text-[#c7b2b5] mt-2">
                Số trò chơi đã thắng ít nhất 1 lần
              </span>
            </div>
          </div>
        </div>

        {/* All Personal Records */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-[#f6efe4]">
            Kỷ Lục Từng Trò Chơi ({GAME_CATALOG.length} Bộ Môn)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GAME_CATALOG.map((game) => {
              const rec = stats.games[game.id];
              const meta = CATEGORY_META[game.category];
              return (
                <Link
                  key={game.id}
                  href={game.href}
                  className="jp-lacquer-card rounded-2xl p-5 transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-bold text-[#f6efe4]">{game.vnName}</div>
                      <div className="text-xs text-[#997e85] font-mono">{game.name}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                    >
                      {meta.shortLabel}
                    </span>
                  </div>

                  {rec ? (
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#d9b56c]/15 text-center font-mono">
                      <div>
                        <div className="text-[10px] text-[#997e85] uppercase">Lượt</div>
                        <div className="text-sm font-bold text-[#f6efe4]">
                          {rec.wins}/{rec.plays}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#997e85] uppercase">Tốt nhất</div>
                        <div className="text-sm font-bold text-[#9ed1b5]">{rec.bestAccuracy}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#997e85] uppercase">Gần nhất</div>
                        <div className="text-xs font-bold text-[#e6c173] truncate">
                          {rec.lastScoreLabel}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-3 border-t border-[#d9b56c]/15 text-xs text-[#997e85] flex justify-between items-center">
                      <span>Chưa thử thách</span>
                      <span className="text-[#f4b8c8] font-bold">Vào luyện →</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        {/* Recent History */}
        <section className="space-y-4">
          <h2 className="text-2xl font-black text-[#f6efe4]">Lịch Sử Tu Luyện Gần Đây</h2>
          {stats.history.length === 0 ? (
            <div className="jp-lacquer-card rounded-2xl p-10 text-center text-[#c7b2b5]">
              Chưa có phiên tu luyện nào được ghi lại. Hãy chọn một trò chơi và hoàn thành lượt đầu tiên!
            </div>
          ) : (
            <div className="jp-lacquer-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#140d10] text-xs uppercase text-[#a88c93] border-b border-[#d9b56c]/20">
                    <tr>
                      <th className="py-3.5 px-5">Thời gian</th>
                      <th className="py-3.5 px-5">Trò chơi</th>
                      <th className="py-3.5 px-5">Môn phái</th>
                      <th className="py-3.5 px-5">Kết quả</th>
                      <th className="py-3.5 px-5 text-right">Độ chính xác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#48313a]/60">
                    {stats.history.slice(0, 25).map((item) => (
                      <tr key={item.id} className="hover:bg-[#2b1d23]/50 transition-colors">
                        <td className="py-3 px-5 font-mono text-xs text-[#b8a3a6] whitespace-nowrap">
                          {formatDateTime(item.timestamp)}
                        </td>
                        <td className="py-3 px-5 font-bold text-[#f6efe4]">{item.gameName}</td>
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
                              item.won ? 'text-[#9ed1b5]' : 'text-[#f29bb0]'
                            }`}
                          >
                            {item.won ? '✔' : '✖'} {item.scoreLabel}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-right font-mono font-bold text-[#e7dad2]">
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
