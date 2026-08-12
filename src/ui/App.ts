import { findRateEvents, type RateEvent } from '../data/events';
import { nearestIndex } from '../data/rateOfChange';
import { resample } from '../data/resample';
import { seriesStats } from '../data/seriesStats';
import {
  clampWindowEnd,
  sliceSeriesToRange,
  sliceSeriesToWindow,
} from '../data/sliceSeries';
import { computeSlopeSeries, type SlopeResult } from '../data/slope';
import { buildSnapshotModel } from '../data/snapshotModel';
import { loadDataset, saveDataset } from '../storage/datasetStore';
import { loadNotes, saveNotes } from '../storage/notesStore';
import { loadPrefs, savePrefs, type Prefs } from '../storage/prefsStore';
import {
  DETAIL_RANGES_MINUTES,
  GRANULAR_RESAMPLE_MINUTES,
  SLOPE_WINDOW_MINUTES,
} from '../utils/constants';
import type {
  ChartMode,
  Note,
  ParseResult,
  RawReading,
  Series,
} from '../utils/types';
import { createActivityPanel } from './ActivityPanel';
import { renderAnchorNav } from './AnchorNav';
import { renderChips, type ChipOption } from './chips';
import { query } from './dom';
import { renderHelpPanel } from './HelpPanel';
import { renderImportPanel } from './ImportPanel';
import { createNotesPanel, type NotesPanelHandle } from './NotesPanel';
import { createPressureChart, type ChartCursor } from './PressureChart';
import { createRatePanel } from './RatePanel';
import { renderRangeChips } from './RangeChips';
import { createSlopeReadout } from './SlopeReadout';
import { createSlopeStrip } from './SlopeStrip';
import { renderSnapshotView } from './SnapshotCard';
import { renderStatsRow } from './StatsRow';
import { renderUnitToggle } from './UnitToggle';

interface DetailData {
  series: Series;
  slopes: Array<SlopeResult | null>;
  events: RateEvent[];
}

interface AppState {
  prefs: Prefs;
  readings: RawReading[];
  series: Series;
  /** 1 minute series, precomputed slopes, and rapid movement events,
   * built once per dataset. */
  detail: DetailData | null;
  /** Detail window end time; null follows the newest reading. Not
   * persisted, resets to latest on reload. */
  detailAnchor: number | null;
  notes: Note[];
  notice: string | null;
  cursor: ChartCursor | null;
}

const MS_PER_MINUTE = 60_000;

const MODE_OPTIONS: ReadonlyArray<ChipOption<ChartMode>> = [
  { label: 'Overview', value: 'normal' },
  { label: 'Detail', value: 'detail' },
];

const DETAIL_RANGE_OPTIONS: ReadonlyArray<ChipOption<number>> =
  DETAIL_RANGES_MINUTES.map((minutes) => ({
    label: minutes < 60 ? `${minutes} m` : `${minutes / 60} h`,
    value: minutes,
  }));

/** Re-buckets at 1 minute and precomputes every slope and the rapid
 * movement events once per dataset, so scrub updates and the
 * Activity list stay lookups. */
function ensureDetail(state: AppState): DetailData {
  if (state.detail === null) {
    const series = resample(state.readings, GRANULAR_RESAMPLE_MINUTES);
    const slopes = computeSlopeSeries(series, SLOPE_WINDOW_MINUTES);
    state.detail = { series, slopes, events: findRateEvents(series, slopes) };
  }
  return state.detail;
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
    detail: null,
    detailAnchor: null,
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
  state.detail = null;
  state.detailAnchor = null;
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
        <div class="toolbar-left">
          <div class="mode-toggle"></div>
          <div class="range-chips"></div>
        </div>
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
      <div class="anchor-nav" hidden></div>
      <div class="stats-row"></div>
      <div class="chart-container"></div>
      <div class="slope-strip-container" hidden></div>
      <div class="slope-readout-container" hidden></div>
      <div class="rate-panel-container"></div>
      <div class="activity-panel-container"></div>
      <div class="notes-panel-container"></div>
    </div>
  `;

  const noticeEl = query<HTMLElement>(view, '.notice');
  if (state.notice !== null) {
    noticeEl.hidden = false;
    noticeEl.textContent = state.notice;
  }

  const chartEl = query<HTMLElement>(view, '.chart-container');
  const stripContainer = query<HTMLElement>(view, '.slope-strip-container');
  const readoutContainer = query<HTMLElement>(view, '.slope-readout-container');

  let currentVisible: Series = {
    bucketMinutes: 1,
    timestamps: [],
    pressureHpa: [],
  };
  let currentVisibleSlopes: Array<SlopeResult | null> = [];

  const cursorUpdate = (): void => {
    chart.setCursor(state.cursor);
    ratePanel.update(
      state.series,
      state.cursor?.time ?? null,
      state.prefs.unit,
      state.prefs.mode === 'normal'
    );
    if (state.prefs.mode === 'detail' && state.detail !== null) {
      const detail = state.detail;
      const latest =
        detail.series.timestamps[detail.series.timestamps.length - 1] ?? null;
      const time = state.cursor?.time ?? latest;
      const slope =
        time === null
          ? null
          : (detail.slopes[nearestIndex(detail.series.timestamps, time)] ??
            null);
      slopeReadout.update({
        slope,
        timestamp: time,
        scrubbing: state.cursor !== null,
        unit: state.prefs.unit,
      });
      slopeStrip.update({
        series: currentVisible,
        slopes: currentVisibleSlopes,
        plot: () => chart.plot(),
        highlightTime: state.cursor?.time ?? null,
      });
    }
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

  /** Switches to detail mode with the window centered on the moment
   * (anchor = time + half window, clamped) and the cursor pinned. */
  const inspectAt = (time: number): void => {
    const detail = ensureDetail(state);
    const windowMs = state.prefs.detailRangeMinutes * MS_PER_MINUTE;
    const latest =
      detail.series.timestamps[detail.series.timestamps.length - 1];
    const target = clampWindowEnd(detail.series, time + windowMs / 2, windowMs);
    state.detailAnchor =
      latest !== undefined && target >= latest ? null : target;
    if (state.prefs.mode !== 'detail') {
      state.prefs.mode = 'detail';
      savePrefs(state.prefs);
    }
    const snapIndex = nearestIndex(detail.series.timestamps, time);
    state.cursor = {
      time: detail.series.timestamps[snapIndex] ?? time,
      pinned: true,
    };
    update();
  };

  const ratePanel = createRatePanel(query(view, '.rate-panel-container'), {
    onLatest: clearCursor,
    onInspect: inspectAt,
  });

  const slopeStrip = createSlopeStrip(stripContainer);
  const slopeReadout = createSlopeReadout(readoutContainer);

  const activityPanel = createActivityPanel(
    query(view, '.activity-panel-container'),
    { onSelect: (event) => inspectAt(event.time) }
  );

  notesPanel = createNotesPanel(query(view, '.notes-panel-container'), {
    onNotesChanged: (notes) => {
      state.notes = notes;
      saveNotes(notes);
      chart.setNotes(notes);
      notesPanel?.update(notes, state.series, state.prefs.unit);
    },
  });

  const update = (): void => {
    const mode = state.prefs.mode;
    const detail = ensureDetail(state);
    const anchorNavEl = query<HTMLElement>(view, '.anchor-nav');
    let visible: Series;
    if (mode === 'detail') {
      const windowMs = state.prefs.detailRangeMinutes * MS_PER_MINUTE;
      const latest =
        detail.series.timestamps[detail.series.timestamps.length - 1];
      let anchor = clampWindowEnd(
        detail.series,
        state.detailAnchor ?? latest ?? 0,
        windowMs
      );
      if (latest !== undefined && anchor >= latest) {
        state.detailAnchor = null;
        anchor = latest;
      }
      visible = sliceSeriesToWindow(detail.series, anchor, windowMs);
      const firstVisible = visible.timestamps[0];
      const offset =
        firstVisible === undefined
          ? 0
          : nearestIndex(detail.series.timestamps, firstVisible);
      currentVisibleSlopes = detail.slopes.slice(
        offset,
        offset + visible.timestamps.length
      );

      const windowStart = visible.timestamps[0];
      const windowEnd = visible.timestamps[visible.timestamps.length - 1];
      const firstInData = detail.series.timestamps[0];
      anchorNavEl.hidden = false;
      renderAnchorNav(anchorNavEl, {
        windowStart: windowStart ?? anchor - windowMs,
        windowEnd: windowEnd ?? anchor,
        canEarlier:
          windowStart !== undefined &&
          firstInData !== undefined &&
          windowStart > firstInData,
        isLatest: state.detailAnchor === null,
        onEarlier: () => {
          state.detailAnchor = clampWindowEnd(
            detail.series,
            anchor - windowMs,
            windowMs
          );
          update();
        },
        onLater: () => {
          const next = clampWindowEnd(
            detail.series,
            anchor + windowMs,
            windowMs
          );
          state.detailAnchor =
            latest !== undefined && next >= latest ? null : next;
          update();
        },
        onLatest: () => {
          state.detailAnchor = null;
          update();
        },
      });
    } else {
      visible = sliceSeriesToRange(state.series, state.prefs.rangeDays);
      currentVisibleSlopes = [];
      anchorNavEl.hidden = true;
    }
    currentVisible = visible;

    renderChips(query(view, '.mode-toggle'), MODE_OPTIONS, mode, (next) => {
      state.prefs.mode = next;
      savePrefs(state.prefs);
      update();
    });
    const chipsEl = query<HTMLElement>(view, '.range-chips');
    if (mode === 'detail') {
      renderChips(
        chipsEl,
        DETAIL_RANGE_OPTIONS,
        state.prefs.detailRangeMinutes,
        (minutes) => {
          state.prefs.detailRangeMinutes = minutes;
          savePrefs(state.prefs);
          update();
        }
      );
    } else {
      renderRangeChips(chipsEl, state.prefs.rangeDays, (range) => {
        state.prefs.rangeDays = range;
        savePrefs(state.prefs);
        update();
      });
    }
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
    stripContainer.hidden = mode !== 'detail';
    readoutContainer.hidden = mode !== 'detail';
    activityPanel.update(detail.events, state.notes, state.prefs.unit);
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
