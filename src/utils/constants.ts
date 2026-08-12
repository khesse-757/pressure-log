export const RESAMPLE_MINUTES = 5;

// Detail mode: 1 minute buckets, each rate fit over a 5 minute window
export const GRANULAR_RESAMPLE_MINUTES = 1;
export const SLOPE_WINDOW_MINUTES = 5;
export const DETAIL_RANGES_MINUTES = [5, 30, 60, 180, 360] as const;

// Rapid movement events closer together than this merge into one
export const EVENT_MIN_GAP_MINUTES = 90;

export const RANGES_DAYS = [1, 2, 5, 10] as const; // plus "All"

export const RATE_WINDOWS_HOURS = [1, 3, 6, 12, 24] as const;

// Tendency thresholds in hPa per 3 hours
export const TENDENCY = {
  FALLING_FAST: -2.0,
  FALLING: -0.5,
  RISING: 0.5,
  RISING_FAST: 2.0,
};
