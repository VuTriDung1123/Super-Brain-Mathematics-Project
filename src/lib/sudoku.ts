export type Difficulty = 'easy' | 'medium' | 'hard';
export type StandardGridSize = '2x2' | '2x3' | '3x3';
export type GridSize = StandardGridSize | '4x4';

export interface GridConfig {
  total: number;
  rows: number;
  cols: number;
  cellSize: number;
}

export const GRID_CONFIG: Record<GridSize, GridConfig> = {
  '2x2': { total: 4, rows: 2, cols: 2, cellSize: 1.2 },
  '2x3': { total: 6, rows: 2, cols: 3, cellSize: 0.8 },
  '3x3': { total: 9, rows: 3, cols: 3, cellSize: 0.6 },
  '4x4': { total: 16, rows: 4, cols: 4, cellSize: 0.35 },
};

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function isSafe(
  board: number[][],
  row: number,
  col: number,
  num: number,
  config: GridConfig
): boolean {
  const { total, rows, cols } = config;

  for (let x = 0; x < total; x++) {
    if (board[row][x] === num) return false;
    if (board[x][col] === num) return false;
  }

  const startRow = row - (row % rows);
  const startCol = col - (col % cols);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (board[i + startRow][j + startCol] === num) return false;
    }
  }
  return true;
}

/**
 * Generates a randomized, 100% valid completed Sudoku board in O(N^2) time
 * for any (rows x cols) subgrid geometry (4x4, 6x6, 9x9, 16x16) via
 * canonical shifted pattern + validity-preserving group/band/stack/symbol permutations.
 */
export function generateSolvedBoard(config: GridConfig): number[][] {
  const { total, rows, cols } = config;

  // Base valid Sudoku pattern: ((r % rows) * cols + floor(r / rows) + c) % total
  const symbols = shuffleArray(Array.from({ length: total }, (_, i) => i + 1));

  const rowBands = shuffleArray(Array.from({ length: cols }, (_, i) => i));
  const rowOrder: number[] = [];
  for (const band of rowBands) {
    const rowsInBand = shuffleArray(Array.from({ length: rows }, (_, i) => band * rows + i));
    rowOrder.push(...rowsInBand);
  }

  const colStacks = shuffleArray(Array.from({ length: rows }, (_, i) => i));
  const colOrder: number[] = [];
  for (const stack of colStacks) {
    const colsInStack = shuffleArray(Array.from({ length: cols }, (_, i) => stack * cols + i));
    colOrder.push(...colsInStack);
  }

  const board = Array.from({ length: total }, (_, rIdx) => {
    const r = rowOrder[rIdx];
    return Array.from({ length: total }, (_, cIdx) => {
      const c = colOrder[cIdx];
      const baseVal = ((r % rows) * cols + Math.floor(r / rows) + c) % total;
      return symbols[baseVal];
    });
  });

  if (rows === cols && Math.random() < 0.5) {
    return Array.from({ length: total }, (_, r) =>
      Array.from({ length: total }, (_, c) => board[c][r])
    );
  }

  return board;
}

/**
 * MRV-accelerated backtracking solver that counts up to `limit` solutions.
 */
export function countSolutions(
  board: number[][],
  config: GridConfig,
  count: { val: number } = { val: 0 },
  limit = 2
): number {
  if (count.val >= limit) return count.val;

  const { total } = config;
  let bestR = -1;
  let bestC = -1;
  let bestCandidates: number[] | null = null;

  for (let r = 0; r < total; r++) {
    for (let c = 0; c < total; c++) {
      if (board[r][c] === 0) {
        const candidates: number[] = [];
        for (let num = 1; num <= total; num++) {
          if (isSafe(board, r, c, num, config)) {
            candidates.push(num);
          }
        }
        if (candidates.length === 0) return count.val;
        if (!bestCandidates || candidates.length < bestCandidates.length) {
          bestR = r;
          bestC = c;
          bestCandidates = candidates;
          if (candidates.length === 1) break;
        }
      }
    }
    if (bestCandidates && bestCandidates.length === 1) break;
  }

  if (bestR === -1 || !bestCandidates) {
    count.val++;
    return count.val;
  }

  for (const num of bestCandidates) {
    board[bestR][bestC] = num;
    countSolutions(board, config, count, limit);
    board[bestR][bestC] = 0;
    if (count.val >= limit) return count.val;
  }

  return count.val;
}

export function generateUniquePuzzle(
  size: GridSize,
  difficulty: Difficulty
): { puzzle: number[][]; solution: number[][] } {
  const config = GRID_CONFIG[size];
  const { total } = config;

  const solution = generateSolvedBoard(config);
  const puzzle = solution.map((row) => [...row]);

  const totalCells = total * total;
  let keepRatio = 0.45;
  if (difficulty === 'easy') keepRatio = 0.6;
  else if (difficulty === 'hard') keepRatio = 0.3;

  let toRemove = totalCells - Math.floor(totalCells * keepRatio);
  if (size === '4x4') {
    toRemove = difficulty === 'hard' ? 120 : difficulty === 'medium' ? 85 : 50;
  }

  const positions: { r: number; c: number }[] = [];
  for (let r = 0; r < total; r++) {
    for (let c = 0; c < total; c++) {
      positions.push({ r, c });
    }
  }
  const shuffledPositions = shuffleArray(positions);

  for (const { r, c } of shuffledPositions) {
    if (toRemove <= 0) break;

    const backup = puzzle[r][c];
    puzzle[r][c] = 0;

    if (size !== '4x4') {
      const copyBoard = puzzle.map((row) => [...row]);
      const solutions = countSolutions(copyBoard, config, { val: 0 }, 2);
      if (solutions !== 1) {
        puzzle[r][c] = backup;
      } else {
        toRemove--;
      }
    } else {
      toRemove--;
    }
  }

  return { puzzle, solution };
}

/**
 * Validates that a player's board is a fully filled, legal Sudoku
 * and preserves every non-zero clue from initialBoard (if provided).
 */
export function isValidCompletedSudoku(
  board: number[][],
  initialBoard: number[][] | null,
  config: GridConfig
): boolean {
  const { total, rows, cols } = config;
  if (board.length !== total) return false;

  for (let r = 0; r < total; r++) {
    if (!board[r] || board[r].length !== total) return false;
    const rowSet = new Set<number>();
    for (let c = 0; c < total; c++) {
      const val = board[r][c];
      if (!Number.isInteger(val) || val < 1 || val > total) return false;
      if (initialBoard && initialBoard[r]?.[c] !== 0 && val !== initialBoard[r][c]) {
        return false;
      }
      if (rowSet.has(val)) return false;
      rowSet.add(val);
    }
  }

  for (let c = 0; c < total; c++) {
    const colSet = new Set<number>();
    for (let r = 0; r < total; r++) {
      const val = board[r][c];
      if (colSet.has(val)) return false;
      colSet.add(val);
    }
  }

  for (let br = 0; br < total; br += rows) {
    for (let bc = 0; bc < total; bc += cols) {
      const boxSet = new Set<number>();
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const val = board[br + i][bc + j];
          if (boxSet.has(val)) return false;
          boxSet.add(val);
        }
      }
    }
  }

  return true;
}
