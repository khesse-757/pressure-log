import { describe, expect, it } from 'vitest';
import {
  RANGES_DAYS,
  RATE_WINDOWS_HOURS,
  RESAMPLE_MINUTES,
  TENDENCY,
} from '@utils/constants';

describe('constants', () => {
  it('defines the resample bucket size', () => {
    expect(RESAMPLE_MINUTES).toBe(5);
  });

  it('defines ascending range and window options', () => {
    expect([...RANGES_DAYS]).toEqual([1, 2, 5, 10]);
    expect([...RATE_WINDOWS_HOURS]).toEqual([1, 3, 6, 12, 24]);
  });

  it('orders tendency thresholds from falling fast to rising fast', () => {
    expect(TENDENCY.FALLING_FAST).toBeLessThan(TENDENCY.FALLING);
    expect(TENDENCY.FALLING).toBeLessThan(TENDENCY.RISING);
    expect(TENDENCY.RISING).toBeLessThan(TENDENCY.RISING_FAST);
  });
});
