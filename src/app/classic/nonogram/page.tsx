'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { playClick } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type BoardSize = 5 | 7 | 10;
type CellState = 0 | 1 | 2; // 0 = empty, 1 = filled, 2 = marked X

function getLineClues(line: number[]): number[] {
  const clues: number[] = [];
  let run = 0;
  for (const val of line) {
    if (val === 1) {
      run++;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length > 0 ? clues : [0];
}

function generateNonogramSolution(size: number): number[][] {
  const grid = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => (Math.random() < 0.56 ? 1 : 0))
  );
  // Guarantee every row & col has at least one filled cell
  for (let r = 0; r < size; r++) {
    if (grid[r].every((v) => v === 0)) {
      grid[r][Math.floor(Math.random() * size)] = 1;
    }
  }
  for (let c = 0; c < size; c++) {
    if (grid.every((row) => row[c] === 0)) {
      grid[Math.floor(Math.random() * size)][c] = 1;
    }
  }
  return grid;
}

const arraysEqual = (a: number[], b: number[]) =>
  a.length === b.length && a.every((val, i) => val === b[i]);

export default function NonogramGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [size, setSize] = useState<BoardSize>(5);
  const [solution, setSolution] = useState<number[][]>([]);
  const [board, setBoard] = useState<CellState[][]>([]);
  const [tool, setTool] = useState<'fill' | 'mark'>('fill');
  const [elapsedSec, setElapsedSec] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const rowClues = useMemo(() => solution.map((row) => getLineClues(row)), [solution]);
  const colClues = useMemo(() => {
    if (solution.length === 0) return [];
    return Array.from({ length: solution.length }, (_, c) =>
      getLineClues(solution.map((row) => row[c]))
    );
  }, [solution]);

  const rowMatched = useMemo(
    () =>
      board.map((row, r) =>
        arraysEqual(
          getLineClues(row.map((v) => (v === 1 ? 1 : 0))),
          rowClues[r] ?? [0]
        )
      ),
    [board, rowClues]
  );

  const colMatched = useMemo(() => {
    if (board.length === 0) return [];
    return Array.from({ length: board.length }, (_, c) =>
      arraysEqual(
        getLineClues(board.map((row) => (row[c] === 1 ? 1 : 0))),
        colClues[c] ?? [0]
      )
    );
  }, [board, colClues]);

  const startGame = (chosenSize = size) => {
    const sol = generateNonogramSolution(chosenSize);
    setSize(chosenSize);
    setSolution(sol);
    setBoard(Array.from({ length: chosenSize }, () => Array<CellState>(chosenSize).fill(0)));
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

  const applyCellAction = (r: number, c: number, mode: 'fill' | 'mark') => {
    if (phase !== 'PLAYING') return;
    playClick();
    const next = board.map((row) => [...row]);
    if (mode === 'fill') {
      next[r][c] = next[r][c] === 1 ? 0 : 1;
    } else {
      next[r][c] = next[r][c] === 2 ? 0 : 2;
    }
    setBoard(next);

    // Check if ALL row & column clues are satisfied (accepts any valid solution!)
    const allRowsOk = next.every((row, ri) =>
      arraysEqual(
        getLineClues(row.map((v) => (v === 1 ? 1 : 0))),
        rowClues[ri]
      )
    );
    const allColsOk = Array.from({ length: next.length }, (_, ci) =>
      arraysEqual(
        getLineClues(next.map((row) => (row[ci] === 1 ? 1 : 0))),
        colClues[ci]
      )
    ).every(Boolean);

    if (allRowsOk && allColsOk) {
      setPhase('RESULT');
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'nonogram',
    won: true,
    accuracy: 100,
    scoreLabel: `Nonogram ${size}×${size} (${formatTime(elapsedSec)})`,
    durationSec: Math.max(1, elapsedSec),
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-purple-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-purple-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-purple-500/40 text-purple-300 font-bold">
            ⏱ {formatTime(elapsedSec)}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-2">
              GIẢI MÃ ẢNH ẨN (NONOGRAM)
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Nonogram Picross • Suy luận logic ma trận pixel
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-purple-400">Cách đọc manh mối Nonogram</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Các con số ở đầu mỗi hàng và đỉnh mỗi cột cho biết <strong className="text-white">độ dài các cụm ô tô liên tiếp</strong> trên hàng/cột đó (ngăn cách bởi ít nhất 1 ô trống). Ví dụ <code className="text-purple-300">2 1</code> nghĩa là có cụm 2 ô tô liền nhau, cách ít nhất 1 ô trống, rồi tới 1 ô tô.
              </p>
              <p className="text-xs text-slate-400">
                🖱️ Click trái để tô ô, Click phải (hoặc chuyển sang chế độ <strong>×</strong>) để đánh dấu ô chắc chắn trống. Khi hàng/cột khớp manh mối, số gợi ý tự động chuyển sang màu xanh lá!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Kích Thước Lưới
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {([5, 7, 10] as BoardSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSize(sz)}
                    className={`py-3 rounded-xl font-bold text-sm border cursor-pointer ${
                      size === sz
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {sz}×{sz}
                  </button>
                ))}
              </div>
              <button
                onClick={() => startGame(size)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                TẠO BỨC TRANH ẨN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="flex gap-3">
            <button
              onClick={() => setTool('fill')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                tool === 'fill'
                  ? 'bg-purple-600 border-purple-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              ⬛ Tô Ô (Click Trái)
            </button>
            <button
              onClick={() => setTool('mark')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                tool === 'mark'
                  ? 'bg-pink-600 border-pink-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              ✖ Đánh Dấu Trống (Click Phải)
            </button>
          </div>

          <div className="overflow-x-auto max-w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl">
            <table className="border-collapse select-none mx-auto">
              <thead>
                <tr>
                  <th />
                  {colClues.map((clues, c) => (
                    <th key={c} className="align-bottom pb-2 px-1">
                      <div
                        className={`flex flex-col items-center font-mono text-xs font-bold leading-tight ${
                          colMatched[c] ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {clues.map((n, i) => (
                          <span key={i}>{n}</span>
                        ))}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {board.map((row, r) => (
                  <tr key={r}>
                    <td className="pr-3 text-right whitespace-nowrap">
                      <span
                        className={`font-mono text-xs font-bold tracking-widest ${
                          rowMatched[r] ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        {rowClues[r]?.join(' ')}
                      </span>
                    </td>
                    {row.map((cell, c) => {
                      const cellDim =
                        size === 10
                          ? 'w-7 h-7 sm:w-9 sm:h-9'
                          : size === 7
                            ? 'w-9 h-9 sm:w-11 sm:h-11'
                            : 'w-11 h-11 sm:w-14 sm:h-14';
                      const thickRight =
                        size === 10 && c === 4 ? 'border-r-2 border-r-purple-400' : '';
                      const thickBot =
                        size === 10 && r === 4 ? 'border-b-2 border-b-purple-400' : '';

                      return (
                        <td
                          key={c}
                          onClick={() => applyCellAction(r, c, tool)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            applyCellAction(r, c, 'mark');
                          }}
                          className={`${cellDim} border border-slate-700 ${thickRight} ${thickBot} text-center cursor-pointer transition-colors ${
                            cell === 1
                              ? 'bg-purple-500 hover:bg-purple-400'
                              : 'bg-slate-950 hover:bg-slate-800'
                          }`}
                        >
                          {cell === 2 && (
                            <span className="text-rose-400 font-bold text-sm">×</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() =>
              setBoard(Array.from({ length: size }, () => Array<CellState>(size).fill(0)))
            }
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
          >
            Xóa Bảng
          </button>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-purple-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🎨</div>
          <h2 className="text-4xl font-black text-emerald-400 mb-2">HOÀN THÀNH NONOGRAM!</h2>
          <p className="text-slate-300 mb-6">
            Bạn đã giải mã toàn bộ bức tranh <strong className="text-white">{size}×{size}</strong>{' '}
            trong <strong className="text-purple-400 font-mono">{formatTime(elapsedSec)}</strong>.
          </p>

          <div
            className="grid gap-1 bg-slate-950 p-3 rounded-xl border border-slate-800 w-fit mx-auto mb-8"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {board.map((row, r) =>
              row.map((val, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`w-5 h-5 rounded-sm ${val === 1 ? 'bg-purple-500' : 'bg-slate-900'}`}
                />
              ))
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Cỡ Bảng
            </button>
            <button
              onClick={() => startGame(size)}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white"
            >
              Chơi Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
