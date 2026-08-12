import { describe, expect, it } from 'vitest';
import { resample } from '@data/resample';
import type { RawReading } from '@utils/types';

const MINUTE = 60_000;

function reading(timestamp: number, pressureHpa: number): RawReading {
  return { timestamp, pressureHpa };
}

describe('resample', () => {
  it('defaults to 5 minute buckets', () => {
    const series = resample([reading(0, 1000)]);
    expect(series.bucketMinutes).toBe(5);
  });

  it('averages readings within a bucket', () => {
    const series = resample(
      [reading(0, 1000), reading(MINUTE, 1002), reading(2 * MINUTE, 1004)],
      5
    );
    expect(series.timestamps).toEqual([0]);
    expect(series.pressureHpa).toEqual([1002]);
  });

  it('assigns a reading on a bucket boundary to the later bucket', () => {
    const series = resample(
      [reading(5 * MINUTE - 1, 1000), reading(5 * MINUTE, 1010)],
      5
    );
    expect(series.timestamps).toEqual([0, 5 * MINUTE]);
    expect(series.pressureHpa).toEqual([1000, 1010]);
  });

  it('handles uneven sampling across buckets', () => {
    const series = resample(
      [
        reading(0, 1000),
        reading(MINUTE, 1001),
        reading(4 * MINUTE, 1002),
        reading(11 * MINUTE, 1006),
      ],
      5
    );
    expect(series.timestamps).toEqual([0, 10 * MINUTE]);
    expect(series.pressureHpa).toEqual([1001, 1006]);
  });

  it('handles a single reading', () => {
    const series = resample([reading(7 * MINUTE, 1013.25)], 5);
    expect(series.timestamps).toEqual([5 * MINUTE]);
    expect(series.pressureHpa).toEqual([1013.25]);
  });

  it('returns an empty series for no readings', () => {
    const series = resample([], 5);
    expect(series.timestamps).toEqual([]);
    expect(series.pressureHpa).toEqual([]);
  });

  it('orders output by time regardless of input order', () => {
    const series = resample(
      [
        reading(20 * MINUTE, 1002),
        reading(0, 1000),
        reading(10 * MINUTE, 1001),
      ],
      5
    );
    expect(series.timestamps).toEqual([0, 10 * MINUTE, 20 * MINUTE]);
    expect(series.pressureHpa).toEqual([1000, 1001, 1002]);
  });
});
