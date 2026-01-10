'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// --- TYPES ---
type GamePhase = 'SETUP' | 'MEMORIZE' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';
type GridSize = '2x2' | '2x3' | '3x3'; 
type InputMode = 'number' | 'color'; // Người chơi đang nhập số hay tô màu?

interface GameSettings {
  difficulty: Difficulty;
  gridSize: GridSize;
  isBlindMode: boolean; // Chế độ Mù hay Thường
  timeMode: 'manual' | 'timer';
  timeLimit: number;
}

// --- CONFIG ---
const GRID_CONFIG = {
  '2x2': { total: 4, rows: 2, cols: 2 }, // 4x4
  '2x3': { total: 6, rows: 2, cols: 3 }, // 6x6
  '3x3': { total: 9, rows: 3, cols: 3 }, // 9x9
};

// Định nghĩa bảng màu (9 màu cho 9 số)
const COLORS = [
    '#cbd5e1', // 0: Empty (Slate-300)
    '#ef4444', // 1: Red
    '#f97316', // 2: Orange
    '#eab308', // 3: Yellow
    '#22c55e', // 4: Green
    '#06b6d4', // 5: Cyan
    '#3b82f6', // 6: Blue
    '#a855f7', // 7: Purple
    '#ec4899', // 8: Pink
    '#64748b', // 9: Slate (Dark)
];

const COLOR_NAMES = ["Trống", "Đỏ", "Cam", "Vàng", "Lục", "Lam", "Dương", "Tím", "Hồng", "Xám"];

// --- CORE LOGIC (DUAL GENERATOR) ---

// Kiểm tra hợp lệ (Dùng chung cho cả Số và Màu)
const isSafe = (board: number[][], row: number, col: number, val: number, config: any) => {
  const { total, rows, cols } = config;
  for (let x = 0; x < total; x++) if (board[row][x] === val) return false;
  for (let x = 0; x < total; x++) if (board[x][col] === val) return false;
  const startRow = row - (row % rows);
  const startCol = col - (col % cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i + startRow][j + startCol] === val) return false;
    }
  }
  return true;
};

// Giải / Sinh bảng
const fillBoard = (board: number[][], config: any): boolean => {
  const { total } = config;
  for (let row = 0; row < total; row++) {
    for (let col = 0; col < total; col++) {
      if (board[row][col] === 0) {
        const nums = Array.from({ length: total }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        for (const val of nums) {
          if (isSafe(board, row, col, val, config)) {
            board[row][col] = val;
            if (fillBoard(board, config)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

// Sinh đề bài Kép (Số riêng, Màu riêng)
const generateChromaticPuzzle = (size: GridSize, difficulty: Difficulty) => {
  const config = GRID_CONFIG[size];
  const { total } = config;

  // 1. Sinh bảng Số (Full)
  const numBoard = Array.from({ length: total }, () => Array(total).fill(0));
  fillBoard(numBoard, config);
  const numSolution = numBoard.map(r => [...r]);

  // 2. Sinh bảng Màu (Full) - Độc lập với số
  // (Màu được đại diện bởi các số 1->total trong logic)
  const colBoard = Array.from({ length: total }, () => Array(total).fill(0));
  fillBoard(colBoard, config);
  const colSolution = colBoard.map(r => [...r]);

  // 3. Đục lỗ (Digging) - Tạo đề bài
  // Logic đục lỗ: Có ô mất Số, có ô mất Màu, có ô mất cả hai.
  // Easy: Giữ lại nhiều thông tin. Hard: Giữ lại ít.
  
  const numPuzzle = numBoard.map(r => [...r]);
  const colPuzzle = colBoard.map(r => [...r]);

  let removeRate = 0.3;
  if (difficulty === 'medium') removeRate = 0.5;
  if (difficulty === 'hard') removeRate = 0.7;

  const totalCells = total * total;
  const cellsToRemove = Math.floor(totalCells * removeRate);

  for(let i=0; i<cellsToRemove; i++) {
      const r = Math.floor(Math.random() * total);
      const c = Math.floor(Math.random() * total);
      
      // Random kiểu xóa: 
      // 0: Xóa số, giữ màu
      // 1: Xóa màu, giữ số
      // 2: Xóa cả hai (Khó nhất)
      const removeType = Math.floor(Math.random() * 3);
      
      if (removeType === 0) numPuzzle[r][c] = 0;
      else if (removeType === 1) colPuzzle[r][c] = 0;
      else {
          numPuzzle[r][c] = 0;
          colPuzzle[r][c] = 0;
      }
  }

  return { numPuzzle, colPuzzle, numSolution, colSolution };
};

export default function ChromaticSudokuGame() {
  // --- STATE ---
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    gridSize: '2x3',
    isBlindMode: false,
    timeMode: 'manual',
    timeLimit: 60,
  });

  // Data
  const [initialNum, setInitialNum] = useState<number[][]>([]); // Đề bài Số
  const [initialCol, setInitialCol] = useState<number[][]>([]); // Đề bài Màu
  const [solNum, setSolNum] = useState<number[][]>([]); // Đáp án Số
  const [solCol, setSolCol] = useState<number[][]>([]); // Đáp án Màu
  
  // User Input
  const [userNum, setUserNum] = useState<number[][]>([]);
  const [userCol, setUserCol] = useState<number[][]>([]);

  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>('number'); // Đang nhập số hay màu?
  
  // Timer
  const [displayTime, setDisplayTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const config = GRID_CONFIG[settings.gridSize];

  // --- LOGIC ---
  const startGame = () => {
    const { numPuzzle, colPuzzle, numSolution, colSolution } = generateChromaticPuzzle(settings.gridSize, settings.difficulty);
    
    setInitialNum(numPuzzle);
    setInitialCol(colPuzzle);
    setSolNum(numSolution);
    setSolCol(colSolution);

    if (settings.isBlindMode) {
        // Blind: User bắt đầu với bảng trống trơn (sau khi nhớ)
        // Lúc Memorize thì hiển thị Puzzle, lúc Playing thì hiển thị Rỗng
        setUserNum(Array.from({ length: config.total }, () => Array(config.total).fill(0)));
        setUserCol(Array.from({ length: config.total }, () => Array(config.total).fill(0)));
        setPhase('MEMORIZE');
        setDisplayTime(15); // 15s ghi nhớ mặc định
    } else {
        // Standard: User bắt đầu với bảng Puzzle
        setUserNum(numPuzzle.map(r => [...r]));
        setUserCol(colPuzzle.map(r => [...r]));
        setPhase('PLAYING');
        if (settings.timeMode === 'timer') setDisplayTime(settings.timeLimit); else setDisplayTime(0);
    }
    
    setSelectedCell({ r: 0, c: 0 });
  };

  const startPlayingBlind = () => {
      setPhase('PLAYING');
      if (settings.timeMode === 'timer') setDisplayTime(settings.timeLimit); else setDisplayTime(0);
  };

  const handleInput = useCallback((val: number) => {
    if (!selectedCell || phase !== 'PLAYING') return;
    const { r, c } = selectedCell;

    // Nếu KHÔNG PHẢI BLIND MODE: Không cho sửa đề bài
    if (!settings.isBlindMode) {
        if (inputMode === 'number' && initialNum[r][c] !== 0) return;
        if (inputMode === 'color' && initialCol[r][c] !== 0) return;
    }

    if (inputMode === 'number') {
        setUserNum(prev => {
            const newBoard = [...prev];
            newBoard[r] = [...newBoard[r]];
            newBoard[r][c] = val;
            return newBoard;
        });
    } else {
        setUserCol(prev => {
            const newBoard = [...prev];
            newBoard[r] = [...newBoard[r]];
            newBoard[r][c] = val; // val ở đây là index màu (1-9)
            return newBoard;
        });
    }
  }, [selectedCell, phase, inputMode, initialNum, initialCol, settings.isBlindMode]);

  // --- KEYBOARD ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PLAYING' || !selectedCell) return;
      const maxIdx = config.total - 1;

      // Nav
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCell(prev => prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : null); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCell(prev => prev ? { r: Math.min(maxIdx, prev.r + 1), c: prev.c } : null); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedCell(prev => prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : null); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedCell(prev => prev ? { r: prev.r, c: Math.min(maxIdx, prev.c + 1) } : null); }
      
      // Mode Switch
      if (e.key === 'Tab') { e.preventDefault(); setInputMode(prev => prev === 'number' ? 'color' : 'number'); }

      // Input
      if (e.key >= '1' && e.key <= config.total.toString()) handleInput(parseInt(e.key));
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') handleInput(0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, config, handleInput]);

  // --- TIMER ---
  useEffect(() => {
    const runTimer = (countdown: boolean, onFinish?: () => void) => {
        timerRef.current = setInterval(() => {
            setDisplayTime(t => {
                if (countdown) {
                    if (t <= 1) {
                        clearInterval(timerRef.current!);
                        if (onFinish) onFinish();
                        return 0;
                    }
                    return t - 1;
                }
                return t + 1;
            });
        }, 1000);
    };

    if (phase === 'MEMORIZE') runTimer(true, startPlayingBlind); // Countdown memorize
    else if (phase === 'PLAYING') {
        if (settings.timeMode === 'timer') runTimer(true, () => setPhase('RESULT'));
        else runTimer(false);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, settings.timeMode]);

  const formatTime = (val: number) => {
      const m = Math.floor(val / 60);
      const s = val % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- UI HELPER ---
  const getGridClass = () => {
      if (settings.gridSize === '2x2') return 'grid-cols-4';
      if (settings.gridSize === '2x3') return 'grid-cols-6';
      return 'grid-cols-9';
  };

  const getCellBorder = (r: number, c: number) => {
    let classes = "border border-slate-700 ";
    const { rows, cols } = config; 
    // Vẽ viền Block đậm
    if ((c + 1) % cols === 0 && c !== config.total - 1) classes += "border-r-4 border-r-white ";
    if ((r + 1) % rows === 0 && r !== config.total - 1) classes += "border-b-4 border-b-white ";
    return classes;
  };

  // Lấy dữ liệu hiển thị cho ô (Dựa vào phase và blind mode)
  const getCellDisplay = (r: number, c: number) => {
      // Phase Memorize: Show Initial Data
      if (phase === 'MEMORIZE') {
          return { num: initialNum[r][c], col: initialCol[r][c] };
      }
      // Phase Playing/Result: Show User Data
      return { num: userNum[r][c], col: userCol[r][c] };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center fixed w-full z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <Link href="/sudoku-logic" className="inline-flex items-center text-slate-500 hover:text-cyan-400 transition-colors group">
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Menu
        </Link>
        {(phase === 'MEMORIZE' || phase === 'PLAYING') && (
            <div className="flex gap-4">
                {/* Mode Indicator */}
                {phase === 'PLAYING' && (
                    <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
                        <button onClick={() => setInputMode('number')} className={`px-4 py-1 rounded text-sm font-bold transition-all ${inputMode === 'number' ? 'bg-white text-black' : 'text-slate-500'}`}>123</button>
                        <button onClick={() => setInputMode('color')} className={`px-4 py-1 rounded text-sm font-bold transition-all ${inputMode === 'color' ? 'bg-gradient-to-r from-red-500 to-blue-500 text-white' : 'text-slate-500'}`}>Màu</button>
                    </div>
                )}
                {/* Timer */}
                <div className={`font-mono text-2xl font-bold px-6 py-2 rounded-xl border-2 shadow-lg backdrop-blur-md ${phase === 'MEMORIZE' ? 'border-yellow-500 text-yellow-400 bg-yellow-900/20' : 'border-cyan-500/50 text-cyan-400 bg-slate-900/80'}`}>
                    {phase === 'MEMORIZE' ? 'Ghi nhớ: ' : ''} {formatTime(displayTime)}
                </div>
            </div>
        )}
      </div>

      {/* --- SETUP PHASE --- */}
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
                  <span className="w-8 h-8 rounded bg-cyan-900/50 text-cyan-400 flex items-center justify-center mr-3 text-sm">01</span>
                  Giới thiệu
                </h2>
                <div className="prose prose-invert prose-lg text-slate-300">
                    <p>
                        <strong>Chromatic Sudoku</strong> (Sudoku Lưỡng Tính) là sự kết hợp giữa logic số học và logic màu sắc. Trên cùng một bàn cờ, bạn phải giải quyết đồng thời hai bài toán Sudoku chồng lên nhau.
                    </p>
                    <p>
                        Mỗi ô vừa chứa một <strong>Con Số</strong>, vừa mang một <strong>Màu Sắc</strong>. Quy luật Sudoku áp dụng độc lập cho cả hai lớp này.
                    </p>
                </div>
               </section>

               <section>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                     <h3 className="text-cyan-400 font-bold text-lg mb-2 uppercase">Quy tắc trò chơi</h3>
                     <ul className="list-disc list-inside space-y-2 text-slate-300">
                         <li><strong>Lớp Số:</strong> Điền số 1-N sao cho không trùng hàng, cột, vùng.</li>
                         <li><strong>Lớp Màu:</strong> Tô màu (tương ứng 1-N) sao cho không trùng hàng, cột, vùng.</li>
                         <li><strong>Độc lập:</strong> Một ô có thể là (Số 1, Màu Đỏ), ô khác có thể là (Số 2, Màu Đỏ). Số và Màu không bắt buộc đi cặp cố định với nhau.</li>
                     </ul>
                </div>
               </section>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                 <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Thiết lập</h3>
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cỡ bảng</label>
                            <select value={settings.gridSize} onChange={(e) => setSettings({...settings, gridSize: e.target.value as GridSize})} className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-cyan-500">
                                <option value="2x2">4x4 (2x2)</option>
                                <option value="2x3">6x6 (2x3)</option>
                                <option value="3x3">9x9 (3x3)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Độ khó</label>
                            <select value={settings.difficulty} onChange={(e) => setSettings({...settings, difficulty: e.target.value as Difficulty})} className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-cyan-500">
                                <option value="easy">Dễ</option>
                                <option value="medium">Vừa</option>
                                <option value="hard">Khó</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chế độ chơi</label>
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => setSettings({...settings, isBlindMode: false})} className={`flex-1 py-2 text-xs font-bold rounded border ${!settings.isBlindMode ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Tiêu chuẩn</button>
                            <button onClick={() => setSettings({...settings, isBlindMode: true})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.isBlindMode ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Giải Mù</button>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Thời gian</label>
                        <div className="flex gap-2 mb-3">
                            <button onClick={() => setSettings({...settings, timeMode: 'manual'})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.timeMode === 'manual' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Tự do</button>
                            <button onClick={() => setSettings({...settings, timeMode: 'timer'})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.timeMode === 'timer' ? 'bg-cyan-600 border-cyan-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Giới hạn</button>
                        </div>
                        {settings.timeMode === 'timer' && (
                            <input type="range" min="30" max="600" step="30" value={settings.timeLimit} onChange={(e) => setSettings({...settings, timeLimit: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                        )}
                        {settings.timeMode === 'timer' && <p className="text-right text-xs text-cyan-400">{settings.timeLimit} giây</p>}
                    </div>

                    <button onClick={startGame} className="w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                        BẮT ĐẦU
                    </button>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MEMORIZE PHASE (BLIND ONLY) --- */}
      {phase === 'MEMORIZE' && (
          <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in">
              <h2 className="text-2xl text-yellow-400 mb-2 font-bold uppercase tracking-widest animate-pulse">GHI NHỚ ĐỀ BÀI</h2>
              <p className="text-slate-400 mb-8 text-sm">Ghi nhớ cả vị trí Số và Màu sắc.</p>
              
              <div className={`grid ${getGridClass()} gap-0 bg-slate-800 border-4 border-slate-600 rounded shadow-2xl`}>
                  {initialNum.map((row, r) => row.map((cell, c) => {
                      const colVal = initialCol[r][c];
                      return (
                          <div 
                              key={`${r}-${c}`}
                              className={`w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-2xl font-black ${getCellBorder(r,c)}`}
                              style={{ backgroundColor: colVal !== 0 ? COLORS[colVal] : '#1e293b', color: colVal !== 0 ? 'white' : '#94a3b8' }}
                          >
                              {cell !== 0 ? cell : ''}
                          </div>
                      );
                  }))}
              </div>
              
              <button onClick={startPlayingBlind} className="mt-12 px-12 py-4 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded-full text-xl shadow-lg">
                  TÔI ĐÃ NHỚ, GIẢI THÔI!
              </button>
          </div>
      )}

      {/* --- PLAYING PHASE --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in px-2">
            <div className="mb-4 text-center">
                <p className="text-slate-400 text-sm">
                    {settings.isBlindMode ? "Điền lại đề bài và giải tiếp." : "Điền số và tô màu để hoàn thành."}
                </p>
                <div className="text-xs text-cyan-500 mt-1">Phím <span className="border border-cyan-800 px-1 rounded">Tab</span> để đổi chế độ Số/Màu</div>
            </div>

            {/* BOARD */}
            <div className={`grid ${getGridClass()} gap-0 bg-slate-900 border-4 border-slate-700 rounded-lg shadow-2xl mb-8 select-none relative`}>
                {/* Active Mode Border Overlay */}
                <div className={`absolute -inset-1 rounded-xl border-2 pointer-events-none transition-colors ${inputMode === 'number' ? 'border-white/50' : 'border-pink-500/50'}`} />

                {Array.from({length: config.total}).map((_, r) => Array.from({length: config.total}).map((_, c) => {
                    const data = getCellDisplay(r, c);
                    return (
                        <div 
                            key={`${r}-${c}`}
                            onClick={() => setSelectedCell({r, c})}
                            className={`
                                w-12 h-12 md:w-16 md:h-16 flex items-center justify-center text-xl md:text-3xl font-black cursor-pointer transition-all
                                ${getCellBorder(r, c)}
                                ${selectedCell?.r === r && selectedCell?.c === c ? 'ring-4 ring-cyan-400 z-20' : ''}
                            `}
                            style={{ 
                                backgroundColor: data.col !== 0 ? COLORS[data.col] : '#1e293b',
                                color: 'white',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                            }}
                        >
                            {data.num !== 0 ? data.num : ''}
                        </div>
                    );
                }))}
            </div>

            {/* CONTROLS */}
            <div className="w-full max-w-3xl flex flex-col items-center gap-6">
                
                {/* Mode Switcher Buttons */}
                <div className="flex gap-4 w-full justify-center">
                    <button 
                        onClick={() => setInputMode('number')} 
                        className={`flex-1 max-w-[150px] py-3 rounded-xl font-bold border-b-4 transition-all active:scale-95 ${inputMode === 'number' ? 'bg-white text-slate-900 border-slate-300 translate-y-1 border-b-0 shadow-inner' : 'bg-slate-800 text-slate-400 border-slate-950 hover:bg-slate-700'}`}
                    >
                        NHẬP SỐ
                    </button>
                    <button 
                        onClick={() => setInputMode('color')} 
                        className={`flex-1 max-w-[150px] py-3 rounded-xl font-bold border-b-4 transition-all active:scale-95 ${inputMode === 'color' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-pink-700 translate-y-1 border-b-0 shadow-inner' : 'bg-slate-800 text-slate-400 border-slate-950 hover:bg-slate-700'}`}
                    >
                        TÔ MÀU
                    </button>
                </div>

                {/* Input Pad */}
                <div className="flex flex-wrap justify-center gap-2">
                    {inputMode === 'number' ? (
                        // NUMBER PAD
                        <>
                            {Array.from({ length: config.total }, (_, i) => i + 1).map((num) => (
                                <button key={num} onClick={() => handleInput(num)} className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-700 hover:bg-white hover:text-black font-black text-xl transition-all border-b-4 border-slate-900 active:border-b-0 active:translate-y-1">
                                    {num}
                                </button>
                            ))}
                            <button onClick={() => handleInput(0)} className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-red-900/50 text-red-400 hover:bg-red-600 hover:text-white font-bold text-xs border-b-4 border-red-950 active:border-b-0 active:translate-y-1">XÓA</button>
                        </>
                    ) : (
                        // COLOR PAD
                        <>
                            {Array.from({ length: config.total }, (_, i) => i + 1).map((colIdx) => (
                                <button key={colIdx} onClick={() => handleInput(colIdx)} className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-slate-600 hover:scale-110 transition-transform shadow-lg" style={{ backgroundColor: COLORS[colIdx] }} title={COLOR_NAMES[colIdx]} />
                            ))}
                            <button onClick={() => handleInput(0)} className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs text-slate-400 hover:bg-slate-700">Xóa</button>
                        </>
                    )}
                </div>

                <button onClick={() => setPhase('RESULT')} className="w-full max-w-md py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg hover:shadow-cyan-500/25 transition-all">
                    NỘP BÀI
                </button>
            </div>
        </div>
      )}

      {/* --- RESULT PHASE --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
             <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
                 {JSON.stringify(userNum) === JSON.stringify(solNum) && JSON.stringify(userCol) === JSON.stringify(solCol) ? (
                     <>
                        <h2 className="text-5xl font-black text-green-400 mb-2">HOÀN HẢO!</h2>
                        <p className="text-slate-300">Bạn đã chinh phục cả hai tầng logic.</p>
                     </>
                 ) : (
                     <>
                        <h2 className="text-5xl font-black text-red-500 mb-2">CHƯA CHÍNH XÁC</h2>
                        <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
                            <div className={`p-4 rounded bg-slate-800 ${JSON.stringify(userNum) === JSON.stringify(solNum) ? 'text-green-400 border border-green-500' : 'text-red-400 border border-red-500'}`}>
                                {JSON.stringify(userNum) === JSON.stringify(solNum) ? "✔ Lớp Số Đúng" : "✖ Lớp Số Sai"}
                            </div>
                            <div className={`p-4 rounded bg-slate-800 ${JSON.stringify(userCol) === JSON.stringify(solCol) ? 'text-green-400 border border-green-500' : 'text-red-400 border border-red-500'}`}>
                                {JSON.stringify(userCol) === JSON.stringify(solCol) ? "✔ Lớp Màu Đúng" : "✖ Lớp Màu Sai"}
                            </div>
                        </div>
                     </>
                 )}

                 <div className="mt-8 flex gap-4">
                    <button onClick={() => setPhase('SETUP')} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold">Cấu Hình</button>
                    <button onClick={startGame} className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold shadow-lg">Chơi Lại</button>
                 </div>
             </div>
        </div>
      )}

    </div>
  );
}