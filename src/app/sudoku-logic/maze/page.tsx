'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type GridSize = 5 | 7 | 10;
type RuleType = 'parity' | 'prime' | 'div3';

interface GameSettings {
  gridSize: GridSize;
  ruleType: RuleType;
  timeMode: 'manual' | 'timer';
  timeLimit: number;
}

interface Cell {
  r: number;
  c: number;
  val: number;
}

const isPrime = (num: number) => {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
};

const isValidStep = (currentVal: number, nextVal: number, rule: RuleType) => {
  if (rule === 'parity') return currentVal % 2 !== nextVal % 2;
  if (rule === 'prime') return isPrime(nextVal);
  if (rule === 'div3') return nextVal % 3 === 0;
  return false;
};

const generateValue = (isValid: boolean, prevVal: number, rule: RuleType) => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const val = Math.floor(Math.random() * 90) + 2;
    let check = false;
    if (rule === 'parity') {
      const isDiffParity = val % 2 !== prevVal % 2;
      check = isValid ? isDiffParity : !isDiffParity;
    } else if (rule === 'prime') {
      check = isValid ? isPrime(val) : !isPrime(val);
    } else if (rule === 'div3') {
      const isDiv3 = val % 3 === 0;
      check = isValid ? isDiv3 : !isDiv3;
    }
    if (check) return val;
  }
  if (rule === 'prime') return isValid ? 2 : 4;
  if (rule === 'div3') return isValid ? 3 : 4;
  return isValid ? (prevVal % 2 === 0 ? 3 : 2) : prevVal % 2 === 0 ? 2 : 3;
};

const findShortestValidPath = (grid: number[][], rule: RuleType): Cell[] | null => {
  const size = grid.length;
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const parent: ({ r: number; c: number } | null)[][] = Array.from({ length: size }, () =>
    Array(size).fill(null)
  );
  const queue: { r: number; c: number }[] = [{ r: 0, c: 0 }];
  visited[0][0] = true;

  const dirs = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.r === size - 1 && curr.c === size - 1) {
      const path: Cell[] = [];
      let trace: { r: number; c: number } | null = curr;
      while (trace) {
        path.push({ r: trace.r, c: trace.c, val: grid[trace.r][trace.c] });
        trace = parent[trace.r][trace.c];
      }
      return path.reverse();
    }

    for (const [dr, dc] of dirs) {
      const nr = curr.r + dr;
      const nc = curr.c + dc;
      if (
        nr >= 0 &&
        nr < size &&
        nc >= 0 &&
        nc < size &&
        !visited[nr][nc] &&
        isValidStep(grid[curr.r][curr.c], grid[nr][nc], rule)
      ) {
        visited[nr][nc] = true;
        parent[nr][nc] = curr;
        queue.push({ r: nr, c: nc });
      }
    }
  }

  return null;
};

const generateMaze = (size: number, rule: RuleType): { grid: number[][]; solutionPath: Cell[] } => {
  const grid = Array.from({ length: size }, () => Array(size).fill(-1));

  let startVal = 0;
  if (rule === 'prime') {
    while (!isPrime(startVal)) startVal = Math.floor(Math.random() * 50) + 2;
  } else if (rule === 'div3') {
    startVal = 3 * (Math.floor(Math.random() * 20) + 1);
  } else {
    startVal = Math.floor(Math.random() * 50) + 1;
  }

  // Generate a winding simple path from (0,0) to (size-1, size-1) via DFS
  const visited = Array.from({ length: size }, () => Array(size).fill(false));
  const rawPath: { r: number; c: number }[] = [];

  const dfs = (r: number, c: number): boolean => {
    visited[r][c] = true;
    rawPath.push({ r, c });
    if (r === size - 1 && c === size - 1) return true;

    const candidates = [
      { r: r + 1, c, weight: 3 },
      { r, c: c + 1, weight: 3 },
      { r: r - 1, c, weight: 1 },
      { r, c: c - 1, weight: 1 },
    ].filter((m) => m.r >= 0 && m.r < size && m.c >= 0 && m.c < size && !visited[m.r][m.c]);

    // Weighted shuffle so paths meander naturally without dead-ending endlessly
    candidates.sort((a, b) => Math.random() * b.weight - Math.random() * a.weight);

    for (const next of candidates) {
      if (dfs(next.r, next.c)) return true;
    }

    rawPath.pop();
    return false;
  };

  dfs(0, 0);

  grid[0][0] = startVal;
  for (let i = 1; i < rawPath.length; i++) {
    const prev = rawPath[i - 1];
    const curr = rawPath[i];
    grid[curr.r][curr.c] = generateValue(true, grid[prev.r][prev.c], rule);
  }

  // Fill remaining cells with traps & obstacles
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === -1) {
        if (rule === 'parity') {
          // Match parity with (r+c) parity half the time to create subtle parity traps
          const desiredParity = (startVal + r + c) % 2;
          const isTrap = Math.random() < 0.35;
          const targetParity = isTrap ? desiredParity : 1 - desiredParity;
          const base = Math.floor(Math.random() * 44) * 2 + 2;
          grid[r][c] = base + targetParity;
        } else {
          const isTrap = Math.random() < 0.28;
          grid[r][c] = generateValue(isTrap, startVal, rule);
        }
      }
    }
  }

  const optimalPath =
    findShortestValidPath(grid, rule) ??
    rawPath.map((p) => ({ r: p.r, c: p.c, val: grid[p.r][p.c] }));

  return { grid, solutionPath: optimalPath };
};

export default function NumberMazeGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    gridSize: 7,
    ruleType: 'parity',
    timeMode: 'manual',
    timeLimit: 60,
  });

  const [grid, setGrid] = useState<number[][]>([]);
  const [playerPath, setPlayerPath] = useState<Cell[]>([]);
  const [solutionPath, setSolutionPath] = useState<Cell[]>([]);
  const [currentPos, setCurrentPos] = useState<Cell>({ r: 0, c: 0, val: 0 });

  const [displayTime, setDisplayTime] = useState(0);
  const [isWin, setIsWin] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeCounterRef = useRef(0);
  const boardRef = useRef<HTMLDivElement>(null);

  const startGame = () => {
    const { grid: newGrid, solutionPath: sol } = generateMaze(
      settings.gridSize,
      settings.ruleType
    );
    setGrid(newGrid);
    setSolutionPath(sol);

    const startCell = { r: 0, c: 0, val: newGrid[0][0] };
    setPlayerPath([startCell]);
    setCurrentPos(startCell);

    const initialTime = settings.timeMode === 'timer' ? settings.timeLimit : 0;
    timeCounterRef.current = initialTime;
    setDisplayTime(initialTime);

    setShowSolution(false);
    setPhase('PLAYING');
  };

  const checkWin = useCallback(
    (finalPath: Cell[]) => {
      for (let i = 0; i < finalPath.length - 1; i++) {
        if (!isValidStep(finalPath[i].val, finalPath[i + 1].val, settings.ruleType)) {
          return false;
        }
      }
      return true;
    },
    [settings.ruleType]
  );

  const handleMove = useCallback(
    (r: number, c: number) => {
      if (phase !== 'PLAYING') return;

      const dr = Math.abs(r - currentPos.r);
      const dc = Math.abs(c - currentPos.c);
      const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
      if (!isAdjacent) return;

      // Undo previous step
      if (playerPath.length > 1) {
        const prev = playerPath[playerPath.length - 2];
        if (prev.r === r && prev.c === c) {
          setPlayerPath((prevPath) => prevPath.slice(0, -1));
          setCurrentPos(prev);
          return;
        }
      }

      // Prevent stepping onto an already visited earlier cell (avoid loops)
      if (playerPath.some((p) => p.r === r && p.c === c)) return;

      const nextVal = grid[r][c];
      const newCell = { r, c, val: nextVal };
      const newPath = [...playerPath, newCell];

      setPlayerPath(newPath);
      setCurrentPos(newCell);

      if (r === settings.gridSize - 1 && c === settings.gridSize - 1) {
        const win = checkWin(newPath);
        setIsWin(win);
        setPhase('RESULT');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    },
    [phase, currentPos, playerPath, grid, settings.gridSize, checkWin]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PLAYING') return;
      const { r, c } = currentPos;
      let nextR = r;
      let nextC = c;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        nextR--;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nextR++;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextC--;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextC++;
      } else {
        return;
      }

      if (nextR >= 0 && nextR < settings.gridSize && nextC >= 0 && nextC < settings.gridSize) {
        handleMove(nextR, nextC);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, currentPos, settings.gridSize, handleMove]);

  // Clean timer
  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (settings.timeMode === 'timer') {
        timeCounterRef.current -= 1;
        if (timeCounterRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDisplayTime(0);
          setIsWin(false);
          setPhase('RESULT');
          return;
        }
        setDisplayTime(timeCounterRef.current);
      } else {
        timeCounterRef.current += 1;
        setDisplayTime(timeCounterRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, settings.timeMode]);

  const formatTime = (val: number) => {
    const m = Math.floor(val / 60);
    const s = val % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getGridCols = () => {
    if (settings.gridSize === 5) return 'grid-cols-5';
    if (settings.gridSize === 7) return 'grid-cols-7';
    return 'grid-cols-10';
  };

  const getRuleDesc = () => {
    if (settings.ruleType === 'parity') return 'Đi xen kẽ: CHẴN → LẺ → CHẴN...';
    if (settings.ruleType === 'prime') return 'Chỉ đi vào các ô số NGUYÊN TỐ.';
    if (settings.ruleType === 'div3') return 'Chỉ đi vào các ô CHIA HẾT CHO 3.';
    return '';
  };

  const isPlayerStepInvalid = (index: number): boolean => {
    if (index <= 0) return false;
    return !isValidStep(playerPath[index - 1].val, playerPath[index].val, settings.ruleType);
  };

  const getCellStyle = (r: number, c: number) => {
    const baseClass =
      'flex items-center justify-center font-bold text-lg md:text-2xl rounded-lg shadow-md transition-all duration-200 select-none cursor-pointer ';

    const playerIndex = playerPath.findIndex((p) => p.r === r && p.c === c);
    const isPlayerPath = playerIndex !== -1;
    const isOptimalSolution = solutionPath.some((p) => p.r === r && p.c === c);

    if (phase === 'RESULT') {
      if (showSolution && isOptimalSolution) {
        return (
          baseClass +
          'bg-yellow-500 text-black border-2 border-yellow-300 ring-2 ring-yellow-500/50 z-20 scale-105'
        );
      }
      if (isPlayerPath) {
        if (isWin) {
          return baseClass + 'bg-emerald-600 text-white border border-emerald-400';
        }
        return isPlayerStepInvalid(playerIndex)
          ? baseClass + 'bg-red-600 text-white border-2 border-red-300 z-10'
          : baseClass + 'bg-rose-900/70 text-rose-200 border border-rose-700';
      }
      return baseClass + 'bg-slate-800 text-slate-600 opacity-40';
    }

    const isCurrent = currentPos.r === r && currentPos.c === c;
    const isStart = r === 0 && c === 0;
    const isEnd = r === settings.gridSize - 1 && c === settings.gridSize - 1;

    if (isCurrent) {
      return baseClass + 'bg-rose-500 text-white scale-110 z-10 ring-4 ring-rose-300 shadow-xl';
    }
    if (isPlayerPath) {
      return baseClass + 'bg-rose-900/60 text-rose-200 border border-rose-700';
    }
    if (isStart) {
      return baseClass + 'bg-emerald-800 text-emerald-300 border-2 border-emerald-500';
    }
    if (isEnd) {
      return baseClass + 'bg-amber-800 text-amber-300 border-2 border-amber-500 animate-pulse';
    }
    return baseClass + 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/50';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-rose-500 selection:text-white">
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center fixed w-full z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <Link
          href="/sudoku-logic"
          className="inline-flex items-center text-slate-500 hover:text-rose-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Menu
        </Link>
        {phase === 'PLAYING' && (
          <div
            className={`font-mono text-2xl font-bold px-6 py-2 rounded-xl border-2 shadow-lg backdrop-blur-md ${
              settings.timeMode === 'timer' && displayTime < 10
                ? 'border-red-500 text-red-500 animate-pulse bg-red-900/20'
                : 'border-rose-500/50 text-rose-400 bg-slate-900/80'
            }`}
          >
            {settings.timeMode === 'timer' ? 'Còn lại: ' : 'Thời gian: '} {formatTime(displayTime)}
          </div>
        )}
      </div>

      {/* --- SETUP --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-600 mb-2">
              NUMBER MAZE
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Mê Cung Số • Logic Pathfinder
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-rose-900/50 text-rose-400 flex items-center justify-center mr-3 text-sm">
                    01
                  </span>
                  Nhiệm vụ
                </h2>
                <div className="space-y-4 text-lg text-slate-300 leading-relaxed">
                  <p>
                    Tìm đường đi hợp lệ (và ngắn nhất có thể) từ <strong className="text-white">START</strong> đến{' '}
                    <strong className="text-white">END</strong>. Bạn được tự do di chuyển sang các ô lân cận, nhưng hãy cẩn thận!
                  </p>
                  <p>
                    Hệ thống sẽ <strong className="text-white">KHÔNG CHẶN</strong> nếu bạn đi sai luật. Bạn phải tự mình kiểm tra từng con số. Khi bạn bước chân vào ô Đích, phán quyết cuối cùng mới được đưa ra.
                  </p>
                </div>
              </section>

              <section>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-rose-400 font-bold text-lg mb-2 uppercase">
                    Quy Luật Di Chuyển
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-800 p-4 rounded border-l-4 border-emerald-500">
                      <div className="font-bold text-white mb-1">Chẵn / Lẻ</div>
                      <p className="text-xs text-slate-400">
                        Bước đi phải xen kẽ: Chẵn → Lẻ → Chẵn...
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded border-l-4 border-amber-500">
                      <div className="font-bold text-white mb-1">Nguyên Tố</div>
                      <p className="text-xs text-slate-400">
                        Chỉ được phép đi vào các ô Số Nguyên Tố.
                      </p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded border-l-4 border-blue-500">
                      <div className="font-bold text-white mb-1">Bội Số 3</div>
                      <p className="text-xs text-slate-400">Chỉ đi vào ô chia hết cho 3.</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Thiết lập
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Kích thước
                    </label>
                    <div className="flex gap-2">
                      {([5, 7, 10] as GridSize[]).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSettings({ ...settings, gridSize: sz })}
                          className={`flex-1 py-2 text-sm font-bold rounded border ${
                            settings.gridSize === sz
                              ? 'bg-rose-600 border-rose-500 text-white'
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
                      Quy luật
                    </label>
                    <select
                      value={settings.ruleType}
                      onChange={(e) =>
                        setSettings({ ...settings, ruleType: e.target.value as RuleType })
                      }
                      className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-600 outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="parity">☯️ Chẵn / Lẻ (Xen kẽ)</option>
                      <option value="prime">🌟 Số Nguyên Tố</option>
                      <option value="div3">➗ Chia Hết Cho 3</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Thời gian
                    </label>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setSettings({ ...settings, timeMode: 'manual' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.timeMode === 'manual'
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tự do
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, timeMode: 'timer' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.timeMode === 'timer'
                            ? 'bg-rose-600 border-rose-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Giới hạn
                      </button>
                    </div>
                    {settings.timeMode === 'timer' && (
                      <>
                        <input
                          type="range"
                          min="30"
                          max="300"
                          step="10"
                          value={settings.timeLimit}
                          onChange={(e) =>
                            setSettings({ ...settings, timeLimit: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <p className="text-right text-xs text-rose-400">{settings.timeLimit} giây</p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={startGame}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-rose-500 to-orange-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    BẮT ĐẦU
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PLAYING --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in px-4">
          <div className="w-full max-w-3xl mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">
                Mục tiêu
              </h2>
              <p className="text-white font-bold text-lg md:text-xl flex items-center">
                <span className="w-3 h-3 rounded-full bg-emerald-500 mr-2 inline-block" />
                Start
                <span className="mx-2 text-slate-600">→</span>
                <span className="w-3 h-3 rounded-full bg-amber-500 mr-2 inline-block animate-pulse" />
                End
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-rose-400 text-sm font-bold uppercase tracking-wider mb-1">
                Luật chơi
              </h2>
              <div className="bg-rose-900/30 border border-rose-800 px-3 py-1 rounded text-rose-200 font-medium text-sm md:text-base">
                {getRuleDesc()}
              </div>
            </div>
          </div>

          <div className="overflow-auto max-w-full p-2" ref={boardRef}>
            <div
              className={`grid ${getGridCols()} gap-1 md:gap-2 bg-slate-900 p-2 md:p-4 rounded-2xl shadow-2xl border border-slate-800`}
            >
              {grid.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => handleMove(r, c)}
                    className={`w-10 h-10 md:w-16 md:h-16 ${getCellStyle(r, c)}`}
                  >
                    {val}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-8 text-slate-500 text-sm flex gap-4">
            <span className="flex items-center">
              <kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 mr-2">
                Click / Phím
              </kbd>
              Di chuyển
            </span>
            <span className="flex items-center">
              <kbd className="bg-slate-800 px-2 py-1 rounded border border-slate-700 mr-2">
                Click Lại
              </kbd>
              Quay lui
            </span>
          </div>
        </div>
      )}

      {/* --- RESULT --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
            <div className="mb-6">
              {isWin ? (
                <>
                  <div className="text-6xl mb-2">🏆</div>
                  <h2 className="text-5xl font-black text-green-400 mb-2">CHIẾN THẮNG!</h2>
                  <p className="text-slate-300">
                    {playerPath.length === solutionPath.length
                      ? `Hoàn hảo! Bạn tìm ra đường đi ngắn nhất (${playerPath.length - 1} bước).`
                      : `Hợp lệ trong ${playerPath.length - 1} bước (đường ngắn nhất là ${solutionPath.length - 1} bước).`}
                  </p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-2">🥀</div>
                  <h2 className="text-5xl font-black text-red-500 mb-2">THẤT BẠI</h2>
                  <p className="text-slate-300">
                    Bạn đã đi sai luật ở ô màu đỏ (hoặc hết thời gian).
                  </p>
                </>
              )}
            </div>

            <div className="flex justify-center mb-8">
              <div
                className={`grid ${getGridCols()} gap-1 p-2 bg-slate-950 rounded border border-slate-800 pointer-events-none opacity-95 scale-75 md:scale-100`}
              >
                {grid.map((row, r) =>
                  row.map((val, c) => (
                    <div
                      key={`res-${r}-${c}`}
                      className={`w-8 h-8 md:w-10 md:h-10 text-sm ${getCellStyle(r, c)}`}
                    >
                      {val}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setPhase('SETUP')}
                className="px-6 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Menu
              </button>
              <button
                onClick={() => setShowSolution(!showSolution)}
                className={`px-6 py-3 rounded-xl font-bold text-white transition-colors ${
                  showSolution ? 'bg-yellow-600' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                {showSolution ? 'Ẩn Đáp Án' : 'Xem Đường Ngắn Nhất'}
              </button>
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg transition-colors"
              >
                Chơi Lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
