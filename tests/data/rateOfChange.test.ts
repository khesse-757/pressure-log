import { describe, expect, it } from 'vitest';
import { rateOfChange } from '@data/rateOfChange';
import type { Series } from '@utils/types';

const HOUR = 3_600_000;

function hourlySeries(pressures: number[]): Series {
  return {
    bucketMinutes: 60,
    timestamps: pressures.map((_, i) => i * HOUR),
    pressureHpa: pressures,
  };
}

describe('rateOfChange', () => {
  it('computes delta and rate over an exactly covered window', () => {
    const series = hourlySeries([1000, 1001, 1002, 1003, 1004, 1005]);
    const result = rateOfChange(series, 3, 5 * HOUR);
    expect(result).not.toBeNull();
    expect(result?.deltaHpa).toBe(3);
    expect(result?.ratePerHourHpa).toBe(1);
    expect(result?.coverageHours).toBe(3);
    expect(result?.fullCoverage).toBe(true);
    expect(result?.startTimestamp).toBe(2 * HOUR);
    expect(result?.endTimestamp).toBe(5 * HOUR);
  });

  it('defaults endTime to the latest reading', () => {
    const series = hourlySeries([1000, 1001, 1002, 1003]);
    const result = rateOfChange(series, 3);
    expect(result?.endTimestamp).toBe(3 * HOUR);
    expect(result?.deltaHpa).toBe(3);
  });

  it('reports partial coverage instead of extrapolating', () => {
    const series = hourlySeries([1000, 1001, 1002]);
    const result = rateOfChange(series, 6, 2 * HOUR);
    expect(result?.deltaHpa).toBe(2);
    expect(result?.coverageHours).toBe(2);
    expect(result?.fullCoverage).toBe(false);
    expect(result?.ratePerHourHpa).toBe(1);
  });

  it('uses the nearest readings across a gap in the data', () => {
    const series: Series = {
      bucketMinutes: 60,
      timestamps: [0, 1 * HOUR, 5 * HOUR, 6 * HOUR],
      pressureHpa: [1000, 1001, 1005, 1006],
    };
    const result = rateOfChange(series, 4, 6 * HOUR);
    expect(result?.startTimestamp).toBe(1 * HOUR);
    expect(result?.deltaHpa).toBe(5);
    expect(result?.coverageHours).toBe(5);
    expect(result?.fullCoverage).toBe(true);
  });

  it('returns null when endTime is before the data starts', () => {
    const series = hourlySeries([1000, 1001, 1002]);
    expect(rateOfChange(series, 3, -10 * HOUR)).toBeNull();
  });

  it('returns null when the window collapses to a single reading', () => {
    const series = hourlySeries([1000, 1001, 1002]);
    expect(rateOfChange(series, 0, 2 * HOUR)).toBeNull();
  });

  it('returns null for a series with fewer than two readings', () => {
    expect(
      rateOfChange({ bucketMinutes: 5, timestamps: [], pressureHpa: [] }, 3, 0)
    ).toBeNull();
    expect(
      rateOfChange(
        { bucketMinutes: 5, timestamps: [0], pressureHpa: [1000] },
        3,
        0
      )
    ).toBeNull();
  });

  it('treats coverage within one bucket of the window as full', () => {
    const series: Series = {
      bucketMinutes: 5,
      timestamps: [0, 2.95 * HOUR],
      pressureHpa: [1000, 1003],
    };
    const result = rateOfChange(series, 3, 2.95 * HOUR);
    expect(result?.fullCoverage).toBe(true);
  });
});
