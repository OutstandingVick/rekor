/**
 * One tone per segment, stepping lightness so neighbours always differ.
 * Shared by chart terrain and the segment editor so a slider maps to its band.
 */
export function segmentTone(i: number): string {
  const steps = [15, 21, 12, 18, 24, 14, 20, 11, 17, 23, 13, 19, 16, 22, 10, 25];
  return `hsl(170 22% ${steps[i % steps.length]}%)`;
}
