import type { SlopeResult } from './slope';
import { EVENT_MIN_GAP_MINUTES, TENDENCY } from '../utils/constants';
import type { Series } from '../utils/types';

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_3H = 180;

export interface RateEvent {
  /** Timestamp of the peak slope inside the event. */
  time: number;
  peakSlopePerMinuteHpa: number;
  peakRatePerHourHpa: number;
  direction: 'fall' | 'rise';
  /** How long the slope stayed above the threshold. */
  durationMinutes: number;
}

interface Run {
  direction: 'fall' | 'rise';
  startTs: number;
  endTs: number;
  peakSlope: number;
  peakTs: number;
}

/** Scans a precomputed slope series for the moments of most rapid
 * movement: runs of consecutive minutes whose 3h-equivalent magnitude
 * meets the fast threshold. Each run becomes one candidate at its
 * peak; candidates closer together than minGapMinutes are clustered
 * by keeping the strongest, so one sustained fall reports one event.
 * Returned in time order. Pure. */
export function findRateEvents(
  series: Series,
  slopes: Array<SlopeResult | null>,
  thresholdHpaPer3h: number = TENDENCY.RISING_FAST,
  minGapMinutes: number = EVENT_MIN_GAP_MINUTES
): RateEvent[] {
  const thresholdPerMinute = thresholdHpaPer3h / MINUTES_PER_3H;
  const { timestamps, bucketMinutes } = series;
  const maxStepMs = bucketMinutes * MS_PER_MINUTE * 2;

  const candidates: RateEvent[] = [];
  let run: Run | null = null;

  const flush = (): void => {
    if (run === null) return;
    candidates.push({
      time: run.peakTs,
      peakSlopePerMinuteHpa: run.peakSlope,
      peakRatePerHourHpa: run.peakSlope * 60,
      direction: run.direction,
      durationMinutes:
        (run.endTs - run.startTs) / MS_PER_MINUTE + bucketMinutes,
    });
    run = null;
  };

  for (let i = 0; i < timestamps.length; i += 1) {
    const ts = timestamps[i];
    const value = slopes[i]?.slopePerMinuteHpa;
    if (ts === undefined || value === undefined) {
      flush();
      continue;
    }
    if (Math.abs(value) < thresholdPerMinute) {
      flush();
      continue;
    }
    const direction: 'fall' | 'rise' = value < 0 ? 'fall' : 'rise';
    if (
      run !== null &&
      (run.direction !== direction || ts - run.endTs > maxStepMs)
    ) {
      flush();
    }
    if (run === null) {
      run = { direction, startTs: ts, endTs: ts, peakSlope: value, peakTs: ts };
    } else {
      run.endTs = ts;
      if (Math.abs(value) > Math.abs(run.peakSlope)) {
        run.peakSlope = value;
        run.peakTs = ts;
      }
    }
  }
  flush();

  // Non-maximum suppression: strongest peaks win inside the gap.
  const minGapMs = minGapMinutes * MS_PER_MINUTE;
  const byMagnitude = [...candidates].sort(
    (a, b) =>
      Math.abs(b.peakSlopePerMinuteHpa) - Math.abs(a.peakSlopePerMinuteHpa)
  );
  const kept: RateEvent[] = [];
  for (const candidate of byMagnitude) {
    if (kept.every((k) => Math.abs(k.time - candidate.time) >= minGapMs)) {
      kept.push(candidate);
    }
  }
  return kept.sort((a, b) => a.time - b.time);
}
