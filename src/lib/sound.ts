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

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'sine',
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
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

export function playClick() {
  playTone(620, 0.05, 'triangle', 0.08);
}

export function playSuccess() {
  playTone(587.33, 0.11, 'sine', 0.13, 0);
  playTone(880, 0.16, 'sine', 0.14, 0.07);
}

export function playError() {
  playTone(220, 0.16, 'sawtooth', 0.09, 0);
  playTone(175, 0.22, 'sawtooth', 0.08, 0.09);
}

export function playVictory() {
  playTone(523.25, 0.14, 'triangle', 0.15, 0); // C5
  playTone(659.25, 0.14, 'triangle', 0.15, 0.09); // E5
  playTone(783.99, 0.16, 'triangle', 0.15, 0.18); // G5
  playTone(1046.5, 0.34, 'triangle', 0.17, 0.27); // C6
}

export function playDefeat() {
  playTone(392.0, 0.18, 'triangle', 0.12, 0); // G4
  playTone(349.23, 0.18, 'triangle', 0.12, 0.14); // F4
  playTone(293.66, 0.32, 'triangle', 0.12, 0.28); // D4
}

export function playTick() {
  playTone(980, 0.04, 'sine', 0.06);
}
