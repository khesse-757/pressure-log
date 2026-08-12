import { RESAMPLE_MINUTES } from '../utils/constants';
import type { RawReading, Series } from '../utils/types';

/** Buckets raw readings into fixed intervals with mean aggregation.
 * Bucket timestamps are the bucket start. Input order does not
 * matter; output is time-ordered. Pure and synchronous. */
export function resample(
  readings: RawReading[],
  bucketMinutes: number = RESAMPLE_MINUTES
): Series {
  const bucketMs = bucketMinutes * 60_000;
  const buckets = new Map<number, { sum: number; count: number }>();

  for (const reading of readings) {
    const start = Math.floor(reading.timestamp / bucketMs) * bucketMs;
    const bucket = buckets.get(start);
    if (bucket === undefined) {
      buckets.set(start, { sum: reading.pressureHpa, count: 1 });
    } else {
      bucket.sum += reading.pressureHpa;
      bucket.count += 1;
    }
  }

  const timestamps = [...buckets.keys()].sort((a, b) => a - b);
  const pressureHpa = timestamps.map((start) => {
    const bucket = buckets.get(start);
    return bucket === undefined ? NaN : bucket.sum / bucket.count;
  });

  return { bucketMinutes, timestamps, pressureHpa };
}
