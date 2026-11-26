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
type InputMode = 'number' | 'color';

interface GameSettings {
  difficulty: Difficulty;
  gridSize: StandardGridSize;
  isBlindMode: boolean;
  memoTimeLimit: number;
  timeMode: 'manual' | 'timer';
  timeLimit: number;
}

const COLORS = [
  '#cbd5e1', // 0: Empty
  '#ef4444', // 1: Red
  '#f97316', // 2: Orange
  '#eab308', // 3: Yellow
  '#22c55e', // 4: Green
  '#06b6d4', // 5: Cyan
  '#3b82f6', // 6: Blue
  '#a855f7', // 7: Purple
  '#ec4899', // 8: Pink
  '#64748b', // 9: Slate
];

const COLOR_NAMES = ['Trống', 'Đỏ', 'Cam', 'Vàng', 'Lục', 'Lam', 'Dương', 'Tím', 'Hồng', 'Xám'];

const generateChromaticPuzzle = (size: StandardGridSize, difficulty: Difficulty) => {
  const { puzzle: numPuzzle, solution: numSolution } = generateUniquePuzzle(size, difficulty);
  const { puzzle: colPuzzle, solution: colSolution } = generateUniquePuzzle(size, difficulty);
  return { numPuzzle, colPuzzle, numSolution, colSolution };
};

export default function ChromaticSudokuGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    gridSize: '2x3',
    isBlindMode: false,
    memoTimeLimit: 15,
    timeMode: 'manual',
    timeLimit: 60,
  });

  const [initialNum, setInitialNum] = useState<number[][]>([]);
  const [initialCol, setInitialCol] = useState<number[][]>([]);
  const [solNum, setSolNum] = useState<number[][]>([]);
  const [solCol, setSolCol] = useState<number[][]>([]);

  const [userNum, setUserNum] = useState<number[][]>([]);
  const [userCol, setUserCol] = useState<number[][]>([]);

  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('number');
  const [showSolution, setShowSolution] = useState(false);

  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeCounterRef = useRef(0);

  const config = GRID_CONFIG[settings.gridSize];

  const startPlayingBlind = useCallback(() => {
    const initialPlayTime = settings.timeMode === 'timer' ? settings.timeLimit : 0;
    timeCounterRef.current = initialPlayTime;
    setDisplayTime(initialPlayTime);
    setPhase('PLAYING');
  }, [settings.timeMode, settings.timeLimit]);

  const startGame = () => {
    const { numPuzzle, colPuzzle, numSolution, colSolution } = generateChromaticPuzzle(
      settings.gridSize,
      settings.difficulty
    );

    setInitialNum(numPuzzle);
    setInitialCol(colPuzzle);
    setSolNum(numSolution);
    setSolCol(colSolution);

    if (settings.isBlindMode) {
      setUserNum(Array.from({ length: config.total }, () => Array(config.total).fill(0)));
      setUserCol(Array.from({ length: config.total }, () => Array(config.total).fill(0)));
      timeCounterRef.current = settings.memoTimeLimit;
      setDisplayTime(settings.memoTimeLimit);
      setPhase('MEMORIZE');
    } else {
      setUserNum(numPuzzle.map((r) => [...r]));
      setUserCol(colPuzzle.map((r) => [...r]));
      const initialPlayTime = settings.timeMode === 'timer' ? settings.timeLimit : 0;
      timeCounterRef.current = initialPlayTime;
      setDisplayTime(initialPlayTime);
      setPhase('PLAYING');
    }

    setShowSolution(false);
    setSelectedCell({ r: 0, c: 0 });
  };

  const handleInput = useCallback(
    (val: number) => {
      if (!selectedCell || phase !== 'PLAYING') return;
      const { r, c } = selectedCell;

      if (!settings.isBlindMode) {
        if (inputMode === 'number' && initialNum[r]?.[c] !== 0) return;
        if (inputMode === 'color' && initialCol[r]?.[c] !== 0) return;
      }

      if (inputMode === 'number') {
        setUserNum((prev) => {
          const newBoard = prev.map((row) => [...row]);
          newBoard[r][c] = val;
          return newBoard;
        });
      } else {
        setUserCol((prev) => {
          const newBoard = prev.map((row) => [...row]);
          newBoard[r][c] = val;
          return newBoard;
        });
      }
    },
    [selectedCell, phase, inputMode, initialNum, initialCol, settings.isBlindMode]
  );

  // Keyboard navigation & input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PLAYING' || !selectedCell) return;
      const maxIdx = config.total - 1;

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

      if (e.key === 'Tab') {
        e.preventDefault();
        setInputMode((prev) => (prev === 'number' ? 'color' : 'number'));
      }

      if (e.key >= '1' && e.key <= config.total.toString()) {
        handleInput(parseInt(e.key, 10));
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        handleInput(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, config, handleInput]);

  // Clean timer
  useEffect(() => {
    if (phase !== 'MEMORIZE' && phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const isCountdown = phase === 'MEMORIZE' || settings.timeMode === 'timer';

    timerRef.current = setInterval(() => {
      if (isCountdown) {
        timeCounterRef.current -= 1;
        if (timeCounterRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDisplayTime(0);
          if (phase === 'MEMORIZE') {
            startPlayingBlind();
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
  }, [phase, settings.timeMode, startPlayingBlind]);

  const formatTime = (val: number) => {
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
    if ((c + 1) % cols === 0 && c !== config.total - 1) classes += 'border-r-4 border-r-white ';
    if ((r + 1) % rows === 0 && r !== config.total - 1) classes += 'border-b-4 border-b-white ';
    return classes;
  };

  const getCellDisplay = (r: number, c: number) => {
    if (phase === 'MEMORIZE') return { num: initialNum[r][c], col: initialCol[r][c] };
    return { num: userNum[r][c], col: userCol[r][c] };
  };

  const isNumLayerCorrect =
    phase === 'RESULT' && isValidCompletedSudoku(userNum, initialNum, config);
  const isColLayerCorrect =
    phase === 'RESULT' && isValidCompletedSudoku(userCol, initialCol, config);
  const isBothCorrect = isNumLayerCorrect && isColLayerCorrect;

  const isCellWrong = (r: number, c: number) => {
    if (showSolution || isBothCorrect) return false;
    const numWrong = !isNumLayerCorrect && userNum[r][c] !== solNum[r][c];
    const colWrong = !isColLayerCorrect && userCol[r][c] !== solCol[r][c];
    return numWrong || colWrong;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-white">
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center fixed w-full z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <Link
          href="/sudoku-logic"
          className="inline-flex items-center text-slate-500 hover:text-cyan-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Menu
        </Link>
        {(phase === 'MEMORIZE' || phase === 'PLAYING') && (
          <div className="flex gap-4">
            {phase === 'PLAYING' && (
              <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
                <button
                  onClick={() => setInputMode('number')}
                  className={`px-4 py-1 rounded text-sm font-bold transition-all ${
                    inputMode === 'number' ? 'bg-white text-black' : 'text-slate-500'
                  }`}
                >
                  123
                </button>
                <button
                  onClick={() => setInputMode('color')}
                  className={`px-4 py-1 rounded text-sm font-bold transition-all ${
                    inputMode === 'color'
                      ? 'bg-gradient-to-r from-red-500 to-blue-500 text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Màu
                </button>
              </div>
            )}
            <div
              className={`font-mono text-2xl font-bold px-6 py-2 rounded-xl border-2 shadow-lg backdrop-blur-md ${
                phase === 'MEMORIZE'
                  ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20'
                  : 'border-cyan-500/50 text-cyan-400 bg-slate-900/80'
              }`}
            >
              {phase === 'MEMORIZE' ? 'Ghi nhớ: ' : ''} {formatTime(displayTime)}
            </div>
          </div>
        )}
      </div>

      {/* --- SETUP --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
              CHROMATIC SUDOKU
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Sudoku Sắc Màu • Thử thách Song Song
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-cyan-900/50 text-cyan-400 flex items-center justify-center mr-3 text-sm">
                    01
                  </span>
                  Giới thiệu
                </h2>
                <div className="text-lg text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">Chromatic Sudoku</strong> (Sudoku Lưỡng Tính) là sự kết hợp giữa logic số học và logic màu sắc. Trên cùng một bàn cờ, bạn phải giải quyết đồng thời hai bài toán Sudoku có nghiệm duy nhất chồng lên nhau.
                  </p>
                </div>
              </section>
              <section>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                  <h3 className="text-cyan-400 font-bold text-lg mb-2 uppercase">
                    Quy tắc trò chơi
                  </h3>
                  <ul className="list-disc list-inside space-y-2 text-slate-300">
                    <li>
                      <strong>Lớp Số &amp; Màu:</strong> Phải thỏa mãn luật Sudoku độc lập trên từng hàng, cột và vùng.
                    </li>
                    <li>
                      <strong>Độc lập:</strong> Một ô có thể là (Số 1, Màu Đỏ), ô khác có thể là (Số 2, Màu Đỏ).
                    </li>
                    <li>
                      <strong>Ô cố định (chế độ Tiêu chuẩn):</strong> Các số/màu cho sẵn được đánh dấu bằng dấu chấm nhỏ ở góc trên để phân biệt với phần bạn điền.
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
                        className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-cyan-500"
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
                        className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-cyan-500"
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Vừa</option>
                        <option value="hard">Khó</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Chế độ chơi
                    </label>
                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setSettings({ ...settings, isBlindMode: false })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          !settings.isBlindMode
                            ? 'bg-cyan-600 border-cyan-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tiêu chuẩn
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, isBlindMode: true })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.isBlindMode
                            ? 'bg-cyan-600 border-cyan-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Giải Mù
                      </button>
                    </div>
                    {settings.isBlindMode && (
                      <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">Thời gian ghi nhớ</span>
                          <span className="text-yellow-400 font-bold">
                            {settings.memoTimeLimit} giây
                          </span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="5"
                          value={settings.memoTimeLimit}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              memoTimeLimit: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                      </div>
                    )}
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
                            ? 'bg-cyan-600 border-cyan-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tự do
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, timeMode: 'timer' })}
                        className={`flex-1 py-2 text-xs font-bold rounded border ${
                          settings.timeMode === 'timer'
                            ? 'bg-cyan-600 border-cyan-500 text-white'
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
                          max="600"
                          step="30"
                          value={settings.timeLimit}
                          onChange={(e) =>
                            setSettings({ ...settings, timeLimit: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <p className="text-right text-xs text-cyan-400">{settings.timeLimit} giây</p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={startGame}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    BẮT ĐẦU
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MEMORIZE --- */}
      {phase === 'MEMORIZE' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in">
          <h2 className="text-2xl text-yellow-400 mb-4 font-bold uppercase tracking-widest animate-pulse">
            GHI NHỚ ĐỀ BÀI
          </h2>
          <div
            className={`grid ${getGridClass()} gap-0 bg-slate-800 border-4 border-slate-600 rounded shadow-2xl`}
          >
            {initialNum.map((row, r) =>
              row.map((cell, c) => {
                const colVal = initialCol[r][c];
                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-2xl font-black ${getCellBorder(
                      r,
                      c
                    )}`}
                    style={{
                      backgroundColor: colVal !== 0 ? COLORS[colVal] : '#1e293b',
                      color: colVal !== 0 ? 'white' : '#94a3b8',
                    }}
                  >
                    {cell !== 0 ? cell : ''}
                  </div>
                );
              })
            )}
          </div>
          <button
            onClick={startPlayingBlind}
            className="mt-12 px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-full text-xl shadow-lg"
          >
            TÔI ĐÃ NHỚ, GIẢI THÔI!
          </button>
        </div>
      )}

      {/* --- PLAYING --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in px-2">
          <div className="mb-4 text-center">
            <p className="text-slate-400 text-sm">
              {settings.isBlindMode
                ? 'Điền lại đề bài và giải tiếp.'
                : 'Điền số và tô màu để hoàn thành.'}
            </p>
            <div className="text-xs text-cyan-500 mt-1">
              Phím <span className="border border-cyan-800 px-1 rounded">Tab</span> để đổi chế độ
              Số/Màu
            </div>
          </div>
          <div
            className={`grid ${getGridClass()} gap-0 bg-slate-900 border-4 border-slate-700 rounded-lg shadow-2xl mb-8 select-none relative`}
          >
            <div
              className={`absolute -inset-1 rounded-xl border-2 pointer-events-none transition-colors ${
                inputMode === 'number' ? 'border-white/50' : 'border-pink-500/50'
              }`}
            />
            {Array.from({ length: config.total }).map((_, r) =>
              Array.from({ length: config.total }).map((__, c) => {
                const data = getCellDisplay(r, c);
                const isLockedNum = !settings.isBlindMode && initialNum[r]?.[c] !== 0;
                const isLockedCol = !settings.isBlindMode && initialCol[r]?.[c] !== 0;
                return (
                  <div
                    key={`${r}-${c}`}
                    onClick={() => setSelectedCell({ r, c })}
                    className={`relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-3xl font-black cursor-pointer transition-all ${getCellBorder(
                      r,
                      c
                    )} ${
                      selectedCell?.r === r && selectedCell?.c === c
                        ? 'ring-4 ring-cyan-400 z-20'
                        : ''
                    }`}
                    style={{
                      backgroundColor: data.col !== 0 ? COLORS[data.col] : '#1e293b',
                      color: isLockedNum ? '#fef08a' : 'white',
                      textShadow: '0 2px 4px rgba(0,0,0,0.65)',
                    }}
                  >
                    {data.num !== 0 ? data.num : ''}
                    {isLockedCol && (
                      <span
                        title="Màu cố định từ đề bài"
                        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/80"
                      />
                    )}
                    {isLockedNum && (
                      <span
                        title="Số cố định từ đề bài"
                        className="absolute bottom-1 left-1 w-1.5 h-1.5 rounded-full bg-yellow-300"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <div className="w-full max-w-3xl flex flex-col items-center gap-6">
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={() => setInputMode('number')}
                className={`flex-1 max-w-[150px] py-3 rounded-xl font-bold border-b-4 transition-all active:scale-95 ${
                  inputMode === 'number'
                    ? 'bg-white text-slate-900 border-slate-300 translate-y-1 border-b-0 shadow-inner'
                    : 'bg-slate-800 text-slate-400 border-slate-950 hover:bg-slate-700'
                }`}
              >
                NHẬP SỐ
              </button>
              <button
                onClick={() => setInputMode('color')}
                className={`flex-1 max-w-[150px] py-3 rounded-xl font-bold border-b-4 transition-all active:scale-95 ${
                  inputMode === 'color'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-pink-700 translate-y-1 border-b-0 shadow-inner'
                    : 'bg-slate-800 text-slate-400 border-slate-950 hover:bg-slate-700'
                }`}
              >
                TÔ MÀU
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {inputMode === 'number' ? (
                <>
                  {Array.from({ length: config.total }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => handleInput(num)}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-700 hover:bg-white hover:text-black font-black text-xl transition-all border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    onClick={() => handleInput(0)}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white font-bold text-xs border-b-4 border-red-950 active:border-b-0 active:translate-y-1"
                  >
                    XÓA
                  </button>
                </>
              ) : (
                <>
                  {Array.from({ length: config.total }, (_, i) => i + 1).map((colIdx) => (
                    <button
                      key={colIdx}
                      onClick={() => handleInput(colIdx)}
                      title={`${colIdx} - ${COLOR_NAMES[colIdx]}`}
                      aria-label={`Màu ${COLOR_NAMES[colIdx]}`}
                      className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-slate-600 hover:scale-110 transition-transform shadow-lg flex items-end justify-center pb-0.5 text-[10px] font-bold text-white/90"
                      style={{
                        backgroundColor: COLORS[colIdx],
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}
                    >
                      {COLOR_NAMES[colIdx]}
                    </button>
                  ))}
                  <button
                    onClick={() => handleInput(0)}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs text-slate-400 hover:bg-slate-700"
                  >
                    Xóa
                  </button>
                </>
              )}
            </div>
            <button
              onClick={() => setPhase('RESULT')}
              className="w-full max-w-md py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              NỘP BÀI
            </button>
          </div>
        </div>
      )}

      {/* --- RESULT PHASE --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
            {isBothCorrect ? (
              <>
                <h2 className="text-5xl font-black text-green-400 mb-2">HOÀN HẢO!</h2>
                <p className="text-slate-300 mb-6">Bạn đã chinh phục cả hai tầng logic.</p>
              </>
            ) : (
              <>
                <h2 className="text-5xl font-black text-red-500 mb-2">CHƯA CHÍNH XÁC</h2>
                <div className="grid grid-cols-2 gap-4 mt-6 text-sm mb-6">
                  <div
                    className={`p-4 rounded bg-slate-800 ${
                      isNumLayerCorrect
                        ? 'text-green-400 border border-green-500'
                        : 'text-red-400 border border-red-500'
                    }`}
                  >
                    {isNumLayerCorrect ? '✔ Lớp Số Đúng' : '✖ Lớp Số Sai'}
                  </div>
                  <div
                    className={`p-4 rounded bg-slate-800 ${
                      isColLayerCorrect
                        ? 'text-green-400 border border-green-500'
                        : 'text-red-400 border border-red-500'
                    }`}
                  >
                    {isColLayerCorrect ? '✔ Lớp Màu Đúng' : '✖ Lớp Màu Sai'}
                  </div>
                </div>
              </>
            )}

            <div className="flex justify-center mb-6">
              <div
                className={`grid ${getGridClass()} gap-0 bg-slate-950 border-2 border-slate-700 rounded`}
              >
                {Array.from({ length: config.total }).map((_, r) =>
                  Array.from({ length: config.total }).map((__, c) => {
                    const num = showSolution ? solNum[r][c] : userNum[r][c];
                    const col = showSolution ? solCol[r][c] : userCol[r][c];
                    const isWrong = !showSolution && isCellWrong(r, c);

                    return (
                      <div
                        key={`res-${r}-${c}`}
                        className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-sm font-bold ${getCellBorder(
                          r,
                          c
                        )} ${isWrong ? 'ring-2 ring-inset ring-red-500 z-10' : ''}`}
                        style={{
                          backgroundColor: col !== 0 ? COLORS[col] : '#1e293b',
                          color: 'white',
                          opacity: showSolution ? 1 : isWrong ? 1 : 0.85,
                        }}
                      >
                        {num !== 0 ? num : ''}
                      </div>
                    );
                  })
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
                {showSolution ? 'Xem Bài Làm' : 'Xem Đáp Án'}
              </button>

              <button
                onClick={startGame}
                className="px-6 py-3 rounded-xl font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-lg transition-colors"
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
