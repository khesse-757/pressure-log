import { tendencyForDelta, type Tendency } from './tendency';
import type { Series } from '../utils/types';

const MS_PER_MINUTE = 60_000;

/** Minutes in the 3 hour reference window the TENDENCY thresholds
 * are defined against. */
const MINUTES_PER_3H = 180;

export interface SlopeResult {
  /** Least squares slope in hPa per minute. */
  slopePerMinuteHpa: number;
  ratePerHourHpa: number;
  /** Readings the regression was fit over. */
  points: number;
}

/** First index whose timestamp is strictly greater than target. */
function firstAfter(timestamps: number[], target: number): number {
  let lo = 0;
  let hi = timestamps.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((timestamps[mid] ?? 0) <= target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Least squares regression slope over the trailing window ending at
 * time. A two point difference between adjacent minutes would be
 * mostly sensor noise at this scale; fitting a line over the window
 * is what makes the per-minute number meaningful. Returns null when
 * fewer than 3 readings fall in the window. Pure. */
export function slopeAt(
  series: Series,
  time: number,
  windowMinutes: number
): SlopeResult | null {
  const { timestamps, pressureHpa } = series;
  const windowStart = time - windowMinutes * MS_PER_MINUTE;
  const startIndex = firstAfter(timestamps, windowStart);
  const endIndex = firstAfter(timestamps, time) - 1;
  const points = endIndex - startIndex + 1;
  if (points < 3) return null;

  let sumX = 0;
  let sumY = 0;
  for (let i = startIndex; i <= endIndex; i += 1) {
    sumX += ((timestamps[i] ?? 0) - windowStart) / MS_PER_MINUTE;
    sumY += pressureHpa[i] ?? 0;
  }
  const meanX = sumX / points;
  const meanY = sumY / points;

  let sxx = 0;
  let sxy = 0;
  for (let i = startIndex; i <= endIndex; i += 1) {
    const dx = ((timestamps[i] ?? 0) - windowStart) / MS_PER_MINUTE - meanX;
    sxx += dx * dx;
    sxy += dx * ((pressureHpa[i] ?? 0) - meanY);
  }
  if (sxx === 0) return null;

  const slopePerMinuteHpa = sxy / sxx;
  return {
    slopePerMinuteHpa,
    ratePerHourHpa: slopePerMinuteHpa * 60,
    points,
  };
}

/** Maps a per-minute slope onto the shared tendency labels by
 * normalizing to the 3 hour scale the thresholds are defined on:
 * 3h-equivalent delta = slope in hPa/min * 180. Pure. */
export function slopeTendency(slopePerMinuteHpa: number): Tendency {
  return tendencyForDelta(slopePerMinuteHpa * MINUTES_PER_3H);
}

/** Slope at every point of the series, aligned by index. Computed
 * once per re-bucket so scrubbing stays a lookup. Pure. */
export function computeSlopeSeries(
  series: Series,
  windowMinutes: number
): Array<SlopeResult | null> {
  return series.timestamps.map((time) => slopeAt(series, time, windowMinutes));
}
