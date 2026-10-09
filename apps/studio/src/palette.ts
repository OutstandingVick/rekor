/**
 * One tone per segment, stepping lightness so neighbours always differ
 * and drifting hue along the logo's mint → violet gradient.
 * Shared by chart terrain and the segment editor so a slider maps to its band.
 */
export function segmentTone(i: number): string {
  const steps = [15, 21, 12, 18, 24, 14, 20, 11, 17, 23, 13, 19, 16, 22, 10, 25];
  // hue drifts from the mark's mint (≈170°) through cyan to violet (≈258°) as price climbs
  const hue = 170 + Math.min(i, 15) * 6;
  return `hsl(${hue} 24% ${steps[i % steps.length]}%)`;
}
