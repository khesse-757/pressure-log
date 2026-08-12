export interface ChipOption<T> {
  label: string;
  value: T;
}

/** Renders a row of selectable chips into the container. */
export function renderChips<T>(
  container: HTMLElement,
  options: ReadonlyArray<ChipOption<T>>,
  selected: T,
  onSelect: (value: T) => void
): void {
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
