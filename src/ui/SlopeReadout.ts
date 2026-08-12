import { slopeTendency, type SlopeResult } from '../data/slope';
import { hpaToInHg } from '../data/units';
import { SLOPE_WINDOW_MINUTES } from '../utils/constants';
import { formatDayTime, formatSignedFixed } from '../utils/format';
import type { PressureUnit } from '../utils/types';
import { query } from './dom';

export interface SlopeReadoutInput {
  slope: SlopeResult | null;
  /** Moment the slope window ends at, or null when there is no data. */
  timestamp: number | null;
  /** True while the scrubber is placed on a past moment. */
  scrubbing: boolean;
  unit: PressureUnit;
}

export interface SlopeReadoutHandle {
  update(input: SlopeReadoutInput): void;
}

export function createSlopeReadout(container: HTMLElement): SlopeReadoutHandle {
  container.innerHTML = `
    <section class="slope-readout">
      <div class="slope-readout-main">
        <span class="slope-rate-min"></span>
        <span class="slope-rate-hour"></span>
        <span class="slope-tendency-label"></span>
      </div>
      <p class="slope-caption"></p>
    </section>
  `;
  const rateMin = query<HTMLElement>(container, '.slope-rate-min');
  const rateHour = query<HTMLElement>(container, '.slope-rate-hour');
  const label = query<HTMLElement>(container, '.slope-tendency-label');
  const caption = query<HTMLElement>(container, '.slope-caption');

  return {
    update({ slope, timestamp, scrubbing, unit }: SlopeReadoutInput): void {
      caption.textContent =
        scrubbing && timestamp !== null
          ? `Slope of the ${SLOPE_WINDOW_MINUTES} minutes before ` +
            formatDayTime(timestamp)
          : `Slope of the last ${SLOPE_WINDOW_MINUTES} minutes`;

      if (slope === null) {
        rateMin.className = 'slope-rate-min slope-muted';
        rateMin.textContent = 'not enough data in this window';
        rateHour.textContent = '';
        label.textContent = '';
        label.className = 'slope-tendency-label';
        return;
      }

      const perMinute =
        unit === 'hPa'
          ? slope.slopePerMinuteHpa
          : hpaToInHg(slope.slopePerMinuteHpa);
      const perHour =
        unit === 'hPa' ? slope.ratePerHourHpa : hpaToInHg(slope.ratePerHourHpa);
      rateMin.className = 'slope-rate-min';
      rateMin.textContent = `${formatSignedFixed(perMinute, unit === 'hPa' ? 3 : 4)} ${unit}/min`;
      rateHour.textContent = `(${formatSignedFixed(perHour, unit === 'hPa' ? 2 : 3)} ${unit}/h)`;

      const tendency = slopeTendency(slope.slopePerMinuteHpa);
      label.textContent = tendency;
      label.className = `slope-tendency-label tendency-${tendency.replace(' ', '-')}`;
    },
  };
}
