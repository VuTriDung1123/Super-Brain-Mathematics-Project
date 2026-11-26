'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { playClick } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'MEMORIZE' | 'RECALL' | 'RESULT';
type Suit = '♠' | '♥' | '♦' | '♣';

interface PlayingCard {
  id: string;
  rank: string;
  suit: Suit;
  isRed: boolean;
}

const SUITS: { symbol: Suit; isRed: boolean }[] = [
  { symbol: '♠', isRed: false },
  { symbol: '♥', isRed: true },
  { symbol: '♦', isRed: true },
  { symbol: '♣', isRed: false },
];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const FULL_DECK: PlayingCard[] = SUITS.flatMap((s) =>
  RANKS.map((rank) => ({
    id: `${rank}${s.symbol}`,
    rank,
    suit: s.symbol,
    isRed: s.isRed,
  }))
);

function drawShuffledDeck(count: number): PlayingCard[] {
  const copy = [...FULL_DECK];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export default function SpeedCardsGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [cardCount, setCardCount] = useState(10);

  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [showOverview, setShowOverview] = useState(false);

  const [recalled, setRecalled] = useState<PlayingCard[]>([]);
  const [memoTimeSec, setMemoTimeSec] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = () => {
    setDeck(drawShuffledDeck(cardCount));
    setViewIndex(0);
    setShowOverview(false);
    setRecalled([]);
    setMemoTimeSec(0);
    setPhase('MEMORIZE');
  };

  useEffect(() => {
    if (phase !== 'MEMORIZE') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setMemoTimeSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Arrow keys to flip cards quickly during MEMORIZE
  useEffect(() => {
    if (phase !== 'MEMORIZE' || showOverview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setViewIndex((i) => Math.min(deck.length - 1, i + 1));
        playClick();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setViewIndex((i) => Math.max(0, i - 1));
        playClick();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, showOverview, deck.length]);

  const handlePickCard = (card: PlayingCard) => {
    if (phase !== 'RECALL') return;
    if (recalled.some((c) => c.id === card.id)) return;
    if (recalled.length >= deck.length) return;
    playClick();
    setRecalled((prev) => [...prev, card]);
  };

  const handleUndoCard = () => {
    if (recalled.length === 0) return;
    playClick();
    setRecalled((prev) => prev.slice(0, -1));
  };

  const correctMatches = deck.reduce(
    (sum, card, idx) => sum + (recalled[idx]?.id === card.id ? 1 : 0),
    0
  );
  const accuracy = deck.length > 0 ? Math.round((correctMatches / deck.length) * 100) : 0;
  const isPerfect = correctMatches === deck.length && deck.length > 0;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'speed-cards',
    won: accuracy >= 80,
    accuracy,
    scoreLabel: `${correctMatches}/${deck.length} lá (${memoTimeSec}s)`,
    durationSec: Math.max(1, memoTimeSec),
  });

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;
  const currentCard = deck[viewIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-rose-500">
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-rose-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'MEMORIZE' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-rose-500/40 text-rose-300 font-bold">
            ⏱ Ghi nhớ: {formatTime(memoTimeSec)}
          </span>
        )}
        {phase === 'RECALL' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-emerald-500/40 text-emerald-300 font-bold">
            Đã xếp: {recalled.length}/{deck.length} lá
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-red-500 mb-2">
              NHỚ BÀI TÂY SIÊU TỐC
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Speed Cards • Kỷ lục giải Vô địch Trí nhớ Thế giới
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-rose-400">Hệ thống PAO &amp; Cung điện Ký ức</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Ghi nhớ thứ tự chính xác của bộ bài tây xáo trộn ngẫu nhiên (từ 8 lá khởi động tới trọn bộ <strong className="text-white">52 lá</strong>), sau đó tái hiện lại đúng từng vị trí một.
              </p>
              <p className="text-xs text-slate-400">
                💡 Mẹo chuyên nghiệp: Dùng phím <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">← / →</kbd> hoặc Space để lật bài cực nhanh, hoặc chuyển sang chế độ xem dàn trải toàn bộ để liên kết câu chuyện.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Số Lượng Lá Bài
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[8, 15, 26, 52].map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setCardCount(cnt)}
                    className={`py-3 rounded-xl font-bold text-sm border cursor-pointer ${
                      cardCount === cnt
                        ? 'bg-rose-600 border-rose-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {cnt} Lá {cnt === 52 ? '(Đủ Bộ)' : ''}
                  </button>
                ))}
              </div>
              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                ♠ XÀO BÀI &amp; BẮT ĐẦU
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MEMORIZE */}
      {phase === 'MEMORIZE' && currentCard && (
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-6 animate-fade-in">
          <div className="flex gap-3">
            <button
              onClick={() => setShowOverview(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                !showOverview
                  ? 'bg-rose-600 border-rose-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Lật Từng Lá ({viewIndex + 1}/{deck.length})
            </button>
            <button
              onClick={() => setShowOverview(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                showOverview
                  ? 'bg-rose-600 border-rose-400 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              Xem Dàn Trải ({deck.length} lá)
            </button>
          </div>

          {!showOverview ? (
            <div className="flex flex-col items-center gap-6">
              <div
                key={currentCard.id}
                className={`w-52 h-76 rounded-3xl bg-white shadow-2xl border-4 border-slate-200 p-5 flex flex-col justify-between select-none animate-pop-in ${
                  currentCard.isRed ? 'text-red-600' : 'text-slate-900'
                }`}
              >
                <div className="text-left leading-none">
                  <div className="text-4xl font-black font-mono">{currentCard.rank}</div>
                  <div className="text-3xl">{currentCard.suit}</div>
                </div>
                <div className="text-7xl text-center">{currentCard.suit}</div>
                <div className="text-right leading-none rotate-180">
                  <div className="text-4xl font-black font-mono">{currentCard.rank}</div>
                  <div className="text-3xl">{currentCard.suit}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => setViewIndex((i) => Math.max(0, i - 1))}
                  disabled={viewIndex === 0}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 font-bold"
                >
                  ← Lá Trước
                </button>
                <span className="font-mono font-bold text-slate-400">
                  #{viewIndex + 1} / {deck.length}
                </span>
                <button
                  onClick={() => setViewIndex((i) => Math.min(deck.length - 1, i + 1))}
                  disabled={viewIndex === deck.length - 1}
                  className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-35 font-bold"
                >
                  Lá Tiếp →
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-2.5 bg-slate-900 p-5 rounded-3xl border border-slate-800">
              {deck.map((c, idx) => (
                <div
                  key={c.id}
                  className={`w-16 h-24 rounded-xl bg-white p-1.5 flex flex-col items-center justify-between shadow font-mono font-black ${
                    c.isRed ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 self-start">#{idx + 1}</span>
                  <span className="text-xl leading-none">{c.rank}</span>
                  <span className="text-xl leading-none">{c.suit}</span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => setPhase('RECALL')}
            className="mt-2 px-10 py-4 bg-gradient-to-r from-rose-600 to-red-600 rounded-2xl font-black text-white text-lg shadow-lg hover:scale-105 transition-transform"
          >
            TÔI ĐÃ NHỚ — BẮT ĐẦU XẾP BÀI!
          </button>
        </div>
      )}

      {/* RECALL */}
      {phase === 'RECALL' && (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
          {/* Sequence Tray */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase text-slate-400">
                Thứ tự bài bạn đang tái hiện ({recalled.length}/{deck.length}):
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleUndoCard}
                  disabled={recalled.length === 0}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-xs font-bold"
                >
                  ↩ Xóa Lá Cuối
                </button>
                <button
                  onClick={() => setPhase('RESULT')}
                  disabled={recalled.length === 0}
                  className="px-5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-black text-white"
                >
                  ✔ NỘP BÀI
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 min-h-14">
              {recalled.map((c, idx) => (
                <div
                  key={c.id}
                  className={`px-2.5 py-1.5 rounded-lg bg-white font-mono font-black text-sm shadow ${
                    c.isRed ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  <span className="text-[10px] text-slate-400 mr-1">{idx + 1}.</span>
                  {c.rank}
                  {c.suit}
                </div>
              ))}
            </div>
          </div>

          {/* 52-card picker grouped by suit */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            {SUITS.map((s) => (
              <div key={s.symbol} className="grid grid-cols-7 sm:grid-cols-13 gap-1.5">
                {RANKS.map((rank) => {
                  const card = FULL_DECK.find((c) => c.rank === rank && c.suit === s.symbol)!;
                  const alreadyPicked = recalled.some((c) => c.id === card.id);
                  return (
                    <button
                      key={card.id}
                      disabled={alreadyPicked || recalled.length >= deck.length}
                      onClick={() => handlePickCard(card)}
                      className={`py-2.5 rounded-lg font-mono font-black text-sm border transition-all cursor-pointer ${
                        alreadyPicked
                          ? 'bg-slate-950 border-slate-800 text-slate-700 cursor-default'
                          : s.isRed
                            ? 'bg-slate-800 hover:bg-white hover:text-red-600 border-slate-700 text-red-400'
                            : 'bg-slate-800 hover:bg-white hover:text-slate-900 border-slate-700 text-white'
                      }`}
                    >
                      {rank}
                      {s.symbol}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6 animate-fade-in-up">
          <div className="text-center">
            <div className="text-6xl mb-2">{isPerfect ? '🏆' : accuracy >= 70 ? '🃏' : '💥'}</div>
            <h2
              className={`text-4xl font-black mb-1 ${
                isPerfect ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPerfect ? 'TRÍ NHỚ TUYỆT ĐỐI 100%!' : `ĐÚNG ${correctMatches}/${deck.length} LÁ (${accuracy}%)`}
            </h2>
            <p className="text-slate-400 text-sm">
              Thời gian ghi nhớ: <strong className="text-white font-mono">{formatTime(memoTimeSec)}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {deck.map((expected, idx) => {
              const mine = recalled[idx];
              const ok = mine?.id === expected.id;
              return (
                <div
                  key={expected.id}
                  className={`p-3 rounded-xl border text-center font-mono ${
                    ok
                      ? 'bg-emerald-950/30 border-emerald-500/60'
                      : 'bg-red-950/30 border-red-500/60'
                  }`}
                >
                  <div className="text-[10px] text-slate-400 mb-1">Vị trí #{idx + 1}</div>
                  <div className="text-lg font-black text-white">
                    {expected.rank}
                    <span className={expected.isRed ? 'text-red-400' : 'text-slate-200'}>
                      {expected.suit}
                    </span>
                  </div>
                  {!ok && (
                    <div className="text-xs text-red-400 mt-0.5 line-through">
                      {mine ? `${mine.rank}${mine.suit}` : '(Trống)'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-4 max-w-md mx-auto">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Cấu Hình
            </button>
            <button
              onClick={startGame}
              className="flex-1 py-3.5 bg-gradient-to-r from-rose-600 to-red-600 rounded-xl font-bold text-white"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
