'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type CipherMode = 'mixed' | 'caesar' | 'binary' | 'morse' | 'sequence';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameSettings {
  mode: CipherMode;
  difficulty: Difficulty;
  rounds: number;
}

interface SignalQuestion {
  kind: Exclude<CipherMode, 'mixed'>;
  title: string;
  signalDisplay: string;
  subHint: string;
  binaryBits?: string;
  morseCode?: string;
  answer: string;
  placeholder: string;
  explanation: string;
}

const WORDS_EASY = ['LOGIC', 'BRAIN', 'TOAN', 'SOHOC', 'TRITUE', 'PRIME', 'ALPHA', 'DELTA', 'SIGMA'];
const WORDS_MED = ['CIPHER', 'MATRIX', 'SIGNAL', 'VECTOR', 'BINARY', 'EULER', 'GAUSS', 'ORBIT', 'PRISM'];
const WORDS_HARD = ['QUANTUM', 'ENTROPY', 'FIBONACCI', 'ALGORITHM', 'TOPOLOGY', 'SPECTRUM', 'CRYPTIC'];

const MORSE_MAP: Record<string, string> = {
  A: '.-',
  B: '-...',
  C: '-.-.',
  D: '-..',
  E: '.',
  F: '..-.',
  G: '--.',
  H: '....',
  I: '..',
  J: '.---',
  K: '-.-',
  L: '.-..',
  M: '--',
  N: '-.',
  O: '---',
  P: '.--.',
  Q: '--.-',
  R: '.-.',
  S: '...',
  T: '-',
  U: '..-',
  V: '...-',
  W: '.--',
  X: '-..-',
  Y: '-.--',
  Z: '--..',
};

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

function shiftCaesar(text: string, shift: number): string {
  return text
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + shift + 26) % 26) + 65);
      }
      return ch;
    })
    .join('');
}

function buildCaesarQuestion(difficulty: Difficulty): SignalQuestion {
  const pool =
    difficulty === 'easy' ? WORDS_EASY : difficulty === 'medium' ? WORDS_MED : WORDS_HARD;
  const word = pickRandom(pool);
  const shift =
    difficulty === 'easy'
      ? Math.floor(Math.random() * 5) + 1
      : Math.floor(Math.random() * 19) + 3;
  const encoded = shiftCaesar(word, shift);

  const subHint =
    difficulty === 'easy'
      ? `Khóa dịch chuyển: mỗi chữ cái gốc đã bị đẩy tiến +${shift} bậc (VD: A → ${shiftCaesar('A', shift)}).`
      : difficulty === 'medium'
        ? `Gợi ý chữ cái đầu: "${encoded[0]}" giải mã thành "${word[0]}". Tìm khóa dịch và giải toàn bộ từ.`
        : `Không cho sẵn khóa dịch! Từ gốc là một thuật ngữ toán học/khoa học quen thuộc (chữ cái cuối là "${word[word.length - 1]}").`;

  return {
    kind: 'caesar',
    title: 'Giải mã Mật mã Caesar',
    signalDisplay: encoded,
    subHint,
    answer: word,
    placeholder: 'Nhập từ gốc (in hoa, không dấu)...',
    explanation: `Khóa dịch chuyển là +${shift} (giải mã lùi -${shift} bậc): ${encoded} → ${word}.`,
  };
}

function buildBinaryQuestion(difficulty: Difficulty): SignalQuestion {
  if (difficulty === 'easy') {
    const val = Math.floor(Math.random() * 55) + 9; // 9..63 (6-bit)
    const bits = val.toString(2).padStart(6, '0');
    return {
      kind: 'binary',
      title: 'Giải mã Sóng Nhị Phân → Thập Phân',
      signalDisplay: bits,
      binaryBits: bits,
      subHint: 'Chuyển chuỗi xung 6-bit (HIGH=1, LOW=0) sang số nguyên hệ thập phân (cơ số 10).',
      answer: val.toString(),
      placeholder: 'Nhập số thập phân...',
      explanation: `(${bits})₂ = ${bits
        .split('')
        .map((b, i) => (b === '1' ? `${Math.pow(2, bits.length - 1 - i)}` : null))
        .filter(Boolean)
        .join(' + ')} = ${val}.`,
    };
  }

  if (difficulty === 'medium') {
    const val = Math.floor(Math.random() * 200) + 40; // 40..239 (8-bit)
    const bits = val.toString(2).padStart(8, '0');
    return {
      kind: 'binary',
      title: 'Giải mã Gói Tin 8-Bit → Thập Phân',
      signalDisplay: `${bits.slice(0, 4)} ${bits.slice(4)}`,
      binaryBits: bits,
      subHint: 'Chuyển byte 8-bit từ dạng sóng xung sang giá trị hệ thập phân.',
      answer: val.toString(),
      placeholder: 'Nhập số nguyên (0-255)...',
      explanation: `(${bits})₂ = ${bits
        .split('')
        .map((b, i) => (b === '1' ? `${Math.pow(2, 7 - i)}` : null))
        .filter(Boolean)
        .join(' + ')} = ${val}.`,
    };
  }

  // Hard: Hexadecimal to Decimal OR 8-bit -> Hex
  const val = Math.floor(Math.random() * 220) + 32;
  const hex = val.toString(16).toUpperCase().padStart(2, '0');
  const bits = val.toString(2).padStart(8, '0');
  return {
    kind: 'binary',
    title: 'Giải mã Tín Hiệu Nhị Phân → Hệ Thập Lục Phân (HEX)',
    signalDisplay: `${bits.slice(0, 4)} ${bits.slice(4)}`,
    binaryBits: bits,
    subHint: 'Tách thành 2 cụm 4-bit và quy đổi sang mã HEX 2 ký tự (0-9, A-F).',
    answer: hex,
    placeholder: 'VD: 7F, A4...',
    explanation: `Cụm cao (${bits.slice(0, 4)})₂ = ${hex[0]}, cụm thấp (${bits.slice(4)})₂ = ${hex[1]} → 0x${hex} (= ${val}₁₀).`,
  };
}

function buildMorseQuestion(difficulty: Difficulty): SignalQuestion {
  const pool =
    difficulty === 'easy'
      ? ['SOS', 'ACE', 'BIT', 'MAX', 'TEN', 'SIN', 'COS']
      : difficulty === 'medium'
        ? ['MATH', 'CODE', 'WAVE', 'NODE', 'ZERO', 'SYNC']
        : ['BRAIN', 'LOGIC', 'PRIME', 'ALPHA', 'OMEGA'];
  const word = pickRandom(pool);
  const morse = word
    .split('')
    .map((ch) => MORSE_MAP[ch])
    .join('   ');

  return {
    kind: 'morse',
    title: 'Giải mã Tín Hiệu Morse',
    signalDisplay: morse,
    morseCode: morse,
    subHint:
      difficulty === 'hard'
        ? 'Bảng tra cứu đã ẩn ở chế độ Khó! Bạn có thể bấm nút Phát Âm Thanh để nghe nhịp tín hiệu.'
        : 'Mỗi khoảng trắng ngăn cách một chữ cái. Có thể mở Bảng tra Morse hoặc nghe âm thanh.',
    answer: word,
    placeholder: 'Nhập chuỗi ký tự giải mã...',
    explanation: word
      .split('')
      .map((ch) => `${MORSE_MAP[ch]}=${ch}`)
      .join(' • '),
  };
}

function buildSequenceQuestion(difficulty: Difficulty): SignalQuestion {
  const patternType =
    difficulty === 'easy'
      ? Math.floor(Math.random() * 2)
      : difficulty === 'medium'
        ? Math.floor(Math.random() * 2) + 2
        : Math.floor(Math.random() * 2) + 4;

  let seq: number[] = [];
  let ans = 0;
  let explanation = '';

  if (patternType === 0) {
    // Quadratic differences: a_n = n^2 + b*n + c
    const b = Math.floor(Math.random() * 3) + 1;
    const c = Math.floor(Math.random() * 6) + 1;
    seq = [1, 2, 3, 4, 5].map((n) => n * n + b * n + c);
    ans = 6 * 6 + b * 6 + c;
    explanation = `Quy luật bậc hai a(n) = n² + ${b}n + ${c} (hiệu bậc 1 tăng đều +2 mỗi bước) → số thứ 6 là ${ans}.`;
  } else if (patternType === 1) {
    // Multiply + add: x_{n+1} = 2*x_n + k
    const k = Math.floor(Math.random() * 5) + 1;
    let cur = Math.floor(Math.random() * 4) + 2;
    seq = [cur];
    for (let i = 0; i < 4; i++) {
      cur = cur * 2 + k;
      seq.push(cur);
    }
    ans = cur * 2 + k;
    explanation = `Quy luật truy hồi x(n+1) = 2 × x(n) + ${k} → ${cur} × 2 + ${k} = ${ans}.`;
  } else if (patternType === 2) {
    // Fibonacci-like with custom seeds
    const a = Math.floor(Math.random() * 5) + 2;
    const b = Math.floor(Math.random() * 5) + 3;
    seq = [a, b];
    for (let i = 2; i < 6; i++) seq.push(seq[i - 1] + seq[i - 2]);
    ans = seq[5] + seq[4];
    explanation = `Quy luật cộng dồn 2 số liền trước (Fibonacci biến thể): ${seq[4]} + ${seq[5]} = ${ans}.`;
  } else if (patternType === 3) {
    // Alternating double sequence
    const a0 = Math.floor(Math.random() * 5) + 3;
    const da = Math.floor(Math.random() * 4) + 3;
    const b0 = Math.floor(Math.random() * 5) + 20;
    const db = Math.floor(Math.random() * 3) + 2;
    seq = [a0, b0, a0 + da, b0 - db, a0 + 2 * da, b0 - 2 * db];
    ans = a0 + 3 * da;
    explanation = `Hai chuỗi xen kẽ: vị trí lẻ tăng +${da} (${a0}, ${a0 + da}, ${a0 + 2 * da} → ${ans}), vị trí chẵn giảm -${db}.`;
  } else if (patternType === 4) {
    // Cubic + offset: n^3 - n or n^3 + k
    const k = Math.floor(Math.random() * 7) - 3;
    seq = [1, 2, 3, 4, 5].map((n) => n * n * n + k);
    ans = 6 * 6 * 6 + k;
    explanation = `Quy luật lập phương a(n) = n³ ${k >= 0 ? `+ ${k}` : `- ${Math.abs(k)}`} → 6³ ${k >= 0 ? `+ ${k}` : `- ${Math.abs(k)}`} = ${ans}.`;
  } else {
    // Multiplicative alternating +prime differences
    const primes = [2, 3, 5, 7, 11, 13];
    let cur = Math.floor(Math.random() * 10) + 5;
    seq = [cur];
    for (let i = 0; i < 5; i++) {
      cur += primes[i];
      seq.push(cur);
    }
    ans = cur + primes[5];
    explanation = `Hiệu liên tiếp là dãy số nguyên tố (+2, +3, +5, +7, +11, +13) → ${cur} + 13 = ${ans}.`;
  }

  return {
    kind: 'sequence',
    title: 'Giải mã Quy Luật Tín Hiệu Số',
    signalDisplay: `${seq.join('  •  ')}  •  ?`,
    subHint: 'Phát hiện hàm biến đổi ẩn đằng sau chuỗi tín hiệu và điền giá trị tiếp theo.',
    answer: ans.toString(),
    placeholder: 'Nhập số tiếp theo...',
    explanation,
  };
}

function generateSignalQuestion(mode: CipherMode, difficulty: Difficulty): SignalQuestion {
  const actual: Exclude<CipherMode, 'mixed'> =
    mode === 'mixed'
      ? (['caesar', 'binary', 'morse', 'sequence'] as const)[Math.floor(Math.random() * 4)]
      : mode;

  if (actual === 'caesar') return buildCaesarQuestion(difficulty);
  if (actual === 'binary') return buildBinaryQuestion(difficulty);
  if (actual === 'morse') return buildMorseQuestion(difficulty);
  return buildSequenceQuestion(difficulty);
}

/** Crisp SVG Digital Square-Wave Pulse Renderer for Binary Signals */
function BinaryWaveformSVG({ bits }: { bits: string }) {
  const stepW = 54;
  const startX = 24;
  const highY = 24;
  const lowY = 82;
  const width = startX * 2 + bits.length * stepW;

  const points: string[] = [];
  for (let i = 0; i < bits.length; i++) {
    const y = bits[i] === '1' ? highY : lowY;
    const x1 = startX + i * stepW;
    const x2 = x1 + stepW;
    if (i > 0) {
      const prevY = bits[i - 1] === '1' ? highY : lowY;
      if (prevY !== y) points.push(`${x1},${y}`);
    } else {
      points.push(`${x1},${y}`);
    }
    points.push(`${x2},${y}`);
  }

  return (
    <svg viewBox={`0 0 ${width} 122`} className="w-full max-w-xl h-auto mx-auto">
      <line x1={startX} y1={highY} x2={width - startX} y2={highY} stroke="#1e293b" strokeDasharray="4 4" />
      <line x1={startX} y1={lowY} x2={width - startX} y2={lowY} stroke="#1e293b" strokeDasharray="4 4" />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="#10b981"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {bits.split('').map((b, idx) => {
        const cx = startX + idx * stepW + stepW / 2;
        return (
          <g key={idx}>
            <line
              x1={startX + idx * stepW}
              y1={14}
              x2={startX + idx * stepW}
              y2={94}
              stroke="#0f172a"
            />
            <text
              x={cx}
              y={112}
              textAnchor="middle"
              fill={b === '1' ? '#34d399' : '#64748b'}
              fontSize="14"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {b}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function SignalDecodingGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'mixed',
    difficulty: 'medium',
    rounds: 6,
  });

  const [questions, setQuestions] = useState<SignalQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [answered, setAnswered] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [showRef, setShowRef] = useState(false);
  const [caesarPreviewShift, setCaesarPreviewShift] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const startGame = () => {
    const list = Array.from({ length: settings.rounds }, () =>
      generateSignalQuestion(settings.mode, settings.difficulty)
    );
    setQuestions(list);
    setCurrentIdx(0);
    setUserInput('');
    setAnswered(null);
    setScore(0);
    setShowRef(false);
    setCaesarPreviewShift(0);
    setPhase('PLAYING');
  };

  const playMorseAudio = (morse: string) => {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const unit = 0.085;
    let t = ctx.currentTime + 0.05;

    for (const ch of morse) {
      if (ch === '.' || ch === '-') {
        const dur = ch === '.' ? unit : unit * 3;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + dur);
        t += dur + unit;
      } else if (ch === ' ') {
        t += unit * 1.4;
      }
    }
  };

  const currentQ = questions[currentIdx];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQ || answered !== null || !userInput.trim()) return;
    const normalized = userInput.trim().toUpperCase().replace(/\s+/g, '');
    const expected = currentQ.answer.trim().toUpperCase().replace(/\s+/g, '');
    const isCorrect = normalized === expected;
    setAnswered(isCorrect);
    if (isCorrect) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setUserInput('');
      setAnswered(null);
      setCaesarPreviewShift(0);
      setShowRef(false);
    } else {
      setPhase('RESULT');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-emerald-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/applied-math"
          className="inline-flex items-center text-slate-500 hover:text-emerald-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Toán Ứng Dụng
        </Link>
        {phase === 'PLAYING' && (
          <span className="text-sm font-mono bg-slate-900 border border-emerald-500/40 px-4 py-1.5 rounded-full text-emerald-400 font-bold">
            Tín hiệu {currentIdx + 1}/{questions.length} • Điểm: {score}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2">
              GIẢI MÃ TÍN HIỆU
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Signal &amp; Cipher Lab • Mật mã học &amp; Tín hiệu số
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-emerald-400 font-bold mb-1">🔐 Mật mã Caesar</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Phép cộng modulo 26 trên bảng chữ cái Latin. Đi kèm vòng xoay giải mã hỗ trợ ở mức Dễ/Vừa.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-teal-400 font-bold mb-1">⚡ Sóng Nhị Phân &amp; HEX</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Đọc biểu đồ sóng xung HIGH/LOW 6-bit và 8-bit, chuyển đổi nhanh sang Thập phân hoặc Thập lục phân.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-green-400 font-bold mb-1">📡 Tín hiệu Morse</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Phát trực tiếp âm thanh sóng sin 660Hz của chuỗi chấm/gạch và giải mã bức điện mật.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-cyan-400 font-bold mb-1">🧮 Chuỗi Quy Luật Ẩn</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Khám phá hàm bậc hai, bậc ba, truy hồi, dãy nguyên tố hoặc chuỗi xen kẽ để dự đoán mã kế tiếp.
                </p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Thiết Lập Giải Mã
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Loại tín hiệu
                  </label>
                  <select
                    value={settings.mode}
                    onChange={(e) => setSettings({ ...settings, mode: e.target.value as CipherMode })}
                    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-600 outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="mixed">🎯 Tổng Hợp Tất Cả</option>
                    <option value="caesar">🔐 Mật mã Caesar</option>
                    <option value="binary">⚡ Sóng Nhị Phân / HEX</option>
                    <option value="morse">📡 Tín hiệu Morse</option>
                    <option value="sequence">🧮 Quy Luật Số Học</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Cấp độ bảo mật
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['easy', 'Dễ'],
                        ['medium', 'Vừa'],
                        ['hard', 'Khó'],
                      ] as [Difficulty, string][]
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setSettings({ ...settings, difficulty: k })}
                        className={`py-2 rounded-lg text-sm font-bold border ${
                          settings.difficulty === k
                            ? 'bg-emerald-600 border-emerald-400 text-white'
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Số bản tin</label>
                    <span className="text-emerald-400 text-sm font-bold">{settings.rounds} câu</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="15"
                    value={settings.rounds}
                    onChange={(e) =>
                      setSettings({ ...settings, rounds: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                >
                  KẾT NỐI TRẠM GIẢI MÃ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && currentQ && (
        <div className="max-w-4xl mx-auto px-6 pb-16 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-4">
              <h2 className="text-xl font-black text-emerald-400 uppercase tracking-wide">
                {currentQ.title}
              </h2>
              {currentQ.kind === 'morse' && currentQ.morseCode && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => playMorseAudio(currentQ.morseCode!)}
                    className="px-4 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-700 border border-emerald-600 text-xs font-bold text-emerald-200"
                  >
                    🔊 Phát Âm Thanh Morse
                  </button>
                  {settings.difficulty !== 'hard' && (
                    <button
                      type="button"
                      onClick={() => setShowRef((v) => !v)}
                      className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-300"
                    >
                      {showRef ? 'Ẩn Bảng Tra' : 'Bảng Tra Morse'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Signal Display Area */}
            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 text-center space-y-4">
              {currentQ.kind === 'binary' && currentQ.binaryBits && (
                <BinaryWaveformSVG bits={currentQ.binaryBits} />
              )}
              <div className="font-mono text-3xl md:text-5xl font-black tracking-widest text-white break-words">
                {currentQ.signalDisplay}
              </div>
              <p className="text-sm text-slate-400">{currentQ.subHint}</p>
            </div>

            {/* Caesar interactive scratchpad (Easy & Medium) */}
            {currentQ.kind === 'caesar' && settings.difficulty !== 'hard' && answered === null && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-bold uppercase">
                    Công cụ thử dịch lùi (-{caesarPreviewShift} bậc)
                  </span>
                  <span className="font-mono text-emerald-400 font-bold tracking-widest">
                    {shiftCaesar(currentQ.signalDisplay, -caesarPreviewShift)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="25"
                  value={caesarPreviewShift}
                  onChange={(e) => setCaesarPreviewShift(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            )}

            {/* Morse reference sheet */}
            {currentQ.kind === 'morse' && showRef && (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                {Object.entries(MORSE_MAP).map(([letter, code]) => (
                  <div key={letter} className="bg-slate-900 p-2 rounded text-center border border-slate-800">
                    <div className="font-bold text-white">{letter}</div>
                    <div className="text-emerald-400">{code}</div>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                autoFocus
                disabled={answered !== null}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={currentQ.placeholder}
                className="flex-1 bg-slate-800 text-white text-2xl font-mono font-bold text-center py-4 px-4 rounded-xl border-2 border-slate-700 focus:border-emerald-500 outline-none uppercase"
              />
              {answered === null && (
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold text-white"
                >
                  GIẢI MÃ
                </button>
              )}
            </form>

            {answered !== null && (
              <div className="bg-slate-950 border border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                <div>
                  <div
                    className={`font-black text-lg ${
                      answered ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {answered
                      ? '✔ Giải mã thành công!'
                      : `✖ Chưa chính xác! Đáp án đúng là: ${currentQ.answer}`}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">{currentQ.explanation}</p>
                </div>
                <button
                  onClick={handleNext}
                  className="shrink-0 px-8 py-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-bold text-white shadow-lg"
                >
                  {currentIdx + 1 < questions.length ? 'Bản Tin Kế Tiếp →' : 'Xem Tổng Kết'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in-up">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-teal-400" />
            <div className="text-7xl mb-4">
              {score === questions.length ? '🏆' : score >= questions.length * 0.6 ? '📡' : '🔐'}
            </div>
            <h2 className="text-4xl font-black text-white mb-2">KẾT QUẢ GIẢI MÃ</h2>
            <p className="text-slate-400 mb-8">
              Bạn đã giải thành công{' '}
              <strong className="text-emerald-400 font-mono text-2xl">
                {score}/{questions.length}
              </strong>{' '}
              bản tin ({Math.round((score / Math.max(1, questions.length)) * 100)}%).
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
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl font-bold text-white"
              >
                Chơi Lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
