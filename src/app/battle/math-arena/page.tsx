'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { playSuccess, playError } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type BotTier = 'rookie' | 'master' | 'grandmaster' | 'superbrain';
type InputStyle = 'mcq' | 'typing';

interface GameSettings {
  botTier: BotTier;
  inputStyle: InputStyle;
}

interface BattleQuestion {
  expression: string;
  tag: string;
  answer: number;
  choices: number[];
}

interface BotProfile {
  name: string;
  title: string;
  minSec: number;
  maxSec: number;
  damage: number;
  badgeColor: string;
}

const BOT_PROFILES: Record<BotTier, BotProfile> = {
  rookie: {
    name: 'ARIA-1',
    title: 'Tân Binh',
    minSec: 5.5,
    maxSec: 8.5,
    damage: 10,
    badgeColor: 'text-emerald-400',
  },
  master: {
    name: 'SIGMA-7',
    title: 'Cao Thủ',
    minSec: 3.8,
    maxSec: 6.2,
    damage: 13,
    badgeColor: 'text-amber-400',
  },
  grandmaster: {
    name: 'GAUSS-X',
    title: 'Kiện Tướng',
    minSec: 2.6,
    maxSec: 4.5,
    damage: 16,
    badgeColor: 'text-orange-400',
  },
  superbrain: {
    name: 'OMEGA-∞',
    title: 'Siêu Trí Tuệ AI',
    minSec: 1.8,
    maxSec: 3.1,
    damage: 20,
    badgeColor: 'text-red-400',
  },
};

function generateBattleQuestion(tier: BotTier): BattleQuestion {
  const roll = Math.random();
  let expression = '';
  let answer = 0;
  let tag = 'Số học';

  const scale = tier === 'rookie' ? 1 : tier === 'master' ? 2 : tier === 'grandmaster' ? 3 : 4;

  if (roll < 0.25) {
    // Fast addition / subtraction
    const maxN = 25 * scale + 20;
    const a = Math.floor(Math.random() * maxN) + 12;
    const b = Math.floor(Math.random() * maxN) + 9;
    if (Math.random() < 0.5) {
      expression = `${a} + ${b}`;
      answer = a + b;
    } else {
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      expression = `${hi} − ${lo}`;
      answer = hi - lo;
    }
    tag = 'Cộng / Trừ';
  } else if (roll < 0.52) {
    // Multiplication
    const a = Math.floor(Math.random() * (6 * scale + 8)) + 4;
    const b = Math.floor(Math.random() * (4 * scale + 6)) + 3;
    expression = `${a} × ${b}`;
    answer = a * b;
    tag = 'Phép Nhân';
  } else if (roll < 0.72) {
    // Exact division
    const b = Math.floor(Math.random() * (4 * scale + 5)) + 3;
    const q = Math.floor(Math.random() * (6 * scale + 6)) + 4;
    expression = `${b * q} ÷ ${b}`;
    answer = q;
    tag = 'Phép Chia';
  } else if (roll < 0.88) {
    // Linear equation a*x + b = c
    const a = Math.floor(Math.random() * (2 * scale + 4)) + 2;
    const x = Math.floor(Math.random() * (5 * scale + 6)) + 2;
    const b = Math.floor(Math.random() * (8 * scale + 10)) + 3;
    const c = a * x + b;
    expression = `${a}x + ${b} = ${c}  ⇒  x = ?`;
    answer = x;
    tag = 'Giải Phương Trình';
  } else {
    // Mixed order of operations or square/root
    if (Math.random() < 0.5) {
      const a = Math.floor(Math.random() * (3 * scale + 5)) + 3;
      const b = Math.floor(Math.random() * (2 * scale + 5)) + 2;
      const c = Math.floor(Math.random() * (6 * scale + 10)) + 5;
      expression = `${a} × ${b} + ${c}`;
      answer = a * b + c;
      tag = 'Biểu Thức';
    } else {
      const root = Math.floor(Math.random() * (5 * scale + 7)) + 4;
      expression = `√${root * root} + ${root}`;
      answer = root * 2;
      tag = 'Căn & Cộng';
    }
  }

  // Generate 3 realistic distractor choices close to the true answer
  const choiceSet = new Set<number>([answer]);
  const offsets = [-10, -2, -1, 1, 2, 3, 5, 10, -5, -3, 12, -12, 4, -4];
  let guard = 0;
  while (choiceSet.size < 4 && guard < 100) {
    guard++;
    const delta = offsets[Math.floor(Math.random() * offsets.length)];
    const cand = answer + delta;
    if (cand >= 0 && cand !== answer) {
      choiceSet.add(cand);
    }
  }
  const choices = Array.from(choiceSet).sort(() => Math.random() - 0.5);

  return { expression, tag, answer, choices };
}

export default function MathBattleArenaGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    botTier: 'master',
    inputStyle: 'mcq',
  });

  const [playerHp, setPlayerHp] = useState(100);
  const [botHp, setBotHp] = useState(100);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);

  const [question, setQuestion] = useState<BattleQuestion | null>(null);
  const [typingInput, setTypingInput] = useState('');
  const [botProgress, setBotProgress] = useState(0); // 0..100
  const [combatFlash, setCombatFlash] = useState<{ text: string; type: 'player' | 'bot' } | null>(
    null
  );

  const playerHpRef = useRef(100);
  const botHpRef = useRef(100);
  const comboRef = useRef(0);
  const qStartRef = useRef(0);
  const botDurationMsRef = useRef(5000);
  const tickRef = useRef<NodeJS.Timeout | null>(null);

  const botProfile = BOT_PROFILES[settings.botTier];

  const loadNextQuestion = useCallback((tier: BotTier) => {
    const profile = BOT_PROFILES[tier];
    const nextQ = generateBattleQuestion(tier);
    setQuestion(nextQ);
    setTypingInput('');
    setBotProgress(0);
    qStartRef.current = performance.now();
    botDurationMsRef.current =
      (profile.minSec + Math.random() * (profile.maxSec - profile.minSec)) * 1000;
  }, []);

  const startBattle = () => {
    playerHpRef.current = 100;
    botHpRef.current = 100;
    comboRef.current = 0;

    setPlayerHp(100);
    setBotHp(100);
    setCombo(0);
    setMaxCombo(0);
    setCorrectCount(0);
    setTotalAnswered(0);
    setReactionTimes([]);
    setCombatFlash(null);

    loadNextQuestion(settings.botTier);
    setPhase('PLAYING');
  };

  // Bot charge timer loop
  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }

    tickRef.current = setInterval(() => {
      const elapsed = performance.now() - qStartRef.current;
      const pct = Math.min(100, (elapsed / botDurationMsRef.current) * 100);
      setBotProgress(pct);

      if (elapsed >= botDurationMsRef.current) {
        // Bot strikes first!
        const dmg = BOT_PROFILES[settings.botTier].damage;
        const nextHp = Math.max(0, playerHpRef.current - dmg);
        playerHpRef.current = nextHp;
        comboRef.current = 0;
        setPlayerHp(nextHp);
        setCombo(0);
        setTotalAnswered((t) => t + 1);
        setCombatFlash({
          text: `${BOT_PROFILES[settings.botTier].name} ra đòn trước! -${dmg} HP`,
          type: 'bot',
        });
        playError();

        if (nextHp <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
          setPhase('RESULT');
        } else {
          loadNextQuestion(settings.botTier);
        }
      }
    }, 50);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, settings.botTier, loadNextQuestion]);

  const submitAnswerValue = useCallback(
    (val: number) => {
      if (phase !== 'PLAYING' || !question) return;
      const rtMs = Math.round(performance.now() - qStartRef.current);
      setTotalAnswered((t) => t + 1);

      if (val === question.answer) {
        const nextCombo = comboRef.current + 1;
        comboRef.current = nextCombo;
        setCombo(nextCombo);
        setMaxCombo((m) => Math.max(m, nextCombo));
        setCorrectCount((c) => c + 1);
        setReactionTimes((arr) => [...arr, rtMs]);

        const multiplier = nextCombo >= 5 ? 1.75 : nextCombo >= 3 ? 1.4 : 1;
        const speedBonus = rtMs < 2000 ? 4 : rtMs < 3500 ? 2 : 0;
        const dmg = Math.round((12 + speedBonus) * multiplier);

        const nextBotHp = Math.max(0, botHpRef.current - dmg);
        botHpRef.current = nextBotHp;
        setBotHp(nextBotHp);
        setCombatFlash({
          text: `Đòn chuẩn xác (${(rtMs / 1000).toFixed(2)}s)! Gây -${dmg} HP ${
            nextCombo >= 3 ? `🔥 COMBO ×${nextCombo}` : ''
          }`,
          type: 'player',
        });
        playSuccess();

        if (nextBotHp <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
          setPhase('RESULT');
        } else {
          loadNextQuestion(settings.botTier);
        }
      } else {
        const dmg = Math.round(BOT_PROFILES[settings.botTier].damage * 0.9);
        const nextPlayerHp = Math.max(0, playerHpRef.current - dmg);
        playerHpRef.current = nextPlayerHp;
        comboRef.current = 0;
        setPlayerHp(nextPlayerHp);
        setCombo(0);
        setCombatFlash({
          text: `Sai rồi! Đáp án là ${question.answer}. Bị phản đòn -${dmg} HP`,
          type: 'bot',
        });
        playError();

        if (nextPlayerHp <= 0) {
          if (tickRef.current) clearInterval(tickRef.current);
          setPhase('RESULT');
        } else {
          loadNextQuestion(settings.botTier);
        }
      }
    },
    [phase, question, settings.botTier, loadNextQuestion]
  );

  // Keyboard 1-4 shortcuts for MCQ mode
  useEffect(() => {
    if (phase !== 'PLAYING' || settings.inputStyle !== 'mcq' || !question) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        if (question.choices[idx] !== undefined) {
          submitAnswerValue(question.choices[idx]);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, settings.inputStyle, question, submitAnswerValue]);

  const handleTypingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typingInput.trim()) return;
    submitAnswerValue(parseInt(typingInput, 10));
  };

  const avgMs =
    reactionTimes.length > 0
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const playerWon = botHp <= 0 && playerHp > 0;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'math-arena',
    won: playerWon,
    accuracy,
    scoreLabel: `vs ${botProfile.name} (Combo ×${maxCombo})`,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/battle"
          className="inline-flex items-center text-slate-500 hover:text-red-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Đấu Trường
        </Link>
        {phase === 'PLAYING' && (
          <div className="text-xs font-mono uppercase tracking-widest text-slate-400">
            Combo hiện tại: <span className="text-amber-400 font-black text-base">×{combo}</span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-2">
              TRẬN CHIẾN TÍNH TOÁN
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Math Battle Arena • Đối kháng 1v1 cùng AI
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(Object.entries(BOT_PROFILES) as [BotTier, BotProfile][]).map(([tier, bot]) => (
                <button
                  key={tier}
                  onClick={() => setSettings({ ...settings, botTier: tier })}
                  className={`text-left p-6 rounded-2xl border-2 transition-all ${
                    settings.botTier === tier
                      ? 'bg-slate-900 border-red-500 shadow-lg shadow-red-500/15'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono font-black text-2xl text-white">{bot.name}</span>
                    <span className={`text-xs font-bold uppercase ${bot.badgeColor}`}>
                      {bot.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Tốc độ giải trung bình: <strong className="text-white">{bot.minSec}s – {bot.maxSec}s</strong> • Sát thương:{' '}
                    <strong className="text-red-400">{bot.damage} HP</strong>
                  </p>
                </button>
              ))}
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Luật Đối Kháng
                </h3>
                <ul className="text-sm text-slate-300 space-y-2 list-disc list-inside">
                  <li>Cả hai bắt đầu với <strong className="text-white">100 HP</strong>.</li>
                  <li>Giải nhanh hơn thanh nạp của AI để tung đòn sát thương.</li>
                  <li>Giữ chuỗi đúng liên tiếp (Combo ≥ 3, ≥ 5) để nhân sát thương chí mạng!</li>
                  <li>Trả lời sai hoặc chậm hơn AI sẽ mất máu và ngắt chuỗi Combo.</li>
                </ul>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Kiểu nhập đáp án
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, inputStyle: 'mcq' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        settings.inputStyle === 'mcq'
                          ? 'bg-red-600 border-red-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      4 Đáp Án (Phím 1-4)
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, inputStyle: 'typing' })}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        settings.inputStyle === 'typing'
                          ? 'bg-red-600 border-red-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      Nhập Số (Hardcore)
                    </button>
                  </div>
                </div>

                <button
                  onClick={startBattle}
                  className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                >
                  ⚔️ KHIÊU CHIẾN {botProfile.name}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && question && (
        <div className="max-w-4xl mx-auto px-6 pb-16 animate-fade-in space-y-6">
          {/* HP HUD */}
          <div className="grid grid-cols-2 gap-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-black text-emerald-400 text-sm uppercase">BẠN (PLAYER)</span>
                <span className="font-mono font-black text-2xl text-white">{playerHp} HP</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-300"
                  style={{ width: `${playerHp}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className={`font-black text-sm uppercase ${botProfile.badgeColor}`}>
                  {botProfile.name} ({botProfile.title})
                </span>
                <span className="font-mono font-black text-2xl text-white">{botHp} HP</span>
              </div>
              <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-300"
                  style={{ width: `${botHp}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bot Charge Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono text-slate-400 uppercase">
              <span>Tiến độ tính toán của {botProfile.name}</span>
              <span>{Math.round(botProgress)}%</span>
            </div>
            <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-75 ${
                  botProgress > 75 ? 'bg-red-500' : 'bg-amber-500'
                }`}
                style={{ width: `${botProgress}%` }}
              />
            </div>
          </div>

          {/* Question Arena */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 text-center shadow-2xl space-y-8">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-red-400 text-xs font-bold uppercase tracking-widest border border-slate-700 mb-4">
                {question.tag}
              </span>
              <div className="text-4xl md:text-6xl font-mono font-black text-white tracking-wider">
                {question.expression}
              </div>
            </div>

            {settings.inputStyle === 'mcq' ? (
              <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                {question.choices.map((c, idx) => (
                  <button
                    key={`${question.expression}-${c}`}
                    onClick={() => submitAnswerValue(c)}
                    className="relative py-5 rounded-2xl bg-slate-800 hover:bg-red-600 border-2 border-slate-700 hover:border-red-400 font-mono font-black text-3xl text-white transition-all active:scale-95 shadow-lg"
                  >
                    <span className="absolute top-2 left-3 text-xs text-slate-500 font-sans">
                      [{idx + 1}]
                    </span>
                    {c}
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleTypingSubmit} className="max-w-md mx-auto flex gap-3">
                <input
                  type="number"
                  autoFocus
                  value={typingInput}
                  onChange={(e) => setTypingInput(e.target.value)}
                  placeholder="Nhập nhanh..."
                  className="flex-1 bg-slate-800 text-white text-4xl font-mono font-bold text-center py-4 rounded-xl border-2 border-slate-700 focus:border-red-500 outline-none"
                />
                <button
                  type="submit"
                  className="px-7 py-4 bg-red-600 hover:bg-red-500 rounded-xl font-black text-white"
                >
                  ĐÁNH!
                </button>
              </form>
            )}

            {combatFlash && (
              <div
                className={`text-sm font-bold py-2 px-4 rounded-xl inline-block animate-pop-in ${
                  combatFlash.type === 'player'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-600/50'
                    : 'bg-red-950/60 text-red-300 border border-red-600/50'
                }`}
              >
                {combatFlash.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in-up">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
            <div
              className={`absolute top-0 left-0 w-full h-3 ${
                playerWon ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
            <div className="text-7xl mb-4">{playerWon ? '🏆' : '💥'}</div>
            <h2
              className={`text-4xl md:text-5xl font-black mb-2 ${
                playerWon ? 'text-emerald-400' : 'text-red-500'
              }`}
            >
              {playerWon ? `HẠ GỤC ${botProfile.name}!` : `${botProfile.name} CHIẾN THẮNG`}
            </h2>
            <p className="text-slate-400 mb-8">
              {playerWon
                ? 'Tốc độ và độ chính xác áp đảo hoàn toàn đối thủ AI.'
                : 'Đối thủ ra đòn quá nhanh! Hãy rèn thêm tốc độ để tái đấu.'}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Chính xác</div>
                <div className="text-3xl font-mono font-black text-emerald-400">{accuracy}%</div>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Tốc độ TB</div>
                <div className="text-3xl font-mono font-black text-amber-400">
                  {avgMs > 0 ? `${(avgMs / 1000).toFixed(2)}s` : '--'}
                </div>
              </div>
              <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <div className="text-xs text-slate-500 uppercase font-bold mb-1">Max Combo</div>
                <div className="text-3xl font-mono font-black text-rose-400">×{maxCombo}</div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
              >
                Đổi Đối Thủ
              </button>
              <button
                onClick={startBattle}
                className="flex-1 py-4 bg-gradient-to-r from-red-600 to-rose-600 rounded-xl font-bold text-white"
              >
                Tái Đấu Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
