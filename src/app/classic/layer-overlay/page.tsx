'use client';

import { useState } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type OverlayRule = 'xor' | 'or';
type Difficulty = 'easy' | 'medium' | 'hard';

interface OverlayQuestion {
  size: number;
  rule: OverlayRule;
  pickCount: number;
  cards: boolean[][][];
  solutionIndices: number[];
  targetGrid: boolean[][];
}

function combineCards(cards: boolean[][][], indices: number[], size: number, rule: OverlayRule): boolean[][] {
  const result = Array.from({ length: size }, () => Array(size).fill(false));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let count = 0;
      for (const idx of indices) {
        if (cards[idx][r][c]) count++;
      }
      result[r][c] = rule === 'xor' ? count % 2 === 1 : count > 0;
    }
  }
  return result;
}

const gridSig = (g: boolean[][]) => g.map((r) => r.map((v) => (v ? '1' : '0')).join('')).join('/');

function generateOverlayQuestion(rule: OverlayRule, difficulty: Difficulty): OverlayQuestion {
  const size = difficulty === 'easy' ? 4 : 5;
  const cardCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 9;
  const pickCount = difficulty === 'hard' ? 3 : 2;
  const fillProb = rule === 'xor' ? 0.45 : 0.28;

  const cards: boolean[][][] = [];
  const sigSet = new Set<string>();
  let guard = 0;
  while (cards.length < cardCount && guard < 200) {
    guard++;
    const g = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => Math.random() < fillProb)
    );
    const ones = g.flat().filter(Boolean).length;
    if (ones < 3 || ones > size * size - 3) continue;
    const sig = gridSig(g);
    if (!sigSet.has(sig)) {
      sigSet.add(sig);
      cards.push(g);
    }
  }

  const allIdx = Array.from({ length: cards.length }, (_, i) => i).sort(() => Math.random() - 0.5);
  const solutionIndices = allIdx.slice(0, pickCount).sort((a, b) => a - b);
  const targetGrid = combineCards(cards, solutionIndices, size, rule);

  return { size, rule, pickCount, cards, solutionIndices, targetGrid };
}

function MiniCardGrid({
  grid,
  colorClass = 'bg-cyan-400',
  large = false,
}: {
  grid: boolean[][];
  colorClass?: string;
  large?: boolean;
}) {
  const n = grid.length;
  return (
    <div
      className="grid gap-1 mx-auto w-fit"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {grid.map((row, r) =>
        row.map((on, c) => (
          <div
            key={`${r}-${c}`}
            className={`${large ? 'w-9 h-9 sm:w-11 sm:h-11' : 'w-5 h-5 sm:w-6 sm:h-6'} rounded-sm border ${
              on ? `${colorClass} border-white/40` : 'bg-slate-950 border-slate-800'
            }`}
          />
        ))
      )}
    </div>
  );
}

export default function LayerOverlayGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [rule, setRule] = useState<OverlayRule>('xor');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [rounds, setRounds] = useState(5);

  const [questions, setQuestions] = useState<OverlayQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    const qs = Array.from({ length: rounds }, () => generateOverlayQuestion(rule, difficulty));
    setQuestions(qs);
    setCurrentIdx(0);
    setSelected([]);
    setSubmitted(null);
    setScore(0);
    setPhase('PLAYING');
  };

  const currentQ = questions[currentIdx];

  const toggleCard = (idx: number) => {
    if (!currentQ || submitted !== null) return;
    playClick();
    setSelected((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      if (prev.length >= currentQ.pickCount) return prev;
      return [...prev, idx];
    });
  };

  const handleSubmit = () => {
    if (!currentQ || submitted !== null || selected.length !== currentQ.pickCount) return;
    const combined = combineCards(currentQ.cards, selected, currentQ.size, currentQ.rule);
    const isMatch = gridSig(combined) === gridSig(currentQ.targetGrid);
    setSubmitted(isMatch);
    if (isMatch) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelected([]);
      setSubmitted(null);
    } else {
      setPhase('RESULT');
    }
  };

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'layer-overlay',
    won: score >= Math.ceil(questions.length * 0.6),
    accuracy: Math.round((score / Math.max(1, questions.length)) * 100),
    scoreLabel: `${score}/${questions.length} (${rule.toUpperCase()} • ${difficulty})`,
  });

  const combinedPreview =
    currentQ && submitted !== null
      ? combineCards(currentQ.cards, selected, currentQ.size, currentQ.rule)
      : null;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-cyan-500">
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-cyan-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-cyan-500/40 text-cyan-400 font-bold">
            Vòng {currentIdx + 1}/{questions.length} • Điểm: {score}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
              TẦNG TẦNG ĐIỆP ẢNH
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Layer Overlay (OR / XOR) • Siêu Trí Tuệ Trung Quốc
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-cyan-400 mb-2">⚡ Luật Triệt Tiêu (XOR)</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Phiên bản kinh điển nhất của Siêu Trí Tuệ: khi chồng các thẻ lên nhau, hai ô sáng trùng vị trí sẽ <strong className="text-white">tự triệt tiêu thành tối</strong> (chỉ giữ lại ô sáng xuất hiện số lần lẻ).
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-blue-400 mb-2">➕ Luật Hợp Ảnh (OR)</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Khi chồng các thẻ trong suốt lên nhau, bất kỳ vị trí nào có ít nhất 1 thẻ sáng sẽ hiển thị sáng trên hình mục tiêu.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Điệp Ảnh
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Quy tắc chồng lớp
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRule('xor')}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      rule === 'xor'
                        ? 'bg-cyan-600 border-cyan-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ⚡ Triệt Tiêu (XOR)
                  </button>
                  <button
                    onClick={() => setRule('or')}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      rule === 'or'
                        ? 'bg-blue-600 border-blue-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    ➕ Hợp Ảnh (OR)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Độ khó
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['easy', 'Chọn 2/6'],
                      ['medium', 'Chọn 2/8'],
                      ['hard', 'Chọn 3/9'],
                    ] as [Difficulty, string][]
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setDifficulty(k)}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        difficulty === k
                          ? 'bg-cyan-600 border-cyan-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Số vòng</label>
                  <span className="text-cyan-400 text-sm font-bold">{rounds} vòng</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                BẮT ĐẦU CHỒNG ẢNH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && currentQ && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Target Card */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5">
            <div className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Hình Mục Tiêu ({currentQ.rule === 'xor' ? 'Luật XOR' : 'Luật OR'})
            </div>
            <div className="bg-slate-950 p-5 rounded-2xl border-2 border-cyan-500/40">
              <MiniCardGrid grid={currentQ.targetGrid} colorClass="bg-cyan-400" large />
            </div>
            <p className="text-xs text-slate-400">
              Hãy chọn đúng <strong className="text-white">{currentQ.pickCount} thẻ</strong> bên phải ({selected.length}/{currentQ.pickCount} đã chọn).
            </p>

            {combinedPreview && (
              <div className="pt-4 border-t border-slate-800 space-y-2 animate-fade-in">
                <div className="text-xs uppercase font-bold text-slate-400">
                  Kết quả chồng {currentQ.pickCount} thẻ bạn chọn:
                </div>
                <MiniCardGrid
                  grid={combinedPreview}
                  colorClass={submitted ? 'bg-emerald-400' : 'bg-red-400'}
                />
              </div>
            )}
          </div>

          {/* Candidate Cards */}
          <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {currentQ.cards.map((card, idx) => {
                const isSel = selected.includes(idx);
                const isSol = currentQ.solutionIndices.includes(idx);
                let style = 'border-slate-800 bg-slate-900 hover:border-cyan-500/60';
                if (submitted !== null) {
                  if (isSol) style = 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-400';
                  else if (isSel) style = 'border-red-500 bg-red-950/30';
                  else style = 'border-slate-800 opacity-45';
                } else if (isSel) {
                  style = 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400 scale-[1.02]';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleCard(idx)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-3 ${style}`}
                  >
                    <span className="text-xs font-mono font-bold text-slate-400">
                      THẺ #{idx + 1}
                    </span>
                    <MiniCardGrid grid={card} colorClass="bg-sky-400" />
                  </button>
                );
              })}
            </div>

            {submitted === null ? (
              <button
                onClick={handleSubmit}
                disabled={selected.length !== currentQ.pickCount}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-xl font-black text-white text-lg shadow-lg"
              >
                CHỒNG {currentQ.pickCount} THẺ &amp; KIỂM TRA
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div
                  className={`font-black text-lg ${
                    submitted ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {submitted
                    ? '✔ Trùng khớp 100% với hình mục tiêu!'
                    : `✖ Chưa khớp! Bộ đáp án chuẩn là Thẻ ${currentQ.solutionIndices.map((i) => `#${i + 1}`).join(' + ')}.`}
                </div>
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-white"
                >
                  {currentIdx + 1 < questions.length ? 'Vòng Tiếp Theo →' : 'Xem Kết Quả'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-cyan-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🧩</div>
          <h2 className="text-4xl font-black text-white mb-2">HOÀN THÀNH ĐIỆP ẢNH</h2>
          <p className="text-slate-300 mb-8">
            Chính xác{' '}
            <strong className="text-cyan-400 font-mono text-2xl">
              {score}/{questions.length}
            </strong>{' '}
            ({Math.round((score / Math.max(1, questions.length)) * 100)}%).
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Cấu Hình Lại
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-white"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
