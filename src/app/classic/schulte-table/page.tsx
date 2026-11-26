'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type GridSize = 5 | 6 | 7;
type OrderMode = 'asc' | 'desc';

function createShuffledNumbers(size: number): number[] {
  const arr = Array.from({ length: size * size }, (_, i) => i + 1);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function SchulteTableGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [size, setSize] = useState<GridSize>(5);
  const [orderMode, setOrderMode] = useState<OrderMode>('asc');
  const [hideHighlight, setHideHighlight] = useState(false);

  const [cells, setCells] = useState<number[]>([]);
  const [expected, setExpected] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [wrongNum, setWrongNum] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const startRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const total = size * size;

  const startGame = () => {
    setCells(createShuffledNumbers(size));
    setExpected(orderMode === 'asc' ? 1 : size * size);
    setMistakes(0);
    setWrongNum(null);
    setElapsedMs(0);
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

  const handleCellClick = (num: number) => {
    if (phase !== 'PLAYING') return;
    if (num === expected) {
      playClick();
      setWrongNum(null);
      const isLast =
        (orderMode === 'asc' && expected === total) ||
        (orderMode === 'desc' && expected === 1);
      if (isLast) {
        if (timerRef.current) clearInterval(timerRef.current);
        playSuccess();
        setPhase('RESULT');
      } else {
        setExpected((e) => (orderMode === 'asc' ? e + 1 : e - 1));
      }
    } else {
      playError();
      setMistakes((m) => m + 1);
      setWrongNum(num);
    }
  };

  const accuracy = Math.max(0, Math.round((total / Math.max(total, total + mistakes)) * 100));
  const secStr = (elapsedMs / 1000).toFixed(2);

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'schulte-table',
    won: true,
    accuracy,
    scoreLabel: `${size}×${size} • ${secStr}s (${mistakes} lỗi)`,
    durationSec: Math.max(1, Math.round(elapsedMs / 1000)),
  });

  const isCellDone = (num: number) =>
    orderMode === 'asc' ? num < expected : num > expected;

  const rankLabel = (() => {
    const sec = elapsedMs / 1000;
    const par = size === 5 ? 16 : size === 6 ? 28 : 45;
    if (sec <= par) return '⚡ Cấp độ Siêu Trí Tuệ';
    if (sec <= par * 1.45) return '🔥 Tốc độ Cao Thủ';
    return '👁️ Ổn định — tiếp tục tăng tốc!';
  })();

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-emerald-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-emerald-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex gap-3 font-mono text-sm">
            <span className="px-4 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500 text-emerald-300 font-black">
              Tìm số: {expected}
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-white font-bold">
              ⏱ {secStr}s
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">
              BẢNG SCHULTE
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Schulte Table • Luyện tầm nhìn ngoại vi &amp; tốc độ quét mắt
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-emerald-400">Phương pháp tập trung điểm tâm</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Được phát minh bởi bác sĩ tâm thần người Đức Walter Schulte để huấn luyện phi công và đọc nhanh. Hãy giữ ánh mắt tập trung vào <strong className="text-white">vùng trung tâm bảng</strong>, dùng tầm nhìn ngoại vi để quét và bấm liên tiếp các con số theo đúng thứ tự nhanh nhất có thể!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Bảng Schulte
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Kích thước bảng
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([5, 6, 7] as GridSize[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSize(sz)}
                      className={`py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                        size === sz
                          ? 'bg-emerald-600 border-emerald-400 text-white'
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
                  Thứ tự quét
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setOrderMode('asc')}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      orderMode === 'asc'
                        ? 'bg-emerald-600 border-emerald-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⬆ 1 → {size * size}
                  </button>
                  <button
                    onClick={() => setOrderMode('desc')}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      orderMode === 'desc'
                        ? 'bg-teal-600 border-teal-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⬇ {size * size} → 1
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-3 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideHighlight}
                  onChange={(e) => setHideHighlight(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4"
                />
                <span>Chế độ Chuẩn (không làm mờ số đã bấm)</span>
              </label>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                👁️ BẮT ĐẦU QUÉT MẮT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-xl mx-auto flex flex-col items-center gap-5 animate-fade-in">
          <div
            className="grid gap-1.5 sm:gap-2 bg-slate-900 p-3 sm:p-4 rounded-3xl border-2 border-slate-800 shadow-2xl w-full max-w-lg aspect-square select-none"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {cells.map((num, idx) => {
              const done = !hideHighlight && isCellDone(num);
              const isCenter = idx === Math.floor(cells.length / 2);
              const isWrong = wrongNum === num;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleCellClick(num)}
                  className={`rounded-xl font-mono font-black transition-all flex items-center justify-center border-2 cursor-pointer active:scale-95 ${
                    size === 7
                      ? 'text-lg sm:text-xl'
                      : size === 6
                        ? 'text-xl sm:text-2xl'
                        : 'text-2xl sm:text-3xl'
                  } ${
                    isWrong
                      ? 'bg-red-600 border-red-300 text-white animate-shake'
                      : done
                        ? 'bg-slate-950 border-slate-800/60 text-slate-700'
                        : isCenter
                          ? 'bg-slate-800 border-emerald-500/60 text-white hover:bg-emerald-600'
                          : 'bg-slate-800 border-slate-700 text-white hover:bg-emerald-600 hover:border-emerald-400'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
          <div className="text-xs text-slate-500">
            Bấm nhầm: <strong className="text-red-400 font-mono">{mistakes}</strong> • Giữ mắt nhìn tâm ô viền xanh ở giữa!
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-emerald-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">👁️</div>
          <h2 className="text-4xl font-black text-emerald-400 mb-1">{secStr} GIÂY!</h2>
          <p className="text-amber-300 font-bold mb-6">{rankLabel}</p>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="text-xs uppercase text-slate-500 font-bold">Chính xác</div>
              <div className="text-3xl font-mono font-black text-emerald-400">{accuracy}%</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="text-xs uppercase text-slate-500 font-bold">Số lỗi bấm</div>
              <div className="text-3xl font-mono font-black text-white">{mistakes}</div>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Cấu Hình
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl font-bold text-white"
            >
              Chạy Lại Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
