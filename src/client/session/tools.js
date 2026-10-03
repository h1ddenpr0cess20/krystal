import { readSky } from '../oracle/sky.js';
import { cardName, drawSpread } from '../oracle/tarot.js';

const LABELS = {
  remember: 'remembering that',
  forget: 'forgetting that',
  draw_cards: 'shuffling the cards',
  read_the_sky: 'reading the sky',
};

/** The HUD caption for a tool call, or null for a name nobody labels. */
export function toolLabel(name) {
  return LABELS[name] ?? null;
}

function memoryTools(memory) {
  return {
    remember(args) {
      if (!memory.enabled) return { ok: false, error: 'memory is switched off' };
      const stored = memory.add(args?.memory);
      if (!stored) return { ok: false, error: 'nothing worth storing in that' };
      return { ok: true, remembered: stored.text, total: memory.items.length };
    },

    forget(args) {
      if (!memory.enabled) return { ok: false, error: 'memory is switched off' };
      const keyword = typeof args?.keyword === 'string' ? args.keyword : '';
      if (!keyword.trim()) return { ok: false, error: 'no keyword to match on' };
      const forgotten = memory.forget(keyword);
      if (!forgotten.length) return { ok: false, keyword, error: 'nothing stored matches that' };
      return { ok: true, keyword, forgotten, total: memory.items.length };
    },
  };
}

/** The deck and the calendar. `random` and `now` are injectable for the tests. */
function oracleTools({ random, now }) {
  return {
    draw_cards(args) {
      const { spread, cards } = drawSpread(args?.spread, { random });
      return {
        ok: true,
        spread,
        question: typeof args?.question === 'string' ? args.question.slice(0, 200) : undefined,
        cards: cards.map((card) => ({ ...card, said: cardName(card) })),
      };
    },

    read_the_sky(args) {
      return readSky(args?.date, { now });
    },
  };
}

/**
 * The client-side function tools, keyed by the name the model calls. Each one
 * takes the parsed arguments and returns the object sent back as the call's
 * output. Memory is only here where there is a memory to keep it in.
 */
export function createTools({ memory, random = Math.random, now = () => new Date() } = {}) {
  return {
    ...(memory ? memoryTools(memory) : {}),
    ...oracleTools({ random, now }),
  };
}
