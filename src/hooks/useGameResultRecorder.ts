'use client';

import { useEffect, useRef } from 'react';
import { playVictory, playDefeat } from '@/lib/sound';
import { recordGameSession } from '@/lib/stats';

export interface GameResultPayload {
  gameId: string;
  won: boolean;
  accuracy: number;
  scoreLabel: string;
  durationSec?: number;
}

/**
 * Automatically plays Victory/Defeat SFX and persists session history/records
 * exactly once per transition into the RESULT phase.
 */
export function useGameResultRecorder(isResultPhase: boolean, payload: GameResultPayload) {
  const recordedRef = useRef(false);
  const { gameId, won, accuracy, scoreLabel, durationSec } = payload;

  useEffect(() => {
    if (!isResultPhase) {
      recordedRef.current = false;
      return;
    }
    if (recordedRef.current) return;
    recordedRef.current = true;

    if (won) playVictory();
    else playDefeat();

    recordGameSession({ gameId, won, accuracy, scoreLabel, durationSec });
  }, [isResultPhase, gameId, won, accuracy, scoreLabel, durationSec]);
}
