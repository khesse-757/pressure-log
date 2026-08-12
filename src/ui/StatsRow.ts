import type { SeriesStats } from '../data/seriesStats';
import { hpaToInHg } from '../data/units';
import { formatPressure } from '../utils/format';
import type { PressureUnit } from '../utils/types';

export function renderStatsRow(
  container: HTMLElement,
  stats: SeriesStats | null,
  unit: PressureUnit
): void {
  if (stats === null) {
    container.innerHTML = '<p class="stats-empty">No data in this range</p>';
    return;
  }
  const display = (hpa: number): string =>
    formatPressure(unit === 'hPa' ? hpa : hpaToInHg(hpa), unit);
  const cells: Array<[string, string]> = [
    ['Min', display(stats.min)],
    ['Max', display(stats.max)],
    ['Average', display(stats.average)],
    ['Latest', display(stats.latest)],
  ];
  container.innerHTML = cells
    .map(
      ([label, value]) =>
        `<div class="stat">` +
        `<span class="stat-label">${label}</span>` +
        `<span class="stat-value">${value}</span>` +
        `</div>`
    )
    .join('');
}
