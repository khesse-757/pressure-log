import { describe, expect, it } from 'vitest';
import { hpaToInHg, inHgToHpa } from '@data/units';

describe('units', () => {
  it('converts standard pressure to inHg', () => {
    expect(hpaToInHg(1013.25)).toBeCloseTo(29.9213, 3);
  });

  it('converts inHg back to hPa', () => {
    expect(inHgToHpa(29.9213)).toBeCloseTo(1013.25, 2);
  });

  it('round trips hPa to inHg to hPa within tolerance', () => {
    for (const hpa of [950, 980, 1013.25, 1040]) {
      expect(inHgToHpa(hpaToInHg(hpa))).toBeCloseTo(hpa, 10);
    }
  });
});
