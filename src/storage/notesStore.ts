import type { Note } from '../utils/types';

const NOTES_KEY = 'pressure-log:notes';

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const feelingOk =
    record.feeling === undefined ||
    (typeof record.feeling === 'number' &&
      Number.isInteger(record.feeling) &&
      record.feeling >= 1 &&
      record.feeling <= 5);
  return (
    typeof record.id === 'string' &&
    record.id.length > 0 &&
    typeof record.timestamp === 'number' &&
    Number.isFinite(record.timestamp) &&
    typeof record.text === 'string' &&
    typeof record.createdAt === 'number' &&
    feelingOk
  );
}

export function sortNotesNewestFirst(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.timestamp - a.timestamp);
}

export function loadNotes(storage: Storage = localStorage): Note[] {
  try {
    const raw = storage.getItem(NOTES_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortNotesNewestFirst(parsed.filter(isNote));
  } catch {
    return [];
  }
}

export function saveNotes(
  notes: Note[],
  storage: Storage = localStorage
): void {
  try {
    storage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch {
    // Storage can be unavailable in private browsing.
  }
}

export function exportNotesJson(notes: Note[]): string {
  return JSON.stringify(sortNotesNewestFirst(notes), null, 2);
}

/** Parses a notes export. Throws a friendly Error when the file is
 * not valid JSON or does not contain notes. */
export function importNotesJson(json: string): Note[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!Array.isArray(parsed)) {
    throw new Error('That file does not look like a notes export.');
  }
  const notes = parsed.filter(isNote);
  if (notes.length === 0 && parsed.length > 0) {
    throw new Error('That file does not look like a notes export.');
  }
  return sortNotesNewestFirst(notes);
}

/** Combines imported notes with existing ones. Existing notes win on
 * id collisions so local edits are never clobbered. */
export function mergeNotes(existing: Note[], imported: Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const note of imported) byId.set(note.id, note);
  for (const note of existing) byId.set(note.id, note);
  return sortNotesNewestFirst([...byId.values()]);
}
