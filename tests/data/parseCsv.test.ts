import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CsvFormatError, parseCsv } from '@data/parseCsv';

const fixture = readFileSync(
  new URL('../fixtures/sample.csv', import.meta.url),
  'utf8'
);

const HEADER = 'Date,Air pressure (hPa)';

describe('parseCsv', () => {
  describe('real export fixture', () => {
    it('parses every data row without skips', () => {
      const result = parseCsv(fixture);
      expect(result.readings).toHaveLength(200);
      expect(result.skipped).toHaveLength(0);
    });

    it('parses the local date format', () => {
      const result = parseCsv(fixture);
      const expected = new Date(2026, 7, 8, 11, 51, 53).getTime();
      expect(result.readings[0]?.timestamp).toBe(expected);
    });

    it('reads pressure from the hPa column', () => {
      const result = parseCsv(fixture);
      expect(result.readings[0]?.pressureHpa).toBe(1018.65);
    });

    it('keeps pre-sync rows and leaves their empty fields undefined', () => {
      const result = parseCsv(fixture);
      const preSync = result.readings[0];
      expect(preSync?.measSeq).toBeUndefined();
      expect(preSync?.batteryV).toBeUndefined();
      expect(preSync?.temperatureC).toBe(28.76);
    });

    it('parses optional columns when present', () => {
      const result = parseCsv(fixture);
      const synced = result.readings[2];
      expect(synced?.measSeq).toBe(131);
      expect(synced?.batteryV).toBe(3.273);
      expect(synced?.rssi).toBe(-41);
    });

    it('tolerates rows with some empty optional fields', () => {
      const result = parseCsv(fixture);
      const partial = result.readings.find((r) => r.measSeq === 139);
      expect(partial).toBeDefined();
      expect(partial?.rssi).toBeUndefined();
    });
  });

  describe('comma decimal separators', () => {
    it('parses semicolon delimited exports with comma decimals', () => {
      const text = `Date;Air pressure (hPa)\n2026-08-08 12:00:00;1013,25\n`;
      const result = parseCsv(text);
      expect(result.readings[0]?.pressureHpa).toBe(1013.25);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('garbage lines', () => {
    it('skips lines with an invalid date and records the reason', () => {
      const text = `${HEADER}\n2026-08-08 12:00:00,1000.5\nnot a data row\n`;
      const result = parseCsv(text);
      expect(result.readings).toHaveLength(1);
      expect(result.skipped).toEqual([
        { line: 3, reason: 'missing or invalid date' },
      ]);
    });

    it('skips lines with a missing pressure and records the reason', () => {
      const text = `${HEADER}\n2026-08-08 12:00:00,\n2026-08-08 12:00:05,999.9\n`;
      const result = parseCsv(text);
      expect(result.readings).toHaveLength(1);
      expect(result.skipped).toEqual([
        { line: 2, reason: 'missing or invalid pressure' },
      ]);
    });

    it('ignores blank lines without recording skips', () => {
      const text = `${HEADER}\n\n2026-08-08 12:00:00,1000\n\n`;
      const result = parseCsv(text);
      expect(result.readings).toHaveLength(1);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('rejects non Ruuvi files', () => {
    it('throws a friendly error for an empty file', () => {
      expect(() => parseCsv('')).toThrow(CsvFormatError);
      expect(() => parseCsv('')).toThrow(/empty/);
    });

    it('throws a friendly error for a file with the wrong header', () => {
      const text = 'name,age\nbob,42\n';
      expect(() => parseCsv(text)).toThrow(CsvFormatError);
      expect(() => parseCsv(text)).toThrow(/RuuviTag/);
    });

    it('accepts a header-only export as zero readings', () => {
      const result = parseCsv(`${HEADER}\n`);
      expect(result.readings).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });

  describe('progress reporting', () => {
    it('reports increasing fractions ending at 1', () => {
      const rows = Array.from(
        { length: 5000 },
        () => '2026-08-08 12:00:00,1000'
      );
      const text = `${HEADER}\n${rows.join('\n')}\n`;
      const fractions: number[] = [];
      parseCsv(text, { onProgress: (f) => fractions.push(f) });
      expect(fractions.length).toBeGreaterThanOrEqual(2);
      expect(fractions[fractions.length - 1]).toBe(1);
      for (let i = 0; i < fractions.length; i += 1) {
        const fraction = fractions[i] ?? -1;
        expect(fraction).toBeGreaterThan(0);
        expect(fraction).toBeLessThanOrEqual(1);
        if (i > 0)
          expect(fraction).toBeGreaterThanOrEqual(fractions[i - 1] ?? 2);
      }
    });
  });
});
