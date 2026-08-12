import { rateOfChange } from './rateOfChange';
import { tendencyForDelta, type Tendency } from './tendency';
import type { Note, RateOfChange, Series } from '../utils/types';

export const SNAPSHOT_WINDOWS_HOURS = [1, 3, 6] as const;

export interface SnapshotDelta {
  windowHours: number;
  /** Null when the data does not fully cover the window. */
  rate: RateOfChange | null;
}

export interface SnapshotModel {
  latestTimestamp: number;
  pressureHpa: number;
  /** Null when the data does not cover the 3h window. */
  tendency: Tendency | null;
  deltas: SnapshotDelta[];
  /** Most recent note no older than the visible range, or null. */
  note: Note | null;
}

/** Everything the snapshot card shows, computed from the full series
 * (stats end at the newest reading) and the visible range (note
 * lookup). Pure. */
export function buildSnapshotModel(
  series: Series,
  visible: Series,
  notes: Note[]
): SnapshotModel | null {
  const latestTimestamp = series.timestamps[series.timestamps.length - 1];
  const pressureHpa = series.pressureHpa[series.pressureHpa.length - 1];
  if (latestTimestamp === undefined || pressureHpa === undefined) return null;

  const rate3 = rateOfChange(series, 3);
  const tendency =
    rate3 !== null && rate3.fullCoverage
      ? tendencyForDelta(rate3.ratePerHourHpa * 3)
      : null;

  const deltas = SNAPSHOT_WINDOWS_HOURS.map((windowHours): SnapshotDelta => {
    const rate = rateOfChange(series, windowHours);
    return {
      windowHours,
      rate: rate !== null && rate.fullCoverage ? rate : null,
    };
  });

  const rangeStart = visible.timestamps[0] ?? null;
  let note: Note | null = null;
  for (const candidate of notes) {
    if (rangeStart !== null && candidate.timestamp < rangeStart) continue;
    if (note === null || candidate.timestamp > note.timestamp) note = candidate;
  }

  return { latestTimestamp, pressureHpa, tendency, deltas, note };
}
