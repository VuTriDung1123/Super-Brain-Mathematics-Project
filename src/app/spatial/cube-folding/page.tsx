'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type Difficulty = 'easy' | 'medium' | 'hard';
type Vec3 = [number, number, number];

interface GameSettings {
  difficulty: Difficulty;
  rounds: number;
  timeLimitPerQuestion: number; // 0 = unlimited
}

interface FaceSymbol {
  id: number;
  color: string;
  accent: string;
  pattern: 'arrow' | 'diagonal' | 'corner-dot' | 'half' | 'l-shape' | 'diamond';
  directional: boolean;
}

interface NetCell {
  r: number;
  c: number;
  symbolIdx: number;
  baseRotation: number; // 0, 90, 180, 270 clockwise in 2D net
}

interface FaceOrientation {
  n: Vec3;
  u: Vec3; // points right on the 2D net cell
  v: Vec3; // points up on the 2D net cell
}

interface VisibleFaceSpec {
  symbolIdx: number;
  rotDeg: number; // clockwise rotation in canonical face space
}

interface CubeProjection {
  front: VisibleFaceSpec;
  right: VisibleFaceSpec;
  top: VisibleFaceSpec;
}

interface FoldedCubeFace3D {
  symbolIdx: number;
  baseRotation: number;
  orient: FaceOrientation;
}

interface Question {
  net: NetCell[];
  foldedFaces: FoldedCubeFace3D[];
  options: CubeProjection[];
  correctIndex: number;
  explanation: string;
}

// All 11 mathematically valid hexomino nets of a cube
const CUBE_NETS: [number, number][][] = [
  // 1-4-1 family (6 nets)
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 3]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 1], [1, 0], [1, 1], [1, 2], [1, 3], [2, 2]],
  // 2-3-1 family (3 nets)
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3], [2, 3]],
  // 2-2-2 stairs
  [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [2, 3]],
  // 3-3 offset
  [[0, 0], [0, 1], [0, 2], [1, 2], [1, 3], [1, 4]],
];

const SYMBOLS: FaceSymbol[] = [
  { id: 0, color: '#ef4444', accent: '#fef2f2', pattern: 'arrow', directional: true },
  { id: 1, color: '#3b82f6', accent: '#eff6ff', pattern: 'corner-dot', directional: true },
  { id: 2, color: '#10b981', accent: '#ecfdf5', pattern: 'half', directional: true },
  { id: 3, color: '#f59e0b', accent: '#fffbeb', pattern: 'l-shape', directional: true },
  { id: 4, color: '#a855f7', accent: '#faf5ff', pattern: 'diagonal', directional: true },
  { id: 5, color: '#06b6d4', accent: '#ecfeff', pattern: 'diamond', directional: false },
];

const neg = (a: Vec3): Vec3 => [-a[0], -a[1], -a[2]];
const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

// Generate all 24 proper 3D rotations of a cube (orthogonal matrices with det = +1)
const ALL_24_ROTATIONS: [Vec3, Vec3, Vec3][] = (() => {
  const axes: Vec3[] = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  const rots: [Vec3, Vec3, Vec3][] = [];
  for (const x of axes) {
    for (const y of axes) {
      if (dot(x, y) !== 0) continue;
      const z = cross(x, y);
      rots.push([x, y, z]);
    }
  }
  return rots;
})();

const applyRot = (rot: [Vec3, Vec3, Vec3], v: Vec3): Vec3 => [
  rot[0][0] * v[0] + rot[1][0] * v[1] + rot[2][0] * v[2],
  rot[0][1] * v[0] + rot[1][1] * v[1] + rot[2][1] * v[2],
  rot[0][2] * v[0] + rot[1][2] * v[1] + rot[2][2] * v[2],
];

/**
 * Exact 3D folding of any valid 6-cell hexomino net.
 * Each neighbor folds 90° inward (away from viewer along -n).
 */
function foldNetTo3D(net: NetCell[]): FoldedCubeFace3D[] {
  const visited = new Set<number>([0]);
  const orientations: FaceOrientation[] = new Array(net.length);
  orientations[0] = {
    n: [0, 0, 1],
    u: [1, 0, 0],
    v: [0, 1, 0],
  };

  const queue: number[] = [0];
  while (queue.length > 0) {
    const idx = queue.shift()!;
    const curr = net[idx];
    const { n, u, v } = orientations[idx];

    for (let j = 0; j < net.length; j++) {
      if (visited.has(j)) continue;
      const dr = net[j].r - curr.r;
      const dc = net[j].c - curr.c;
      if (Math.abs(dr) + Math.abs(dc) !== 1) continue;

      let nextOrient: FaceOrientation;
      if (dc === 1) {
        // Right
        nextOrient = { n: u, u: neg(n), v };
      } else if (dc === -1) {
        // Left
        nextOrient = { n: neg(u), u: n, v };
      } else if (dr === -1) {
        // Up (+v)
        nextOrient = { n: v, u, v: neg(n) };
      } else {
        // Down (-v)
        nextOrient = { n: neg(v), u, v: n };
      }

      orientations[j] = nextOrient;
      visited.add(j);
      queue.push(j);
    }
  }

  return net.map((cell, i) => ({
    symbolIdx: cell.symbolIdx,
    baseRotation: cell.baseRotation,
    orient: orientations[i],
  }));
}

/**
 * Computes clockwise rotation (0, 90, 180, 270) of a face's local (u, v)
 * relative to the canonical (targetU, targetV) basis of a cube face.
 */
function computeClockwiseRotDeg(u: Vec3, targetU: Vec3, targetV: Vec3): number {
  const du = dot(u, targetU);
  const dv = dot(u, targetV);
  // If u aligns with targetU -> 0°
  // If u aligns with -targetV -> 90° CW
  // If u aligns with -targetU -> 180°
  // If u aligns with +targetV -> 270° CW
  if (du === 1) return 0;
  if (dv === -1) return 90;
  if (du === -1) return 180;
  return 270;
}

function projectFoldedCube(
  faces: FoldedCubeFace3D[],
  rot: [Vec3, Vec3, Vec3]
): CubeProjection {
  const transformed = faces.map((f) => ({
    ...f,
    n: applyRot(rot, f.orient.n),
    u: applyRot(rot, f.orient.u),
    v: applyRot(rot, f.orient.v),
  }));

  const findFace = (targetN: Vec3, targetU: Vec3, targetV: Vec3): VisibleFaceSpec => {
    const face = transformed.find((f) => dot(f.n, targetN) === 1)!;
    const geomRot = computeClockwiseRotDeg(face.u, targetU, targetV);
    return {
      symbolIdx: face.symbolIdx,
      rotDeg: (geomRot + face.baseRotation) % 360,
    };
  };

  return {
    front: findFace([0, 0, 1], [1, 0, 0], [0, 1, 0]),
    right: findFace([1, 0, 0], [0, 0, -1], [0, 1, 0]),
    top: findFace([0, 1, 0], [1, 0, 0], [0, 0, -1]),
  };
}

function projectionKey(p: CubeProjection, ignoreRot: boolean): string {
  const fmt = (f: VisibleFaceSpec) => {
    const sym = SYMBOLS[f.symbolIdx];
    const r = ignoreRot || !sym.directional ? 0 : f.rotDeg % 360;
    return `${f.symbolIdx}:${r}`;
  };
  return `${fmt(p.front)}|${fmt(p.right)}|${fmt(p.top)}`;
}

function generateQuestion(difficulty: Difficulty): Question {
  const netPool =
    difficulty === 'easy'
      ? CUBE_NETS.slice(0, 5)
      : difficulty === 'medium'
        ? CUBE_NETS.slice(0, 9)
        : CUBE_NETS;

  const template = netPool[Math.floor(Math.random() * netPool.length)];
  const symbolOrder = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);

  const net: NetCell[] = template.map(([r, c], idx) => ({
    r,
    c,
    symbolIdx: symbolOrder[idx],
    baseRotation:
      difficulty === 'easy' ? 0 : [0, 90, 180, 270][Math.floor(Math.random() * 4)],
  }));

  const foldedFaces = foldNetTo3D(net);
  const allValidProjections = ALL_24_ROTATIONS.map((rot) => projectFoldedCube(foldedFaces, rot));
  const ignoreRot = difficulty === 'easy';
  const validKeys = new Set(allValidProjections.map((p) => projectionKey(p, ignoreRot)));

  const correctProj =
    allValidProjections[Math.floor(Math.random() * allValidProjections.length)];

  // Find opposite pairs on the folded cube for smart distractors
  const oppositeMap = new Map<number, number>();
  for (const f1 of foldedFaces) {
    for (const f2 of foldedFaces) {
      if (dot(f1.orient.n, f2.orient.n) === -1) {
        oppositeMap.set(f1.symbolIdx, f2.symbolIdx);
      }
    }
  }

  const distractors: CubeProjection[] = [];
  const usedKeys = new Set<string>([projectionKey(correctProj, ignoreRot)]);

  const tryAdd = (cand: CubeProjection) => {
    const key = projectionKey(cand, ignoreRot);
    if (!validKeys.has(key) && !usedKeys.has(key)) {
      usedKeys.add(key);
      distractors.push(cand);
    }
  };

  // Distractor 1: Mirror swap Front <-> Right (chirality violation)
  tryAdd({
    front: correctProj.right,
    right: correctProj.front,
    top: correctProj.top,
  });

  // Distractor 2: Place opposite face adjacent to Front
  const oppOfFront = oppositeMap.get(correctProj.front.symbolIdx)!;
  tryAdd({
    front: correctProj.front,
    right: { symbolIdx: oppOfFront, rotDeg: correctProj.right.rotDeg },
    top: correctProj.top,
  });

  // Distractor 3: Rotate one directional symbol by 90° or 180° (for medium/hard)
  if (!ignoreRot) {
    tryAdd({
      front: {
        symbolIdx: correctProj.front.symbolIdx,
        rotDeg: (correctProj.front.rotDeg + 90) % 360,
      },
      right: correctProj.right,
      top: correctProj.top,
    });
    tryAdd({
      front: correctProj.front,
      right: correctProj.right,
      top: {
        symbolIdx: correctProj.top.symbolIdx,
        rotDeg: (correctProj.top.rotDeg + 180) % 360,
      },
    });
  }

  // Fallback random invalid combinations until 3 distractors
  let safety = 0;
  while (distractors.length < 3 && safety < 200) {
    safety++;
    const shuffled = [0, 1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    const rDeg = () => [0, 90, 180, 270][Math.floor(Math.random() * 4)];
    tryAdd({
      front: { symbolIdx: shuffled[0], rotDeg: rDeg() },
      right: { symbolIdx: shuffled[1], rotDeg: rDeg() },
      top: { symbolIdx: shuffled[2], rotDeg: rDeg() },
    });
  }

  const options = [correctProj, ...distractors.slice(0, 3)];
  const indexed = options.map((opt, idx) => ({ opt, isCorrect: idx === 0 }));
  indexed.sort(() => Math.random() - 0.5);

  const correctIndex = indexed.findIndex((item) => item.isCorrect);
  const explanation = `Khối đúng giữ nguyên thứ tự kề nhau theo chiều kim đồng hồ của 3 mặt thấy được và đúng góc xoay của từng họa tiết khi gấp vào trong.`;

  return {
    net,
    foldedFaces,
    options: indexed.map((item) => item.opt),
    correctIndex,
    explanation,
  };
}

/** SVG Face graphic drawn inside 0..100 x 0..100 coordinate space */
function FaceGraphicSVG({
  symbolIdx,
  rotDeg,
}: {
  symbolIdx: number;
  rotDeg: number;
}) {
  const sym = SYMBOLS[symbolIdx];
  return (
    <g transform={`rotate(${rotDeg} 50 50)`}>
      <rect x="0" y="0" width="100" height="100" fill={sym.color} />
      {sym.pattern === 'arrow' && (
        <path
          d="M50 16 L80 50 L62 50 L62 84 L38 84 L38 50 L20 50 Z"
          fill={sym.accent}
        />
      )}
      {sym.pattern === 'corner-dot' && (
        <>
          <circle cx="28" cy="28" r="14" fill={sym.accent} />
          <rect x="54" y="54" width="26" height="26" rx="4" fill={sym.accent} opacity="0.55" />
        </>
      )}
      {sym.pattern === 'half' && (
        <>
          <rect x="0" y="0" width="100" height="50" fill={sym.accent} opacity="0.85" />
          <circle cx="50" cy="75" r="10" fill={sym.accent} />
        </>
      )}
      {sym.pattern === 'l-shape' && (
        <path d="M22 18 H44 V60 H80 V82 H22 Z" fill={sym.accent} />
      )}
      {sym.pattern === 'diagonal' && (
        <>
          <polygon points="0,0 100,0 0,100" fill={sym.accent} opacity="0.8" />
          <circle cx="72" cy="72" r="11" fill={sym.accent} />
        </>
      )}
      {sym.pattern === 'diamond' && (
        <polygon points="50,15 85,50 50,85 15,50" fill={sym.accent} />
      )}
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="97"
        fill="none"
        stroke="rgba(15,23,42,0.75)"
        strokeWidth="3"
      />
    </g>
  );
}

/**
 * Renders an exact isometric 3D cube in SVG by affine-transforming each 100x100 face
 * onto the Top, Front-Left (Front), and Front-Right (Right) parallelograms.
 */
function IsometricCubeSVG({ projection }: { projection: CubeProjection }) {
  // Cube center at (100, 100), edge length s = 66
  // Isometric basis vectors:
  // Top face:    origin (100, 26), u -> (57, 33), v_down -> (-57, 33)
  // Wait: let's match standard front-left = Front, front-right = Right, top = Top!
  // Vertices:
  // Center = (100, 100)
  // Top-Back = (100, 28)
  // Top-Left = (38, 64)
  // Top-Right = (162, 64)
  // Bottom-Center = (100, 172)
  // Bottom-Left = (38, 136)
  // Bottom-Right = (162, 136)
  //
  // In SVG 100x100 face: (0,0) = top-left, (100,0) = top-right, (0,100) = bottom-left:
  // Top face:   (0,0)->Top-Back(100,28)? Wait:
  // Canonical Top basis: u = +X (goes from Top-Left to Center? No: Front is facing viewer-left (+Z), Right is facing viewer-right (+X)!)
  // Let's check right-handed axes in isometric projection:
  // +Z (Front normal) points down-left:  (-cos30, +sin30)
  // +X (Right normal) points down-right: (+cos30, +sin30)
  // +Y (Top normal)   points straight up: (0, -1)
  // Check: X × Y = Z! Wait: (+X down-right) × (+Y up) = pointing out of screen/down-left (+Z) — YES!
  // Let's compute corners of cube [-1,1]^3 with scale r = 36:
  // Screen(x, y, z) = (100 + 31.18*(x - z), 100 + 18*(x + z) - 36*y)
  // Wait: let's check corners!
  // (+1,+1,+1) center-front-top vertex: (100, 100 + 36 - 36) = (100, 100) !
  // (-1,+1,+1) left-top-front:  (100 - 62.35, 100 + 0 - 36) = (37.65, 64)
  // (+1,+1,-1) right-top-back:  (100 + 62.35, 100 + 0 - 36) = (162.35, 64)
  // (-1,+1,-1) back-top:        (100, 100 - 36 - 36) = (100, 28)
  // (-1,-1,+1) left-bot-front:  (37.65, 136)
  // (+1,-1,+1) center-bot:      (100, 172)
  // (+1,-1,-1) right-bot-back:  (162.35, 136)
  //
  // Now check affine matrix(a, b, c, d, e, f) mapping (0,0)->P00, (100,0)->P10, (0,100)->P01:
  // a = (P10.x - P00.x)/100, b = (P10.y - P00.y)/100
  // c = (P01.x - P00.x)/100, d = (P01.y - P00.y)/100
  // e = P00.x, f = P00.y
  //
  // 1) FRONT face (z = +1, u = +X, v = +Y, so SVG down = -Y):
  //    P00 (x=-1, y=+1, z=+1) = (37.65, 64)
  //    P10 (x=+1, y=+1, z=+1) = (100, 100)
  //    P01 (x=-1, y=-1, z=+1) = (37.65, 136)
  //    -> matrix(0.6235, 0.36, 0, 0.72, 37.65, 64)
  //
  // 2) RIGHT face (x = +1, u = -Z, v = +Y, so SVG down = -Y):
  //    P00 (x=+1, y=+1, z=+1) = (100, 100)
  //    P10 (x=+1, y=+1, z=-1) = (162.35, 64)
  //    P01 (x=+1, y=-1, z=+1) = (100, 172)
  //    -> matrix(0.6235, -0.36, 0, 0.72, 100, 100)
  //
  // 3) TOP face (y = +1, u = +X, v = -Z, so SVG down = +Z):
  //    P00 (x=-1, y=+1, z=-1) = (100, 28)
  //    P10 (x=+1, y=+1, z=-1) = (162.35, 64)
  //    P01 (x=-1, y=+1, z=+1) = (37.65, 64)
  //    -> matrix(0.6235, 0.36, -0.6235, 0.36, 100, 28)

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full max-w-[190px] max-h-[190px] drop-shadow-xl">
      {/* TOP FACE */}
      <g transform="matrix(0.6235 0.36 -0.6235 0.36 100 28)">
        <FaceGraphicSVG symbolIdx={projection.top.symbolIdx} rotDeg={projection.top.rotDeg} />
      </g>
      {/* FRONT FACE */}
      <g transform="matrix(0.6235 0.36 0 0.72 37.65 64)">
        <FaceGraphicSVG symbolIdx={projection.front.symbolIdx} rotDeg={projection.front.rotDeg} />
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.08)" />
      </g>
      {/* RIGHT FACE */}
      <g transform="matrix(0.6235 -0.36 0 0.72 100 100)">
        <FaceGraphicSVG symbolIdx={projection.right.symbolIdx} rotDeg={projection.right.rotDeg} />
        <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.22)" />
      </g>
    </svg>
  );
}

/** Creates an offscreen canvas texture matching FaceGraphicSVG for interactive 3D verification */
function createFaceCanvasTexture(symbolIdx: number, rotDeg: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const sym = SYMBOLS[symbolIdx];
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate((rotDeg * Math.PI) / 180);
    ctx.scale(2.56, 2.56);
    ctx.translate(-50, -50);

    ctx.fillStyle = sym.color;
    ctx.fillRect(0, 0, 100, 100);

    ctx.fillStyle = sym.accent;
    if (sym.pattern === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(50, 16);
      ctx.lineTo(80, 50);
      ctx.lineTo(62, 50);
      ctx.lineTo(62, 84);
      ctx.lineTo(38, 84);
      ctx.lineTo(38, 50);
      ctx.lineTo(20, 50);
      ctx.closePath();
      ctx.fill();
    } else if (sym.pattern === 'corner-dot') {
      ctx.beginPath();
      ctx.arc(28, 28, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.fillRect(54, 54, 26, 26);
      ctx.globalAlpha = 1;
    } else if (sym.pattern === 'half') {
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, 100, 50);
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(50, 75, 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (sym.pattern === 'l-shape') {
      ctx.beginPath();
      ctx.moveTo(22, 18);
      ctx.lineTo(44, 18);
      ctx.lineTo(44, 60);
      ctx.lineTo(80, 60);
      ctx.lineTo(80, 82);
      ctx.lineTo(22, 82);
      ctx.closePath();
      ctx.fill();
    } else if (sym.pattern === 'diagonal') {
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(100, 0);
      ctx.lineTo(0, 100);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(72, 72, 11, 0, Math.PI * 2);
      ctx.fill();
    } else if (sym.pattern === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(50, 15);
      ctx.lineTo(85, 50);
      ctx.lineTo(50, 85);
      ctx.lineTo(15, 50);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(15,23,42,0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 96, 96);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function InteractiveFoldedCube3D({ faces }: { faces: FoldedCubeFace3D[] }) {
  const textures = useMemo(
    () => faces.map((f) => createFaceCanvasTexture(f.symbolIdx, f.baseRotation)),
    [faces]
  );

  useEffect(() => {
    return () => {
      textures.forEach((t) => t.dispose());
    };
  }, [textures]);

  if (textures.length !== 6) return null;

  return (
    <Canvas camera={{ position: [2.8, 2.3, 2.8], fov: 45 }}>
      <ambientLight intensity={0.95} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} />
      <group>
        {faces.map((f, idx) => {
          const m = new THREE.Matrix4().makeBasis(
            new THREE.Vector3(...f.orient.u),
            new THREE.Vector3(...f.orient.v),
            new THREE.Vector3(...f.orient.n)
          );
          const euler = new THREE.Euler().setFromRotationMatrix(m);
          const pos: [number, number, number] = [
            f.orient.n[0] * 1.0,
            f.orient.n[1] * 1.0,
            f.orient.n[2] * 1.0,
          ];
          return (
            <mesh key={idx} position={pos} rotation={euler}>
              <planeGeometry args={[2, 2]} />
              <meshStandardMaterial map={textures[idx]} />
            </mesh>
          );
        })}
      </group>
      <OrbitControls enablePan={false} enableZoom={false} rotateSpeed={0.8} />
    </Canvas>
  );
}

export default function CubeFoldingGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [settings, setSettings] = useState<GameSettings>({
    difficulty: 'medium',
    rounds: 5,
    timeLimitPerQuestion: 0,
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeLeftRef = useRef(0);

  const startGame = () => {
    const generated = Array.from({ length: settings.rounds }, () =>
      generateQuestion(settings.difficulty)
    );
    setQuestions(generated);
    setCurrentIdx(0);
    setSelectedOption(null);
    setScore(0);
    timeLeftRef.current = settings.timeLimitPerQuestion;
    setTimeLeft(settings.timeLimitPerQuestion);
    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING' || settings.timeLimitPerQuestion === 0 || selectedOption !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      timeLeftRef.current -= 1;
      if (timeLeftRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(0);
        setSelectedOption(-1);
        return;
      }
      setTimeLeft(timeLeftRef.current);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, currentIdx, selectedOption, settings.timeLimitPerQuestion]);

  const handleSelectOption = (idx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(idx);
    if (idx === questions[currentIdx].correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedOption(null);
      timeLeftRef.current = settings.timeLimitPerQuestion;
      setTimeLeft(settings.timeLimitPerQuestion);
    } else {
      setPhase('RESULT');
    }
  };

  const currentQuestion = questions[currentIdx];

  const renderNetSVG = (net: NetCell[]) => {
    const maxR = Math.max(...net.map((c) => c.r));
    const maxC = Math.max(...net.map((c) => c.c));
    const cellPx = 88;
    const pad = 16;
    const w = (maxC + 1) * cellPx + pad * 2;
    const h = (maxR + 1) * cellPx + pad * 2;

    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-md h-auto mx-auto">
        {net.map((cell, i) => (
          <g
            key={i}
            transform={`translate(${pad + cell.c * cellPx}, ${pad + cell.r * cellPx}) scale(${
              cellPx / 100
            })`}
          >
            <FaceGraphicSVG symbolIdx={cell.symbolIdx} rotDeg={cell.baseRotation} />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-orange-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/spatial"
          className="inline-flex items-center text-slate-500 hover:text-orange-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Hình Học &amp; Không Gian
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono bg-slate-900 border border-slate-700 px-4 py-1.5 rounded-full text-orange-400 font-bold">
              Câu {currentIdx + 1}/{questions.length} • Điểm: {score}
            </span>
            {settings.timeLimitPerQuestion > 0 && (
              <span
                className={`text-sm font-mono px-4 py-1.5 rounded-full border font-bold ${
                  timeLeft <= 5
                    ? 'border-red-500 text-red-400 bg-red-950/40 animate-pulse'
                    : 'border-amber-500/40 text-amber-400 bg-slate-900'
                }`}
              >
                ⏱ {timeLeft}s
              </span>
            )}
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500 mb-2">
              TRIỂN KHAI HÌNH KHỐI
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Cube Net Folding • Tư duy không gian 3D
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  <span className="w-8 h-8 rounded bg-orange-900/50 text-orange-400 flex items-center justify-center mr-3 text-sm">
                    01
                  </span>
                  Bản chất thử thách
                </h2>
                <p className="text-lg text-slate-300 leading-relaxed">
                  Một khối lập phương có đúng <strong className="text-white">11 cách trải phẳng</strong> khác nhau. Khi gấp các mặt vào trong tạo thành khối 3D hoàn chỉnh, không chỉ quan hệ kề/đối giữa các mặt mà cả{' '}
                  <strong className="text-orange-400">hướng xoay của họa tiết</strong> trên mỗi mặt cũng biến đổi theo ma trận xoay 3 chiều.
                </p>
              </section>

              <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-orange-400 font-bold uppercase text-sm tracking-wider">
                  Luật chơi &amp; Mẹo suy luận
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-300 text-sm">
                  <li>Quan sát bản trải phẳng 2D (mặt có họa tiết nằm hướng ra ngoài sau khi gấp).</li>
                  <li>Loại ngay đáp án đặt hai mặt đối diện nằm kề nhau.</li>
                  <li>
                    Kiểm tra chiều quay (thuận/ngược chiều kim đồng hồ) của 3 mặt gặp nhau tại một đỉnh và góc xoay mũi tên/họa tiết ở mức Vừa &amp; Khó.
                  </li>
                  <li>
                    Sau khi chọn đáp án, bạn có thể <strong className="text-white">xoay trực tiếp khối lập phương 3D thật</strong> để kiểm chứng!
                  </li>
                </ul>
              </section>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Cấu Hình Thử Thách
                </h3>

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
                        className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                          settings.difficulty === key
                            ? 'bg-orange-600 border-orange-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {settings.difficulty === 'easy'
                      ? '5 mẫu lưới chuẩn, tập trung vào quan hệ kề/đối giữa các mặt.'
                      : settings.difficulty === 'medium'
                        ? '9 mẫu lưới, bắt đầu xét hướng xoay họa tiết.'
                        : 'Đủ 11 mẫu triển khai + bẫy xoay góc 90°/180° tinh vi.'}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Số câu hỏi</label>
                    <span className="text-orange-400 text-sm font-bold">{settings.rounds} câu</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={settings.rounds}
                    onChange={(e) =>
                      setSettings({ ...settings, rounds: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">
                      Giới hạn mỗi câu
                    </label>
                    <span className="text-orange-400 text-sm font-bold">
                      {settings.timeLimitPerQuestion === 0
                        ? 'Không giới hạn'
                        : `${settings.timeLimitPerQuestion}s`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={settings.timeLimitPerQuestion}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        timeLimitPerQuestion: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  />
                </div>

                <button
                  onClick={startGame}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
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
        <div className="max-w-6xl mx-auto px-6 pb-16 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: 2D NET + 3D VERIFIER */}
            <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-4 text-center">
                Bản Triển Khai 2D (Gấp vào trong)
              </div>
              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 flex items-center justify-center min-h-[260px]">
                {renderNetSVG(currentQuestion.net)}
              </div>

              {selectedOption !== null && (
                <div className="mt-6 animate-fade-in">
                  <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2 text-center">
                    Khối 3D Thực Tế (Kéo chuột để xoay kiểm chứng)
                  </div>
                  <div className="h-56 w-full bg-slate-950 rounded-2xl border border-emerald-500/30 overflow-hidden">
                    <InteractiveFoldedCube3D faces={currentQuestion.foldedFaces} />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: 4 ISOMETRIC OPTIONS */}
            <div className="lg:col-span-7">
              <h2 className="text-lg font-bold text-slate-300 mb-4">
                Khối lập phương nào dưới đây được gấp đúng từ bản trải bên trái?
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {currentQuestion.options.map((opt, idx) => {
                  const labels = ['A', 'B', 'C', 'D'];
                  const isChosen = selectedOption === idx;
                  const isCorrect = idx === currentQuestion.correctIndex;
                  let borderClass =
                    'border-slate-800 hover:border-orange-500/70 bg-slate-900/90';

                  if (selectedOption !== null) {
                    if (isCorrect) {
                      borderClass = 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/50';
                    } else if (isChosen && !isCorrect) {
                      borderClass = 'border-red-500 bg-red-950/30 ring-2 ring-red-500/50';
                    } else {
                      borderClass = 'border-slate-800 bg-slate-900/40 opacity-50';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={selectedOption !== null}
                      onClick={() => handleSelectOption(idx)}
                      className={`relative rounded-2xl border-2 p-4 flex flex-col items-center justify-center transition-all duration-200 ${borderClass}`}
                    >
                      <span className="absolute top-3 left-3 w-8 h-8 rounded-lg bg-slate-800 text-slate-200 font-black flex items-center justify-center text-sm border border-slate-700">
                        {labels[idx]}
                      </span>
                      <div className="w-44 h-44 flex items-center justify-center">
                        <IsometricCubeSVG projection={opt} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedOption !== null && (
                <div className="mt-6 bg-slate-900 border border-slate-700 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                  <div>
                    <div
                      className={`font-black text-lg ${
                        selectedOption === currentQuestion.correctIndex
                          ? 'text-emerald-400'
                          : 'text-red-400'
                      }`}
                    >
                      {selectedOption === currentQuestion.correctIndex
                        ? '✔ Chính xác tuyệt đối!'
                        : selectedOption === -1
                          ? `⏱ Hết giờ! Đáp án đúng là ${['A', 'B', 'C', 'D'][currentQuestion.correctIndex]}.`
                          : `✖ Chưa chính xác! Đáp án đúng là ${['A', 'B', 'C', 'D'][currentQuestion.correctIndex]}.`}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{currentQuestion.explanation}</p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="shrink-0 px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-bold text-white shadow-lg hover:scale-105 transition-transform"
                  >
                    {currentIdx + 1 < questions.length ? 'Câu Tiếp Theo →' : 'Xem Tổng Kết'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in-up">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-amber-400" />
            <div className="text-7xl mb-4">
              {score === questions.length ? '🏆' : score >= questions.length * 0.6 ? '🎯' : '🧩'}
            </div>
            <h2 className="text-4xl font-black text-white mb-2">HOÀN THÀNH THỬ THÁCH</h2>
            <p className="text-slate-400 mb-8">Độ chính xác tư duy không gian 3D của bạn:</p>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <span className="text-xs uppercase text-slate-500 font-bold block mb-1">
                  Số câu đúng
                </span>
                <span className="text-4xl font-mono font-black text-orange-400">
                  {score}/{questions.length}
                </span>
              </div>
              <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700">
                <span className="text-xs uppercase text-slate-500 font-bold block mb-1">
                  Tỉ lệ chính xác
                </span>
                <span className="text-4xl font-mono font-black text-emerald-400">
                  {Math.round((score / Math.max(1, questions.length)) * 100)}%
                </span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-colors"
              >
                Cấu Hình Lại
              </button>
              <button
                onClick={startGame}
                className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl font-bold text-white shadow-lg transition-all"
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
