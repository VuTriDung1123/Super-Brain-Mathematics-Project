'use client';

export type CategoryId =
  | 'mental-math'
  | 'sudoku-logic'
  | 'spatial'
  | 'applied-math'
  | 'battle'
  | 'classic';

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
    colorHex: '#6ea8c9', // Asagi-iro (Traditional Pale Indigo)
    badgeClass: 'text-[#8ec5e6] border-[#6ea8c9]/40 bg-[#1b2936]/60',
    href: '/mental-math',
  },
  'sudoku-logic': {
    title: 'Sudoku & Logic Số',
    shortLabel: 'Sudoku & Logic',
    colorHex: '#c09bd8', // Fuji-iro (Wisteria Purple)
    badgeClass: 'text-[#d8b4f0] border-[#c09bd8]/40 bg-[#2c1d38]/60',
    href: '/sudoku-logic',
  },
  spatial: {
    title: 'Hình học & Không gian',
    shortLabel: 'Không Gian 3D',
    colorHex: '#e5b85c', // Kohaku / Kinpaku Gold
    badgeClass: 'text-[#f3d37a] border-[#d4af37]/40 bg-[#332713]/60',
    href: '/spatial',
  },
  'applied-math': {
    title: 'Toán ứng dụng & Mã hóa',
    shortLabel: 'Toán Ứng Dụng',
    colorHex: '#6db58c', // Rokushō / Matcha Jade
    badgeClass: 'text-[#8fd4ac] border-[#6db58c]/40 bg-[#172e23]/60',
    href: '/applied-math',
  },
  battle: {
    title: 'Tốc độ & Độ chính xác',
    shortLabel: 'Tốc Độ & AI',
    colorHex: '#e05248', // Shu-iro (Torii Vermilion)
    badgeClass: 'text-[#f2857d] border-[#c83e37]/50 bg-[#381617]/60',
    href: '/battle',
  },
  classic: {
    title: 'Siêu Trí Tuệ Kinh Điển',
    shortLabel: 'Kinh Điển',
    colorHex: '#f7c6d4', // Sakura-iro (Cherry Blossom)
    badgeClass: 'text-[#fbd5df] border-[#f7c6d4]/45 bg-[#381a26]/60',
    href: '/classic',
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

  // Category 6: Classic Super Brain (16 iconic games)
  { id: 'knights-tour', name: "Blind Knight's Tour", vnName: 'Mã Đi Tuần Ẩn', category: 'classic', href: '/classic/knights-tour' },
  { id: 'logic-bridges', name: 'Logic Tung Hoành', vnName: 'Logic Tung Hoành', category: 'classic', href: '/classic/logic-bridges' },
  { id: 'sliding-puzzle', name: 'Huarong Dao / 15-Puzzle', vnName: 'Hoa Dung Đạo Số', category: 'classic', href: '/classic/sliding-puzzle' },
  { id: 'nonogram', name: 'Nonogram Picross', vnName: 'Giải Mã Ảnh Ẩn', category: 'classic', href: '/classic/nonogram' },
  { id: 'untangle', name: 'Planarity Untangle', vnName: 'Gỡ Rối Mạng Nhện', category: 'classic', href: '/classic/untangle' },

  { id: 'three-view', name: '3-View Projection', vnName: 'Ba Hình Chiếu 3D', category: 'classic', href: '/classic/three-view' },
  { id: 'origami-punch', name: 'Origami Hole Punch', vnName: 'Gấp Giấy Đục Lỗ', category: 'classic', href: '/classic/origami-punch' },
  { id: 'honeycomb-maze', name: 'Honeycomb Maze', vnName: 'Mê Cung Tổ Ong', category: 'classic', href: '/classic/honeycomb-maze' },
  { id: 'layer-overlay', name: 'Layer Overlay XOR', vnName: 'Tầng Tầng Điệp Ảnh', category: 'classic', href: '/classic/layer-overlay' },

  { id: 'pixel-wall', name: 'Pixel Wall Memory', vnName: 'Bức Tường Điểm Ảnh', category: 'classic', href: '/classic/pixel-wall' },
  { id: 'speed-cards', name: 'Speed Cards', vnName: 'Nhớ Bài Tây Siêu Tốc', category: 'classic', href: '/classic/speed-cards' },
  { id: 'dual-n-back', name: 'Dual N-Back', vnName: 'Dual N-Back', category: 'classic', href: '/classic/dual-n-back' },
  { id: 'path-memory', name: 'Path Memory Trace', vnName: 'Truy Tìm Dấu Vết', category: 'classic', href: '/classic/path-memory' },

  { id: 'schulte-table', name: 'Schulte Table', vnName: 'Bảng Schulte', category: 'classic', href: '/classic/schulte-table' },
  { id: 'magic-square', name: 'Magic Square', vnName: 'Ma Phương', category: 'classic', href: '/classic/magic-square' },
  { id: 'tower-of-hanoi', name: 'Tower of Hanoi', vnName: 'Tháp Hà Nội', category: 'classic', href: '/classic/tower-of-hanoi' },
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
    'classic',
  ];
  const ratings: Record<CategoryId, number> = {
    'mental-math': 0,
    'sudoku-logic': 0,
    spatial: 0,
    'applied-math': 0,
    battle: 0,
    classic: 0,
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
