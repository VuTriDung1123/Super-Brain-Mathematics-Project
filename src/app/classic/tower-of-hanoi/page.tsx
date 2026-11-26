'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';

const DISK_COLORS = [
  'from-red-500 to-rose-600',
  'from-orange-500 to-amber-500',
  'from-yellow-400 to-amber-500',
  'from-emerald-500 to-green-600',
  'from-cyan-500 to-sky-600',
  'from-blue-500 to-indigo-600',
  'from-purple-500 to-fuchsia-600',
];

function computeOptimalHanoiMoves(n: number, from: number, to: number, aux: number): [number, number][] {
  if (n === 0) return [];
  return [
    ...computeOptimalHanoiMoves(n - 1, from, aux, to),
    [from, to],
    ...computeOptimalHanoiMoves(n - 1, aux, to, from),
  ];
}

export default function TowerOfHanoiGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [diskCount, setDiskCount] = useState(4);

  // Each peg is a stack from bottom (index 0) to top (last index); disk values 1 (smallest) .. diskCount (largest)
  const [pegs, setPegs] = useState<number[][]>([[], [], []]);
  const [selectedPeg, setSelectedPeg] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState<number[][][]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isAutoSolving, setIsAutoSolving] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const optimalMoves = Math.pow(2, diskCount) - 1;

  const startGame = (count = diskCount) => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    setDiskCount(count);
    const initialStack = Array.from({ length: count }, (_, i) => count - i);
    setPegs([initialStack, [], []]);
    setSelectedPeg(null);
    setMoves(0);
    setHistory([]);
    setElapsedSec(0);
    setIsAutoSolving(false);
    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING' || isAutoSolving) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, isAutoSolving]);

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  const handlePegClick = useCallback(
    (pegIdx: number) => {
      if (phase !== 'PLAYING' || isAutoSolving) return;

      if (selectedPeg === null) {
        if (pegs[pegIdx].length === 0) return;
        setSelectedPeg(pegIdx);
        playClick();
        return;
      }

      if (selectedPeg === pegIdx) {
        setSelectedPeg(null);
        return;
      }

      const sourceStack = pegs[selectedPeg];
      const destStack = pegs[pegIdx];
      const movingDisk = sourceStack[sourceStack.length - 1];
      const destTop = destStack[destStack.length - 1];

      if (destTop !== undefined && movingDisk > destTop) {
        playError();
        setSelectedPeg(null);
        return;
      }

      const nextPegs = pegs.map((p) => [...p]);
      nextPegs[selectedPeg].pop();
      nextPegs[pegIdx].push(movingDisk);

      setHistory((h) => [...h, pegs.map((p) => [...p])]);
      setPegs(nextPegs);
      setSelectedPeg(null);
      setMoves((m) => m + 1);
      playClick();

      if (nextPegs[2].length === diskCount) {
        playSuccess();
        setPhase('RESULT');
      }
    },
    [phase, isAutoSolving, selectedPeg, pegs, diskCount]
  );

  // Keyboard 1 / 2 / 3 to pick/drop pegs rapidly
  useEffect(() => {
    if (phase !== 'PLAYING' || isAutoSolving) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') handlePegClick(0);
      else if (e.key === '2') handlePegClick(1);
      else if (e.key === '3') handlePegClick(2);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, isAutoSolving, handlePegClick]);

  const handleUndo = () => {
    if (history.length === 0 || isAutoSolving) return;
    const prev = history[history.length - 1];
    setPegs(prev);
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setSelectedPeg(null);
    playClick();
  };

  const runAutoDemo = () => {
    if (isAutoSolving) return;
    const initialStack = Array.from({ length: diskCount }, (_, i) => diskCount - i);
    const workingPegs: number[][] = [initialStack, [], []];
    setPegs(workingPegs.map((p) => [...p]));
    setSelectedPeg(null);
    setMoves(0);
    setIsAutoSolving(true);

    const plan = computeOptimalHanoiMoves(diskCount, 0, 2, 1);
    let step = 0;

    const tick = () => {
      if (step >= plan.length) {
        setIsAutoSolving(false);
        return;
      }
      const [from, to] = plan[step];
      const disk = workingPegs[from].pop()!;
      workingPegs[to].push(disk);
      setPegs(workingPegs.map((p) => [...p]));
      setMoves(step + 1);
      step++;
      autoTimerRef.current = setTimeout(tick, Math.max(120, 420 - diskCount * 40));
    };
    autoTimerRef.current = setTimeout(tick, 300);
  };

  const efficiency = Math.min(100, Math.round((optimalMoves / Math.max(optimalMoves, moves)) * 100));

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'tower-of-hanoi',
    won: true,
    accuracy: efficiency,
    scoreLabel: `${diskCount} đĩa • ${moves}/${optimalMoves} bước`,
    durationSec: Math.max(1, elapsedSec),
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-red-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-red-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex gap-3 font-mono text-sm">
            <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-red-500/40 text-red-300 font-bold">
              Bước: {moves} (Tối ưu: {optimalMoves})
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
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-2">
              THÁP HÀ NỘI (TOWER OF HANOI)
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Tư duy Đệ quy Kinh điển • Tối ưu 2ⁿ − 1 bước
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-red-400">3 Nguyên tắc bất biến</h2>
              <ul className="list-disc list-inside text-sm text-slate-300 space-y-2">
                <li>Chuyển toàn bộ chồng đĩa từ <strong className="text-white">Cọc 1</strong> sang <strong className="text-emerald-400">Cọc 3 (Đích)</strong>.</li>
                <li>Mỗi lần chỉ được nhấc 1 đĩa trên cùng của một cọc.</li>
                <li><strong className="text-red-400">Tuyệt đối không đặt đĩa lớn hơn lên trên đĩa nhỏ hơn.</strong></li>
              </ul>
              <p className="text-xs text-slate-400 pt-2">
                ⌨️ Hỗ trợ thao tác siêu tốc bằng phím <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">1</kbd>,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">2</kbd>,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">3</kbd> hoặc click trực tiếp vào từng cọc.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Số Lượng Đĩa (n)
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {[3, 4, 5, 6, 7].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setDiskCount(cnt)}
                    className={`py-3 rounded-xl font-bold text-sm border cursor-pointer ${
                      diskCount === cnt
                        ? 'bg-red-600 border-red-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
              <div className="text-xs text-slate-400 text-center font-mono">
                Số bước tối ưu tối thiểu: <strong className="text-red-400">{optimalMoves} bước</strong>
              </div>
              <button
                onClick={() => startGame(diskCount)}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                BẮT ĐẦU CHUYỂN THÁP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
          <div className="grid grid-cols-3 gap-4 sm:gap-8 bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl">
            {pegs.map((stack, pegIdx) => {
              const isSelected = selectedPeg === pegIdx;
              const pegLabels = ['CỌC 1 (NGUỒN)', 'CỌC 2 (TRUNG GIAN)', 'CỌC 3 (ĐÍCH ★)'];
              return (
                <button
                  key={pegIdx}
                  type="button"
                  onClick={() => handlePegClick(pegIdx)}
                  className={`relative h-72 rounded-2xl border-2 flex flex-col justify-end items-center pb-4 pt-10 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-950/30 border-red-400 ring-2 ring-red-400/50'
                      : pegIdx === 2
                        ? 'bg-slate-950 border-emerald-500/40 hover:border-emerald-400'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                  }`}
                >
                  {/* Vertical Rod */}
                  <div className="absolute bottom-4 w-3 h-52 bg-slate-700 rounded-t-full pointer-events-none" />

                  {/* Disks (top-most rendered highest) */}
                  <div className="relative z-10 w-full px-3 flex flex-col-reverse items-center gap-1.5">
                    {stack.map((diskSize, idx) => {
                      const isTopSelected = isSelected && idx === stack.length - 1;
                      const widthPct = 28 + (diskSize / diskCount) * 68;
                      return (
                        <div
                          key={diskSize}
                          className={`h-7 rounded-lg bg-gradient-to-r ${
                            DISK_COLORS[(diskSize - 1) % DISK_COLORS.length]
                          } border border-white/25 shadow-lg flex items-center justify-center font-mono font-black text-xs text-white transition-transform ${
                            isTopSelected ? '-translate-y-6 scale-105 ring-2 ring-white' : ''
                          }`}
                          style={{ width: `${widthPct}%` }}
                        >
                          {diskSize}
                        </div>
                      );
                    })}
                  </div>

                  {/* Base platform */}
                  <div className="w-[90%] h-2.5 bg-slate-700 rounded-full mt-1" />
                  <div
                    className={`absolute top-3 text-[10px] sm:text-xs font-bold tracking-wider ${
                      pegIdx === 2 ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {pegLabels[pegIdx]}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleUndo}
              disabled={history.length === 0 || isAutoSolving}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 font-bold text-sm"
            >
              ↩ Lùi 1 Bước
            </button>
            <button
              onClick={runAutoDemo}
              disabled={isAutoSolving}
              className="px-5 py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-800 border border-amber-600/60 disabled:opacity-35 text-amber-200 font-bold text-sm"
            >
              {isAutoSolving ? '🤖 Đang Minh Họa Đệ Quy...' : '🤖 Xem Minh Họa Giải Tối Ưu'}
            </button>
            <button
              onClick={() => startGame(diskCount)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/60 font-bold text-sm text-slate-300"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-red-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🗼</div>
          <h2 className="text-4xl font-black text-emerald-400 mb-2">CHINH PHỤC THÁP HÀ NỘI!</h2>
          <p className="text-slate-300 mb-8">
            Chuyển thành công <strong className="text-white">{diskCount} đĩa</strong> trong{' '}
            <strong className="text-amber-400 font-mono text-2xl">{moves}</strong> bước (tối ưu toán học:{' '}
            <strong className="text-emerald-400 font-mono">{optimalMoves}</strong> bước — hiệu suất{' '}
            <strong className="text-white">{efficiency}%</strong>).
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Số Đĩa
            </button>
            <button
              onClick={() => startGame(diskCount)}
              className="flex-1 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-white"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
