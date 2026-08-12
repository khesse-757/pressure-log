import { rateOfChange } from '../data/rateOfChange';
import { tendencyForDelta } from '../data/tendency';
import { hpaToInHg } from '../data/units';
import { RATE_WINDOWS_HOURS } from '../utils/constants';
import { formatDayTime, formatSignedPressure } from '../utils/format';
import type { PressureUnit, Series } from '../utils/types';
import { query } from './dom';

export interface RatePanelHandle {
  /** cursorTime null means live mode at the newest reading. canInspect
   * shows the Inspect button while scrubbing. */
  update(
    series: Series,
    cursorTime: number | null,
    unit: PressureUnit,
    canInspect?: boolean
  ): void;
}

export interface RatePanelOptions {
  onLatest: () => void;
  /** Jump to detail mode anchored on the scrubbed moment. */
  onInspect?: (time: number) => void;
}

interface RowCells {
  delta: HTMLTableCellElement;
  rate: HTMLTableCellElement;
  tendency: HTMLTableCellElement;
}

export function createRatePanel(
  container: HTMLElement,
  options: RatePanelOptions
): RatePanelHandle {
  container.innerHTML = `
    <section class="rate-panel">
      <div class="rate-header">
        <h2 class="panel-title">Rate of change</h2>
        <div class="rate-mode">
          <span class="rate-moment"></span>
          <button type="button" class="text-button rate-inspect" hidden>
            Inspect
          </button>
          <button type="button" class="text-button rate-latest" hidden>
            Latest
          </button>
        </div>
      </div>
      <table class="rate-table">
        <thead>
          <tr>
            <th class="rate-col-window">Window</th>
            <th>Delta</th>
            <th>Per hour</th>
            <th>Tendency</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </section>
  `;

  const panel = query<HTMLElement>(container, '.rate-panel');
  const moment = query<HTMLElement>(container, '.rate-moment');
  const latestButton = query<HTMLButtonElement>(container, '.rate-latest');
  const inspectButton = query<HTMLButtonElement>(container, '.rate-inspect');
  const body = query<HTMLTableSectionElement>(container, 'tbody');
  latestButton.addEventListener('click', () => options.onLatest());

  let scrubbedTime: number | null = null;
  inspectButton.addEventListener('click', () => {
    if (scrubbedTime !== null) options.onInspect?.(scrubbedTime);
  });

  const rows = new Map<number, RowCells>();
  for (const hours of RATE_WINDOWS_HOURS) {
    const tr = document.createElement('tr');
    const windowCell = document.createElement('td');
    windowCell.className = 'rate-window';
    windowCell.textContent = `${hours} h`;
    const delta = document.createElement('td');
    const rate = document.createElement('td');
    const tendency = document.createElement('td');
    tr.append(windowCell, delta, rate, tendency);
    body.append(tr);
    rows.set(hours, { delta, rate, tendency });
  }

  function setMessage(row: RowCells, message: string): void {
    row.delta.colSpan = 3;
    row.delta.className = 'rate-message';
    row.delta.textContent = message;
    row.rate.hidden = true;
    row.tendency.hidden = true;
  }

  function setValues(
    row: RowCells,
    deltaText: string,
    rateText: string,
    tendencyLabel: string
  ): void {
    row.delta.colSpan = 1;
    row.delta.className = 'rate-delta';
    row.delta.textContent = deltaText;
    row.rate.hidden = false;
    row.rate.className = 'rate-delta';
    row.rate.textContent = rateText;
    row.tendency.hidden = false;
    row.tendency.className = `rate-tendency tendency-${tendencyLabel.replace(' ', '-')}`;
    row.tendency.textContent = tendencyLabel;
  }

  return {
    update(series, cursorTime, unit, canInspect = false): void {
      const latest = series.timestamps[series.timestamps.length - 1] ?? null;
      const endTime = cursorTime ?? latest;
      const scrubbing = cursorTime !== null;
      scrubbedTime = cursorTime;
      panel.classList.toggle('rate-panel-scrubbing', scrubbing);
      latestButton.hidden = !scrubbing;
      inspectButton.hidden = !(
        scrubbing &&
        canInspect &&
        options.onInspect !== undefined
      );
      moment.textContent =
        endTime === null
          ? 'No data loaded'
          : scrubbing
            ? `At ${formatDayTime(endTime)}`
            : `Latest, ${formatDayTime(endTime)}`;

      for (const hours of RATE_WINDOWS_HOURS) {
        const row = rows.get(hours);
        if (row === undefined) continue;
        const result =
          endTime === null ? null : rateOfChange(series, hours, endTime);
        if (result === null) {
          setMessage(row, 'no data');
          continue;
        }
        if (!result.fullCoverage) {
          setMessage(row, `only ${result.coverageHours.toFixed(1)} h of data`);
          continue;
        }
        const delta =
          unit === 'hPa' ? result.deltaHpa : hpaToInHg(result.deltaHpa);
        const rate =
          unit === 'hPa'
            ? result.ratePerHourHpa
            : hpaToInHg(result.ratePerHourHpa);
        setValues(
          row,
          formatSignedPressure(delta, unit),
          `${formatSignedPressure(rate, unit)}/h`,
          tendencyForDelta(result.ratePerHourHpa * 3)
        );
      }
    },
  };
}
