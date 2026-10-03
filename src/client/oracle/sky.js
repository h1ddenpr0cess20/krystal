/**
 * The calendar a fortune teller needs: what day it is, how the moon stands,
 * and whose season the sun is in. A model has no clock and guesses at all
 * three, so the page works them out — from the browser's own date, which is
 * the person's.
 */

/** The mean length of a lunar month, new moon to new moon, in days. */
export const SYNODIC_MONTH = 29.530588853;

/** A new moon to count from: 6 January 2000, 18:14 UTC. */
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

const DAY = 86_400_000;

/** The phases by name, each an eighth of the month centred on its moment. */
const PHASES = [
  'new moon', 'waxing crescent', 'first quarter', 'waxing gibbous',
  'full moon', 'waning gibbous', 'last quarter', 'waning crescent',
];

/**
 * The tropical zodiac: the day each sign begins on. The cusps move by a day
 * from year to year; this is the table every newspaper horoscope uses.
 */
export const SIGNS = Object.freeze([
  { sign: 'Capricorn', from: [12, 22], element: 'earth' },
  { sign: 'Aquarius', from: [1, 20], element: 'air' },
  { sign: 'Pisces', from: [2, 19], element: 'water' },
  { sign: 'Aries', from: [3, 21], element: 'fire' },
  { sign: 'Taurus', from: [4, 20], element: 'earth' },
  { sign: 'Gemini', from: [5, 21], element: 'air' },
  { sign: 'Cancer', from: [6, 21], element: 'water' },
  { sign: 'Leo', from: [7, 23], element: 'fire' },
  { sign: 'Virgo', from: [8, 23], element: 'earth' },
  { sign: 'Libra', from: [9, 23], element: 'air' },
  { sign: 'Scorpio', from: [10, 23], element: 'water' },
  { sign: 'Sagittarius', from: [11, 22], element: 'fire' },
]);

export function sunSign(month, day) {
  const at = month * 100 + day;
  let found = SIGNS[0];
  for (const entry of SIGNS.slice(1)) {
    if (at >= entry.from[0] * 100 + entry.from[1]) found = entry;
  }
  if (at >= 1222) found = SIGNS[0];
  return { sign: found.sign, element: found.element };
}

/** The moon on a date, at local noon: its age in days, its phase, and how much is lit. */
export function moonPhase(date) {
  const noon = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  const age = (((noon - NEW_MOON) / DAY) % SYNODIC_MONTH + SYNODIC_MONTH) % SYNODIC_MONTH;
  const turn = age / SYNODIC_MONTH;
  const phase = PHASES[Math.floor(turn * 8 + 0.5) % 8];
  const illuminated = Math.round(((1 - Math.cos(turn * 2 * Math.PI)) / 2) * 100);
  return { phase, illuminated_percent: illuminated, age_days: Math.round(age * 10) / 10 };
}

/**
 * What `read_the_sky` was asked about: today, a whole date, or a birthday
 * given as month and day. Anything that doesn't parse is null, and says so.
 */
export function parseDay(text, today) {
  if (text == null || String(text).trim() === '') return { date: today, year: true };
  const m = /^\s*(?:(\d{4})-)?(\d{1,2})-(\d{1,2})\s*$/.exec(String(text));
  if (!m) return null;
  const year = m[1] ? Number(m[1]) : today.getFullYear();
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return { date, year: Boolean(m[1]) };
}

const LONG = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const SHORT = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long' });

export function readSky(text, { now = () => new Date() } = {}) {
  const today = now();
  const asked = parseDay(text, today);
  if (!asked) return { ok: false, error: 'that is not a date — use YYYY-MM-DD, or MM-DD for a birthday' };

  const { date, year } = asked;
  const sky = {
    ok: true,
    today: LONG.format(today),
    date: year ? LONG.format(date) : SHORT.format(date),
    sun_sign: sunSign(date.getMonth() + 1, date.getDate()),
  };
  /** A birthday with no year has no moon of its own to speak of. */
  if (year) sky.moon = moonPhase(date);
  return sky;
}
