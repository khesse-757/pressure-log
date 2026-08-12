import { describe, expect, it } from 'vitest';
import { findRateEvents } from '@data/events';
import type { SlopeResult } from '@data/slope';
import type { Series } from '@utils/types';

const MINUTE = 60_000;

function minuteSeries(n: number): Series {
  return {
    bucketMinutes: 1,
    timestamps: Array.from({ length: n }, (_, i) => i * MINUTE),
    pressureHpa: Array.from({ length: n }, () => 1000),
  };
}

function slope(value: number): SlopeResult {
  return { slopePerMinuteHpa: value, ratePerHourHpa: value * 60, points: 5 };
}

function quietSlopes(n: number): Array<SlopeResult | null> {
  const slopes: Array<SlopeResult | null> = Array.from({ length: n }, () =>
    slope(0.001)
  );
  slopes[0] = null;
  slopes[1] = null;
  return slopes;
}

function fill(
  slopes: Array<SlopeResult | null>,
  from: number,
  to: number,
  value: number
): void {
  for (let i = from; i <= to; i += 1) slopes[i] = slope(value);
}

describe('findRateEvents', () => {
  it('finds two separated fast falls and one rise as three events', () => {
    const series = minuteSeries(700);
    const slopes = quietSlopes(700);
    fill(slopes, 100, 119, -0.02);
    slopes[110] = slope(-0.03);
    fill(slopes, 400, 429, -0.025);
    slopes[415] = slope(-0.04);
    fill(slopes, 600, 609, 0.02);
    slopes[605] = slope(0.03);

    const events = findRateEvents(series, slopes, 2.0, 90);
    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({
      time: 110 * MINUTE,
      peakSlopePerMinuteHpa: -0.03,
      peakRatePerHourHpa: -0.03 * 60,
      direction: 'fall',
      durationMinutes: 20,
    });
    expect(events[1]?.time).toBe(415 * MINUTE);
    expect(events[1]?.direction).toBe('fall');
    expect(events[1]?.durationMinutes).toBe(30);
    expect(events[2]?.time).toBe(605 * MINUTE);
    expect(events[2]?.direction).toBe('rise');
    expect(events[2]?.durationMinutes).toBe(10);
  });

  it('reports one event for a long single fall, not many', () => {
    const series = minuteSeries(400);
    const slopes = quietSlopes(400);
    fill(slopes, 100, 179, -0.02);
    slopes[140] = slope(-0.05);

    const events = findRateEvents(series, slopes, 2.0, 90);
    expect(events).toHaveLength(1);
    expect(events[0]?.time).toBe(140 * MINUTE);
    expect(events[0]?.durationMinutes).toBe(80);
  });

  it('clusters a fall interrupted by a brief lull into one event', () => {
    const series = minuteSeries(400);
    const slopes = quietSlopes(400);
    fill(slopes, 200, 229, -0.02);
    slopes[215] = slope(-0.03);
    fill(slopes, 240, 269, -0.02);
    slopes[250] = slope(-0.025);

    const events = findRateEvents(series, slopes, 2.0, 90);
    expect(events).toHaveLength(1);
    expect(events[0]?.time).toBe(215 * MINUTE);
  });

  it('returns no events for a quiet series', () => {
    const series = minuteSeries(500);
    expect(findRateEvents(series, quietSlopes(500))).toEqual([]);
  });
});
