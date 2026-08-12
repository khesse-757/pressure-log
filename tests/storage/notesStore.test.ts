import { describe, expect, it } from 'vitest';
import {
  exportNotesJson,
  importNotesJson,
  loadNotes,
  mergeNotes,
  saveNotes,
  sortNotesNewestFirst,
} from '@storage/notesStore';
import type { Note } from '@utils/types';
import { MemoryStorage } from '../helpers/memoryStorage';

function note(id: string, timestamp: number, extra: Partial<Note> = {}): Note {
  return { id, timestamp, text: `note ${id}`, createdAt: timestamp, ...extra };
}

describe('notesStore', () => {
  it('round trips save and load', () => {
    const storage = new MemoryStorage();
    const notes = [note('a', 100, { feeling: 3 }), note('b', 200)];
    saveNotes(notes, storage);
    expect(loadNotes(storage)).toEqual([
      note('b', 200),
      note('a', 100, { feeling: 3 }),
    ]);
  });

  it('returns an empty list when nothing is stored', () => {
    expect(loadNotes(new MemoryStorage())).toEqual([]);
  });

  it('filters invalid entries on load', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'pressure-log:notes',
      JSON.stringify([note('a', 100), { id: 'bad' }, 42])
    );
    expect(loadNotes(storage)).toEqual([note('a', 100)]);
  });

  it('rejects out of range feeling ratings on load', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      'pressure-log:notes',
      JSON.stringify([note('a', 100, { feeling: 9 })])
    );
    expect(loadNotes(storage)).toEqual([]);
  });

  it('sorts newest first', () => {
    const sorted = sortNotesNewestFirst([
      note('a', 100),
      note('c', 300),
      note('b', 200),
    ]);
    expect(sorted.map((n) => n.id)).toEqual(['c', 'b', 'a']);
  });

  it('round trips export and import', () => {
    const notes = [note('b', 200), note('a', 100, { feeling: 5 })];
    expect(importNotesJson(exportNotesJson(notes))).toEqual(notes);
  });

  it('throws a friendly error for invalid JSON', () => {
    expect(() => importNotesJson('not json')).toThrow(/valid JSON/);
  });

  it('throws a friendly error for JSON that is not a notes export', () => {
    expect(() => importNotesJson('{"foo":1}')).toThrow(/notes export/);
    expect(() => importNotesJson('[{"foo":1}]')).toThrow(/notes export/);
  });

  it('accepts an empty export', () => {
    expect(importNotesJson('[]')).toEqual([]);
  });

  it('merges by id with existing notes winning', () => {
    const existing = [note('a', 100, { text: 'local edit' } as Partial<Note>)];
    const imported = [note('a', 100), note('b', 200)];
    const merged = mergeNotes(existing, imported);
    expect(merged.map((n) => n.id)).toEqual(['b', 'a']);
    expect(merged[1]?.text).toBe('local edit');
  });
});
