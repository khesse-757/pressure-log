import type { PressureUnit } from '../utils/types';

const UNITS: PressureUnit[] = ['hPa', 'inHg'];

export function renderUnitToggle(
  container: HTMLElement,
  selected: PressureUnit,
  onSelect: (unit: PressureUnit) => void
): void {
  container.innerHTML = '';
  for (const unit of UNITS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = unit === selected ? 'chip chip-active' : 'chip';
    button.textContent = unit;
    button.addEventListener('click', () => {
      if (unit !== selected) onSelect(unit);
    });
    container.append(button);
  }
}
