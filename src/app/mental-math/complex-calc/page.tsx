'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type CalcMode = 'multiply' | 'divide';
type TimerMode = 'stopwatch' | 'countdown';
type DivisionType = 'exact' | 'remainder';

interface GameSettings {
  mode: CalcMode;
  divType: DivisionType;
  digit1: number;
  digit2: number;
  timerMode: TimerMode;
  timeLimit: number;
}

const generateRandomBigInt = (digits: number): bigint => {
  if (digits < 1) return BigInt(0);
  let numStr = Math.floor(Math.random() * 9 + 1).toString();
  for (let i = 1; i < digits; i++) {
    numStr += Math.floor(Math.random() * 10).toString();
  }
  return BigInt(numStr);
};

const randomBigIntInRange = (min: bigint, max: bigint): bigint => {
  if (min >= max) return min;
  const range = max - min + BigInt(1);
  const len = range.toString().length;
  let rStr = '';
  for (let i = 0; i < len + 2; i++) {
    rStr += Math.floor(Math.random() * 10);
  }
  return min + (BigInt(rStr) % range);
};

const formatNumber = (num: bigint) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

export default function ComplexCalcGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');

  const [settings, setSettings] = useState<GameSettings>({
    mode: 'multiply',
    divType: 'exact',
    digit1: 3,
    digit2: 3,
    timerMode: 'stopwatch',
    timeLimit: 60,
  });

  const [numA, setNumA] = useState<bigint>(BigInt(0));
  const [numB, setNumB] = useState<bigint>(BigInt(0));
  const [expectedAnswer, setExpectedAnswer] = useState<bigint>(BigInt(0));
  const [userAnswer, setUserAnswer] = useState('');

  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleModeChange = (mode: CalcMode) => {
    setSettings((prev) => {
      if (mode === 'multiply') {
        return { ...prev, mode, digit1: Math.min(prev.digit1, 10) };
      }
      const nextDigit1 = Math.max(prev.digit1, prev.digit2);
      return { ...prev, mode, digit1: nextDigit1 };
    });
  };

  const prepareGame = () => {
    let a = BigInt(0);
    let b = BigInt(0);
    let ans = BigInt(0);

    if (settings.mode === 'multiply') {
      a = generateRandomBigInt(settings.digit1);
      b = generateRandomBigInt(settings.digit2);
      ans = a * b;
    } else {
      const safeDigit1 = Math.max(settings.digit1, settings.digit2);
      b = generateRandomBigInt(settings.digit2);
      const minA = BigInt(10) ** BigInt(safeDigit1 - 1);
      const maxA = BigInt(10) ** BigInt(safeDigit1) - BigInt(1);

      if (settings.divType === 'exact') {
        const minQ = (minA + b - BigInt(1)) / b;
        const maxQ = maxA / b;
        const quotient =
          minQ <= maxQ ? randomBigIntInRange(minQ, maxQ) : BigInt(Math.floor(Math.random() * 9) + 1);
        a = b * quotient;
        ans = quotient;
      } else {
        a = randomBigIntInRange(minA, maxA);
        if (a < b) {
          const temp = a;
          a = b;
          b = temp;
        }
        ans = a / b;
      }
    }

    setNumA(a);
    setNumB(b);
    setExpectedAnswer(ans);
    setUserAnswer('');
    setTimeElapsed(0);
    setPhase('PLAYING');
    setIsTimerRunning(true);
  };

  useEffect(() => {
    if (!isTimerRunning) return;

    startTimeRef.current = Date.now();
    timerIntervalRef.current = setInterval(() => {
      const currentElapsed = Date.now() - startTimeRef.current;
      if (settings.timerMode === 'countdown') {
        const limitMs = settings.timeLimit * 1000;
        if (currentElapsed >= limitMs) {
          setTimeElapsed(limitMs);
          if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
          setIsTimerRunning(false);
          setPhase('RESULT');
          return;
        }
      }
      setTimeElapsed(currentElapsed);
    }, 50);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning, settings.timerMode, settings.timeLimit]);

  const formatTimeDisplay = (ms: number) => {
    let displayMs = ms;
    if (settings.timerMode === 'countdown') {
      displayMs = Math.max(0, settings.timeLimit * 1000 - ms);
    }
    const seconds = Math.floor(displayMs / 1000);
    const milliseconds = Math.floor((displayMs % 1000) / 10);
    return `${seconds}.${milliseconds < 10 ? '0' : ''}${milliseconds}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTimerRunning(false);
    setPhase('RESULT');
  };

  const isAnswerCorrect = userAnswer.trim() !== '' && BigInt(userAnswer) === expectedAnswer;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'complex-calc',
    won: isAnswerCorrect,
    accuracy: isAnswerCorrect ? 100 : 0,
    scoreLabel: `${settings.mode === 'multiply' ? 'Nhân' : 'Chia'} ${settings.digit1}×${settings.digit2} (${formatTimeDisplay(timeElapsed)}s)`,
    durationSec: Math.max(1, Math.round(timeElapsed / 1000)),
  });

  const renderDivisionLayout = () => (
    <div className="flex flex-col items-center justify-center gap-6 select-none font-mono text-white animate-fade-in">
      <div className="w-full text-center">
        <div className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-wider break-all leading-tight">
          {formatNumber(numA)}
        </div>
      </div>
      <div className="text-emerald-500 text-4xl md:text-5xl">÷</div>
      <div className="w-full text-center">
        <div className="text-4xl md:text-6xl font-bold tracking-wider break-all text-slate-300">
          {formatNumber(numB)}
        </div>
      </div>
    </div>
  );

  const renderMultiplicationLayout = () => {
    const isLong = settings.digit1 + settings.digit2 > 15;
    return (
      <div
        className={`flex ${
          isLong ? 'flex-col gap-4' : 'flex-col md:flex-row gap-8'
        } items-center justify-center select-none font-mono text-white animate-fade-in`}
      >
        <div
          className={`${
            isLong ? 'text-4xl md:text-6xl' : 'text-5xl md:text-7xl'
          } font-bold tracking-wider break-all text-center`}
        >
          {formatNumber(numA)}
        </div>
        <div className="text-emerald-500 text-4xl md:text-6xl">×</div>
        <div
          className={`${
            isLong ? 'text-4xl md:text-6xl' : 'text-5xl md:text-7xl'
          } font-bold tracking-wider break-all text-center`}
        >
          {formatNumber(numB)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      {/* HEADER */}
      <div className="p-6">
        <Link
          href="/mental-math"
          className="inline-flex items-center text-slate-500 hover:text-emerald-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Menu
        </Link>
      </div>

      {/* --- SETUP PHASE --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600 mb-2">
              NHÂN CHIA ĐA CHỮ SỐ
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Big Number Calculation • Kỷ lục gia
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-10">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-emerald-900/50 text-emerald-400 flex items-center justify-center mr-3 text-sm">
                    01
                  </span>
                  Nguồn gốc &amp; Tầm quan trọng
                </h2>
                <div className="space-y-4 text-lg text-slate-300 leading-relaxed">
                  <p>
                    <strong className="text-white">Nhân Chia Đa Chữ Số</strong> (Multi-digit Multiplication &amp; Division) là &ldquo;vua&rdquo; của các thể loại tính toán trong các cuộc thi Siêu Trí Tuệ thế giới. Đây không chỉ là kiểm tra khả năng số học, mà còn là thử thách cực đại về{' '}
                    <strong className="text-white">Trí nhớ ngắn hạn (Working Memory)</strong>.
                  </p>
                  <p>
                    Để giải quyết một phép nhân 7 chữ số với 7 chữ số, não bộ cần lưu trữ hàng trăm biến số trung gian trong tích tắc. Chỉ một sai lệch nhỏ ở hàng đơn vị cũng khiến toàn bộ kết quả vô nghĩa.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-emerald-900/50 text-emerald-400 flex items-center justify-center mr-3 text-sm">
                    02
                  </span>
                  Luật thi đấu &amp; Cách chơi
                </h2>
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 space-y-6">
                  <div>
                    <h3 className="text-emerald-400 font-bold text-lg mb-2 uppercase tracking-wide">
                      1. Thể thức thi đấu
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                      <li>
                        <strong className="text-white">Chạy Điền Kinh (Speed Run):</strong> Thời gian bắt đầu từ 0. Bạn cần hoàn thành phép tính nhanh nhất có thể để xác lập kỷ lục cá nhân.
                      </li>
                      <li>
                        <strong className="text-white">Giới Hạn Thời Gian (Countdown):</strong> Bạn tự đặt ra &ldquo;cược&rdquo; cho chính mình (Ví dụ: 60 giây). Nếu hết giờ mà chưa ra kết quả →{' '}
                        <span className="text-red-400 font-bold">GAME OVER</span>.
                      </li>
                    </ul>
                  </div>

                  <div className="border-t border-slate-700 pt-6">
                    <h3 className="text-emerald-400 font-bold text-lg mb-2 uppercase tracking-wide">
                      2. Quy định về số
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-slate-300 ml-2">
                      <li>
                        <strong>Phép Nhân:</strong> Tùy chọn độ khó từ{' '}
                        <span className="text-emerald-300">3×3</span> đến{' '}
                        <span className="text-emerald-300">10×10</span> chữ số.
                      </li>
                      <li>
                        <strong>Phép Chia:</strong> Số bị chia có thể lên tới{' '}
                        <span className="text-emerald-300 font-bold">18 chữ số</span>.
                        <ul className="pl-6 mt-2 space-y-1 text-sm text-slate-400">
                          <li>
                            - Chế độ <em>Exact (Chia hết)</em>: Kết quả luôn là số nguyên đẹp.
                          </li>
                          <li>
                            - Chế độ <em>Remainder (Có dư)</em>: Bạn chỉ cần nhập{' '}
                            <strong>phần nguyên</strong> của kết quả.
                          </li>
                        </ul>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-emerald-900/50 text-emerald-400 flex items-center justify-center mr-3 text-sm">
                    03
                  </span>
                  Chiến thuật của các Cao thủ
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800 p-5 rounded-lg border-l-4 border-emerald-500">
                    <h4 className="font-bold text-white mb-2">Nhân chéo (Cross-multiplication)</h4>
                    <p className="text-sm text-slate-400">
                      Không nhân theo hàng ngang như trường học. Hãy nhân chéo để ra kết quả từ trái sang phải hoặc phải sang trái mà không cần viết nháp.
                    </p>
                  </div>
                  <div className="bg-slate-800 p-5 rounded-lg border-l-4 border-emerald-500">
                    <h4 className="font-bold text-white mb-2">Phân tách nhóm (Chunking)</h4>
                    <p className="text-sm text-slate-400">
                      Với số 18 chữ số, hãy chia nó thành các cụm 3 số (như dấu phẩy ngăn cách: 123,456,789) để não bộ xử lý từng cụm một.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Cấu Hình Đề Bài
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Phép tính
                    </label>
                    <div className="flex bg-slate-800 p-1 rounded-lg">
                      <button
                        onClick={() => handleModeChange('multiply')}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                          settings.mode === 'multiply'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Nhân (×)
                      </button>
                      <button
                        onClick={() => handleModeChange('divide')}
                        className={`flex-1 py-2 rounded-md text-sm font-bold transition-all ${
                          settings.mode === 'divide'
                            ? 'bg-emerald-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Chia (÷)
                      </button>
                    </div>
                  </div>

                  {settings.mode === 'divide' && (
                    <div className="animate-fade-in">
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                        Loại phép chia
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSettings({ ...settings, divType: 'exact' })}
                          className={`py-2 px-3 border rounded text-xs font-semibold ${
                            settings.divType === 'exact'
                              ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          Chia hết
                        </button>
                        <button
                          onClick={() => setSettings({ ...settings, divType: 'remainder' })}
                          className={`py-2 px-3 border rounded text-xs font-semibold ${
                            settings.divType === 'remainder'
                              ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          Có dư
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 border-t border-slate-800 pt-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          {settings.mode === 'multiply' ? 'Số thứ nhất' : 'Số bị chia (A)'}
                        </label>
                        <span className="text-emerald-400 text-sm font-bold">
                          {settings.digit1} chữ số
                        </span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max={settings.mode === 'multiply' ? '10' : '18'}
                        value={settings.digit1}
                        onChange={(e) => {
                          const nextD1 = parseInt(e.target.value, 10);
                          setSettings((prev) => ({
                            ...prev,
                            digit1: nextD1,
                            digit2:
                              prev.mode === 'divide' ? Math.min(prev.digit2, nextD1) : prev.digit2,
                          }));
                        }}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          {settings.mode === 'multiply' ? 'Số thứ hai' : 'Số chia (B)'}
                        </label>
                        <span className="text-emerald-400 text-sm font-bold">
                          {settings.digit2} chữ số
                        </span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max={settings.mode === 'divide' ? Math.min(10, settings.digit1) : 10}
                        value={settings.digit2}
                        onChange={(e) =>
                          setSettings({ ...settings, digit2: parseInt(e.target.value, 10) })
                        }
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-800 pt-4">
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Chế độ thời gian
                    </label>
                    <select
                      value={settings.timerMode}
                      onChange={(e) =>
                        setSettings({ ...settings, timerMode: e.target.value as TimerMode })
                      }
                      className="w-full bg-slate-800 text-white p-3 rounded-lg border border-slate-700 focus:border-emerald-500 outline-none"
                    >
                      <option value="stopwatch">⏱ Bấm giờ</option>
                      <option value="countdown">⏳ Countdown</option>
                    </select>
                    {settings.timerMode === 'countdown' && (
                      <div className="animate-fade-in">
                        <div className="flex justify-between mb-1">
                          <label className="text-xs text-slate-500">Giới hạn</label>
                          <span className="text-white text-sm font-bold">{settings.timeLimit}s</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="120"
                          step="5"
                          value={settings.timeLimit}
                          onChange={(e) =>
                            setSettings({ ...settings, timeLimit: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={prepareGame}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    BẮT ĐẦU TÍNH
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PLAYING PHASE --- */}
      {phase === 'PLAYING' && (
        <div className="flex flex-col items-center justify-center min-h-[90vh] p-4 relative">
          <div
            className={`fixed top-4 right-4 text-3xl font-mono font-bold px-6 py-3 rounded-full border-2 ${
              settings.timerMode === 'countdown' && timeElapsed > settings.timeLimit * 800
                ? 'bg-red-900/20 text-red-500 border-red-500 animate-pulse'
                : 'bg-slate-900 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {formatTimeDisplay(timeElapsed)}
          </div>

          <div className="w-full max-w-7xl px-2 mb-12">
            <div className="text-slate-500 text-sm uppercase tracking-widest mb-8 text-center">
              Đề bài
            </div>
            {settings.mode === 'divide' ? renderDivisionLayout() : renderMultiplicationLayout()}
          </div>

          <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto z-10">
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={userAnswer}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*$/.test(val)) setUserAnswer(val);
                }}
                className="w-full bg-slate-900 border-b-4 border-slate-700 focus:border-emerald-500 outline-none text-center text-4xl md:text-5xl font-bold py-4 text-white placeholder-slate-700 transition-colors"
                placeholder="Nhập kết quả..."
              />
              <div className="absolute right-0 top-0 h-full flex items-center pr-4">
                <span className="text-slate-600 text-sm font-mono hidden md:block">ENTER</span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-8 px-12 py-4 bg-slate-800 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all"
            >
              Xác Nhận Kết Quả
            </button>
          </form>
        </div>
      )}

      {/* --- RESULT PHASE --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in-up">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-8 md:p-12 shadow-2xl text-center relative overflow-hidden">
            {isAnswerCorrect ? (
              <>
                <div className="absolute top-0 left-0 w-full h-3 bg-green-500" />
                <h2 className="text-4xl md:text-6xl font-black text-green-400 mb-2">CHÍNH XÁC!</h2>
                <p className="text-slate-400 text-lg mb-8">Bạn là một thiên tài tính toán!</p>
              </>
            ) : (
              <>
                <div className="absolute top-0 left-0 w-full h-3 bg-red-500" />
                <h2 className="text-4xl md:text-6xl font-black text-red-500 mb-2">SAI RỒI!</h2>
                <p className="text-slate-400 text-lg mb-8">Đừng nản chí, hãy thử lại nhé.</p>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-left">
              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-500 uppercase font-bold block mb-1">
                  Thời gian
                </span>
                <span className="text-3xl font-mono font-bold text-white">
                  {formatTimeDisplay(timeElapsed)}s
                </span>
              </div>

              <div className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                <span className="text-xs text-slate-500 uppercase font-bold block mb-1">
                  Cấu hình
                </span>
                <span className="text-sm text-slate-300">
                  {settings.mode === 'multiply' ? 'Nhân' : 'Chia'} • {settings.digit1} chữ số ×{' '}
                  {settings.digit2} chữ số
                </span>
              </div>
            </div>

            <div className="mb-10 text-left bg-slate-950 p-6 rounded-xl border border-slate-800 overflow-x-auto">
              <div className="mb-4">
                <span className="block text-xs text-slate-500 uppercase mb-1">
                  Câu trả lời của bạn
                </span>
                <span
                  className={`text-2xl font-mono break-all ${
                    isAnswerCorrect ? 'text-green-400' : 'text-red-400 line-through'
                  }`}
                >
                  {userAnswer || '(Trống)'}
                </span>
              </div>
              <div>
                <span className="block text-xs text-emerald-500 uppercase mb-1">
                  Đáp án chính xác
                </span>
                <span className="text-2xl font-mono text-emerald-400 break-all">
                  {expectedAnswer.toString()}
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cấu Hình Lại
              </button>
              <button
                onClick={prepareGame}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg transition-colors"
              >
                Chơi Lại Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
