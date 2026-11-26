'use client';

import { useSyncExternalStore } from 'react';
import {
  isSakuraEnabled,
  getSakuraServerSnapshot,
  subscribeSakura,
} from '@/lib/themeEffects';

interface PetalSpec {
  left: string;
  size: number;
  duration: string;
  delay: string;
  sway: string;
  opacity: number;
  fill: string;
}

// Deterministic specs so SSR & client markup match 100% with zero hydration warnings
const PETALS: PetalSpec[] = [
  { left: '4%', size: 15, duration: '15s', delay: '-2s', sway: '42px', opacity: 0.48, fill: '#f6c2d0' },
  { left: '11%', size: 11, duration: '19s', delay: '-8s', sway: '-36px', opacity: 0.36, fill: '#f2a9be' },
  { left: '18%', size: 17, duration: '14s', delay: '-5s', sway: '55px', opacity: 0.52, fill: '#f9d3dd' },
  { left: '26%', size: 12, duration: '21s', delay: '-11s', sway: '-45px', opacity: 0.34, fill: '#e88da5' },
  { left: '34%', size: 14, duration: '16s', delay: '-1s', sway: '38px', opacity: 0.42, fill: '#f6c2d0' },
  { left: '43%', size: 10, duration: '22s', delay: '-14s', sway: '-30px', opacity: 0.3, fill: '#f9d3dd' },
  { left: '52%', size: 16, duration: '17s', delay: '-6s', sway: '48px', opacity: 0.45, fill: '#f2a9be' },
  { left: '61%', size: 12, duration: '20s', delay: '-9s', sway: '-42px', opacity: 0.36, fill: '#f6c2d0' },
  { left: '69%', size: 18, duration: '15s', delay: '-3s', sway: '52px', opacity: 0.5, fill: '#f9d3dd' },
  { left: '77%', size: 13, duration: '18s', delay: '-12s', sway: '-48px', opacity: 0.4, fill: '#e88da5' },
  { left: '85%', size: 15, duration: '16s', delay: '-7s', sway: '35px', opacity: 0.46, fill: '#f6c2d0' },
  { left: '92%', size: 12, duration: '21s', delay: '-4s', sway: '-38px', opacity: 0.38, fill: '#f2a9be' },
  { left: '97%', size: 14, duration: '19s', delay: '-15s', sway: '-52px', opacity: 0.42, fill: '#f9d3dd' },
];

export default function SakuraBackdrop() {
  const sakuraOn = useSyncExternalStore(
    subscribeSakura,
    isSakuraEnabled,
    getSakuraServerSnapshot
  );

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {/* Subtle traditional Seigaiha wave background texture */}
      <div className="absolute inset-0 jp-seigaiha-pattern opacity-65" />

      {/* Warm Moonlit Crimson & Gold Ambience */}
      <div
        className="absolute -top-28 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-20"
        style={{
          background:
            'radial-gradient(circle, rgba(244,184,200,0.65) 0%, rgba(200,62,55,0.28) 45%, transparent 72%)',
        }}
      />
      <div
        className="absolute -bottom-32 -left-24 w-[380px] h-[380px] rounded-full blur-3xl opacity-15"
        style={{
          background:
            'radial-gradient(circle, rgba(217,181,108,0.55) 0%, rgba(168,85,110,0.2) 50%, transparent 72%)',
        }}
      />

      {/* Delicate corner sakura branch silhouette (top right) */}
      <svg
        viewBox="0 0 320 220"
        className="absolute top-0 right-0 w-64 sm:w-80 opacity-20 text-[#f4b8c8]"
      >
        <path
          d="M320,10 C275,35 235,62 190,74 C155,83 122,74 90,94"
          fill="none"
          stroke="#6b444e"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M238,54 C224,32 208,18 186,12"
          fill="none"
          stroke="#6b444e"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M172,78 C154,96 144,116 128,130"
          fill="none"
          stroke="#6b444e"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        {/* Sakura blossoms on branch */}
        {[
          [265, 36, 12],
          [224, 58, 10],
          [190, 14, 9],
          [165, 76, 13],
          [130, 126, 10],
          [94, 92, 11],
        ].map(([cx, cy, r], i) => (
          <g key={i} transform={`translate(${cx}, ${cy})`}>
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse
                key={deg}
                cx="0"
                cy={-r * 0.65}
                rx={r * 0.42}
                ry={r * 0.68}
                fill="#f4b8c8"
                transform={`rotate(${deg})`}
              />
            ))}
            <circle cx="0" cy="0" r={r * 0.25} fill="#e6c173" />
          </g>
        ))}
      </svg>

      {/* Falling Sakura Petals */}
      {sakuraOn &&
        PETALS.map((p, idx) => (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            width={p.size}
            height={p.size}
            className="sakura-petal"
            style={
              {
                left: p.left,
                animationDuration: p.duration,
                animationDelay: p.delay,
                '--sway-x': p.sway,
                '--petal-opacity': p.opacity,
              } as React.CSSProperties
            }
          >
            {/* Authentic notched cherry blossom petal silhouette */}
            <path
              d="M12 2 C7 4 3 10 5 16 C6.5 20.5 10.2 22 12 22 C13.8 22 17.5 20.5 19 16 C21 10 17 4 12 2 C11.5 5 12.5 5 12 2 Z"
              fill={p.fill}
            />
            <path d="M10.4 3.2 L12 6.4 L13.6 3.2" fill="#120c0f" opacity="0.5" />
          </svg>
        ))}
    </div>
  );
}
