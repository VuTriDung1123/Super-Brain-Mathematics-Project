'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type BoardSize = 5 | 6 | 8;

interface GameSettings {
  size: BoardSize;
  blindMode: boolean;
}

interface Pos {
  r: number;
  c: number;
}

const KNIGHT_MOVES: [number, number][] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

function getValidKnightMoves(pos: Pos, size: number, visited: Set<string>): Pos[] {
  const res: Pos[] = [];
  for (const [dr, dc] of KNIGHT_MOVES) {
    const nr = pos.r + dr;
    const nc = pos.c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size && !visited.has(`${nr},${nc}`)) {
      res.push({ r: nr, c: nc });
    }
  }
  return res;
}

/** Warnsdorff's rule hint: picks the legal next square with the fewest onward moves */
function getWarnsdorffHint(pos: Pos, size: number, visited: Set<string>): Pos | null {
  const moves = getValidKnightMoves(pos, size, visited);
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestDeg = Infinity;
  for (const m of moves) {
    const nextVisited = new Set(visited);
    nextVisited.add(`${m.r},${m.c}`);
    const deg = getValidKnightMoves(m, size, nextVisited).length;
    if (deg < bestDeg) {
      bestDeg = deg;
      best = m;
    }
  }
  return best;
}

export default function KnightsTourGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    size: 5,
    blindMode: false,
  });

  const [path, setPath] = useState<Pos[]>([]);
  const [hintCell, setHintCell] = useState<Pos | null>(null);
  const [collisionCell, setCollisionCell] = useState<Pos | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isWin, setIsWin] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalCells = settings.size * settings.size;
  const currentPos = path.length > 0 ? path[path.length - 1] : null;

  const visitedMap = useMemo(() => {
    const m = new Map<string, number>();
    path.forEach((p, idx) => m.set(`${p.r},${p.c}`, idx + 1));
    return m;
  }, [path]);

  const visitedSet = useMemo(() => new Set(visitedMap.keys()), [visitedMap]);

  const legalUnvisitedMoves = useMemo(() => {
    if (!currentPos) return new Set<string>();
    return new Set(
      getValidKnightMoves(currentPos, settings.size, visitedSet).map((p) => `${p.r},${p.c}`)
    );
  }, [currentPos, settings.size, visitedSet]);

  const startGame = () => {
    // On 5x5, even (r+c) guarantees a complete tour exists -> start at (0,0)
    setPath([{ r: 0, c: 0 }]);
    setHintCell(null);
    setCollisionCell(null);
    setElapsedSec(0);
    setIsWin(false);
    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'PLAYING' || !currentPos) return;
    const dr = Math.abs(r - currentPos.r);
    const dc = Math.abs(c - currentPos.c);
    const isKnightJump = (dr === 2 && dc === 1) || (dr === 1 && dc === 2);
    if (!isKnightJump) return;

    const key = `${r},${c}`;
    setHintCell(null);

    if (visitedSet.has(key)) {
      if (settings.blindMode) {
        // In Blind Mode, jumping back onto an already visited square ends the run!
        playError();
        setCollisionCell({ r, c });
        setIsWin(false);
        setPhase('RESULT');
      }
      return;
    }

    const nextPath = [...path, { r, c }];
    setPath(nextPath);
    playClick();

    if (nextPath.length === totalCells) {
      playSuccess();
      setIsWin(true);
      setPhase('RESULT');
      return;
    }

    // Check if stuck (dead end)
    const nextVisited = new Set(visitedSet);
    nextVisited.add(key);
    const onward = getValidKnightMoves({ r, c }, settings.size, nextVisited);
    if (onward.length === 0) {
      playError();
      setIsWin(false);
      setPhase('RESULT');
    }
  };

  const handleUndo = () => {
    if (settings.blindMode || path.length <= 1) return;
    setPath((prev) => prev.slice(0, -1));
    setHintCell(null);
    playClick();
  };

  const handleHint = () => {
    if (!currentPos || settings.blindMode) return;
    const best = getWarnsdorffHint(currentPos, settings.size, visitedSet);
    setHintCell(best);
    playClick();
  };

  const progressPct = Math.round((path.length / totalCells) * 100);

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'knights-tour',
    won: isWin,
    accuracy: progressPct,
    scoreLabel: `${path.length}/${totalCells} ô (${settings.size}×${settings.size}${settings.blindMode ? ' Mù' : ''})`,
    durationSec: Math.max(1, elapsedSec),
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-violet-500">
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-violet-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-violet-500/40 text-violet-300 font-bold">
              {path.length}/{totalCells} ô ({progressPct}%)
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              ⏱ {formatTime(elapsedSec)}
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500 mb-2">
              MÃ ĐI TUẦN ẨN
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Blind Knight&apos;s Tour • Kinh điển Siêu Trí Tuệ
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                <h2 className="text-xl font-bold text-violet-400">Luật chơi &amp; Quy tắc Warnsdorff</h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Điều khiển quân <strong className="text-white">Mã (♞)</strong> đi theo hình chữ L (2 ô một chiều, 1 ô chiều vuông góc) để ghé thăm <strong className="text-white">mọi ô trên bàn cờ đúng 1 lần duy nhất</strong>.
                </p>
                <ul className="list-disc list-inside text-slate-400 text-sm space-y-1.5">
                  <li>
                    <strong className="text-white">Chế độ Tiêu chuẩn:</strong> Hiển thị số thứ tự các ô đã đi, hỗ trợ Undo và Gợi ý theo thuật toán Warnsdorff.
                  </li>
                  <li>
                    <strong className="text-fuchsia-400">Chế độ Mù (Ẩn dấu vết):</strong> Bàn cờ trắng trơn, ẩn hoàn toàn các ô đã đi qua! Nếu bạn nhảy nhầm vào ô cũ → lập tức dừng cuộc chơi.
                  </li>
                  <li>
                    <strong className="text-amber-300">Mẹo cao thủ:</strong> Luôn ưu tiên nhảy vào ô góc/biên (ô có ít hướng thoát nhất) trước để tránh bị cô lập ở giai đoạn cuối.
                  </li>
                </ul>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Cấu Hình Bàn Cờ
                </h3>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Kích thước bàn cờ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([5, 6, 8] as BoardSize[]).map((sz) => (
                      <button
                        key={sz}
                        onClick={() => setSettings({ ...settings, size: sz })}
                        className={`py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                          settings.size === sz
                            ? 'bg-violet-600 border-violet-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {sz}×{sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Chế độ hiển thị
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, blindMode: false })}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        !settings.blindMode
                          ? 'bg-violet-600 border-violet-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      👁️ Tiêu chuẩn
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, blindMode: true })}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        settings.blindMode
                          ? 'bg-fuchsia-600 border-fuchsia-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      🙈 Mã Đi Tuần Ẩn
                    </button>
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  ♞ BẮT ĐẦU TUẦN TRA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING & RESULT */}
      {(phase === 'PLAYING' || phase === 'RESULT') && (
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          {phase === 'RESULT' && (
            <div
              className={`w-full p-6 rounded-2xl border-2 text-center animate-fade-in-up ${
                isWin ? 'bg-emerald-950/40 border-emerald-500' : 'bg-red-950/40 border-red-500'
              }`}
            >
              <h2
                className={`text-3xl font-black mb-1 ${
                  isWin ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isWin ? '🏆 HOÀN THÀNH TOÀN BỘ BÀN CỜ!' : '✖ DỪNG BƯỚC TUẦN TRA'}
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                {isWin
                  ? `Tuyệt đỉnh! Bạn đã đưa quân Mã đi hết ${totalCells}/${totalCells} ô trong ${formatTime(elapsedSec)}.`
                  : collisionCell
                    ? `Bạn đã nhảy trùng vào ô (${collisionCell.r + 1}, ${collisionCell.c + 1}) ở chế độ Ẩn — đạt ${path.length}/${totalCells} ô.`
                    : `Quân Mã bị vào ngõ cụt sau ${path.length}/${totalCells} ô (${progressPct}%).`}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setPhase('SETUP')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 text-sm"
                >
                  Cấu Hình
                </button>
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-white text-sm"
                >
                  Chơi Lại
                </button>
              </div>
            </div>
          )}

          {/* Chessboard */}
          <div
            className="grid gap-1 bg-slate-900 p-3 rounded-2xl border-2 border-slate-800 shadow-2xl select-none"
            style={{ gridTemplateColumns: `repeat(${settings.size}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: settings.size }).map((_, r) =>
              Array.from({ length: settings.size }).map((__, c) => {
                const key = `${r},${c}`;
                const stepNum = visitedMap.get(key);
                const isCurrent = currentPos?.r === r && currentPos?.c === c;
                const isHint = hintCell?.r === r && hintCell?.c === c;
                const isCollision = collisionCell?.r === r && collisionCell?.c === c;
                const isDark = (r + c) % 2 === 1;

                const isKnightRange =
                  currentPos !== null &&
                  ((Math.abs(r - currentPos.r) === 2 && Math.abs(c - currentPos.c) === 1) ||
                    (Math.abs(r - currentPos.r) === 1 && Math.abs(c - currentPos.c) === 2));

                const showVisitedVisual =
                  phase === 'RESULT' || (!settings.blindMode && stepNum !== undefined);
                const isClickable =
                  phase === 'PLAYING' &&
                  (settings.blindMode ? isKnightRange : legalUnvisitedMoves.has(key));

                let cellStyle = isDark ? 'bg-slate-800' : 'bg-slate-700/70';
                if (isCollision) {
                  cellStyle = 'bg-red-600 text-white ring-2 ring-red-300';
                } else if (isCurrent) {
                  cellStyle = 'bg-violet-600 text-white ring-4 ring-violet-300 z-10 scale-105';
                } else if (showVisitedVisual && stepNum !== undefined) {
                  cellStyle = 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/60';
                } else if (isHint) {
                  cellStyle = 'bg-amber-500/30 border-2 border-amber-400 text-amber-300 animate-pulse';
                } else if (isClickable) {
                  cellStyle = settings.blindMode
                    ? `${isDark ? 'bg-slate-800' : 'bg-slate-700/70'} hover:bg-violet-500/30 ring-1 ring-violet-400/50`
                    : 'bg-emerald-950/60 border-2 border-emerald-500/70 hover:bg-emerald-800/70';
                }

                const sizeClass =
                  settings.size === 8
                    ? 'w-10 h-10 sm:w-13 sm:h-13 text-sm sm:text-lg'
                    : settings.size === 6
                      ? 'w-12 h-12 sm:w-16 sm:h-16 text-lg sm:text-xl'
                      : 'w-14 h-14 sm:w-18 sm:h-18 text-xl sm:text-2xl';

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleCellClick(r, c)}
                    disabled={!isClickable}
                    className={`${sizeClass} rounded-xl flex items-center justify-center font-mono font-black transition-all ${cellStyle} ${
                      isClickable ? 'cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    {isCurrent ? (
                      <span className="text-2xl sm:text-3xl leading-none">♞</span>
                    ) : showVisitedVisual && stepNum !== undefined ? (
                      stepNum
                    ) : isHint ? (
                      '★'
                    ) : !settings.blindMode && isClickable ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>

          {phase === 'PLAYING' && (
            <div className="flex flex-wrap justify-center gap-3">
              {!settings.blindMode && (
                <>
                  <button
                    onClick={handleUndo}
                    disabled={path.length <= 1}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 font-bold text-sm"
                  >
                    ↩ Lùi 1 Bước
                  </button>
                  <button
                    onClick={handleHint}
                    className="px-5 py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-800 border border-amber-600/60 text-amber-200 font-bold text-sm"
                  >
                    💡 Gợi Ý Warnsdorff
                  </button>
                </>
              )}
              <button
                onClick={startGame}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/60 font-bold text-slate-300 text-sm"
              >
                Chơi Lại Từ Đầu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
