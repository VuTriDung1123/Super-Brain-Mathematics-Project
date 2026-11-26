'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';

interface Trial {
  pos: number; // 0..8
  letter: string;
}

const LETTERS = ['C', 'H', 'K', 'L', 'Q', 'R', 'S', 'T'];

function generateDualNBackSequence(nLevel: number, totalSteps: number): Trial[] {
  const seq: Trial[] = [];
  for (let i = 0; i < totalSteps; i++) {
    let pos = Math.floor(Math.random() * 9);
    let letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    if (i >= nLevel) {
      if (Math.random() < 0.32) pos = seq[i - nLevel].pos;
      if (Math.random() < 0.32) letter = seq[i - nLevel].letter;
    }
    seq.push({ pos, letter });
  }
  return seq;
}

export default function DualNBackGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [nLevel, setNLevel] = useState(2);
  const [totalSteps, setTotalSteps] = useState(20);

  const [sequence, setSequence] = useState<Trial[]>([]);
  const [stepIdx, setStepIdx] = useState(0);
  const [isLit, setIsLit] = useState(true);

  const [posPressed, setPosPressed] = useState(false);
  const [audPressed, setAudPressed] = useState(false);

  const [posStats, setPosStats] = useState({ hits: 0, misses: 0, falseAlarms: 0 });
  const [audStats, setAudStats] = useState({ hits: 0, misses: 0, falseAlarms: 0 });

  const posPressedRef = useRef(false);
  const audPressedRef = useRef(false);
  const stepIdxRef = useRef(0);
  const seqRef = useRef<Trial[]>([]);

  const speakLetter = useCallback((letter: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(letter);
    u.lang = 'en-US';
    u.rate = 1.15;
    window.speechSynthesis.speak(u);
  }, []);

  const startGame = () => {
    const seq = generateDualNBackSequence(nLevel, totalSteps);
    seqRef.current = seq;
    stepIdxRef.current = 0;
    posPressedRef.current = false;
    audPressedRef.current = false;

    setSequence(seq);
    setStepIdx(0);
    setIsLit(true);
    setPosPressed(false);
    setAudPressed(false);
    setPosStats({ hits: 0, misses: 0, falseAlarms: 0 });
    setAudStats({ hits: 0, misses: 0, falseAlarms: 0 });
    setPhase('PLAYING');
    speakLetter(seq[0].letter);
  };

  // Main step progression loop
  useEffect(() => {
    if (phase !== 'PLAYING' || sequence.length === 0) return;

    const fadeTimer = setTimeout(() => setIsLit(false), 1200);

    const advanceTimer = setTimeout(() => {
      const i = stepIdxRef.current;
      const seq = seqRef.current;

      // Grade step i before advancing
      if (i >= nLevel) {
        const isPosMatch = seq[i].pos === seq[i - nLevel].pos;
        const isAudMatch = seq[i].letter === seq[i - nLevel].letter;

        if (isPosMatch && !posPressedRef.current) {
          setPosStats((s) => ({ ...s, misses: s.misses + 1 }));
        }
        if (isAudMatch && !audPressedRef.current) {
          setAudStats((s) => ({ ...s, misses: s.misses + 1 }));
        }
      }

      if (i + 1 >= seq.length) {
        setPhase('RESULT');
      } else {
        const nextIdx = i + 1;
        stepIdxRef.current = nextIdx;
        posPressedRef.current = false;
        audPressedRef.current = false;
        setStepIdx(nextIdx);
        setPosPressed(false);
        setAudPressed(false);
        setIsLit(true);
        speakLetter(seq[nextIdx].letter);
      }
    }, 2600);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(advanceTimer);
    };
  }, [phase, stepIdx, sequence.length, nLevel, speakLetter]);

  const handleTriggerPos = useCallback(() => {
    if (phase !== 'PLAYING' || posPressedRef.current || stepIdx < nLevel) return;
    posPressedRef.current = true;
    setPosPressed(true);
    const isMatch = sequence[stepIdx].pos === sequence[stepIdx - nLevel].pos;
    if (isMatch) {
      playSuccess();
      setPosStats((s) => ({ ...s, hits: s.hits + 1 }));
    } else {
      playError();
      setPosStats((s) => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
    }
  }, [phase, stepIdx, nLevel, sequence]);

  const handleTriggerAud = useCallback(() => {
    if (phase !== 'PLAYING' || audPressedRef.current || stepIdx < nLevel) return;
    audPressedRef.current = true;
    setAudPressed(true);
    const isMatch = sequence[stepIdx].letter === sequence[stepIdx - nLevel].letter;
    if (isMatch) {
      playSuccess();
      setAudStats((s) => ({ ...s, hits: s.hits + 1 }));
    } else {
      playError();
      setAudStats((s) => ({ ...s, falseAlarms: s.falseAlarms + 1 }));
    }
  }, [phase, stepIdx, nLevel, sequence]);

  // Keyboard A (Position) and L (Audio)
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'a' || e.key === 'A') handleTriggerPos();
      else if (e.key === 'l' || e.key === 'L') handleTriggerAud();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, handleTriggerPos, handleTriggerAud]);

  const totalHits = posStats.hits + audStats.hits;
  const totalErrors =
    posStats.misses + posStats.falseAlarms + audStats.misses + audStats.falseAlarms;
  const accuracy =
    totalHits + totalErrors > 0
      ? Math.round((totalHits / (totalHits + totalErrors)) * 100)
      : 100;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'dual-n-back',
    won: accuracy >= 75,
    accuracy,
    scoreLabel: `Dual ${nLevel}-Back (${accuracy}%)`,
    durationSec: Math.round(totalSteps * 2.6),
  });

  const currentTrial = sequence[stepIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-sky-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-sky-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-sky-500/40 text-sky-400 font-bold">
            Dual {nLevel}-Back • Lượt {stepIdx + 1}/{sequence.length}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-400 mb-2">
              DUAL N-BACK
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Working Memory Training • Bài tập khoa học tăng IQ lưu động
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-sky-400">Cách chơi Dual N-Back</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Ở mỗi nhịp (2.6 giây), một ô trên lưới 3×3 sáng lên đồng thời một chữ cái được hiển thị &amp; đọc thành tiếng. Nhiệm vụ của bạn là so sánh tín hiệu hiện tại với tín hiệu xuất hiện cách đây đúng <strong className="text-white">N lượt</strong>:
              </p>
              <ul className="list-disc list-inside text-slate-400 text-sm space-y-1.5">
                <li>
                  Bấm <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-sky-300 font-bold">A</kbd> nếu <strong className="text-white">VỊ TRÍ Ô SÁNG</strong> trùng với N lượt trước.
                </li>
                <li>
                  Bấm <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-pink-300 font-bold">L</kbd> nếu <strong className="text-white">CHỮ CÁI / ÂM THANH</strong> trùng với N lượt trước.
                </li>
                <li>Có thể trùng cả hai cùng lúc (bấm cả A và L)!</li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Cấp Độ N
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Cấp độ N-Back
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setNLevel(n);
                        playClick();
                      }}
                      className={`py-2.5 rounded-xl font-bold text-sm border cursor-pointer ${
                        nLevel === n
                          ? 'bg-sky-600 border-sky-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {n}-Back
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Số lượt chạy</label>
                  <span className="text-sky-400 text-sm font-bold">{totalSteps} lượt</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="35"
                  step="5"
                  value={totalSteps}
                  onChange={(e) => setTotalSteps(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-sky-500 to-cyan-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                BẮT ĐẦU DUAL {nLevel}-BACK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && currentTrial && (
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
            {stepIdx < nLevel
              ? `Ghi nhớ ${nLevel} tín hiệu đầu tiên...`
              : `So sánh với lượt #${stepIdx - nLevel + 1}`}
          </div>

          {/* 3x3 Visual Grid */}
          <div className="grid grid-cols-3 gap-2.5 bg-slate-900 p-4 rounded-3xl border-2 border-slate-800 shadow-2xl">
            {Array.from({ length: 9 }).map((_, idx) => {
              const active = isLit && currentTrial.pos === idx;
              return (
                <div
                  key={idx}
                  className={`w-22 h-22 sm:w-28 sm:h-28 rounded-2xl border-2 flex items-center justify-center transition-all duration-150 ${
                    active
                      ? 'bg-sky-500 border-sky-200 shadow-lg shadow-sky-500/40 scale-105'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {idx === 4 && !active && (
                    <span className="text-slate-700 text-2xl font-bold">+</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Spoken Letter Indicator */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-6 py-2.5 rounded-2xl">
            <span className="text-pink-400 text-xl">🔊</span>
            <span className="font-mono text-3xl font-black text-white tracking-widest">
              {isLit ? currentTrial.letter : '·'}
            </span>
          </div>

          {/* Dual Trigger Buttons */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <button
              onClick={handleTriggerPos}
              disabled={stepIdx < nLevel || posPressed}
              className={`py-5 rounded-2xl font-black text-lg border-2 transition-all cursor-pointer ${
                posPressed
                  ? 'bg-sky-600 border-sky-300 text-white'
                  : 'bg-slate-900 hover:bg-sky-950/60 border-sky-500/50 text-sky-300 disabled:opacity-35'
              }`}
            >
              📍 TRÙNG VỊ TRÍ <span className="text-xs font-mono block opacity-70">[Phím A]</span>
            </button>
            <button
              onClick={handleTriggerAud}
              disabled={stepIdx < nLevel || audPressed}
              className={`py-5 rounded-2xl font-black text-lg border-2 transition-all cursor-pointer ${
                audPressed
                  ? 'bg-pink-600 border-pink-300 text-white'
                  : 'bg-slate-900 hover:bg-pink-950/60 border-pink-500/50 text-pink-300 disabled:opacity-35'
              }`}
            >
              🔊 TRÙNG CHỮ CÁI <span className="text-xs font-mono block opacity-70">[Phím L]</span>
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-2xl mx-auto mt-8 bg-slate-900 border border-sky-500/60 rounded-3xl p-8 sm:p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-6xl mb-3">{accuracy >= 80 ? '🧠' : '⚡'}</div>
          <h2 className="text-4xl font-black text-white mb-1">
            HOÀN THÀNH DUAL {nLevel}-BACK
          </h2>
          <p className="text-sky-400 font-mono text-3xl font-black mb-6">{accuracy}% Chính Xác</p>

          <div className="grid grid-cols-2 gap-4 mb-8 text-left">
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="text-xs font-bold uppercase text-sky-400 mb-2">Luồng Vị Trí</div>
              <div className="text-xs font-mono space-y-1 text-slate-300">
                <div>✔ Bắt đúng: <strong className="text-emerald-400">{posStats.hits}</strong></div>
                <div>✖ Bỏ sót: <strong className="text-amber-400">{posStats.misses}</strong></div>
                <div>✖ Bấm nhầm: <strong className="text-red-400">{posStats.falseAlarms}</strong></div>
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
              <div className="text-xs font-bold uppercase text-pink-400 mb-2">Luồng Chữ Cái</div>
              <div className="text-xs font-mono space-y-1 text-slate-300">
                <div>✔ Bắt đúng: <strong className="text-emerald-400">{audStats.hits}</strong></div>
                <div>✖ Bỏ sót: <strong className="text-amber-400">{audStats.misses}</strong></div>
                <div>✖ Bấm nhầm: <strong className="text-red-400">{audStats.falseAlarms}</strong></div>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Cấp Độ
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-4 bg-gradient-to-r from-sky-500 to-cyan-600 rounded-xl font-bold text-white"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
