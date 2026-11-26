'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type ModeType = 'hashi' | 'numberlink';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Island {
  id: number;
  r: number;
  c: number;
  target: number;
}

interface HashiPuzzle {
  size: number;
  islands: Island[];
  solutionBridges: Record<string, number>; // key "a-b" -> 1 or 2
}

interface NumberlinkTemplate {
  size: number;
  paths: [number, number][][];
}

const PAIR_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#a855f7',
  '#06b6d4',
  '#ec4899',
];

const bridgeKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Generates a 100% connected, non-crossing planar Hashiwokakero puzzle */
function generateHashiPuzzle(difficulty: Difficulty): HashiPuzzle {
  const size = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 6 : 7;
  const targetIslands = difficulty === 'easy' ? 7 : difficulty === 'medium' ? 10 : 13;

  const gridOccupied = Array.from({ length: size }, () => Array(size).fill(-1));
  const islands: { id: number; r: number; c: number }[] = [];
  const bridges: Record<string, number> = {};

  // Track horizontal & vertical bridge segments to forbid crossings
  const hSegs: { r: number; c1: number; c2: number }[] = [];
  const vSegs: { c: number; r1: number; r2: number }[] = [];

  const canConnect = (r1: number, c1: number, r2: number, c2: number): boolean => {
    if (r1 === r2) {
      const lo = Math.min(c1, c2);
      const hi = Math.max(c1, c2);
      for (let c = lo + 1; c < hi; c++) {
        if (gridOccupied[r1][c] !== -1) return false;
      }
      for (const v of vSegs) {
        if (v.c > lo && v.c < hi && r1 > v.r1 && r1 < v.r2) return false;
      }
      for (const h of hSegs) {
        if (h.r === r1 && Math.max(lo, h.c1) < Math.min(hi, h.c2)) return false;
      }
      return true;
    }
    if (c1 === c2) {
      const lo = Math.min(r1, r2);
      const hi = Math.max(r1, r2);
      for (let r = lo + 1; r < hi; r++) {
        if (gridOccupied[r][c1] !== -1) return false;
      }
      for (const h of hSegs) {
        if (h.r > lo && h.r < hi && c1 > h.c1 && c1 < h.c2) return false;
      }
      for (const v of vSegs) {
        if (v.c === c1 && Math.max(lo, v.r1) < Math.min(hi, v.r2)) return false;
      }
      return true;
    }
    return false;
  };

  const addBridge = (idA: number, idB: number, count: number) => {
    const a = islands[idA];
    const b = islands[idB];
    bridges[bridgeKey(idA, idB)] = count;
    if (a.r === b.r) {
      hSegs.push({ r: a.r, c1: Math.min(a.c, b.c), c2: Math.max(a.c, b.c) });
    } else {
      vSegs.push({ c: a.c, r1: Math.min(a.r, b.r), r2: Math.max(a.r, b.r) });
    }
  };

  const startR = Math.floor(size / 2);
  const startC = Math.floor(size / 2);
  gridOccupied[startR][startC] = 0;
  islands.push({ id: 0, r: startR, c: startC });

  let guard = 0;
  while (islands.length < targetIslands && guard < 400) {
    guard++;
    const base = islands[Math.floor(Math.random() * islands.length)];
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ].sort(() => Math.random() - 0.5);

    for (const [dr, dc] of dirs) {
      const dist = Math.floor(Math.random() * (size - 2)) + 2;
      const nr = base.r + dr * dist;
      const nc = base.c + dc * dist;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (gridOccupied[nr][nc] !== -1) continue;
      // Avoid orthogonally adjacent islands (keeps bridges cleanly visible)
      const hasAdj = [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ].some(([ar, ac]) => {
        const rr = nr + ar;
        const cc = nc + ac;
        return rr >= 0 && rr < size && cc >= 0 && cc < size && gridOccupied[rr][cc] !== -1;
      });
      if (hasAdj) continue;
      if (!canConnect(base.r, base.c, nr, nc)) continue;

      const newId = islands.length;
      gridOccupied[nr][nc] = newId;
      islands.push({ id: newId, r: nr, c: nc });
      addBridge(base.id, newId, Math.random() < 0.45 ? 2 : 1);
      break;
    }
  }

  // Add a few extra cycle bridges where aligned & non-crossing
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const k = bridgeKey(i, j);
      if (bridges[k]) continue;
      const a = islands[i];
      const b = islands[j];
      if ((a.r === b.r || a.c === b.c) && canConnect(a.r, a.c, b.r, b.c) && Math.random() < 0.35) {
        addBridge(i, j, Math.random() < 0.4 ? 2 : 1);
      }
    }
  }

  const finalIslands: Island[] = islands.map((isl) => {
    let sum = 0;
    for (const [k, cnt] of Object.entries(bridges)) {
      const [a, b] = k.split('-').map(Number);
      if (a === isl.id || b === isl.id) sum += cnt;
    }
    return { ...isl, target: sum };
  });

  return { size, islands: finalIslands, solutionBridges: bridges };
}

// Verified 100%-board-filling Numberlink templates (transformed via random rotation/flip!)
const NUMBERLINK_TEMPLATES: Record<Difficulty, NumberlinkTemplate[]> = {
  easy: [
    {
      size: 5,
      paths: [
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4]],
        [[1, 0], [1, 1], [1, 2], [1, 3]],
        [[2, 0], [3, 0], [4, 0], [4, 1], [4, 2]],
        [[2, 1], [2, 2], [3, 2], [3, 1]],
        [[2, 3], [2, 4], [3, 4], [4, 4], [4, 3], [3, 3]],
      ],
    },
    {
      size: 5,
      paths: [
        [[0, 0], [1, 0], [2, 0], [2, 1], [1, 1]],
        [[0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
        [[1, 2], [1, 3], [2, 3], [2, 2]],
        [[3, 0], [4, 0], [4, 1], [3, 1], [3, 2]],
        [[4, 2], [4, 3], [4, 4], [3, 4], [3, 3]],
      ],
    },
  ],
  medium: [
    {
      size: 6,
      paths: [
        [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 5]],
        [[1, 0], [1, 1], [1, 2], [2, 2], [2, 1]],
        [[2, 0], [3, 0], [4, 0], [5, 0], [5, 1], [4, 1], [3, 1]],
        [[1, 3], [1, 4], [2, 4], [2, 3], [3, 3], [3, 2]],
        [[2, 5], [3, 5], [4, 5], [5, 5], [5, 4]],
        [[4, 2], [5, 2], [5, 3], [4, 3], [4, 4], [3, 4]],
      ],
    },
  ],
  hard: [
    {
      size: 6,
      paths: [
        [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [2, 1]],
        [[0, 1], [0, 2], [0, 3], [1, 3], [1, 2], [1, 1]],
        [[0, 4], [0, 5], [1, 5], [2, 5], [2, 4], [1, 4]],
        [[2, 2], [2, 3], [3, 3], [3, 2], [4, 2], [4, 3]],
        [[4, 0], [5, 0], [5, 1], [4, 1]],
        [[5, 2], [5, 3], [5, 4], [5, 5], [4, 5], [3, 5], [3, 4], [4, 4]],
      ],
    },
  ],
};

function generateNumberlinkPuzzle(difficulty: Difficulty): {
  size: number;
  endpoints: { pairId: number; r: number; c: number }[];
} {
  const pool = NUMBERLINK_TEMPLATES[difficulty];
  const tpl = pool[Math.floor(Math.random() * pool.length)];

  const rotCount = Math.floor(Math.random() * 4);
  const flip = Math.random() < 0.5;
  const n = tpl.size;

  const transformCoord = (r: number, c: number): [number, number] => {
    let nr = r;
    let nc = c;
    for (let i = 0; i < rotCount; i++) {
      const tmp = nr;
      nr = nc;
      nc = n - 1 - tmp;
    }
    if (flip) nc = n - 1 - nc;
    return [nr, nc];
  };

  const shuffledPaths = [...tpl.paths].sort(() => Math.random() - 0.5);
  const endpoints: { pairId: number; r: number; c: number }[] = [];
  shuffledPaths.forEach((path, idx) => {
    const [r1, c1] = transformCoord(path[0][0], path[0][1]);
    const [r2, c2] = transformCoord(path[path.length - 1][0], path[path.length - 1][1]);
    endpoints.push({ pairId: idx + 1, r: r1, c: c1 });
    endpoints.push({ pairId: idx + 1, r: r2, c: c2 });
  });

  return { size: n, endpoints };
}

export default function LogicBridgesGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [mode, setMode] = useState<ModeType>('hashi');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');

  // Hashi state
  const [hashi, setHashi] = useState<HashiPuzzle | null>(null);
  const [selectedIsland, setSelectedIsland] = useState<number | null>(null);
  const [playerBridges, setPlayerBridges] = useState<Record<string, number>>({});

  // Numberlink state
  const [nlSize, setNlSize] = useState(5);
  const [nlEndpoints, setNlEndpoints] = useState<{ pairId: number; r: number; c: number }[]>([]);
  const [nlPaths, setNlPaths] = useState<Record<number, [number, number][]>>({});
  const [activePair, setActivePair] = useState<number | null>(null);

  const [elapsedSec, setElapsedSec] = useState(0);
  const [isWin, setIsWin] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setElapsedSec(0);
    setIsWin(false);
    if (mode === 'hashi') {
      setHashi(generateHashiPuzzle(difficulty));
      setSelectedIsland(null);
      setPlayerBridges({});
    } else {
      const nl = generateNumberlinkPuzzle(difficulty);
      setNlSize(nl.size);
      setNlEndpoints(nl.endpoints);
      setNlPaths({});
      setActivePair(null);
    }
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

  // Hashi degree & connectivity check
  const islandDegrees = useMemo(() => {
    const deg: Record<number, number> = {};
    if (!hashi) return deg;
    hashi.islands.forEach((isl) => {
      deg[isl.id] = 0;
    });
    for (const [k, cnt] of Object.entries(playerBridges)) {
      if (cnt <= 0) continue;
      const [a, b] = k.split('-').map(Number);
      deg[a] = (deg[a] ?? 0) + cnt;
      deg[b] = (deg[b] ?? 0) + cnt;
    }
    return deg;
  }, [hashi, playerBridges]);

  const checkHashiWin = (nextBridges: Record<string, number>) => {
    if (!hashi) return false;
    const deg: Record<number, number> = {};
    const adj: Record<number, number[]> = {};
    hashi.islands.forEach((isl) => {
      deg[isl.id] = 0;
      adj[isl.id] = [];
    });
    for (const [k, cnt] of Object.entries(nextBridges)) {
      if (cnt <= 0) continue;
      const [a, b] = k.split('-').map(Number);
      deg[a] += cnt;
      deg[b] += cnt;
      adj[a].push(b);
      adj[b].push(a);
    }
    if (!hashi.islands.every((isl) => deg[isl.id] === isl.target)) return false;
    // BFS connectivity check
    const seen = new Set<number>([0]);
    const q = [0];
    while (q.length > 0) {
      const u = q.shift()!;
      for (const v of adj[u]) {
        if (!seen.has(v)) {
          seen.add(v);
          q.push(v);
        }
      }
    }
    return seen.size === hashi.islands.length;
  };

  const handleIslandClick = (id: number) => {
    if (!hashi || phase !== 'PLAYING') return;
    if (selectedIsland === null) {
      setSelectedIsland(id);
      playClick();
      return;
    }
    if (selectedIsland === id) {
      setSelectedIsland(null);
      return;
    }

    const a = hashi.islands[selectedIsland];
    const b = hashi.islands[id];
    if (a.r !== b.r && a.c !== b.c) {
      setSelectedIsland(id);
      playClick();
      return;
    }

    // Check no intermediate island sits between a & b
    const blockedByIsland = hashi.islands.some((o) => {
      if (o.id === a.id || o.id === b.id) return false;
      if (a.r === b.r && o.r === a.r) {
        return o.c > Math.min(a.c, b.c) && o.c < Math.max(a.c, b.c);
      }
      if (a.c === b.c && o.c === a.c) {
        return o.r > Math.min(a.r, b.r) && o.r < Math.max(a.r, b.r);
      }
      return false;
    });

    // Check no crossing perpendicular bridge
    const crossesExisting = Object.entries(playerBridges).some(([k, cnt]) => {
      if (cnt <= 0) return false;
      const [uId, vId] = k.split('-').map(Number);
      const u = hashi.islands[uId];
      const v = hashi.islands[vId];
      if (a.r === b.r && u.c === v.c) {
        return (
          u.c > Math.min(a.c, b.c) &&
          u.c < Math.max(a.c, b.c) &&
          a.r > Math.min(u.r, v.r) &&
          a.r < Math.max(u.r, v.r)
        );
      }
      if (a.c === b.c && u.r === v.r) {
        return (
          u.r > Math.min(a.r, b.r) &&
          u.r < Math.max(a.r, b.r) &&
          a.c > Math.min(u.c, v.c) &&
          a.c < Math.max(u.c, v.c)
        );
      }
      return false;
    });

    if (blockedByIsland || crossesExisting) {
      playError();
      setSelectedIsland(null);
      return;
    }

    const k = bridgeKey(a.id, b.id);
    const nextVal = ((playerBridges[k] ?? 0) + 1) % 3;
    const nextBridges = { ...playerBridges, [k]: nextVal };
    setPlayerBridges(nextBridges);
    setSelectedIsland(null);
    playClick();

    if (checkHashiWin(nextBridges)) {
      playSuccess();
      setIsWin(true);
      setPhase('RESULT');
    }
  };

  // Numberlink cell occupancy map
  const nlCellOwner = useMemo(() => {
    const map = new Map<string, number>();
    for (const [pidStr, cells] of Object.entries(nlPaths)) {
      const pid = Number(pidStr);
      for (const [r, c] of cells) {
        map.set(`${r},${c}`, pid);
      }
    }
    return map;
  }, [nlPaths]);

  const checkNumberlinkWin = (nextPaths: Record<number, [number, number][]>) => {
    const pairIds = Array.from(new Set(nlEndpoints.map((e) => e.pairId)));
    let totalCovered = 0;
    for (const pid of pairIds) {
      const p = nextPaths[pid];
      if (!p || p.length < 2) return false;
      const eps = nlEndpoints.filter((e) => e.pairId === pid);
      const first = p[0];
      const last = p[p.length - 1];
      const matchForward =
        first[0] === eps[0].r &&
        first[1] === eps[0].c &&
        last[0] === eps[1].r &&
        last[1] === eps[1].c;
      const matchReverse =
        first[0] === eps[1].r &&
        first[1] === eps[1].c &&
        last[0] === eps[0].r &&
        last[1] === eps[0].c;
      if (!matchForward && !matchReverse) return false;
      totalCovered += p.length;
    }
    return totalCovered === nlSize * nlSize;
  };

  const handleNlCellClick = (r: number, c: number) => {
    if (phase !== 'PLAYING') return;
    const ep = nlEndpoints.find((e) => e.r === r && e.c === c);

    // Clicking an endpoint starts or completes that pair's path
    if (ep) {
      if (activePair === ep.pairId) {
        const cur = nlPaths[ep.pairId] ?? [];
        if (cur.length > 0) {
          const last = cur[cur.length - 1];
          if (Math.abs(last[0] - r) + Math.abs(last[1] - c) === 1 && !(cur[0][0] === r && cur[0][1] === c)) {
            const nextPaths = { ...nlPaths, [ep.pairId]: [...cur, [r, c] as [number, number]] };
            setNlPaths(nextPaths);
            setActivePair(null);
            playSuccess();
            if (checkNumberlinkWin(nextPaths)) {
              setIsWin(true);
              setPhase('RESULT');
            }
            return;
          }
        }
      }
      // Start fresh from this endpoint
      setNlPaths((prev) => ({ ...prev, [ep.pairId]: [[r, c]] }));
      setActivePair(ep.pairId);
      playClick();
      return;
    }

    if (activePair === null) return;
    const cur = nlPaths[activePair] ?? [];
    if (cur.length === 0) return;

    // Backtrack if clicking existing cell in current path
    const idxInCur = cur.findIndex(([pr, pc]) => pr === r && pc === c);
    if (idxInCur !== -1) {
      setNlPaths((prev) => ({ ...prev, [activePair]: cur.slice(0, idxInCur + 1) }));
      playClick();
      return;
    }

    const last = cur[cur.length - 1];
    if (Math.abs(last[0] - r) + Math.abs(last[1] - c) !== 1) return;

    // Cannot cross another pair's path
    const owner = nlCellOwner.get(`${r},${c}`);
    if (owner !== undefined && owner !== activePair) {
      playError();
      return;
    }

    setNlPaths((prev) => ({ ...prev, [activePair]: [...cur, [r, c]] }));
    playClick();
  };

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'logic-bridges',
    won: isWin,
    accuracy: isWin ? 100 : 0,
    scoreLabel: `${mode === 'hashi' ? 'Hashi' : 'Numberlink'} (${difficulty})`,
    durationSec: Math.max(1, elapsedSec),
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-indigo-500">
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-indigo-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-indigo-500/40 text-indigo-300 font-bold">
            ⏱ {formatTime(elapsedSec)}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-2">
              LOGIC TUNG HOÀNH
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Hashiwokakero &amp; Numberlink • Tư duy kết nối mạng lưới
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-indigo-400 mb-2">🌉 Xây Cầu Đảo Số (Hashi)</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Click lần lượt 2 đảo cùng hàng/cột để nối 1 hoặc 2 cây cầu ngang/dọc (không cắt nhau). Mọi đảo phải đạt đúng số cầu ghi trên đảo và kết nối thành 1 cụm liên thông duy nhất!
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">🔗 Nối Cặp Số (Numberlink)</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Click vào một số rồi nối từng ô kề nhau sang số giống nó mà không cắt đường khác, sao cho <strong className="text-white">phủ kín 100% ô trên bàn cờ</strong>.
                </p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Cấu Hình Bàn Cờ
                </h3>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Chế độ chơi
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMode('hashi')}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        mode === 'hashi'
                          ? 'bg-indigo-600 border-indigo-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      🌉 Xây Cầu (Hashi)
                    </button>
                    <button
                      onClick={() => setMode('numberlink')}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        mode === 'numberlink'
                          ? 'bg-cyan-600 border-cyan-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      🔗 Nối Số (Numberlink)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Độ khó
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['easy', 'Dễ'],
                        ['medium', 'Vừa'],
                        ['hard', 'Khó'],
                      ] as [Difficulty, string][]
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setDifficulty(k)}
                        className={`py-2 rounded-xl text-sm font-bold border cursor-pointer ${
                          difficulty === k
                            ? 'bg-indigo-600 border-indigo-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
                >
                  BẮT ĐẦU GIẢI MÃ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING: HASHI */}
      {phase === 'PLAYING' && mode === 'hashi' && hashi && (
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-5 animate-fade-in">
          <p className="text-sm text-slate-400 text-center">
            Click đảo thứ nhất rồi click đảo thứ hai cùng hàng/cột để nối <strong>1 → 2 → 0</strong> cây cầu.
          </p>

          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 shadow-2xl w-full max-w-xl">
            {(() => {
              const cell = 72;
              const pad = 42;
              const dim = (hashi.size - 1) * cell + pad * 2;
              const px = (idx: number) => pad + idx * cell;

              return (
                <svg viewBox={`0 0 ${dim} ${dim}`} className="w-full h-auto bg-slate-950 rounded-2xl">
                  {/* Subtle grid dots */}
                  {Array.from({ length: hashi.size }).map((_, r) =>
                    Array.from({ length: hashi.size }).map((__, c) => (
                      <circle
                        key={`dot-${r}-${c}`}
                        cx={px(c)}
                        cy={px(r)}
                        r="2.5"
                        fill="#1e293b"
                      />
                    ))
                  )}

                  {/* Player bridges */}
                  {Object.entries(playerBridges).map(([k, cnt]) => {
                    if (cnt <= 0) return null;
                    const [aId, bId] = k.split('-').map(Number);
                    const a = hashi.islands[aId];
                    const b = hashi.islands[bId];
                    const x1 = px(a.c);
                    const y1 = px(a.r);
                    const x2 = px(b.c);
                    const y2 = px(b.r);

                    if (cnt === 1) {
                      return (
                        <line
                          key={k}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#38bdf8"
                          strokeWidth="5"
                        />
                      );
                    }
                    const isHoriz = a.r === b.r;
                    const dx = isHoriz ? 0 : 6;
                    const dy = isHoriz ? 6 : 0;
                    return (
                      <g key={k}>
                        <line
                          x1={x1 - dx}
                          y1={y1 - dy}
                          x2={x2 - dx}
                          y2={y2 - dy}
                          stroke="#818cf8"
                          strokeWidth="4"
                        />
                        <line
                          x1={x1 + dx}
                          y1={y1 + dy}
                          x2={x2 + dx}
                          y2={y2 + dy}
                          stroke="#818cf8"
                          strokeWidth="4"
                        />
                      </g>
                    );
                  })}

                  {/* Islands */}
                  {hashi.islands.map((isl) => {
                    const deg = islandDegrees[isl.id] ?? 0;
                    const matched = deg === isl.target;
                    const over = deg > isl.target;
                    const isSel = selectedIsland === isl.id;
                    return (
                      <g
                        key={isl.id}
                        onClick={() => handleIslandClick(isl.id)}
                        className="cursor-pointer"
                      >
                        <circle
                          cx={px(isl.c)}
                          cy={px(isl.r)}
                          r="23"
                          fill={
                            isSel
                              ? '#4f46e5'
                              : matched
                                ? '#065f46'
                                : over
                                  ? '#7f1d1d'
                                  : '#0f172a'
                          }
                          stroke={
                            isSel
                              ? '#c7d2fe'
                              : matched
                                ? '#34d399'
                                : over
                                  ? '#f87171'
                                  : '#6366f1'
                          }
                          strokeWidth={isSel ? 4 : 3}
                        />
                        <text
                          x={px(isl.c)}
                          y={px(isl.r) + 6}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="18"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {isl.target}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setPlayerBridges({});
                setSelectedIsland(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
            >
              Xóa Hết Cầu
            </button>
            <button
              onClick={startGame}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white"
            >
              Bản Đồ Mới
            </button>
          </div>
        </div>
      )}

      {/* PLAYING: NUMBERLINK */}
      {phase === 'PLAYING' && mode === 'numberlink' && (
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-5 animate-fade-in">
          <p className="text-sm text-slate-400 text-center">
            Click vào một số để bắt đầu kéo dây, rồi click lần lượt từng ô kề nhau tới số giống nó và <strong>phủ kín toàn bảng</strong>.
          </p>

          <div
            className="grid gap-1.5 bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-2xl select-none"
            style={{ gridTemplateColumns: `repeat(${nlSize}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: nlSize }).map((_, r) =>
              Array.from({ length: nlSize }).map((__, c) => {
                const ep = nlEndpoints.find((e) => e.r === r && e.c === c);
                const owner = nlCellOwner.get(`${r},${c}`);
                const colorId = ep ? ep.pairId : owner;
                const color = colorId ? PAIR_COLORS[(colorId - 1) % PAIR_COLORS.length] : undefined;
                const isActiveHead =
                  activePair !== null &&
                  nlPaths[activePair]?.length > 0 &&
                  nlPaths[activePair][nlPaths[activePair].length - 1][0] === r &&
                  nlPaths[activePair][nlPaths[activePair].length - 1][1] === c;

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    onClick={() => handleNlCellClick(r, c)}
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center font-mono font-black text-xl transition-all cursor-pointer border-2 ${
                      isActiveHead ? 'ring-4 ring-white z-10 scale-105' : ''
                    }`}
                    style={{
                      backgroundColor: ep
                        ? color
                        : color
                          ? `${color}45`
                          : '#0f172a',
                      borderColor: color ?? '#1e293b',
                      color: '#ffffff',
                    }}
                  >
                    {ep ? ep.pairId : owner ? '•' : ''}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setNlPaths({});
                setActivePair(null);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
            >
              Xóa Toàn Bộ Dây
            </button>
            <button
              onClick={startGame}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-sm text-white"
            >
              Đề Mới
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-emerald-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="text-4xl font-black text-emerald-400 mb-2">GIẢI MÃ THÀNH CÔNG!</h2>
          <p className="text-slate-300 mb-8">
            Bạn đã hoàn thiện bàn cờ{' '}
            <strong className="text-white">
              {mode === 'hashi' ? 'Hashiwokakero' : 'Numberlink'}
            </strong>{' '}
            trong <strong className="text-indigo-400 font-mono">{formatTime(elapsedSec)}</strong>.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Chế Độ
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-xl font-bold text-white"
            >
              Chơi Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
