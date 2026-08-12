import { describe, expect, it } from 'vitest';
import {
  clampWindowEnd,
  sliceSeriesToHours,
  sliceSeriesToRange,
  sliceSeriesToWindow,
} from '@data/sliceSeries';
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
    // Window is (latest - 1 day, latest]: exactly 24 hourly buckets.
    expect(sliced.timestamps[0]).toBe(95 * HOUR - DAY + HOUR);
    expect(sliced.timestamps[sliced.timestamps.length - 1]).toBe(95 * HOUR);
    expect(sliced.timestamps).toHaveLength(24);
    expect(sliced.pressureHpa).toHaveLength(24);
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

describe('sliceSeriesToHours', () => {
  it('keeps only the trailing hours', () => {
    const series = hourlySeries(48);
    const sliced = sliceSeriesToHours(series, 3);
    expect(sliced.timestamps).toHaveLength(3);
    expect(sliced.timestamps[0]).toBe(45 * HOUR);
    expect(sliced.timestamps[sliced.timestamps.length - 1]).toBe(47 * HOUR);
  });

  it('returns the whole series when hours exceed the data', () => {
    const series = hourlySeries(4);
    expect(sliceSeriesToHours(series, 100).timestamps).toHaveLength(4);
  });
});

describe('sliceSeriesToWindow', () => {
  it('returns the buckets inside a window ending mid-data', () => {
    const series = hourlySeries(48);
    const sliced = sliceSeriesToWindow(series, 10 * HOUR, 3 * HOUR);
    expect(sliced.timestamps).toEqual([8 * HOUR, 9 * HOUR, 10 * HOUR]);
  });

  it('returns an empty series for a window outside the data', () => {
    const series = hourlySeries(48);
    expect(
      sliceSeriesToWindow(series, 100 * HOUR, 3 * HOUR).timestamps
    ).toEqual([]);
  });
});

describe('clampWindowEnd', () => {
  const series = hourlySeries(48);

  it('leaves an in-range end time alone', () => {
    expect(clampWindowEnd(series, 10 * HOUR, 3 * HOUR)).toBe(10 * HOUR);
  });

  it('clamps past the newest reading back to it', () => {
    expect(clampWindowEnd(series, 100 * HOUR, 3 * HOUR)).toBe(47 * HOUR);
  });

  it('clamps early end times so the window can still fill', () => {
    expect(clampWindowEnd(series, 1 * HOUR, 3 * HOUR)).toBe(3 * HOUR);
  });

  it('caps at the newest reading when data is shorter than the window', () => {
    const short = hourlySeries(2);
    expect(clampWindowEnd(short, 0, 6 * HOUR)).toBe(1 * HOUR);
  });

  it('passes end time through for an empty series', () => {
    const empty: Series = { bucketMinutes: 5, timestamps: [], pressureHpa: [] };
    expect(clampWindowEnd(empty, 123, HOUR)).toBe(123);
  });
});
