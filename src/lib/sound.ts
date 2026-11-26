'use client';

const SOUND_KEY = 'brain_sfx_enabled_v1';
export const SOUND_CHANGE_EVENT = 'brain-sound-change';

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return null;
  if (!sharedCtx) {
    sharedCtx = new AudioCtx();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume();
  }
  return sharedCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = window.localStorage.getItem(SOUND_KEY);
  return saved === null ? true : saved === 'true';
}

export function getSoundServerSnapshot(): boolean {
  return true;
}

export function subscribeSound(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SOUND_CHANGE_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SOUND_CHANGE_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_KEY, String(enabled));
  window.dispatchEvent(new Event(SOUND_CHANGE_EVENT));
}

export function toggleSound(): boolean {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  if (next) playClick();
  return next;
}

/** Synthesizes plucked Koto / Furin wind-chime tones using Web Audio API */
function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'triangle',
  volume = 0.14,
  delaySec = 0
) {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.001, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0006, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

/** Crisp wooden Hyoshigi / Koto pluck */
export function playClick() {
  playTone(587.33, 0.06, 'triangle', 0.08); // D5
}

/** Ascending Japanese Yo pentatonic chime (D5 -> A5) */
export function playSuccess() {
  playTone(587.33, 0.14, 'triangle', 0.12, 0); // D5
  playTone(880.0, 0.22, 'sine', 0.13, 0.065); // A5
}

/** Low muted Taiko / Shakuhachi error tone */
export function playError() {
  playTone(220.0, 0.16, 'sawtooth', 0.07, 0);
  playTone(196.0, 0.22, 'triangle', 0.09, 0.08);
}

/** Celebratory Japanese Yo Pentatonic Koto arpeggio (D5 -> E5 -> G5 -> A5 -> D6) */
export function playVictory() {
  playTone(587.33, 0.22, 'triangle', 0.14, 0); // D5
  playTone(659.25, 0.22, 'triangle', 0.14, 0.075); // E5
  playTone(783.99, 0.24, 'triangle', 0.14, 0.15); // G5
  playTone(880.0, 0.26, 'triangle', 0.15, 0.225); // A5
  playTone(1174.66, 0.45, 'sine', 0.16, 0.31); // D6
}

/** Gentle Miyako-bushi descending cadence (A4 -> F4 -> E4 -> D4) */
export function playDefeat() {
  playTone(440.0, 0.2, 'triangle', 0.11, 0); // A4
  playTone(349.23, 0.22, 'triangle', 0.11, 0.13); // F4
  playTone(329.63, 0.34, 'sine', 0.11, 0.26); // E4
}

export function playTick() {
  playTone(1046.5, 0.045, 'sine', 0.05);
}
