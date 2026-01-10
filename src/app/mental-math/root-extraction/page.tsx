'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// --- TYPES ---
type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type RootType = 'exact' | 'decimal'; // Căn đúng | Căn số thập phân
type TimerMode = 'stopwatch' | 'countdown';

interface GameSettings {
  rootType: RootType;
  degree: number;       // Bậc căn (n)
  digits: number;       // Số chữ số của đề bài (A)
  precision: number;    // Số chữ số sau dấu phẩy (0 = số nguyên)
  timerMode: TimerMode;
  timeLimit: number;    // Giây (Countdown)
}

// --- MATH UTILS (BIGINT COMPATIBLE) ---

const formatNumber = (num: bigint) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Hàm sinh số ngẫu nhiên BigInt (Không dùng literals n)
const randomBigIntInRange = (min: bigint, max: bigint) => {
  if (min > max) return min; 
  const range = max - min + BigInt(1);
  
  const rangeStr = range.toString();
  const len = rangeStr.length;
  
  let result = BigInt(0);
  for (let attempt = 0; attempt < 5; attempt++) {
      let rStr = "";
      for (let i = 0; i < len; i++) {
        rStr += Math.floor(Math.random() * 10);
      }
      const rVal = BigInt(rStr);
      if (rVal < range) {
          result = rVal;
          break;
      }
      if (attempt === 4) result = rVal % range; 
  }
  
  return min + result;
};

// Thuật toán Tìm Căn Bậc n (Binary Search) - Thay thế hết 1n, 2n bằng BigInt()
const bigIntNthRoot = (value: bigint, n: bigint): bigint => {
  if (value < BigInt(2)) return value;
  if (n === BigInt(1)) return value;
  
  let high = BigInt(1);
  while (high ** n <= value) {
    high *= BigInt(2);
  }
  let low = high / BigInt(2);

  while (low < high) {
    const mid = (low + high + BigInt(1)) / BigInt(2);
    if (mid ** n <= value) {
      low = mid;
    } else {
      high = mid - BigInt(1);
    }
  }
  return low;
};

export default function RootExtractionGame() {
  // --- STATE ---
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  
  const [settings, setSettings] = useState<GameSettings>({
    rootType: 'exact',
    degree: 2,
    digits: 6,
    precision: 2, 
    timerMode: 'stopwatch',
    timeLimit: 60,
  });

  // Game Data
  const [radicand, setRadicand] = useState<bigint>(BigInt(0)); 
  const [degreeDisplay, setDegreeDisplay] = useState(0);       
  const [expectedAnswerStr, setExpectedAnswerStr] = useState(''); 
  const [userAnswer, setUserAnswer] = useState('');

  // Timer
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- LOGIC GAME ENGINE ---
  const prepareGame = () => {
    const n = BigInt(settings.degree);
    const D = settings.digits;

    let A = BigInt(0);
    let correctStr = "";

    // 1. Tính khoảng giá trị (Range) A: [10^(D-1), 10^D - 1]
    let minA = BigInt(1); 
    if (D - 1 > 0) minA = BigInt(10) ** BigInt(D - 1);
    
    // eslint-disable-next-line prefer-const
    let maxA = (minA * BigInt(10)) - BigInt(1);

    if (settings.rootType === 'exact') {
        // --- CHẾ ĐỘ CĂN ĐÚNG ---
        let minX = bigIntNthRoot(minA, n);
        let maxX = bigIntNthRoot(maxA, n);

        if (minX ** n < minA) minX++;
        if (maxX ** n > maxA) maxX--;

        // Xử lý trường hợp không tồn tại (VD: Căn 100 của số 50 chữ số)
        if (minX > maxX) {
             const fallbackX = bigIntNthRoot(minA, n); 
             minX = fallbackX > BigInt(1) ? fallbackX - BigInt(1) : BigInt(1);
             maxX = fallbackX + BigInt(2); 
        }

        const x = randomBigIntInRange(minX, maxX);
        
        A = x ** n;
        correctStr = x.toString();

    } else {
        // --- CHẾ ĐỘ SỐ THẬP PHÂN ---
        A = randomBigIntInRange(minA, maxA);

        const p = settings.precision;
        
        if (p === 0) {
             const root = bigIntNthRoot(A, n);
             correctStr = root.toString();
        } else {
             const scaleFactor = BigInt(10) ** (n * BigInt(p));
             const scaledA = A * scaleFactor;
             const scaledRoot = bigIntNthRoot(scaledA, n);
             const rootStr = scaledRoot.toString();
             
             if (rootStr.length <= p) {
                 const padded = rootStr.padStart(p + 1, '0');
                 correctStr = "0." + padded.slice(-p); 
             } else {
                 const intPart = rootStr.slice(0, -p);
                 const decPart = rootStr.slice(-p);
                 correctStr = `${intPart}.${decPart}`;
             }
        }
    }

    setRadicand(A);
    setDegreeDisplay(settings.degree);
    setExpectedAnswerStr(correctStr);
    setUserAnswer('');
    
    setTimeElapsed(0);
    setPhase('PLAYING');
    setIsTimerRunning(true);
  };

  // --- TIMER LOGIC ---
  useEffect(() => {
    if (isTimerRunning) {
      startTimeRef.current = Date.now() - timeElapsed;
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const currentElapsed = now - startTimeRef.current;
        setTimeElapsed(currentElapsed);
        
        if (settings.timerMode === 'countdown') {
             const limitMs = settings.timeLimit * 1000;
             if (currentElapsed >= limitMs) {
                 setTimeElapsed(limitMs);
                 clearInterval(timerRef.current!);
                 setIsTimerRunning(false);
                 setPhase('RESULT');
            }
        }
      }, 50);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning]);

  const formatTime = (ms: number) => {
    let displayMs = ms;
    if (settings.timerMode === 'countdown') {
        displayMs = Math.max(0, (settings.timeLimit * 1000) - ms);
    }
    const s = Math.floor(displayMs / 1000);
    const m = Math.floor((displayMs % 1000) / 10);
    return `${s}.${m < 10 ? '0' : ''}${m}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTimerRunning(false);
    setPhase('RESULT');
  };

  const getSingleLineFontSize = (digits: number) => {
    if (digits > 40) return { fontSize: '1.5rem', letterSpacing: '1px' }; 
    if (digits > 30) return { fontSize: '2rem', letterSpacing: '2px' };
    if (digits > 20) return { fontSize: '2.8rem', letterSpacing: '3px' };
    if (digits > 15) return { fontSize: '3.5rem', letterSpacing: '4px' };
    return { fontSize: '4.5rem', letterSpacing: '6px' };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500 selection:text-white">
      
      {/* HEADER */}
      <div className="p-6 fixed w-full z-10 bg-gradient-to-b from-slate-950 to-transparent">
        <Link href="/mental-math" className="inline-flex items-center text-slate-500 hover:text-amber-400 transition-colors group">
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Menu
        </Link>
      </div>

      {/* --- PHASE 1: SETUP --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600 mb-2">
              KHAI CĂN BẬC CAO
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Root Extraction
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            
            {/* WIKI SECTION (ĐÃ CẬP NHẬT MỚI) */}
            <div className="lg:col-span-2 space-y-10">
               
               {/* 1. Giới thiệu & Lịch sử */}
               <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-amber-900/50 text-amber-400 flex items-center justify-center mr-3 text-sm">01</span>
                  Kỷ lục & Lịch sử
                </h2>
                <div className="prose prose-invert prose-lg text-slate-300 leading-relaxed">
                  <p>
                    <strong>Khai căn bậc cao</strong> là đỉnh cao của tính nhẩm siêu tốc. Không chỉ là toán học, nó là nghệ thuật ghi nhớ và ước lượng.
                  </p>
                  <p>
                     Kỷ lục thế giới nổi tiếng nhất thuộc về "Máy tính người" <strong>Shakuntala Devi</strong> (Ấn Độ). Năm 1977, bà đã khai căn bậc 23 của một số có 201 chữ số trong vòng 50 giây — đánh bại máy tính UNIVAC 1101 thời bấy giờ (mất 62 giây).
                  </p>
                </div>
               </section>

               {/* 2. Luật chơi chi tiết */}
               <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-amber-900/50 text-amber-400 flex items-center justify-center mr-3 text-sm">02</span>
                  Luật thi đấu
                </h2>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
                     <div>
                        <h3 className="text-amber-400 font-bold text-lg mb-2">🎯 Chế độ: Căn Đúng (Exact Root)</h3>
                        <p className="text-slate-300">
                            Hệ thống sẽ sinh ra một con số <strong className="text-white">A</strong> (ví dụ 50 chữ số) sao cho nó là lũy thừa hoàn hảo của một số nguyên <strong className="text-white">x</strong>. Nhiệm vụ của bạn là tìm ra <strong className="text-white">x</strong>.
                        </p>
                     </div>
                     <div>
                        <h3 className="text-amber-400 font-bold text-lg mb-2">📏 Chế độ: Căn Thập Phân (Decimal)</h3>
                        <p className="text-slate-300">
                            Số <strong className="text-white">A</strong> là ngẫu nhiên và không tròn trịa. Bạn phải tính ra kết quả chính xác tới <strong className="text-white">N chữ số sau dấu phẩy</strong> (do bạn chọn).
                        </p>
                     </div>
                </div>
               </section>

               {/* 3. Mẹo tính toán */}
               <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-amber-900/50 text-amber-400 flex items-center justify-center mr-3 text-sm">03</span>
                  Phương pháp giải mã
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-amber-500">
                         <h4 className="font-bold text-white mb-1">Quy tắc số đuôi</h4>
                         <p className="text-sm text-slate-400">Dựa vào chữ số cuối cùng của đề bài để suy ra chữ số cuối của kết quả. Ví dụ: Tận cùng là 1 thì kết quả thường tận cùng là 1, 3, 7 hoặc 9.</p>
                     </div>
                     <div className="bg-slate-800 p-4 rounded-lg border-l-4 border-amber-500">
                         <h4 className="font-bold text-white mb-1">Phân khoảng (Estimation)</h4>
                         <p className="text-sm text-slate-400">Dựa vào số lượng chữ số của đề bài (Logarithm) để ước lượng số lượng chữ số của kết quả và khoảng giá trị đầu.</p>
                     </div>
                </div>
               </section>
            </div>

            {/* FORM CONFIG */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                 <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Cấu Hình
                </h3>
                
                <div className="space-y-6">
                    {/* Mode */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Loại kết quả</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setSettings({...settings, rootType: 'exact'})} className={`py-2 px-3 rounded text-sm font-bold transition-all ${settings.rootType === 'exact' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>Căn đúng</button>
                            <button onClick={() => setSettings({...settings, rootType: 'decimal'})} className={`py-2 px-3 rounded text-sm font-bold transition-all ${settings.rootType === 'decimal' ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>Số thập phân</button>
                        </div>
                    </div>

                    {/* Precision Slider (Only for Decimal) */}
                    {settings.rootType === 'decimal' && (
                        <div className="animate-fade-in bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                             <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-amber-500 uppercase">Độ chính xác</label>
                                <span className="text-white text-xs font-bold">{settings.precision} số sau dấu phẩy</span>
                            </div>
                            <input type="range" min="0" max="10" step="1" value={settings.precision} onChange={(e) => setSettings({...settings, precision: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                    )}

                    {/* Params */}
                    <div className="space-y-5 border-t border-slate-800 pt-4">
                        <div>
                            <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-500 uppercase">Căn bậc (n)</label><span className="text-amber-400 text-sm font-bold">{settings.degree}</span></div>
                            <input type="range" min="2" max="100" value={settings.degree} onChange={(e) => setSettings({...settings, degree: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                        </div>
                        
                        <div>
                            <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-500 uppercase">Độ dài số (A)</label><span className="text-amber-400 text-sm font-bold">{settings.digits} chữ số</span></div>
                            <input type="range" min="3" max="50" value={settings.digits} onChange={(e) => setSettings({...settings, digits: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                        </div>

                        {/* Timer Settings */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chế độ thời gian</label>
                            <select value={settings.timerMode} onChange={(e) => setSettings({...settings, timerMode: e.target.value as TimerMode})} className="w-full bg-slate-800 text-white p-2 text-sm rounded-lg border border-slate-700 mb-2 outline-none">
                                <option value="stopwatch">⏱ Bấm giờ (Tính thời gian)</option>
                                <option value="countdown">⏳ Giới hạn thời gian (Countdown)</option>
                            </select>
                            
                            {settings.timerMode === 'countdown' && (
                                <div>
                                    <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-500">Giới hạn giây</label><span className="text-white text-xs font-bold">{settings.timeLimit}s</span></div>
                                    <input type="range" min="10" max="300" step="10" value={settings.timeLimit} onChange={(e) => setSettings({...settings, timeLimit: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"/>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={prepareGame} className="w-full py-4 mt-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                        TẠO THỬ THÁCH
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PHASE 2: PLAYING --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 relative overflow-hidden">
             
             {/* Timer */}
             <div className={`fixed top-4 right-4 text-3xl font-mono font-bold px-6 py-3 rounded-full border-2 ${settings.timerMode === 'countdown' && timeElapsed > settings.timeLimit * 800 ? 'bg-red-900/20 text-red-500 border-red-500 animate-pulse' : 'bg-slate-900 text-amber-400 border-amber-500/30'}`}>
                 {formatTime(timeElapsed)}
             </div>

             <div className="w-full px-4 mb-12">
                 <div className="text-slate-500 text-sm uppercase tracking-widest mb-12 text-center">Đề bài (Căn bậc {degreeDisplay})</div>
                 
                 {/* VISUAL SINGLE LINE */}
                 <div className="flex justify-center items-center w-full overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
                     <div className="inline-flex relative p-4 whitespace-nowrap">
                         {/* Bậc căn */}
                         <div className="absolute top-0 left-0 -mt-1 -ml-1 text-xl md:text-3xl text-amber-500 font-bold font-mono">
                             {degreeDisplay}
                         </div>
                         
                         <div className="flex items-stretch">
                             {/* Dấu căn SVG */}
                             <div className="mr-2 text-amber-500 flex items-center">
                                 <svg width="40" height="100%" viewBox="0 0 50 100" preserveAspectRatio="none" className="h-full w-10 md:w-16">
                                     <path d="M5,60 L20,90 L50,5" fill="none" stroke="currentColor" strokeWidth="4" vectorEffect="non-scaling-stroke"/>
                                 </svg>
                             </div>
                             
                             {/* Số A (Luôn 1 dòng) */}
                             <div className="border-t-4 border-amber-500 pt-2 px-4 md:px-8">
                                 <div 
                                    className="font-mono font-bold text-white tracking-widest leading-none"
                                    style={getSingleLineFontSize(radicand.toString().length)}
                                 >
                                     {formatNumber(radicand)}
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>

             <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto z-10 px-4">
                <div className="relative">
                    <input 
                        type="text" 
                        inputMode="decimal"
                        autoFocus
                        value={userAnswer}
                        onChange={(e) => {
                            // Chỉ cho nhập số và 1 dấu chấm
                            const val = e.target.value;
                            if (/^[\d.]*$/.test(val)) setUserAnswer(val);
                        }}
                        className="w-full bg-slate-900 border-b-4 border-slate-700 focus:border-amber-500 outline-none text-center text-4xl md:text-5xl font-bold py-4 text-white placeholder-slate-700 transition-colors"
                        placeholder={settings.rootType === 'exact' ? "Nhập số nguyên..." : `Nhập đến ${settings.precision} số thập phân...`}
                    />
                </div>
                
                <button type="submit" className="w-full mt-8 px-12 py-4 bg-slate-800 hover:bg-amber-600 text-white font-bold rounded-xl transition-all">
                    Xác Nhận Kết Quả
                </button>
             </form>
        </div>
      )}

      {/* --- PHASE 3: RESULT --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
            <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
                
                {userAnswer === expectedAnswerStr ? (
                    <>
                        <div className="absolute top-0 left-0 w-full h-3 bg-green-500" />
                        <h2 className="text-4xl md:text-6xl font-black text-green-400 mb-2">CHÍNH XÁC!</h2>
                        <p className="text-slate-400 text-lg mb-8">Bạn chính là một Siêu Trí Tuệ thực thụ!</p>
                    </>
                ) : (
                    <>
                        <div className="absolute top-0 left-0 w-full h-3 bg-red-500" />
                        <h2 className="text-4xl md:text-6xl font-black text-red-500 mb-2">SAI RỒI!</h2>
                    </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                         <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Thời gian</span>
                         <span className="text-3xl font-mono font-bold text-white">{formatTime(timeElapsed)}s</span>
                    </div>
                    <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                         <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Yêu cầu</span>
                         <span className="text-sm text-slate-300">
                             Căn bậc {settings.degree} • {settings.rootType === 'exact' ? 'Số nguyên' : `${settings.precision} số lẻ`}
                         </span>
                    </div>
                </div>

                <div className="mb-10 text-left bg-slate-950 p-6 rounded-xl border border-slate-800 overflow-x-auto">
                    <div className="mb-4">
                        <span className="block text-xs text-slate-500 uppercase mb-1">Câu trả lời của bạn</span>
                        <span className={`text-3xl font-mono font-bold whitespace-nowrap ${userAnswer === expectedAnswerStr ? 'text-green-400' : 'text-red-400 line-through'}`}>
                            {userAnswer || '(Trống)'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-xs text-amber-500 uppercase mb-1">Đáp án chính xác</span>
                        <span className="text-3xl font-mono font-bold text-amber-400 whitespace-nowrap">
                            {expectedAnswerStr}
                        </span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => setPhase('SETUP')} className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors">Cấu Hình Lại</button>
                    <button onClick={prepareGame} className="flex-1 py-4 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg transition-colors">Thử Lại Ngay</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}