import { describe, expect, it } from 'vitest';
import { noteContext, seriesCoversTimestamp } from '@data/noteContext';
import type { Series } from '@utils/types';

const HOUR = 3_600_000;

function hourlySeries(pressures: number[]): Series {
  return {
    bucketMinutes: 60,
    timestamps: pressures.map((_, i) => i * HOUR),
    pressureHpa: pressures,
  };
}

describe('noteContext', () => {
  it('returns pressure and tendency when the data covers 3h', () => {
    const series = hourlySeries([1000, 1001, 1002, 1003, 1004]);
    const context = noteContext(series, 4 * HOUR);
    expect(context?.pressureHpa).toBe(1004);
    expect(context?.tendency).toBe('rising fast');
  });

  it('returns pressure with null tendency when 3h is not covered', () => {
    const series = hourlySeries([1000, 1001]);
    const context = noteContext(series, 1 * HOUR);
    expect(context?.pressureHpa).toBe(1001);
    expect(context?.tendency).toBeNull();
  });

  it('snaps to the nearest bucket', () => {
    const series = hourlySeries([1000, 1001, 1002, 1003, 1004]);
    const context = noteContext(series, 3 * HOUR + 20 * 60_000);
    expect(context?.pressureHpa).toBe(1003);
  });

  it('returns null before the data starts', () => {
    const series = hourlySeries([1000, 1001, 1002]);
    expect(noteContext(series, -5 * HOUR)).toBeNull();
  });

  it('returns null after the data ends', () => {
    const series = hourlySeries([1000, 1001, 1002]);
    expect(noteContext(series, 10 * HOUR)).toBeNull();
  });

  it('returns null for an empty series', () => {
    const series: Series = {
      bucketMinutes: 5,
      timestamps: [],
      pressureHpa: [],
    };
    expect(noteContext(series, 0)).toBeNull();
  });
});

describe('seriesCoversTimestamp', () => {
  const series = hourlySeries([1000, 1001, 1002, 1003]);

  it('covers a timestamp exactly at the newest reading', () => {
    // Regression: a note at the end of the span must show a marker.
    expect(seriesCoversTimestamp(series, 3 * HOUR)).toBe(true);
  });

  it('covers timestamps at the exact span edges', () => {
    expect(seriesCoversTimestamp(series, 0)).toBe(true);
  });

  it('allows one bucket of slack past each end', () => {
    expect(seriesCoversTimestamp(series, 4 * HOUR)).toBe(true);
    expect(seriesCoversTimestamp(series, -1 * HOUR)).toBe(true);
  });

  it('rejects timestamps beyond the slack', () => {
    expect(seriesCoversTimestamp(series, 4 * HOUR + 1)).toBe(false);
    expect(seriesCoversTimestamp(series, -1 * HOUR - 1)).toBe(false);
  });

  it('rejects everything for an empty series', () => {
    const empty: Series = { bucketMinutes: 5, timestamps: [], pressureHpa: [] };
    expect(seriesCoversTimestamp(empty, 0)).toBe(false);
  });
});
