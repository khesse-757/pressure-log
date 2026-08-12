import { noteContext } from '../data/noteContext';
import { hpaToInHg } from '../data/units';
import {
  exportNotesJson,
  importNotesJson,
  mergeNotes,
  sortNotesNewestFirst,
} from '../storage/notesStore';
import {
  formatDayTime,
  formatPressure,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from '../utils/format';
import type { Note, PressureUnit, Series } from '../utils/types';
import { query } from './dom';

export interface NotesPanelHandle {
  update(notes: Note[], series: Series, unit: PressureUnit): void;
  /** Scrolls the note into view and flashes it. */
  highlight(noteId: string): void;
}

export interface NotesPanelOptions {
  onNotesChanged: (notes: Note[]) => void;
}

const HIGHLIGHT_MS = 1600;
const FEELINGS = [1, 2, 3, 4, 5];

/** crypto.randomUUID is missing on plain http origins, like testing
 * from a phone over the LAN, so fall back to a timestamped id. */
function makeId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createNotesPanel(
  container: HTMLElement,
  options: NotesPanelOptions
): NotesPanelHandle {
  let notes: Note[] = [];
  let series: Series = { bucketMinutes: 5, timestamps: [], pressureHpa: [] };
  let unit: PressureUnit = 'hPa';
  let feeling: number | null = null;

  container.innerHTML = `
    <section class="notes-panel">
      <div class="notes-header">
        <h2 class="panel-title">Notes</h2>
        <div class="notes-actions">
          <button type="button" class="text-button notes-export">Export</button>
          <label class="text-button notes-import-label">
            Import
            <input
              type="file"
              class="notes-import visually-hidden"
              accept=".json,application/json"
            />
          </label>
          <button type="button" class="button button-small notes-add">
            Add note
          </button>
        </div>
      </div>
      <form class="note-form" hidden>
        <label class="field">
          <span class="field-label">When</span>
          <input type="datetime-local" class="note-time field-input" />
        </label>
        <label class="field">
          <span class="field-label">Note</span>
          <textarea
            class="note-text field-input"
            rows="3"
            placeholder="How are you feeling?"
          ></textarea>
        </label>
        <div class="field">
          <span class="field-label">Feeling, 1 low to 5 high (optional)</span>
          <div class="feeling-chips"></div>
        </div>
        <div class="note-form-actions">
          <button type="submit" class="button button-small">Save note</button>
          <button type="button" class="text-button note-cancel">Cancel</button>
        </div>
      </form>
      <p class="notes-error" hidden></p>
      <ul class="notes-list"></ul>
      <p class="notes-empty" hidden>
        No notes yet. Add one to line up how you feel with the pressure.
      </p>
    </section>
  `;

  const form = query<HTMLFormElement>(container, '.note-form');
  const timeInput = query<HTMLInputElement>(container, '.note-time');
  const textInput = query<HTMLTextAreaElement>(container, '.note-text');
  const feelingChips = query<HTMLElement>(container, '.feeling-chips');
  const addButton = query<HTMLButtonElement>(container, '.notes-add');
  const cancelButton = query<HTMLButtonElement>(container, '.note-cancel');
  const exportButton = query<HTMLButtonElement>(container, '.notes-export');
  const importInput = query<HTMLInputElement>(container, '.notes-import');
  const errorEl = query<HTMLElement>(container, '.notes-error');
  const list = query<HTMLUListElement>(container, '.notes-list');
  const emptyEl = query<HTMLElement>(container, '.notes-empty');

  function showError(message: string): void {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function clearError(): void {
    errorEl.hidden = true;
  }

  function renderFeelingChips(): void {
    feelingChips.innerHTML = '';
    for (const value of FEELINGS) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = value === feeling ? 'chip chip-active' : 'chip';
      chip.textContent = String(value);
      chip.addEventListener('click', () => {
        feeling = feeling === value ? null : value;
        renderFeelingChips();
      });
      feelingChips.append(chip);
    }
  }

  function openForm(): void {
    clearError();
    timeInput.value = toDatetimeLocalValue(Date.now());
    textInput.value = '';
    feeling = null;
    renderFeelingChips();
    form.hidden = false;
    addButton.hidden = true;
    textInput.focus();
  }

  function closeForm(): void {
    form.hidden = true;
    addButton.hidden = false;
  }

  function contextLine(note: Note): string | null {
    const context = noteContext(series, note.timestamp);
    if (context === null) return null;
    const pressure = formatPressure(
      unit === 'hPa' ? context.pressureHpa : hpaToInHg(context.pressureHpa),
      unit
    );
    return context.tendency === null
      ? pressure
      : `${pressure}, ${context.tendency}`;
  }

  function renderList(): void {
    list.innerHTML = '';
    emptyEl.hidden = notes.length > 0;
    for (const note of notes) {
      const item = document.createElement('li');
      item.className = 'note-item';
      item.dataset.noteId = note.id;

      const meta = document.createElement('div');
      meta.className = 'note-meta';
      const time = document.createElement('span');
      time.className = 'note-time-label';
      time.textContent = formatDayTime(note.timestamp);
      meta.append(time);
      if (note.feeling !== undefined) {
        const feelingEl = document.createElement('span');
        feelingEl.className = 'note-feeling';
        feelingEl.textContent = `Feeling ${note.feeling}/5`;
        meta.append(feelingEl);
      }
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'text-button note-delete';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        if (!window.confirm('Delete this note?')) return;
        options.onNotesChanged(notes.filter((n) => n.id !== note.id));
      });
      meta.append(deleteButton);
      item.append(meta);

      if (note.text !== '') {
        const body = document.createElement('p');
        body.className = 'note-body';
        body.textContent = note.text;
        item.append(body);
      }

      const context = contextLine(note);
      if (context !== null) {
        const contextEl = document.createElement('p');
        contextEl.className = 'note-context';
        contextEl.textContent = context;
        item.append(contextEl);
      }

      list.append(item);
    }
  }

  addButton.addEventListener('click', openForm);
  cancelButton.addEventListener('click', closeForm);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const timestamp = fromDatetimeLocalValue(timeInput.value);
    if (timestamp === null) {
      showError('Enter a valid date and time for the note.');
      return;
    }
    const text = textInput.value.trim();
    if (text === '' && feeling === null) {
      showError('Write something or pick a feeling rating.');
      return;
    }
    clearError();
    const note: Note = {
      id: makeId(),
      timestamp,
      text,
      createdAt: Date.now(),
    };
    if (feeling !== null) note.feeling = feeling;
    closeForm();
    options.onNotesChanged(sortNotesNewestFirst([...notes, note]));
  });

  exportButton.addEventListener('click', () => {
    const blob = new Blob([exportNotesJson(notes)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pressure-log-notes.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (file === undefined) return;
    file
      .text()
      .then((text) => {
        clearError();
        options.onNotesChanged(mergeNotes(notes, importNotesJson(text)));
      })
      .catch((error: unknown) => {
        showError(
          error instanceof Error ? error.message : 'Could not import that file.'
        );
      });
  });

  return {
    update(nextNotes, nextSeries, nextUnit): void {
      notes = nextNotes;
      series = nextSeries;
      unit = nextUnit;
      renderList();
    },
    highlight(noteId): void {
      const item = list.querySelector<HTMLElement>(
        `[data-note-id="${noteId}"]`
      );
      if (item === null) return;
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.classList.add('note-highlight');
      window.setTimeout(() => {
        item.classList.remove('note-highlight');
      }, HIGHLIGHT_MS);
    },
  };
}
