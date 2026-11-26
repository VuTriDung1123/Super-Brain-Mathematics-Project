'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'MEMORIZE' | 'BLINK' | 'PLAYING' | 'RESULT';
type WallSize = 5 | 8 | 10 | 12;
type DisplayStyle = 'pixel' | 'binary';

function generateWall(size: number): number[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => (Math.random() < 0.5 ? 1 : 0))
  );
}

export default function PixelWallGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [size, setSize] = useState<WallSize>(8);
  const [displayStyle, setDisplayStyle] = useState<DisplayStyle>('pixel');
  const [memoSeconds, setMemoSeconds] = useState(12);

  const [originalWall, setOriginalWall] = useState<number[][]>([]);
  const [mutatedWall, setMutatedWall] = useState<number[][]>([]);
  const [changedCell, setChangedCell] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [pickedCell, setPickedCell] = useState<{ r: number; c: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState(12);
  const [findTimeSec, setFindTimeSec] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countRef = useRef(0);

  const startGame = () => {
    const wall = generateWall(size);
    const cr = Math.floor(Math.random() * size);
    const cc = Math.floor(Math.random() * size);
    const mutated = wall.map((row) => [...row]);
    mutated[cr][cc] = mutated[cr][cc] === 1 ? 0 : 1;

    setOriginalWall(wall);
    setMutatedWall(mutated);
    setChangedCell({ r: cr, c: cc });
    setPickedCell(null);
    setFindTimeSec(0);

    countRef.current = memoSeconds;
    setTimeLeft(memoSeconds);
    setPhase('MEMORIZE');
  };

  const triggerBlinkThenPlay = () => {
    setPhase('BLINK');
  };

  useEffect(() => {
    if (phase === 'BLINK') {
      const t = setTimeout(() => {
        setFindTimeSec(0);
        setPhase('PLAYING');
      }, 900);
      return () => clearTimeout(t);
    }

    if (phase === 'MEMORIZE') {
      timerRef.current = setInterval(() => {
        countRef.current -= 1;
        if (countRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeLeft(0);
          setPhase('BLINK');
          return;
        }
        setTimeLeft(countRef.current);
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }

    if (phase === 'PLAYING') {
      timerRef.current = setInterval(() => setFindTimeSec((s) => s + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase]);

  const handleCellPick = (r: number, c: number) => {
    if (phase !== 'PLAYING') return;
    setPickedCell({ r, c });
    const ok = r === changedCell.r && c === changedCell.c;
    if (ok) playSuccess();
    else playError();
    setPhase('RESULT');
  };

  const isWin =
    pickedCell !== null &&
    pickedCell.r === changedCell.r &&
    pickedCell.c === changedCell.c;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'pixel-wall',
    won: isWin,
    accuracy: isWin ? 100 : 0,
    scoreLabel: `Tường ${size}×${size} (${size * size} điểm ảnh)`,
    durationSec: Math.max(1, findTimeSec),
  });

  const activeGrid = phase === 'MEMORIZE' ? originalWall : mutatedWall;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-pink-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-pink-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'MEMORIZE' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-pink-950/50 border border-pink-500 text-pink-300 font-bold animate-pulse">
            Ghi nhớ: {timeLeft}s
          </span>
        )}
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-pink-500/40 text-pink-400 font-bold">
            Tìm điểm thay đổi • {findTimeSec}s
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500 mb-2">
              BỨC TƯỜNG ĐIỂM ẢNH
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Pixel Wall Memory • Truy tìm 1 điểm biến đổi duy nhất
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-pink-400">Thử thách &ldquo;Tường điểm ảnh&rdquo;</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Ghi nhớ tổng thể bức tường nhị phân gồm hàng chục đến hàng trăm điểm ảnh trong thời gian giới hạn. Sau một nhịp chớp màn hình, hệ thống sẽ đảo ngược <strong className="text-white">duy nhất 1 ô</strong> — bạn chỉ có <strong className="text-pink-400">1 lần click</strong> để chỉ chính xác ô đó!
              </p>
              <p className="text-xs text-slate-400">
                💡 Mẹo trí nhớ hình ảnh (Chunking): Hãy gom các mảng 2×2 hoặc 3×3 thành hình khối quen thuộc (chữ L, chữ T, khối vuông) thay vì nhớ từng ô riêng lẻ.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Bức Tường
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Kích thước tường
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {([5, 8, 10, 12] as WallSize[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSize(sz)}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        size === sz
                          ? 'bg-pink-600 border-pink-400 text-white'
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
                  Kiểu hiển thị
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDisplayStyle('pixel')}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      displayStyle === 'pixel'
                        ? 'bg-pink-600 border-pink-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⬛ Ô Điểm Ảnh
                  </button>
                  <button
                    onClick={() => setDisplayStyle('binary')}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      displayStyle === 'binary'
                        ? 'bg-pink-600 border-pink-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    01 Ma Trận Nhị Phân
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Thời gian ghi nhớ
                  </label>
                  <span className="text-pink-400 text-sm font-bold">{memoSeconds}s</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={memoSeconds}
                  onChange={(e) => setMemoSeconds(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-pink-600 to-rose-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                HIỂN THỊ BỨC TƯỜNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BLINK TRANSITION */}
      {phase === 'BLINK' && (
        <div className="min-h-[65vh] flex flex-col items-center justify-center animate-fade-in">
          <div className="text-5xl mb-4 animate-ping">⚡</div>
          <p className="text-xl font-black uppercase tracking-widest text-pink-400">
            Đang đảo ngược 1 điểm ảnh...
          </p>
        </div>
      )}

      {/* MEMORIZE / PLAYING / RESULT */}
      {(phase === 'MEMORIZE' || phase === 'PLAYING' || phase === 'RESULT') && (
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          {phase === 'MEMORIZE' && (
            <div className="flex flex-wrap items-center justify-center gap-4">
              <p className="text-pink-300 font-bold text-sm uppercase tracking-wider">
                Chụp ảnh toàn bộ {size * size} ô vào tâm trí...
              </p>
              <button
                onClick={triggerBlinkThenPlay}
                className="px-5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 font-bold text-xs text-white"
              >
                Tôi Đã Nhớ — Đổi Ngay!
              </button>
            </div>
          )}

          {phase === 'PLAYING' && (
            <p className="text-amber-300 font-bold text-sm uppercase tracking-wider">
              Click chính xác vào 1 ô duy nhất vừa bị thay đổi!
            </p>
          )}

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
                {isWin ? '🏆 MẮT THẦN CHÍNH XÁC!' : '✖ CHƯA CHÍNH XÁC!'}
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                Ô bị biến đổi nằm tại <strong className="text-amber-400">Hàng {changedCell.r + 1}, Cột {changedCell.c + 1}</strong> (viền vàng).
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
                  className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 font-bold text-sm text-white"
                >
                  Chơi Lại
                </button>
              </div>
            </div>
          )}

          <div
            className="grid gap-1 bg-slate-900 p-3 sm:p-4 rounded-2xl border-2 border-slate-800 shadow-2xl select-none"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {activeGrid.map((row, r) =>
              row.map((val, c) => {
                const isTarget = r === changedCell.r && c === changedCell.c;
                const isPicked = pickedCell?.r === r && pickedCell?.c === c;
                const dim =
                  size === 12
                    ? 'w-6 h-6 sm:w-8 sm:h-8 text-xs'
                    : size === 10
                      ? 'w-7 h-7 sm:w-9 sm:h-9 text-xs'
                      : size === 8
                        ? 'w-9 h-9 sm:w-11 sm:h-11 text-sm'
                        : 'w-12 h-12 sm:w-14 sm:h-14 text-lg';

                let ring = '';
                if (phase === 'RESULT') {
                  if (isTarget) ring = 'ring-4 ring-amber-400 z-20 scale-110';
                  else if (isPicked && !isTarget) ring = 'ring-4 ring-red-500 z-10';
                }

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={phase !== 'PLAYING'}
                    onClick={() => handleCellPick(r, c)}
                    className={`${dim} rounded-md font-mono font-bold flex items-center justify-center transition-all ${ring} ${
                      displayStyle === 'pixel'
                        ? val === 1
                          ? 'bg-pink-400 border border-pink-200'
                          : 'bg-slate-950 border border-slate-800'
                        : val === 1
                          ? 'bg-slate-800 text-pink-300 border border-slate-700'
                          : 'bg-slate-950 text-slate-500 border border-slate-800'
                    } ${phase === 'PLAYING' ? 'cursor-pointer hover:ring-2 hover:ring-white' : 'cursor-default'}`}
                  >
                    {displayStyle === 'binary' ? val : ''}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
