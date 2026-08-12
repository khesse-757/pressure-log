/** querySelector that throws instead of returning null, for elements
 * this code just rendered and therefore knows exist. */
export function query<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (element === null) throw new Error(`Missing element: ${selector}`);
  return element;
}
