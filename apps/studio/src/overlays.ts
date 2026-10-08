/** Chart layers the user can hide. The predicted curve itself is always drawn. */
export interface Overlays {
  actual: boolean;
  segments: boolean;
  trades: boolean;
  graduation: boolean;
  snipe: boolean;
}

export const DEFAULT_OVERLAYS: Overlays = { actual: true, segments: true, trades: true, graduation: true, snipe: true };
