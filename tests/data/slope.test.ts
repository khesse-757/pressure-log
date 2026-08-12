import { describe, expect, it } from 'vitest';
import { computeSlopeSeries, slopeAt, slopeTendency } from '@data/slope';
import type { Series } from '@utils/types';

const MINUTE = 60_000;

function minuteSeries(pressures: number[]): Series {
  return {
    bucketMinutes: 1,
    timestamps: pressures.map((_, i) => i * MINUTE),
    pressureHpa: pressures,
  };
}

describe('slopeAt', () => {
  it('recovers an exact slope from linear data', () => {
    const series = minuteSeries(
      Array.from({ length: 10 }, (_, i) => 1000 + 0.1 * i)
    );
    const result = slopeAt(series, 9 * MINUTE, 5);
    expect(result?.points).toBe(5);
    expect(result?.slopePerMinuteHpa).toBeCloseTo(0.1, 10);
    expect(result?.ratePerHourHpa).toBeCloseTo(6, 10);
  });

  it('recovers the underlying slope from noisy data within tolerance', () => {
    const slope = 0.05;
    const pressures = Array.from({ length: 20 }, (_, i) => {
      const noise = i % 2 === 0 ? 0.03 : -0.03;
      return 1000 + slope * i + noise;
    });
    const series = minuteSeries(pressures);
    const result = slopeAt(series, 19 * MINUTE, 10);
    expect(result?.points).toBe(10);
    expect(Math.abs((result?.slopePerMinuteHpa ?? 0) - slope)).toBeLessThan(
      0.02
    );
  });

  it('returns null with fewer than 3 points in the window', () => {
    const series = minuteSeries([1000, 1001]);
    expect(slopeAt(series, 1 * MINUTE, 5)).toBeNull();
    expect(
      slopeAt({ bucketMinutes: 1, timestamps: [], pressureHpa: [] }, 0, 5)
    ).toBeNull();
  });

  it('returns null when a gap leaves too few points in the window', () => {
    const series: Series = {
      bucketMinutes: 1,
      timestamps: [0, 1 * MINUTE, 2 * MINUTE, 3 * MINUTE, 10 * MINUTE],
      pressureHpa: [1000, 1000.1, 1000.2, 1000.3, 1001],
    };
    expect(slopeAt(series, 10 * MINUTE, 5)).toBeNull();
  });

  it('fits across uneven spacing inside the window', () => {
    const series: Series = {
      bucketMinutes: 1,
      timestamps: [6 * MINUTE, 8 * MINUTE, 10 * MINUTE],
      pressureHpa: [1001.2, 1001.6, 1002.0],
    };
    const result = slopeAt(series, 10 * MINUTE, 5);
    expect(result?.points).toBe(3);
    expect(result?.slopePerMinuteHpa).toBeCloseTo(0.2, 10);
  });
});

describe('slopeTendency', () => {
  it('normalizes hPa per minute to a 3h-equivalent delta times 180', () => {
    // 0.02 hPa/min * 180 = 3.6 hPa per 3h, past the fast threshold
    expect(slopeTendency(0.02)).toBe('rising fast');
    // -0.01 * 180 = -1.8, between falling and falling fast
    expect(slopeTendency(-0.01)).toBe('falling');
    // 0.001 * 180 = 0.18, inside the steady band
    expect(slopeTendency(0.001)).toBe('steady');
    expect(slopeTendency(-0.02)).toBe('falling fast');
    expect(slopeTendency(0.005)).toBe('rising');
  });
});

describe('computeSlopeSeries', () => {
  it('aligns results by index and nulls the warm-up points', () => {
    const series = minuteSeries(
      Array.from({ length: 10 }, (_, i) => 1000 + 0.1 * i)
    );
    const slopes = computeSlopeSeries(series, 5);
    expect(slopes).toHaveLength(10);
    expect(slopes[0]).toBeNull();
    expect(slopes[1]).toBeNull();
    expect(slopes[2]?.points).toBe(3);
    expect(slopes[9]?.slopePerMinuteHpa).toBeCloseTo(0.1, 10);
  });
});
