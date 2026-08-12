import { describe, expect, it } from 'vitest';
import { seriesStats } from '@data/seriesStats';
import type { Series } from '@utils/types';

describe('seriesStats', () => {
  it('computes min, max, average, and latest', () => {
    const series: Series = {
      bucketMinutes: 5,
      timestamps: [0, 300_000, 600_000],
      pressureHpa: [1010, 1014, 1012],
    };
    const stats = seriesStats(series);
    expect(stats).toEqual({
      min: 1010,
      max: 1014,
      average: 1012,
      latest: 1012,
      latestTimestamp: 600_000,
    });
  });

  it('handles a single point', () => {
    const series: Series = {
      bucketMinutes: 5,
      timestamps: [0],
      pressureHpa: [1013.25],
    };
    const stats = seriesStats(series);
    expect(stats?.min).toBe(1013.25);
    expect(stats?.max).toBe(1013.25);
    expect(stats?.latest).toBe(1013.25);
  });

  it('returns null for an empty series', () => {
    const series: Series = {
      bucketMinutes: 5,
      timestamps: [],
      pressureHpa: [],
    };
    expect(seriesStats(series)).toBeNull();
  });
});
