/** One row of a RuuviTag export. Timestamps are ms since epoch,
 * parsed as local time because the export carries no zone. Only
 * timestamp and pressure are guaranteed; the rest are parsed
 * opportunistically for future features. */
export interface RawReading {
  timestamp: number;
  pressureHpa: number;
  temperatureC?: number;
  humidityPct?: number;
  dewPointC?: number;
  movements?: number;
  batteryV?: number;
  rssi?: number;
  measSeq?: number;
}

export interface SkippedLine {
  line: number;
  reason: string;
}

export interface ParseResult {
  readings: RawReading[];
  skipped: SkippedLine[];
}

/** Resampled, time-ordered pressure data. Parallel arrays sized for
 * uPlot. This type is the API boundary for the phase 2 live collector. */
export interface Series {
  bucketMinutes: number;
  timestamps: number[];
  pressureHpa: number[];
}

export interface RateOfChange {
  windowHours: number;
  endTime: number;
  startTimestamp: number;
  endTimestamp: number;
  deltaHpa: number;
  ratePerHourHpa: number;
  /** Hours actually spanned by the readings used. */
  coverageHours: number;
  /** True when the data covers the requested window to within one
   * resample bucket. When false the numbers describe a shorter span
   * and must not be extrapolated. */
  fullCoverage: boolean;
}

/** A personal note pinned to a moment in time. */
export interface Note {
  id: string;
  timestamp: number;
  text: string;
  /** Optional 1 to 5 feeling rating. */
  feeling?: number;
  createdAt: number;
}

export type PressureUnit = 'hPa' | 'inHg';

/** Chart range: trailing days, or the whole dataset. */
export type RangeSelection = number | 'all';

/** Overview is the 5 minute chart; detail is the 1 minute chart with
 * the per-minute slope strip. */
export type ChartMode = 'normal' | 'detail';

export type ParseWorkerRequest = { type: 'parse'; text: string };

export type ParseWorkerResponse =
  | { type: 'progress'; fraction: number }
  | { type: 'done'; result: ParseResult }
  | { type: 'error'; message: string };
