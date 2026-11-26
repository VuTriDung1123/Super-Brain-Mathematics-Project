'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type PhysicsMode = 'projectile' | 'laser';
type Difficulty = 'easy' | 'medium' | 'hard';

interface GameSettings {
  mode: PhysicsMode;
  difficulty: Difficulty;
  rounds: number;
}

interface ProjectileLevel {
  targetX: number; // meters (20..120)
  targetY: number; // meters (0..25)
  wallX: number | null;
  wallHeight: number;
  fixedAngle: number | null; // if set, player solves for v0; else free aim angle & v0
  targetRadius: number;
  hintFormula: string;
  idealAngle: number;
  idealV0: number;
}

interface LaserLevel {
  cols: number;
  rows: number;
  mirrors: Record<string, '/' | '\\'>; // key: "r,c"
  entrySide: 'left' | 'top';
  entryIndex: number; // row if left, col if top
  pathPoints: [number, number][]; // normalized grid cell centers/edges
  exitLabel: string;
  candidateExits: string[];
}

const G = 10; // Clean gravitational acceleration 10 m/s^2 for mental physics

function generateProjectileLevel(difficulty: Difficulty): ProjectileLevel {
  if (difficulty === 'easy') {
    // Flat ground Y=0, fixed 45° angle -> R = v0^2 / g -> exact integer v0!
    const v0Choices = [20, 25, 30, 32, 34];
    const idealV0 = v0Choices[Math.floor(Math.random() * v0Choices.length)];
    const targetX = Math.round((idealV0 * idealV0) / G); // 40..115.6m
    return {
      targetX,
      targetY: 0,
      wallX: null,
      wallHeight: 0,
      fixedAngle: 45,
      targetRadius: 5,
      hintFormula: 'Với θ = 45° và mặt đất phẳng: Tầm xa R = v₀² / g (g = 10 m/s²).',
      idealAngle: 45,
      idealV0,
    };
  }

  // Medium / Hard: elevated target + optional obstacle wall, player controls BOTH angle & v0
  const idealAngle = difficulty === 'medium' ? 45 : [50, 55, 60][Math.floor(Math.random() * 3)];
  const idealV0 = Math.floor(Math.random() * 14) + 24; // 24..37 m/s
  const rad = (idealAngle * Math.PI) / 180;
  const vx = idealV0 * Math.cos(rad);
  const vy = idealV0 * Math.sin(rad);
  const flightT = (2 * vy) / G;
  // Pick a point on the descending arc
  const tHit = flightT * (difficulty === 'medium' ? 0.85 : 0.78);
  const targetX = Math.max(30, Math.min(115, Math.round(vx * tHit)));
  const targetY = Math.max(0, Math.min(26, Math.round(vy * tHit - 0.5 * G * tHit * tHit)));

  let wallX: number | null = null;
  let wallHeight = 0;
  if (difficulty === 'hard') {
    wallX = Math.round(targetX * 0.5);
    const tWall = wallX / vx;
    const yAtWall = vy * tWall - 0.5 * G * tWall * tWall;
    wallHeight = Math.max(6, Math.min(28, Math.floor(yAtWall - 5)));
  }

  return {
    targetX,
    targetY,
    wallX,
    wallHeight,
    fixedAngle: null,
    targetRadius: difficulty === 'medium' ? 5.5 : 4.5,
    hintFormula:
      'Phương trình quỹ đạo: y(x) = x·tan(θ) − g·x² / (2·v₀²·cos²(θ)), với g = 10 m/s².',
    idealAngle,
    idealV0,
  };
}

function generateLaserLevel(difficulty: Difficulty): LaserLevel {
  const cols = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const rows = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 5 : 6;
  const mirrorCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;

  const mirrors: Record<string, '/' | '\\'> = {};
  let placed = 0;
  let guard = 0;
  while (placed < mirrorCount && guard < 200) {
    guard++;
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    const key = `${r},${c}`;
    if (!(key in mirrors)) {
      mirrors[key] = Math.random() < 0.5 ? '/' : '\\';
      placed++;
    }
  }

  const entrySide: 'left' | 'top' = Math.random() < 0.5 ? 'left' : 'top';
  const entryIndex =
    entrySide === 'left' ? Math.floor(Math.random() * rows) : Math.floor(Math.random() * cols);

  // Trace laser ray through the grid
  let r = entrySide === 'left' ? entryIndex : 0;
  let c = entrySide === 'left' ? 0 : entryIndex;
  let dr = entrySide === 'left' ? 0 : 1;
  let dc = entrySide === 'left' ? 1 : 0;

  const pathPoints: [number, number][] = [
    entrySide === 'left' ? [0, r + 0.5] : [c + 0.5, 0],
  ];

  let safety = 0;
  while (r >= 0 && r < rows && c >= 0 && c < cols && safety < 100) {
    safety++;
    pathPoints.push([c + 0.5, r + 0.5]);
    const m = mirrors[`${r},${c}`];
    if (m === '/') {
      // (dr, dc) -> (-dc, -dr)
      const nextDr = -dc;
      const nextDc = -dr;
      dr = nextDr;
      dc = nextDc;
    } else if (m === '\\') {
      // (dr, dc) -> (dc, dr)
      const nextDr = dc;
      const nextDc = dr;
      dr = nextDr;
      dc = nextDc;
    }
    r += dr;
    c += dc;
  }

  // Compute exit point on outer boundary and label
  let exitLabel = '';
  if (r < 0) {
    pathPoints.push([c + 0.5, 0]);
    exitLabel = `T${c + 1}`;
  } else if (r >= rows) {
    pathPoints.push([c + 0.5, rows]);
    exitLabel = `B${c + 1}`;
  } else if (c < 0) {
    pathPoints.push([0, r + 0.5]);
    exitLabel = `L${r + 1}`;
  } else {
    pathPoints.push([cols, r + 0.5]);
    exitLabel = `R${r + 1}`;
  }

  // All perimeter ports except the entry port
  const entryLabel = entrySide === 'left' ? `L${entryIndex + 1}` : `T${entryIndex + 1}`;
  const allPorts: string[] = [];
  for (let i = 1; i <= cols; i++) allPorts.push(`T${i}`, `B${i}`);
  for (let i = 1; i <= rows; i++) allPorts.push(`L${i}`, `R${i}`);
  const distractorPool = allPorts.filter((p) => p !== exitLabel && p !== entryLabel);
  distractorPool.sort(() => Math.random() - 0.5);
  const candidateExits = [exitLabel, ...distractorPool.slice(0, 3)].sort();

  return {
    cols,
    rows,
    mirrors,
    entrySide,
    entryIndex,
    pathPoints,
    exitLabel,
    candidateExits,
  };
}

export default function TrajectoryGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    mode: 'projectile',
    difficulty: 'easy',
    rounds: 5,
  });

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);

  // Projectile state
  const [projLevel, setProjLevel] = useState<ProjectileLevel | null>(null);
  const [angle, setAngle] = useState(45);
  const [velocity, setVelocity] = useState(25);
  const [trail, setTrail] = useState<[number, number][]>([]);
  const [isFiring, setIsFiring] = useState(false);
  const [projStatus, setProjStatus] = useState<'idle' | 'hit' | 'miss' | 'wall'>('idle');
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Laser state
  const [laserLevel, setLaserLevel] = useState<LaserLevel | null>(null);
  const [selectedPort, setSelectedPort] = useState<string | null>(null);
  const [laserRevealed, setLaserRevealed] = useState(false);

  const animRef = useRef<number | null>(null);

  const initRound = (mode: PhysicsMode, diff: Difficulty) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setIsFiring(false);
    setTrail([]);
    setProjStatus('idle');
    setAttemptsLeft(3);
    setSelectedPort(null);
    setLaserRevealed(false);

    if (mode === 'projectile') {
      const lv = generateProjectileLevel(diff);
      setProjLevel(lv);
      setAngle(lv.fixedAngle ?? 45);
      setVelocity(20);
      setLaserLevel(null);
    } else {
      setLaserLevel(generateLaserLevel(diff));
      setProjLevel(null);
    }
  };

  const startGame = () => {
    setRoundIdx(0);
    setScore(0);
    initRound(settings.mode, settings.difficulty);
    setPhase('PLAYING');
  };

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const fireProjectile = () => {
    if (!projLevel || isFiring || projStatus === 'hit' || attemptsLeft <= 0) return;

    setIsFiring(true);
    setProjStatus('idle');
    setTrail([[0, 0]]);

    const rad = (angle * Math.PI) / 180;
    const vx = velocity * Math.cos(rad);
    const vy = velocity * Math.sin(rad);
    const points: [number, number][] = [[0, 0]];
    let t = 0;

    const step = () => {
      t += 0.045;
      const x = vx * t;
      const y = vy * t - 0.5 * G * t * t;
      points.push([x, Math.max(0, y)]);
      setTrail([...points]);

      // Wall collision
      if (
        projLevel.wallX !== null &&
        Math.abs(x - projLevel.wallX) < 1.6 &&
        y <= projLevel.wallHeight
      ) {
        setIsFiring(false);
        setProjStatus('wall');
        setAttemptsLeft((a) => a - 1);
        return;
      }

      // Target hit check
      const dist = Math.hypot(x - projLevel.targetX, y - projLevel.targetY);
      if (dist <= projLevel.targetRadius) {
        setIsFiring(false);
        setProjStatus('hit');
        setScore((s) => s + 1);
        return;
      }

      // Out of bounds / ground hit
      if (y < 0 || x > 135) {
        setIsFiring(false);
        setProjStatus('miss');
        setAttemptsLeft((a) => a - 1);
        return;
      }

      animRef.current = requestAnimationFrame(step);
    };

    animRef.current = requestAnimationFrame(step);
  };

  const handleSelectLaserPort = (port: string) => {
    if (!laserLevel || laserRevealed) return;
    setSelectedPort(port);
    setLaserRevealed(true);
    if (port === laserLevel.exitLabel) {
      setScore((s) => s + 1);
    }
  };

  const handleNextRound = () => {
    if (roundIdx + 1 < settings.rounds) {
      setRoundIdx((r) => r + 1);
      initRound(settings.mode, settings.difficulty);
    } else {
      setPhase('RESULT');
    }
  };

  // World -> SVG coordinates for Projectile arena (world X: 0..130m, Y: 0..55m)
  const toSvgX = (wx: number) => 45 + (wx / 130) * 520;
  const toSvgY = (wy: number) => 285 - (wy / 55) * 245;

  const isProjectileRoundDone = projStatus === 'hit' || attemptsLeft <= 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-teal-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/applied-math"
          className="inline-flex items-center text-slate-500 hover:text-teal-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Toán Ứng Dụng
        </Link>
        {phase === 'PLAYING' && (
          <span className="text-sm font-mono bg-slate-900 border border-teal-500/40 px-4 py-1.5 rounded-full text-teal-400 font-bold">
            Vòng {roundIdx + 1}/{settings.rounds} • Điểm: {score}
          </span>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-500 mb-2">
              QUỸ ĐẠO CHUYỂN ĐỘNG
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Trajectory &amp; Optics • Động học Parabol &amp; Phản xạ Laser
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="text-xl font-bold text-teal-400 mb-2">Đạn Đạo Parabol</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Tính toán chính xác vận tốc đầu <strong className="text-white">v₀</strong> và góc bắn{' '}
                  <strong className="text-white">θ</strong> dưới gia tốc trọng trường{' '}
                  <span className="font-mono text-teal-300">g = 10 m/s²</span> để bắn trúng mục tiêu và vượt chướng ngại vật trong tối đa 3 lượt bắn.
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                <div className="text-3xl mb-3">🔦</div>
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Phản Xạ Tia Laser</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Theo dấu đường đi của chùm laser qua ma trận gương nghiêng 45° (<span className="font-mono text-white">/</span> và{' '}
                  <span className="font-mono text-white">\</span>) trong tâm trí và dự đoán chính xác cổng thoát ra ngoài.
                </p>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Cấu Hình Phòng Thí Nghiệm
                </h3>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                    Chế độ mô phỏng
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSettings({ ...settings, mode: 'projectile' })}
                      className={`py-3 rounded-xl text-sm font-bold border ${
                        settings.mode === 'projectile'
                          ? 'bg-teal-600 border-teal-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      🚀 Đạn Đạo
                    </button>
                    <button
                      onClick={() => setSettings({ ...settings, mode: 'laser' })}
                      className={`py-3 rounded-xl text-sm font-bold border ${
                        settings.mode === 'laser'
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      🔦 Buồng Laser
                    </button>
                  </div>
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
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => setSettings({ ...settings, difficulty: k })}
                        className={`py-2 rounded-lg text-sm font-bold border ${
                          settings.difficulty === k
                            ? 'bg-teal-600 border-teal-400 text-white'
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
                    <label className="text-xs font-bold text-slate-500 uppercase">Số màn chơi</label>
                    <span className="text-teal-400 text-sm font-bold">{settings.rounds} màn</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    value={settings.rounds}
                    onChange={(e) =>
                      setSettings({ ...settings, rounds: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] transition-all"
                >
                  KHỞI CHẠY MÔ PHỎNG
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING: PROJECTILE */}
      {phase === 'PLAYING' && settings.mode === 'projectile' && projLevel && (
        <div className="max-w-5xl mx-auto px-6 pb-16 animate-fade-in space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <div className="text-sm font-mono text-slate-300">
                Mục tiêu:{' '}
                <span className="text-amber-400 font-bold">
                  X = {projLevel.targetX}m, Y = {projLevel.targetY}m
                </span>{' '}
                • <span className="text-teal-400">g = 10 m/s²</span>
              </div>
              <div className="text-xs font-bold uppercase px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Lượt bắn còn lại: {attemptsLeft}/3
              </div>
            </div>

            <svg viewBox="0 0 600 320" className="w-full h-auto bg-slate-950 rounded-2xl border border-slate-800">
              {/* Grid lines every 20m */}
              {[20, 40, 60, 80, 100, 120].map((gx) => (
                <g key={gx}>
                  <line
                    x1={toSvgX(gx)}
                    y1={30}
                    x2={toSvgX(gx)}
                    y2={285}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={toSvgX(gx)}
                    y={304}
                    textAnchor="middle"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {gx}m
                  </text>
                </g>
              ))}
              {[10, 20, 30, 40].map((gy) => (
                <g key={gy}>
                  <line
                    x1={45}
                    y1={toSvgY(gy)}
                    x2={570}
                    y2={toSvgY(gy)}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={36}
                    y={toSvgY(gy) + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {gy}m
                  </text>
                </g>
              ))}

              {/* Ground */}
              <line x1={35} y1={285} x2={580} y2={285} stroke="#334155" strokeWidth="3" />

              {/* Obstacle wall */}
              {projLevel.wallX !== null && (
                <rect
                  x={toSvgX(projLevel.wallX) - 5}
                  y={toSvgY(projLevel.wallHeight)}
                  width={10}
                  height={285 - toSvgY(projLevel.wallHeight)}
                  fill="#ef4444"
                  opacity="0.75"
                  rx="2"
                />
              )}

              {/* Target */}
              <circle
                cx={toSvgX(projLevel.targetX)}
                cy={toSvgY(projLevel.targetY)}
                r={(projLevel.targetRadius / 130) * 520}
                fill="rgba(245, 158, 11, 0.25)"
                stroke="#f59e0b"
                strokeWidth="2.5"
              />
              <circle
                cx={toSvgX(projLevel.targetX)}
                cy={toSvgY(projLevel.targetY)}
                r="4"
                fill="#fbbf24"
              />

              {/* Launcher barrel */}
              <line
                x1={toSvgX(0)}
                y1={toSvgY(0)}
                x2={toSvgX(0) + Math.cos((angle * Math.PI) / 180) * 32}
                y2={toSvgY(0) - Math.sin((angle * Math.PI) / 180) * 32}
                stroke="#14b8a6"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx={toSvgX(0)} cy={toSvgY(0)} r="7" fill="#0d9488" />

              {/* Animated trajectory trail */}
              {trail.length > 1 && (
                <polyline
                  points={trail.map(([x, y]) => `${toSvgX(x).toFixed(1)},${toSvgY(y).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={projStatus === 'hit' ? '#22c55e' : '#2dd4bf'}
                  strokeWidth="3"
                />
              )}
              {trail.length > 0 && (
                <circle
                  cx={toSvgX(trail[trail.length - 1][0])}
                  cy={toSvgY(trail[trail.length - 1][1])}
                  r="5"
                  fill="#ffffff"
                />
              )}
            </svg>

            <p className="text-xs text-slate-400 mt-3 font-mono">{projLevel.hintFormula}</p>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-5 items-end">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400 uppercase">Góc bắn (θ)</span>
                  <span className="text-teal-400 font-mono">{angle}°</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="80"
                  disabled={projLevel.fixedAngle !== null || isFiring || isProjectileRoundDone}
                  value={angle}
                  onChange={(e) => setAngle(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500 disabled:opacity-40"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-400 uppercase">Vận tốc đầu (v₀)</span>
                  <span className="text-emerald-400 font-mono">{velocity} m/s</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="45"
                  step="1"
                  disabled={isFiring || isProjectileRoundDone}
                  value={velocity}
                  onChange={(e) => setVelocity(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-40"
                />
              </div>

              <div>
                {!isProjectileRoundDone ? (
                  <button
                    onClick={fireProjectile}
                    disabled={isFiring}
                    className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-50 rounded-xl font-black text-white shadow-lg"
                  >
                    {isFiring ? 'ĐANG BAY...' : '🚀 PHÓNG VẬT THỂ'}
                  </button>
                ) : (
                  <button
                    onClick={handleNextRound}
                    className="w-full py-3.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-black text-white shadow-lg"
                  >
                    {roundIdx + 1 < settings.rounds ? 'Màn Tiếp Theo →' : 'Xem Tổng Kết'}
                  </button>
                )}
              </div>
            </div>

            {projStatus !== 'idle' && (
              <div
                className={`mt-4 p-4 rounded-xl border text-sm font-bold ${
                  projStatus === 'hit'
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/60 text-red-300'
                }`}
              >
                {projStatus === 'hit'
                  ? '🎯 TRÚNG ĐÍCH HOÀN HẢO! Tính toán quỹ đạo cực chuẩn.'
                  : projStatus === 'wall'
                    ? `💥 Đạn đã va vào tường chắn! ${
                        attemptsLeft <= 0
                          ? `Gợi ý tham số chuẩn: θ = ${projLevel.idealAngle}°, v₀ = ${projLevel.idealV0} m/s.`
                          : 'Hãy tăng góc bắn hoặc điều chỉnh vận tốc!'
                      }`
                    : `✖ Lệch mục tiêu! ${
                        attemptsLeft <= 0
                          ? `Hết lượt! Tham số chuẩn: θ = ${projLevel.idealAngle}°, v₀ = ${projLevel.idealV0} m/s.`
                          : 'Điều chỉnh lại v₀ hoặc θ và bắn tiếp.'
                      }`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAYING: LASER OPTICS */}
      {phase === 'PLAYING' && settings.mode === 'laser' && laserLevel && (
        <div className="max-w-4xl mx-auto px-6 pb-16 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6">
            <h2 className="text-xl font-bold text-center text-slate-200">
              Tia laser đi vào từ mũi tên màu xanh lá. Tia sẽ thoát ra tại CỔNG nào?
            </h2>

            <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex justify-center">
              {(() => {
                const cell = 58;
                const pad = 42;
                const w = laserLevel.cols * cell + pad * 2;
                const h = laserLevel.rows * cell + pad * 2;
                const ptX = (gx: number) => pad + gx * cell;
                const ptY = (gy: number) => pad + gy * cell;
                const entryX =
                  laserLevel.entrySide === 'left' ? pad - 22 : ptX(laserLevel.entryIndex + 0.5);
                const entryY =
                  laserLevel.entrySide === 'left' ? ptY(laserLevel.entryIndex + 0.5) : pad - 22;

                return (
                  <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-auto">
                    {/* Grid cells */}
                    {Array.from({ length: laserLevel.rows }).map((_, r) =>
                      Array.from({ length: laserLevel.cols }).map((__, c) => {
                        const m = laserLevel.mirrors[`${r},${c}`];
                        const x = ptX(c);
                        const y = ptY(r);
                        return (
                          <g key={`${r}-${c}`}>
                            <rect
                              x={x}
                              y={y}
                              width={cell}
                              height={cell}
                              fill="#0f172a"
                              stroke="#1e293b"
                              strokeWidth="1.5"
                            />
                            {m === '/' && (
                              <line
                                x1={x + 12}
                                y1={y + cell - 12}
                                x2={x + cell - 12}
                                y2={y + 12}
                                stroke="#38bdf8"
                                strokeWidth="5"
                                strokeLinecap="round"
                              />
                            )}
                            {m === '\\' && (
                              <line
                                x1={x + 12}
                                y1={y + 12}
                                x2={x + cell - 12}
                                y2={y + cell - 12}
                                stroke="#f59e0b"
                                strokeWidth="5"
                                strokeLinecap="round"
                              />
                            )}
                          </g>
                        );
                      })
                    )}

                    {/* Perimeter Port Labels */}
                    {Array.from({ length: laserLevel.cols }).map((_, c) => (
                      <g key={`tb-${c}`}>
                        <text
                          x={ptX(c + 0.5)}
                          y={pad - 14}
                          textAnchor="middle"
                          fill={
                            laserRevealed && laserLevel.exitLabel === `T${c + 1}`
                              ? '#22c55e'
                              : '#94a3b8'
                          }
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {laserLevel.entrySide === 'top' && laserLevel.entryIndex === c
                            ? '↓'
                            : `T${c + 1}`}
                        </text>
                        <text
                          x={ptX(c + 0.5)}
                          y={pad + laserLevel.rows * cell + 22}
                          textAnchor="middle"
                          fill={
                            laserRevealed && laserLevel.exitLabel === `B${c + 1}`
                              ? '#22c55e'
                              : '#94a3b8'
                          }
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          B{c + 1}
                        </text>
                      </g>
                    ))}
                    {Array.from({ length: laserLevel.rows }).map((_, r) => (
                      <g key={`lr-${r}`}>
                        <text
                          x={pad - 16}
                          y={ptY(r + 0.5) + 4}
                          textAnchor="end"
                          fill={
                            laserRevealed && laserLevel.exitLabel === `L${r + 1}`
                              ? '#22c55e'
                              : '#94a3b8'
                          }
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {laserLevel.entrySide === 'left' && laserLevel.entryIndex === r
                            ? '→'
                            : `L${r + 1}`}
                        </text>
                        <text
                          x={pad + laserLevel.cols * cell + 14}
                          y={ptY(r + 0.5) + 4}
                          textAnchor="start"
                          fill={
                            laserRevealed && laserLevel.exitLabel === `R${r + 1}`
                              ? '#22c55e'
                              : '#94a3b8'
                          }
                          fontSize="12"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          R{r + 1}
                        </text>
                      </g>
                    ))}

                    {/* Entry beacon */}
                    <circle cx={entryX} cy={entryY} r="7" fill="#10b981" />

                    {/* Revealed Laser Beam Path */}
                    {laserRevealed && (
                      <polyline
                        points={laserLevel.pathPoints
                          .map(([gx, gy]) => `${ptX(gx).toFixed(1)},${ptY(gy).toFixed(1)}`)
                          .join(' ')}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                );
              })()}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {laserLevel.candidateExits.map((port) => {
                let cls = 'bg-slate-800 border-slate-700 hover:border-emerald-400 text-white';
                if (laserRevealed) {
                  if (port === laserLevel.exitLabel) {
                    cls = 'bg-emerald-950/60 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500';
                  } else if (port === selectedPort) {
                    cls = 'bg-red-950/60 border-red-500 text-red-300';
                  } else {
                    cls = 'bg-slate-900 border-slate-800 text-slate-500 opacity-50';
                  }
                }
                return (
                  <button
                    key={port}
                    disabled={laserRevealed}
                    onClick={() => handleSelectLaserPort(port)}
                    className={`py-4 rounded-xl border-2 font-mono font-black text-xl transition-all ${cls}`}
                  >
                    Cổng {port}
                  </button>
                );
              })}
            </div>

            {laserRevealed && (
              <div className="bg-slate-950 border border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                <div
                  className={`font-black text-lg ${
                    selectedPort === laserLevel.exitLabel ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {selectedPort === laserLevel.exitLabel
                    ? `✔ Chính xác! Tia laser thoát ra tại cổng ${laserLevel.exitLabel}.`
                    : `✖ Sai rồi! Đường tia xanh lá dẫn tới cổng ${laserLevel.exitLabel}.`}
                </div>
                <button
                  onClick={handleNextRound}
                  className="px-8 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl font-bold text-white"
                >
                  {roundIdx + 1 < settings.rounds ? 'Màn Kế Tiếp →' : 'Xem Kết Quả'}
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
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-500 to-emerald-500" />
            <div className="text-7xl mb-4">
              {score === settings.rounds ? '🏆' : score >= settings.rounds * 0.6 ? '🎯' : '🚀'}
            </div>
            <h2 className="text-4xl font-black text-white mb-2">HOÀN THÀNH MÔ PHỎNG</h2>
            <p className="text-slate-400 mb-8">
              Số màn chinh phục thành công:{' '}
              <strong className="text-teal-400 font-mono text-2xl">
                {score}/{settings.rounds}
              </strong>
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
                className="flex-1 py-4 bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl font-bold text-white"
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
