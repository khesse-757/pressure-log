import type { RangeSelection, Series } from '../utils/types';

const MS_PER_DAY = 86_400_000;

/** Returns the trailing portion of a series covering the selected
 * range, measured back from the latest bucket. Pure. */
export function sliceSeriesToRange(
  series: Series,
  range: RangeSelection
): Series {
  if (range === 'all') return series;
  const latest = series.timestamps[series.timestamps.length - 1];
  if (latest === undefined) return series;
  const from = latest - range * MS_PER_DAY;
  const startIndex = series.timestamps.findIndex((t) => t >= from);
  if (startIndex <= 0) return series;
  return {
    bucketMinutes: series.bucketMinutes,
    timestamps: series.timestamps.slice(startIndex),
    pressureHpa: series.pressureHpa.slice(startIndex),
  };
}
