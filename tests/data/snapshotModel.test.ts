import { describe, expect, it } from 'vitest';
import { buildSnapshotModel } from '@data/snapshotModel';
import type { Note, Series } from '@utils/types';

const HOUR = 3_600_000;

function hourlySeries(hours: number, base = 1000): Series {
  return {
    bucketMinutes: 60,
    timestamps: Array.from({ length: hours }, (_, i) => i * HOUR),
    pressureHpa: Array.from({ length: hours }, (_, i) => base + i * 0.1),
  };
}

function note(id: string, timestamp: number): Note {
  return { id, timestamp, text: id, createdAt: timestamp };
}

describe('buildSnapshotModel', () => {
  const series = hourlySeries(48);

  it('uses the newest reading for pressure and timestamp', () => {
    const model = buildSnapshotModel(series, series, []);
    expect(model?.latestTimestamp).toBe(47 * HOUR);
    expect(model?.pressureHpa).toBeCloseTo(1004.7, 6);
  });

  it('labels the tendency from the 3h window', () => {
    const model = buildSnapshotModel(series, series, []);
    expect(model?.tendency).toBe('steady');
  });

  it('reports covered windows and nulls uncovered ones', () => {
    const short = hourlySeries(3);
    const model = buildSnapshotModel(short, short, []);
    expect(model?.deltas.find((d) => d.windowHours === 1)?.rate).not.toBeNull();
    expect(model?.deltas.find((d) => d.windowHours === 6)?.rate).toBeNull();
  });

  it('picks the most recent note within the visible range', () => {
    const visible = {
      ...series,
      timestamps: series.timestamps.slice(24),
      pressureHpa: series.pressureHpa.slice(24),
    };
    const notes = [
      note('old', 2 * HOUR),
      note('mid', 30 * HOUR),
      note('new', 40 * HOUR),
    ];
    const model = buildSnapshotModel(series, visible, notes);
    expect(model?.note?.id).toBe('new');
  });

  it('excludes notes older than the visible range', () => {
    const visible = {
      ...series,
      timestamps: series.timestamps.slice(24),
      pressureHpa: series.pressureHpa.slice(24),
    };
    const model = buildSnapshotModel(series, visible, [note('old', 2 * HOUR)]);
    expect(model?.note).toBeNull();
  });

  it('returns null for an empty series', () => {
    const empty: Series = { bucketMinutes: 5, timestamps: [], pressureHpa: [] };
    expect(buildSnapshotModel(empty, empty, [])).toBeNull();
  });
});
