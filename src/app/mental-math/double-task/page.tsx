'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type GamePhase = 'SETUP' | 'PLAYING' | 'INPUT' | 'RESULT';
type TaskMode = 'visual-visual' | 'visual-audio';

interface GameSettings {
  mode: TaskMode;
  digits: number;
  count: number;
  totalTime: number;
}

export default function DoubleArithmeticGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'visual-visual',
    digits: 2,
    count: 5,
    totalTime: 10,
  });

  const [leftNumbers, setLeftNumbers] = useState<number[]>([]);
  const [rightNumbers, setRightNumbers] = useState<number[]>([]);

  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(0);
  const [isFlashVisible, setIsFlashVisible] = useState(true);

  const [leftResult, setLeftResult] = useState(0);
  const [rightResult, setRightResult] = useState(0);

  const [inputLeft, setInputLeft] = useState('');
  const [inputRight, setInputRight] = useState('');

  const [vnVoice, setVnVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<string>('Đang tải giọng...');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const foundVoice = voices.find((v) => v.lang.includes('vi')) || null;
      setVnVoice(foundVoice);
      if (foundVoice) {
        setVoiceStatus(`Đã kết nối: ${foundVoice.name}`);
      } else {
        setVoiceStatus('Không tìm thấy giọng Tiếng Việt (dùng giọng mặc định)');
      }
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speakNumber = useCallback(
    (num: number) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(num.toString());
      if (vnVoice) utterance.voice = vnVoice;
      utterance.lang = 'vi-VN';
      utterance.rate = 1.2;
      window.speechSynthesis.speak(utterance);
    },
    [vnVoice]
  );

  const generateNumbers = (count: number, digits: number) => {
    const arr: number[] = [];
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    for (let i = 0; i < count; i++) {
      arr.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return arr;
  };

  const startGame = () => {
    const leftData = generateNumbers(settings.count, settings.digits);
    const rightData = generateNumbers(settings.count, settings.digits);

    setLeftNumbers(leftData);
    setRightNumbers(rightData);
    setLeftResult(leftData.reduce((a, b) => a + b, 0));
    setRightResult(rightData.reduce((a, b) => a + b, 0));

    setLeftIndex(0);
    setRightIndex(0);
    setIsFlashVisible(true);
    setInputLeft('');
    setInputRight('');

    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return;
    }

    const intervalTime = (settings.totalTime * 1000) / settings.count;
    const gapTime = Math.min(120, Math.max(40, Math.floor(intervalTime * 0.15)));

    let gapTimer: NodeJS.Timeout | null = null;
    const scheduleGap = () => {
      setIsFlashVisible(true);
      gapTimer = setTimeout(() => setIsFlashVisible(false), Math.max(60, intervalTime - gapTime));
    };
    scheduleGap();

    timerRef.current = setInterval(() => {
      setLeftIndex((prev) => (prev >= settings.count ? prev : prev + 1));
      setRightIndex((prev) => (prev >= settings.count ? prev : prev + 1));
      scheduleGap();
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (gapTimer) clearTimeout(gapTimer);
    };
  }, [phase, settings.totalTime, settings.count]);

  useEffect(() => {
    if (phase === 'PLAYING' && settings.mode === 'visual-audio') {
      if (rightIndex < rightNumbers.length) {
        speakNumber(rightNumbers[rightIndex]);
      }
    }
  }, [rightIndex, phase, settings.mode, rightNumbers, speakNumber]);

  useEffect(() => {
    if (phase !== 'PLAYING') return;
    if (leftIndex >= settings.count && rightIndex >= settings.count) {
      const delayTime = settings.mode === 'visual-audio' ? 1200 : 400;
      const timeout = setTimeout(() => {
        setPhase('INPUT');
      }, delayTime);
      return () => clearTimeout(timeout);
    }
  }, [leftIndex, rightIndex, phase, settings.count, settings.mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhase('RESULT');
  };

  const currentLeft =
    phase === 'PLAYING' && isFlashVisible && leftIndex < leftNumbers.length
      ? leftNumbers[leftIndex]
      : null;
  const currentRight =
    phase === 'PLAYING' && isFlashVisible && rightIndex < rightNumbers.length
      ? rightNumbers[rightIndex]
      : null;

  const leftPct = Math.min(100, ((leftIndex + 1) / Math.max(1, settings.count)) * 100);
  const rightPct = Math.min(100, ((rightIndex + 1) / Math.max(1, settings.count)) * 100);

  const isLeftCorrect = inputLeft.trim() !== '' && parseInt(inputLeft, 10) === leftResult;
  const isRightCorrect = inputRight.trim() !== '' && parseInt(inputRight, 10) === rightResult;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-purple-500 selection:text-white">
      {/* HEADER */}
      <div className="p-6 fixed top-0 left-0 z-10 w-full flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent">
        <Link
          href="/mental-math"
          className="inline-flex items-center text-slate-500 hover:text-purple-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Menu
        </Link>
        {phase === 'PLAYING' && (
          <div className="text-slate-500 text-xs uppercase tracking-widest font-bold">
            Double Task • {settings.mode === 'visual-visual' ? 'Nhìn - Nhìn' : 'Nhìn - Nghe'}
          </div>
        )}
      </div>

      {/* --- PHASE 1: SETUP --- */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pt-24 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-2">
              TÍNH NHẨM SONG HÀNH
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">Double Arithmetic</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-purple-900/50 text-purple-400 flex items-center justify-center mr-3 text-sm">
                    01
                  </span>
                  Mô tả
                </h2>
                <div className="text-lg text-slate-300 leading-relaxed">
                  <p>
                    Luyện tập khả năng phân chia sự chú ý (Split-Attention). Não bộ phải xử lý hai luồng thông tin cộng số song song cùng lúc.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-purple-900/50 text-purple-400 flex items-center justify-center mr-3 text-sm">
                    02
                  </span>
                  Chế độ chơi
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-cyan-400 font-bold mb-2 text-lg">👀 - 👀 Nhìn &amp; Nhìn</div>
                    <p className="text-sm text-slate-400">
                      Hai cột số chạy song song ở hai nửa màn hình.
                    </p>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <div className="text-pink-400 font-bold mb-2 text-lg">👀 - 👂 Nhìn &amp; Nghe</div>
                    <p className="text-sm text-slate-400">
                      Mắt nhìn cột bên trái, tai nghe đọc số luồng bên phải.
                    </p>
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs font-mono text-emerald-400">
                      🔊 {voiceStatus}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                  Cấu Hình
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Chế độ
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => setSettings({ ...settings, mode: 'visual-visual' })}
                        className={`py-3 px-4 rounded-lg text-sm font-bold transition-all text-left flex items-center ${
                          settings.mode === 'visual-visual'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <span className="mr-3 text-xl">👀 - 👀</span> Nhìn - Nhìn
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, mode: 'visual-audio' })}
                        className={`py-3 px-4 rounded-lg text-sm font-bold transition-all text-left flex items-center ${
                          settings.mode === 'visual-audio'
                            ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        <span className="mr-3 text-xl">👀 - 👂</span> Nhìn - Nghe
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-800 pt-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Độ khó (Chữ số)
                        </label>
                        <span className="text-purple-400 text-sm font-bold">{settings.digits}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        value={settings.digits}
                        onChange={(e) =>
                          setSettings({ ...settings, digits: parseInt(e.target.value, 10) })
                        }
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Số lượng số
                        </label>
                        <span className="text-purple-400 text-sm font-bold">{settings.count}</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="20"
                        value={settings.count}
                        onChange={(e) =>
                          setSettings({ ...settings, count: parseInt(e.target.value, 10) })
                        }
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Tốc độ (Tổng giây)
                        </label>
                        <span className="text-purple-400 text-sm font-bold">
                          {settings.totalTime}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="60"
                        value={settings.totalTime}
                        onChange={(e) =>
                          setSettings({ ...settings, totalTime: parseInt(e.target.value, 10) })
                        }
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                      />
                      <p className="text-right text-xs text-slate-500 mt-1">
                        ~{(settings.totalTime / settings.count).toFixed(2)}s / số
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={startGame}
                    className="w-full py-4 mt-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    BẮT ĐẦU THỬ THÁCH
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- PHASE 2: PLAYING --- */}
      {phase === 'PLAYING' && (
        <div className="flex w-full h-screen">
          <div className="w-1/2 h-full bg-slate-900 border-r border-slate-800 flex flex-col items-center justify-center relative">
            <div className="absolute top-16 left-8 text-cyan-500 font-bold uppercase tracking-widest text-sm flex items-center">
              <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse mr-2" /> Visual (Trái)
            </div>

            {currentLeft !== null ? (
              <div
                key={leftIndex}
                className="text-8xl md:text-9xl font-mono font-bold text-white animate-pop-in"
              >
                {currentLeft}
              </div>
            ) : (
              <div className="text-8xl md:text-9xl opacity-0">0</div>
            )}

            <div
              className="absolute bottom-0 left-0 h-2 bg-cyan-600 transition-all ease-linear duration-100"
              style={{ width: `${leftPct}%` }}
            />
          </div>

          <div className="w-1/2 h-full bg-slate-950 flex flex-col items-center justify-center relative">
            <div className="absolute top-16 right-8 text-pink-500 font-bold uppercase tracking-widest text-sm flex items-center">
              {settings.mode === 'visual-visual' ? 'Visual (Phải)' : 'Audio (Phải)'}{' '}
              <span className="w-2 h-2 bg-pink-500 rounded-full animate-pulse ml-2" />
            </div>

            {settings.mode === 'visual-visual' ? (
              currentRight !== null ? (
                <div
                  key={rightIndex}
                  className="text-8xl md:text-9xl font-mono font-bold text-white animate-pop-in"
                >
                  {currentRight}
                </div>
              ) : (
                <div className="text-8xl md:text-9xl opacity-0">0</div>
              )
            ) : rightIndex < rightNumbers.length ? (
              <div className="flex flex-col items-center justify-center">
                <div key={rightIndex} className="text-9xl text-pink-500 animate-bounce-short">
                  🔊
                </div>
                <p className="text-pink-500/60 mt-4 text-sm uppercase font-bold">Đang đọc...</p>
              </div>
            ) : (
              <div className="text-9xl opacity-10 grayscale">🔊</div>
            )}

            <div
              className="absolute bottom-0 left-0 h-2 bg-pink-600 transition-all ease-linear duration-100"
              style={{ width: `${rightPct}%` }}
            />
          </div>
        </div>
      )}

      {/* --- PHASE 3: INPUT --- */}
      {phase === 'INPUT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
          <h2 className="text-3xl font-bold text-white mb-8">Nhập kết quả song hành</h2>

          <form
            onSubmit={handleSubmit}
            className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 flex flex-col items-center">
              <div className="text-cyan-500 font-bold uppercase mb-4">Kết quả Bên Trái</div>
              <input
                type="number"
                autoFocus
                value={inputLeft}
                onChange={(e) => setInputLeft(e.target.value)}
                className="w-full bg-slate-800 text-center text-5xl font-bold text-white py-4 rounded-xl border-2 border-slate-700 focus:border-cyan-500 outline-none"
                placeholder="?"
              />
            </div>

            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 flex flex-col items-center">
              <div className="text-pink-500 font-bold uppercase mb-4">Kết quả Bên Phải</div>
              <input
                type="number"
                value={inputRight}
                onChange={(e) => setInputRight(e.target.value)}
                className="w-full bg-slate-800 text-center text-5xl font-bold text-white py-4 rounded-xl border-2 border-slate-700 focus:border-pink-500 outline-none"
                placeholder="?"
              />
            </div>

            <button
              type="submit"
              className="md:col-span-2 py-4 bg-gradient-to-r from-cyan-600 to-pink-600 rounded-xl font-bold text-white text-xl hover:scale-[1.01] transition-transform"
            >
              Kiểm Tra Kết Quả
            </button>
          </form>
        </div>
      )}

      {/* --- PHASE 4: RESULT --- */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in-up">
          <div className="w-full max-w-5xl">
            <h2 className="text-center text-4xl font-black text-white mb-12">TỔNG KẾT</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 w-full h-2 ${
                    isLeftCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <h3 className="text-cyan-500 font-bold uppercase tracking-widest mb-6">
                  Màn hình Trái
                </h3>

                <div className="flex justify-between items-end mb-4 border-b border-slate-800 pb-4">
                  <span className="text-slate-400">Bạn trả lời:</span>
                  <span
                    className={`text-4xl font-mono font-bold ${
                      isLeftCorrect ? 'text-green-400' : 'text-red-400 line-through'
                    }`}
                  >
                    {inputLeft || '(Trống)'}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-slate-400">Đáp án đúng:</span>
                  <span className="text-4xl font-mono font-bold text-white">{leftResult}</span>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 font-mono break-all">
                  {leftNumbers.join(' + ')}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden">
                <div
                  className={`absolute top-0 left-0 w-full h-2 ${
                    isRightCorrect ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <h3 className="text-pink-500 font-bold uppercase tracking-widest mb-6">
                  Màn hình Phải
                </h3>

                <div className="flex justify-between items-end mb-4 border-b border-slate-800 pb-4">
                  <span className="text-slate-400">Bạn trả lời:</span>
                  <span
                    className={`text-4xl font-mono font-bold ${
                      isRightCorrect ? 'text-green-400' : 'text-red-400 line-through'
                    }`}
                  >
                    {inputRight || '(Trống)'}
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-slate-400">Đáp án đúng:</span>
                  <span className="text-4xl font-mono font-bold text-white">{rightResult}</span>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-500 font-mono break-all">
                  {rightNumbers.join(' + ')}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-12 max-w-xl mx-auto">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                Cấu Hình Lại
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 transition-opacity"
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
