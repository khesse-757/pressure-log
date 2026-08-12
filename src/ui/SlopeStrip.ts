import { nearestIndex } from '../data/rateOfChange';
import { slopeTendency, type SlopeResult } from '../data/slope';
import type { Series } from '../utils/types';
import type { ChartPlot } from './PressureChart';

export interface SlopeStripInput {
  /** Visible detail series. */
  series: Series;
  /** Slope per point, aligned to series by index. */
  slopes: Array<SlopeResult | null>;
  /** Live chart geometry, re-read on every draw. */
  plot: () => ChartPlot | null;
  /** Timestamp whose bar is highlighted, or null. */
  highlightTime: number | null;
}

export interface SlopeStripHandle {
  update(input: SlopeStripInput): void;
}

const STRIP_HEIGHT = 56;

/** Floor for the value-to-pixel scale: the fast tendency threshold
 * (2 hPa per 3h) in hPa per minute, so ordinary wiggles stay small
 * and only genuinely fast movement fills the strip. */
const MIN_SCALE_HPA_PER_MINUTE = 2 / 180;

function cssColor(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

export function createSlopeStrip(container: HTMLElement): SlopeStripHandle {
  const canvas = document.createElement('canvas');
  canvas.className = 'slope-strip-canvas';
  canvas.style.width = '100%';
  canvas.style.height = `${STRIP_HEIGHT}px`;
  container.append(canvas);

  const rising = cssColor('--color-accent');
  const falling = cssColor('--color-falling');
  const steady = 'rgba(255, 255, 255, 0.28)';
  const baseline = 'rgba(255, 255, 255, 0.12)';
  const highlight = 'rgba(255, 255, 255, 0.14)';

  let last: SlopeStripInput | null = null;
  let frame = 0;

  function draw(): void {
    frame = 0;
    const input = last;
    if (input === null) return;
    const plot = input.plot();
    const cssWidth = canvas.clientWidth;
    if (plot === null || cssWidth === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(STRIP_HEIGHT * dpr);
    const ctx = canvas.getContext('2d');
    if (ctx === null) return;
    ctx.scale(dpr, dpr);

    const canvasRect = canvas.getBoundingClientRect();
    const offsetX = plot.rect.left - canvasRect.left;
    const plotWidth = plot.rect.width;
    const mid = STRIP_HEIGHT / 2;

    ctx.strokeStyle = baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX, mid + 0.5);
    ctx.lineTo(offsetX + plotWidth, mid + 0.5);
    ctx.stroke();

    const count = input.series.timestamps.length;
    if (count === 0) return;

    let maxAbs = MIN_SCALE_HPA_PER_MINUTE;
    for (const slope of input.slopes) {
      if (slope !== null && Math.abs(slope.slopePerMinuteHpa) > maxAbs) {
        maxAbs = Math.abs(slope.slopePerMinuteHpa);
      }
    }
    const scale = (mid - 4) / maxAbs;
    const barWidth = Math.max(1, Math.min(6, plotWidth / count - 1));
    const highlightIndex =
      input.highlightTime === null
        ? -1
        : nearestIndex(input.series.timestamps, input.highlightTime);

    input.series.timestamps.forEach((timestamp, i) => {
      const x = offsetX + plot.xToPx(timestamp) - barWidth / 2;
      if (x + barWidth < offsetX || x > offsetX + plotWidth) return;

      if (i === highlightIndex) {
        ctx.fillStyle = highlight;
        ctx.fillRect(x - 1.5, 0, barWidth + 3, STRIP_HEIGHT);
      }

      const slope = input.slopes[i] ?? null;
      if (slope === null) return;
      const tendency = slopeTendency(slope.slopePerMinuteHpa);
      ctx.fillStyle =
        tendency === 'steady'
          ? steady
          : tendency.startsWith('falling')
            ? falling
            : rising;
      ctx.globalAlpha =
        tendency === 'falling' || tendency === 'rising' ? 0.7 : 1;
      const height = Math.max(Math.abs(slope.slopePerMinuteHpa) * scale, 1);
      if (slope.slopePerMinuteHpa >= 0) {
        ctx.fillRect(x, mid - height, barWidth, height);
      } else {
        ctx.fillRect(x, mid, barWidth, height);
      }
      ctx.globalAlpha = 1;
    });
  }

  function schedule(): void {
    if (frame === 0) frame = requestAnimationFrame(draw);
  }

  new ResizeObserver(schedule).observe(container);

  return {
    update(input: SlopeStripInput): void {
      last = input;
      schedule();
    },
  };
}
