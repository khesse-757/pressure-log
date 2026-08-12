/** Distance a touch must travel rightward to count as a back swipe. */
const SWIPE_BACK_PX = 70;

/** Calls onBack when the user swipes right anywhere on the element.
 * Listeners are passive, so vertical scrolling is never blocked, and
 * a mostly-vertical gesture is ignored. */
export function attachSwipeBack(
  element: HTMLElement,
  onBack: () => void
): void {
  let start: { x: number; y: number } | null = null;
  let fired = false;

  element.addEventListener(
    'touchstart',
    (event) => {
      if (event.touches.length !== 1) {
        start = null;
        return;
      }
      const point = event.touches[0];
      if (point === undefined) return;
      start = { x: point.clientX, y: point.clientY };
      fired = false;
    },
    { passive: true }
  );

  element.addEventListener(
    'touchmove',
    (event) => {
      if (start === null || fired) return;
      const point = event.touches[0];
      if (point === undefined) return;
      const dx = point.clientX - start.x;
      const dy = Math.abs(point.clientY - start.y);
      if (dx > SWIPE_BACK_PX && dx > dy * 1.5) {
        fired = true;
        onBack();
      }
    },
    { passive: true }
  );

  element.addEventListener(
    'touchend',
    () => {
      start = null;
    },
    { passive: true }
  );
}
