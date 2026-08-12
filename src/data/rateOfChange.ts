import type { RateOfChange, Series } from '../utils/types';

const MS_PER_HOUR = 3_600_000;

/** Index of the timestamp nearest to target. Ties go to the earlier
 * reading. Assumes timestamps are sorted ascending and non-empty.
 * Exported for the chart cursor, which snaps to the same points. */
export function nearestIndex(timestamps: number[], target: number): number {
  let lo = 0;
  let hi = timestamps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((timestamps[mid] ?? 0) < target) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  if (lo > 0) {
    const previous = timestamps[lo - 1] ?? 0;
    const current = timestamps[lo] ?? 0;
    if (target - previous <= current - target) return lo - 1;
  }
  return lo;
}

/** Pressure change over a trailing window ending at endTime. Uses the
 * readings nearest the window edges and reports the span actually
 * covered instead of extrapolating. Returns null when the series has
 * no two distinct readings to compare, for example when endTime falls
 * before the data starts. Pure and synchronous. */
export function rateOfChange(
  series: Series,
  windowHours: number,
  endTime: number = series.timestamps[series.timestamps.length - 1] ?? 0
): RateOfChange | null {
  const { timestamps, pressureHpa } = series;
  if (timestamps.length < 2) return null;

  const endIndex = nearestIndex(timestamps, endTime);
  const startIndex = nearestIndex(
    timestamps,
    endTime - windowHours * MS_PER_HOUR
  );
  if (startIndex === endIndex) return null;

  const startTimestamp = timestamps[startIndex] ?? 0;
  const endTimestamp = timestamps[endIndex] ?? 0;
  const startValue = pressureHpa[startIndex] ?? 0;
  const endValue = pressureHpa[endIndex] ?? 0;

  const deltaHpa = endValue - startValue;
  const coverageHours = (endTimestamp - startTimestamp) / MS_PER_HOUR;
  const toleranceHours = series.bucketMinutes / 60;

  return {
    windowHours,
    endTime,
    startTimestamp,
    endTimestamp,
    deltaHpa,
    ratePerHourHpa: deltaHpa / coverageHours,
    coverageHours,
    fullCoverage: coverageHours >= windowHours - toleranceHours,
  };
}
