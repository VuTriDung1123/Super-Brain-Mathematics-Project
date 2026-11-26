'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { playClick } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type BoardSize = 3 | 4 | 5;

function createSolvedBoard(size: number): number[] {
  const arr = Array.from({ length: size * size }, (_, i) => (i + 1) % (size * size));
  return arr;
}

/** Guaranteed solvable shuffle via valid legal random moves from solved state */
function createShuffledBoard(size: number): number[] {
  const board = createSolvedBoard(size);
  let emptyIdx = board.length - 1;
  let lastIdx = -1;
  const steps = size * size * 14;

  for (let i = 0; i < steps; i++) {
    const r = Math.floor(emptyIdx / size);
    const c = emptyIdx % size;
    const neighbors: number[] = [];
    if (r > 0) neighbors.push((r - 1) * size + c);
    if (r < size - 1) neighbors.push((r + 1) * size + c);
    if (c > 0) neighbors.push(r * size + (c - 1));
    if (c < size - 1) neighbors.push(r * size + (c + 1));

    const filtered = neighbors.filter((n) => n !== lastIdx);
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    board[emptyIdx] = board[pick];
    board[pick] = 0;
    lastIdx = emptyIdx;
    emptyIdx = pick;
  }

  // Ensure it didn't randomly land back on solved
  if (isBoardSolved(board)) {
    const swapIdx = board.length - 2;
    const empty = board.indexOf(0);
    if (empty !== swapIdx) {
      const tmp = board[empty];
      board[empty] = board[swapIdx];
      board[swapIdx] = tmp;
    }
  }
  return board;
}

function isBoardSolved(board: number[]): boolean {
  for (let i = 0; i < board.length - 1; i++) {
    if (board[i] !== i + 1) return false;
  }
  return board[board.length - 1] === 0;
}

export default function SlidingPuzzleGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [size, setSize] = useState<BoardSize>(4);
  const [board, setBoard] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = (chosenSize = size) => {
    setSize(chosenSize);
    setBoard(createShuffledBoard(chosenSize));
    setMoves(0);
    setElapsedMs(0);
    startRef.current = Date.now();
    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    startRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - startRef.current);
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleTileClick = useCallback(
    (idx: number) => {
      if (phase !== 'PLAYING') return;
      const emptyIdx = board.indexOf(0);
      if (idx === emptyIdx) return;

      const r = Math.floor(idx / size);
      const c = idx % size;
      const er = Math.floor(emptyIdx / size);
      const ec = emptyIdx % size;

      // Supports sliding a whole line of tiles in the same row or column!
      if (r !== er && c !== ec) return;

      const next = [...board];
      let shifted = 0;
      if (r === er) {
        const step = c < ec ? -1 : 1;
        for (let col = ec; col !== c; col += step) {
          next[r * size + col] = next[r * size + col + step];
          shifted++;
        }
        next[idx] = 0;
      } else {
        const step = r < er ? -1 : 1;
        for (let row = er; row !== r; row += step) {
          next[row * size + c] = next[(row + step) * size + c];
          shifted++;
        }
        next[idx] = 0;
      }

      playClick();
      setBoard(next);
      setMoves((m) => m + shifted);

      if (isBoardSolved(next)) {
        if (timerRef.current) clearInterval(timerRef.current);
        setElapsedMs(Date.now() - startRef.current);
        setPhase('RESULT');
      }
    },
    [phase, board, size]
  );

  // Keyboard sliding (arrows move a tile INTO the blank space)
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const emptyIdx = board.indexOf(0);
      const er = Math.floor(emptyIdx / size);
      const ec = emptyIdx % size;
      let targetIdx = -1;

      if (e.key === 'ArrowUp' && er < size - 1) targetIdx = (er + 1) * size + ec;
      else if (e.key === 'ArrowDown' && er > 0) targetIdx = (er - 1) * size + ec;
      else if (e.key === 'ArrowLeft' && ec < size - 1) targetIdx = er * size + (ec + 1);
      else if (e.key === 'ArrowRight' && ec > 0) targetIdx = er * size + (ec - 1);
      else return;

      e.preventDefault();
      handleTileClick(targetIdx);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, board, size, handleTileClick]);

  const formatMs = (ms: number) => (ms / 1000).toFixed(2);

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'sliding-puzzle',
    won: true,
    accuracy: 100,
    scoreLabel: `${size}×${size} • ${formatMs(elapsedMs)}s (${moves} bước)`,
    durationSec: Math.max(1, Math.round(elapsedMs / 1000)),
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-blue-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-blue-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex gap-3 font-mono text-sm">
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-blue-500/40 text-blue-400 font-bold">
              ⏱ {formatMs(elapsedMs)}s
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              Bước: {moves}
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">
              HOA DUNG ĐẠO SỐ
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Digital Huarong Dao / 15-Puzzle • Tốc độ &amp; Thuật toán trượt khối
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-bold text-blue-400">Huyền thoại Siêu Trí Tuệ</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                <strong>Hoa Dung Đạo Số (4×4)</strong> từng làm bùng nổ chương trình <em>Siêu Trí Tuệ Trung Quốc</em> khi Hà Du Quân hoàn thành trong 21 giây. Nhiệm vụ của bạn là sắp xếp lại toàn bộ các con số theo thứ tự tăng dần từ trái sang phải, trên xuống dưới, với ô trống ở góc dưới cùng bên phải.
              </p>
              <p className="text-xs text-slate-400">
                💡 Mẹo: Giải dứt điểm từng hàng trên cùng và cột trái cùng trước, thu nhỏ dần bàn cờ về cỡ 3×3 rồi 2×2. Bạn có thể click trượt nhiều ô cùng lúc trên cùng hàng/cột hoặc dùng phím Mũi tên!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Chọn Cỡ Bảng
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {([3, 4, 5] as BoardSize[]).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSize(sz)}
                    className={`py-3 rounded-xl font-bold text-sm border cursor-pointer ${
                      size === sz
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {sz}×{sz}
                  </button>
                ))}
              </div>
              <button
                onClick={() => startGame(size)}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                BẮT ĐẦU BẤM GIỜ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div
            className="grid gap-2 bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-2xl w-full max-w-md aspect-square select-none"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {board.map((val, idx) => {
              const isCorrectSpot = val !== 0 && val === idx + 1;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTileClick(idx)}
                  disabled={val === 0}
                  className={`rounded-2xl font-mono font-black transition-all flex items-center justify-center ${
                    size === 5 ? 'text-2xl' : size === 4 ? 'text-3xl' : 'text-4xl'
                  } ${
                    val === 0
                      ? 'bg-slate-950/70 border border-dashed border-slate-800 cursor-default'
                      : isCorrectSpot
                        ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-b-4 border-emerald-900 shadow-lg cursor-pointer active:scale-95'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-b-4 border-indigo-950 shadow-lg hover:brightness-110 cursor-pointer active:scale-95'
                  }`}
                >
                  {val !== 0 ? val : ''}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => startGame(size)}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-sm text-slate-300"
            >
              Xáo Trộn Lại
            </button>
            <button
              onClick={() => setPhase('SETUP')}
              className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:bg-slate-800 font-bold text-sm text-slate-400"
            >
              Đổi Cỡ Bảng
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-blue-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="text-4xl font-black text-blue-400 mb-2">PHÁ ĐẢO HOA DUNG ĐẠO!</h2>
          <p className="text-slate-300 mb-8">
            Bàn cờ <strong className="text-white">{size}×{size}</strong> hoàn tất trong{' '}
            <strong className="text-cyan-400 font-mono text-2xl">{formatMs(elapsedMs)}s</strong>{' '}
            với <strong className="text-white font-mono">{moves}</strong> bước trượt.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Cỡ Bảng
            </button>
            <button
              onClick={() => startGame(size)}
              className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl font-bold text-white"
            >
              Phá Kỷ Lục Lần Nữa
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
