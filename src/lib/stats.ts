'use client';

export type CategoryId =
  | 'mental-math'
  | 'sudoku-logic'
  | 'spatial'
  | 'applied-math'
  | 'battle';

export interface SessionRecord {
  id: string;
  gameId: string;
  gameName: string;
  category: CategoryId;
  won: boolean;
  accuracy: number; // 0..100
  scoreLabel: string;
  durationSec?: number;
  timestamp: number;
}

export interface GameRecord {
  gameId: string;
  plays: number;
  wins: number;
  bestAccuracy: number;
  bestTimeSec: number | null;
  lastScoreLabel: string;
  lastPlayedAt: number;
}

export interface TrainingStats {
  totalPlays: number;
  totalWins: number;
  currentStreak: number;
  longestStreak: number;
  lastTrainedDate: string | null; // YYYY-MM-DD
  games: Record<string, GameRecord>;
  history: SessionRecord[];
}

export interface GameCatalogItem {
  id: string;
  name: string;
  vnName: string;
  category: CategoryId;
  href: string;
}

export const CATEGORY_META: Record<
  CategoryId,
  { title: string; shortLabel: string; colorHex: string; badgeClass: string; href: string }
> = {
  'mental-math': {
    title: 'Tính nhẩm siêu tốc',
    shortLabel: 'Tính Nhẩm',
    colorHex: '#06b6d4',
    badgeClass: 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40',
    href: '/mental-math',
  },
  'sudoku-logic': {
    title: 'Sudoku & Logic Số',
    shortLabel: 'Sudoku & Logic',
    colorHex: '#a855f7',
    badgeClass: 'text-purple-400 border-purple-500/40 bg-purple-950/40',
    href: '/sudoku-logic',
  },
  spatial: {
    title: 'Hình học & Không gian',
    shortLabel: 'Không Gian 3D',
    colorHex: '#f97316',
    badgeClass: 'text-orange-400 border-orange-500/40 bg-orange-950/40',
    href: '/spatial',
  },
  'applied-math': {
    title: 'Toán ứng dụng & Mã hóa',
    shortLabel: 'Toán Ứng Dụng',
    colorHex: '#10b981',
    badgeClass: 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40',
    href: '/applied-math',
  },
  battle: {
    title: 'Tốc độ & Độ chính xác',
    shortLabel: 'Tốc Độ & AI',
    colorHex: '#f43f5e',
    badgeClass: 'text-rose-400 border-rose-500/40 bg-rose-950/40',
    href: '/battle',
  },
};

export const GAME_CATALOG: GameCatalogItem[] = [
  { id: 'flash-anzan', name: 'Flash Anzan', vnName: 'Cộng Số Siêu Tốc', category: 'mental-math', href: '/mental-math/flash-anzan' },
  { id: 'complex-calc', name: 'Complex Calculation', vnName: 'Nhân Chia Đa Chữ Số', category: 'mental-math', href: '/mental-math/complex-calc' },
  { id: 'double-task', name: 'Double Arithmetic', vnName: 'Tính Nhẩm Song Hành', category: 'mental-math', href: '/mental-math/double-task' },
  { id: 'root-extraction', name: 'Root Extraction', vnName: 'Khai Căn Bậc Cao', category: 'mental-math', href: '/mental-math/root-extraction' },

  { id: 'blind-sudoku', name: 'Blind Sudoku', vnName: 'Sudoku Mù', category: 'sudoku-logic', href: '/sudoku-logic/blind' },
  { id: 'cube-sudoku', name: 'Cube Sudoku', vnName: 'Sudoku Lập Phương 3D', category: 'sudoku-logic', href: '/sudoku-logic/cube' },
  { id: 'chromatic-sudoku', name: 'Chromatic Sudoku', vnName: 'Sudoku Sắc Màu', category: 'sudoku-logic', href: '/sudoku-logic/chromatic' },
  { id: 'number-maze', name: 'Number Maze', vnName: 'Mê Cung Số', category: 'sudoku-logic', href: '/sudoku-logic/maze' },

  { id: 'cube-folding', name: 'Cube Net Folding', vnName: 'Triển Khai Hình Khối', category: 'spatial', href: '/spatial/cube-folding' },
  { id: 'tangram', name: 'Tangram Studio', vnName: 'Ghép Hình Tangram', category: 'spatial', href: '/spatial/tangram' },
  { id: 'maze-3d', name: 'Spatial 3D Maze', vnName: 'Mê Cung Không Gian 3D', category: 'spatial', href: '/spatial/maze-3d' },
  { id: 'geometry', name: 'Geometric Decomposition', vnName: 'Phân Hình Học', category: 'spatial', href: '/spatial/geometry' },

  { id: 'signal-decoding', name: 'Signal & Cipher Lab', vnName: 'Giải Mã Tín Hiệu', category: 'applied-math', href: '/applied-math/signal-decoding' },
  { id: 'trajectory', name: 'Trajectory & Optics', vnName: 'Quỹ Đạo Chuyển Động', category: 'applied-math', href: '/applied-math/trajectory' },
  { id: 'graph-theory', name: 'Graph Theory Arena', vnName: 'Lý Thuyết Đồ Thị', category: 'applied-math', href: '/applied-math/graph-theory' },

  { id: 'math-arena', name: 'Math Battle Arena', vnName: 'Trận Chiến Tính Toán', category: 'battle', href: '/battle/math-arena' },
  { id: 'quick-reflex', name: 'Hyper Reflex & Stroop', vnName: 'Phản Xạ Nhanh', category: 'battle', href: '/battle/quick-reflex' },
];

const STATS_KEY = 'brain_training_stats_v1';
export const STATS_CHANGE_EVENT = 'brain-stats-change';

export function getEmptyStats(): TrainingStats {
  return {
    totalPlays: 0,
    totalWins: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastTrainedDate: null,
    games: {},
    history: [],
  };
}

function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

const EMPTY_STATS_SNAPSHOT: TrainingStats = {
  totalPlays: 0,
  totalWins: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastTrainedDate: null,
  games: {},
  history: [],
};

let cachedRawStats: string | null = null;
let cachedParsedStats: TrainingStats = EMPTY_STATS_SNAPSHOT;

export function getStatsServerSnapshot(): TrainingStats {
  return EMPTY_STATS_SNAPSHOT;
}

export function getStatsSnapshot(): TrainingStats {
  if (typeof window === 'undefined') return EMPTY_STATS_SNAPSHOT;
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    if (raw === cachedRawStats) return cachedParsedStats;
    cachedRawStats = raw;
    if (!raw) {
      cachedParsedStats = EMPTY_STATS_SNAPSHOT;
      return cachedParsedStats;
    }
    const parsed = JSON.parse(raw) as Partial<TrainingStats>;
    cachedParsedStats = {
      totalPlays: parsed.totalPlays ?? 0,
      totalWins: parsed.totalWins ?? 0,
      currentStreak: parsed.currentStreak ?? 0,
      longestStreak: parsed.longestStreak ?? 0,
      lastTrainedDate: parsed.lastTrainedDate ?? null,
      games: parsed.games ?? {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
    return cachedParsedStats;
  } catch {
    return EMPTY_STATS_SNAPSHOT;
  }
}

export function subscribeStats(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(STATS_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(STATS_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function getStats(): TrainingStats {
  const snap = getStatsSnapshot();
  return {
    ...snap,
    games: { ...snap.games },
    history: [...snap.history],
  };
}

export function recordGameSession(input: {
  gameId: string;
  won: boolean;
  accuracy: number;
  scoreLabel: string;
  durationSec?: number;
}): void {
  if (typeof window === 'undefined') return;
  const catalogItem = GAME_CATALOG.find((g) => g.id === input.gameId);
  if (!catalogItem) return;

  const stats = getStats();
  const now = Date.now();
  const today = getLocalDateKey();
  const yesterday = getYesterdayKey();

  // Update daily streak
  if (stats.lastTrainedDate !== today) {
    if (stats.lastTrainedDate === yesterday) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    stats.lastTrainedDate = today;
  }

  stats.totalPlays += 1;
  if (input.won) stats.totalWins += 1;

  const clampedAcc = Math.max(0, Math.min(100, Math.round(input.accuracy)));
  const existing = stats.games[input.gameId];

  const nextBestTime =
    input.won && typeof input.durationSec === 'number' && input.durationSec > 0
      ? existing?.bestTimeSec != null
        ? Math.min(existing.bestTimeSec, input.durationSec)
        : input.durationSec
      : existing?.bestTimeSec ?? null;

  stats.games[input.gameId] = {
    gameId: input.gameId,
    plays: (existing?.plays ?? 0) + 1,
    wins: (existing?.wins ?? 0) + (input.won ? 1 : 0),
    bestAccuracy: Math.max(existing?.bestAccuracy ?? 0, clampedAcc),
    bestTimeSec: nextBestTime,
    lastScoreLabel: input.scoreLabel,
    lastPlayedAt: now,
  };

  const session: SessionRecord = {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    gameId: catalogItem.id,
    gameName: catalogItem.vnName,
    category: catalogItem.category,
    won: input.won,
    accuracy: clampedAcc,
    scoreLabel: input.scoreLabel,
    durationSec: input.durationSec,
    timestamp: now,
  };

  stats.history = [session, ...stats.history].slice(0, 150);

  window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  window.dispatchEvent(new Event(STATS_CHANGE_EVENT));
}

export function resetStats(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STATS_KEY);
  window.dispatchEvent(new Event(STATS_CHANGE_EVENT));
}

/**
 * Computes a 0..100 Brain Skill Rating per category based on accuracy, win rate, and game coverage.
 */
export function computeCategoryRatings(stats: TrainingStats): Record<CategoryId, number> {
  const categories: CategoryId[] = [
    'mental-math',
    'sudoku-logic',
    'spatial',
    'applied-math',
    'battle',
  ];
  const ratings: Record<CategoryId, number> = {
    'mental-math': 0,
    'sudoku-logic': 0,
    spatial: 0,
    'applied-math': 0,
    battle: 0,
  };

  for (const cat of categories) {
    const catGames = GAME_CATALOG.filter((g) => g.category === cat);
    const catSessions = stats.history.filter((s) => s.category === cat).slice(0, 20);
    if (catSessions.length === 0) {
      ratings[cat] = 0;
      continue;
    }
    const avgAcc = catSessions.reduce((sum, s) => sum + s.accuracy, 0) / catSessions.length;
    const triedCount = catGames.filter((g) => (stats.games[g.id]?.plays ?? 0) > 0).length;
    const coverageBonus = (triedCount / catGames.length) * 20;
    const volumeBonus = Math.min(10, catSessions.length * 1.5);
    ratings[cat] = Math.min(100, Math.round(avgAcc * 0.7 + coverageBonus + volumeBonus));
  }

  return ratings;
}
