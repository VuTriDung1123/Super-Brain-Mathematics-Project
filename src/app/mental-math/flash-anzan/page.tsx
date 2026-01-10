'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- CẤU HÌNH LOGIC GAME ---
type GamePhase = 'SETUP' | 'PLAYING' | 'INPUT' | 'RESULT';

interface GameSettings {
  mode: 'add' | 'mixed'; 
  digits: number;        
  count: number;         
  totalTime: number;     
}

export default function FlashAnzanGame() {
  // State quản lý
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'add',
    digits: 1,      
    count: 10,
    totalTime: 10,
  });

  const [numbers, setNumbers] = useState<number[]>([]);
  // ĐÃ XÓA: const [currentDisplay, setCurrentDisplay] = useState... (Không cần thiết nữa)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  // --- LOGIC GAME ENGINE ---
  const generateNumbers = () => {
    const newNumbers: number[] = [];
    const min = Math.pow(10, settings.digits - 1);
    const max = Math.pow(10, settings.digits) - 1;

    for (let i = 0; i < settings.count; i++) {
      let num = Math.floor(Math.random() * (max - min + 1)) + min;
      if (settings.mode === 'mixed') {
        if (i > 0) {
          const isNegative = Math.random() < 0.5;
          if (isNegative) num = -num;
        }
      }
      newNumbers.push(num);
    }
    return newNumbers;
  };

  const startGame = () => {
    const nums = generateNumbers();
    const sum = nums.reduce((a, b) => a + b, 0);
    setNumbers(nums);
    setCorrectAnswer(sum);
    setCurrentIndex(0);
    setUserAnswer('');
    setPhase('PLAYING');
  };

  // --- LOGIC HIỂN THỊ SỐ (ĐÃ SỬA LỖI) ---
  useEffect(() => {
    if (phase !== 'PLAYING') return;

    // Tính thời gian hiển thị
    const intervalTime = (settings.totalTime * 1000) / settings.count;

    if (currentIndex < numbers.length) {
      // Chỉ đặt timer để tăng index, KHÔNG set state hiển thị ở đây nữa
      const timer = setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, intervalTime);

      return () => clearTimeout(timer);
    } else {
      // Khi đã chạy quá số lượng mảng -> Chuyển sang nhập kết quả
      setPhase('INPUT');
    }
  }, [phase, currentIndex, numbers.length, settings.totalTime, settings.count]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer) return;
    const userVal = parseInt(userAnswer);
    setIsCorrect(userVal === correctAnswer);
    setPhase('RESULT');
  };

  // Biến lấy giá trị số hiện tại trực tiếp từ mảng (Derived State)
  // Nếu đang chơi và index hợp lệ thì lấy số, ngược lại là null
  const currentNumberDisplay = (phase === 'PLAYING' && currentIndex < numbers.length) 
    ? numbers[currentIndex] 
    : null;

  // --- UI RENDER ---
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* HEADER */}
      <div className="p-6">
        <Link href="/mental-math" className="inline-flex items-center text-slate-500 hover:text-cyan-400 transition-colors group">
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span> 
          Quay lại Menu
        </Link>
      </div>

      {/* --- MÀN HÌNH 1: WIKI + SETUP --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
              FLASH ANZAN
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Tính nhẩm siêu tốc • Kỹ năng Soroban
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* CỘT TRÁI: WIKI INFO */}
            <div className="lg:col-span-2 space-y-10">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-cyan-900/50 text-cyan-400 flex items-center justify-center mr-3 text-sm">01</span>
                  Nguồn gốc & Khái niệm
                </h2>
                <div className="prose prose-invert prose-lg text-slate-300 leading-relaxed">
                  <p>
                    <strong>Flash Anzan</strong> là phương pháp rèn luyện não bộ, yêu cầu tính toán các con số xuất hiện liên tục mà không dùng công cụ hỗ trợ.
                  </p>
                </div>
              </section>
              
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-cyan-900/50 text-cyan-400 flex items-center justify-center mr-3 text-sm">02</span>
                  Luật chơi
                </h2>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
                   <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start"><span className="text-cyan-500 mr-2 mt-1">●</span> Cộng dồn các số xuất hiện.</li>
                    <li className="flex items-start"><span className="text-cyan-500 mr-2 mt-1">●</span> Số trắng là (+), Số đỏ là (-).</li>
                  </ul>
                </div>
              </section>
            </div>

            {/* CỘT PHẢI: FORM CẤU HÌNH */}
            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl shadow-cyan-900/10">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Thiết lập Thử thách
                </h3>
                <div className="space-y-5">
                   <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Chế độ chơi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setSettings({...settings, mode: 'add'})} className={`py-2 rounded text-sm font-semibold transition-all ${settings.mode === 'add' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Chỉ Cộng (+)</button>
                      <button onClick={() => setSettings({...settings, mode: 'mixed'})} className={`py-2 rounded text-sm font-semibold transition-all ${settings.mode === 'mixed' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400'}`}>Cộng & Trừ</button>
                    </div>
                   </div>

                   <div>
                      <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-500 uppercase">Độ khó (Chữ số)</label><span className="text-cyan-400 text-sm font-bold">{settings.digits}</span></div>
                      <input type="range" min="1" max="5" value={settings.digits} onChange={(e) => setSettings({...settings, digits: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                   </div>

                   <div>
                      <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-500 uppercase">Số lượng</label><span className="text-cyan-400 text-sm font-bold">{settings.count} số</span></div>
                      <input type="range" min="10" max="40" value={settings.count} onChange={(e) => setSettings({...settings, count: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                   </div>

                   <div>
                      <div className="flex justify-between mb-1"><label className="text-xs font-bold text-slate-500 uppercase">Tổng thời gian</label><span className="text-cyan-400 text-sm font-bold">{settings.totalTime}s</span></div>
                      <input type="range" min="2" max="100" value={settings.totalTime} onChange={(e) => setSettings({...settings, totalTime: parseInt(e.target.value)})} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"/>
                      <div className="text-right text-xs text-slate-500 mt-1">~{(settings.totalTime / settings.count).toFixed(2)}s / số</div>
                   </div>

                   <button onClick={startGame} className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white text-lg shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">BẮT ĐẦU NGAY</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH 2: PLAYING (HIỂN THỊ LIỀN MẠCH) --- */}
      {phase === 'PLAYING' && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center">
           <div className="text-sm text-slate-500 mb-8 uppercase tracking-widest">Đang tập trung...</div>
           
           {currentNumberDisplay !== null ? (
             <div 
               key={currentIndex} 
               className={`text-[150px] md:text-[220px] font-mono font-bold leading-none select-none ${
               currentNumberDisplay < 0 ? 'text-red-500' : 'text-white'
             }`}>
               {currentNumberDisplay}
             </div>
           ) : (
             <div className="text-[150px] md:text-[220px] opacity-0">0</div>
           )}

           {/* Thanh tiến trình */}
           <div className="absolute bottom-0 left-0 h-3 bg-cyan-600 transition-all ease-linear duration-100" 
                style={{ width: `${((currentIndex + 1) / settings.count) * 100}%` }} 
           />
        </div>
      )}

      {/* --- MÀN HÌNH 3: INPUT --- */}
      {phase === 'INPUT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-800 text-center shadow-2xl">
            <h2 className="text-2xl text-slate-300 mb-6">Thử thách hoàn tất!</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-8">
                <input type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} autoFocus className="w-full bg-slate-800 text-white text-5xl font-bold text-center py-6 rounded-xl border-2 border-slate-700 focus:border-cyan-500 focus:outline-none placeholder-slate-600 appearance-none" placeholder="..." />
              </div>
              <button type="submit" disabled={!userAnswer} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl font-bold text-lg transition-colors">XÁC NHẬN KẾT QUẢ</button>
            </form>
          </div>
        </div>
      )}

      {/* --- MÀN HÌNH 4: RESULT --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in-up px-4">
          <div className="w-full max-w-lg bg-slate-900 p-8 rounded-3xl border border-slate-700 text-center shadow-2xl relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${isCorrect ? 'from-green-500 to-emerald-500' : 'from-red-500 to-orange-500'}`} />
            <div className="mb-6 mt-2">{isCorrect ? <span className="text-8xl">🏆</span> : <span className="text-8xl">💥</span>}</div>
            <h2 className={`text-4xl md:text-5xl font-black mb-2 uppercase ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? 'Xuất Sắc!' : 'Tiếc quá!'}</h2>
            <p className="text-slate-400 mb-8">{isCorrect ? 'Bạn đã tính toán chính xác tuyệt đối.' : 'Kết quả tính toán chưa chính xác.'}</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800 p-5 rounded-2xl"><p className="text-slate-500 text-xs uppercase font-bold mb-1">Của bạn</p><p className={`text-3xl font-bold ${isCorrect ? 'text-white' : 'text-red-400 line-through'}`}>{userAnswer}</p></div>
              <div className="bg-slate-800 p-5 rounded-2xl border border-cyan-500/30 relative overflow-hidden"><div className="absolute top-0 right-0 p-1"><div className="w-2 h-2 bg-cyan-500 rounded-full animate-ping"></div></div><p className="text-cyan-500 text-xs uppercase font-bold mb-1">Đáp án đúng</p><p className="text-3xl font-bold text-cyan-400">{correctAnswer}</p></div>
            </div>
            <div className="flex gap-4">
               <button onClick={() => setPhase('SETUP')} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 transition-colors">Về Cấu Hình</button>
               <button onClick={startGame} className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-white transition-colors shadow-lg shadow-cyan-500/20">Chơi Lại</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}