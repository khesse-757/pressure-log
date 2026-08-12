import { describe, expect, it } from 'vitest';
import {
  formatDayTime,
  formatPressure,
  formatSignedPressure,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '@utils/format';

describe('formatPressure', () => {
  it('shows one decimal for hPa', () => {
    expect(formatPressure(1013.246, 'hPa')).toBe('1013.2 hPa');
  });

  it('shows three decimals for inHg', () => {
    expect(formatPressure(29.92126, 'inHg')).toBe('29.921 inHg');
  });
});

describe('formatSignedPressure', () => {
  it('signs positive and negative values', () => {
    expect(formatSignedPressure(0.85, 'hPa')).toBe('+0.85 hPa');
    expect(formatSignedPressure(-2.1, 'hPa')).toBe('-2.10 hPa');
  });

  it('never shows negative zero', () => {
    expect(formatSignedPressure(-0.001, 'hPa')).toBe('+0.00 hPa');
  });

  it('uses three decimals for inHg', () => {
    expect(formatSignedPressure(0.0251, 'inHg')).toBe('+0.025 inHg');
  });
});

describe('formatDayTime', () => {
  it('formats a short local date and time', () => {
    const timestamp = new Date(2026, 7, 8, 9, 5, 0).getTime();
    expect(formatDayTime(timestamp)).toBe('Aug 8, 9:05');
  });
});

describe('datetime-local values', () => {
  it('round trips a timestamp at minute precision', () => {
    const timestamp = new Date(2026, 7, 8, 9, 5, 0).getTime();
    const value = toDatetimeLocalValue(timestamp);
    expect(value).toBe('2026-08-08T09:05');
    expect(fromDatetimeLocalValue(value)).toBe(timestamp);
  });

  it('rejects malformed values', () => {
    expect(fromDatetimeLocalValue('yesterday')).toBeNull();
    expect(fromDatetimeLocalValue('')).toBeNull();
  });
});
