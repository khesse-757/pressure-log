import { resample } from '../data/resample';
import { seriesStats } from '../data/seriesStats';
import { sliceSeriesToRange } from '../data/sliceSeries';
import { buildSnapshotModel } from '../data/snapshotModel';
import { loadDataset, saveDataset } from '../storage/datasetStore';
import { loadNotes, saveNotes } from '../storage/notesStore';
import { loadPrefs, savePrefs, type Prefs } from '../storage/prefsStore';
import type { Note, ParseResult, RawReading, Series } from '../utils/types';
import { query } from './dom';
import { renderHelpPanel } from './HelpPanel';
import { renderImportPanel } from './ImportPanel';
import { createNotesPanel, type NotesPanelHandle } from './NotesPanel';
import { createPressureChart, type ChartCursor } from './PressureChart';
import { createRatePanel } from './RatePanel';
import { renderRangeChips } from './RangeChips';
import { renderSnapshotView } from './SnapshotCard';
import { renderStatsRow } from './StatsRow';
import { renderUnitToggle } from './UnitToggle';

interface AppState {
  prefs: Prefs;
  readings: RawReading[];
  series: Series;
  notes: Note[];
  notice: string | null;
  cursor: ChartCursor | null;
}

/** Undoes the previous chart view's document listeners and chart. */
let teardownView: (() => void) | null = null;

/** Which history-backed sub view is open, if any. Help and Snapshot
 * push a history entry so the phone's native back gesture, a swipe
 * right, the Back button, and the Android back button all leave the
 * same way: through popstate. */
let activeSubView: 'help' | 'snapshot' | null = null;

export async function startApp(view: HTMLElement): Promise<void> {
  const prefs = loadPrefs();
  let readings: RawReading[] = [];
  try {
    readings = (await loadDataset()) ?? [];
  } catch (error) {
    console.warn('Could not load the stored dataset', error);
  }
  const state: AppState = {
    prefs,
    readings,
    series: resample(readings),
    notes: loadNotes(),
    notice: null,
    cursor: null,
  };
  if (readings.length > 0) {
    showChartView(view, state);
  } else {
    showImportView(view, state, false);
  }

  document
    .querySelector<HTMLButtonElement>('.help-button')
    ?.addEventListener('click', () => showHelpView(view));

  window.addEventListener('popstate', () => {
    if (activeSubView === null) return;
    activeSubView = null;
    document.getElementById('app')?.classList.remove('snapshot-mode');
    if (state.readings.length > 0) showChartView(view, state);
    else showImportView(view, state, false);
  });
}

function leaveSubView(): void {
  history.back();
}

function showHelpView(view: HTMLElement): void {
  if (activeSubView === 'help') return;
  teardownView?.();
  teardownView = null;
  activeSubView = 'help';
  history.pushState({ subView: 'help' }, '');
  renderHelpPanel(view, { onBack: leaveSubView });
}

function showSnapshotView(view: HTMLElement, state: AppState): void {
  const visible = sliceSeriesToRange(state.series, state.prefs.rangeDays);
  const model = buildSnapshotModel(state.series, visible, state.notes);
  if (model === null) return;
  teardownView?.();
  teardownView = null;
  activeSubView = 'snapshot';
  history.pushState({ subView: 'snapshot' }, '');
  document.getElementById('app')?.classList.add('snapshot-mode');
  renderSnapshotView(view, {
    model,
    unit: state.prefs.unit,
    onBack: leaveSubView,
  });
}

function showImportView(
  view: HTMLElement,
  state: AppState,
  canCancel: boolean
): void {
  teardownView?.();
  teardownView = null;
  renderImportPanel(view, {
    onImported: (result) => {
      applyImport(view, state, result);
    },
    onCancel: canCancel ? (): void => showChartView(view, state) : undefined,
  });
}

function applyImport(
  view: HTMLElement,
  state: AppState,
  result: ParseResult
): void {
  state.readings = result.readings;
  state.series = resample(result.readings);
  state.cursor = null;
  state.notice =
    result.skipped.length > 0
      ? `Skipped ${result.skipped.length} unreadable ` +
        (result.skipped.length === 1 ? 'line' : 'lines')
      : null;
  showChartView(view, state);
  saveDataset(result.readings).catch((error: unknown) => {
    console.warn('Could not persist the dataset', error);
  });
}

function showChartView(view: HTMLElement, state: AppState): void {
  teardownView?.();
  view.innerHTML = `
    <div class="chart-view">
      <div class="toolbar">
        <div class="range-chips"></div>
        <div class="toolbar-right">
          <div class="unit-toggle"></div>
          <button type="button" class="text-button snapshot-button">
            Snapshot
          </button>
          <button type="button" class="text-button load-button">
            Load CSV
          </button>
        </div>
      </div>
      <p class="notice" hidden></p>
      <div class="stats-row"></div>
      <div class="chart-container"></div>
      <div class="rate-panel-container"></div>
      <div class="notes-panel-container"></div>
    </div>
  `;

  const noticeEl = query<HTMLElement>(view, '.notice');
  if (state.notice !== null) {
    noticeEl.hidden = false;
    noticeEl.textContent = state.notice;
  }

  const chartEl = query<HTMLElement>(view, '.chart-container');

  const cursorUpdate = (): void => {
    chart.setCursor(state.cursor);
    ratePanel.update(
      state.series,
      state.cursor?.time ?? null,
      state.prefs.unit
    );
  };

  const clearCursor = (): void => {
    if (state.cursor === null) return;
    state.cursor = null;
    cursorUpdate();
  };

  let notesPanel: NotesPanelHandle | null = null;

  const chart = createPressureChart(chartEl, {
    onScrub: (time, pinned) => {
      if (!pinned && state.cursor?.pinned === true) return;
      state.cursor = { time, pinned };
      cursorUpdate();
    },
    onClear: () => {
      if (state.cursor?.pinned === true) return;
      clearCursor();
    },
    onNoteTap: (noteId) => {
      notesPanel?.highlight(noteId);
    },
  });

  const ratePanel = createRatePanel(query(view, '.rate-panel-container'), {
    onLatest: clearCursor,
  });

  notesPanel = createNotesPanel(query(view, '.notes-panel-container'), {
    onNotesChanged: (notes) => {
      state.notes = notes;
      saveNotes(notes);
      chart.setNotes(notes);
      notesPanel?.update(notes, state.series, state.prefs.unit);
    },
  });

  const update = (): void => {
    const visible = sliceSeriesToRange(state.series, state.prefs.rangeDays);
    renderRangeChips(
      query(view, '.range-chips'),
      state.prefs.rangeDays,
      (range) => {
        state.prefs.rangeDays = range;
        savePrefs(state.prefs);
        update();
      }
    );
    renderUnitToggle(query(view, '.unit-toggle'), state.prefs.unit, (unit) => {
      state.prefs.unit = unit;
      savePrefs(state.prefs);
      update();
    });
    renderStatsRow(
      query(view, '.stats-row'),
      seriesStats(visible),
      state.prefs.unit
    );
    chart.update(visible, state.prefs.unit);
    chart.setNotes(state.notes);
    notesPanel?.update(state.notes, state.series, state.prefs.unit);
    cursorUpdate();
  };
  update();

  // A pinned cursor snaps back to live when the user taps or clicks
  // anywhere outside the chart.
  const onDocPointerDown = (event: Event): void => {
    if (state.cursor?.pinned !== true) return;
    if (event.target instanceof Node && chartEl.contains(event.target)) return;
    clearCursor();
  };
  document.addEventListener('pointerdown', onDocPointerDown);

  teardownView = (): void => {
    document.removeEventListener('pointerdown', onDocPointerDown);
    chart.destroy();
  };

  query<HTMLButtonElement>(view, '.load-button').addEventListener(
    'click',
    () => {
      state.notice = null;
      showImportView(view, state, true);
    }
  );

  query<HTMLButtonElement>(view, '.snapshot-button').addEventListener(
    'click',
    () => showSnapshotView(view, state)
  );
}
