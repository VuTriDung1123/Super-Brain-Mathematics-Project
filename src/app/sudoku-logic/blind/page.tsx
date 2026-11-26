'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  GRID_CONFIG,
  generateUniquePuzzle,
  isValidCompletedSudoku,
  type Difficulty,
  type StandardGridSize,
} from '@/lib/sudoku';

type GamePhase = 'SETUP' | 'MEMORIZE' | 'PLAYING' | 'RESULT';
type TimeMode = 'manual' | 'timer';

interface GameSettings {
  difficulty: Difficulty;
  gridSize: StandardGridSize;
  memoMode: TimeMode;
  memoTimeLimit: number;
  solveMode: TimeMode;
  solveTimeLimit: number;
}

export default function BlindSudokuGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    gridSize: '2x3',
    memoMode: 'manual',
    memoTimeLimit: 10,
    solveMode: 'manual',
    solveTimeLimit: 60,
  });

  const [puzzleBoard, setPuzzleBoard] = useState<number[][]>([]);
  const [solutionBoard, setSolutionBoard] = useState<number[][]>([]);
  const [userBoard, setUserBoard] = useState<number[][]>([]);
  const [showSolution, setShowSolution] = useState(true);

  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeCounterRef = useRef(0);

  const config = GRID_CONFIG[settings.gridSize];

  const startPlaying = useCallback(() => {
    const initialSolveTime = settings.solveMode === 'timer' ? settings.solveTimeLimit : 0;
    timeCounterRef.current = initialSolveTime;
    setDisplayTime(initialSolveTime);
    setSelectedCell({ r: 0, c: 0 });
    setPhase('PLAYING');
  }, [settings.solveMode, settings.solveTimeLimit]);

  const startGame = () => {
    const { puzzle, solution } = generateUniquePuzzle(settings.gridSize, settings.difficulty);
    setPuzzleBoard(puzzle);
    setSolutionBoard(solution);

    const cfg = GRID_CONFIG[settings.gridSize];
    setUserBoard(Array.from({ length: cfg.total }, () => Array(cfg.total).fill(0)));

    const initialMemoTime = settings.memoMode === 'timer' ? settings.memoTimeLimit : 0;
    timeCounterRef.current = initialMemoTime;
    setDisplayTime(initialMemoTime);

    setShowSolution(true);
    setSelectedCell(null);
    setPhase('MEMORIZE');
  };

  const handleInput = useCallback(
    (num: number) => {
      if (!selectedCell || phase !== 'PLAYING') return;
      const { r, c } = selectedCell;
      setUserBoard((prev) => {
        const newBoard = prev.map((row) => [...row]);
        newBoard[r][c] = num;
        return newBoard;
      });
    },
    [selectedCell, phase]
  );

  const checkResult = () => {
    setPhase('RESULT');
  };

  // Keyboard navigation & input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PLAYING' || !selectedCell) return;
      const cfg = GRID_CONFIG[settings.gridSize];
      const maxIdx = cfg.total - 1;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : null));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: Math.min(maxIdx, prev.r + 1), c: prev.c } : null));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : null));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCell((prev) => (prev ? { r: prev.r, c: Math.min(maxIdx, prev.c + 1) } : null));
      }

      if (e.key >= '1' && e.key <= cfg.total.toString()) {
        handleInput(parseInt(e.key, 10));
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleInput(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, settings.gridSize, handleInput]);

  // Clean timer effect without calling setState inside another updater
  useEffect(() => {
    if (phase !== 'MEMORIZE' && phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const isCountdown =
      (phase === 'MEMORIZE' && settings.memoMode === 'timer') ||
      (phase === 'PLAYING' && settings.solveMode === 'timer');

    timerRef.current = setInterval(() => {
      if (isCountdown) {
        timeCounterRef.current -= 1;
        if (timeCounterRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDisplayTime(0);
          if (phase === 'MEMORIZE') {
            startPlaying();
          } else {
            setPhase('RESULT');
          }
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
  }, [phase, settings.memoMode, settings.solveMode, startPlaying]);

  const formatTimeDisplay = (val: number) => {
    const m = Math.floor(val / 60);
    const s = val % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const getGridClass = () => {
    if (settings.gridSize === '2x2') return 'grid-cols-4';
    if (settings.gridSize === '2x3') return 'grid-cols-6';
    return 'grid-cols-9';
  };

  const getCellBorder = (r: number, c: number) => {
    let classes = 'border border-slate-700 ';
    const { rows, cols } = config;
    if ((c + 1) % cols === 0 && c !== config.total - 1) classes += 'border-r-4 border-r-purple-600 ';
    if ((r + 1) % rows === 0 && r !== config.total - 1) classes += 'border-b-4 border-b-purple-600 ';
    return classes;
  };

  const isSolvedCorrectly =
    phase === 'RESULT' && isValidCompletedSudoku(userBoard, puzzleBoard, config);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center fixed w-full z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <Link
          href="/sudoku-logic"
          className="inline-flex items-center text-slate-500 hover:text-purple-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Menu
        </Link>
        {(phase === 'MEMORIZE' || phase === 'PLAYING') && (
          <div
            className={`font-mono text-2xl font-bold px-6 py-2 rounded-xl border-2 shadow-lg backdrop-blur-md ${
              (phase === 'MEMORIZE' && settings.memoMode === 'timer' && displayTime < 5) ||
              (phase === 'PLAYING' && settings.solveMode === 'timer' && displayTime < 10)
                ? 'border-red-500 text-red-500 animate-pulse bg-red-900/20'
                : 'border-purple-500/50 text-purple-400 bg-slate-900/80'
            }`}
          >
            {phase === 'MEMORIZE' ? 'Ghi nhớ: ' : 'Thời gian: '}
            {formatTimeDisplay(displayTime)}
          </div>
        )}
      </div>

      {/* --- PHASE 1: WIKI + SETUP --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
              SUDOKU MÙ
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">Blind Sudoku</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-purple-900/50 text-purple-400 flex items-center justify-center mr-3 text-sm">
                    01
                  </span>
                  Giới thiệu &amp; Thử thách
                </h2>
                <div className="space-y-4 text-lg text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">Sudoku Mù</strong> là bài tập tối thượng cho trí nhớ ngắn hạn. Không giống Sudoku thường nơi bạn có thể nhìn lại đề bài bất cứ lúc nào, ở đây đề bài chỉ xuất hiện thoáng qua.
                  </p>
                  <p>
                    Bạn phải &ldquo;chụp ảnh&rdquo; toàn bộ các con số vào não bộ, sau đó tái hiện lại chúng trên một bảng trắng và giải hoàn thiện nó. Chỉ một con số nhớ sai, toàn bộ bài giải sẽ sụp đổ.
                  </p>
                </div>
              </section>

              <section>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-purple-400 font-bold text-lg mb-2 uppercase">
                    Quy tắc trò chơi
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300">
                    <li>
                      <strong>Giai đoạn 1 (Ghi nhớ):</strong> Đề bài xuất hiện. Hãy ghi nhớ vị trí và giá trị các con số.
                    </li>
                    <li>
                      <strong>Giai đoạn 2 (Giải mã):</strong> Đề bài biến mất hoàn toàn. Bảng trở về trắng trơn.
                    </li>
                    <li>
                      <strong>Nhiệm vụ:</strong> Điền lại chính xác các số của đề bài VÀ tính toán điền tiếp các ô còn thiếu theo luật Sudoku (không trùng hàng, cột, vùng).
                    </li>
                  </ul>
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Thiết lập
                </h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        Cỡ bảng
                      </label>
                      <select
                        value={settings.gridSize}
                        onChange={(e) =>
                          setSettings({ ...settings, gridSize: e.target.value as StandardGridSize })
                        }
                        className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-purple-500"
                      >
                        <option value="2x2">4×4 (2×2)</option>
                        <option value="2x3">6×6 (2×3)</option>
                        <option value="3x3">9×9 (3×3)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        Độ khó
                      </label>
                      <select
                        value={settings.difficulty}
                        onChange={(e) =>
                          setSettings({ ...settings, difficulty: e.target.value as Difficulty })
                        }
                        className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-purple-500"
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Vừa</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      1. Chế độ Ghi Nhớ
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setSettings({ ...settings, memoMode: 'manual' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.memoMode === 'manual'
                            ? 'bg-purple-600 border-purple-500'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tự do
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, memoMode: 'timer' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.memoMode === 'timer'
                            ? 'bg-purple-600 border-purple-500'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Giới hạn
                      </button>
                    </div>
                    {settings.memoMode === 'timer' && (
                      <>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={settings.memoTimeLimit}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              memoTimeLimit: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        <p className="text-right text-xs text-purple-400">
                          {settings.memoTimeLimit} giây
                        </p>
                      </>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      2. Chế độ Giải Mã
                    </label>
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => setSettings({ ...settings, solveMode: 'manual' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.solveMode === 'manual'
                            ? 'bg-pink-600 border-pink-500'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Không giới hạn
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, solveMode: 'timer' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.solveMode === 'timer'
                            ? 'bg-pink-600 border-pink-500'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Đếm ngược
                      </button>
                    </div>
                    {settings.solveMode === 'timer' && (
                      <>
                        <input
                          type="range"
                          min="30"
                          max="300"
                          step="10"
                          value={settings.solveTimeLimit}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              solveTimeLimit: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                        <p className="text-right text-xs text-pink-400">
                          {settings.solveTimeLimit} giây
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={startGame}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    BẮT ĐẦU
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PHASE 2: MEMORIZE --- */}
      {phase === 'MEMORIZE' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in">
          <h2 className="text-xl md:text-2xl text-purple-300 mb-6 font-bold uppercase tracking-widest animate-pulse text-center px-4">
            Ghi nhớ vị trí các con số
          </h2>

          <div
            className={`grid ${getGridClass()} gap-0 bg-slate-800 border-4 border-slate-600 rounded shadow-2xl select-none`}
          >
            {puzzleBoard.map((row, rIndex) =>
              row.map((cell, cIndex) => (
                <div
                  key={`${rIndex}-${cIndex}`}
                  className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-xl md:text-2xl font-bold ${getCellBorder(
                    rIndex,
                    cIndex
                  )} ${cell !== 0 ? 'bg-slate-900 text-white' : 'bg-slate-800'}`}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              ))
            )}
          </div>

          <button
            onClick={startPlaying}
            className="mt-12 px-12 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full text-xl shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {settings.memoMode === 'timer' ? 'BỎ QUA & GIẢI NGAY' : 'TÔI ĐÃ NHỚ, BẮT ĐẦU GIẢI!'}
          </button>
        </div>
      )}

      {/* --- PHASE 3: PLAYING --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in px-2">
          <div className="mb-4 text-center text-slate-400 text-sm">
            Sử dụng <span className="border border-slate-600 px-1 rounded text-white mx-1">Mũi tên</span>{' '}
            để di chuyển,{' '}
            <span className="border border-slate-600 px-1 rounded text-white mx-1">Số</span> để nhập.
          </div>

          <div
            className={`grid ${getGridClass()} gap-0 bg-slate-800 border-4 border-slate-600 rounded shadow-2xl mb-8 select-none outline-none`}
          >
            {userBoard.map((row, rIndex) =>
              row.map((cell, cIndex) => (
                <div
                  key={`${rIndex}-${cIndex}`}
                  onClick={() => setSelectedCell({ r: rIndex, c: cIndex })}
                  className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-xl md:text-2xl font-bold cursor-pointer transition-all ${getCellBorder(
                    rIndex,
                    cIndex
                  )} ${
                    selectedCell?.r === rIndex && selectedCell?.c === cIndex
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400 z-10'
                      : 'bg-slate-900 text-purple-200 hover:bg-slate-800'
                  }`}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              ))
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-8 px-4 w-full max-w-3xl">
            {Array.from({ length: config.total }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => handleInput(num)}
                className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border-b-4 border-slate-900 hover:border-b-0 hover:translate-y-1 hover:from-purple-600 hover:to-purple-800 text-white font-black text-xl md:text-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => handleInput(0)}
              className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-gradient-to-br from-red-900/80 to-red-950 border-b-4 border-red-950 hover:border-b-0 hover:translate-y-1 hover:from-red-600 hover:to-red-800 text-white font-bold text-xs md:text-sm transition-all shadow-lg flex items-center justify-center active:scale-95"
            >
              XÓA
            </button>
          </div>

          <button
            onClick={checkResult}
            className="w-full max-w-md py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white text-lg shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            NỘP BÀI
          </button>
        </div>
      )}

      {/* --- PHASE 4: RESULT --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            {isSolvedCorrectly ? (
              <div className="text-center">
                <div className="absolute top-0 left-0 w-full h-3 bg-green-500" />
                <h2 className="text-5xl md:text-6xl font-black text-green-400 mb-4">XUẤT SẮC!</h2>
                <p className="text-slate-300 text-lg">
                  Bạn có trí nhớ và tư duy logic tuyệt vời.
                </p>
              </div>
            ) : (
              <div className="text-center">
                <div className="absolute top-0 left-0 w-full h-3 bg-red-500" />
                <h2 className="text-5xl md:text-6xl font-black text-red-500 mb-4">SAI RỒI!</h2>
                <p className="text-slate-300 text-lg mb-6">
                  {settings.solveMode === 'timer' && displayTime <= 0
                    ? 'Đã hết thời gian làm bài.'
                    : 'Kết quả điền chưa chính xác.'}
                </p>

                <div className="flex justify-center gap-3 mb-4">
                  <button
                    onClick={() => setShowSolution(true)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase ${
                      showSolution ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Đáp án đúng
                  </button>
                  <button
                    onClick={() => setShowSolution(false)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase ${
                      !showSolution ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Bài làm của bạn
                  </button>
                </div>

                <div
                  className={`grid ${getGridClass()} gap-0 bg-slate-800 border-2 border-slate-600 rounded mx-auto w-fit opacity-95 pointer-events-none scale-75 md:scale-100`}
                >
                  {(showSolution ? solutionBoard : userBoard).map((row, rIndex) =>
                    row.map((cell, cIndex) => {
                      const isClue = puzzleBoard[rIndex][cIndex] !== 0;
                      const isWrong = !showSolution && cell !== solutionBoard[rIndex][cIndex];
                      return (
                        <div
                          key={`res-${rIndex}-${cIndex}`}
                          className={`w-8 h-8 flex items-center justify-center text-sm font-bold ${getCellBorder(
                            rIndex,
                            cIndex
                          )} ${
                            isWrong
                              ? 'bg-red-900/60 text-red-300'
                              : isClue
                                ? 'text-purple-400 bg-slate-900'
                                : 'text-white bg-slate-900/60'
                          }`}
                        >
                          {cell !== 0 ? cell : ''}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="mt-10 flex gap-4">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cấu Hình Lại
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg transition-colors"
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
