import type { PressureUnit } from '../utils/types';
import { renderChips, type ChipOption } from './chips';

const OPTIONS: ReadonlyArray<ChipOption<PressureUnit>> = [
  { label: 'hPa', value: 'hPa' },
  { label: 'inHg', value: 'inHg' },
];

export function renderUnitToggle(
  container: HTMLElement,
  selected: PressureUnit,
  onSelect: (unit: PressureUnit) => void
): void {
  renderChips(container, OPTIONS, selected, onSelect);
}
