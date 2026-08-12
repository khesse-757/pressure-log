import type { SnapshotModel } from '../data/snapshotModel';
import type { Tendency } from '../data/tendency';
import { hpaToInHg } from '../data/units';
import {
  formatDayTime,
  formatPressure,
  formatSignedPressure,
} from '../utils/format';
import type { PressureUnit } from '../utils/types';
import { query } from './dom';
import { attachSwipeBack } from './swipeBack';

export interface SnapshotViewOptions {
  model: SnapshotModel;
  unit: PressureUnit;
  onBack: () => void;
}

/** Arrow rotation per tendency, degrees clockwise from "steady". */
const TENDENCY_ANGLES: Record<Tendency, number> = {
  'falling fast': 90,
  falling: 45,
  steady: 0,
  rising: -45,
  'rising fast': -90,
};

const NO_TREND_TEXT = 'not enough data for a trend yet';

function inUnit(hpa: number, unit: PressureUnit): number {
  return unit === 'hPa' ? hpa : hpaToInHg(hpa);
}

function deltaText(
  model: SnapshotModel,
  windowHours: number,
  unit: PressureUnit
): string | null {
  const delta = model.deltas.find((d) => d.windowHours === windowHours);
  if (delta === undefined || delta.rate === null) return null;
  return formatSignedPressure(inUnit(delta.rate.deltaHpa, unit), unit);
}

function noteMeta(model: SnapshotModel): string {
  if (model.note === null) return '';
  const feeling =
    model.note.feeling === undefined ? '' : `, feeling ${model.note.feeling}/5`;
  return `${formatDayTime(model.note.timestamp)}${feeling}`;
}

export function renderSnapshotView(
  container: HTMLElement,
  options: SnapshotViewOptions
): void {
  const { model, unit } = options;
  container.innerHTML = `
    <div class="snapshot-view">
      <div class="snapshot-card">
        <div class="snap-head">
          <span class="snap-app">Pressure Log</span>
          <span class="snap-time"></span>
        </div>
        <div class="snap-pressure">
          <span class="snap-value"></span>
          <span class="snap-unit"></span>
        </div>
        <div class="snap-tendency">
          <svg
            class="snap-arrow"
            viewBox="0 0 24 24"
            width="22"
            height="22"
            aria-hidden="true"
          >
            <path d="M4 12h14" />
            <path d="M12 6l6 6-6 6" />
          </svg>
          <span class="snap-tendency-label"></span>
        </div>
        <div class="snap-deltas"></div>
        <div class="snap-note" hidden>
          <p class="snap-note-text"></p>
          <p class="snap-note-meta"></p>
        </div>
      </div>
      <div class="snapshot-actions">
        <button type="button" class="button snapshot-save">Save as PNG</button>
        <button type="button" class="text-button snapshot-back">Back</button>
      </div>
    </div>
  `;

  query<HTMLElement>(container, '.snap-time').textContent = formatDayTime(
    model.latestTimestamp
  );

  const pressure = formatPressure(inUnit(model.pressureHpa, unit), unit);
  const [valueText, unitText] = pressure.split(' ');
  query<HTMLElement>(container, '.snap-value').textContent = valueText ?? '';
  query<HTMLElement>(container, '.snap-unit').textContent = unitText ?? '';

  const tendencyEl = query<HTMLElement>(container, '.snap-tendency');
  const arrow = query<SVGElement>(container, '.snap-arrow');
  const tendencyLabel = query<HTMLElement>(container, '.snap-tendency-label');
  if (model.tendency === null) {
    arrow.style.display = 'none';
    tendencyLabel.textContent = NO_TREND_TEXT;
    tendencyEl.classList.add('snap-muted');
  } else {
    arrow.style.transform = `rotate(${TENDENCY_ANGLES[model.tendency]}deg)`;
    tendencyLabel.textContent = model.tendency;
    tendencyEl.classList.add(`tendency-${model.tendency.replace(' ', '-')}`);
  }

  const deltasEl = query<HTMLElement>(container, '.snap-deltas');
  for (const delta of model.deltas) {
    const cell = document.createElement('div');
    cell.className = 'snap-delta';
    const label = document.createElement('span');
    label.className = 'snap-delta-label';
    label.textContent = `${delta.windowHours} h`;
    const value = document.createElement('span');
    const text = deltaText(model, delta.windowHours, unit);
    value.className =
      text === null ? 'snap-delta-value snap-muted' : 'snap-delta-value';
    value.textContent = text ?? 'n/a';
    cell.append(label, value);
    deltasEl.append(cell);
  }

  if (model.note !== null) {
    const noteEl = query<HTMLElement>(container, '.snap-note');
    noteEl.hidden = false;
    query<HTMLElement>(container, '.snap-note-text').textContent =
      model.note.text;
    query<HTMLElement>(container, '.snap-note-meta').textContent =
      noteMeta(model);
  }

  query<HTMLButtonElement>(container, '.snapshot-save').addEventListener(
    'click',
    () => downloadPng(model, unit)
  );
  query<HTMLButtonElement>(container, '.snapshot-back').addEventListener(
    'click',
    () => options.onBack()
  );
  attachSwipeBack(container, options.onBack);
}

/* Canvas rendering. The painter mirrors the DOM card so the PNG and a
 * native screenshot look the same. */

const CARD_WIDTH = 360;
const CARD_PAD = 28;
const PNG_SCALE = 2;
const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

interface Palette {
  bg: string;
  surface: string;
  border: string;
  accent: string;
  muted: string;
  text: string;
  falling: string;
  rising: string;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const v = (name: string): string => style.getPropertyValue(name).trim();
  return {
    bg: v('--color-bg'),
    surface: v('--color-surface'),
    border: 'rgba(255, 255, 255, 0.1)',
    accent: v('--color-accent'),
    muted: v('--color-text-muted'),
    text: v('--color-text'),
    falling: v('--color-falling'),
    rising: v('--color-rising'),
  };
}

function tendencyColor(tendency: Tendency, palette: Palette): string {
  if (tendency === 'steady') return palette.muted;
  return tendency.startsWith('falling') ? palette.falling : palette.rising;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/).filter((w) => w !== '');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const attempt = current === '' ? word : `${current} ${word}`;
    if (ctx.measureText(attempt).width <= maxWidth || current === '') {
      current = attempt;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && current !== '') lines.push(current);
  if (lines.length === maxLines && current !== '' && !lines.includes(current)) {
    const lastIndex = maxLines - 1;
    const last = lines[lastIndex] ?? '';
    let truncated = last;
    while (
      truncated !== '' &&
      ctx.measureText(`${truncated}...`).width > maxWidth
    ) {
      truncated = truncated.slice(0, -1).trimEnd();
    }
    lines[lastIndex] = `${truncated}...`;
  }
  return lines;
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  degrees: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.lineTo(7, 0);
  ctx.moveTo(2, -5.5);
  ctx.lineTo(8, 0);
  ctx.lineTo(2, 5.5);
  ctx.stroke();
  ctx.restore();
}

function downloadPng(model: SnapshotModel, unit: PressureUnit): void {
  const palette = readPalette();
  const measure = document.createElement('canvas').getContext('2d');
  if (measure === null) return;

  const innerWidth = CARD_WIDTH - CARD_PAD * 2;
  let noteLines: string[] = [];
  if (model.note !== null) {
    measure.font = `400 14px ${FONT_STACK}`;
    noteLines = wrapText(measure, model.note.text, innerWidth - 32, 4);
  }
  const noteBlockHeight =
    model.note === null ? 0 : noteLines.length * 20 + 26 + 30;
  const deltasBottom = 306;
  const height =
    model.note === null
      ? deltasBottom + 20
      : deltasBottom + 16 + noteBlockHeight + 20;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * PNG_SCALE;
  canvas.height = height * PNG_SCALE;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return;
  ctx.scale(PNG_SCALE, PNG_SCALE);

  // Card background
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, CARD_WIDTH, height);
  ctx.fillStyle = palette.surface;
  roundedRect(ctx, 8, 8, CARD_WIDTH - 16, height - 16, 20);
  ctx.fill();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  roundedRect(ctx, 8.5, 8.5, CARD_WIDTH - 17, height - 17, 20);
  ctx.stroke();

  // Header row
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.accent;
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('PRESSURE LOG', CARD_PAD, 46);
  ctx.fillStyle = palette.muted;
  ctx.font = `400 12px ${FONT_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(formatDayTime(model.latestTimestamp), CARD_WIDTH - CARD_PAD, 46);

  // Big pressure value, centered with the unit on its baseline
  const pressure = formatPressure(inUnit(model.pressureHpa, unit), unit);
  const [valueText = '', unitText = ''] = pressure.split(' ');
  ctx.font = `700 52px ${FONT_STACK}`;
  const valueWidth = ctx.measureText(valueText).width;
  ctx.font = `500 18px ${FONT_STACK}`;
  const unitWidth = ctx.measureText(unitText).width;
  const totalWidth = valueWidth + 10 + unitWidth;
  const startX = (CARD_WIDTH - totalWidth) / 2;
  const valueBaseline = 128;
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.text;
  ctx.font = `700 52px ${FONT_STACK}`;
  ctx.fillText(valueText, startX, valueBaseline);
  ctx.fillStyle = palette.muted;
  ctx.font = `500 18px ${FONT_STACK}`;
  ctx.fillText(unitText, startX + valueWidth + 10, valueBaseline);

  // Tendency arrow and label, centered
  ctx.textAlign = 'center';
  const tendencyBaseline = 172;
  if (model.tendency === null) {
    ctx.fillStyle = palette.muted;
    ctx.font = `400 14px ${FONT_STACK}`;
    ctx.fillText(NO_TREND_TEXT, CARD_WIDTH / 2, tendencyBaseline);
  } else {
    const color = tendencyColor(model.tendency, palette);
    ctx.font = `600 17px ${FONT_STACK}`;
    const labelWidth = ctx.measureText(model.tendency).width;
    const groupWidth = 22 + 10 + labelWidth;
    const groupStart = (CARD_WIDTH - groupWidth) / 2;
    drawArrow(
      ctx,
      groupStart + 11,
      tendencyBaseline - 6,
      TENDENCY_ANGLES[model.tendency],
      color
    );
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.fillText(model.tendency, groupStart + 32, tendencyBaseline);
  }

  // Divider
  ctx.strokeStyle = palette.border;
  ctx.beginPath();
  ctx.moveTo(CARD_PAD, 204);
  ctx.lineTo(CARD_WIDTH - CARD_PAD, 204);
  ctx.stroke();

  // Delta columns
  const columnWidth = (CARD_WIDTH - CARD_PAD * 2) / model.deltas.length;
  model.deltas.forEach((delta, i) => {
    const centerX = CARD_PAD + columnWidth * (i + 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = palette.muted;
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.fillText(`${delta.windowHours} H`, centerX, 238);
    const text = deltaText(model, delta.windowHours, unit);
    ctx.fillStyle = text === null ? palette.muted : palette.text;
    ctx.font = `600 17px ${FONT_STACK}`;
    ctx.fillText(text ?? 'n/a', centerX, 268);
  });

  // Most recent note
  if (model.note !== null) {
    const noteTop = deltasBottom + 16;
    ctx.fillStyle = palette.bg;
    roundedRect(
      ctx,
      CARD_PAD - 8,
      noteTop,
      CARD_WIDTH - (CARD_PAD - 8) * 2,
      noteBlockHeight,
      12
    );
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = palette.text;
    ctx.font = `400 14px ${FONT_STACK}`;
    noteLines.forEach((line, i) => {
      ctx.fillText(line, CARD_PAD + 8, noteTop + 28 + i * 20);
    });
    ctx.fillStyle = palette.muted;
    ctx.font = `400 12px ${FONT_STACK}`;
    ctx.fillText(
      noteMeta(model),
      CARD_PAD + 8,
      noteTop + 28 + noteLines.length * 20 + 12
    );
  }

  canvas.toBlob((blob) => {
    if (blob === null) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pressure-snapshot.png';
    link.click();
    URL.revokeObjectURL(url);
  });
}
