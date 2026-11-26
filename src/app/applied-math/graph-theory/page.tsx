'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type GraphChallenge = 'shortest-path' | 'mst' | 'coloring';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameSettings {
  challenge: GraphChallenge;
  difficulty: Difficulty;
}

interface GraphNode {
  id: number;
  label: string;
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  u: number;
  v: number;
  weight: number;
}

interface GraphPuzzle {
  nodes: GraphNode[];
  edges: GraphEdge[];
  shortestPathNodes: number[];
  shortestPathWeight: number;
  mstEdgeIds: string[];
  mstWeight: number;
  chromaticNumber: number;
  optimalColoring: number[];
}

const NODE_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7'];
const NODE_COLOR_NAMES = ['Đỏ', 'Xanh dương', 'Xanh lá', 'Vàng', 'Tím'];

function computeDijkstra(
  n: number,
  edges: GraphEdge[],
  start: number,
  end: number
): { path: number[]; dist: number } {
  const adj: { to: number; w: number }[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    adj[e.u].push({ to: e.v, w: e.weight });
    adj[e.v].push({ to: e.u, w: e.weight });
  }

  const dist = Array(n).fill(Infinity);
  const parent = Array(n).fill(-1);
  const used = Array(n).fill(false);
  dist[start] = 0;

  for (let step = 0; step < n; step++) {
    let u = -1;
    for (let i = 0; i < n; i++) {
      if (!used[i] && (u === -1 || dist[i] < dist[u])) u = i;
    }
    if (u === -1 || dist[u] === Infinity) break;
    used[u] = true;
    for (const { to, w } of adj[u]) {
      if (dist[u] + w < dist[to]) {
        dist[to] = dist[u] + w;
        parent[to] = u;
      }
    }
  }

  const path: number[] = [];
  let cur = end;
  while (cur !== -1) {
    path.push(cur);
    cur = parent[cur];
  }
  path.reverse();
  return { path, dist: dist[end] };
}

function computeKruskalMST(n: number, edges: GraphEdge[]): { edgeIds: string[]; weight: number } {
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const unite = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return false;
    parent[ra] = rb;
    return true;
  };

  const sorted = [...edges].sort((a, b) => a.weight - b.weight);
  const edgeIds: string[] = [];
  let weight = 0;
  for (const e of sorted) {
    if (unite(e.u, e.v)) {
      edgeIds.push(e.id);
      weight += e.weight;
    }
  }
  return { edgeIds, weight };
}

function computeChromaticNumber(
  n: number,
  edges: GraphEdge[]
): { chromaticNumber: number; coloring: number[] } {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const e of edges) {
    adj[e.u].push(e.v);
    adj[e.v].push(e.u);
  }

  for (let k = 2; k <= 5; k++) {
    const colors = Array(n).fill(-1);
    const backtrack = (idx: number): boolean => {
      if (idx === n) return true;
      for (let c = 0; c < k; c++) {
        if (adj[idx].every((nb) => colors[nb] !== c)) {
          colors[idx] = c;
          if (backtrack(idx + 1)) return true;
          colors[idx] = -1;
        }
      }
      return false;
    };
    if (backtrack(0)) {
      return { chromaticNumber: k, coloring: colors };
    }
  }
  return { chromaticNumber: 5, coloring: Array.from({ length: n }, (_, i) => i % 5) };
}

function generateGraphPuzzle(difficulty: Difficulty): GraphPuzzle {
  const n = difficulty === 'easy' ? 6 : difficulty === 'medium' ? 8 : 10;
  const cx = 310;
  const cy = 225;
  const radiusX = 225;
  const radiusY = 165;

  // Clean polygon layout: Start at far left (index 0), End at far right (index n-1)
  const nodes: GraphNode[] = [];
  nodes.push({ id: 0, label: 'A', x: cx - radiusX, y: cy });

  const innerCount = n - 2;
  const topCount = Math.ceil(innerCount / 2);
  const botCount = innerCount - topCount;

  for (let i = 0; i < topCount; i++) {
    const t = (i + 1) / (topCount + 1);
    const x = cx - radiusX + t * (radiusX * 2);
    const arc = Math.sin(t * Math.PI);
    const y = cy - 65 - arc * 95;
    nodes.push({ id: nodes.length, label: String.fromCharCode(65 + nodes.length), x, y });
  }
  for (let i = 0; i < botCount; i++) {
    const t = (i + 1) / (botCount + 1);
    const x = cx - radiusX + t * (radiusX * 2);
    const arc = Math.sin(t * Math.PI);
    const y = cy + 65 + arc * 95;
    nodes.push({ id: nodes.length, label: String.fromCharCode(65 + nodes.length), x, y });
  }

  nodes.push({
    id: n - 1,
    label: String.fromCharCode(65 + n - 1),
    x: cx + radiusX,
    y: cy,
  });

  // Connect a clean planar-like skeleton so edges stay readable
  const edgeMap = new Map<string, GraphEdge>();
  const addEdge = (u: number, v: number) => {
    if (u === v) return;
    const a = Math.min(u, v);
    const b = Math.max(u, v);
    const id = `${a}-${b}`;
    if (!edgeMap.has(id)) {
      edgeMap.set(id, {
        id,
        u: a,
        v: b,
        weight: Math.floor(Math.random() * 14) + 2,
      });
    }
  };

  // Top chain & bottom chain
  const topIds = Array.from({ length: topCount }, (_, i) => i + 1);
  const botIds = Array.from({ length: botCount }, (_, i) => 1 + topCount + i);

  addEdge(0, topIds[0]);
  addEdge(0, botIds[0]);
  for (let i = 0; i < topIds.length - 1; i++) addEdge(topIds[i], topIds[i + 1]);
  for (let i = 0; i < botIds.length - 1; i++) addEdge(botIds[i], botIds[i + 1]);
  addEdge(topIds[topIds.length - 1], n - 1);
  addEdge(botIds[botIds.length - 1], n - 1);

  // Vertical & diagonal chords between top and bottom
  for (let i = 0; i < Math.min(topIds.length, botIds.length); i++) {
    addEdge(topIds[i], botIds[i]);
    if (i + 1 < topIds.length && Math.random() < 0.7) addEdge(botIds[i], topIds[i + 1]);
    if (i + 1 < botIds.length && Math.random() < 0.7) addEdge(topIds[i], botIds[i + 1]);
  }
  if (topIds.length > botIds.length && botIds.length > 0) {
    addEdge(topIds[topIds.length - 1], botIds[botIds.length - 1]);
  }

  const edges = Array.from(edgeMap.values());
  const dijkstra = computeDijkstra(n, edges, 0, n - 1);
  const mst = computeKruskalMST(n, edges);
  const chrom = computeChromaticNumber(n, edges);

  return {
    nodes,
    edges,
    shortestPathNodes: dijkstra.path,
    shortestPathWeight: dijkstra.dist,
    mstEdgeIds: mst.edgeIds,
    mstWeight: mst.weight,
    chromaticNumber: chrom.chromaticNumber,
    optimalColoring: chrom.coloring,
  };
}

export default function GraphTheoryGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    challenge: 'shortest-path',
    difficulty: 'medium',
  });

  const [puzzle, setPuzzle] = useState<GraphPuzzle | null>(null);

  // Shortest-path player state
  const [pathNodes, setPathNodes] = useState<number[]>([0]);
  // MST player state
  const [selectedEdges, setSelectedEdges] = useState<Set<string>>(new Set());
  // Coloring player state
  const [nodeColors, setNodeColors] = useState<number[]>([]);
  const [activeColor, setActiveColor] = useState<number>(0);

  const [isWin, setIsWin] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [showOptimal, setShowOptimal] = useState(false);

  const startGame = () => {
    const p = generateGraphPuzzle(settings.difficulty);
    setPuzzle(p);
    setPathNodes([0]);
    setSelectedEdges(new Set());
    setNodeColors(Array(p.nodes.length).fill(-1));
    setActiveColor(0);
    setShowOptimal(false);
    setIsWin(false);
    setResultMsg('');
    setPhase('PLAYING');
  };

  const findEdge = (u: number, v: number) => {
    if (!puzzle) return undefined;
    const a = Math.min(u, v);
    const b = Math.max(u, v);
    return puzzle.edges.find((e) => e.u === a && e.v === b);
  };

  const currentPathWeight = useMemo(() => {
    if (!puzzle) return 0;
    let sum = 0;
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const a = Math.min(pathNodes[i], pathNodes[i + 1]);
      const b = Math.max(pathNodes[i], pathNodes[i + 1]);
      const e = puzzle.edges.find((edge) => edge.u === a && edge.v === b);
      if (e) sum += e.weight;
    }
    return sum;
  }, [puzzle, pathNodes]);

  const currentMstWeight = useMemo(() => {
    if (!puzzle) return 0;
    let sum = 0;
    for (const e of puzzle.edges) {
      if (selectedEdges.has(e.id)) sum += e.weight;
    }
    return sum;
  }, [puzzle, selectedEdges]);

  const handleNodeClick = (nodeId: number) => {
    if (phase !== 'PLAYING' || !puzzle) return;

    if (settings.challenge === 'shortest-path') {
      const last = pathNodes[pathNodes.length - 1];
      // Undo previous step
      if (pathNodes.length > 1 && pathNodes[pathNodes.length - 2] === nodeId) {
        setPathNodes((prev) => prev.slice(0, -1));
        return;
      }
      if (pathNodes.includes(nodeId)) return;
      if (!findEdge(last, nodeId)) return;
      setPathNodes((prev) => [...prev, nodeId]);
    } else if (settings.challenge === 'coloring') {
      setNodeColors((prev) => {
        const next = [...prev];
        next[nodeId] = next[nodeId] === activeColor ? -1 : activeColor;
        return next;
      });
    }
  };

  const handleEdgeClick = (edgeId: string) => {
    if (phase !== 'PLAYING' || settings.challenge !== 'mst') return;
    setSelectedEdges((prev) => {
      const next = new Set(prev);
      if (next.has(edgeId)) next.delete(edgeId);
      else next.add(edgeId);
      return next;
    });
  };

  const handleVerify = () => {
    if (!puzzle) return;

    if (settings.challenge === 'shortest-path') {
      const reachedEnd = pathNodes[pathNodes.length - 1] === puzzle.nodes.length - 1;
      if (!reachedEnd) {
        setIsWin(false);
        setResultMsg(
          `Bạn chưa đi tới đỉnh đích ${puzzle.nodes[puzzle.nodes.length - 1].label}! Đường ngắn nhất có tổng trọng số = ${puzzle.shortestPathWeight}.`
        );
      } else if (currentPathWeight === puzzle.shortestPathWeight) {
        setIsWin(true);
        setResultMsg(
          `Hoàn hảo! Bạn tìm ra đường đi ngắn nhất tối ưu với tổng chi phí = ${currentPathWeight}.`
        );
      } else {
        setIsWin(false);
        setResultMsg(
          `Đường bạn chọn có tổng chi phí = ${currentPathWeight}, chưa tối ưu (đáp án Dijkstra = ${puzzle.shortestPathWeight}).`
        );
      }
    } else if (settings.challenge === 'mst') {
      const n = puzzle.nodes.length;
      const chosen = puzzle.edges.filter((e) => selectedEdges.has(e.id));
      // Check spanning tree connectivity & acyclicity
      const parent = Array.from({ length: n }, (_, i) => i);
      const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
      let hasCycle = false;
      for (const e of chosen) {
        const ra = find(e.u);
        const rb = find(e.v);
        if (ra === rb) hasCycle = true;
        else parent[ra] = rb;
      }
      const root0 = find(0);
      const isConnected = Array.from({ length: n }, (_, i) => find(i) === root0).every(Boolean);

      if (hasCycle || !isConnected || chosen.length !== n - 1) {
        setIsWin(false);
        setResultMsg(
          `Tập cạnh chưa tạo thành cây khung hợp lệ (cần đúng ${n - 1} cạnh liên thông, không chu trình). Tổng tối ưu MST = ${puzzle.mstWeight}.`
        );
      } else if (currentMstWeight === puzzle.mstWeight) {
        setIsWin(true);
        setResultMsg(`Xuất sắc! Cây khung nhỏ nhất hợp lệ với tổng trọng số tối ưu = ${puzzle.mstWeight}.`);
      } else {
        setIsWin(false);
        setResultMsg(
          `Đây là một cây khung hợp lệ nhưng tổng trọng số = ${currentMstWeight} chưa nhỏ nhất (MST tối ưu = ${puzzle.mstWeight}).`
        );
      }
    } else {
      // Graph Coloring
      const allColored = nodeColors.every((c) => c >= 0);
      const conflict = puzzle.edges.some((e) => nodeColors[e.u] === nodeColors[e.v]);
      const usedColors = new Set(nodeColors.filter((c) => c >= 0)).size;

      if (!allColored) {
        setIsWin(false);
        setResultMsg(`Vẫn còn đỉnh chưa được tô màu! Sắc số đồ thị χ(G) = ${puzzle.chromaticNumber}.`);
      } else if (conflict) {
        setIsWin(false);
        setResultMsg('Có ít nhất hai đỉnh kề nhau bị tô cùng một màu!');
      } else if (usedColors <= puzzle.chromaticNumber) {
        setIsWin(true);
        setResultMsg(
          `Tuyệt vời! Bạn đã tô hợp lệ toàn bộ đồ thị chỉ bằng đúng sắc số tối ưu χ(G) = ${puzzle.chromaticNumber} màu.`
        );
      } else {
        setIsWin(false);
        setResultMsg(
          `Cách tô hợp lệ nhưng bạn dùng ${usedColors} màu, vẫn có thể giảm xuống sắc số tối ưu χ(G) = ${puzzle.chromaticNumber} màu.`
        );
      }
    }

    setPhase('RESULT');
  };

  const optimalPathEdgeSet = useMemo(() => {
    const s = new Set<string>();
    if (!puzzle) return s;
    for (let i = 0; i < puzzle.shortestPathNodes.length - 1; i++) {
      const a = Math.min(puzzle.shortestPathNodes[i], puzzle.shortestPathNodes[i + 1]);
      const b = Math.max(puzzle.shortestPathNodes[i], puzzle.shortestPathNodes[i + 1]);
      s.add(`${a}-${b}`);
    }
    return s;
  }, [puzzle]);

  const playerPathEdgeSet = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < pathNodes.length - 1; i++) {
      const a = Math.min(pathNodes[i], pathNodes[i + 1]);
      const b = Math.max(pathNodes[i], pathNodes[i + 1]);
      s.add(`${a}-${b}`);
    }
    return s;
  }, [pathNodes]);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-green-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/applied-math"
          className="inline-flex items-center text-slate-500 hover:text-green-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Toán Ứng Dụng
        </Link>
        {phase === 'PLAYING' && puzzle && (
          <div className="text-sm font-mono bg-slate-900 border border-green-500/40 px-4 py-1.5 rounded-full text-green-400 font-bold">
            {settings.challenge === 'shortest-path' &&
              `Tổng trọng số đường đi: ${currentPathWeight}`}
            {settings.challenge === 'mst' &&
              `Cạnh đã chọn: ${selectedEdges.size}/${puzzle.nodes.length - 1} • Tổng: ${currentMstWeight}`}
            {settings.challenge === 'coloring' &&
              `Mục tiêu tối ưu: ≤ ${puzzle.chromaticNumber} màu`}
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
              LÝ THUYẾT ĐỒ THỊ
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Graph Theory Arena • Dijkstra • MST • Graph Coloring
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-2xl mb-2">🛣️</div>
                <h3 className="font-bold text-green-400 mb-1">Đường Ngắn Nhất</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click nối các đỉnh từ A đến đỉnh cuối sao cho tổng trọng số cạnh đạt cực tiểu (chuẩn thuật toán Dijkstra).
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-2xl mb-2">🌳</div>
                <h3 className="font-bold text-emerald-400 mb-1">Cây Khung Nhỏ Nhất</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click chọn đúng N-1 cạnh kết nối mọi đỉnh không tạo chu trình với tổng chi phí thấp nhất (Kruskal / Prim).
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-2xl mb-2">🎨</div>
                <h3 className="font-bold text-teal-400 mb-1">Tô Màu Đồ Thị</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Tô màu mọi đỉnh sao cho không có hai đỉnh kề nhau trùng màu với số lượng màu ít nhất bằng sắc số χ(G).
                </p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Cấu Hình Đồ Thị
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Bài toán tối ưu
                  </label>
                  <select
                    value={settings.challenge}
                    onChange={(e) =>
                      setSettings({ ...settings, challenge: e.target.value as GraphChallenge })
                    }
                    className="w-full bg-slate-800 text-white p-3 rounded-xl border border-slate-600 outline-none focus:border-green-500 font-bold"
                  >
                    <option value="shortest-path">🛣️ Đường Đi Ngắn Nhất (Dijkstra)</option>
                    <option value="mst">🌳 Cây Khung Nhỏ Nhất (MST)</option>
                    <option value="coloring">🎨 Tô Màu Đồ Thị (Chromatic)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Quy mô đồ thị
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        ['easy', '6 Đỉnh'],
                        ['medium', '8 Đỉnh'],
                        ['hard', '10 Đỉnh'],
                      ] as [Difficulty, string][]
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setSettings({ ...settings, difficulty: k })}
                        className={`py-2 rounded-lg text-sm font-bold border ${
                          settings.difficulty === k
                            ? 'bg-green-600 border-green-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                >
                  TẠO ĐỒ THỊ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING + RESULT GRAPH BOARD */}
      {(phase === 'PLAYING' || phase === 'RESULT') && puzzle && (
        <div className="max-w-5xl mx-auto px-6 pb-16 animate-fade-in space-y-5">
          {phase === 'RESULT' && (
            <div
              className={`p-6 rounded-2xl border-2 text-center animate-fade-in-up ${
                isWin
                  ? 'bg-emerald-950/40 border-emerald-500'
                  : 'bg-red-950/40 border-red-500'
              }`}
            >
              <h2
                className={`text-3xl font-black mb-1 ${
                  isWin ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isWin ? '🏆 TỐI ƯU TUYỆT ĐỐI!' : '✖ CHƯA TỐI ƯU'}
              </h2>
              <p className="text-slate-300 text-sm mb-4">{resultMsg}</p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setShowOptimal((v) => !v)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm ${
                    showOptimal ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {showOptimal ? 'Xem Bài Làm Của Bạn' : 'Xem Lời Giải Tối Ưu'}
                </button>
                <button
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-500 text-white"
                >
                  Đồ Thị Mới
                </button>
                <button
                  onClick={() => setPhase('SETUP')}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Đổi Chế Độ
                </button>
              </div>
            </div>
          )}

          {phase === 'PLAYING' && settings.challenge === 'coloring' && (
            <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <span className="text-xs uppercase font-bold text-slate-400 mr-2">Chọn màu tô:</span>
              {NODE_COLORS.slice(0, Math.min(5, puzzle.chromaticNumber + 1)).map((hex, idx) => (
                <button
                  key={hex}
                  onClick={() => setActiveColor(idx)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border-2 transition-all ${
                    activeColor === idx ? 'border-white scale-105' : 'border-transparent opacity-70'
                  }`}
                  style={{ backgroundColor: hex }}
                >
                  {NODE_COLOR_NAMES[idx]}
                </button>
              ))}
            </div>
          )}

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl">
            <svg viewBox="0 0 620 450" className="w-full h-auto bg-slate-950 rounded-2xl">
              {/* Edges */}
              {puzzle.edges.map((e) => {
                const n1 = puzzle.nodes[e.u];
                const n2 = puzzle.nodes[e.v];
                const mx = (n1.x + n2.x) / 2;
                const my = (n1.y + n2.y) / 2;

                const isHighlighted =
                  showOptimal && phase === 'RESULT'
                    ? settings.challenge === 'shortest-path'
                      ? optimalPathEdgeSet.has(e.id)
                      : settings.challenge === 'mst'
                        ? puzzle.mstEdgeIds.includes(e.id)
                        : false
                    : settings.challenge === 'shortest-path'
                      ? playerPathEdgeSet.has(e.id)
                      : settings.challenge === 'mst'
                        ? selectedEdges.has(e.id)
                        : false;

                const isColorConflict =
                  settings.challenge === 'coloring' &&
                  !showOptimal &&
                  nodeColors[e.u] >= 0 &&
                  nodeColors[e.u] === nodeColors[e.v];

                const strokeColor = isColorConflict
                  ? '#ef4444'
                  : isHighlighted
                    ? showOptimal
                      ? '#facc15'
                      : '#22c55e'
                    : '#334155';

                return (
                  <g
                    key={e.id}
                    onClick={() => handleEdgeClick(e.id)}
                    className={settings.challenge === 'mst' ? 'cursor-pointer' : ''}
                  >
                    {/* Invisible wide click hit-area for MST */}
                    <line
                      x1={n1.x}
                      y1={n1.y}
                      x2={n2.x}
                      y2={n2.y}
                      stroke="transparent"
                      strokeWidth="18"
                    />
                    <line
                      x1={n1.x}
                      y1={n1.y}
                      x2={n2.x}
                      y2={n2.y}
                      stroke={strokeColor}
                      strokeWidth={isHighlighted || isColorConflict ? 5 : 2.5}
                      strokeLinecap="round"
                    />
                    {settings.challenge !== 'coloring' && (
                      <g>
                        <circle
                          cx={mx}
                          cy={my}
                          r="13"
                          fill={isHighlighted ? '#052e16' : '#0f172a'}
                          stroke={strokeColor}
                          strokeWidth="1.5"
                        />
                        <text
                          x={mx}
                          y={my + 4}
                          textAnchor="middle"
                          fill={isHighlighted ? '#86efac' : '#cbd5e1'}
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {e.weight}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {puzzle.nodes.map((node) => {
                const isStart = node.id === 0;
                const isEnd = node.id === puzzle.nodes.length - 1;
                const inPlayerPath = pathNodes.includes(node.id);
                const isLastPathNode = pathNodes[pathNodes.length - 1] === node.id;

                let fill = '#1e293b';
                let stroke = '#64748b';

                if (settings.challenge === 'coloring') {
                  const colIdx =
                    showOptimal && phase === 'RESULT'
                      ? puzzle.optimalColoring[node.id]
                      : nodeColors[node.id];
                  if (colIdx >= 0) {
                    fill = NODE_COLORS[colIdx];
                    stroke = '#ffffff';
                  }
                } else if (settings.challenge === 'shortest-path') {
                  if (showOptimal && phase === 'RESULT' && puzzle.shortestPathNodes.includes(node.id)) {
                    fill = '#ca8a04';
                    stroke = '#fef08a';
                  } else if (isLastPathNode) {
                    fill = '#16a34a';
                    stroke = '#bbf7d0';
                  } else if (inPlayerPath) {
                    fill = '#15803d';
                    stroke = '#4ade80';
                  } else if (isEnd) {
                    fill = '#92400e';
                    stroke = '#fbbf24';
                  }
                } else if (isStart || isEnd) {
                  fill = '#0f172a';
                  stroke = '#34d399';
                }

                return (
                  <g
                    key={node.id}
                    onClick={() => handleNodeClick(node.id)}
                    className={settings.challenge !== 'mst' ? 'cursor-pointer' : ''}
                  >
                    <circle cx={node.x} cy={node.y} r="22" fill={fill} stroke={stroke} strokeWidth="3" />
                    <text
                      x={node.x}
                      y={node.y + 6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="16"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.label}
                    </text>
                    {settings.challenge === 'shortest-path' && isStart && (
                      <text
                        x={node.x}
                        y={node.y - 30}
                        textAnchor="middle"
                        fill="#4ade80"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        START
                      </text>
                    )}
                    {settings.challenge === 'shortest-path' && isEnd && (
                      <text
                        x={node.x}
                        y={node.y - 30}
                        textAnchor="middle"
                        fill="#fbbf24"
                        fontSize="11"
                        fontWeight="bold"
                      >
                        END
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {phase === 'PLAYING' && (
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div className="text-xs text-slate-400">
                {settings.challenge === 'shortest-path' &&
                  'Click vào đỉnh kề để nối đường từ START → END. Click đỉnh liền trước để quay lui.'}
                {settings.challenge === 'mst' &&
                  'Click trực tiếp lên từng cạnh (hoặc nhãn trọng số) để bật/tắt cạnh trong cây khung.'}
                {settings.challenge === 'coloring' &&
                  'Chọn màu phía trên rồi click vào từng đỉnh để tô màu.'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPathNodes([0]);
                    setSelectedEdges(new Set());
                    setNodeColors(Array(puzzle.nodes.length).fill(-1));
                  }}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-300 text-sm"
                >
                  Đặt Lại
                </button>
                <button
                  onClick={handleVerify}
                  className="px-10 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 font-black text-white shadow-lg"
                >
                  NỘP BÀI &amp; KIỂM TRA
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
