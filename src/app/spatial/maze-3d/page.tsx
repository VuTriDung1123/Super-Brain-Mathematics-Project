'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type MazeSize = 3 | 4 | 5;
type VisibilityMode = 'standard' | 'fog';

interface Coord3D {
  x: number;
  y: number;
  z: number;
}

interface GameSettings {
  size: MazeSize;
  visibility: VisibilityMode;
  timeMode: 'manual' | 'timer';
  timeLimit: number;
}

interface MazeEdge {
  from: Coord3D;
  to: Coord3D;
  key: string;
}

interface Maze3DData {
  size: number;
  adjacency: Record<string, Coord3D[]>;
  edges: MazeEdge[];
  shortestPath: Coord3D[];
}

const coordKey = (c: Coord3D) => `${c.x},${c.y},${c.z}`;
const edgeKey = (a: Coord3D, b: Coord3D) => {
  const ka = coordKey(a);
  const kb = coordKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
};

const DIRS_3D: Coord3D[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

function generateMaze3D(size: number): Maze3DData {
  const adjacency: Record<string, Coord3D[]> = {};
  const edges: MazeEdge[] = [];
  const visited = new Set<string>();

  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        adjacency[`${x},${y},${z}`] = [];
      }
    }
  }

  const stack: Coord3D[] = [{ x: 0, y: 0, z: 0 }];
  visited.add('0,0,0');

  while (stack.length > 0) {
    const curr = stack[stack.length - 1];
    const neighbors: Coord3D[] = [];

    for (const d of DIRS_3D) {
      const nx = curr.x + d.x;
      const ny = curr.y + d.y;
      const nz = curr.z + d.z;
      if (nx >= 0 && nx < size && ny >= 0 && ny < size && nz >= 0 && nz < size) {
        const nk = `${nx},${ny},${nz}`;
        if (!visited.has(nk)) {
          neighbors.push({ x: nx, y: ny, z: nz });
        }
      }
    }

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[Math.floor(Math.random() * neighbors.length)];
      const ck = coordKey(curr);
      const nk = coordKey(next);
      adjacency[ck].push(next);
      adjacency[nk].push(curr);
      edges.push({ from: curr, to: next, key: edgeKey(curr, next) });
      visited.add(nk);
      stack.push(next);
    }
  }

  // BFS shortest path from (0,0,0) to (size-1, size-1, size-1)
  const startKey = '0,0,0';
  const goalKey = `${size - 1},${size - 1},${size - 1}`;
  const parent: Record<string, string | null> = { [startKey]: null };
  const bfsQueue: Coord3D[] = [{ x: 0, y: 0, z: 0 }];

  while (bfsQueue.length > 0) {
    const curr = bfsQueue.shift()!;
    const ck = coordKey(curr);
    if (ck === goalKey) break;
    for (const nb of adjacency[ck]) {
      const nk = coordKey(nb);
      if (!(nk in parent)) {
        parent[nk] = ck;
        bfsQueue.push(nb);
      }
    }
  }

  const shortestPath: Coord3D[] = [];
  let trace: string | null = goalKey;
  while (trace) {
    const [x, y, z] = trace.split(',').map(Number);
    shortestPath.push({ x, y, z });
    trace = parent[trace] ?? null;
  }
  shortestPath.reverse();

  return { size, adjacency, edges, shortestPath };
}

interface MazeSceneProps {
  maze: Maze3DData;
  currentPos: Coord3D;
  visitedKeys: Set<string>;
  playerPath: Coord3D[];
  visibility: VisibilityMode;
  showSolution: boolean;
  onMoveTo: (target: Coord3D) => void;
}

function Maze3DScene({
  maze,
  currentPos,
  visitedKeys,
  playerPath,
  visibility,
  showSolution,
  onMoveTo,
}: MazeSceneProps) {
  const spacing = 1.7;
  const offset = ((maze.size - 1) * spacing) / 2;

  const toWorld = useCallback(
    (c: Coord3D): [number, number, number] => [
      c.x * spacing - offset,
      c.y * spacing - offset,
      c.z * spacing - offset,
    ],
    [offset]
  );

  const currKey = coordKey(currentPos);
  const reachableNeighbors = useMemo(() => {
    return new Set((maze.adjacency[currKey] ?? []).map(coordKey));
  }, [maze.adjacency, currKey]);

  const solutionEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < maze.shortestPath.length - 1; i++) {
      set.add(edgeKey(maze.shortestPath[i], maze.shortestPath[i + 1]));
    }
    return set;
  }, [maze.shortestPath]);

  const playerEdgeKeys = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < playerPath.length - 1; i++) {
      set.add(edgeKey(playerPath[i], playerPath[i + 1]));
    }
    return set;
  }, [playerPath]);

  const goalKey = `${maze.size - 1},${maze.size - 1},${maze.size - 1}`;

  const allNodes = useMemo(() => {
    const nodes: Coord3D[] = [];
    for (let x = 0; x < maze.size; x++) {
      for (let y = 0; y < maze.size; y++) {
        for (let z = 0; z < maze.size; z++) {
          nodes.push({ x, y, z });
        }
      }
    }
    return nodes;
  }, [maze.size]);

  const isNodeVisible = (k: string) => {
    if (visibility === 'standard' || showSolution) return true;
    return visitedKeys.has(k) || reachableNeighbors.has(k) || k === goalKey;
  };

  return (
    <group>
      {/* Bounding cube wireframe */}
      <mesh>
        <boxGeometry
          args={[
            (maze.size - 1) * spacing + 0.9,
            (maze.size - 1) * spacing + 0.9,
            (maze.size - 1) * spacing + 0.9,
          ]}
        />
        <meshBasicMaterial color="#334155" wireframe transparent opacity={0.22} />
      </mesh>

      {/* Corridors */}
      {maze.edges.map((edge) => {
        const k1 = coordKey(edge.from);
        const k2 = coordKey(edge.to);
        if (
          visibility === 'fog' &&
          !showSolution &&
          !visitedKeys.has(k1) &&
          !visitedKeys.has(k2)
        ) {
          return null;
        }
        const isSol = showSolution && solutionEdgeKeys.has(edge.key);
        const isPlayer = playerEdgeKeys.has(edge.key);
        const isReachableEdge = k1 === currKey || k2 === currKey;

        const color = isSol
          ? '#facc15'
          : isPlayer
            ? '#f97316'
            : isReachableEdge
              ? '#38bdf8'
              : '#475569';
        const lineWidth = isSol ? 5 : isPlayer ? 4 : isReachableEdge ? 3.5 : 1.8;

        return (
          <Line
            key={edge.key}
            points={[toWorld(edge.from), toWorld(edge.to)]}
            color={color}
            lineWidth={lineWidth}
            transparent
            opacity={isSol || isPlayer || isReachableEdge ? 0.95 : 0.4}
          />
        );
      })}

      {/* Nodes */}
      {allNodes.map((node) => {
        const k = coordKey(node);
        if (!isNodeVisible(k)) return null;

        const isCurrent = k === currKey;
        const isStart = k === '0,0,0';
        const isGoal = k === goalKey;
        const isReachable = reachableNeighbors.has(k);
        const isVisited = visitedKeys.has(k);

        let color = '#64748b';
        let radius = 0.14;
        if (isCurrent) {
          color = '#fb923c';
          radius = 0.34;
        } else if (isGoal) {
          color = '#facc15';
          radius = 0.32;
        } else if (isReachable) {
          color = '#38bdf8';
          radius = 0.25;
        } else if (isStart) {
          color = '#10b981';
          radius = 0.24;
        } else if (isVisited) {
          color = '#f97316';
          radius = 0.18;
        }

        return (
          <mesh
            key={k}
            position={toWorld(node)}
            onClick={(e) => {
              e.stopPropagation();
              if (isReachable) onMoveTo(node);
            }}
          >
            <sphereGeometry args={[radius, 20, 20]} />
            <meshStandardMaterial
              color={color}
              emissive={isCurrent || isGoal || isReachable ? color : '#000000'}
              emissiveIntensity={isCurrent ? 0.7 : isGoal ? 0.5 : isReachable ? 0.35 : 0}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function SpatialMaze3DGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    size: 3,
    visibility: 'standard',
    timeMode: 'manual',
    timeLimit: 120,
  });

  const [maze, setMaze] = useState<Maze3DData | null>(null);
  const [currentPos, setCurrentPos] = useState<Coord3D>({ x: 0, y: 0, z: 0 });
  const [playerPath, setPlayerPath] = useState<Coord3D[]>([]);
  const [visitedKeys, setVisitedKeys] = useState<Set<string>>(new Set(['0,0,0']));
  const [stepsCount, setStepsCount] = useState(0);
  const [displayTime, setDisplayTime] = useState(0);
  const [isWin, setIsWin] = useState(false);
  const [isReviewing3D, setIsReviewing3D] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeCounterRef = useRef(0);

  const startGame = () => {
    const newMaze = generateMaze3D(settings.size);
    const start: Coord3D = { x: 0, y: 0, z: 0 };
    setMaze(newMaze);
    setCurrentPos(start);
    setPlayerPath([start]);
    setVisitedKeys(new Set(['0,0,0']));
    setStepsCount(0);
    setIsWin(false);
    setIsReviewing3D(false);

    const initTime = settings.timeMode === 'timer' ? settings.timeLimit : 0;
    timeCounterRef.current = initTime;
    setDisplayTime(initTime);
    setPhase('PLAYING');
  };

  const handleMoveTo = useCallback(
    (target: Coord3D) => {
      if (phase !== 'PLAYING' || !maze) return;
      const ck = coordKey(currentPos);
      const tk = coordKey(target);
      const isConnected = (maze.adjacency[ck] ?? []).some((n) => coordKey(n) === tk);
      if (!isConnected) return;

      setCurrentPos(target);
      setStepsCount((s) => s + 1);
      setVisitedKeys((prev) => {
        const next = new Set(prev);
        next.add(tk);
        return next;
      });
      setPlayerPath((prev) => {
        if (prev.length >= 2 && coordKey(prev[prev.length - 2]) === tk) {
          return prev.slice(0, -1);
        }
        return [...prev, target];
      });

      if (target.x === maze.size - 1 && target.y === maze.size - 1 && target.z === maze.size - 1) {
        setIsWin(true);
        setPhase('RESULT');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    },
    [phase, maze, currentPos]
  );

  const moveDelta = useCallback(
    (dx: number, dy: number, dz: number) => {
      handleMoveTo({
        x: currentPos.x + dx,
        y: currentPos.y + dy,
        z: currentPos.z + dz,
      });
    },
    [currentPos, handleMoveTo]
  );

  // Keyboard 3D controls
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        moveDelta(1, 0, 0);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        moveDelta(-1, 0, 0);
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        moveDelta(0, 0, -1);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        moveDelta(0, 0, 1);
      } else if (e.key === 'e' || e.key === 'E' || e.key === ' ') {
        e.preventDefault();
        moveDelta(0, 1, 0);
      } else if (e.key === 'q' || e.key === 'Q' || e.key === 'Shift') {
        e.preventDefault();
        moveDelta(0, -1, 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, moveDelta]);

  // Clean timer
  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (settings.timeMode === 'timer') {
        timeCounterRef.current -= 1;
        if (timeCounterRef.current <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDisplayTime(0);
          setIsWin(false);
          setPhase('RESULT');
          return;
        }
        setDisplayTime(timeCounterRef.current);
      } else {
        timeCounterRef.current += 1;
        setDisplayTime(timeCounterRef.current);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, settings.timeMode]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const canMove = (dx: number, dy: number, dz: number) => {
    if (!maze) return false;
    const tk = `${currentPos.x + dx},${currentPos.y + dy},${currentPos.z + dz}`;
    return (maze.adjacency[coordKey(currentPos)] ?? []).some((n) => coordKey(n) === tk);
  };

  return (
    <div className="h-screen w-full bg-slate-950 text-white font-sans overflow-hidden relative selection:bg-yellow-500 selection:text-black">
      {/* HEADER */}
      <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center pointer-events-none">
        <Link
          href="/spatial"
          className="pointer-events-auto inline-flex items-center text-slate-400 hover:text-yellow-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Menu Không Gian
        </Link>

        {phase === 'PLAYING' && (
          <div className="pointer-events-auto flex items-center gap-3 font-mono">
            <div className="px-4 py-2 rounded-xl bg-slate-900/85 border border-slate-700 text-sm text-slate-300 backdrop-blur">
              Tọa độ:{' '}
              <span className="text-orange-400 font-bold">
                ({currentPos.x}, {currentPos.y}, {currentPos.z})
              </span>{' '}
              • Bước: <span className="text-white font-bold">{stepsCount}</span>
            </div>
            <div
              className={`px-5 py-2 rounded-xl border-2 text-xl font-bold backdrop-blur ${
                settings.timeMode === 'timer' && displayTime < 15
                  ? 'border-red-500 text-red-400 bg-red-950/40 animate-pulse'
                  : 'border-yellow-500/50 text-yellow-400 bg-slate-900/85'
              }`}
            >
              {formatTime(displayTime)}
            </div>
          </div>
        )}

        {phase === 'RESULT' && isReviewing3D && (
          <button
            onClick={() => setIsReviewing3D(false)}
            className="pointer-events-auto px-5 py-2 bg-slate-800 border border-slate-600 rounded-xl font-bold text-white hover:bg-slate-700"
          >
            Quay lại Kết Quả
          </button>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="absolute inset-0 z-20 overflow-y-auto bg-slate-950/95 px-6 pt-24 pb-16 animate-fade-in">
          <div className="max-w-7xl mx-auto">
            <div className="mb-10 border-b border-slate-800 pb-6">
              <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                MÊ CUNG KHÔNG GIAN 3D
              </h1>
              <p className="text-xl text-slate-400 uppercase tracking-widest">
                Spatial 3D Maze • Định hướng đa tầng trục X-Y-Z
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                <section>
                  <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <span className="w-8 h-8 rounded bg-yellow-900/50 text-yellow-400 flex items-center justify-center mr-3 text-sm">
                      01
                    </span>
                    Giới thiệu thử thách
                  </h2>
                  <p className="text-lg text-slate-300 leading-relaxed">
                    Thay vì mê cung phẳng 2 chiều, bạn phải điều hướng qua mạng lưới đường hầm nằm trong một khối lập phương{' '}
                    <strong className="text-white">N × N × N</strong> từ góc{' '}
                    <span className="text-emerald-400 font-mono font-bold">(0, 0, 0)</span> tới đích vàng ở góc đối diện{' '}
                    <span className="text-yellow-400 font-mono font-bold">(N-1, N-1, N-1)</span>.
                  </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <h3 className="text-yellow-400 font-bold mb-2 uppercase text-sm">
                      🎮 Cách di chuyển
                    </h3>
                    <ul className="text-slate-400 text-sm space-y-1.5 list-disc list-inside">
                      <li>Click trực tiếp vào các nút phát sáng <span className="text-sky-400 font-bold">Xanh lam</span> liền kề trên khối 3D.</li>
                      <li>Hoặc dùng phím <strong className="text-white">WASD / Mũi tên</strong> (mặt phẳng X-Z) và <strong className="text-white">E / Q</strong> (lên/xuống trục Y).</li>
                      <li>Kéo chuột trên nền trống để xoay toàn bộ mê cung 360°.</li>
                    </ul>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                    <h3 className="text-orange-400 font-bold mb-2 uppercase text-sm">
                      🌫️ Chế độ Sương Mù (Fog)
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      Ở chế độ Sương Mù, bạn chỉ nhìn thấy các nhánh đường đã đi qua và những nút nối kề hiện tại — ép não bộ phải dựng bản đồ không gian 3D trong trí nhớ!
                    </p>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-1">
                <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                  <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                    Thiết Lập Mê Cung
                  </h3>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Kích thước không gian
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {([3, 4, 5] as MazeSize[]).map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSettings({ ...settings, size: sz })}
                          className={`py-2.5 rounded-xl text-sm font-bold border ${
                            settings.size === sz
                              ? 'bg-yellow-600 border-yellow-400 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}
                        >
                          {sz}×{sz}×{sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Tầm nhìn
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setSettings({ ...settings, visibility: 'standard' })}
                        className={`py-2.5 rounded-xl text-xs font-bold border ${
                          settings.visibility === 'standard'
                            ? 'bg-orange-600 border-orange-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Toàn Cảnh 3D
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, visibility: 'fog' })}
                        className={`py-2.5 rounded-xl text-xs font-bold border ${
                          settings.visibility === 'fog'
                            ? 'bg-orange-600 border-orange-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Sương Mù (Fog)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                      Thời gian
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        onClick={() => setSettings({ ...settings, timeMode: 'manual' })}
                        className={`py-2 rounded-lg text-xs font-bold border ${
                          settings.timeMode === 'manual'
                            ? 'bg-yellow-600 border-yellow-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Tự do
                      </button>
                      <button
                        onClick={() => setSettings({ ...settings, timeMode: 'timer' })}
                        className={`py-2 rounded-lg text-xs font-bold border ${
                          settings.timeMode === 'timer'
                            ? 'bg-yellow-600 border-yellow-400 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        Giới hạn
                      </button>
                    </div>
                    {settings.timeMode === 'timer' && (
                      <>
                        <input
                          type="range"
                          min="30"
                          max="300"
                          step="15"
                          value={settings.timeLimit}
                          onChange={(e) =>
                            setSettings({ ...settings, timeLimit: parseInt(e.target.value, 10) })
                          }
                          className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                        />
                        <p className="text-right text-xs text-yellow-400 mt-1">
                          {settings.timeLimit} giây
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    onClick={startGame}
                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                  >
                    KHỞI TẠO MÊ CUNG 3D
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESULT OVERLAY */}
      {phase === 'RESULT' && !isReviewing3D && maze && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl">
            <div className="text-6xl mb-4">{isWin ? '🏆' : '⏱️'}</div>
            <h2
              className={`text-4xl font-black mb-2 ${
                isWin ? 'text-emerald-400' : 'text-red-500'
              }`}
            >
              {isWin ? 'VƯỢT MÊ CUNG THÀNH CÔNG!' : 'HẾT THỜI GIAN!'}
            </h2>
            <p className="text-slate-400 mb-6">
              {isWin
                ? `Bạn đã chạm đích trong ${stepsCount} bước (đường ngắn nhất tối ưu: ${
                    maze.shortestPath.length - 1
                  } bước).`
                : 'Hãy xem đường đi tối ưu màu vàng trên khối 3D để rút kinh nghiệm.'}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setIsReviewing3D(true)}
                className="w-full py-3 bg-yellow-600 hover:bg-yellow-500 rounded-xl font-bold text-white"
              >
                Xem Đường Ngắn Nhất Trên Khối 3D
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setPhase('SETUP')}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300"
                >
                  Cấu Hình
                </button>
                <button
                  onClick={startGame}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-white"
                >
                  Chơi Lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3D CANVAS + D-PAD */}
      {(phase === 'PLAYING' || (phase === 'RESULT' && isReviewing3D)) && maze && (
        <>
          {phase === 'PLAYING' && (
            <div className="absolute bottom-6 right-6 z-20 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl p-4 shadow-2xl">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-2">
                Điều Khiển 6 Hướng
              </div>
              <div className="grid grid-cols-3 gap-1.5 w-36 mb-2">
                <div />
                <button
                  disabled={!canMove(0, 0, -1)}
                  onClick={() => moveDelta(0, 0, -1)}
                  className="h-10 rounded-lg bg-slate-800 hover:bg-sky-600 disabled:opacity-25 font-bold text-xs border border-slate-700"
                >
                  -Z (W)
                </button>
                <div />
                <button
                  disabled={!canMove(-1, 0, 0)}
                  onClick={() => moveDelta(-1, 0, 0)}
                  className="h-10 rounded-lg bg-slate-800 hover:bg-sky-600 disabled:opacity-25 font-bold text-xs border border-slate-700"
                >
                  -X (A)
                </button>
                <button
                  disabled={!canMove(0, 0, 1)}
                  onClick={() => moveDelta(0, 0, 1)}
                  className="h-10 rounded-lg bg-slate-800 hover:bg-sky-600 disabled:opacity-25 font-bold text-xs border border-slate-700"
                >
                  +Z (S)
                </button>
                <button
                  disabled={!canMove(1, 0, 0)}
                  onClick={() => moveDelta(1, 0, 0)}
                  className="h-10 rounded-lg bg-slate-800 hover:bg-sky-600 disabled:opacity-25 font-bold text-xs border border-slate-700"
                >
                  +X (D)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  disabled={!canMove(0, 1, 0)}
                  onClick={() => moveDelta(0, 1, 0)}
                  className="py-2 rounded-lg bg-emerald-900/60 hover:bg-emerald-600 disabled:opacity-25 font-bold text-xs border border-emerald-700"
                >
                  ↑ Lên (+Y / E)
                </button>
                <button
                  disabled={!canMove(0, -1, 0)}
                  onClick={() => moveDelta(0, -1, 0)}
                  className="py-2 rounded-lg bg-amber-900/60 hover:bg-amber-600 disabled:opacity-25 font-bold text-xs border border-amber-700"
                >
                  ↓ Xuống (-Y / Q)
                </button>
              </div>
            </div>
          )}

          <div className="absolute bottom-6 left-6 z-20 pointer-events-none bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 space-y-1">
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-400 mr-2" /> Vị trí hiện tại •{' '}
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-400 mx-1" /> Nút đi được (Click)
            </div>
            <div>
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400 mr-2" /> Đích ({maze.size - 1}, {maze.size - 1}, {maze.size - 1}) • Kéo chuột để xoay góc nhìn
            </div>
          </div>

          <Canvas camera={{ position: [maze.size * 2.1, maze.size * 1.8, maze.size * 2.3], fov: 48 }}>
            <ambientLight intensity={0.75} />
            <pointLight position={[15, 15, 15]} intensity={1} />
            <pointLight position={[-15, -10, -15]} intensity={0.5} />
            <Maze3DScene
              maze={maze}
              currentPos={currentPos}
              visitedKeys={visitedKeys}
              playerPath={playerPath}
              visibility={settings.visibility}
              showSolution={isReviewing3D}
              onMoveTo={handleMoveTo}
            />
            <OrbitControls enablePan={false} minDistance={4} maxDistance={22} dampingFactor={0.06} />
          </Canvas>
        </>
      )}
    </div>
  );
}
