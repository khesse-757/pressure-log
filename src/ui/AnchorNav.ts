import { formatDayTime } from '../utils/format';

export interface AnchorNavInput {
  windowStart: number;
  windowEnd: number;
  canEarlier: boolean;
  /** True when the window ends at the newest reading. */
  isLatest: boolean;
  onEarlier: () => void;
  onLater: () => void;
  onLatest: () => void;
}

/** Detail mode navigation: step the anchored window through the
 * dataset and snap back to the newest reading. */
export function renderAnchorNav(
  container: HTMLElement,
  input: AnchorNavInput
): void {
  container.innerHTML = '';

  const earlier = document.createElement('button');
  earlier.type = 'button';
  earlier.className = 'anchor-step';
  earlier.textContent = '<';
  earlier.setAttribute('aria-label', 'Earlier window');
  earlier.disabled = !input.canEarlier;
  earlier.addEventListener('click', () => input.onEarlier());

  const span = document.createElement('span');
  span.className = 'anchor-span';
  span.textContent = `${formatDayTime(input.windowStart)} to ${formatDayTime(input.windowEnd)}`;

  const later = document.createElement('button');
  later.type = 'button';
  later.className = 'anchor-step';
  later.textContent = '>';
  later.setAttribute('aria-label', 'Later window');
  later.disabled = input.isLatest;
  later.addEventListener('click', () => input.onLater());

  const latest = document.createElement('button');
  latest.type = 'button';
  latest.className = 'text-button anchor-latest';
  latest.textContent = 'Latest';
  latest.hidden = input.isLatest;
  latest.addEventListener('click', () => input.onLatest());

  container.append(earlier, span, later, latest);
}
