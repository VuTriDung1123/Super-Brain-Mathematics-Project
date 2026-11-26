'use client';

import { useState } from 'react';
import Link from 'next/link';
import { playClick, playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';
type FoldType = 'top-to-bottom' | 'bottom-to-top' | 'left-to-right' | 'right-to-left' | 'diag-main';

interface OrigamiQuestion {
  size: number;
  folds: FoldType[];
  initialPunch: [number, number];
  expectedHoles: Set<string>;
}

const FOLD_LABEL: Record<FoldType, string> = {
  'top-to-bottom': 'Gấp nửa TRÊN xuống DƯỚI ⬇',
  'bottom-to-top': 'Gấp nửa DƯỚI lên TRÊN ⬆',
  'left-to-right': 'Gấp nửa TRÁI sang PHẢI ➡',
  'right-to-left': 'Gấp nửa PHẢI sang TRÁI ⬅',
  'diag-main': 'Gấp chéo theo ĐƯỜNG CHÉO CHÍNH ↘',
};

function generateOrigamiQuestion(difficulty: Difficulty): OrigamiQuestion {
  const size = difficulty === 'hard' ? 6 : 4;
  const half = size / 2;

  const hFold: FoldType = Math.random() < 0.5 ? 'top-to-bottom' : 'bottom-to-top';
  const vFold: FoldType = Math.random() < 0.5 ? 'left-to-right' : 'right-to-left';

  const rMin = hFold === 'top-to-bottom' ? half : 0;
  const rMax = hFold === 'top-to-bottom' ? size - 1 : half - 1;
  const cMin = vFold === 'left-to-right' ? half : 0;
  const cMax = vFold === 'left-to-right' ? size - 1 : half - 1;

  const orderedFolds: FoldType[] =
    difficulty === 'easy' ? [hFold, vFold] : ['diag-main', hFold, vFold];

  let pr = Math.floor(Math.random() * (rMax - rMin + 1)) + rMin;
  const pc = Math.floor(Math.random() * (cMax - cMin + 1)) + cMin;
  if (difficulty !== 'easy' && pr === pc) {
    pr = pr === rMin ? rMax : rMin;
  }

  let holes: [number, number][] = [[pr, pc]];
  for (let i = orderedFolds.length - 1; i >= 0; i--) {
    const f = orderedFolds[i];
    const nextHoles: [number, number][] = [...holes];
    for (const [r, c] of holes) {
      if (f === 'top-to-bottom' || f === 'bottom-to-top') {
        nextHoles.push([size - 1 - r, c]);
      } else if (f === 'left-to-right' || f === 'right-to-left') {
        nextHoles.push([r, size - 1 - c]);
      } else if (f === 'diag-main') {
        nextHoles.push([c, r]);
      }
    }
    const seen = new Set<string>();
    holes = nextHoles.filter(([r, c]) => {
      const k = `${r},${c}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return {
    size,
    folds: orderedFolds,
    initialPunch: [pr, pc],
    expectedHoles: new Set(holes.map(([r, c]) => `${r},${c}`)),
  };
}

export default function OrigamiPunchGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [rounds, setRounds] = useState(5);

  const [questions, setQuestions] = useState<OrigamiQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedHoles, setSelectedHoles] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    const qs = Array.from({ length: rounds }, () => generateOrigamiQuestion(difficulty));
    setQuestions(qs);
    setCurrentIdx(0);
    setSelectedHoles(new Set());
    setSubmitted(null);
    setScore(0);
    setPhase('PLAYING');
  };

  const currentQ = questions[currentIdx];

  const toggleHole = (r: number, c: number) => {
    if (submitted !== null) return;
    const k = `${r},${c}`;
    playClick();
    setSelectedHoles((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!currentQ || submitted !== null) return;
    const isExact =
      selectedHoles.size === currentQ.expectedHoles.size &&
      Array.from(selectedHoles).every((k) => currentQ.expectedHoles.has(k));
    setSubmitted(isExact);
    if (isExact) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setSelectedHoles(new Set());
      setSubmitted(null);
    } else {
      setPhase('RESULT');
    }
  };

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'origami-punch',
    won: score >= Math.ceil(questions.length * 0.6),
    accuracy: Math.round((score / Math.max(1, questions.length)) * 100),
    scoreLabel: `${score}/${questions.length} tờ giấy (${difficulty})`,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-amber-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-amber-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-400 font-bold">
            Tờ {currentIdx + 1}/{questions.length} • Điểm: {score}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2">
              GẤP GIẤY ĐỤC LỖ (ORIGAMI)
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Origami Hole Punch • Phép đối xứng gương đa tầng
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-amber-400">Quy luật mở giấy ngược</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Một tờ giấy vuông được gấp liên tiếp theo thứ tự từng bước, sau đó bấm 1 lỗ tròn tại chấm vàng. Hãy suy luận bằng phép phản chiếu đối xứng ngược từng bước để <strong className="text-white">click chọn toàn bộ các lỗ sẽ xuất hiện</strong> khi mở phẳng tờ giấy ra!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Thiết Lập Độ Khó
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['easy', '2 Nếp Gấp'],
                    ['medium', '3 Nếp (Chéo)'],
                    ['hard', '6×6 Chéo'],
                  ] as [Difficulty, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setDifficulty(k)}
                    className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                      difficulty === k
                        ? 'bg-amber-600 border-amber-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Số câu hỏi</label>
                  <span className="text-amber-400 text-sm font-bold">{rounds} câu</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                BẮT ĐẦU GẤP GIẤY
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && currentQ && (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
          {/* Left: Fold Sequence + Punched Position */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-amber-400">
              Trình Tự Gấp Giấy ({currentQ.folds.length} bước)
            </h2>
            <ol className="space-y-2.5">
              {currentQ.folds.map((f, idx) => (
                <li
                  key={idx}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm flex items-center gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-amber-600/30 text-amber-300 font-mono font-bold text-xs flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 font-semibold">{FOLD_LABEL[f]}</span>
                </li>
              ))}
              <li className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-3 text-sm flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center">
                  ●
                </span>
                <span className="text-amber-200 font-bold">
                  Đục lỗ tại vị trí đánh dấu chấm vàng trên lưới bên phải!
                </span>
              </li>
            </ol>
            <p className="text-xs text-slate-400">
              💡 Mẹo: Hãy lật ngược lại từng bước từ bước {currentQ.folds.length} về bước 1. Chấm viền vàng là vị trí bấm lỗ ban đầu (chắc chắn luôn có lỗ!).
            </p>
          </div>

          {/* Right: Interactive Unfolded Paper Grid */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center gap-6">
            <div className="text-sm font-bold text-slate-300">
              Click chọn TẤT CẢ các lỗ trên tờ giấy sau khi mở phẳng (đã chọn: {selectedHoles.size}):
            </div>

            <div className="relative p-3 bg-slate-950 rounded-2xl border-2 border-slate-700">
              {/* Fold axis guidelines */}
              <div className="pointer-events-none absolute inset-3">
                <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-amber-500/40" />
                <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-amber-500/40" />
              </div>

              <div
                className="grid gap-1.5 relative z-10"
                style={{ gridTemplateColumns: `repeat(${currentQ.size}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: currentQ.size }).map((_, r) =>
                  Array.from({ length: currentQ.size }).map((__, c) => {
                    const k = `${r},${c}`;
                    const isInitPunch =
                      r === currentQ.initialPunch[0] && c === currentQ.initialPunch[1];
                    const isSel = selectedHoles.has(k);
                    const isExp = currentQ.expectedHoles.has(k);

                    let cellCls = 'bg-slate-900 border-slate-700 hover:border-amber-400';
                    if (submitted !== null) {
                      if (isExp && isSel) cellCls = 'bg-emerald-600/30 border-emerald-400';
                      else if (isExp && !isSel) cellCls = 'bg-amber-600/30 border-amber-400 animate-pulse';
                      else if (!isExp && isSel) cellCls = 'bg-red-600/30 border-red-400';
                    } else if (isSel) {
                      cellCls = 'bg-amber-500/20 border-amber-400';
                    }

                    const dim = currentQ.size === 6 ? 'w-11 h-11 sm:w-13 sm:h-13' : 'w-14 h-14 sm:w-16 sm:h-16';

                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggleHole(r, c)}
                        className={`${dim} rounded-xl border-2 flex items-center justify-center transition-all cursor-pointer relative ${cellCls} ${
                          isInitPunch ? 'ring-2 ring-amber-400' : ''
                        }`}
                      >
                        {(isSel || (submitted !== null && isExp)) && (
                          <span
                            className={`w-5 h-5 rounded-full ${
                              submitted !== null
                                ? isExp && isSel
                                  ? 'bg-emerald-400'
                                  : isExp
                                    ? 'bg-amber-400'
                                    : 'bg-red-400'
                                : 'bg-white'
                            }`}
                          />
                        )}
                        {isInitPunch && !isSel && submitted === null && (
                          <span className="w-3 h-3 rounded-full bg-amber-400/70 animate-ping" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {submitted === null ? (
              <button
                onClick={handleSubmit}
                disabled={selectedHoles.size === 0}
                className="w-full max-w-sm py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-xl font-black text-white shadow-lg"
              >
                MỞ GIẤY KIỂM TRA
              </button>
            ) : (
              <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950 border border-slate-700 rounded-2xl p-4">
                <div
                  className={`font-black text-lg ${
                    submitted ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {submitted
                    ? `✔ Chuẩn xác! Đủ ${currentQ.expectedHoles.size} lỗ đối xứng.`
                    : `✖ Sai lệch! Tờ giấy mở ra có đúng ${currentQ.expectedHoles.size} lỗ (chấm vàng là lỗ bạn bỏ sót).`}
                </div>
                <button
                  onClick={handleNext}
                  className="px-7 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white"
                >
                  {currentIdx + 1 < questions.length ? 'Tờ Kế Tiếp →' : 'Xem Kết Quả'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-amber-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">📄</div>
          <h2 className="text-4xl font-black text-white mb-2">HOÀN THÀNH ORIGAMI</h2>
          <p className="text-slate-300 mb-8">
            Chính xác{' '}
            <strong className="text-amber-400 font-mono text-2xl">
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
              className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-xl font-bold text-white"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
