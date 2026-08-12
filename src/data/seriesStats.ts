import type { Series } from '../utils/types';

export interface SeriesStats {
  min: number;
  max: number;
  average: number;
  latest: number;
  latestTimestamp: number;
}

/** Min, max, mean, and latest pressure for a series, in hPa.
 * Returns null for an empty series. Pure. */
export function seriesStats(series: Series): SeriesStats | null {
  const values = series.pressureHpa;
  if (values.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
    sum += value;
  }
  return {
    min,
    max,
    average: sum / values.length,
    latest: values[values.length - 1] ?? 0,
    latestTimestamp: series.timestamps[series.timestamps.length - 1] ?? 0,
  };
}
