/** Logo stripe hues: sky, green, pink — in that order along the curve. */
const STRIPES = [
  { h: 205, s: 45 },
  { h: 126, s: 38 },
  { h: 345, s: 48 },
];

/**
 * One tone per segment, echoing the logo: the first third of segments is
 * sky-tinted, the middle green, the last pink. Lightness alternates so
 * neighbouring segments in the same colour band stay distinct.
 */
export function segmentTone(i: number, count: number): string {
  const band = STRIPES[Math.min(STRIPES.length - 1, Math.floor((i / Math.max(1, count)) * STRIPES.length))];
  const light = i % 2 === 0 ? 17 : 23;
  return `hsl(${band.h} ${band.s}% ${light}%)`;
}
