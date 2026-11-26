'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { playClick } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type SquareSize = 3 | 4 | 5;
type Difficulty = 'easy' | 'medium' | 'hard';

function generateSolvedMagicSquare(n: SquareSize): number[][] {
  let grid: number[][];

  if (n === 3 || n === 5) {
    // Siamese method for odd magic squares
    grid = Array.from({ length: n }, () => Array(n).fill(0));
    let r = 0;
    let c = Math.floor(n / 2);
    for (let num = 1; num <= n * n; num++) {
      grid[r][c] = num;
      const nr = (r - 1 + n) % n;
      const nc = (c + 1) % n;
      if (grid[nr][nc] !== 0) {
        r = (r + 1) % n;
      } else {
        r = nr;
        c = nc;
      }
    }
  } else {
    // Doubly-even 4x4 magic square (diagonal complement)
    grid = Array.from({ length: 4 }, (_, r) =>
      Array.from({ length: 4 }, (_, c) => {
        const val = r * 4 + c + 1;
        const onDiag = r === c || r + c === 3;
        return onDiag ? 17 - val : val;
      })
    );
  }

  // Apply random dihedral symmetry (0..3 rotations + optional flip)
  const rots = Math.floor(Math.random() * 4);
  for (let k = 0; k < rots; k++) {
    grid = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => grid[n - 1 - c][r])
    );
  }
  if (Math.random() < 0.5) {
    grid = grid.map((row) => [...row].reverse());
  }
  return grid;
}

function isValidMagicSquare(
  board: number[][],
  initial: number[][],
  magicSum: number
): boolean {
  const n = board.length;
  const seen = new Set<number>();

  for (let r = 0; r < n; r++) {
    let rowSum = 0;
    for (let c = 0; c < n; c++) {
      const val = board[r][c];
      if (!Number.isInteger(val) || val < 1 || val > n * n) return false;
      if (initial[r][c] !== 0 && val !== initial[r][c]) return false;
      if (seen.has(val)) return false;
      seen.add(val);
      rowSum += val;
    }
    if (rowSum !== magicSum) return false;
  }

  for (let c = 0; c < n; c++) {
    let colSum = 0;
    for (let r = 0; r < n; r++) colSum += board[r][c];
    if (colSum !== magicSum) return false;
  }

  let d1 = 0;
  let d2 = 0;
  for (let i = 0; i < n; i++) {
    d1 += board[i][i];
    d2 += board[i][n - 1 - i];
  }
  return d1 === magicSum && d2 === magicSum;
}

export default function MagicSquareGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [size, setSize] = useState<SquareSize>(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [board, setBoard] = useState<number[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const magicSum = (size * (size * size + 1)) / 2;

  const startGame = () => {
    const sol = generateSolvedMagicSquare(size);
    const total = size * size;
    const keepRatio = difficulty === 'easy' ? 0.55 : difficulty === 'medium' ? 0.4 : 0.28;
    const keepCount = Math.max(size === 3 ? 2 : 4, Math.floor(total * keepRatio));

    const positions = Array.from({ length: total }, (_, idx) => ({
      r: Math.floor(idx / size),
      c: idx % size,
    })).sort(() => Math.random() - 0.5);

    const puzzle = Array.from({ length: size }, () => Array(size).fill(0));
    positions.slice(0, keepCount).forEach(({ r, c }) => {
      puzzle[r][c] = sol[r][c];
    });

    setSolution(sol);
    setInitialBoard(puzzle.map((r) => [...r]));
    setBoard(puzzle.map((r) => [...r]));
    setElapsedSec(0);
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

  const handleCellChange = (r: number, c: number, raw: string) => {
    if (initialBoard[r]?.[c] !== 0) return;
    const cleaned = raw.replace(/\D/g, '');
    const val = cleaned === '' ? 0 : parseInt(cleaned, 10);
    if (val > size * size) return;

    const next = board.map((row) => [...row]);
    next[r][c] = val;
    setBoard(next);
    playClick();

    if (isValidMagicSquare(next, initialBoard, magicSum)) {
      setPhase('RESULT');
    }
  };

  const handleRevealOne = () => {
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== solution[r][c]) {
          const next = board.map((row) => [...row]);
          next[r][c] = solution[r][c];
          setBoard(next);
          playClick();
          if (isValidMagicSquare(next, initialBoard, magicSum)) {
            setPhase('RESULT');
          }
          return;
        }
      }
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'magic-square',
    won: true,
    accuracy: 100,
    scoreLabel: `Ma phương ${size}×${size} (M=${magicSum})`,
    durationSec: Math.max(1, elapsedSec),
  });

  const rowSums = board.map((row) => row.reduce((a, b) => a + b, 0));
  const colSums =
    board.length > 0
      ? Array.from({ length: size }, (_, c) => board.reduce((sum, row) => sum + row[c], 0))
      : [];
  const diag1Sum = board.reduce((sum, row, i) => sum + (row[i] ?? 0), 0);
  const diag2Sum = board.reduce((sum, row, i) => sum + (row[size - 1 - i] ?? 0), 0);

  const usedNumbers = new Set(board.flat().filter((v) => v > 0));

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-green-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-green-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex gap-3 font-mono text-sm">
            <span className="px-4 py-1.5 rounded-full bg-green-950/60 border border-green-500 text-green-300 font-bold">
              Tổng mục tiêu M = {magicSum}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              ⏱ {formatTime(elapsedSec)}
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
              MA PHƯƠNG (MAGIC SQUARE)
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Cổ điển Toán học Tổ hợp • Cân bằng mọi hàng, cột &amp; đường chéo
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-green-400">Hằng số Ma Phương</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Điền đầy đủ các số nguyên phân biệt từ <strong className="text-white">1 đến N²</strong> vào bảng vuông N×N sao cho tổng của mọi hàng ngang, mọi cột dọc và cả 2 đường chéo chính đều bằng đúng hằng số ma phương:
              </p>
              <div className="grid grid-cols-3 gap-3 pt-2 font-mono text-center text-xs">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-slate-500">Ma phương 3×3</div>
                  <div className="text-xl font-black text-green-400">M = 15</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-slate-500">Ma phương 4×4</div>
                  <div className="text-xl font-black text-green-400">M = 34</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-slate-500">Ma phương 5×5</div>
                  <div className="text-xl font-black text-green-400">M = 65</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Thiết Lập Ma Phương
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Bậc Ma Phương
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([3, 4, 5] as SquareSize[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSize(sz)}
                      className={`py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                        size === sz
                          ? 'bg-green-600 border-green-400 text-white'
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
                  Độ khó (Số ô cho sẵn)
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
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        difficulty === k
                          ? 'bg-green-600 border-green-400 text-white'
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
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                TẠO MA PHƯƠNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl">
            {/* Diagonal indicators */}
            <div className="flex justify-between text-xs font-mono mb-3 px-1">
              <span className={diag1Sum === magicSum ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                ↘ Chéo chính: {diag1Sum}/{magicSum}
              </span>
              <span className={diag2Sum === magicSum ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                ↙ Chéo phụ: {diag2Sum}/{magicSum}
              </span>
            </div>

            <div className="space-y-2">
              {board.map((row, r) => (
                <div key={r} className="flex items-center gap-2">
                  {row.map((val, c) => {
                    const isFixed = initialBoard[r]?.[c] !== 0;
                    return (
                      <input
                        key={`${r}-${c}`}
                        type="text"
                        inputMode="numeric"
                        disabled={isFixed}
                        value={val === 0 ? '' : val}
                        onChange={(e) => handleCellChange(r, c, e.target.value)}
                        className={`w-13 h-13 sm:w-16 sm:h-16 rounded-xl text-center font-mono font-black text-xl sm:text-2xl border-2 outline-none transition-colors ${
                          isFixed
                            ? 'bg-slate-800 border-slate-700 text-green-400 cursor-not-allowed'
                            : 'bg-slate-950 border-slate-700 focus:border-green-400 text-white'
                        }`}
                      />
                    );
                  })}
                  <div
                    className={`w-11 text-center font-mono text-sm font-black ${
                      rowSums[r] === magicSum
                        ? 'text-emerald-400'
                        : rowSums[r] > magicSum
                          ? 'text-red-400'
                          : 'text-slate-500'
                    }`}
                  >
                    ={rowSums[r]}
                  </div>
                </div>
              ))}

              {/* Column sums */}
              <div className="flex items-center gap-2 pt-1">
                {colSums.map((sum, c) => (
                  <div
                    key={c}
                    className={`w-13 sm:w-16 text-center font-mono text-sm font-black ${
                      sum === magicSum
                        ? 'text-emerald-400'
                        : sum > magicSum
                          ? 'text-red-400'
                          : 'text-slate-500'
                    }`}
                  >
                    ={sum}
                  </div>
                ))}
                <div className="w-11" />
              </div>
            </div>
          </div>

          {/* Remaining numbers helper strip */}
          <div className="max-w-lg text-center">
            <div className="text-[11px] uppercase font-bold text-slate-500 mb-2">
              Các số chưa sử dụng (1 → {size * size}):
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {Array.from({ length: size * size }, (_, i) => i + 1).map((n) => (
                <span
                  key={n}
                  className={`w-7 h-7 rounded-md font-mono text-xs font-bold flex items-center justify-center border ${
                    usedNumbers.has(n)
                      ? 'bg-slate-950 border-slate-900 text-slate-700 line-through'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  {n}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleRevealOne}
              className="px-5 py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-800 border border-amber-600/60 text-amber-200 font-bold text-sm"
            >
              💡 Gợi Ý 1 Ô
            </button>
            <button
              onClick={() => setBoard(initialBoard.map((r) => [...r]))}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
            >
              Đặt Lại
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-green-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="text-4xl font-black text-emerald-400 mb-2">MA PHƯƠNG CÂN BẰNG!</h2>
          <p className="text-slate-300 mb-8">
            Mọi hàng, cột và đường chéo đều đạt chuẩn <strong className="text-green-400 font-mono">M = {magicSum}</strong> trong{' '}
            <strong className="text-white font-mono">{formatTime(elapsedSec)}</strong>.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Cấp Độ
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-white"
            >
              Ma Phương Mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
