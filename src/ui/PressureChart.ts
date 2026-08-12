import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { seriesCoversTimestamp } from '../data/noteContext';
import { nearestIndex } from '../data/rateOfChange';
import { hpaToInHg } from '../data/units';
import { formatDayTime, formatPressure } from '../utils/format';
import type { PressureUnit, Series } from '../utils/types';

export interface ChartCursor {
  /** Timestamp in ms, snapped to a data point. */
  time: number;
  /** Pinned cursors survive mouseleave; hover cursors do not. */
  pinned: boolean;
}

export interface PressureChartCallbacks {
  /** A moment was selected. pinned is true for click, tap, and drag. */
  onScrub: (time: number, pinned: boolean) => void;
  /** A transient hover left the chart. */
  onClear: () => void;
  /** A note marker was clicked or tapped. */
  onNoteTap?: (noteId: string) => void;
}

export interface NoteMarkerInput {
  id: string;
  timestamp: number;
}

/** Live geometry of the plotting area, for overlays rendered outside
 * the chart (the slope strip) that must share its time axis. */
export interface ChartPlot {
  rect: DOMRect;
  /** CSS px within the plotting area for a timestamp. */
  xToPx: (timestamp: number) => number;
}

export interface PressureChartHandle {
  update(series: Series, unit: PressureUnit): void;
  setCursor(cursor: ChartCursor | null): void;
  setNotes(notes: ReadonlyArray<NoteMarkerInput>): void;
  plot(): ChartPlot | null;
  destroy(): void;
}

const CHART_HEIGHT = 280;
const MIN_WIDTH = 280;
const GRID_COLOR = 'rgba(255, 255, 255, 0.07)';
const AXIS_FONT = '11px -apple-system, BlinkMacSystemFont, sans-serif';

/** Movement below this many px keeps a touch gesture undecided. */
const DIRECTION_LOCK_PX = 8;

/** Ignore synthesized mouse events this long after any touch. */
const TOUCH_MOUSE_SUPPRESS_MS = 700;

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function createPressureChart(
  container: HTMLElement,
  callbacks: PressureChartCallbacks
): PressureChartHandle {
  let chart: uPlot | null = null;
  let series: Series | null = null;
  let unit: PressureUnit = 'hPa';
  let cursor: ChartCursor | null = null;
  let lastTouchAt = 0;

  let line: HTMLElement | null = null;
  let dot: HTMLElement | null = null;
  let label: HTMLElement | null = null;
  let labelTime: HTMLElement | null = null;
  let labelValue: HTMLElement | null = null;

  let noteMarkers: ReadonlyArray<NoteMarkerInput> = [];
  let markerEls: HTMLButtonElement[] = [];

  const accent = cssColor('--color-accent');
  const muted = cssColor('--color-text-muted');

  function toData(s: Series, u: PressureUnit): uPlot.AlignedData {
    const xs = s.timestamps.map((t) => t / 1000);
    const ys =
      u === 'hPa' ? s.pressureHpa : s.pressureHpa.map((v) => hpaToInHg(v));
    return [xs, ys];
  }

  function width(): number {
    return Math.max(container.clientWidth, MIN_WIDTH);
  }

  function timeAtClientX(clientX: number): number | null {
    if (chart === null || series === null || series.timestamps.length === 0) {
      return null;
    }
    const rect = chart.over.getBoundingClientRect();
    const seconds = chart.posToVal(clientX - rect.left, 'x');
    const index = nearestIndex(series.timestamps, seconds * 1000);
    return series.timestamps[index] ?? null;
  }

  function recentTouch(): boolean {
    return Date.now() - lastTouchAt < TOUCH_MOUSE_SUPPRESS_MS;
  }

  function hideCursor(): void {
    if (line !== null) line.hidden = true;
    if (dot !== null) dot.hidden = true;
    if (label !== null) label.hidden = true;
  }

  function positionCursor(): void {
    if (
      line === null ||
      dot === null ||
      label === null ||
      labelTime === null ||
      labelValue === null
    ) {
      return;
    }
    if (chart === null || series === null || cursor === null) {
      hideCursor();
      return;
    }
    const index = nearestIndex(series.timestamps, cursor.time);
    const timestamp = series.timestamps[index];
    const hpa = series.pressureHpa[index];
    if (timestamp === undefined || hpa === undefined) {
      hideCursor();
      return;
    }
    // The snapped timestamp is always inside the visible series, but
    // valToPos returns fractional px while clientWidth is an integer,
    // so clamp instead of hiding on sub-pixel overshoot at the edges.
    const overWidth = chart.over.clientWidth;
    const x = Math.min(
      Math.max(chart.valToPos(timestamp / 1000, 'x'), 0),
      overWidth
    );
    const value = unit === 'hPa' ? hpa : hpaToInHg(hpa);
    const y = chart.valToPos(value, 'y');
    line.hidden = false;
    dot.hidden = false;
    label.hidden = false;
    line.style.left = `${x}px`;
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    labelTime.textContent = formatDayTime(timestamp);
    labelValue.textContent = formatPressure(value, unit);
    if (x > overWidth / 2) {
      label.style.left = 'auto';
      label.style.right = `${overWidth - x + 8}px`;
    } else {
      label.style.right = 'auto';
      label.style.left = `${x + 8}px`;
    }
  }

  function positionMarkers(): void {
    if (chart === null || series === null || series.timestamps.length === 0) {
      for (const el of markerEls) el.hidden = true;
      return;
    }
    const overWidth = chart.over.clientWidth;
    noteMarkers.forEach((note, i) => {
      const el = markerEls[i];
      if (el === undefined || chart === null || series === null) return;
      // Visibility is decided by timestamp, not pixels: valToPos
      // returns fractional px while clientWidth rounds down, so a
      // note near the newest reading sat a fraction of a pixel past
      // the integer width and was wrongly hidden. Timestamps in the
      // covered span always show; x is clamped into the plot.
      if (!seriesCoversTimestamp(series, note.timestamp)) {
        el.hidden = true;
        return;
      }
      const hpa =
        series.pressureHpa[nearestIndex(series.timestamps, note.timestamp)];
      if (hpa === undefined) {
        el.hidden = true;
        return;
      }
      const x = Math.min(
        Math.max(chart.valToPos(note.timestamp / 1000, 'x'), 0),
        overWidth
      );
      const value = unit === 'hPa' ? hpa : hpaToInHg(hpa);
      const y = chart.valToPos(value, 'y');
      el.hidden = false;
      el.style.left = `${x}px`;
      el.style.top = `${y - 14}px`;
    });
  }

  function buildMarkers(): void {
    for (const el of markerEls) el.remove();
    markerEls = [];
    if (chart === null) return;
    for (const note of noteMarkers) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'note-marker';
      el.setAttribute('aria-label', 'Note');
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        callbacks.onNoteTap?.(note.id);
      });
      chart.over.append(el);
      markerEls.push(el);
    }
    positionMarkers();
  }

  function attachOverlay(u: uPlot): void {
    const over = u.over;
    over.style.touchAction = 'pan-y';

    line = document.createElement('div');
    line.className = 'cursor-line';
    dot = document.createElement('div');
    dot.className = 'cursor-dot';
    label = document.createElement('div');
    label.className = 'cursor-label';
    labelTime = document.createElement('span');
    labelTime.className = 'cursor-label-time';
    labelValue = document.createElement('span');
    labelValue.className = 'cursor-label-value';
    label.append(labelTime, labelValue);
    over.append(line, dot, label);
    hideCursor();

    over.addEventListener('mousemove', (event) => {
      if (recentTouch()) return;
      const time = timeAtClientX(event.clientX);
      if (time !== null) callbacks.onScrub(time, false);
    });
    over.addEventListener('mouseleave', () => {
      if (recentTouch()) return;
      callbacks.onClear();
    });
    over.addEventListener('click', (event) => {
      if (recentTouch()) return;
      const time = timeAtClientX(event.clientX);
      if (time !== null) callbacks.onScrub(time, true);
    });

    let touch: {
      startX: number;
      startY: number;
      mode: 'pending' | 'cursor' | 'scroll';
    } | null = null;

    over.addEventListener(
      'touchstart',
      (event) => {
        lastTouchAt = Date.now();
        if (event.touches.length !== 1) {
          touch = null;
          return;
        }
        const point = event.touches[0];
        if (point === undefined) return;
        touch = {
          startX: point.clientX,
          startY: point.clientY,
          mode: 'pending',
        };
      },
      { passive: true }
    );

    over.addEventListener(
      'touchmove',
      (event) => {
        lastTouchAt = Date.now();
        if (touch === null) return;
        const point = event.touches[0];
        if (point === undefined) return;
        if (touch.mode === 'pending') {
          const dx = Math.abs(point.clientX - touch.startX);
          const dy = Math.abs(point.clientY - touch.startY);
          if (dx < DIRECTION_LOCK_PX && dy < DIRECTION_LOCK_PX) return;
          touch.mode = dx > dy ? 'cursor' : 'scroll';
        }
        if (touch.mode === 'cursor') {
          event.preventDefault();
          const time = timeAtClientX(point.clientX);
          if (time !== null) callbacks.onScrub(time, true);
        }
      },
      { passive: false }
    );

    over.addEventListener('touchend', (event) => {
      lastTouchAt = Date.now();
      if (touch !== null && touch.mode === 'pending') {
        const point = event.changedTouches[0];
        if (point !== undefined) {
          const time = timeAtClientX(point.clientX);
          if (time !== null) callbacks.onScrub(time, true);
        }
      }
      touch = null;
    });
    over.addEventListener('touchcancel', () => {
      touch = null;
    });

    buildMarkers();
  }

  function makeChart(s: Series, u: PressureUnit): void {
    chart?.destroy();
    const decimals = u === 'hPa' ? 1 : 2;
    const options: uPlot.Options = {
      width: width(),
      height: CHART_HEIGHT,
      legend: { show: false },
      cursor: { show: false },
      scales: { x: { time: true } },
      series: [{}, { stroke: accent, width: 1.5, points: { show: false } }],
      axes: [
        {
          stroke: muted,
          font: AXIS_FONT,
          grid: { stroke: GRID_COLOR, width: 1 },
          ticks: { stroke: GRID_COLOR, width: 1 },
        },
        {
          stroke: muted,
          font: AXIS_FONT,
          size: 56,
          grid: { stroke: GRID_COLOR, width: 1 },
          ticks: { stroke: GRID_COLOR, width: 1 },
          values: (_u, ticks) => ticks.map((v) => v.toFixed(decimals)),
        },
      ],
    };
    chart = new uPlot(options, toData(s, u), container);
    attachOverlay(chart);
  }

  const observer = new ResizeObserver(() => {
    if (chart !== null) {
      chart.setSize({ width: width(), height: CHART_HEIGHT });
      positionCursor();
      positionMarkers();
    }
  });
  observer.observe(container);

  return {
    update(nextSeries: Series, nextUnit: PressureUnit): void {
      series = nextSeries;
      if (chart === null || nextUnit !== unit) {
        unit = nextUnit;
        makeChart(nextSeries, nextUnit);
      } else {
        chart.setData(toData(nextSeries, nextUnit));
      }
      positionCursor();
      positionMarkers();
    },
    setCursor(nextCursor: ChartCursor | null): void {
      cursor = nextCursor;
      positionCursor();
    },
    setNotes(notes: ReadonlyArray<NoteMarkerInput>): void {
      noteMarkers = notes;
      buildMarkers();
    },
    plot(): ChartPlot | null {
      const current = chart;
      if (current === null) return null;
      return {
        rect: current.over.getBoundingClientRect(),
        xToPx: (timestamp: number): number =>
          current.valToPos(timestamp / 1000, 'x'),
      };
    },
    destroy(): void {
      observer.disconnect();
      chart?.destroy();
      chart = null;
    },
  };
}
