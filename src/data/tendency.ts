import { TENDENCY } from '../utils/constants';

export type Tendency =
  'falling fast' | 'falling' | 'steady' | 'rising' | 'rising fast';

/** Maps a 3h pressure delta in hPa to a plain language tendency
 * label. Thresholds are inclusive at the boundary values. */
export function tendencyForDelta(deltaHpaPer3h: number): Tendency {
  if (deltaHpaPer3h <= TENDENCY.FALLING_FAST) return 'falling fast';
  if (deltaHpaPer3h <= TENDENCY.FALLING) return 'falling';
  if (deltaHpaPer3h >= TENDENCY.RISING_FAST) return 'rising fast';
  if (deltaHpaPer3h >= TENDENCY.RISING) return 'rising';
  return 'steady';
}
