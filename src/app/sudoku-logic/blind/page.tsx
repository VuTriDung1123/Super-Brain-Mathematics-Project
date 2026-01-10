'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

// --- TYPES ---
type GamePhase = 'SETUP' | 'MEMORIZE' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';
type GridSize = '2x2' | '2x3' | '3x3'; 
type TimeMode = 'manual' | 'timer'; 

interface GameSettings {
  difficulty: Difficulty;
  gridSize: GridSize;
  memoMode: TimeMode;
  memoTimeLimit: number;
  solveMode: TimeMode;
  solveTimeLimit: number; 
}

// --- CORE SUDOKU LOGIC (UNIQUE SOLUTION ENGINE) ---
const GRID_CONFIG = {
  '2x2': { total: 4, rows: 2, cols: 2 }, // 4x4
  '2x3': { total: 6, rows: 2, cols: 3 }, // 6x6
  '3x3': { total: 9, rows: 3, cols: 3 }, // 9x9
};

// 1. Kiểm tra hợp lệ
const isSafe = (board: number[][], row: number, col: number, num: number, config: any) => {
  const { total, rows, cols } = config;
  
  // Check Row & Col
  for (let x = 0; x < total; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }

  // Check Block
  const startRow = row - (row % rows);
  const startCol = col - (col % cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
};

// 2. Điền đầy bảng (Tạo Seed ngẫu nhiên)
const fillBoard = (board: number[][], config: any): boolean => {
  const { total } = config;
  for (let row = 0; row < total; row++) {
    for (let col = 0; col < total; col++) {
      if (board[row][col] === 0) {
        const nums = Array.from({ length: total }, (_, i) => i + 1);
        // Shuffle để tạo ngẫu nhiên
        for (let i = nums.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [nums[i], nums[j]] = [nums[j], nums[i]];
        }

        for (const num of nums) {
          if (isSafe(board, row, col, num, config)) {
            board[row][col] = num;
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

// 3. Đếm số nghiệm (Solver Check - Để đảm bảo Unique)
const countSolutions = (board: number[][], config: any, count = { val: 0 }, limit = 2): void => {
  if (count.val >= limit) return; // Tìm thấy quá 1 nghiệm thì dừng ngay

  const { total } = config;
  let row = -1; let col = -1; let isEmpty = false;

  for (let i = 0; i < total; i++) {
    for (let j = 0; j < total; j++) {
      if (board[i][j] === 0) { row = i; col = j; isEmpty = true; break; }
    }
    if (isEmpty) break;
  }

  if (!isEmpty) { count.val++; return; }

  for (let num = 1; num <= total; num++) {
    if (isSafe(board, row, col, num, config)) {
      board[row][col] = num;
      countSolutions(board, config, count, limit);
      if (count.val >= limit) return;
      board[row][col] = 0;
    }
  }
};

// 4. Sinh đề bài chuẩn (Digging Algorithm)
const generateUniquePuzzle = (size: GridSize, difficulty: Difficulty) => {
  const config = GRID_CONFIG[size];
  const { total } = config;

  // B1: Fill Board
  const board = Array.from({ length: total }, () => Array(total).fill(0));
  fillBoard(board, config);
  const solution = board.map(row => [...row]);

  // B2: Tính số lượng clues (Số ô giữ lại)
  // Cân bằng độ khó dựa trên % số ô còn lại
  const totalCells = total * total;
  let cluesCount = 0;

  if (difficulty === 'easy') cluesCount = Math.floor(totalCells * 0.60); // Giữ 60%
  else if (difficulty === 'medium') cluesCount = Math.floor(totalCells * 0.45); // Giữ 45%
  else cluesCount = Math.floor(totalCells * 0.30); // Giữ 30% (Khó)

  let attempts = totalCells - cluesCount; // Số ô cần xóa
  const puzzle = board.map(row => [...row]);

  // Tạo danh sách vị trí ngẫu nhiên để thử xóa
  let positions = [];
  for(let r=0; r<total; r++) for(let c=0; c<total; c++) positions.push({r, c});
  positions.sort(() => Math.random() - 0.5);

  for (const pos of positions) {
      if (attempts <= 0) break;
      
      const { r, c } = pos;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0; // Thử xóa

      // Kiểm tra xem sau khi xóa có còn duy nhất 1 nghiệm không
      const copyBoard = puzzle.map(row => [...row]);
      const countObj = { val: 0 };
      countSolutions(copyBoard, config, countObj);

      if (countObj.val !== 1) {
          puzzle[r][c] = backup; // Mất tính duy nhất -> Trả lại
      } else {
          attempts--; // Xóa thành công
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
    memoMode: 'manual',
    memoTimeLimit: 10,
    solveMode: 'manual',
    solveTimeLimit: 60,
  });

  const [puzzleBoard, setPuzzleBoard] = useState<number[][]>([]); // Đề bài (để nhớ)
  const [solutionBoard, setSolutionBoard] = useState<number[][]>([]); // Đáp án
  const [userBoard, setUserBoard] = useState<number[][]>([]); // Bảng người chơi (Trắng)
  
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);
  const [displayTime, setDisplayTime] = useState(0); 
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOGIC ---

  const startGame = () => {
    // Generate đề chuẩn Unique
    const { puzzle, solution } = generateUniquePuzzle(settings.gridSize, settings.difficulty);
    setPuzzleBoard(puzzle);
    setSolutionBoard(solution);
    
    // User board ban đầu là RỖNG (Blind Mode)
    const config = GRID_CONFIG[settings.gridSize];
    setUserBoard(Array.from({ length: config.total }, () => Array(config.total).fill(0)));
    
    if (settings.memoMode === 'timer') setDisplayTime(settings.memoTimeLimit);
    else setDisplayTime(0);

    setSelectedCell(null); 
    setPhase('MEMORIZE');
  };

  const startPlaying = () => {
    if (settings.solveMode === 'timer') setDisplayTime(settings.solveTimeLimit);
    else setDisplayTime(0);
    
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

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase !== 'PLAYING' || !selectedCell) return;
      const config = GRID_CONFIG[settings.gridSize];
      const maxIdx = config.total - 1;

      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCell(prev => prev ? { r: Math.max(0, prev.r - 1), c: prev.c } : null); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCell(prev => prev ? { r: Math.min(maxIdx, prev.r + 1), c: prev.c } : null); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedCell(prev => prev ? { r: prev.r, c: Math.max(0, prev.c - 1) } : null); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedCell(prev => prev ? { r: prev.r, c: Math.min(maxIdx, prev.c + 1) } : null); }
      
      if (e.key >= '1' && e.key <= config.total.toString()) handleInput(parseInt(e.key));
      if (e.key === 'Backspace' || e.key === 'Delete') handleInput(0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, settings.gridSize, handleInput]);

  // Timer
  useEffect(() => {
    const runTimer = (isCountdown: boolean, nextAction?: () => void) => {
        timerRef.current = setInterval(() => {
            setDisplayTime(t => {
                if (isCountdown) {
                    if (t <= 1) {
                        clearInterval(timerRef.current!);
                        if (nextAction) nextAction();
                        return 0;
                    }
                    return t - 1;
                }
                return t + 1;
            });
        }, 1000);
    };

    if (phase === 'MEMORIZE') {
        if (settings.memoMode === 'timer') runTimer(true, startPlaying);
        else runTimer(false);
    } else if (phase === 'PLAYING') {
        if (settings.solveMode === 'timer') runTimer(true, () => setPhase('RESULT'));
        else runTimer(false);
    } else {
        if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, settings.memoMode, settings.solveMode]);

  const formatTimeDisplay = (val: number) => {
      const m = Math.floor(val / 60);
      const s = val % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // UI Helpers
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
                  Giới thiệu & Thử thách
                </h2>
                <div className="prose prose-invert prose-lg text-slate-300">
                    <p>
                        <strong>Sudoku Mù</strong> là bài tập tối thượng cho trí nhớ ngắn hạn. Không giống Sudoku thường nơi bạn có thể nhìn lại đề bài bất cứ lúc nào, ở đây đề bài chỉ xuất hiện thoáng qua.
                    </p>
                    <p>
                        Bạn phải "chụp ảnh" toàn bộ các con số vào não bộ, sau đó tái hiện lại chúng trên một bảng trắng và giải hoàn thiện nó. Chỉ một con số nhớ sai, toàn bộ bài giải sẽ sụp đổ.
                    </p>
                </div>
               </section>

               <section>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                     <h3 className="text-purple-400 font-bold text-lg mb-2 uppercase">Quy tắc trò chơi</h3>
                     <ul className="list-disc list-inside space-y-2 text-slate-300">
                         <li><strong>Giai đoạn 1 (Ghi nhớ):</strong> Đề bài xuất hiện. Hãy ghi nhớ vị trí và giá trị các con số.</li>
                         <li><strong>Giai đoạn 2 (Giải mã):</strong> Đề bài biến mất hoàn toàn. Bảng trở về trắng trơn.</li>
                         <li><strong>Nhiệm vụ:</strong> Điền lại chính xác các số của đề bài VÀ tính toán điền tiếp các ô còn thiếu theo luật Sudoku (Không trùng hàng, cột, vùng).</li>
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