import { RANGES_DAYS } from '../utils/constants';
import type { RangeSelection } from '../utils/types';

export function renderRangeChips(
  container: HTMLElement,
  selected: RangeSelection,
  onSelect: (range: RangeSelection) => void
): void {
  const options: Array<{ label: string; value: RangeSelection }> = [
    ...RANGES_DAYS.map((days) => ({ label: `${days} d`, value: days })),
    { label: 'All', value: 'all' as RangeSelection },
  ];
  container.innerHTML = '';
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = option.value === selected ? 'chip chip-active' : 'chip';
    button.textContent = option.label;
    button.addEventListener('click', () => {
      if (option.value !== selected) onSelect(option.value);
    });
    container.append(button);
  }
}
