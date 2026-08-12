/** International inch of mercury at 0 degrees C. */
export const HPA_PER_INHG = 33.863886666667;

export function hpaToInHg(hpa: number): number {
  return hpa / HPA_PER_INHG;
}

export function inHgToHpa(inHg: number): number {
  return inHg * HPA_PER_INHG;
}
