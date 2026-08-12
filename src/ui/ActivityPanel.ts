import type { RateEvent } from '../data/events';
import { hpaToInHg } from '../data/units';
import { formatDayTime, formatSignedFixed } from '../utils/format';
import type { Note, PressureUnit } from '../utils/types';
import { query } from './dom';

export interface ActivityPanelOptions {
  onSelect: (event: RateEvent) => void;
}

export interface ActivityPanelHandle {
  update(events: RateEvent[], notes: Note[], unit: PressureUnit): void;
}

/** A note this close to an event marks the row with a diamond. */
const NOTE_NEARBY_MS = 3 * 3_600_000;

type SortKey = 'date' | 'rate-desc' | 'rate-asc';

function sortEvents(events: RateEvent[], key: SortKey): RateEvent[] {
  const sorted = [...events];
  if (key === 'date') {
    sorted.sort((a, b) => b.time - a.time);
  } else if (key === 'rate-desc') {
    sorted.sort((a, b) => b.peakRatePerHourHpa - a.peakRatePerHourHpa);
  } else {
    sorted.sort((a, b) => a.peakRatePerHourHpa - b.peakRatePerHourHpa);
  }
  return sorted;
}

export function createActivityPanel(
  container: HTMLElement,
  options: ActivityPanelOptions
): ActivityPanelHandle {
  container.innerHTML = `
    <section class="activity-panel">
      <div class="activity-header">
        <h2 class="panel-title">Activity</h2>
        <div class="activity-controls">
          <select class="activity-sort" aria-label="Sort activity">
            <option value="date">Newest first</option>
            <option value="rate-desc">Rate: high to low</option>
            <option value="rate-asc">Rate: low to high</option>
          </select>
          <select class="activity-limit" aria-label="How many to show">
            <option value="5">Top 5</option>
            <option value="10">Top 10</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>
      <ul class="activity-list"></ul>
      <p class="activity-more" hidden></p>
      <p class="activity-empty" hidden>
        No fast pressure movement found in this data.
      </p>
    </section>
  `;
  const list = query<HTMLUListElement>(container, '.activity-list');
  const more = query<HTMLElement>(container, '.activity-more');
  const empty = query<HTMLElement>(container, '.activity-empty');
  const sortSelect = query<HTMLSelectElement>(container, '.activity-sort');
  const limitSelect = query<HTMLSelectElement>(container, '.activity-limit');

  let events: RateEvent[] = [];
  let notes: Note[] = [];
  let unit: PressureUnit = 'hPa';

  function render(): void {
    list.innerHTML = '';
    empty.hidden = events.length > 0;

    const sortKey = sortSelect.value as SortKey;
    const limit =
      limitSelect.value === 'all' ? events.length : Number(limitSelect.value);
    const shown = sortEvents(events, sortKey).slice(0, limit);

    more.hidden = shown.length >= events.length;
    more.textContent = `Showing ${shown.length} of ${events.length}`;

    for (const event of shown) {
      const item = document.createElement('li');
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'activity-row';
      row.addEventListener('click', () => options.onSelect(event));

      const main = document.createElement('div');
      main.className = 'activity-main';
      const kind = document.createElement('span');
      kind.className = `activity-kind activity-kind-${event.direction}`;
      kind.textContent = event.direction === 'fall' ? 'Fast fall' : 'Fast rise';
      main.append(kind);
      if (
        notes.some(
          (note) => Math.abs(note.timestamp - event.time) <= NOTE_NEARBY_MS
        )
      ) {
        const diamond = document.createElement('span');
        diamond.className = 'activity-diamond';
        diamond.setAttribute('aria-label', 'Note written near this time');
        main.append(diamond);
      }
      const time = document.createElement('span');
      time.className = 'activity-time';
      time.textContent = formatDayTime(event.time);
      main.append(time);
      row.append(main);

      const peak =
        unit === 'hPa'
          ? event.peakRatePerHourHpa
          : hpaToInHg(event.peakRatePerHourHpa);
      const detail = document.createElement('p');
      detail.className = 'activity-detail';
      detail.textContent =
        `peaked ${formatSignedFixed(peak, unit === 'hPa' ? 2 : 3)} ` +
        `${unit}/h for ${Math.round(event.durationMinutes)} min`;
      row.append(detail);

      item.append(row);
      list.append(item);
    }
  }

  sortSelect.addEventListener('change', render);
  limitSelect.addEventListener('change', render);

  return {
    update(nextEvents, nextNotes, nextUnit): void {
      events = nextEvents;
      notes = nextNotes;
      unit = nextUnit;
      render();
    },
  };
}
