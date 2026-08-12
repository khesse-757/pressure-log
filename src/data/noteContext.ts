import { nearestIndex, rateOfChange } from './rateOfChange';
import { tendencyForDelta, type Tendency } from './tendency';
import type { Series } from '../utils/types';

export interface NoteContext {
  pressureHpa: number;
  /** Null when the data does not fully cover the 3h window. */
  tendency: Tendency | null;
}

/** True when the series covers the timestamp, allowing one bucket of
 * slack at each end. This is the single visibility rule for note
 * context lines and chart note markers. Pure. */
export function seriesCoversTimestamp(
  series: Series,
  timestamp: number
): boolean {
  const first = series.timestamps[0];
  const last = series.timestamps[series.timestamps.length - 1];
  if (first === undefined || last === undefined) return false;
  const tolerance = series.bucketMinutes * 60_000;
  return timestamp >= first - tolerance && timestamp <= last + tolerance;
}

/** Pressure and 3h tendency at a moment, or null when the series does
 * not cover it (beyond one bucket outside the data). Pure. */
export function noteContext(
  series: Series,
  timestamp: number
): NoteContext | null {
  const { timestamps, pressureHpa } = series;
  if (!seriesCoversTimestamp(series, timestamp)) return null;
  const pressure = pressureHpa[nearestIndex(timestamps, timestamp)];
  if (pressure === undefined) return null;
  const rate = rateOfChange(series, 3, timestamp);
  const tendency =
    rate !== null && rate.fullCoverage
      ? tendencyForDelta(rate.ratePerHourHpa * 3)
      : null;
  return { pressureHpa: pressure, tendency };
}
