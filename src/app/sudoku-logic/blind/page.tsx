'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// --- TYPES ---
type GamePhase = 'SETUP' | 'MEMORIZE' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';
type GridSize = '2x2' | '2x3' | '3x3'; 
type TimeMode = 'manual' | 'timer'; // Chế độ thời gian

interface GameSettings {
  difficulty: Difficulty;
  gridSize: GridSize;
  
  // Cấu hình Ghi nhớ
  memoMode: TimeMode;
  memoTimeLimit: number; // Giây (nếu là timer)

  // Cấu hình Giải
  solveMode: TimeMode;
  solveTimeLimit: number; // Giây (nếu là timer)
}

// --- SUDOKU LOGIC ENGINE ---
const GRID_CONFIG = {
  '2x2': { total: 4, rows: 2, cols: 2 },
  '2x3': { total: 6, rows: 2, cols: 3 },
  '3x3': { total: 9, rows: 3, cols: 3 },
};

const isSafe = (board: number[][], row: number, col: number, num: number, config: any) => {
  const { total, rows, cols } = config;
  for (let x = 0; x < total; x++) if (board[row][x] === num) return false;
  for (let x = 0; x < total; x++) if (board[x][col] === num) return false;
  const startRow = row - (row % rows);
  const startCol = col - (col % cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
};

const solveSudoku = (board: number[][], config: any): boolean => {
  const { total } = config;
  for (let row = 0; row < total; row++) {
    for (let col = 0; col < total; col++) {
      if (board[row][col] === 0) {
        const nums = Array.from({ length: total }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
        for (const num of nums) {
          if (isSafe(board, row, col, num, config)) {
            board[row][col] = num;
            if (solveSudoku(board, config)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }
  return true;
};

const generatePuzzle = (size: GridSize, difficulty: Difficulty) => {
  const config = GRID_CONFIG[size];
  const { total } = config;
  const board = Array.from({ length: total }, () => Array(total).fill(0));
  solveSudoku(board, config);
  const solution = board.map(row => [...row]);

  let removeCount = 0;
  if (difficulty === 'easy') removeCount = Math.floor(total * total * 0.3);
  if (difficulty === 'medium') removeCount = Math.floor(total * total * 0.5);
  if (difficulty === 'hard') removeCount = Math.floor(total * total * 0.65);

  const puzzle = board.map(row => [...row]);
  let count = 0;
  while (count < removeCount) {
    const r = Math.floor(Math.random() * total);
    const c = Math.floor(Math.random() * total);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      count++;
    }
  }
  return { puzzle, solution };
};

export default function BlindSudokuGame() {
  // --- STATE ---
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    gridSize: '2x3',
    memoMode: 'manual', // Mặc định là bấm nút mới qua
    memoTimeLimit: 10,
    solveMode: 'manual', // Mặc định là đếm thời gian
    solveTimeLimit: 60,
  });

  const [puzzleBoard, setPuzzleBoard] = useState<number[][]>([]);
  const [solutionBoard, setSolutionBoard] = useState<number[][]>([]);
  const [userBoard, setUserBoard] = useState<number[][]>([]);
  
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  
  // Timer State
  const [displayTime, setDisplayTime] = useState(0); 
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOGIC ---

  const startGame = () => {
    const { puzzle, solution } = generatePuzzle(settings.gridSize, settings.difficulty);
    setPuzzleBoard(puzzle);
    setSolutionBoard(solution);
    
    const config = GRID_CONFIG[settings.gridSize];
    setUserBoard(Array.from({ length: config.total }, () => Array(config.total).fill(0)));
    
    // Set timer cho phase MEMORIZE
    if (settings.memoMode === 'timer') {
        setDisplayTime(settings.memoTimeLimit);
    } else {
        setDisplayTime(0);
    }

    // Mặc định chọn ô đầu tiên khi vào game (để dùng phím mũi tên ngay)
    // Nhưng ở phase MEMORIZE thì chưa cho chọn ô để tránh rối, chỉ set khi vào PLAYING
    setSelectedCell(null); 

    setPhase('MEMORIZE');
  };

  const startPlaying = () => {
    // Set timer cho phase PLAYING
    if (settings.solveMode === 'timer') {
        setDisplayTime(settings.solveTimeLimit);
    } else {
        setDisplayTime(0);
    }
    
    // Auto select ô đầu tiên để dùng phím
    setSelectedCell({ r: 0, c: 0 });
    setPhase('PLAYING');
  };

  const handleInput = useCallback((num: number) => {
    if (!selectedCell || phase !== 'PLAYING') return;
    const { r, c } = selectedCell;
    
    setUserBoard(prev => {
        const newBoard = [...prev];
        newBoard[r] = [...newBoard[r]];
        newBoard[r][c] = num;
        return newBoard;
    });
  }, [selectedCell, phase]);

  const checkResult = () => {
    setPhase('RESULT');
  };

  // --- KEYBOARD LISTENER ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PLAYING' || !selectedCell) return;

      const config = GRID_CONFIG[settings.gridSize];
      const maxIdx = config.total - 1;

      // 1. Navigation (Mũi tên)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCell(prev => prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : null);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCell(prev => prev ? { r: Math.min(maxIdx, prev.r + 1), c: prev.c } : null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedCell(prev => prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : null);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedCell(prev => prev ? { r: prev.r, c: Math.min(maxIdx, prev.c + 1) } : null);
      }
      
      // 2. Input (Số)
      if (e.key >= '1' && e.key <= config.total.toString()) {
        handleInput(parseInt(e.key));
      }

      // 3. Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        handleInput(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, settings.gridSize, handleInput]);


  // --- TIMER EFFECT ---
  useEffect(() => {
    if (phase === 'MEMORIZE') {
        if (settings.memoMode === 'timer') {
            // Countdown
            timerRef.current = setInterval(() => {
                setDisplayTime(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current!);
                        startPlaying(); // Hết giờ -> Chuyển phase
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        } else {
            // Count up (Optional: để user biết mình đã nhìn bao lâu)
            timerRef.current = setInterval(() => setDisplayTime(t => t + 1), 1000);
        }
    } else if (phase === 'PLAYING') {
        if (settings.solveMode === 'timer') {
            // Countdown
            timerRef.current = setInterval(() => {
                setDisplayTime(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current!);
                        setPhase('RESULT'); // Hết giờ -> Game Over
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        } else {
            // Count up (Stopwatch)
            timerRef.current = setInterval(() => setDisplayTime(t => t + 1), 1000);
        }
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, settings.memoMode, settings.solveMode]);

  // Format Timer
  const formatTimeDisplay = (val: number) => {
      const m = Math.floor(val / 60);
      const s = val % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // --- UI HELPERS ---
  const config = GRID_CONFIG[settings.gridSize];
  
  const getGridClass = () => {
    if (settings.gridSize === '2x2') return 'grid-cols-4';
    if (settings.gridSize === '2x3') return 'grid-cols-6';
    return 'grid-cols-9';
  };

  const getCellBorder = (r: number, c: number) => {
    let classes = "border border-slate-700 ";
    const { rows, cols } = config; 
    
    if ((c + 1) % cols === 0 && c !== config.total - 1) classes += "border-r-4 border-r-purple-600 ";
    if ((r + 1) % rows === 0 && r !== config.total - 1) classes += "border-b-4 border-b-purple-600 ";
    
    return classes;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500 selection:text-white">
      
      {/* HEADER */}
      <div className="p-6 flex justify-between items-center fixed w-full z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <Link href="/sudoku-logic" className="inline-flex items-center text-slate-500 hover:text-purple-400 transition-colors group">
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Menu
        </Link>
        {(phase === 'MEMORIZE' || phase === 'PLAYING') && (
            <div className={`font-mono text-2xl font-bold px-6 py-2 rounded-xl border-2 shadow-lg backdrop-blur-md ${
                (phase === 'MEMORIZE' && settings.memoMode === 'timer' && displayTime < 5) || 
                (phase === 'PLAYING' && settings.solveMode === 'timer' && displayTime < 10) 
                ? 'border-red-500 text-red-500 animate-pulse bg-red-900/20' 
                : 'border-purple-500/50 text-purple-400 bg-slate-900/80'
            }`}>
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
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Blind Sudoku
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* WIKI */}
            <div className="lg:col-span-2 space-y-8">
               <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-purple-900/50 text-purple-400 flex items-center justify-center mr-3 text-sm">01</span>
                  Luật chơi
                </h2>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                     <ul className="list-disc list-inside space-y-2 text-slate-300">
                         <li><strong>Ghi nhớ:</strong> Đề bài xuất hiện. Hãy ghi nhớ vị trí các con số.</li>
                         <li><strong>Giải mã:</strong> Đề bài biến mất (Trắng trơn). Bạn phải điền lại các số đã nhớ và giải các ô còn lại.</li>
                         <li><strong>Điều khiển:</strong> Dùng chuột hoặc <span className="text-purple-400 font-bold border border-purple-500 px-1 rounded text-xs">Phím Mũi Tên</span> để di chuyển. Nhập số bằng phím số.</li>
                     </ul>
                </div>
               </section>
            </div>

            {/* FORM CONFIG */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                 <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Thiết lập
                </h3>
                
                <div className="space-y-6">
                    {/* Size & Difficulty */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Cỡ bảng</label>
                            <select value={settings.gridSize} onChange={(e) => setSettings({...settings, gridSize: e.target.value as GridSize})} className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-purple-500">
                                <option value="2x2">4x4 (2x2)</option>
                                <option value="2x3">6x6 (2x3)</option>
                                <option value="3x3">9x9 (3x3)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Độ khó</label>
                            <select value={settings.difficulty} onChange={(e) => setSettings({...settings, difficulty: e.target.value as Difficulty})} className="w-full bg-slate-800 text-white p-2 rounded border border-slate-600 outline-none focus:border-purple-500">
                                <option value="easy">Dễ</option>
                                <option value="medium">Vừa</option>
                                <option value="hard">Khó</option>
                            </select>
                        </div>
                    </div>

                    {/* Memo Config */}
                    <div className="border-t border-slate-800 pt-4">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">1. Chế độ Ghi Nhớ</label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setSettings({...settings, memoMode: 'manual'})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.memoMode === 'manual' ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Tự do</button>
                            <button onClick={() => setSettings({...settings, memoMode: 'timer'})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.memoMode === 'timer' ? 'bg-purple-600 border-purple-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Giới hạn</button>
                        </div>
                        {settings.memoMode === 'timer' && (
                            <input type="range" min="5" max="60" value={settings.memoTimeLimit} onChange={(e) => setSettings({...settings, memoTimeLimit: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"/>
                        )}
                        {settings.memoMode === 'timer' && <p className="text-right text-xs text-purple-400">{settings.memoTimeLimit} giây</p>}
                    </div>

                    {/* Solve Config */}
                    <div className="border-t border-slate-800 pt-4">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">2. Chế độ Giải Mã</label>
                        <div className="flex gap-2 mb-2">
                            <button onClick={() => setSettings({...settings, solveMode: 'manual'})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.solveMode === 'manual' ? 'bg-pink-600 border-pink-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Không giới hạn</button>
                            <button onClick={() => setSettings({...settings, solveMode: 'timer'})} className={`flex-1 py-2 text-xs font-bold rounded border ${settings.solveMode === 'timer' ? 'bg-pink-600 border-pink-500' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>Đếm ngược</button>
                        </div>
                        {settings.solveMode === 'timer' && (
                            <input type="range" min="30" max="300" step="10" value={settings.solveTimeLimit} onChange={(e) => setSettings({...settings, solveTimeLimit: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"/>
                        )}
                        {settings.solveMode === 'timer' && <p className="text-right text-xs text-pink-400">{settings.solveTimeLimit} giây</p>}
                    </div>

                    <button onClick={startGame} className="w-full py-4 mt-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
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
            
            <div className={`grid ${getGridClass()} gap-0 bg-slate-800 border-4 border-slate-600 rounded shadow-2xl select-none`}>
                {puzzleBoard.map((row, rIndex) => (
                    row.map((cell, cIndex) => (
                        <div 
                            key={`${rIndex}-${cIndex}`}
                            className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-xl md:text-2xl font-bold ${getCellBorder(rIndex, cIndex)} ${cell !== 0 ? 'bg-slate-900 text-white' : 'bg-slate-800'}`}
                        >
                            {cell !== 0 ? cell : ''}
                        </div>
                    ))
                ))}
            </div>

            <button onClick={startPlaying} className="mt-12 px-12 py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full text-xl shadow-lg transition-transform hover:scale-105 active:scale-95">
                {settings.memoMode === 'timer' ? 'BỎ QUA & GIẢI NGAY' : 'TÔI ĐÃ NHỚ, BẮT ĐẦU GIẢI!'}
            </button>
        </div>
      )}

      {/* --- PHASE 3: PLAYING --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-screen pt-20 pb-10 animate-fade-in px-2">
            <div className="mb-4 text-center text-slate-400 text-sm">
                Sử dụng <span className="border border-slate-600 px-1 rounded text-white mx-1">Mũi tên</span> để di chuyển, <span className="border border-slate-600 px-1 rounded text-white mx-1">Số</span> để nhập.
            </div>

            {/* BOARD */}
            <div className={`grid ${getGridClass()} gap-0 bg-slate-800 border-4 border-slate-600 rounded shadow-2xl mb-8 select-none outline-none`}>
                {userBoard.map((row, rIndex) => (
                    row.map((cell, cIndex) => (
                        <div 
                            key={`${rIndex}-${cIndex}`}
                            onClick={() => setSelectedCell({r: rIndex, c: cIndex})}
                            className={`
                                w-10 h-10 md:w-14 md:h-14 flex items-center justify-center text-xl md:text-2xl font-bold cursor-pointer transition-all
                                ${getCellBorder(rIndex, cIndex)}
                                ${selectedCell?.r === rIndex && selectedCell?.c === cIndex 
                                    ? 'bg-purple-600 text-white ring-2 ring-purple-400 z-10' // Active Cell Highlighting
                                    : 'bg-slate-900 text-purple-200 hover:bg-slate-800'}
                            `}
                        >
                            {cell !== 0 ? cell : ''}
                        </div>
                    ))
                ))}
            </div>

            {/* IMPROVED NUMPAD UI */}
            {/* Thay grid bằng flex + justify-center để nút luôn ra giữa màn hình */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 px-4 w-full max-w-3xl">
                {Array.from({ length: config.total }, (_, i) => i + 1).map((num) => (
                    <button 
                        key={num}
                        onClick={() => handleInput(num)}
                        // Thêm w-14 h-14 cố định kích thước để không bị méo khi dùng flex
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

            <button onClick={checkResult} className="w-full max-w-md py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white text-lg shadow-lg hover:shadow-purple-500/25 transition-all">
                NỘP BÀI
            </button>
        </div>
      )}

      {/* --- PHASE 4: RESULT --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
             <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                 
                 {/* Check Correctness */}
                 {JSON.stringify(userBoard) === JSON.stringify(solutionBoard) ? (
                     <div className="text-center">
                        <div className="absolute top-0 left-0 w-full h-3 bg-green-500" />
                        <h2 className="text-5xl md:text-6xl font-black text-green-400 mb-4">XUẤT SẮC!</h2>
                        <p className="text-slate-300 text-lg">Bạn có trí nhớ và tư duy logic tuyệt vời.</p>
                     </div>
                 ) : (
                     <div className="text-center">
                        <div className="absolute top-0 left-0 w-full h-3 bg-red-500" />
                        <h2 className="text-5xl md:text-6xl font-black text-red-500 mb-4">SAI RỒI!</h2>
                        <p className="text-slate-300 text-lg mb-8">
                            {settings.solveMode === 'timer' && displayTime <= 0 ? 'Đã hết thời gian làm bài.' : 'Kết quả điền chưa chính xác.'}
                        </p>
                        
                        <div className="text-center text-sm text-slate-500 mb-4 uppercase font-bold">Đáp án đúng</div>
                        {/* Show Solution Mini Grid */}
                        <div className={`grid ${getGridClass()} gap-0 bg-slate-800 border-2 border-slate-600 rounded mx-auto w-fit opacity-90 pointer-events-none scale-75 md:scale-100`}>
                            {solutionBoard.map((row, rIndex) => (
                                row.map((cell, cIndex) => (
                                    <div key={`res-${rIndex}-${cIndex}`} className={`w-8 h-8 flex items-center justify-center text-sm font-bold border border-slate-700 ${puzzleBoard[rIndex][cIndex] !== 0 ? 'text-purple-400' : 'text-white'}`}>
                                        {cell}
                                    </div>
                                ))
                            ))}
                        </div>
                     </div>
                 )}

                 <div className="mt-10 flex gap-4">
                    <button onClick={() => setPhase('SETUP')} className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors">Cấu Hình Lại</button>
                    <button onClick={startGame} className="flex-1 py-4 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg transition-colors">Chơi Lại</button>
                 </div>
             </div>
        </div>
      )}

    </div>
  );
}