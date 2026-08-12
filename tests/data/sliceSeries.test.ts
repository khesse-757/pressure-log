import { describe, expect, it } from 'vitest';
import { sliceSeriesToRange } from '@data/sliceSeries';
import type { Series } from '@utils/types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function hourlySeries(hours: number): Series {
  return {
    bucketMinutes: 60,
    timestamps: Array.from({ length: hours }, (_, i) => i * HOUR),
    pressureHpa: Array.from({ length: hours }, (_, i) => 1000 + i),
  };
}

describe('sliceSeriesToRange', () => {
  it('returns the whole series for all', () => {
    const series = hourlySeries(96);
    expect(sliceSeriesToRange(series, 'all')).toBe(series);
  });

  it('keeps only the trailing day for a 1 day range', () => {
    const series = hourlySeries(96);
    const sliced = sliceSeriesToRange(series, 1);
    expect(sliced.timestamps[0]).toBe(95 * HOUR - DAY);
    expect(sliced.timestamps[sliced.timestamps.length - 1]).toBe(95 * HOUR);
    expect(sliced.timestamps).toHaveLength(25);
    expect(sliced.pressureHpa).toHaveLength(25);
  });

  it('returns the whole series when the range exceeds the data', () => {
    const series = hourlySeries(48);
    const sliced = sliceSeriesToRange(series, 10);
    expect(sliced.timestamps).toHaveLength(48);
  });

  it('handles an empty series', () => {
    const series: Series = {
      bucketMinutes: 5,
      timestamps: [],
      pressureHpa: [],
    };
    expect(sliceSeriesToRange(series, 2).timestamps).toEqual([]);
  });
});
