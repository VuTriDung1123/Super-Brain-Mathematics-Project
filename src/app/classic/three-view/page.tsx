'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { playError, playSuccess } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Voxel {
  x: number;
  y: number;
  z: number;
}

interface Projections {
  front: boolean[][]; // [y_from_top][x]
  top: boolean[][]; // [z][x]
  right: boolean[][]; // [y_from_top][z_from_front]
}

interface ThreeViewQuestion {
  gridSize: number;
  targetProj: Projections;
  correctVoxels: Voxel[];
  options: Voxel[][];
  correctIndex: number;
}

function computeProjections(voxels: Voxel[], n: number): Projections {
  const front = Array.from({ length: n }, () => Array(n).fill(false));
  const top = Array.from({ length: n }, () => Array(n).fill(false));
  const right = Array.from({ length: n }, () => Array(n).fill(false));

  for (const v of voxels) {
    // Front (+Z looking toward -Z): horizontal = x (0..n-1), vertical = y (n-1 down to 0)
    front[n - 1 - v.y][v.x] = true;
    // Top (+Y looking down): horizontal = x (0..n-1), vertical = z (0..n-1 from back to front)
    top[v.z][v.x] = true;
    // Right (+X looking toward -X): horizontal = n-1-z (front on left, back on right), vertical = n-1-y
    right[n - 1 - v.y][n - 1 - v.z] = true;
  }

  return { front, top, right };
}

function projKey(p: Projections): string {
  const f = (m: boolean[][]) => m.map((r) => r.map((v) => (v ? '1' : '0')).join('')).join('/');
  return `${f(p.front)}|${f(p.top)}|${f(p.right)}`;
}

function generateVoxelStructure(n: number, count: number): Voxel[] {
  // Grow a connected gravity-supported voxel structure from ground y=0
  const set = new Set<string>();
  const voxels: Voxel[] = [];
  const add = (x: number, y: number, z: number) => {
    const k = `${x},${y},${z}`;
    if (!set.has(k)) {
      set.add(k);
      voxels.push({ x, y, z });
    }
  };

  add(0, 0, 0);
  add(1, 0, 0);
  add(0, 0, 1);

  let guard = 0;
  while (voxels.length < count && guard < 200) {
    guard++;
    const base = voxels[Math.floor(Math.random() * voxels.length)];
    const dirs = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    const [dx, dy, dz] = dirs[Math.floor(Math.random() * dirs.length)];
    const nx = base.x + dx;
    const ny = base.y + dy;
    const nz = base.z + dz;
    if (nx >= 0 && nx < n && ny >= 0 && ny < n && nz >= 0 && nz < n) {
      // Gravity support: either on ground y=0 or has a voxel directly below
      if (ny === 0 || set.has(`${nx},${ny - 1},${nz}`)) {
        add(nx, ny, nz);
      }
    }
  }
  return voxels;
}

function generateThreeViewQuestion(difficulty: Difficulty): ThreeViewQuestion {
  const n = difficulty === 'hard' ? 4 : 3;
  const voxelCount = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 11;

  const correctVoxels = generateVoxelStructure(n, voxelCount);
  const targetProj = computeProjections(correctVoxels, n);
  const targetKey = projKey(targetProj);

  const distractors: Voxel[][] = [];
  const usedKeys = new Set<string>([targetKey]);

  let guard = 0;
  while (distractors.length < 3 && guard < 200) {
    guard++;
    // Mutate 1-2 voxels from the correct structure so distractors look very close!
    const cand = correctVoxels.map((v) => ({ ...v }));
    const removeIdx = Math.floor(Math.random() * cand.length);
    const removed = cand[removeIdx];
    const hasAbove = cand.some(
      (v) => v.x === removed.x && v.z === removed.z && v.y > removed.y
    );
    if (!hasAbove && cand.length > 4 && Math.random() < 0.6) {
      cand.splice(removeIdx, 1);
    }
    // Add 1 new supported voxel
    const x = Math.floor(Math.random() * n);
    const z = Math.floor(Math.random() * n);
    let maxY = -1;
    for (const v of cand) {
      if (v.x === x && v.z === z && v.y > maxY) maxY = v.y;
    }
    const ny = maxY + 1;
    if (ny < n) {
      cand.push({ x, y: ny, z });
    }

    const pKey = projKey(computeProjections(cand, n));
    if (!usedKeys.has(pKey)) {
      usedKeys.add(pKey);
      distractors.push(cand);
    }
  }

  const options = [correctVoxels, ...distractors.slice(0, 3)].map((v, i) => ({
    v,
    ok: i === 0,
  }));
  options.sort(() => Math.random() - 0.5);

  return {
    gridSize: n,
    targetProj,
    correctVoxels,
    options: options.map((o) => o.v),
    correctIndex: options.findIndex((o) => o.ok),
  };
}

/** Crisp Isometric 3D Voxel SVG Renderer */
function IsometricVoxelSVG({ voxels, gridSize }: { voxels: Voxel[]; gridSize: number }) {
  const tileW = gridSize === 4 ? 22 : 28;
  const tileH = gridSize === 4 ? 13 : 16;
  const cubeH = gridSize === 4 ? 18 : 22;
  const ox = 110;
  const oy = gridSize === 4 ? 115 : 112;

  const sorted = [...voxels].sort((a, b) => a.x + a.z - (b.x + b.z) || a.y - b.y);

  return (
    <svg viewBox="0 0 220 200" className="w-full h-44 mx-auto">
      {sorted.map((v, idx) => {
        // +X goes down-right, +Z goes down-left, +Y goes up
        const cx = ox + (v.x - v.z) * tileW;
        const cy = oy + (v.x + v.z) * tileH - v.y * cubeH;

        const top = `${cx},${cy - tileH} ${cx + tileW},${cy} ${cx},${cy + tileH} ${cx - tileW},${cy}`;
        const left = `${cx - tileW},${cy} ${cx},${cy + tileH} ${cx},${cy + tileH + cubeH} ${cx - tileW},${cy + cubeH}`;
        const right = `${cx + tileW},${cy} ${cx},${cy + tileH} ${cx},${cy + tileH + cubeH} ${cx + tileW},${cy + cubeH}`;

        return (
          <g key={idx}>
            <polygon points={top} fill="#fb923c" stroke="#0f172a" strokeWidth="1.3" />
            <polygon points={left} fill="#ea580c" stroke="#0f172a" strokeWidth="1.3" />
            <polygon points={right} fill="#9a3412" stroke="#0f172a" strokeWidth="1.3" />
          </g>
        );
      })}
    </svg>
  );
}

function ProjectionGrid({ title, grid }: { title: string; grid: boolean[][] }) {
  const n = grid.length;
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col items-center gap-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-orange-400">{title}</div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
      >
        {grid.map((row, r) =>
          row.map((on, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded border ${
                on
                  ? 'bg-orange-500 border-orange-300 shadow shadow-orange-500/30'
                  : 'bg-slate-900 border-slate-800'
              }`}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function ThreeViewProjectionGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [rounds, setRounds] = useState(5);

  const [questions, setQuestions] = useState<ThreeViewQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const startGame = () => {
    const qs = Array.from({ length: rounds }, () => generateThreeViewQuestion(difficulty));
    setQuestions(qs);
    setCurrentIdx(0);
    setChosen(null);
    setScore(0);
    setPhase('PLAYING');
  };

  const currentQ = questions[currentIdx];

  const handleChoose = (idx: number) => {
    if (!currentQ || chosen !== null) return;
    setChosen(idx);
    if (idx === currentQ.correctIndex) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((i) => i + 1);
      setChosen(null);
    } else {
      setPhase('RESULT');
    }
  };

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'three-view',
    won: score >= Math.ceil(questions.length * 0.6),
    accuracy: Math.round((score / Math.max(1, questions.length)) * 100),
    scoreLabel: `${score}/${questions.length} khối (${difficulty})`,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-orange-500">
      <div className="max-w-6xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-orange-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <span className="font-mono text-sm px-4 py-1.5 rounded-full bg-slate-900 border border-orange-500/40 text-orange-400 font-bold">
            Câu {currentIdx + 1}/{questions.length} • Điểm: {score}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-6xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 mb-2">
              BA HÌNH CHIẾU 3D
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              3-View Orthographic Projection • Tái cấu trúc khối không gian
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-orange-400">Cách đọc ba hình chiếu chuẩn</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Từ 3 góc nhìn trực giao phẳng — <strong className="text-white">Chính diện (Front)</strong>,{' '}
                <strong className="text-white">Từ trên xuống (Top)</strong> và{' '}
                <strong className="text-white">Bên phải (Right)</strong> — hãy tưởng tượng khối 3D duy nhất khớp đồng thời cả 3 hình chiếu. Sau khi chọn đáp án, bạn có thể xoay trực tiếp mô hình 3D thật để kiểm chứng từng góc nhìn!
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Cấu Hình Thử Thách
              </h3>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Độ phức tạp khối
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['easy', '3×3 Dễ'],
                      ['medium', '3×3 Vừa'],
                      ['hard', '4×4 Khó'],
                    ] as [Difficulty, string][]
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setDifficulty(k)}
                      className={`py-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                        difficulty === k
                          ? 'bg-orange-600 border-orange-400 text-white'
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
                  <span className="text-orange-400 text-sm font-bold">{rounds} câu</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  value={rounds}
                  onChange={(e) => setRounds(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>

              <button
                onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                BẮT ĐẦU DỰNG HÌNH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && currentQ && (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="text-center text-sm font-bold text-slate-300 mb-4">
              Ba hình chiếu trực giao của khối mục tiêu:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <ProjectionGrid title="Chính Diện (Front)" grid={currentQ.targetProj.front} />
              <ProjectionGrid title="Nhìn Từ Trên (Top)" grid={currentQ.targetProj.top} />
              <ProjectionGrid title="Mặt Bên Phải (Right)" grid={currentQ.targetProj.right} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {currentQ.options.map((voxels, idx) => {
              const labels = ['A', 'B', 'C', 'D'];
              let cls = 'border-slate-800 bg-slate-900 hover:border-orange-400';
              if (chosen !== null) {
                if (idx === currentQ.correctIndex) {
                  cls = 'border-emerald-500 bg-emerald-950/40 ring-2 ring-emerald-500';
                } else if (idx === chosen) {
                  cls = 'border-red-500 bg-red-950/40 ring-2 ring-red-500';
                } else {
                  cls = 'border-slate-800 opacity-45';
                }
              }
              return (
                <button
                  key={idx}
                  disabled={chosen !== null}
                  onClick={() => handleChoose(idx)}
                  className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${cls}`}
                >
                  <span className="absolute top-3 left-3 w-7 h-7 rounded-lg bg-slate-800 font-black text-xs flex items-center justify-center border border-slate-700">
                    {labels[idx]}
                  </span>
                  <IsometricVoxelSVG voxels={voxels} gridSize={currentQ.gridSize} />
                </button>
              );
            })}
          </div>

          {chosen !== null && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-900 border border-slate-700 rounded-3xl p-6 items-center animate-fade-in-up">
              <div className="lg:col-span-5 h-56 bg-slate-950 rounded-2xl border border-emerald-500/30 overflow-hidden">
                <Canvas camera={{ position: [4.5, 4, 4.5], fov: 45 }}>
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[6, 8, 6]} intensity={0.9} />
                  <group
                    position={[
                      -(currentQ.gridSize - 1) / 2,
                      -(currentQ.gridSize - 1) / 2,
                      -(currentQ.gridSize - 1) / 2,
                    ]}
                  >
                    {currentQ.correctVoxels.map((v, i) => (
                      <mesh key={i} position={[v.x, v.y, v.z]}>
                        <boxGeometry args={[0.96, 0.96, 0.96]} />
                        <meshStandardMaterial color="#f97316" />
                      </mesh>
                    ))}
                  </group>
                  <OrbitControls enablePan={false} enableZoom={false} />
                </Canvas>
              </div>
              <div className="lg:col-span-7 space-y-4">
                <div
                  className={`text-2xl font-black ${
                    chosen === currentQ.correctIndex ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {chosen === currentQ.correctIndex
                    ? '✔ Chính xác tuyệt đối!'
                    : `✖ Chưa chính xác! Đáp án đúng là ${['A', 'B', 'C', 'D'][currentQ.correctIndex]}.`}
                </div>
                <p className="text-sm text-slate-400">
                  Kéo chuột trên khối 3D bên trái để xoay kiểm chứng trực tiếp góc nhìn Chính diện, Trên xuống và Bên phải!
                </p>
                <button
                  onClick={handleNext}
                  className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-bold text-white shadow-lg"
                >
                  {currentIdx + 1 < questions.length ? 'Câu Tiếp Theo →' : 'Xem Kết Quả'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-orange-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🧊</div>
          <h2 className="text-4xl font-black text-white mb-2">KẾT QUẢ BA HÌNH CHIẾU</h2>
          <p className="text-slate-300 mb-8">
            Chính xác{' '}
            <strong className="text-orange-400 font-mono text-2xl">
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
              className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-bold text-white"
            >
              Chơi Lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
