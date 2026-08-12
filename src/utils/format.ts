import type { PressureUnit } from './types';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Formats a pressure value already converted to the given unit. */
export function formatPressure(value: number, unit: PressureUnit): string {
  return `${value.toFixed(unit === 'hPa' ? 1 : 3)} ${unit}`;
}

/** Signed number with fixed decimals and no unit, like "+0.012". The
 * sign is computed after rounding so tiny negatives do not show as
 * "-0.000". */
export function formatSignedFixed(value: number, decimals: number): string {
  const rounded = Number(value.toFixed(decimals));
  const sign = rounded >= 0 ? '+' : '';
  return `${sign}${rounded.toFixed(decimals)}`;
}

/** Signed pressure delta or rate, like "+0.85 hPa". */
export function formatSignedPressure(
  value: number,
  unit: PressureUnit
): string {
  return `${formatSignedFixed(value, unit === 'hPa' ? 2 : 3)} ${unit}`;
}

/** Short local date and time, like "Aug 8, 11:51". */
export function formatDayTime(timestamp: number): string {
  const date = new Date(timestamp);
  const month = MONTHS[date.getMonth()] ?? '';
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month} ${date.getDate()}, ${date.getHours()}:${minutes}`;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local time as a datetime-local input value, minute precision. */
export function toDatetimeLocalValue(timestamp: number): string {
  const d = new Date(timestamp);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

/** Parses a datetime-local input value as local time, or null. */
export function fromDatetimeLocalValue(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (match === null) return null;
  const time = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5])
  ).getTime();
  return Number.isFinite(time) ? time : null;
}
