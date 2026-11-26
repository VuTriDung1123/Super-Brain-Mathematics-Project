'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'SHOWING' | 'RECALL' | 'RESULT';
type GridSize = 4 | 5 | 6;

interface CellPos {
  r: number;
  c: number;
}

function generateSimplePath(size: number, targetLen: number): CellPos[] {
  for (let attempt = 0; attempt < 50; attempt++) {
    const start: CellPos = {
      r: Math.floor(Math.random() * size),
      c: Math.floor(Math.random() * size),
    };
    const path: CellPos[] = [start];
    const visited = new Set<string>([`${start.r},${start.c}`]);

    while (path.length < targetLen) {
      const curr = path[path.length - 1];
      const neighbors = [
        { r: curr.r + 1, c: curr.c },
        { r: curr.r - 1, c: curr.c },
        { r: curr.r, c: curr.c + 1 },
        { r: curr.r, c: curr.c - 1 },
      ].filter(
        (n) =>
          n.r >= 0 &&
          n.r < size &&
          n.c >= 0 &&
          n.c < size &&
          !visited.has(`${n.r},${n.c}`)
      );
      if (neighbors.length === 0) break;
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      path.push(next);
      visited.add(`${next.r},${next.c}`);
    }

    if (path.length === targetLen) return path;
  }
  return [
    { r: 0, c: 0 },
    { r: 0, c: 1 },
    { r: 1, c: 1 },
    { r: 1, c: 2 },
    { r: 2, c: 2 },
  ];
}

export default function PathMemoryGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [size, setSize] = useState<GridSize>(5);
  const [pathLen, setPathLen] = useState(8);
  const [reverseMode, setReverseMode] = useState(false);

  const [targetPath, setTargetPath] = useState<CellPos[]>([]);
  const [showStep, setShowStep] = useState(0);
  const [userPath, setUserPath] = useState<CellPos[]>([]);
  const [isWin, setIsWin] = useState(false);

  const expectedSequence = reverseMode ? [...targetPath].reverse() : targetPath;

  const startGame = () => {
    const p = generateSimplePath(size, pathLen);
    setTargetPath(p);
    setShowStep(0);
    setUserPath([]);
    setIsWin(false);
    setPhase('SHOWING');
  };

  useEffect(() => {
    if (phase !== 'SHOWING' || targetPath.length === 0) return;

    const timer = setTimeout(() => {
      if (showStep + 1 < targetPath.length) {
        setShowStep((s) => s + 1);
      } else {
        setPhase('RECALL');
      }
    }, 580);

    return () => clearTimeout(timer);
  }, [phase, showStep, targetPath.length]);

  const handleCellClick = (r: number, c: number) => {
    if (phase !== 'RECALL') return;
    const step = userPath.length;
    const expected = expectedSequence[step];
    if (!expected) return;

    const nextUserPath = [...userPath, { r, c }];
    setUserPath(nextUserPath);

    if (expected.r === r && expected.c === c) {
      playClick();
      if (nextUserPath.length === expectedSequence.length) {
        playSuccess();
        setIsWin(true);
        setPhase('RESULT');
      }
    } else {
      playError();
      setIsWin(false);
      setPhase('RESULT');
    }
  };

  const correctSteps = isWin ? expectedSequence.length : Math.max(0, userPath.length - 1);
  const accuracy =
    expectedSequence.length > 0
      ? Math.round((correctSteps / expectedSequence.length) * 100)
      : 0;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'path-memory',
    won: isWin,
    accuracy,
    scoreLabel: `${correctSteps}/${expectedSequence.length} bước (${reverseMode ? 'Ngược' : 'Xuôi'})`,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-teal-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-teal-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {(phase === 'SHOWING' || phase === 'RECALL') && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-teal-500/40 text-teal-300 font-bold">
            {phase === 'SHOWING'
              ? `Đang phát: ${showStep + 1}/${targetPath.length}`
              : `Vẽ ${reverseMode ? 'NGƯỢC' : 'XUÔI'}: ${userPath.length}/${expectedSequence.length}`}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-2">
              TRUY TÌM DẤU VẾT
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Path Memory Trace • Trí nhớ lộ trình không gian
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-teal-400">Thử thách Truy Vết Ánh Sáng</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Một tia sáng sẽ di chuyển liên tiếp qua các ô kề nhau tạo thành một lộ trình ngoằn ngoèo rồi biến mất. Bạn phải click vẽ lại chính xác từng bước theo đúng thứ tự — hoặc nâng độ khó lên chế độ{' '}
                <strong className="text-amber-300">Đảo Ngược (từ cuối về đầu)</strong>!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Lộ Trình
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Cỡ ma trận
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([4, 5, 6] as GridSize[]).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSize(sz)}
                      className={`py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                        size === sz
                          ? 'bg-teal-600 border-teal-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {sz}×{sz}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Độ dài dấu vết
                  </label>
                  <span className="text-teal-400 text-sm font-bold">{pathLen} bước</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="14"
                  value={pathLen}
                  onChange={(e) => setPathLen(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Chiều tái hiện
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setReverseMode(false)}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      !reverseMode
                        ? 'bg-teal-600 border-teal-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ➡ Vẽ Xuôi
                  </button>
                  <button
                    onClick={() => setReverseMode(true)}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      reverseMode
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⬅ Vẽ Ngược (Khó)
                  </button>
                </div>
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                PHÁT TÍN HIỆU LỘ TRÌNH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHOWING / RECALL / RESULT */}
      {(phase === 'SHOWING' || phase === 'RECALL' || phase === 'RESULT') && (
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          {phase === 'SHOWING' && (
            <p className="text-teal-300 font-bold uppercase tracking-wider animate-pulse">
              Tập trung dõi theo chuyển động của tia sáng...
            </p>
          )}
          {phase === 'RECALL' && (
            <p className="text-amber-300 font-bold uppercase tracking-wider">
              {reverseMode
                ? 'Hãy click vẽ NGƯỢC từ ô CUỐI CÙNG về ô ĐẦU TIÊN!'
                : 'Hãy click vẽ lại chính xác lộ trình từ ô ĐẦU TIÊN!'}
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
                {isWin ? '🏆 TRUY VẾT HOÀN HẢO!' : `✖ ĐỨT MẠCH Ở BƯỚC #${userPath.length}!`}
              </h2>
              <p className="text-slate-300 text-sm mb-4">
                Các số bên dưới hiển thị thứ tự đúng của toàn bộ {expectedSequence.length} bước ({reverseMode ? 'chiều ngược' : 'chiều xuôi'}).
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
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-sm text-white"
                >
                  Chơi Lại
                </button>
              </div>
            </div>
          )}

          <div
            className="grid gap-2 bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-2xl select-none"
            style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: size }).map((_, r) =>
              Array.from({ length: size }).map((__, c) => {
                const isShowingHead =
                  phase === 'SHOWING' &&
                  targetPath[showStep]?.r === r &&
                  targetPath[showStep]?.c === c;
                const isShowingPrev =
                  phase === 'SHOWING' &&
                  showStep > 0 &&
                  targetPath[showStep - 1]?.r === r &&
                  targetPath[showStep - 1]?.c === c;

                const userIdx = userPath.findIndex((p) => p.r === r && p.c === c);
                const expIdx = expectedSequence.findIndex((p) => p.r === r && p.c === c);

                let style = 'bg-slate-950 border-slate-800 text-slate-600';
                if (isShowingHead) {
                  style = 'bg-teal-400 border-white text-slate-950 scale-105 shadow-lg shadow-teal-400/50';
                } else if (isShowingPrev) {
                  style = 'bg-teal-900/70 border-teal-500/60 text-teal-200';
                } else if (phase === 'RECALL' && userIdx !== -1) {
                  style = 'bg-emerald-600 border-emerald-300 text-white';
                } else if (phase === 'RESULT') {
                  if (userIdx !== -1 && !isWin && userIdx === userPath.length - 1) {
                    style = 'bg-red-600 border-red-300 text-white';
                  } else if (expIdx !== -1) {
                    style = 'bg-teal-700 border-teal-400 text-white';
                  }
                }

                const dim = size === 6 ? 'w-12 h-12 sm:w-14 sm:h-14' : 'w-14 h-14 sm:w-16 sm:h-16';

                return (
                  <button
                    key={`${r}-${c}`}
                    type="button"
                    disabled={phase !== 'RECALL'}
                    onClick={() => handleCellClick(r, c)}
                    className={`${dim} rounded-xl border-2 font-mono font-black text-xl flex items-center justify-center transition-all ${style} ${
                      phase === 'RECALL' ? 'cursor-pointer hover:border-teal-400' : 'cursor-default'
                    }`}
                  >
                    {phase === 'RESULT' && expIdx !== -1
                      ? expIdx + 1
                      : phase === 'RECALL' && userIdx !== -1
                        ? userIdx + 1
                        : isShowingHead
                          ? '●'
                          : ''}
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
