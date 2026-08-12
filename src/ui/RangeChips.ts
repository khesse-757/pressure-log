import { RANGES_DAYS } from '../utils/constants';
import type { RangeSelection } from '../utils/types';
import { renderChips, type ChipOption } from './chips';

export function renderRangeChips(
  container: HTMLElement,
  selected: RangeSelection,
  onSelect: (range: RangeSelection) => void
): void {
  const options: Array<ChipOption<RangeSelection>> = [
    ...RANGES_DAYS.map((days) => ({ label: `${days} d`, value: days })),
    { label: 'All', value: 'all' as RangeSelection },
  ];
  renderChips(container, options, selected, onSelect);
}
