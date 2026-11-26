'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type ReflexMode = 'mixed' | 'truth' | 'compare' | 'stroop';

interface GameSettings {
  mode: ReflexMode;
  totalQuestions: number;
}

interface ReflexTrial {
  kind: Exclude<ReflexMode, 'mixed'>;
  prompt: string;
  mainDisplay: string;
  mainColor?: string;
  subDisplay?: string;
  options: { label: string; keyHint: string; value: string; colorHex?: string }[];
  correctValue: string;
}

interface TrialRecord {
  correct: boolean;
  ms: number;
}

const STROOP_PALETTE = [
  { name: 'ĐỎ', hex: '#ef4444' },
  { name: 'XANH LÁ', hex: '#22c55e' },
  { name: 'XANH DƯƠNG', hex: '#3b82f6' },
  { name: 'VÀNG', hex: '#eab308' },
];

function generateReflexTrial(mode: ReflexMode): ReflexTrial {
  const actual: Exclude<ReflexMode, 'mixed'> =
    mode === 'mixed'
      ? (['truth', 'compare', 'stroop'] as const)[Math.floor(Math.random() * 3)]
      : mode;

  if (actual === 'truth') {
    const isMul = Math.random() < 0.45;
    let a = 0;
    let b = 0;
    let trueVal = 0;
    let op = '+';
    if (isMul) {
      a = Math.floor(Math.random() * 14) + 3;
      b = Math.floor(Math.random() * 9) + 2;
      trueVal = a * b;
      op = '×';
    } else if (Math.random() < 0.5) {
      a = Math.floor(Math.random() * 65) + 15;
      b = Math.floor(Math.random() * 55) + 12;
      trueVal = a + b;
      op = '+';
    } else {
      a = Math.floor(Math.random() * 75) + 30;
      b = Math.floor(Math.random() * (a - 10)) + 8;
      trueVal = a - b;
      op = '−';
    }
    const showTruth = Math.random() < 0.5;
    const offset = [-10, -2, -1, 1, 2, 10][Math.floor(Math.random() * 6)];
    const shown = showTruth ? trueVal : Math.max(1, trueVal + offset);

    return {
      kind: 'truth',
      prompt: 'Phép tính sau ĐÚNG hay SAI?',
      mainDisplay: `${a} ${op} ${b} = ${shown}`,
      options: [
        { label: '✔ ĐÚNG', keyHint: '← / A', value: 'true' },
        { label: '✖ SAI', keyHint: '→ / D', value: 'false' },
      ],
      correctValue: showTruth ? 'true' : 'false',
    };
  }

  if (actual === 'compare') {
    const makeExpr = () => {
      if (Math.random() < 0.5) {
        const x = Math.floor(Math.random() * 11) + 4;
        const y = Math.floor(Math.random() * 8) + 3;
        return { text: `${x} × ${y}`, val: x * y };
      }
      const x = Math.floor(Math.random() * 55) + 20;
      const y = Math.floor(Math.random() * 45) + 15;
      return { text: `${x} + ${y}`, val: x + y };
    };
    const left = makeExpr();
    const right = makeExpr();
    const correctValue =
      left.val > right.val ? 'left' : right.val > left.val ? 'right' : 'equal';

    return {
      kind: 'compare',
      prompt: 'Bên nào có giá trị LỚN HƠN?',
      mainDisplay: `${left.text}    vs    ${right.text}`,
      options: [
        { label: '◀ BÊN TRÁI', keyHint: '← / A', value: 'left' },
        { label: '= BẰNG NHAU', keyHint: '↓ / S', value: 'equal' },
        { label: 'BÊN PHẢI ▶', keyHint: '→ / D', value: 'right' },
      ],
      correctValue,
    };
  }

  // Stroop Cognitive Interference
  const wordItem = STROOP_PALETTE[Math.floor(Math.random() * STROOP_PALETTE.length)];
  const inkPool = STROOP_PALETTE.filter((p) => p.name !== wordItem.name);
  const inkItem =
    Math.random() < 0.8
      ? inkPool[Math.floor(Math.random() * inkPool.length)]
      : wordItem;
  const askInk = Math.random() < 0.65;

  return {
    kind: 'stroop',
    prompt: askInk ? 'Chọn MÀU MỰC hiển thị của chữ!' : 'Chọn NGHĨA CỦA TỪ đang viết!',
    mainDisplay: wordItem.name,
    mainColor: inkItem.hex,
    subDisplay: askInk ? '(Bỏ qua nghĩa của chữ — nhìn MÀU SẮC!)' : '(Bỏ qua màu sắc — đọc NGHĨA CHỮ!)',
    options: STROOP_PALETTE.map((p, idx) => ({
      label: p.name,
      keyHint: `${idx + 1}`,
      value: p.name,
      colorHex: p.hex,
    })),
    correctValue: askInk ? inkItem.name : wordItem.name,
  };
}

export default function QuickReflexGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'mixed',
    totalQuestions: 20,
  });

  const [trial, setTrial] = useState<ReflexTrial | null>(null);
  const [records, setRecords] = useState<TrialRecord[]>([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<{ ok: boolean; ms: number } | null>(null);

  const trialStartRef = useRef(0);
  const countRef = useRef(0);

  const startSprint = () => {
    countRef.current = 0;
    setRecords([]);
    setStreak(0);
    setMaxStreak(0);
    setLastFeedback(null);
    setTrial(generateReflexTrial(settings.mode));
    trialStartRef.current = performance.now();
    setPhase('PLAYING');
  };

  const handleAnswer = useCallback(
    (value: string) => {
      if (phase !== 'PLAYING' || !trial) return;
      const ms = Math.max(80, Math.round(performance.now() - trialStartRef.current));
      const ok = value === trial.correctValue;

      setRecords((prev) => [...prev, { correct: ok, ms }]);
      setLastFeedback({ ok, ms });

      if (ok) {
        setStreak((s) => {
          const next = s + 1;
          setMaxStreak((m) => Math.max(m, next));
          return next;
        });
      } else {
        setStreak(0);
      }

      countRef.current += 1;
      if (countRef.current >= settings.totalQuestions) {
        setPhase('RESULT');
      } else {
        setTrial(generateReflexTrial(settings.mode));
        trialStartRef.current = performance.now();
      }
    },
    [phase, trial, settings.mode, settings.totalQuestions]
  );

  // Instant keyboard shortcuts
  useEffect(() => {
    if (phase !== 'PLAYING' || !trial) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (trial.kind === 'truth') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          handleAnswer('true');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          handleAnswer('false');
        }
      } else if (trial.kind === 'compare') {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          handleAnswer('left');
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleAnswer('equal');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          handleAnswer('right');
        }
      } else if (trial.kind === 'stroop') {
        if (e.key >= '1' && e.key <= '4') {
          const opt = trial.options[parseInt(e.key, 10) - 1];
          if (opt) handleAnswer(opt.value);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, trial, handleAnswer]);

  const correctRecords = records.filter((r) => r.correct);
  const accuracy =
    records.length > 0 ? Math.round((correctRecords.length / records.length) * 100) : 0;
  const meanMs =
    records.length > 0
      ? Math.round(records.reduce((sum, r) => sum + r.ms, 0) / records.length)
      : 0;
  const fastestMs =
    correctRecords.length > 0 ? Math.min(...correctRecords.map((r) => r.ms)) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-rose-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/battle"
          className="inline-flex items-center text-slate-500 hover:text-rose-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Đấu Trường
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex items-center gap-4 font-mono text-sm">
            <span className="text-rose-400 font-bold">
              Tiến độ: {records.length}/{settings.totalQuestions}
            </span>
            <span className="text-amber-400 font-bold">🔥 Streak: {streak}</span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-500 mb-2">
              PHẢN XẠ NHANH
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Hyper Reflex • Đo tốc độ xử lý não bộ (ms)
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-bold text-rose-400 mb-1">Đúng / Sai Siêu Tốc</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Phán đoán tính đúng sai của phép tính trong tích tắc bằng phím ← / → (hoặc A / D).
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-2xl mb-2">⚖️</div>
                <h3 className="font-bold text-pink-400 mb-1">So Sánh Biểu Thức</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ước lượng nhanh hai biểu thức hai bên và chọn bên lớn hơn bằng phím ← / ↓ / →.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-2xl mb-2">🧠</div>
                <h3 className="font-bold text-amber-400 mb-1">Nhiễu Stroop</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Chống nhiễu giữa màu mực và nghĩa chữ (hiệu ứng Stroop kinh điển) bằng phím 1–4.
                </p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Thiết Lập Phiên Đo
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Chế độ thử thách
                  </label>
                  <select
                    value={settings.mode}
                    onChange={(e) =>
                      setSettings({ ...settings, mode: e.target.value as ReflexMode })
                    }
                    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-600 outline-none focus:border-rose-500 font-bold"
                  >
                    <option value="mixed">🔥 Hỗn Hợp Đảo Nhiệm (Hyper Mix)</option>
                    <option value="truth">⚡ Phép Tính Đúng / Sai</option>
                    <option value="compare">⚖️ So Sánh Biểu Thức</option>
                    <option value="stroop">🧠 Hiệu Ứng Stroop</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Số lượt phản xạ
                    </label>
                    <span className="text-rose-400 text-sm font-bold">
                      {settings.totalQuestions} câu
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="40"
                    step="5"
                    value={settings.totalQuestions}
                    onChange={(e) =>
                      setSettings({ ...settings, totalQuestions: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                </div>

                <button
                  onClick={startSprint}
                  className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                >
                  ⚡ BẮT ĐẦU SPRINT
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && trial && (
        <div className="max-w-4xl mx-auto px-6 pb-16 animate-fade-in">
          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-8 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-150"
              style={{ width: `${(records.length / settings.totalQuestions) * 100}%` }}
            />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-center shadow-2xl space-y-8">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-rose-400 uppercase tracking-wide mb-2">
                {trial.prompt}
              </h2>
              {trial.subDisplay && <p className="text-xs text-slate-400">{trial.subDisplay}</p>}
            </div>

            <div
              key={records.length}
              className="text-4xl md:text-7xl font-mono font-black tracking-wide py-4 animate-pop-in select-none"
              style={{ color: trial.mainColor ?? '#ffffff' }}
            >
              {trial.mainDisplay}
            </div>

            <div
              className={`grid gap-4 max-w-2xl mx-auto ${
                trial.options.length === 2
                  ? 'grid-cols-2'
                  : trial.options.length === 3
                    ? 'grid-cols-3'
                    : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {trial.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAnswer(opt.value)}
                  className="py-5 px-3 rounded-2xl bg-slate-800 hover:bg-rose-600 border-2 border-slate-700 hover:border-rose-400 font-bold text-lg text-white transition-all active:scale-95 flex flex-col items-center gap-1 shadow-lg"
                >
                  <span
                    className="font-black"
                    style={opt.colorHex ? { color: opt.colorHex } : undefined}
                  >
                    {opt.label}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">[{opt.keyHint}]</span>
                </button>
              ))}
            </div>

            <div className="h-7">
              {lastFeedback && (
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                    lastFeedback.ok
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-700/50'
                      : 'bg-red-950/60 text-red-400 border border-red-700/50'
                  }`}
                >
                  {lastFeedback.ok ? `✔ Chuẩn xác • ${lastFeedback.ms} ms` : `✖ Nhầm rồi • ${lastFeedback.ms} ms`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in-up">
          <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl p-8 md:p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-500 to-pink-500" />
            <div className="text-6xl mb-3">{accuracy >= 90 && meanMs < 1500 ? '⚡' : '🧠'}</div>
            <h2 className="text-4xl font-black text-white mb-2">BÁO CÁO PHẢN XẠ</h2>
            <p className="text-slate-400 text-sm mb-8">
              Hiệu suất xử lý nhận thức qua {records.length} lượt thử thách liên tục
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Chính xác</div>
                <div className="text-3xl font-mono font-black text-emerald-400">{accuracy}%</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">TB phản xạ</div>
                <div className="text-3xl font-mono font-black text-rose-400">{meanMs}ms</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Nhanh nhất</div>
                <div className="text-3xl font-mono font-black text-amber-400">
                  {fastestMs > 0 ? `${fastestMs}ms` : '--'}
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-[11px] text-slate-500 uppercase font-bold mb-1">Max Streak</div>
                <div className="text-3xl font-mono font-black text-cyan-400">×{maxStreak}</div>
              </div>
            </div>

            {/* Reaction time bar telemetry */}
            <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-8">
              <div className="text-[11px] text-slate-500 uppercase font-bold mb-3 text-left">
                Biểu đồ thời gian từng lượt (Xanh = Đúng, Đỏ = Sai)
              </div>
              <div className="flex items-end gap-1 h-28">
                {records.map((r, idx) => {
                  const maxVal = Math.max(1500, ...records.map((x) => x.ms));
                  const hPct = Math.max(10, Math.round((r.ms / maxVal) * 100));
                  return (
                    <div
                      key={idx}
                      title={`Câu ${idx + 1}: ${r.ms}ms (${r.correct ? 'Đúng' : 'Sai'})`}
                      className={`flex-1 rounded-t transition-all ${
                        r.correct ? 'bg-emerald-500/80' : 'bg-red-500/80'
                      }`}
                      style={{ height: `${hPct}%` }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
              >
                Cấu Hình Lại
              </button>
              <button
                onClick={startSprint}
                className="flex-1 py-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl font-bold text-white"
              >
                Chạy Lại Sprint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
