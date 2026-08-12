import { describe, expect, it } from 'vitest';
import { tendencyForDelta } from '@data/tendency';
import { TENDENCY } from '@utils/constants';

describe('tendencyForDelta', () => {
  it('labels falling fast at and below the threshold', () => {
    expect(tendencyForDelta(TENDENCY.FALLING_FAST)).toBe('falling fast');
    expect(tendencyForDelta(-5)).toBe('falling fast');
  });

  it('labels falling between the falling thresholds', () => {
    expect(tendencyForDelta(-1.99)).toBe('falling');
    expect(tendencyForDelta(TENDENCY.FALLING)).toBe('falling');
  });

  it('labels steady strictly between falling and rising', () => {
    expect(tendencyForDelta(-0.49)).toBe('steady');
    expect(tendencyForDelta(0)).toBe('steady');
    expect(tendencyForDelta(0.49)).toBe('steady');
  });

  it('labels rising between the rising thresholds', () => {
    expect(tendencyForDelta(TENDENCY.RISING)).toBe('rising');
    expect(tendencyForDelta(1.99)).toBe('rising');
  });

  it('labels rising fast at and above the threshold', () => {
    expect(tendencyForDelta(TENDENCY.RISING_FAST)).toBe('rising fast');
    expect(tendencyForDelta(5)).toBe('rising fast');
  });
});
