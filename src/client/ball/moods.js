/**
 * What each conversational state does to the visions. `speed` is how fast the
 * mist moves, `swirl` how hard the vortex twists, `churn` how much the wisps
 * curl and split, `glow` how bright it all is, `core` the light at the heart
 * of the ball, and `hue` where on the palette the colours sit — 0 rose, 0.15
 * gold, 0.45 teal, 0.6 blue, 0.75 violet, 0.9 magenta.
 */
export const MOODS = {
  idle:      { speed: 0.20, swirl: 2.0, churn: 0.50, glow: 0.80, core: 0.20, hue: 0.74 },
  listening: { speed: 0.32, swirl: 2.4, churn: 0.58, glow: 0.95, core: 0.32, hue: 0.56 },
  thinking:  { speed: 0.90, swirl: 3.6, churn: 0.82, glow: 1.15, core: 0.65, hue: 0.88 },
  speaking:  { speed: 0.48, swirl: 2.8, churn: 0.64, glow: 1.10, core: 0.48, hue: 0.06 },
};

/** How far a loud moment pushes past the mood: brighter, faster, a brighter heart. */
export const ENERGY_GAIN = { glow: 0.55, speed: 0.5, core: 0.4 };
