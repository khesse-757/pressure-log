export const RESAMPLE_MINUTES = 5;

export const RANGES_DAYS = [1, 2, 5, 10] as const; // plus "All"

export const RATE_WINDOWS_HOURS = [1, 3, 6, 12, 24] as const;

// Tendency thresholds in hPa per 3 hours
export const TENDENCY = {
  FALLING_FAST: -2.0,
  FALLING: -0.5,
  RISING: 0.5,
  RISING_FAST: 2.0,
};
