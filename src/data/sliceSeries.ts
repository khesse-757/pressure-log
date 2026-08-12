import type { RangeSelection, Series } from '../utils/types';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** The portion of a series inside the window (endTime - durationMs,
 * endTime]. Pure. */
export function sliceSeriesToWindow(
  series: Series,
  endTime: number,
  durationMs: number
): Series {
  const { timestamps } = series;
  const startIndex = timestamps.findIndex((t) => t > endTime - durationMs);
  let endExclusive = timestamps.findIndex((t) => t > endTime);
  if (endExclusive === -1) endExclusive = timestamps.length;
  if (startIndex === -1 || endExclusive <= startIndex) {
    return {
      bucketMinutes: series.bucketMinutes,
      timestamps: [],
      pressureHpa: [],
    };
  }
  if (startIndex === 0 && endExclusive === timestamps.length) return series;
  return {
    bucketMinutes: series.bucketMinutes,
    timestamps: timestamps.slice(startIndex, endExclusive),
    pressureHpa: series.pressureHpa.slice(startIndex, endExclusive),
  };
}

/** Clamps a window end time so the window stays inside the data:
 * never past the newest reading, and never so early that the window
 * ends before it could hold a full span of data. Pure. */
export function clampWindowEnd(
  series: Series,
  endTime: number,
  durationMs: number
): number {
  const first = series.timestamps[0];
  const last = series.timestamps[series.timestamps.length - 1];
  if (first === undefined || last === undefined) return endTime;
  const earliestEnd = Math.min(first + durationMs, last);
  return Math.min(Math.max(endTime, earliestEnd), last);
}

/** Trailing portion of a series covering the last durationMs,
 * measured back from the latest bucket. Pure. */
function sliceSeriesToLastMs(series: Series, durationMs: number): Series {
  const latest = series.timestamps[series.timestamps.length - 1];
  if (latest === undefined) return series;
  return sliceSeriesToWindow(series, latest, durationMs);
}

/** Overview ranges: trailing days, or the whole dataset. Pure. */
export function sliceSeriesToRange(
  series: Series,
  range: RangeSelection
): Series {
  if (range === 'all') return series;
  return sliceSeriesToLastMs(series, range * MS_PER_DAY);
}

/** Detail ranges: trailing hours. Pure. */
export function sliceSeriesToHours(series: Series, hours: number): Series {
  return sliceSeriesToLastMs(series, hours * MS_PER_HOUR);
}
