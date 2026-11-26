'use client';

import { useState } from 'react';
import Link from 'next/link';
import { playSuccess, playError } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type ModeType = 'triangles' | 'cubes' | 'rotation' | 'mixed';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameSettings {
  mode: ModeType;
  difficulty: Difficulty;
  rounds: number;
}

interface TriangleQuestion {
  kind: 'triangles';
  prompt: string;
  vertices: [number, number][];
  segments: [number, number][];
  answer: number;
  explanation: string;
}

interface CubeStackQuestion {
  kind: 'cubes';
  prompt: string;
  heights: number[][];
  answer: number;
  explanation: string;
}

interface RotationQuestion {
  kind: 'rotation';
  prompt: string;
  sourceGrid: number[][];
  options: number[][][];
  correctIndex: number;
  explanation: string;
}

type GeoQuestion = TriangleQuestion | CubeStackQuestion | RotationQuestion;

// --- EXACT TRIANGLE COUNTER VIA LINE-GROUP GRAPH ENUMERATION ---
function buildApexTriangleQuestion(difficulty: Difficulty): TriangleQuestion {
  // Structured apex triangle with `rays` internal rays from apex to base + `levels` horizontal cuts
  const rays =
    difficulty === 'easy'
      ? Math.floor(Math.random() * 2) + 2 // 2..3 internal rays -> 3..4 base segments
      : difficulty === 'medium'
        ? Math.floor(Math.random() * 2) + 3 // 3..4
        : Math.floor(Math.random() * 2) + 4; // 4..5
  const levels =
    difficulty === 'easy'
      ? Math.floor(Math.random() * 2) + 2 // 2..3 horizontal lines
      : difficulty === 'medium'
        ? Math.floor(Math.random() * 2) + 3 // 3..4
        : Math.floor(Math.random() * 2) + 4; // 4..5

  // Optional diagonal cross on the bottom band for Hard mode
  const addSubCross = difficulty === 'hard' && Math.random() < 0.5;

  const apex: [number, number] = [200, 30];
  const baseY = 330;
  const leftX = 35;
  const rightX = 365;
  const numCols = rays + 2; // total rays including 2 outer sides

  const vertices: [number, number][] = [apex];
  const lineSets: number[][] = [];

  // Create grid of vertices along rays x levels
  const gridIdx: number[][] = [];
  for (let lv = 1; lv <= levels; lv++) {
    const t = lv / levels;
    const rowIndices: number[] = [];
    for (let c = 0; c < numCols; c++) {
      const s = c / (numCols - 1);
      const bx = leftX + s * (rightX - leftX);
      const vx = apex[0] + t * (bx - apex[0]);
      const vy = apex[1] + t * (baseY - apex[1]);
      rowIndices.push(vertices.length);
      vertices.push([vx, vy]);
    }
    gridIdx.push(rowIndices);
  }

  // Ray lines: apex + gridIdx[lv][c]
  const segments: [number, number][] = [];
  for (let c = 0; c < numCols; c++) {
    const rayLine = [0, ...gridIdx.map((row) => row[c])];
    lineSets.push(rayLine);
    segments.push([0, rayLine[rayLine.length - 1]]);
  }

  // Horizontal lines
  for (let lv = 0; lv < levels; lv++) {
    lineSets.push([...gridIdx[lv]]);
    segments.push([gridIdx[lv][0], gridIdx[lv][numCols - 1]]);
  }

  // Optional extra cross line from bottom-left to right edge at level 1 (creates rich intersections? Keep exact vertices!)
  if (addSubCross && levels >= 2) {
    // Diagonal connecting existing vertices: (lv=0, col=0) -> (lv=1, col=1) -> ... if aligned?
    // Better: diagonal across ONE trapezoid (gridIdx[levels-2][0] to gridIdx[levels-1][1]) — strictly 2 existing vertices, no new interior crossings!
    const u = gridIdx[levels - 2][0];
    const v = gridIdx[levels - 1][1];
    lineSets.push([u, v]);
    segments.push([u, v]);
  }

  // Build exact collinearity adjacency matrix: two vertices are connected by a straight segment iff they share a line in lineSets
  const n = vertices.length;
  const connected = Array.from({ length: n }, () => new Set<number>());
  for (const line of lineSets) {
    for (let i = 0; i < line.length; i++) {
      for (let j = i + 1; j < line.length; j++) {
        connected[line[i]].add(line[j]);
        connected[line[j]].add(line[i]);
      }
    }
  }

  const areCollinear = (a: number, b: number, c: number) => {
    const [x1, y1] = vertices[a];
    const [x2, y2] = vertices[b];
    const [x3, y3] = vertices[c];
    return Math.abs((x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)) < 1e-3;
  };

  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (!connected[i].has(j)) continue;
      for (let k = j + 1; k < n; k++) {
        if (connected[i].has(k) && connected[j].has(k) && !areCollinear(i, j, k)) {
          count++;
        }
      }
    }
  }

  const baseTri = ((numCols * (numCols - 1)) / 2) * levels;
  const explanation = addSubCross
    ? `Có ${numCols} tia từ đỉnh và ${levels} tầng ngang tạo ra C(${numCols}, 2) × ${levels} = ${baseTri} tam giác chuẩn, cộng thêm ${count - baseTri} tam giác từ đoạn chéo phụ = ${count} tam giác.`
    : `Công thức tổ hợp: C(${numCols}, 2) cách chọn 2 tia từ đỉnh × ${levels} cạnh đáy ngang = ${count} tam giác.`;

  return {
    kind: 'triangles',
    prompt: 'Đếm chính xác TỔNG SỐ TAM GIÁC có trong hình dưới đây:',
    vertices,
    segments,
    answer: count,
    explanation,
  };
}

// --- EXACT ISOMETRIC CUBE STACK GENERATOR ---
function buildCubeStackQuestion(difficulty: Difficulty): CubeStackQuestion {
  const size = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 3 : 4;
  const maxH = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;

  // Monotone non-increasing from back (r=0, c=0) to front (r=size-1, c=size-1)
  // so no taller front column completely hides an unexpected hollow back column -> 100% unambiguous!
  const heights: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const upper = Math.min(
        r > 0 ? heights[r - 1][c] : maxH,
        c > 0 ? heights[r][c - 1] : maxH
      );
      const minVal = r === 0 && c === 0 ? Math.max(2, maxH - 1) : 0;
      heights[r][c] = Math.floor(Math.random() * (upper - minVal + 1)) + minVal;
    }
  }

  let total = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      total += heights[r][c];
    }
  }

  const rowsDesc = heights.map((row, idx) => `Hàng ${idx + 1}: [${row.join(', ')}]`).join(' • ');

  return {
    kind: 'cubes',
    prompt: 'Tính TỔNG SỐ KHỐI LẬP PHƯƠNG ĐƠN VỊ (tính cả các khối bị khuất đỡ bên dưới):',
    heights,
    answer: total,
    explanation: `Độ cao từng cột từ sau ra trước: ${rowsDesc} → Tổng = ${total} khối.`,
  };
}

// --- MENTAL ROTATION / SYMMETRY GENERATOR ---
function rotateGrid90(grid: number[][]): number[][] {
  const n = grid.length;
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => grid[n - 1 - c][r])
  );
}

function flipGridHorizontal(grid: number[][]): number[][] {
  return grid.map((row) => [...row].reverse());
}

const gridKey = (g: number[][]) => g.map((r) => r.join('')).join('/');

function buildRotationQuestion(difficulty: Difficulty): RotationQuestion {
  const n = difficulty === 'easy' ? 4 : 5;
  const cellsTarget = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;

  // Generate an asymmetric connected-ish colored pattern
  let source: number[][] = [];
  let attempts = 0;
  while (attempts < 40) {
    attempts++;
    const g = Array.from({ length: n }, () => Array(n).fill(0));
    let cr = Math.floor(n / 2);
    let cc = Math.floor(n / 2);
    g[cr][cc] = 1;
    let filled = 1;
    let guard = 0;
    while (filled < cellsTarget && guard < 100) {
      guard++;
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      const [dr, dc] = dirs[Math.floor(Math.random() * 4)];
      const nr = cr + dr;
      const nc = cc + dc;
      if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
        cr = nr;
        cc = nc;
        if (g[cr][cc] === 0) {
          g[cr][cc] = filled <= 2 ? 2 : 1; // Accent color cells make chirality super clear
          filled++;
        }
      }
    }

    // Ensure asymmetric under reflection so mirrored options are genuinely different
    const r0 = gridKey(g);
    const r1 = gridKey(rotateGrid90(g));
    const r2 = gridKey(rotateGrid90(rotateGrid90(g)));
    const r3 = gridKey(rotateGrid90(rotateGrid90(rotateGrid90(g))));
    const validRots = new Set([r0, r1, r2, r3]);
    const flipped = flipGridHorizontal(g);
    if (!validRots.has(gridKey(flipped))) {
      source = g;
      break;
    }
  }

  const rots = [
    rotateGrid90(source),
    rotateGrid90(rotateGrid90(source)),
    rotateGrid90(rotateGrid90(rotateGrid90(source))),
  ];
  const chosenRotIdx = Math.floor(Math.random() * 3);
  const correctGrid = rots[chosenRotIdx];
  const degLabel = (chosenRotIdx + 1) * 90;

  const validKeys = new Set([
    gridKey(source),
    gridKey(rots[0]),
    gridKey(rots[1]),
    gridKey(rots[2]),
  ]);

  const distractors: number[][][] = [];
  const used = new Set<string>([gridKey(correctGrid)]);

  const flippedBase = flipGridHorizontal(source);
  const flippedVariants = [
    flippedBase,
    rotateGrid90(flippedBase),
    rotateGrid90(rotateGrid90(flippedBase)),
    rotateGrid90(rotateGrid90(rotateGrid90(flippedBase))),
  ];

  for (const fv of flippedVariants) {
    const k = gridKey(fv);
    if (!validKeys.has(k) && !used.has(k) && distractors.length < 3) {
      used.add(k);
      distractors.push(fv);
    }
  }

  // Fallback mutation distractor if needed
  let safety = 0;
  while (distractors.length < 3 && safety < 50) {
    safety++;
    const mutated = correctGrid.map((row) => [...row]);
    const r = Math.floor(Math.random() * n);
    const c = Math.floor(Math.random() * n);
    mutated[r][c] = mutated[r][c] === 0 ? 1 : 0;
    const k = gridKey(mutated);
    if (!validKeys.has(k) && !used.has(k)) {
      used.add(k);
      distractors.push(mutated);
    }
  }

  const combined = [
    { grid: correctGrid, ok: true },
    ...distractors.slice(0, 3).map((grid) => ({ grid, ok: false })),
  ].sort(() => Math.random() - 0.5);

  return {
    kind: 'rotation',
    prompt: 'Hình nào dưới đây là kết quả XOAY ĐÚNG (không lật gương) của mẫu gốc?',
    sourceGrid: source,
    options: combined.map((c) => c.grid),
    correctIndex: combined.findIndex((c) => c.ok),
    explanation: `Hình đúng là mẫu gốc xoay thuận chiều kim đồng hồ ${degLabel}° (3 phương án còn lại đều bị lật gương hoặc lệch ô).`,
  };
}

function generateGeoQuestion(mode: ModeType, difficulty: Difficulty): GeoQuestion {
  const actualMode: Exclude<ModeType, 'mixed'> =
    mode === 'mixed'
      ? (['triangles', 'cubes', 'rotation'] as const)[Math.floor(Math.random() * 3)]
      : mode;

  if (actualMode === 'triangles') return buildApexTriangleQuestion(difficulty);
  if (actualMode === 'cubes') return buildCubeStackQuestion(difficulty);
  return buildRotationQuestion(difficulty);
}

/** Crisp Isometric Cube Stack SVG using painter's algorithm */
function CubeStackSVG({ heights }: { heights: number[][] }) {
  const size = heights.length;
  const tileW = 36;
  const tileH = 20;
  const cubeH = 26;
  const originX = 200;
  const originY = 120;

  const cubes: { r: number; c: number; h: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      for (let h = 0; h < heights[r][c]; h++) {
        cubes.push({ r, c, h });
      }
    }
  }

  // Painter's order: back to front (r+c ascending), bottom to top (h ascending)
  cubes.sort((a, b) => a.r + a.c - (b.r + b.c) || a.h - b.h);

  return (
    <svg viewBox="0 0 400 320" className="w-full max-w-md h-auto mx-auto">
      {cubes.map(({ r, c, h }) => {
        const cx = originX + (c - r) * tileW;
        const cy = originY + (c + r) * tileH - h * cubeH;

        const topPts = `${cx},${cy - tileH} ${cx + tileW},${cy} ${cx},${cy + tileH} ${cx - tileW},${cy}`;
        const leftPts = `${cx - tileW},${cy} ${cx},${cy + tileH} ${cx},${cy + tileH + cubeH} ${cx - tileW},${cy + cubeH}`;
        const rightPts = `${cx + tileW},${cy} ${cx},${cy + tileH} ${cx},${cy + tileH + cubeH} ${cx + tileW},${cy + cubeH}`;

        return (
          <g key={`${r}-${c}-${h}`}>
            <polygon points={topPts} fill="#fb923c" stroke="#0f172a" strokeWidth="1.5" />
            <polygon points={leftPts} fill="#ea580c" stroke="#0f172a" strokeWidth="1.5" />
            <polygon points={rightPts} fill="#9a3412" stroke="#0f172a" strokeWidth="1.5" />
          </g>
        );
      })}
    </svg>
  );
}

function PatternGridView({ grid, compact = false }: { grid: number[][]; compact?: boolean }) {
  const n = grid.length;
  return (
    <div
      className="grid gap-1 bg-slate-950 p-2 rounded-xl border border-slate-800 mx-auto w-fit"
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      {grid.map((row, r) =>
        row.map((val, c) => (
          <div
            key={`${r}-${c}`}
            className={`${compact ? 'w-6 h-6 sm:w-7 sm:h-7' : 'w-9 h-9 sm:w-11 sm:h-11'} rounded-md border transition-colors ${
              val === 2
                ? 'bg-amber-400 border-amber-200 shadow shadow-amber-500/40'
                : val === 1
                  ? 'bg-red-500 border-red-300'
                  : 'bg-slate-900 border-slate-800'
            }`}
          />
        ))
      )}
    </div>
  );
}

export default function GeometryDecompositionGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'mixed',
    difficulty: 'medium',
    rounds: 6,
  });

  const [questions, setQuestions] = useState<GeoQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [numericInput, setNumericInput] = useState('');
  const [answered, setAnswered] = useState<{ isCorrect: boolean; chosen?: number } | null>(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    const generated = Array.from({ length: settings.rounds }, () =>
      generateGeoQuestion(settings.mode, settings.difficulty)
    );
    setQuestions(generated);
    setCurrentIdx(0);
    setNumericInput('');
    setAnswered(null);
    setScore(0);
    setPhase('PLAYING');
  };

  const currentQuestion = questions[currentIdx];

  const handleNumericSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || currentQuestion.kind === 'rotation' || answered) return;
    if (numericInput.trim() === '') return;
    const val = parseInt(numericInput, 10);
    const ok = val === currentQuestion.answer;
    setAnswered({ isCorrect: ok, chosen: val });
    if (ok) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const handleRotationSelect = (idx: number) => {
    if (!currentQuestion || currentQuestion.kind !== 'rotation' || answered) return;
    const ok = idx === currentQuestion.correctIndex;
    setAnswered({ isCorrect: ok, chosen: idx });
    if (ok) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'geometry',
    won: score >= Math.ceil(questions.length * 0.6),
    accuracy: Math.round((score / Math.max(1, questions.length)) * 100),
    scoreLabel: `${score}/${questions.length} câu`,
  });

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setNumericInput('');
      setAnswered(null);
    } else {
      setPhase('RESULT');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-red-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/spatial"
          className="inline-flex items-center text-slate-500 hover:text-red-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Hình Học &amp; Không Gian
        </Link>
        {phase === 'PLAYING' && (
          <div className="text-sm font-mono bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-full text-red-400 font-bold">
            Câu {currentIdx + 1}/{questions.length} • Điểm: {score}
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500 mb-2">
              PHÂN HÌNH HỌC
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Geometric Decomposition • Thị giác &amp; Tổ hợp hình học
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-2xl mb-2">🔺</div>
                  <h3 className="font-bold text-white mb-1">Đếm Tam Giác Ẩn</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Phân tích cấu trúc chùm tia &amp; tầng cắt ngang để tính chính xác tổng số tam giác lồng nhau.
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-2xl mb-2">🧊</div>
                  <h3 className="font-bold text-white mb-1">Đếm Khối Xếp Chồng</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Quan sát hình chiếu trục đo 3D và suy luận chính xác cả những khối lập phương khuất phía sau.
                  </p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                  <div className="text-2xl mb-2">🔄</div>
                  <h3 className="font-bold text-white mb-1">Xoay Không Gian</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Phân biệt mẫu xoay 90°/180°/270° thật với các bẫy lật gương (chirality) trong tích tắc.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Thiết Lập Thử Thách
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Chế độ bài tập
                  </label>
                  <select
                    value={settings.mode}
                    onChange={(e) => setSettings({ ...settings, mode: e.target.value as ModeType })}
                    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-600 outline-none focus:border-red-500 font-bold"
                  >
                    <option value="mixed">🎯 Tổng Hợp Cả 3 Dạng</option>
                    <option value="triangles">🔺 Đếm Tam Giác Ẩn</option>
                    <option value="cubes">🧊 Đếm Khối Lập Phương 3D</option>
                    <option value="rotation">🔄 Xoay &amp; Phản Chiếu</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Độ khó
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['easy', 'Dễ'],
                        ['medium', 'Vừa'],
                        ['hard', 'Khó'],
                      ] as [Difficulty, string][]
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setSettings({ ...settings, difficulty: key })}
                        className={`py-2 rounded-lg text-sm font-bold border ${
                          settings.difficulty === key
                            ? 'bg-red-600 border-red-400 text-white'
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Số câu hỏi</label>
                    <span className="text-red-400 text-sm font-bold">{settings.rounds} câu</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={settings.rounds}
                    onChange={(e) =>
                      setSettings({ ...settings, rounds: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                >
                  BẮT ĐẦU NGAY
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && currentQuestion && (
        <div className="max-w-4xl mx-auto px-6 pb-16 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-center text-slate-200 mb-6">
              {currentQuestion.prompt}
            </h2>

            {currentQuestion.kind === 'triangles' && (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-6">
                <svg viewBox="0 0 400 360" className="w-full max-w-md h-auto mx-auto">
                  {currentQuestion.segments.map(([u, v], idx) => (
                    <line
                      key={idx}
                      x1={currentQuestion.vertices[u][0]}
                      y1={currentQuestion.vertices[u][1]}
                      x2={currentQuestion.vertices[v][0]}
                      y2={currentQuestion.vertices[v][1]}
                      stroke="#fb923c"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  ))}
                  {currentQuestion.vertices.map(([x, y], idx) => (
                    <circle key={idx} cx={x} cy={y} r="3.5" fill="#fef08a" />
                  ))}
                </svg>
              </div>
            )}

            {currentQuestion.kind === 'cubes' && (
              <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 mb-6">
                <CubeStackSVG heights={currentQuestion.heights} />
              </div>
            )}

            {currentQuestion.kind !== 'rotation' && (
              <form onSubmit={handleNumericSubmit} className="max-w-md mx-auto flex gap-3">
                <input
                  type="number"
                  autoFocus
                  disabled={answered !== null}
                  value={numericInput}
                  onChange={(e) => setNumericInput(e.target.value)}
                  placeholder="Nhập số lượng..."
                  className="flex-1 bg-slate-800 text-white text-3xl font-mono font-bold text-center py-3 rounded-xl border-2 border-slate-700 focus:border-red-500 outline-none"
                />
                {answered === null && (
                  <button
                    type="submit"
                    disabled={numericInput.trim() === ''}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-xl font-bold text-white"
                  >
                    Xác Nhận
                  </button>
                )}
              </form>
            )}

            {currentQuestion.kind === 'rotation' && (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-xs uppercase font-bold tracking-widest text-amber-400 mb-2">
                    Mẫu Gốc
                  </div>
                  <PatternGridView grid={currentQuestion.sourceGrid} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {currentQuestion.options.map((optGrid, idx) => {
                    const labels = ['A', 'B', 'C', 'D'];
                    let style = 'border-slate-800 bg-slate-950/60 hover:border-red-500';
                    if (answered !== null) {
                      if (idx === currentQuestion.correctIndex) {
                        style = 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500';
                      } else if (answered.chosen === idx) {
                        style = 'border-red-500 bg-red-950/40 ring-2 ring-red-500';
                      } else {
                        style = 'border-slate-800 opacity-45';
                      }
                    }
                    return (
                      <button
                        key={idx}
                        disabled={answered !== null}
                        onClick={() => handleRotationSelect(idx)}
                        className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${style}`}
                      >
                        <span className="text-xs font-black text-slate-400">{labels[idx]}</span>
                        <PatternGridView grid={optGrid} compact />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {answered !== null && (
              <div className="mt-6 bg-slate-950 border border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                <div>
                  <div
                    className={`font-black text-lg ${
                      answered.isCorrect ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {answered.isCorrect
                      ? '✔ Chính xác!'
                      : currentQuestion.kind === 'rotation'
                        ? `✖ Sai rồi! Đáp án đúng là ${['A', 'B', 'C', 'D'][currentQuestion.correctIndex]}.`
                        : `✖ Sai rồi! Đáp án đúng là ${currentQuestion.answer}.`}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{currentQuestion.explanation}</p>
                </div>
                <button
                  onClick={handleNext}
                  className="shrink-0 px-8 py-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-bold text-white shadow-lg"
                >
                  {currentIdx + 1 < questions.length ? 'Câu Tiếp Theo →' : 'Xem Kết Quả'}
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
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-orange-500" />
            <div className="text-7xl mb-4">
              {score === questions.length ? '🏆' : score >= questions.length * 0.6 ? '📐' : '🔍'}
            </div>
            <h2 className="text-4xl font-black text-white mb-2">HOÀN THÀNH</h2>
            <p className="text-slate-400 mb-8">
              Kết quả phân tích hình học của bạn:{' '}
              <strong className="text-orange-400 text-2xl font-mono">
                {score}/{questions.length}
              </strong>{' '}
              ({Math.round((score / Math.max(1, questions.length)) * 100)}%)
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
                className="flex-1 py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-bold text-white"
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
