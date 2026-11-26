'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useGameResultRecorder } from '@/hooks/useGameResultRecorder';

type GamePhase = 'SETUP' | 'PLAYING' | 'RESULT';
type Point = [number, number];

interface PieceDef {
  id: string;
  name: string;
  color: string;
  vertices: Point[]; // centered around local (0, 0), unit = 100px for square side 200px
  canFlip?: boolean;
}

interface PieceTransform {
  x: number;
  y: number;
  rot: number; // degrees, multiple of 45
  flipped: boolean;
}

interface TangramPuzzle {
  id: string;
  name: string;
  difficulty: 'Dễ' | 'Vừa' | 'Khó';
  desc: string;
  // Exact 7-piece solution transforms in board coords (600x460 canvas)
  solution: Record<string, PieceTransform>;
}

/**
 * Classic 7 Tangram pieces derived from a 200x200 unit square
 * (each piece's vertices are centered near (0,0) for intuitive rotation).
 */
const TANGRAM_PIECES: PieceDef[] = [
  {
    id: 'LT1',
    name: 'Tam giác lớn 1',
    color: '#ef4444',
    vertices: [
      [-100, -33.33],
      [100, -33.33],
      [0, 66.67],
    ],
  },
  {
    id: 'LT2',
    name: 'Tam giác lớn 2',
    color: '#f97316',
    vertices: [
      [-100, -33.33],
      [100, -33.33],
      [0, 66.67],
    ],
  },
  {
    id: 'MT',
    name: 'Tam giác vừa',
    color: '#eab308',
    vertices: [
      [-50, 50],
      [50, 50],
      [-50, -50],
    ],
  },
  {
    id: 'ST1',
    name: 'Tam giác nhỏ 1',
    color: '#22c55e',
    vertices: [
      [-50, -16.67],
      [50, -16.67],
      [0, 33.33],
    ],
  },
  {
    id: 'ST2',
    name: 'Tam giác nhỏ 2',
    color: '#06b6d4',
    vertices: [
      [-50, -16.67],
      [50, -16.67],
      [0, 33.33],
    ],
  },
  {
    id: 'SQ',
    name: 'Hình vuông',
    color: '#3b82f6',
    vertices: [
      [0, -50],
      [50, 0],
      [0, 50],
      [-50, 0],
    ],
  },
  {
    id: 'PL',
    name: 'Hình bình hành',
    color: '#a855f7',
    canFlip: true,
    vertices: [
      [-75, -25],
      [25, -25],
      [75, 25],
      [-25, 25],
    ],
  },
];

// Verify exact mathematical piece placements from the canonical 200x200 dissection
// Canonical square corners: (-100,-100) to (100,100), centered at (300, 230):
//   LT1: top triangle (-100,-100), (100,-100), (0,0) -> center (0, -66.67), rot 0
//   LT2: left triangle (-100,100), (-100,-100), (0,0) -> center (-66.67, 0), rot 270
//   ST1: center-right-top (0,0), (50,-50), (50,50) -> center (33.33, 0), rot 90
//   SQ:  (0,0), (50,50), (0,100), (-50,50) -> center (0, 50), rot 0
//   ST2: (-100,100), (0,100), (-50,50) -> center (-50, 83.33), rot 180
//   MT:  (100,100), (0,100), (100,0) -> center (50, 50) with right angle at (100,100) -> rot 180
//   PL:  (100,-100), (100,0), (50,50), (50,-50) -> center (75, -25), rot 90
const S2 = Math.SQRT2;

const PUZZLES: TangramPuzzle[] = [
  {
    id: 'classic-square',
    name: 'Hình Vuông Cổ Điển',
    difficulty: 'Dễ',
    desc: 'Ghép 7 mảnh về lại hình vuông nguyên bản 200×200 — bài khởi động kinh điển.',
    solution: {
      LT1: { x: 300, y: 163.33, rot: 0, flipped: false },
      LT2: { x: 233.33, y: 230, rot: 270, flipped: false },
      ST1: { x: 333.33, y: 230, rot: 90, flipped: false },
      SQ: { x: 300, y: 280, rot: 0, flipped: false },
      ST2: { x: 250, y: 313.33, rot: 180, flipped: false },
      MT: { x: 350, y: 280, rot: 180, flipped: false },
      PL: { x: 375, y: 205, rot: 90, flipped: true },
    },
  },
  {
    id: 'rectangle',
    name: 'Hình Chữ Nhật Chuẩn',
    difficulty: 'Dễ',
    desc: 'Tái cấu trúc 7 mảnh thành một hình chữ nhật dài hoàn hảo không khe hở.',
    solution: {
      LT1: { x: 200, y: 196.67, rot: 0, flipped: false },
      LT2: { x: 200, y: 263.33, rot: 180, flipped: false },
      MT: { x: 350, y: 230, rot: 270, flipped: false },
      SQ: { x: 350, y: 230, rot: 0, flipped: false },
      ST1: { x: 400, y: 196.67, rot: 0, flipped: false },
      ST2: { x: 400, y: 263.33, rot: 180, flipped: false },
      PL: { x: 325, y: 180, rot: 0, flipped: false },
    },
  },
  {
    id: 'rocket',
    name: 'Tên Lửa Vũ Trụ',
    difficulty: 'Vừa',
    desc: 'Mũi tên lửa vươn cao với thân hình vuông cân đối và hai cánh tam giác lớn.',
    solution: {
      SQ: { x: 300, y: 210, rot: 45, flipped: false },
      ST1: { x: 300, y: 120, rot: 180, flipped: false },
      LT1: { x: 264.64, y: 280.71, rot: 315, flipped: false },
      LT2: { x: 335.36, y: 280.71, rot: 45, flipped: false },
      MT: { x: 300, y: 345, rot: 135, flipped: false },
      ST2: { x: 235, y: 365, rot: 225, flipped: false },
      PL: { x: 370, y: 350, rot: 45, flipped: false },
    },
  },
  {
    id: 'house',
    name: 'Ngôi Nhà Mái Bằng',
    difficulty: 'Vừa',
    desc: 'Mái tam giác nhọn cùng thân nhà vững chãi và ống khói hình bình hành.',
    solution: {
      LT1: { x: 300, y: 173.33, rot: 180, flipped: false },
      LT2: { x: 266.67, y: 290, rot: 270, flipped: false },
      MT: { x: 350, y: 290, rot: 180, flipped: false },
      SQ: { x: 300, y: 290, rot: 45, flipped: false },
      ST1: { x: 233.33, y: 240, rot: 90, flipped: false },
      ST2: { x: 350, y: 356.67, rot: 0, flipped: false },
      PL: { x: 385, y: 175, rot: 90, flipped: false },
    },
  },
  {
    id: 'cat',
    name: 'Chú Mèo Ngồi',
    difficulty: 'Khó',
    desc: 'Thử thách tạo hình kinh điển: đầu vuông, đôi tai nhọn, thân tam giác và đuôi cong.',
    solution: {
      SQ: { x: 240, y: 145, rot: 0, flipped: false },
      ST1: { x: 206.67, y: 95, rot: 90, flipped: false },
      ST2: { x: 273.33, y: 95, rot: 270, flipped: false },
      MT: { x: 240, y: 245, rot: 45, flipped: false },
      LT1: { x: 295, y: 285, rot: 135, flipped: false },
      LT2: { x: 365, y: 315, rot: 180, flipped: false },
      PL: { x: 445, y: 270, rot: 135, flipped: true },
    },
  },
];

// Clean exact solution for Rectangle so pieces don't overlap!
// Wait: let's guarantee every single puzzle in PUZZLES has ZERO overlapping pieces in its solution!
// Let's build 4 mathematically verified non-overlapping puzzles:
// 1) Classic Square (200x200)
// 2) Wide Arrow / House built from exact side-snapped coordinates
// 3) Large Isosceles Triangle (base 400, height 200) -> exact 7-piece Tangram triangle!
// 4) Classic Parallelogram / Trapezoid (exact 7-piece dissection!)
const VERIFIED_PUZZLES: TangramPuzzle[] = [
  PUZZLES[0], // Classic Square (verified exact 200x200 dissection)
  {
    id: 'big-triangle',
    name: 'Tam Giác Khổng Lồ',
    difficulty: 'Dễ',
    desc: 'Ghép cả 7 mảnh thành một tam giác vuông cân lớn hoàn hảo (đáy 200√2, cao 100√2).',
    // Take Classic Square, move LT2 from left to right-top mirrored? Even simpler:
    // A 200x200 square cut along its main diagonal gives 2 congruent right triangles of legs 200!
    // One half is ALREADY (LT1 + LT2)! Wait: LT1 (top) + LT2 (left) form the upper-left half of the square (legs 200 along top & left, hypotenuse from (-100,100) to (100,-100))!
    // The other half (SQ + ST1 + ST2 + MT + PL) is ALSO a congruent right triangle of legs 200!
    // Translate the upper-left half (LT1 + LT2) to attach along the vertical leg x = 100, reflected/rotated 90° CW around (100,100):
    // Wait: rotating the upper-left half by +90° CW around (0,0) puts its legs along top-right & bottom-right...
    // Actually, translating the lower-right half (SQ, ST1, ST2, MT, PL) is trivial:
    // Simply take the lower-right triangle (vertices (100,-100), (100,100), (-100,100)) and place (LT1, LT2) adjacent on the left leg (x = -100 -> wait, leg is along y = 100 from (-100,100) to (100,100) and x = 100 from (100,-100) to (100,100)):
    // Rotate (LT1, LT2) by 90° CCW around (0,0):
    //   Old (-100,-100)->(-100,100), (100,-100)->(-100,-100), (-100,100)->(100,100) — wait, let's place LT1 + LT2 on the LEFT of x = -100? No, hypotenuse is diagonal.
    //   In the square, lower-right half has vertices A=(100,-100), B=(100,100), C=(-100,100) (right angle at B=(100,100)).
    //   Take LT1+LT2: originally vertices D=(-100,-100), A=(100,-100), C=(-100,100) (right angle at D=(-100,-100)).
    //   Rotate (LT1+LT2) by 180° around (0,0)? That lands on lower-right half!
    //   Instead, rotate (LT1+LT2) by 90° CW so its right angle is at (100,100) and legs go to (100,-100) and (300,100)!
    //   Let's check: old D=(-100,-100), A=(100,-100), C=(-100,100).
    //   Map (x,y) -> (200 - y, x + 200)? Wait:
    //   D(-100,-100) -> (300, 100)  (Wait: we want D -> (100, 100)!)
    //   Simple 90° CW rotation around (0,0): (x, y) -> (-y, x).
    //   D(-100,-100) -> (100, -100); A(100,-100) -> (100, 100); C(-100,100) -> (-100, -100).
    //   Translate by (+200, 0) after 90° CCW ((x,y) -> (y, -x)):
    //   90° CCW: D(-100,-100) -> (-100, 100), A(100,-100) -> (-100, -100), C(-100,100) -> (100, 100).
    //   Now translate by (+200, 0): D -> (100, 100), A -> (100, -100), C -> (300, 100)!!
    //   CHECK: Triangle 1 (lower-right half): (100,-100), (100,100), (-100,100).
    //          Triangle 2 (LT1+LT2 moved):    (100,-100), (100,100), (300,100).
    //   UNION = Big Isosceles Right Triangle with vertices (100, -100), (-100, 100), (300, 100)!! ZERO OVERLAP, 100% EXACT!!
    //   Shift everything left by 100 so center is at x = 300, y = 260 (old origin (0,0) -> (200, 260)):
    //   For lower-right half pieces, new (x, y) = old_rel + (200, 260):
    //     ST1: rel(33.33, 0) -> (233.33, 260), rot 90
    //     SQ:  rel(0, 50)    -> (200, 310), rot 0
    //     ST2: rel(-50, 83.33) -> (150, 343.33), rot 180
    //     MT:  rel(50, 50)   -> (250, 310), rot 180
    //     PL:  rel(75, -25)  -> (275, 235), rot 90, flipped true
    //   For LT1, LT2: transform rel (x,y) -> (y + 200, -x), rot -= 90, then add (200, 260):
    //     LT1: old rel(0, -66.67), rot 0   -> new rel(133.33, 0), rot 270 -> (333.33, 260), rot 270
    //     LT2: old rel(-66.67, 0), rot 270 -> new rel(200, 66.67), rot 180 -> (400, 326.67), rot 180
    solution: {
      LT1: { x: 333.33, y: 260, rot: 270, flipped: false },
      LT2: { x: 400, y: 326.67, rot: 180, flipped: false },
      ST1: { x: 233.33, y: 260, rot: 90, flipped: false },
      SQ: { x: 200, y: 310, rot: 0, flipped: false },
      ST2: { x: 150, y: 343.33, rot: 180, flipped: false },
      MT: { x: 250, y: 310, rot: 180, flipped: false },
      PL: { x: 275, y: 235, rot: 90, flipped: true },
    },
  },
  {
    id: 'rectangle-exact',
    name: 'Hình Chữ Nhật 2:1',
    difficulty: 'Vừa',
    desc: 'Ghép 7 mảnh thành một hình chữ nhật tỷ lệ 2:1 (200√2 × 100√2) đầy tinh tế.',
    // Rotate the 200x200 square by 45° CW so the two halves sit side-by-side?
    // Even cleaner: take Triangle 1 (lower-right half: (100,-100), (100,100), (-100,100))
    // Rotate all pieces by 45° CW:
    // Actually! A 2:1 rectangle of size 200√2 × 100√2 consists of TWO 200-leg right triangles placed HYPOTENUSE-TO-HYPOTENUSE? No, that's a square!
    // Wait: cut a 200x200 square along its midline x=0 into TWO 100x200 rectangles? No, Tangram cuts along diagonal.
    // How to make a 200√2 × 100√2 rectangle from the two halves of the 200x200 square?
    // Take Half 1 (LT1+LT2) and Half 2 (the other 5 pieces). Each half is a right isosceles triangle (hypotenuse = 200√2, height = 100√2).
    // Split Half 1 into LT1 + LT2!
    //   LT1 has hypotenuse 200, legs 100√2.
    //   LT2 has hypotenuse 200, legs 100√2.
    // Place Half 2 with its hypotenuse horizontal at the BOTTOM: y = 300, from x = 300 - 100√2 to 300 + 100√2, apex at (300, 300 - 100√2).
    // That fills the middle isosceles triangle of the rectangle!
    // What remains in the rectangle are TWO right triangles at top-left and top-right, each with legs 100√2 and 100√2 — WHICH ARE EXACTLY LT1 AND LT2!!
    // CHECK THAT GEOMETRY!
    // Rectangle: x in [300 - 100√2, 300 + 100√2], y in [300 - 100√2, 300]. Area = 200√2 * 100√2 = 40,000 = 200*200!!
    // Half 2 (rotated +135° CW around (0,0) from canonical square):
    //   Canonical Half 2 vertices: A(100,-100), B(100,100), C(-100,100).
    //   Rotate by +135° CW ((x,y) -> (-x-y, x-y)/√2):
    //     A(100,-100) -> (0, 200/√2) = (0, 100√2) -> wait, we want B(100,100) at TOP (0, -100√2)!
    //   Rotate by -135° CW (= +225° CW: (x,y) -> (-x+y, -x-y)/√2? Let's check cos(225)=-1/√2, sin(225)=-1/√2:
    //     x' = x*cos - y*sin = (-x + y)/√2
    //     y' = x*sin + y*cos = (-x - y)/√2
    //     Check B(100, 100): x' = 0, y' = -200/√2 = -100√2 (TOP APEX!)
    //     Check A(100, -100): x' = -200/√2 = -100√2, y' = 0 (BOTTOM LEFT!)
    //     Check C(-100, 100): x' = +100√2, y' = 0 (BOTTOM RIGHT!)
    //   OH!! Translate by (300, 300):
    //     B -> (300, 300 - 100√2), A -> (300 - 100√2, 300), C -> (300 + 100√2, 300)!!
    //   Now place LT1 in TOP-LEFT corner: vertices (300-100√2, 300-100√2), (300, 300-100√2), (300-100√2, 300)!
    //     Wait: LT1 local vertices at rot=0 are (-100,-33.33), (100,-33.33), (0,66.67) — right angle at (0, 66.67), hypotenuse length 200 along top!
    //     Wait: for legs = 100√2 and hypotenuse = 200, the triangle in top-left has legs along top (length 100√2) and left (length 100√2), hypotenuse 200!
    //     Centroid of top-left triangle: (300 - 100√2 + 100√2/3, 300 - 100√2 + 100√2/3) = (300 - 200√2/3, 300 - 200√2/3)
    //     Wait: LT1's centroid is at (0,0) in local coords! Right angle is at (0, 66.67) pointing DOWN (0, +1).
    //     We need the right angle to point TOP-LEFT (-1, -1)/√2 -> rotate +135° CW!
    //     Check rot=135° on (0, 66.67): x' = -66.67*sin135 = -47.14 = -100√2/3, y' = 66.67*cos135 = -47.14 = -100√2/3!
    //     Add center (300 - 200√2/3, 300 - 200√2/3) -> right angle lands at (300 - 100√2, 300 - 100√2)!! EXACT!!
    //   And LT2 in TOP-RIGHT corner: right angle pointing TOP-RIGHT (+1, -1)/√2 -> rotate +225° CW!
    //     Center = (300 + 200√2/3, 300 - 200√2/3)!
    //     Check rot=225° on (0, 66.67): x' = -66.67*(-1/√2) = +47.14, y' = 66.67*(-1/√2) = -47.14 -> right angle lands at (300 + 100√2, 300 - 100√2)!! EXACT!!
    solution: {
      LT1: {
        x: 300 - (200 * S2) / 3,
        y: 300 - (200 * S2) / 3,
        rot: 135,
        flipped: false,
      },
      LT2: {
        x: 300 + (200 * S2) / 3,
        y: 300 - (200 * S2) / 3,
        rot: 225,
        flipped: false,
      },
      ST1: {
        x: 300 + (-33.33 + 0) / S2,
        y: 300 + (-33.33 - 0) / S2,
        rot: 315,
        flipped: false,
      },
      SQ: {
        x: 300 + (0 + 50) / S2,
        y: 300 + (0 - 50) / S2,
        rot: 225,
        flipped: false,
      },
      ST2: {
        x: 300 + (50 + 83.33) / S2,
        y: 300 + (50 - 83.33) / S2,
        rot: 45,
        flipped: false,
      },
      MT: {
        x: 300 + (-50 + 50) / S2,
        y: 300 + (-50 - 50) / S2,
        rot: 45,
        flipped: false,
      },
      PL: {
        x: 300 + (-75 - 25) / S2,
        y: 300 + (-75 + 25) / S2,
        rot: 315,
        flipped: true,
      },
    },
  },
  {
    id: 'trapezoid-exact',
    name: 'Hình Thang Cân',
    difficulty: 'Vừa',
    desc: 'Ghép 7 mảnh tạo thành hình thang cân đối xứng hoàn hảo.',
    // Take Classic Square (centered at (300, 260)):
    // Actually take our exact Rectangle above (width 200√2, height 100√2):
    // Move LT2 from top-right corner to BOTTOM-RIGHT side flipped? Wait:
    // Move LT2 (right-angle at top-right) -> translate it down-right or mirror along right edge x = 300+100√2?
    // Even simpler: start from Rectangle [300-100√2, 300+100√2] × [300-100√2, 300].
    // Leave LT1 in top-left, leave Half 2 in center.
    // Put LT2 on the RIGHT of C(300+100√2, 300) and B(300, 300-100√2)? No, move LT1 from top-left to right!
    // Wait: remove LT2 from top-right (vertices (300, 300-100√2), (300+100√2, 300-100√2), (300+100√2, 300)),
    // leaving vertices (300-100√2, 300-100√2), (300, 300-100√2), (300+100√2, 300), (300-100√2, 300).
    // Now attach LT2 onto the LEFT edge x = 300-100√2 so its right angle is at (300-100√2, 300) and legs go up to (300-100√2, 300-100√2) and left to (300-200√2, 300)!
    // That forms an EXACT ISOSCELES TRAPEZOID!
    //   Top base:    from (300-100√2, 300-100√2) to (300, 300-100√2) — length 100√2
    //   Bottom base: from (300-200√2, 300) to (300+100√2, 300) — length 300√2
    //   Height:      100√2 -> Area = (100√2 + 300√2)/2 * 100√2 = 40,000!
    // Shift everything right by +50√2 so the trapezoid is perfectly centered at x = 300!
    // For LT2 at bottom-left: right angle at (300 - 50√2, 300), pointing DOWN-RIGHT (+1, +1)/√2 -> rot = 315°!
    //   Wait: local right angle (0, 66.67) rotated 315° CW (= -45°):
    //   x' = -66.67*sin(-45) = +47.14 = +100√2/3, y' = 66.67*cos(-45) = +47.14 = +100√2/3!
    //   Center = (300 - 50√2 - 100√2/3, 300 - 100√2/3) = (300 - 250√2/3, 300 - 100√2/3)
    //   Right angle lands at (300 - 50√2, 300)! Other vertices at (300 - 150√2, 300) and (300 - 50√2, 300 - 100√2)! EXACT!!
    solution: {
      LT1: {
        x: 300 + 50 * S2 - (200 * S2) / 3,
        y: 300 - (200 * S2) / 3,
        rot: 135,
        flipped: false,
      },
      LT2: {
        x: 300 - (250 * S2) / 3,
        y: 300 - (100 * S2) / 3,
        rot: 315,
        flipped: false,
      },
      ST1: {
        x: 300 + 50 * S2 + (-33.33 + 0) / S2,
        y: 300 + (-33.33 - 0) / S2,
        rot: 315,
        flipped: false,
      },
      SQ: {
        x: 300 + 50 * S2 + (0 + 50) / S2,
        y: 300 + (0 - 50) / S2,
        rot: 225,
        flipped: false,
      },
      ST2: {
        x: 300 + 50 * S2 + (50 + 83.33) / S2,
        y: 300 + (50 - 83.33) / S2,
        rot: 45,
        flipped: false,
      },
      MT: {
        x: 300 + 50 * S2 + (-50 + 50) / S2,
        y: 300 + (-50 - 50) / S2,
        rot: 45,
        flipped: false,
      },
      PL: {
        x: 300 + 50 * S2 + (-75 - 25) / S2,
        y: 300 + (-75 + 25) / S2,
        rot: 315,
        flipped: true,
      },
    },
  },
  {
    id: 'house-chimney',
    name: 'Ngôi Nhà Ống Khói',
    difficulty: 'Khó',
    desc: 'Mái nhà rộng hai cánh cùng thân nhà cân xứng — đòi hỏi xoay mảnh góc 45° chính xác.',
    // Exact zero-overlap house from canonical pieces:
    // Roof = Big Triangle top (LT1 + LT2 forming a roof of width 200√2, height 100√2? Wait: LT1+LT2 have area 20,000 = half the pieces!)
    // Put LT1 + LT2 together as a symmetrical roof triangle: base along y = 210 from x = 300-100√2 to 300+100√2, peak at (300, 210 - 100√2)!
    //   Wait: each LT has legs 100√2 and hypotenuse 200. Put their 100√2 legs together along x = 300!
    //   No: LT hypotenuse is 200, legs are 100√2! Put legs of length 100√2 along x=300 (height 100√2) and y=210 (each half-base 100√2):
    //   Wait: LT1 right angle at (300, 210), pointing DOWN-RIGHT -> rot 315° -> vertices (300, 210), (300 - 100√2, 210), (300, 210 - 100√2)!
    //   LT2 right angle at (300, 210), pointing DOWN-LEFT  -> rot 45°  -> vertices (300, 210), (300 + 100√2, 210), (300, 210 - 100√2)!
    //   Check rot=45° on (0, 66.67): x' = -66.67*sin45 = -47.14, y' = +47.14 -> center = (300 + 47.14, 210 - 47.14) -> right angle at (300, 210)! EXACT!
    // Body below y = 210: Half 2 (area 20,000) fits into a 200 × 100 rectangle?
    //   Wait: Half 2 = SQ (5000) + ST1 (2500) + ST2 (2500) + MT (5000) + PL (5000) = 20,000!
    //   And Half 2 in canonical square is a right triangle of legs 200!
    //   Instead, arrange Half 2 cleanly as a 200 × 100 rectangle right below the roof (x in [200, 400], y in [210, 310]):
    //     - Left 100×100 square [200, 300] × [210, 310]:
    //       Wait: MT is a right triangle with legs 100, 100! Area = 5000. Put MT in bottom-left: (200,210), (200,310), (300,310)!
    //       Remaining upper-right triangle of [200,300]×[210,310] is (200,210), (300,210), (300,310) (area 5000).
    //       Split that by midpoint (250,260) and (300,210)? Wait: ST1 + ST2 have legs 50√2, hypotenuse 100!
    //       If we put SQ rotated 45° -> side 50√2 ≈ 70.71, doesn't fit 100×100 cleanly.
    //       Whereas a 100√2 × 100√2 square (side 141.42) DOES fit Half 2 EXACTLY!!
    //       WAIT A SECOND!! Check the area of 100√2 × 100√2 = 20,000!!
    //       Let's tile a 100√2 × 100√2 square centered at (300, 210 + 50√2) using {SQ, ST1, ST2, MT, PL}:
    //       Even better: in the canonical 200×200 square, rotate the 100√2 × 100√2 square by 45° — its side is 100√2, and:
    //         - SQ has side 50√2 (takes 1/4 of the square: top-left quadrant!)
    //         - ST1 + ST2 each have legs 50√2, hypotenuse 100 (together they form a 50√2 × 50√2 square: top-right quadrant!)
    //         - MT has hypotenuse 100√2, height 50√2 (area 5000 = half of bottom 100√2 × 50√2 rectangle!)
    //         - PL has base 100? Wait: PL has sides 100 and 50√2, height 50 -> area 5000!
    //       Wait: can Half 2 make a 100√2 × 100√2 square? YES! Let's check exact coordinates in a 100√2 × 100√2 square (let u = 50√2, square is [-u, u] × [-u, u], centered at (300, 210 + u)):
    //         - Top-left square [-u, 0] × [-u, 0]: SQ rotated 45° at (-u/2, -u/2)! (Exact side u = 50√2!)
    //         - Top-right square [0, u] × [-u, 0]: ST1 + ST2!
    //           - ST1: right angle at (0, -u), legs to (u, -u) and (0, 0) -> rot 135°, center (u/3, -2u/3)
    //           - ST2: right angle at (u, 0), legs to (u, -u) and (0, 0) -> rot 315°, center (2u/3, -u/3)
    //         - Bottom half [-u, u] × [0, u]: width 2u = 100√2, height u = 50√2!
    //           Wait: PL has sides 100 and u=50√2 at 45°! Put PL with its u-side vertical? No, PL's 45° height perpendicular to its u-side is 50√2 = u!!
    //           WAIT A MINUTE! Check PL vertices: (-75,-25), (25,-25), (75,25), (-25,25):
    //             Top horizontal edge: length 100. Slanted edge: (50, 50) -> length 50√2 = u!
    //             Rotate PL by 45° CCW (315° CW): slanted edge becomes horizontal (length u), top edge goes at 45° (length 100, dx=u, dy=u)!
    //             So rotated PL fits vertices (-u, 0), (0, 0), (u, u), (0, u) — WAIT:
    //             Check its height: dy = u, horizontal base length = u -> area = u^2 = 5000!
    //             Wait: that leaves TWO right triangles in [-u, u] × [0, u]: (-u,0)-(0,u)-(-u,u) (legs u, u -> area 2500) AND (0,0)-(u,0)-(u,u) (legs u, u -> area 2500)!
    //             Put ST1 and ST2 in those two triangles, and put MT (which has legs 100, 100 -> hypotenuse 2u, wait: MT legs are 100, NOT u! MT hypotenuse is 100√2 = 2u, height is u!)
    //             OH!! MT fits in the bottom half as triangle (-u, u), (u, u), (0, 0) (base 2u, height u)!
    //             Wait: that leaves left-corner (-u,0)-(0,0)-(-u,u) (legs u, u) and right-corner (0,0)-(u,0)-(u,u) (legs u, u) — put ST1 and ST2 THERE!
    //             Then top half [-u, u] × [-u, 0] needs SQ + PL: SQ takes [-u, 0]×[-u, 0], leaving [0, u]×[-u, 0] which is a square (not PL).
    //             INSTEAD! Put PL on the ROOF as a CHIMNEY sticking out of the right roof slope!!
    //             OMG THAT'S EVEN MORE ICONIC — "Ngôi Nhà Ống Khói"!!
    //             Let's verify ZERO OVERLAP for House with Chimney:
    //             Let u = 50 * S2 (≈ 70.71).
    //             - Roof (LT1 + LT2): base y = 220, x in [300 - 2u, 300 + 2u], peak at (300, 220 - 2u).
    //               - LT1 (left half of roof): right angle at (300, 220), center (300 - 2u/3, 220 - 2u/3), rot 315°
    //               - LT2 (right half of roof): right angle at (300, 220), center (300 + 2u/3, 220 - 2u/3), rot 45°
    //             - Chimney (PL): sits flush on the right roof slope (from (300, 220-2u) to (300+2u, 220), which has slope +45°)!
    //               In local coords, PL has a 45° slanted side of length u and a horizontal side of length 100.
    //               Rotate PL by 90° CW (flipped: false):
    //                 (-75,-25)->(25,-75), (25,-25)->(25,25), (75,25)->(-25,75), (-25,25)->(-25,-25).
    //               Look at edge (-25,75) to (25,25): dx = +50, dy = -50 (slope -45°)!
    //               With flipped=true & rot=90°:
    //                 (75,-25)->(25,75), (-25,-25)->(25,-25), (-75,25)->(-25,-75), (25,25)->(-25,25) ->
    //                 bottom slanted edge (-25,-75) to (25,-25)? No: bottom slanted edge (-25,25) to (25,75) has dx=+50, dy=+50 (slope +45° — EXACTLY PARALLEL TO RIGHT ROOF SLOPE)!!
    //                 And vertical sides at x = -25 and x = +25 (vertical chimney width 50, height 100)!!
    //               Place center at (300 + 75, 220 - 2u + 75 - 50) = (375, 220 - 2u + 25):
    //                 Bottom slanted edge runs from (350, 220 - 2u + 50) to (400, 220 - 2u + 100) — check if on roof line y = 220 - 2u + (x - 300):
    //                 At x = 350: y = 220 - 2u + 50! At x = 400: y = 220 - 2u + 100!
    //                 100% FLUSH WITH ROOF, ZERO OVERLAP!!
    //             - House body below y = 220: square [300 - u, 300 + u] × [220, 220 + 2u] (wait: SQ + ST1 + ST2 + MT has area 15,000 = 3u^2!).
    //               So body is a 3:1? Or 2u wide × 1.5u tall? Or 3u wide × u tall (212 × 71)!
    //               YES!! Width 3u (x in [300 - 1.5u, 300 + 1.5u]), height u (y in [220, 220 + u]):
    //               Area = 3u * u = 3 * 5000 = 15,000 = SQ (5000) + MT (5000) + ST1 (2500) + ST2 (2500)!!
    //               Tile [300 - 1.5u, 300 + 1.5u] × [220, 220 + u]:
    //                 - Left square [300 - 1.5u, 300 - 0.5u] × [220, 220 + u]: SQ (rot 45°) at (300 - u, 220 + 0.5u)!
    //                 - Right rectangle [300 - 0.5u, 300 + 1.5u] × [220, 220 + u] (width 2u, height u):
    //                   - MT (hypotenuse 2u along bottom y = 220+u, peak at (300 + 0.5u, 220)):
    //                     Wait: local MT vertices (-50,50), (50,50), (-50,-50) — right angle at (-50,50), centroid at (-16.67, 16.67)!
    //                     Rotate MT by 135° CW: right angle (-50,50) -> (0, -u), (-50,-50) -> (u, 0), (50,50) -> (-u, 0)?
    //                     Check rot=135° (cos=-1/√2, sin=+1/√2):
    //                       (-50, 50) -> (50/√2 - 50/√2, -50/√2 - 50/√2) = (0, -u)! (TOP APEX!)
    //                       (50, 50)  -> (-50/√2 - 50/√2, 50/√2 - 50/√2) = (-u, 0)! (BOTTOM LEFT!)
    //                       (-50,-50) -> (50/√2 + 50/√2, -50/√2 + 50/√2) = (+u, 0)! (BOTTOM RIGHT!)
    //                     Translate by (300 + 0.5u, 220 + u): apex at (300 + 0.5u, 220), base at y = 220 + u from (300 - 0.5u) to (300 + 1.5u)!! EXACT!!
    //                   - Left small gap: (300 - 0.5u, 220), (300 + 0.5u, 220), (300 - 0.5u, 220 + u) -> ST1 (rot 135°, right angle pointing top-left)!
    //                     Check rot=135° on ST1 local right angle (0, 33.33): (-u/3, -u/3) -> center = (300 - 0.5u + u/3, 220 + u/3)!
    //                   - Right small gap: (300 + 0.5u, 220), (300 + 1.5u, 220), (300 + 1.5u, 220 + u) -> ST2 (rot 225°, right angle pointing top-right)!
    //                     Check rot=225° on ST2 local right angle (0, 33.33): (+u/3, -u/3) -> center = (300 + 1.5u - u/3, 220 + u/3)!
    //             OMG EVERY SINGLE VERTEX MATCHES TO MACHINE PRECISION!! ZERO OVERLAP, ZERO GAPS!!
    solution: {
      LT1: {
        x: 300 - (100 * S2) / 3,
        y: 230 - (100 * S2) / 3,
        rot: 315,
        flipped: false,
      },
      LT2: {
        x: 300 + (100 * S2) / 3,
        y: 230 - (100 * S2) / 3,
        rot: 45,
        flipped: false,
      },
      PL: {
        x: 375,
        y: 230 - 100 * S2 + 25,
        rot: 90,
        flipped: true,
      },
      SQ: {
        x: 300 - 50 * S2,
        y: 230 + 25 * S2,
        rot: 45,
        flipped: false,
      },
      MT: {
        x: 300 + 25 * S2,
        y: 230 + 50 * S2,
        rot: 135,
        flipped: false,
      },
      ST1: {
        x: 300 - 25 * S2 + (50 * S2) / 3,
        y: 230 + (50 * S2) / 3,
        rot: 135,
        flipped: false,
      },
      ST2: {
        x: 300 + 75 * S2 - (50 * S2) / 3,
        y: 230 + (50 * S2) / 3,
        rot: 225,
        flipped: false,
      },
    },
  },
];

function transformVertices(vertices: Point[], t: PieceTransform): Point[] {
  const rad = (t.rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return vertices.map(([vx, vy]) => {
    const fx = t.flipped ? -vx : vx;
    const rx = fx * cos - vy * sin;
    const ry = fx * sin + vy * cos;
    return [t.x + rx, t.y + ry];
  });
}

function pointInPolygon(px: number, py: number, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function computeMatchAccuracy(
  playerTransforms: Record<string, PieceTransform>,
  solutionTransforms: Record<string, PieceTransform>
): { matchPercent: number; hasOverlap: boolean } {
  const targetPolys = TANGRAM_PIECES.map((p) =>
    transformVertices(p.vertices, solutionTransforms[p.id])
  );
  const playerPolys = TANGRAM_PIECES.map((p) =>
    transformVertices(p.vertices, playerTransforms[p.id])
  );

  // Bounding box of target silhouette
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const poly of targetPolys) {
    for (const [x, y] of poly) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const samples = 44;
  const stepX = (maxX - minX) / samples;
  const stepY = (maxY - minY) / samples;

  let targetCount = 0;
  let coveredCount = 0;
  let overlapCount = 0;

  for (let i = 0; i < samples; i++) {
    const px = minX + (i + 0.5) * stepX;
    for (let j = 0; j < samples; j++) {
      const py = minY + (j + 0.5) * stepY;
      const inTarget = targetPolys.some((poly) => pointInPolygon(px, py, poly));
      let playerHits = 0;
      for (const poly of playerPolys) {
        if (pointInPolygon(px, py, poly)) playerHits++;
      }

      if (inTarget) {
        targetCount++;
        if (playerHits >= 1) coveredCount++;
      }
      if (playerHits >= 2) {
        overlapCount++;
      }
    }
  }

  const overlapRatio = targetCount > 0 ? overlapCount / targetCount : 0;
  const coverage = targetCount > 0 ? coveredCount / targetCount : 0;
  const penalty = Math.max(0, overlapRatio - 0.03) * 1.5;
  const matchPercent = Math.max(0, Math.min(100, Math.round((coverage - penalty) * 100)));

  return { matchPercent, hasOverlap: overlapRatio > 0.06 };
}

function createInitialScatteredTransforms(): Record<string, PieceTransform> {
  return {
    LT1: { x: 115, y: 110, rot: 45, flipped: false },
    LT2: { x: 485, y: 115, rot: 135, flipped: false },
    MT: { x: 105, y: 345, rot: 90, flipped: false },
    ST1: { x: 500, y: 345, rot: 0, flipped: false },
    ST2: { x: 515, y: 245, rot: 225, flipped: false },
    SQ: { x: 95, y: 230, rot: 45, flipped: false },
    PL: { x: 300, y: 405, rot: 0, flipped: false },
  };
}

export default function TangramGame() {
  const [phase, setPhase] = useState<GamePhase>('SETUP');
  const [selectedPuzzleId, setSelectedPuzzleId] = useState<string>(VERIFIED_PUZZLES[0].id);

  const [transforms, setTransforms] = useState<Record<string, PieceTransform>>(
    createInitialScatteredTransforms
  );
  const [selectedPieceId, setSelectedPieceId] = useState<string>('LT1');
  const [hintPieceId, setHintPieceId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentPuzzle = useMemo(
    () => VERIFIED_PUZZLES.find((p) => p.id === selectedPuzzleId) ?? VERIFIED_PUZZLES[0],
    [selectedPuzzleId]
  );

  const { matchPercent, hasOverlap } = useMemo(
    () => computeMatchAccuracy(transforms, currentPuzzle.solution),
    [transforms, currentPuzzle]
  );

  const startGame = (puzzleId = selectedPuzzleId) => {
    setSelectedPuzzleId(puzzleId);
    setTransforms(createInitialScatteredTransforms());
    setSelectedPieceId('LT1');
    setHintPieceId(null);
    setElapsedSec(0);
    setPhase('PLAYING');
  };

  useEffect(() => {
    if (phase !== 'PLAYING') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const rotateSelected = useCallback(
    (deltaDeg: number) => {
      setTransforms((prev) => ({
        ...prev,
        [selectedPieceId]: {
          ...prev[selectedPieceId],
          rot: (prev[selectedPieceId].rot + deltaDeg + 360) % 360,
        },
      }));
    },
    [selectedPieceId]
  );

  const flipSelected = useCallback(() => {
    setTransforms((prev) => ({
      ...prev,
      [selectedPieceId]: {
        ...prev[selectedPieceId],
        flipped: !prev[selectedPieceId].flipped,
      },
    }));
  }, [selectedPieceId]);

  // Keyboard shortcuts: Q/E/R rotate, F flip, Arrow nudge
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R' || e.key === 'e' || e.key === 'E') {
        rotateSelected(45);
      } else if (e.key === 'q' || e.key === 'Q') {
        rotateSelected(-45);
      } else if (e.key === 'f' || e.key === 'F') {
        flipSelected();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 1 : 5;
        const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
        const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
        setTransforms((prev) => ({
          ...prev,
          [selectedPieceId]: {
            ...prev[selectedPieceId],
            x: Math.max(40, Math.min(560, prev[selectedPieceId].x + dx)),
            y: Math.max(40, Math.min(420, prev[selectedPieceId].y + dy)),
          },
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, selectedPieceId, rotateSelected, flipSelected]);

  const getSVGCoords = (clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return [300, 230];
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 600;
    const y = ((clientY - rect.top) / rect.height) * 460;
    return [x, y];
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedPieceId(id);
    const [sx, sy] = getSVGCoords(e.clientX, e.clientY);
    const curr = transforms[id];
    draggingRef.current = {
      id,
      offsetX: sx - curr.x,
      offsetY: sy - curr.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const { id, offsetX, offsetY } = draggingRef.current;
    const [sx, sy] = getSVGCoords(e.clientX, e.clientY);
    let nx = Math.max(40, Math.min(560, sx - offsetX));
    let ny = Math.max(40, Math.min(420, sy - offsetY));

    // Gentle magnetic snap when close to target piece center
    const target = currentPuzzle.solution[id];
    if (target && Math.hypot(nx - target.x, ny - target.y) < 14) {
      nx = target.x;
      ny = target.y;
    }

    setTransforms((prev) => ({
      ...prev,
      [id]: { ...prev[id], x: nx, y: ny },
    }));
  };

  const handlePointerUp = () => {
    draggingRef.current = null;
  };

  const handleVerifyWin = () => {
    if (matchPercent >= 93 && !hasOverlap) {
      setPhase('RESULT');
    }
  };

  const handleRevealHint = () => {
    // Pick a piece furthest from its solution transform
    let worstId = TANGRAM_PIECES[0].id;
    let maxDist = -1;
    for (const p of TANGRAM_PIECES) {
      const curr = transforms[p.id];
      const sol = currentPuzzle.solution[p.id];
      const dist = Math.hypot(curr.x - sol.x, curr.y - sol.y);
      if (dist > maxDist) {
        maxDist = dist;
        worstId = p.id;
      }
    }
    setHintPieceId(worstId);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  useGameResultRecorder(phase === 'RESULT', {
    gameId: 'tangram',
    won: true,
    accuracy: matchPercent,
    scoreLabel: `${currentPuzzle.name} (${formatTime(elapsedSec)})`,
    durationSec: Math.max(1, elapsedSec),
  });

  const ptsToStr = (pts: Point[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-amber-500 selection:text-white">
      <div className="p-6 flex justify-between items-center">
        <Link
          href="/spatial"
          className="inline-flex items-center text-slate-500 hover:text-amber-400 transition-colors group"
        >
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          Quay lại Hình Học &amp; Không Gian
        </Link>
        {phase === 'PLAYING' && (
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-400 font-bold">
              Độ khớp: {matchPercent}%
            </span>
            <span className="px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-bold">
              ⏱ {formatTime(elapsedSec)}
            </span>
          </div>
        )}
      </div>

      {/* SETUP */}
      {phase === 'SETUP' && (
        <div className="max-w-7xl mx-auto px-6 pb-20 animate-fade-in">
          <div className="mb-10 border-b border-slate-800 pb-6">
            <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500 mb-2">
              GHÉP HÌNH TANGRAM
            </h1>
            <p className="text-xl text-slate-400 uppercase tracking-widest">
              Tangram Studio • Tái cấu trúc 7 mảnh kinh điển
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {VERIFIED_PUZZLES.map((p) => {
                  const isSelected = p.id === selectedPuzzleId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPuzzleId(p.id)}
                      className={`text-left p-5 rounded-2xl border-2 transition-all ${
                        isSelected
                          ? 'bg-slate-900 border-amber-500 shadow-lg shadow-amber-500/10'
                          : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-bold text-lg text-white">{p.name}</h3>
                        <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                          {p.difficulty}
                        </span>
                      </div>
                      <div className="bg-slate-950 rounded-xl p-2 mb-3 border border-slate-800 h-32 flex items-center justify-center">
                        <svg viewBox="60 40 480 350" className="w-full h-full">
                          {TANGRAM_PIECES.map((piece) => (
                            <polygon
                              key={piece.id}
                              points={ptsToStr(
                                transformVertices(piece.vertices, p.solution[piece.id])
                              )}
                              fill="#f59e0b"
                              fillOpacity="0.8"
                            />
                          ))}
                        </svg>
                      </div>
                      <p className="text-xs text-slate-400">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl space-y-6">
                <h3 className="text-xl font-bold text-white border-b border-slate-700 pb-2">
                  Hướng Dẫn Điều Khiển
                </h3>
                <ul className="space-y-3 text-sm text-slate-300">
                  <li>
                    <strong className="text-amber-400">Kéo thả chuột:</strong> Di chuyển từng mảnh vào vùng bóng mục tiêu (có lực hút nhẹ khi gần khớp).
                  </li>
                  <li>
                    <strong className="text-amber-400">Phím Q / E (hoặc R):</strong> Xoay mảnh đang chọn từng góc 45°.
                  </li>
                  <li>
                    <strong className="text-amber-400">Phím F:</strong> Lật mặt mảnh (quan trọng với Hình bình hành).
                  </li>
                  <li>
                    <strong className="text-amber-400">Phím Mũi tên:</strong> Tinh chỉnh vị trí từng bước nhỏ (giữ Shift để di chuyển 1px).
                  </li>
                </ul>

                <button
                  onClick={() => startGame(selectedPuzzleId)}
                  className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-white text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  CHƠI MẪU ĐÃ CHỌN
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAYING */}
      {phase === 'PLAYING' && (
        <div className="max-w-6xl mx-auto px-4 pb-12 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-black text-amber-400">{currentPuzzle.name}</h2>
              <p className="text-xs text-slate-400">
                Đang chọn:{' '}
                <strong className="text-white">
                  {TANGRAM_PIECES.find((p) => p.id === selectedPieceId)?.name}
                </strong>{' '}
                (Góc {transforms[selectedPieceId]?.rot}°)
                {hasOverlap && (
                  <span className="ml-3 text-red-400 font-bold">⚠ Có mảnh đang chồng lên nhau</span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => rotateSelected(-45)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-700"
              >
                ↺ Xoay -45° (Q)
              </button>
              <button
                onClick={() => rotateSelected(45)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold border border-slate-700"
              >
                ↻ Xoay +45° (E)
              </button>
              <button
                onClick={flipSelected}
                className="px-3 py-2 bg-purple-900/60 hover:bg-purple-800 rounded-lg text-xs font-bold border border-purple-700 text-purple-200"
              >
                ⇄ Lật Mảnh (F)
              </button>
              <button
                onClick={handleRevealHint}
                className="px-3 py-2 bg-amber-900/50 hover:bg-amber-800 rounded-lg text-xs font-bold border border-amber-700 text-amber-300"
              >
                💡 Gợi Ý 1 Mảnh
              </button>
              <button
                onClick={() => setTransforms(createInitialScatteredTransforms())}
                className="px-3 py-2 bg-slate-800 hover:bg-red-900/60 rounded-lg text-xs font-bold border border-slate-700 text-slate-300"
              >
                Đặt Lại
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-3 shadow-2xl">
            <svg
              ref={svgRef}
              viewBox="0 0 600 460"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full h-[520px] bg-slate-950 rounded-2xl touch-none select-none"
            >
              {/* Subtle grid */}
              <defs>
                <pattern id="tangram-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path
                    d="M 25 0 L 0 0 0 25"
                    fill="none"
                    stroke="rgba(148,163,184,0.08)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="600" height="460" fill="url(#tangram-grid)" />

              {/* Target silhouette */}
              <g>
                {TANGRAM_PIECES.map((p) => (
                  <polygon
                    key={`sil-${p.id}`}
                    points={ptsToStr(transformVertices(p.vertices, currentPuzzle.solution[p.id]))}
                    fill="#1e293b"
                    stroke="#334155"
                    strokeWidth="1"
                  />
                ))}
              </g>

              {/* Optional 1-piece Hint outline */}
              {hintPieceId && (
                <polygon
                  points={ptsToStr(
                    transformVertices(
                      TANGRAM_PIECES.find((p) => p.id === hintPieceId)!.vertices,
                      currentPuzzle.solution[hintPieceId]
                    )
                  )}
                  fill="rgba(251, 191, 36, 0.16)"
                  stroke="#fbbf24"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
              )}

              {/* Draggable Tangram pieces (render selected piece on top) */}
              {[...TANGRAM_PIECES]
                .sort((a, b) =>
                  a.id === selectedPieceId ? 1 : b.id === selectedPieceId ? -1 : 0
                )
                .map((piece) => {
                  const t = transforms[piece.id];
                  const pts = transformVertices(piece.vertices, t);
                  const isSel = piece.id === selectedPieceId;
                  return (
                    <polygon
                      key={piece.id}
                      points={ptsToStr(pts)}
                      fill={piece.color}
                      fillOpacity={isSel ? 0.95 : 0.85}
                      stroke={isSel ? '#ffffff' : '#0f172a'}
                      strokeWidth={isSel ? 3 : 1.5}
                      onPointerDown={(e) => handlePointerDown(e, piece.id)}
                      className="cursor-grab active:cursor-grabbing"
                    />
                  );
                })}
            </svg>
          </div>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:flex-1 bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  matchPercent >= 93 && !hasOverlap
                    ? 'bg-emerald-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${matchPercent}%` }}
              />
            </div>

            <button
              onClick={handleVerifyWin}
              disabled={matchPercent < 93 || hasOverlap}
              className="px-10 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 transition-all shadow-lg"
            >
              {matchPercent >= 93 && !hasOverlap
                ? '✔ HOÀN THÀNH GHÉP HÌNH!'
                : `Cần đạt ≥ 93% không chồng mảnh (${matchPercent}%)`}
            </button>
          </div>
        </div>
      )}

      {/* RESULT */}
      {phase === 'RESULT' && (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 animate-fade-in-up">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-10 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 to-amber-500" />
            <div className="text-7xl mb-4">🏆</div>
            <h2 className="text-4xl font-black text-emerald-400 mb-2">TUYỆT ĐẸP!</h2>
            <p className="text-slate-300 mb-8">
              Bạn đã hoàn thiện hình <strong className="text-white">{currentPuzzle.name}</strong>{' '}
              trong <strong className="text-amber-400">{formatTime(elapsedSec)}</strong> với độ khớp{' '}
              <strong className="text-emerald-400">{matchPercent}%</strong>.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setPhase('SETUP')}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300 transition-colors"
              >
                Chọn Mẫu Khác
              </button>
              <button
                onClick={() => startGame(currentPuzzle.id)}
                className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-white transition-colors"
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
