'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Center } from '@react-three/drei';
import * as THREE from 'three';

// --- TYPES ---
type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';
type GridSize = '2x2' | '2x3' | '3x3' | '4x4'; 
type TimerMode = 'manual' | 'timer';

interface GameSettings {
  difficulty: Difficulty;
  gridSize: GridSize;
  timeMode: TimerMode;
  timeLimit: number;
}

// --- CORE SUDOKU LOGIC ---

const GRID_CONFIG = {
  '2x2': { total: 4, rows: 2, cols: 2, cellSize: 1.2 },
  '2x3': { total: 6, rows: 2, cols: 3, cellSize: 0.8 },
  '3x3': { total: 9, rows: 3, cols: 3, cellSize: 0.6 },
  '4x4': { total: 16, rows: 4, cols: 4, cellSize: 0.35 },
};

const isSafe = (board: number[][], row: number, col: number, num: number, config: any) => {
  const { total, rows, cols } = config;
  for (let x = 0; x < total; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }
  const startRow = row - (row % rows);
  const startCol = col - (col % cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
};

const fillBoard = (board: number[][], config: any): boolean => {
  const { total } = config;
  for (let row = 0; row < total; row++) {
    for (let col = 0; col < total; col++) {
      if (board[row][col] === 0) {
        const nums = Array.from({ length: total }, (_, i) => i + 1);
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

const countSolutions = (board: number[][], config: any, count = { val: 0 }, limit = 2): void => {
  if (count.val >= limit) return;
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

const generateUniquePuzzle = (size: GridSize, difficulty: Difficulty) => {
  const config = GRID_CONFIG[size];
  const { total } = config;

  const board = Array.from({ length: total }, () => Array(total).fill(0));
  fillBoard(board, config);
  const solution = board.map(row => [...row]);

  let cluesCount = 0;
  const totalCells = total * total;
  
  if (difficulty === 'easy') cluesCount = Math.floor(totalCells * 0.60); 
  else if (difficulty === 'medium') cluesCount = Math.floor(totalCells * 0.40);
  else cluesCount = Math.floor(totalCells * 0.28);

  let attempts = totalCells - cluesCount;
  if (size === '4x4') attempts = difficulty === 'hard' ? 120 : (difficulty === 'medium' ? 80 : 40);

  const puzzle = board.map(row => [...row]);
  let positions = [];
  for(let r=0; r<total; r++) for(let c=0; c<total; c++) positions.push({r, c});
  positions.sort(() => Math.random() - 0.5);

  for (const pos of positions) {
      if (attempts <= 0) break;
      const { r, c } = pos;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0; 

      if (size !== '4x4') {
          const copyBoard = puzzle.map(row => [...row]);
          const countObj = { val: 0 };
          countSolutions(copyBoard, config, countObj);
          if (countObj.val !== 1) puzzle[r][c] = backup; 
          else attempts--; 
      } else {
          attempts--;
      }
  }
  return { puzzle, solution };
};

// --- 3D COMPONENTS ---
const GridLines = ({ config, size }: { config: any, size: number }) => {
  const { total, cellSize, rows, cols } = config; 
  const boardSize = total * cellSize;
  const offset = boardSize / 2;
  const lines = [];

  for (let i = 1; i < total / cols; i++) {
    const x = (i * cols * cellSize) - offset;
    lines.push(<mesh key={`v-${i}`} position={[x, 0, 0.02]}><boxGeometry args={[0.06, boardSize, 0.02]} /><meshBasicMaterial color="#c084fc" /></mesh>);
  }
  for (let i = 1; i < total / rows; i++) {
    const y = offset - (i * rows * cellSize);
    lines.push(<mesh key={`h-${i}`} position={[0, y, 0.02]}><boxGeometry args={[boardSize, 0.06, 0.02]} /><meshBasicMaterial color="#c084fc" /></mesh>);
  }
  return <group>{lines}</group>;
};

const Cell3D = ({ value, isInitial, isSelected, onClick, position, size, isReviewing }: any) => {
  const [hovered, setHover] = useState(false);
  
  // Màu chữ: 
  // - Nếu là số đề bài (isInitial): Màu xám
  // - Nếu là số người chơi điền (Normal play): Màu trắng
  // - Nếu đang xem đáp án (Reviewing): Màu xanh lá (để phân biệt với đề bài)
  const textColor = isInitial 
    ? "#94a3b8" 
    : (isReviewing ? "#4ade80" : "#ffffff");

  return (
    <group position={position}>
      <mesh 
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={() => setHover(true)}
        onPointerOut={() => setHover(false)}
      >
        <planeGeometry args={[size * 0.95, size * 0.95]} />
        <meshStandardMaterial color={isSelected ? "#a855f7" : (hovered ? "#334155" : "#1e293b")} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0,0,-0.005]}><planeGeometry args={[size, size]} /><meshBasicMaterial color="#0f172a" /></mesh>
      {value !== 0 && (
        <Text position={[0, 0, 0.05]} fontSize={size * 0.5} color={textColor} anchorX="center" anchorY="middle" fontWeight="bold">
          {value}
        </Text>
      )}
    </group>
  );
};

const SudokuFace = ({ faceId, data, initialData, position, rotation, config, selectedCell, onSelect, isReviewing }: any) => {
  const { total, cellSize } = config;
  const boardSize = total * cellSize;
  const offset = (boardSize / 2) - (cellSize / 2);

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.05]}><boxGeometry args={[boardSize + 0.1, boardSize + 0.1, 0.05]} /><meshStandardMaterial color="#020617" /></mesh>
      <GridLines config={config} size={boardSize} />
      {data.map((row: number[], r: number) => 
        row.map((num: number, c: number) => (
          <Cell3D
            key={`${r}-${c}`}
            value={num}
            isInitial={initialData[r][c] !== 0}
            isSelected={selectedCell?.face === faceId && selectedCell.r === r && selectedCell.c === c}
            onClick={() => onSelect(faceId, r, c)}
            size={cellSize}
            position={[(c * cellSize) - offset, offset - (r * cellSize), 0.01]}
            isReviewing={isReviewing}
          />
        ))
      )}
      <Text position={[-boardSize/2, boardSize/2 + 0.5, 0]} fontSize={0.5} color="cyan" anchorX="left">MẶT {faceId + 1}</Text>
    </group>
  );
};

export default function CubeSudokuGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    gridSize: '2x2', 
    timeMode: 'manual',
    timeLimit: 120,
  });

  const [cubeData, setCubeData] = useState<number[][][]>([]);
  const [initialCubeData, setInitialCubeData] = useState<number[][][]>([]);
  const [solutionCubeData, setSolutionCubeData] = useState<number[][][]>([]);
  
  const [selectedCell, setSelectedCell] = useState<{face: number, r: number, c: number} | null>(null);
  const [timer, setTimer] = useState(0);
  const [isCorrect, setIsCorrect] = useState(false);
  
  // State mới: Chế độ xem đáp án
  const [isReviewing, setIsReviewing] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [inputBuffer, setInputBuffer] = useState<string>("");
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentConfig = GRID_CONFIG[settings.gridSize];

  // --- GAME LOGIC ---
  const startGame = () => {
    setIsReviewing(false); // Reset review mode
    const newCubeData = [];
    const newInitialData = [];
    const newSolutionData = [];
    
    for(let i=0; i<6; i++) {
        const { puzzle, solution } = generateUniquePuzzle(settings.gridSize, settings.difficulty);
        newCubeData.push(puzzle.map(row => [...row]));
        newInitialData.push(puzzle.map(row => [...row]));
        newSolutionData.push(solution);
    }

    setCubeData(newCubeData);
    setInitialCubeData(newInitialData);
    setSolutionCubeData(newSolutionData);
    
    if (settings.timeMode === 'timer') setTimer(settings.timeLimit);
    else setTimer(0);

    setSelectedCell({ face: 0, r: 0, c: 0 });
    setPhase('PLAYING');
  };

  const handleInput = useCallback((num: number) => {
    // Không cho nhập khi đang xem đáp án
    if (phase !== 'PLAYING' || !selectedCell || isReviewing) return;
    const { face, r, c } = selectedCell;
    if (initialCubeData[face][r][c] !== 0) return;

    setCubeData(prev => {
        const newData = [...prev];
        newData[face][r][c] = num;
        return [...newData];
    });
  }, [phase, selectedCell, initialCubeData, isReviewing]);

  const checkResult = () => {
    const correct = JSON.stringify(cubeData) === JSON.stringify(solutionCubeData);
    setIsCorrect(correct);
    setPhase('RESULT');
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cho phép di chuyển trong chế độ Review
      if ((phase !== 'PLAYING' && !isReviewing) || !selectedCell) return;
      
      const { face, r, c } = selectedCell;
      const maxIdx = currentConfig.total - 1;

      // Navigation
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedCell({ face, r: Math.max(0, r - 1), c }); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedCell({ face, r: Math.min(maxIdx, r + 1), c }); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setSelectedCell({ face, r, c: Math.max(0, c - 1) }); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setSelectedCell({ face, r, c: Math.min(maxIdx, c + 1) }); }

      // Input Logic (Chỉ hoạt động khi Playing)
      if (phase === 'PLAYING') {
          if (e.key >= '0' && e.key <= '9') {
              const digit = parseInt(e.key);
              if (currentConfig.total > 9) {
                  setInputBuffer(prev => {
                      const newBuffer = prev + e.key;
                      const num = parseInt(newBuffer);
                      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
                      if (num > currentConfig.total) { handleInput(digit); return e.key; } 
                      else { 
                          handleInput(num); 
                          inputTimeoutRef.current = setTimeout(() => setInputBuffer(""), 500); 
                          return newBuffer; 
                      }
                  });
              } else {
                  if (digit > 0) handleInput(digit);
              }
          }
          if (e.key === 'Backspace' || e.key === 'Delete') { handleInput(0); setInputBuffer(""); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedCell, currentConfig, handleInput, isReviewing]);

  // Timer
  useEffect(() => {
    if (phase === 'PLAYING') {
        timerRef.current = setInterval(() => {
            if (settings.timeMode === 'timer') {
                setTimer(t => {
                    if (t <= 1) { clearInterval(timerRef.current!); setIsCorrect(false); setPhase('RESULT'); return 0; }
                    return t - 1;
                });
            } else { setTimer(t => t + 1); }
        }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, settings.timeMode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const boxSize = currentConfig?.total * currentConfig?.cellSize || 4;
  const dist = boxSize / 2 + 0.05;

  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans overflow-hidden relative selection:bg-fuchsia-500 selection:text-white">
      
      {/* HEADER & CONTROLS */}
      <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between pointer-events-none">
        <Link href="/sudoku-logic" className="pointer-events-auto inline-flex items-center text-slate-500 hover:text-fuchsia-400 transition-colors group">
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Menu
        </Link>
        {phase === 'PLAYING' && (
            <div className={`pointer-events-auto font-mono text-2xl font-bold px-6 py-2 rounded-xl border-2 backdrop-blur-md ${settings.timeMode === 'timer' && timer < 30 ? 'border-red-500 text-red-500 animate-pulse' : 'border-fuchsia-500/50 text-fuchsia-400 bg-slate-900/80'}`}>
                {settings.timeMode === 'timer' ? 'Còn lại: ' : 'Thời gian: '} {formatTime(timer)}
            </div>
        )}
        {/* Nút thoát chế độ xem đáp án */}
        {phase === 'RESULT' && isReviewing && (
            <button onClick={() => setIsReviewing(false)} className="pointer-events-auto px-6 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white font-bold hover:bg-slate-700">
                Quay lại Kết quả
            </button>
        )}
      </div>

      {/* PHASE 1: SETUP + WIKI */}
      {phase === 'SETUP' && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950/95 backdrop-blur-sm animate-fade-in px-4 py-20">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    <Link href="/sudoku-logic" className="inline-flex items-center text-slate-400 hover:text-fuchsia-400 mb-4 transition-colors">
                        <span className="mr-2 text-xl">←</span> Quay lại danh sách game
                    </Link>
                    <section>
                        <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-600 mb-6">CUBE SUDOKU (LẬP PHƯƠNG)</h2>
                        <div className="prose prose-invert prose-lg text-slate-300 space-y-4">
                            <p><strong>Cube Sudoku</strong> không chỉ là Sudoku. Nó là một bài kiểm tra kép: vừa thách thức khả năng logic số học, vừa đánh đố khả năng tri giác không gian của bạn.</p>
                        </div>
                    </section>
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                            <h3 className="text-fuchsia-400 font-bold text-lg mb-4 uppercase flex items-center"><span className="text-2xl mr-2">🎲</span> Quy tắc số học</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">Áp dụng luật Sudoku chuẩn cho từng mặt: Mỗi hàng, mỗi cột và mỗi vùng (được bao bởi viền tím) phải chứa đầy đủ các con số từ 1 đến N mà không được trùng lặp.</p>
                        </div>
                        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
                            <h3 className="text-fuchsia-400 font-bold text-lg mb-4 uppercase flex items-center"><span className="text-2xl mr-2">🎮</span> Điều khiển 3D</h3>
                            <ul className="text-slate-400 text-sm list-disc list-inside space-y-1">
                                <li><strong>Xoay khối:</strong> Giữ chuột trái và kéo ra vùng trống.</li>
                                <li><strong>Nhập liệu 4x4 (1-16):</strong> Có thể gõ nhanh 2 phím (ví dụ 1 rồi 6 để ra 16). Hoặc dùng bảng số bên dưới.</li>
                            </ul>
                        </div>
                    </section>
                </div>
                <div className="lg:col-span-1">
                    <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">Thiết lập Trò chơi</h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Kích thước Grid</label><select value={settings.gridSize} onChange={(e) => setSettings({...settings, gridSize: e.target.value as any})} className="w-full bg-slate-800 p-3 rounded-xl border border-slate-600 outline-none focus:border-fuchsia-500 text-white"><option value="2x2">2x2 (4x4 Grid)</option><option value="2x3">2x3 (6x6 Grid)</option><option value="3x3">3x3 (9x9 Grid)</option><option value="4x4">4x4 (16x16 Grid)</option></select></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Độ khó</label><select value={settings.difficulty} onChange={(e) => setSettings({...settings, difficulty: e.target.value as any})} className="w-full bg-slate-800 p-3 rounded-xl border border-slate-600 outline-none focus:border-fuchsia-500 text-white"><option value="easy">Dễ</option><option value="medium">Vừa</option><option value="hard">Khó</option></select></div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chế độ thời gian</label>
                                <div className="flex gap-2 mb-3"><button onClick={() => setSettings({...settings, timeMode: 'manual'})} className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${settings.timeMode === 'manual' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>Tự do</button><button onClick={() => setSettings({...settings, timeMode: 'timer'})} className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${settings.timeMode === 'timer' ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>Giới hạn</button></div>
                                {settings.timeMode === 'timer' && (<input type="range" min="60" max="600" step="30" value={settings.timeLimit} onChange={(e) => setSettings({...settings, timeLimit: parseInt(e.target.value)})} className="w-full accent-fuchsia-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"/>)}
                                {settings.timeMode === 'timer' && <p className="text-right text-xs text-fuchsia-400 mt-1">{settings.timeLimit} giây</p>}
                            </div>
                            <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] transition-transform text-white">KHỞI TẠO KHỐI 3D</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* PHASE 3: RESULT */}
      {phase === 'RESULT' && !isReviewing && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in">
              <div className="text-center bg-slate-900 p-12 rounded-3xl border border-slate-700 shadow-2xl max-w-xl">
                  {isCorrect ? (
                      <>
                        <div className="text-6xl mb-4">🏆</div>
                        <h2 className="text-6xl font-black text-green-400 mb-4">XUẤT SẮC!</h2>
                        <p className="text-xl text-slate-300 mb-8">Bạn đã giải mã thành công toàn bộ khối lập phương.</p>
                      </>
                  ) : (
                      <>
                        <div className="text-6xl mb-4">💀</div>
                        <h2 className="text-6xl font-black text-red-500 mb-4">THẤT BẠI</h2>
                        <p className="text-xl text-slate-300 mb-8">
                            {settings.timeMode === 'timer' && timer <= 0 ? 'Hết giờ rồi!' : 'Kết quả chưa chính xác. Hãy kiểm tra kỹ lại các mặt!'}
                        </p>
                      </>
                  )}
                  
                  <div className="flex flex-col gap-3">
                      <button onClick={() => setIsReviewing(true)} className="px-8 py-3 bg-yellow-600 rounded-xl font-bold text-white shadow-lg hover:bg-yellow-500 transition-colors uppercase tracking-wider">
                          Xem Đáp Án
                      </button>
                      <div className="flex gap-4 justify-center">
                          <button onClick={() => setPhase('SETUP')} className="flex-1 px-4 py-3 bg-slate-800 rounded-xl font-bold text-slate-300 hover:bg-slate-700 transition-colors">Cấu Hình</button>
                          <button onClick={startGame} className="flex-1 px-4 py-3 bg-fuchsia-600 rounded-xl font-bold text-white shadow-lg hover:bg-fuchsia-500 transition-colors">Chơi Lại</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- 3D SCENE (Render khi PLAYING hoặc khi REVIEWING) --- */}
      {(phase === 'PLAYING' || (phase === 'RESULT' && isReviewing)) && cubeData.length > 0 && (
        <>
            {/* PANEL NHẬP LIỆU (Chỉ hiện khi Playing) */}
            {phase === 'PLAYING' && (
                <div className="absolute top-1/2 right-6 -translate-y-1/2 z-10 flex flex-col gap-2 max-h-[80vh] overflow-y-auto pointer-events-auto bg-slate-900/80 p-2 rounded-xl backdrop-blur border border-slate-700">
                    <div className="text-xs text-center text-slate-400 font-bold mb-1">NUMPAD</div>
                    <div className="grid grid-cols-2 gap-1">
                        {Array.from({ length: currentConfig.total }, (_, i) => i + 1).map(num => (
                            <button
                                key={num}
                                onClick={() => handleInput(num)}
                                className="w-10 h-10 rounded bg-slate-800 hover:bg-fuchsia-600 text-white font-bold transition-colors border border-slate-700 text-sm"
                            >
                                {num}
                            </button>
                        ))}
                        <button onClick={() => handleInput(0)} className="col-span-2 w-full h-10 rounded bg-red-900/50 hover:bg-red-700 text-red-200 font-bold transition-colors border border-red-900 text-xs">
                            XÓA
                        </button>
                    </div>
                </div>
            )}

            {phase === 'PLAYING' && (
                <div className="absolute bottom-8 w-full text-center pointer-events-none z-10 flex flex-col items-center gap-4">
                    <p className="text-slate-300 text-sm bg-slate-900/80 inline-block px-6 py-2 rounded-full backdrop-blur border border-slate-700 shadow-lg">
                        🖱️ Kéo để xoay • ⌨️ Nhập số
                    </p>
                    <button 
                        onClick={checkResult}
                        className="pointer-events-auto px-12 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-black text-xl rounded-2xl shadow-xl hover:scale-105 transition-all animate-bounce-short"
                    >
                        NỘP BÀI
                    </button>
                </div>
            )}

            {/* MESSAGE REVIEW MODE */}
            {isReviewing && (
                <div className="absolute bottom-10 left-0 w-full text-center pointer-events-none z-10">
                    <div className="bg-yellow-900/80 text-yellow-200 inline-block px-6 py-2 rounded-full backdrop-blur border border-yellow-700 font-bold shadow-lg animate-pulse">
                        ĐANG XEM ĐÁP ÁN (SỐ XANH LÁ)
                    </div>
                </div>
            )}

            <Canvas camera={{ position: [0, 0, boxSize * 1.8], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <pointLight position={[20, 20, 20]} intensity={1} />
                <pointLight position={[-20, -20, -20]} intensity={0.5} />
                <Center>
                    <group>
                        {/* Truyền solutionCubeData nếu đang Reviewing */}
                        {[0,1,2,3,4,5].map(faceId => {
                            // Cấu hình vị trí và xoay cho từng mặt (Hardcoded for Cube)
                            const posConfig = [
                                {pos: [0, 0, dist], rot: [0, 0, 0]}, // Front
                                {pos: [0, 0, -dist], rot: [0, Math.PI, 0]}, // Back
                                {pos: [dist, 0, 0], rot: [0, Math.PI / 2, 0]}, // Right
                                {pos: [-dist, 0, 0], rot: [0, -Math.PI / 2, 0]}, // Left
                                {pos: [0, dist, 0], rot: [-Math.PI / 2, 0, 0]}, // Top
                                {pos: [0, -dist, 0], rot: [Math.PI / 2, 0, 0]} // Bottom
                            ];
                            const cfg = posConfig[faceId];
                            
                            return (
                                <SudokuFace 
                                    key={faceId}
                                    faceId={faceId} 
                                    // position & rotation phải ép kiểu để TS không báo lỗi (hoặc define type kỹ hơn)
                                    position={cfg.pos as [number, number, number]} 
                                    rotation={cfg.rot as [number, number, number]} 
                                    config={currentConfig} 
                                    // QUAN TRỌNG: Nếu review -> Lấy Solution Data
                                    data={isReviewing ? solutionCubeData[faceId] : cubeData[faceId]} 
                                    initialData={initialCubeData[faceId]} 
                                    selectedCell={selectedCell} 
                                    onSelect={(f:any,r:any,c:any) => setSelectedCell({face:f,r,c})}
                                    isReviewing={isReviewing}
                                />
                            );
                        })}
                    </group>
                </Center>
                <OrbitControls enablePan={false} minDistance={boxSize} maxDistance={boxSize * 3} rotateSpeed={0.6} dampingFactor={0.05} />
            </Canvas>
        </>
      )}
    </div>
  );
}