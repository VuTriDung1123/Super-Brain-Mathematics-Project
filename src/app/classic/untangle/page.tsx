'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { playClick } from '@/lib/sound';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Node2D {
  id: number;
  x: number;
  y: number;
  solX: number;
  solY: number;
}

interface Edge {
  u: number;
  v: number;
}

/** Exact segment intersection test (excluding shared endpoints) */
function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const ccw = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    (ry - py) * (qx - px) > (qy - py) * (rx - px);
  return (
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
  );
}

/**
 * Generates a guaranteed planar graph using concentric rings + radial spokes
 * (100% zero crossings in its planar embedding), then scrambles all nodes on a circle!
 */
function generatePlanarPuzzle(difficulty: Difficulty): { nodes: Node2D[]; edges: Edge[] } {
  const ring1 = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 7;
  const ring2 = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 6 : 8;
  const cx = 300;
  const cy = 240;

  const planarPts: { x: number; y: number }[] = [];
  for (let i = 0; i < ring1; i++) {
    const a = (i * 2 * Math.PI) / ring1 - Math.PI / 2;
    planarPts.push({ x: cx + 85 * Math.cos(a), y: cy + 85 * Math.sin(a) });
  }
  for (let i = 0; i < ring2; i++) {
    const a = (i * 2 * Math.PI) / ring2 - Math.PI / 2 + Math.PI / ring2;
    planarPts.push({ x: cx + 185 * Math.cos(a), y: cy + 185 * Math.sin(a) });
  }

  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  const addEdge = (u: number, v: number) => {
    const a = Math.min(u, v);
    const b = Math.max(u, v);
    const k = `${a}-${b}`;
    if (a !== b && !edgeSet.has(k)) {
      edgeSet.add(k);
      edges.push({ u: a, v: b });
    }
  };

  // Inner cycle
  for (let i = 0; i < ring1; i++) addEdge(i, (i + 1) % ring1);
  // Outer cycle
  for (let i = 0; i < ring2; i++) addEdge(ring1 + i, ring1 + ((i + 1) % ring2));
  // Non-crossing radial & triangulated spokes between inner and outer rings
  for (let i = 0; i < ring2; i++) {
    const innerIdx = Math.floor((i * ring1) / ring2) % ring1;
    const nextInner = (innerIdx + 1) % ring1;
    addEdge(ring1 + i, innerIdx);
    if (i % 2 === 0) addEdge(ring1 + i, nextInner);
  }
  // Safe chord inside inner ring
  if (ring1 >= 4) addEdge(0, 2);

  // Verify no edge crossings in planar solution (filter out any accidental crossing)
  const cleanEdges: Edge[] = [];
  for (const e of edges) {
    const p1 = planarPts[e.u];
    const p2 = planarPts[e.v];
    const crosses = cleanEdges.some((o) => {
      if (o.u === e.u || o.u === e.v || o.v === e.u || o.v === e.v) return false;
      const q1 = planarPts[o.u];
      const q2 = planarPts[o.v];
      return segmentsIntersect(p1.x, p1.y, p2.x, p2.y, q1.x, q1.y, q2.x, q2.y);
    });
    if (!crosses) cleanEdges.push(e);
  }

  // Scramble vertices onto a circle so crossings are guaranteed > 0
  const n = planarPts.length;
  const perm = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
  const nodes: Node2D[] = planarPts.map((pt, id) => {
    const slot = perm[id];
    const angle = (slot * 2 * Math.PI) / n;
    return {
      id,
      x: cx + 195 * Math.cos(angle),
      y: cy + 195 * Math.sin(angle),
      solX: pt.x,
      solY: pt.y,
    };
  });

  return { nodes, edges: cleanEdges };
}

export default function UntangleGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [nodes, setNodes] = useState<Node2D[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingIdRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startGame = (diff = difficulty) => {
    const { nodes: n, edges: e } = generatePlanarPuzzle(diff);
    setDifficulty(diff);
    setNodes(n);
    setEdges(e);
    setElapsedSec(0);
    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const { crossingEdgeIndices, totalCrossings } = useMemo(() => {
    const crossing = new Set<number>();
    let count = 0;
    for (let i = 0; i < edges.length; i++) {
      const e1 = edges[i];
      const a = nodes[e1.u];
      const b = nodes[e1.v];
      if (!a || !b) continue;
      for (let j = i + 1; j < edges.length; j++) {
        const e2 = edges[j];
        if (e1.u === e2.u || e1.u === e2.v || e1.v === e2.u || e1.v === e2.v) continue;
        const c = nodes[e2.u];
        const d = nodes[e2.v];
        if (!c || !d) continue;
        if (segmentsIntersect(a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y)) {
          crossing.add(i);
          crossing.add(j);
          count++;
        }
      }
    }
    return { crossingEdgeIndices: crossing, totalCrossings: count };
  }, [nodes, edges]);

  const getSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 300, y: 240 };
    const rect = svg.getBoundingClientRect();
    return {
      x: Math.max(24, Math.min(576, ((clientX - rect.left) / rect.width) * 600)),
      y: Math.max(24, Math.min(456, ((clientY - rect.top) / rect.height) * 480)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent, id: number) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingIdRef.current = id;
    playClick();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingIdRef.current === null || phase !== 'PLAYING') return;
    const id = draggingIdRef.current;
    const pt = getSvgPoint(e.clientX, e.clientY);
    setNodes((prev) =>
      prev.map((node) => (node.id === id ? { ...node, x: pt.x, y: pt.y } : node))
    );
  };

  const handlePointerUp = () => {
    if (draggingIdRef.current === null) return;
    draggingIdRef.current = null;
    if (phase === 'PLAYING' && totalCrossings === 0 && nodes.length > 0) {
      setPhase('RESULT');
    }
  };

  const handleNudgeHint = () => {
    // Move 2 furthest nodes halfway toward their guaranteed planar coordinates
    setNodes((prev) => {
      const sorted = [...prev].sort(
        (a, b) => Math.hypot(b.x - b.solX, b.y - b.solY) - Math.hypot(a.x - a.solX, a.y - a.solY)
      );
      const targetIds = new Set(sorted.slice(0, 2).map((n) => n.id));
      return prev.map((n) =>
        targetIds.has(n.id) ? { ...n, x: n.solX, y: n.solY } : n
      );
    });
    playClick();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'untangle',
    won: true,
    accuracy: 100,
    scoreLabel: `Gỡ ${nodes.length} đỉnh (${formatTime(elapsedSec)})`,
    durationSec: Math.max(1, elapsedSec),
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pt-16 pb-16 px-4 md:px-8 selection:bg-fuchsia-500">
      <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
        <Link
          href="/classic"
          className="inline-flex items-center text-slate-400 hover:text-fuchsia-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Kinh Điển
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex gap-3 font-mono text-sm">
            <span
              className={`px-3.5 py-1.5 rounded-full border font-bold ${
                totalCrossings === 0
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                  : 'bg-red-950/50 border-red-500/60 text-red-400'
              }`}
            >
              Giao cắt: {totalCrossings}
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              ⏱ {formatTime(elapsedSec)}
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-5xl mx-auto animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 mb-2">
              GỠ RỐI MẠNG NHỆN (PLANARITY)
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Untangle Graph • Hình học tô-pô đồ thị phẳng
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
              <h2 className="text-xl font-bold text-fuchsia-400">Thử thách Mạng Nhện Tơ Trời</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Mọi đồ thị sinh ra đều đảm bảo là <strong className="text-white">đồ thị phẳng (planar graph)</strong>, tức luôn tồn tại cách sắp xếp các đỉnh sao cho <strong className="text-emerald-400">không có bất kỳ 2 sợi dây nào cắt nhau</strong>.
              </p>
              <p className="text-xs text-slate-400">
                🖱️ Kéo thả từng nút tròn trên màn hình. Dây đang cắt nhau sẽ phát sáng màu <span className="text-red-400 font-bold">Đỏ</span>, dây đã gỡ sạch sẽ chuyển sang màu <span className="text-emerald-400 font-bold">Xanh lá</span>.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
              <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                Số Lượng Đỉnh
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['easy', '8 Đỉnh'],
                    ['medium', '11 Đỉnh'],
                    ['hard', '15 Đỉnh'],
                  ] as [Difficulty, string][]
                ).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setDifficulty(k)}
                    className={`py-3 rounded-xl font-bold text-xs border cursor-pointer ${
                      difficulty === k
                        ? 'bg-fuchsia-600 border-fuchsia-400 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => startGame(difficulty)}
                className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl font-black text-white text-lg shadow-lg hover:scale-[1.02] transition-all cursor-pointer"
              >
                TẠO MẠNG RỐI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl">
            <svg
              ref={svgRef}
              viewBox="0 0 600 480"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-[500px] bg-slate-950 rounded-2xl touch-none select-none"
            >
              {edges.map((e, idx) => {
                const a = nodes[e.u];
                const b = nodes[e.v];
                if (!a || !b) return null;
                const isBad = crossingEdgeIndices.has(idx);
                return (
                  <line
                    key={idx}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={isBad ? '#ef4444' : '#22c55e'}
                    strokeWidth={isBad ? 2.5 : 3}
                    strokeOpacity={isBad ? 0.78 : 0.9}
                  />
                );
              })}

              {nodes.map((node) => (
                <g
                  key={node.id}
                  onPointerDown={(e) => handlePointerDown(e, node.id)}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="14"
                    fill="#1e1b4b"
                    stroke="#d946ef"
                    strokeWidth="3"
                  />
                  <text
                    x={node.x}
                    y={node.y + 4}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight="bold"
                    className="pointer-events-none"
                  >
                    {node.id + 1}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleNudgeHint}
              className="px-5 py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-800 border border-amber-600/60 text-amber-200 font-bold text-sm"
            >
              💡 Gỡ Giúp 2 Đỉnh
            </button>
            {totalCrossings === 0 && (
              <button
                onClick={() => setPhase('RESULT')}
                className="px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm animate-bounce-short"
              >
                ✔ XÁC NHẬN HOÀN THÀNH!
              </button>
            )}
            <button
              onClick={() => startGame(difficulty)}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm"
            >
              Mạng Mới
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="max-w-xl mx-auto mt-10 bg-slate-900 border border-fuchsia-500/60 rounded-3xl p-10 text-center shadow-2xl animate-fade-in-up">
          <div className="text-7xl mb-4">🕸️</div>
          <h2 className="text-4xl font-black text-emerald-400 mb-2">GỠ RỐI HOÀN HẢO!</h2>
          <p className="text-slate-300 mb-8">
            0 điểm giao cắt cho mạng <strong className="text-white">{nodes.length} đỉnh</strong> — hoàn thành trong{' '}
            <strong className="text-fuchsia-400 font-mono">{formatTime(elapsedSec)}</strong>.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPhase('SETUP')}
              className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
            >
              Đổi Cấp Độ
            </button>
            <button
              onClick={() => startGame(difficulty)}
              className="flex-1 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl font-bold text-white"
            >
              Chơi Tiếp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
