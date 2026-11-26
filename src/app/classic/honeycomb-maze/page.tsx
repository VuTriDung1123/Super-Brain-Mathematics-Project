'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'MEMORIZE' | 'PLAYING' | 'RESULT';
type HexRadius = 2 | 3 | 4;

interface HexCoord {
  q: number;
  r: number;
}

interface HexMazeData {
  radius: number;
  cells: HexCoord[];
  openEdges: Set<string>;
  start: HexCoord;
  goal: HexCoord;
  shortestPath: HexCoord[];
}

const HEX_DIRS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

const hKey = (c: HexCoord) => `${c.q},${c.r}`;
const eKey = (a: HexCoord, b: HexCoord) => {
  const ka = hKey(a);
  const kb = hKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

function generateHexMaze(radius: number): HexMazeData {
  const cells: HexCoord[] = [];
  const validSet = new Set<string>();
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        cells.push({ q, r });
        validSet.add(`${q},${r}`);
      }
    }
  }

  const start: HexCoord = { q: -radius, r: 0 };
  const goal: HexCoord = { q: radius, r: 0 };
  const openEdges = new Set<string>();
  const visited = new Set<string>([hKey(start)]);
  const stack: HexCoord[] = [start];

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors = HEX_DIRS.map((d) => ({ q: curr.q + d.q, r: curr.r + d.r })).filter(
      (n) => validSet.has(hKey(n)) && !visited.has(hKey(n))
    );
    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      openEdges.add(eKey(curr, next));
      visited.add(hKey(next));
      stack.push(next);
    }
  }

  // BFS shortest path
  const parent: Record<string, string | null> = { [hKey(start)]: null };
  const queue: HexCoord[] = [start];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    const ck = hKey(curr);
    if (ck === hKey(goal)) break;
    for (const d of HEX_DIRS) {
      const nb = { q: curr.q + d.q, r: curr.r + d.r };
      const nk = hKey(nb);
      if (validSet.has(nk) && openEdges.has(eKey(curr, nb)) && !(nk in parent)) {
        parent[nk] = ck;
        queue.push(nb);
      }
    }
  }

  const shortestPath: HexCoord[] = [];
  let trace: string | null = hKey(goal);
  while (trace) {
    const [q, r] = trace.split(',').map(Number);
    shortestPath.push({ q, r });
    trace = parent[trace] ?? null;
  }
  shortestPath.reverse();

  return { radius, cells, openEdges, start, goal, shortestPath };
}

// Pointy-top hex pixel conversion
function hexToPixel(q: number, r: number, size: number): [number, number] {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * ((3 / 2) * r);
  return [x, y];
}

function hexCorner(cx: number, cy: number, size: number, i: number): [number, number] {
  const angleDeg = 60 * i - 30;
  const rad = (Math.PI / 180) * angleDeg;
  return [cx + size * Math.cos(rad), cy + size * Math.sin(rad)];
}

// Mapping from HEX_DIRS index to corresponding pointy-top hex edge vertex pair (i, (i+1)%6)
// Dir 0 (+1,0) = East (0°) -> corners 5 (-30°) to 0 (+30°)... wait:
// Let's compute exact edge midpoint angle for corners i & i+1:
// i=0 (-30° to +30°): midpoint 0° -> East (+1, 0) = dir 0!
// i=1 (+30° to +90°): midpoint +60° -> South-East (0, +1) = dir 5!
// i=2 (+90° to +150°): midpoint +120° -> South-West (-1, +1) = dir 4!
// i=3 (+150° to +210°): midpoint 180° -> West (-1, 0) = dir 3!
// i=4 (+210° to +270°): midpoint 240° (-120°) -> North-West (0, -1) = dir 2!
// i=5 (+270° to +330°): midpoint 300° (-60°) -> North-East (+1, -1) = dir 1!
const EDGE_TO_DIR_INDEX = [0, 5, 4, 3, 2, 1];

export default function HoneycombMazeGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [radius, setRadius] = useState<HexRadius>(3);
  const [blindMode, setBlindMode] = useState(false);

  const [maze, setMaze] = useState<HexMazeData | null>(null);
  const [pos, setPos] = useState<HexCoord>({ q: 0, r: 0 });
  const [path, setPath] = useState<HexCoord[]>([]);
  const [revealedWalls, setRevealedWalls] = useState<Set<string>>(new Set());
  const [bumps, setBumps] = useState(0);
  const [timerSec, setTimerSec] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const memoCountRef = useRef(0);

  const startGame = () => {
    const m = generateHexMaze(radius);
    setMaze(m);
    setPos(m.start);
    setPath([m.start]);
    setRevealedWalls(new Set());
    setBumps(0);

    if (blindMode) {
      const memoSec = radius === 2 ? 10 : radius === 3 ? 16 : 24;
      memoCountRef.current = memoSec;
      setTimerSec(memoSec);
      setPhase('MEMORIZE');
    } else {
      setTimerSec(0);
      setPhase('PLAYING');
    }
  };

  useEffect(() => {
    if (phase !== 'MEMORIZE' && phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      if (phase === 'MEMORIZE') {
        memoCountRef.current -= 1;
        if (memoCountRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimerSec(0);
          setPhase('PLAYING');
          return;
        }
        setTimerSec(memoCountRef.current);
      } else {
        setTimerSec((s) => s + 1);
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleHexClick = (target: HexCoord) => {
    if (phase !== 'PLAYING' || !maze) return;
    const isNeighbor = HEX_DIRS.some((d) => pos.q + d.q === target.q && pos.r + d.r === target.r);
    if (!isNeighbor) return;

    const ek = eKey(pos, target);
    if (!maze.openEdges.has(ek)) {
      // Wall bump!
      playError();
      setBumps((b) => b + 1);
      setRevealedWalls((prev) => new Set(prev).add(ek));
      return;
    }

    playClick();
    setPos(target);
    setPath((prev) => {
      if (prev.length >= 2 && hKey(prev[prev.length - 2]) === hKey(target)) {
        return prev.slice(0, -1);
      }
      return [...prev, target];
    });

    if (hKey(target) === hKey(maze.goal)) {
      playSuccess();
      setPhase('RESULT');
    }
  };

  const pathSet = useMemo(() => new Set(path.map(hKey)), [path]);
  const solSet = useMemo(() => new Set((maze?.shortestPath ?? []).map(hKey)), [maze]);

  const accuracy = Math.max(20, 100 - bumps * 10);

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'honeycomb-maze',
    won: true,
    accuracy,
    scoreLabel: `Tổ ong R=${radius}${blindMode ? ' Mù' : ''} (${path.length - 1} bước)`,
    durationSec: Math.max(1, timerSec),
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;
  const hexSize = radius === 4 ? 26 : radius === 3 ? 33 : 42;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-yellow-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-yellow-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {(phase === 'MEMORIZE' || phase === 'PLAYING') && (
          <div className="flex gap-3 font-mono text-sm">
            {blindMode && phase === 'PLAYING' && (
              <span className="px-3.5 py-1.5 rounded-full bg-red-950/50 border border-red-500/50 text-red-300 font-bold">
                Va tường: {bumps}
              </span>
            )}
            <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-yellow-500/40 text-yellow-400 font-bold">
              {phase === 'MEMORIZE' ? `Ghi nhớ: ${timerSec}s` : `⏱ ${formatTime(timerSec)}`}
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 mb-2">
              MÊ CUNG TỔ ONG
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Honeycomb Hex Maze • Định hướng 6 phương lục giác
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-yellow-400">Thử thách Tổ Ong Siêu Trí Tuệ</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Di chuyển qua các ô tổ ong lục giác từ ô <span className="text-emerald-400 font-bold">Xanh lá (START)</span> bên trái sang ô{' '}
                <span className="text-amber-400 font-bold">Vàng (GOAL)</span> bên phải. Ở chế độ <strong className="text-white">Đi Mù</strong>, bạn được quan sát toàn bộ vách ngăn trong vài giây trước khi mọi vách tường bên trong biến mất!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Tổ Ong
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Quy mô tổ ong
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      [2, '19 Ô'],
                      [3, '37 Ô'],
                      [4, '61 Ô'],
                    ] as [HexRadius, string][]
                  ).map(([r, label]) => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        radius === r
                          ? 'bg-yellow-600 border-yellow-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Chế độ
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setBlindMode(false)}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      !blindMode
                        ? 'bg-yellow-600 border-yellow-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    👁️ Toàn Cảnh
                  </button>
                  <button
                    onClick={() => setBlindMode(true)}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      blindMode
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    🙈 Ghi Nhớ Đi Mù
                  </button>
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                VÀO MÊ CUNG TỔ ONG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMORIZE / PLAYING / RESULT */}
      {(phase === 'MEMORIZE' || phase === 'PLAYING' || phase === 'RESULT') && maze && (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-5 animate-fade-in">
          {phase === 'MEMORIZE' && (
            <div className="flex items-center gap-4">
              <span className="text-yellow-300 font-bold uppercase tracking-wider animate-pulse">
                Ghi nhớ các vách tường bên trong tổ ong...
              </span>
              <button
                onClick={() => {
                  setTimerSec(0);
                  setPhase('PLAYING');
                }}
                className="px-4 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-bold text-xs text-white"
              >
                Tôi Đã Nhớ!
              </button>
            </div>
          )}

          {phase === 'RESULT' && (
            <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/60 rounded-2xl p-6 text-center animate-fade-in-up">
              <h2 className="text-3xl font-black text-emerald-400 mb-1">🏆 THOÁT KHỎI TỔ ONG!</h2>
              <p className="text-slate-300 text-sm mb-4">
                Hoàn thành trong <strong className="text-yellow-400 font-mono">{formatTime(timerSec)}</strong> •{' '}
                {path.length - 1} bước (đường ngắn nhất: {maze.shortestPath.length - 1} bước)
                {blindMode ? ` • Va tường: ${bumps} lần` : ''}.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setPhase('SETUP')}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
                >
                  Cấu Hình
                </button>
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 font-bold text-sm text-white"
                >
                  Tổ Ong Mới
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl w-full max-w-2xl">
            <svg viewBox="-260 -240 520 480" className="w-full h-auto select-none">
              {maze.cells.map((cell) => {
                const k = hKey(cell);
                const [cx, cy] = hexToPixel(cell.q, cell.r, hexSize);
                const corners = Array.from({ length: 6 }, (_, i) => hexCorner(cx, cy, hexSize, i));
                const pts = corners.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

                const isCurr = hKey(pos) === k && phase === 'PLAYING';
                const isStart = hKey(maze.start) === k;
                const isGoal = hKey(maze.goal) === k;
                const inPath = pathSet.has(k);
                const inSol = phase === 'RESULT' && solSet.has(k);

                let fill = '#0f172a';
                if (isCurr) fill = '#eab308';
                else if (isGoal) fill = '#d97706';
                else if (isStart) fill = '#059669';
                else if (inSol) fill = '#854d0e';
                else if (inPath) fill = '#422006';

                const showAllWalls = !blindMode || phase !== 'PLAYING';

                return (
                  <g
                    key={k}
                    onClick={() => handleHexClick(cell)}
                    className={phase === 'PLAYING' ? 'cursor-pointer' : ''}
                  >
                    <polygon points={pts} fill={fill} stroke="#1e293b" strokeWidth="1" />
                    {/* Draw closed walls around this hex */}
                    {corners.map(([x1, y1], i) => {
                      const [x2, y2] = corners[(i + 1) % 6];
                      const dir = HEX_DIRS[EDGE_TO_DIR_INDEX[i]];
                      const nb = { q: cell.q + dir.q, r: cell.r + dir.r };
                      const ek = eKey(cell, nb);
                      const isOpen = maze.openEdges.has(ek);
                      if (isOpen) return null;

                      const isOuterWall =
                        Math.abs(nb.q) > maze.radius ||
                        Math.abs(nb.r) > maze.radius ||
                        Math.abs(nb.q + nb.r) > maze.radius;
                      const isRevealed = revealedWalls.has(ek);

                      if (!showAllWalls && !isOuterWall && !isRevealed) return null;

                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isRevealed ? '#ef4444' : isOuterWall ? '#f59e0b' : '#fbbf24'}
                          strokeWidth={isOuterWall ? 3.5 : 3}
                          strokeLinecap="round"
                        />
                      );
                    })}
                    {isCurr && <circle cx={cx} cy={cy} r={hexSize * 0.34} fill="#ffffff" />}
                    {isGoal && !isCurr && (
                      <text
                        x={cx}
                        y={cy + 5}
                        textAnchor="middle"
                        fill="#fef08a"
                        fontSize="13"
                        fontWeight="bold"
                      >
                        ★
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
