import type { ParseResult, RawReading, SkippedLine } from '../utils/types';

/** Thrown when the file does not look like a RuuviTag export. The
 * message is user-facing, so keep it friendly. */
export class CsvFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CsvFormatError';
  }
}

export interface ParseOptions {
  /** Called periodically with a 0..1 fraction while parsing. */
  onProgress?: (fraction: number) => void;
}

const DATE_COLUMN = 'Date';
const PRESSURE_COLUMN = 'Air pressure (hPa)';

/** Header names must match the export exactly, unicode and all. */
const OPTIONAL_COLUMNS = [
  ['temperatureC', 'Temperature (°C)'],
  ['humidityPct', 'Rel. humidity (%)'],
  ['dewPointC', 'Dew point (°C)'],
  ['movements', 'Movements'],
  ['batteryV', 'Battery (V)'],
  ['rssi', 'Signal strength (RSSI)'],
  ['measSeq', 'Meas. seq. number'],
] as const;

type OptionalKey = (typeof OPTIONAL_COLUMNS)[number][0];

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

const PROGRESS_LINE_INTERVAL = 2000;

/** Parses `YYYY-MM-DD HH:MM:SS` as local time, ms since epoch. */
function parseDate(field: string | undefined): number | undefined {
  if (field === undefined) return undefined;
  const match = DATE_PATTERN.exec(field.trim());
  if (match === null) return undefined;
  const time = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6])
  ).getTime();
  return Number.isFinite(time) ? time : undefined;
}

/** Parses a numeric field, tolerating comma decimal separators. */
function parseNumber(field: string | undefined): number | undefined {
  if (field === undefined) return undefined;
  const trimmed = field.trim();
  if (trimmed === '') return undefined;
  const normalized =
    trimmed.includes(',') && !trimmed.includes('.')
      ? trimmed.replace(',', '.')
      : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

interface HeaderInfo {
  delimiter: string;
  dateIndex: number;
  pressureIndex: number;
  optional: Array<[OptionalKey, number]>;
}

function parseHeader(line: string): HeaderInfo {
  const delimiter = line.includes(';') ? ';' : ',';
  const cells = line.split(delimiter).map((cell) => cell.trim());
  const dateIndex = cells.indexOf(DATE_COLUMN);
  const pressureIndex = cells.indexOf(PRESSURE_COLUMN);
  if (dateIndex === -1 || pressureIndex === -1) {
    throw new CsvFormatError(
      'This file does not look like a RuuviTag export. ' +
        `It should have "${DATE_COLUMN}" and "${PRESSURE_COLUMN}" columns.`
    );
  }
  const optional: Array<[OptionalKey, number]> = [];
  for (const [key, name] of OPTIONAL_COLUMNS) {
    const index = cells.indexOf(name);
    if (index !== -1) optional.push([key, index]);
  }
  return { delimiter, dateIndex, pressureIndex, optional };
}

/** Streaming line parser for RuuviTag CSV exports. Pure and
 * synchronous; run it in the parse worker for large files. */
export function parseCsv(
  text: string,
  options: ParseOptions = {}
): ParseResult {
  const { onProgress } = options;
  const readings: RawReading[] = [];
  const skipped: SkippedLine[] = [];

  let header: HeaderInfo | undefined;
  let position = 0;
  let lineNumber = 0;
  let dataLines = 0;

  while (position < text.length) {
    const newline = text.indexOf('\n', position);
    const end = newline === -1 ? text.length : newline;
    let line = text.slice(position, end);
    position = end + 1;
    lineNumber += 1;
    if (line.endsWith('\r')) line = line.slice(0, -1);
    if (line.trim() === '') continue;

    if (header === undefined) {
      header = parseHeader(line);
      continue;
    }

    const fields = line.split(header.delimiter);
    const timestamp = parseDate(fields[header.dateIndex]);
    if (timestamp === undefined) {
      skipped.push({ line: lineNumber, reason: 'missing or invalid date' });
      continue;
    }
    const pressureHpa = parseNumber(fields[header.pressureIndex]);
    if (pressureHpa === undefined) {
      skipped.push({ line: lineNumber, reason: 'missing or invalid pressure' });
      continue;
    }

    const reading: RawReading = { timestamp, pressureHpa };
    for (const [key, index] of header.optional) {
      const value = parseNumber(fields[index]);
      if (value !== undefined) reading[key] = value;
    }
    readings.push(reading);

    dataLines += 1;
    if (onProgress !== undefined && dataLines % PROGRESS_LINE_INTERVAL === 0) {
      onProgress(Math.min(position / text.length, 1));
    }
  }

  if (header === undefined) {
    throw new CsvFormatError(
      'This file is empty, so there is nothing to import.'
    );
  }

  onProgress?.(1);
  return { readings, skipped };
}
