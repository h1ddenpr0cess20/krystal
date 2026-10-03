/**
 * A real deck, shuffled for real. Left to choose its own cards, a language
 * model draws the same handful of famous ones over and over; this is the
 * Rider–Waite–Smith seventy-eight, a Fisher–Yates shuffle, and a coin for
 * each card's way up.
 */
export const MAJOR = Object.freeze([
  'The Fool', 'The Magician', 'The High Priestess', 'The Empress', 'The Emperor',
  'The Hierophant', 'The Lovers', 'The Chariot', 'Strength', 'The Hermit',
  'Wheel of Fortune', 'Justice', 'The Hanged Man', 'Death', 'Temperance',
  'The Devil', 'The Tower', 'The Star', 'The Moon', 'The Sun', 'Judgement', 'The World',
]);

export const SUITS = Object.freeze(['Wands', 'Cups', 'Swords', 'Pentacles']);

export const RANKS = Object.freeze([
  'Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Page', 'Knight', 'Queen', 'King',
]);

export const DECK = Object.freeze([
  ...MAJOR,
  ...SUITS.flatMap((suit) => RANKS.map((rank) => `${rank} of ${suit}`)),
]);

/** What each place in a spread stands for, in the order the cards are laid. */
export const POSITIONS = Object.freeze({
  single: ['the answer'],
  three: ['past', 'present', 'future'],
  celtic_cross: [
    'the heart of the matter', 'what crosses it', 'what lies beneath', 'what is passing',
    'what crowns it', 'what is coming', 'the self', 'the surroundings',
    'hopes and fears', 'the outcome',
  ],
});

/** A reversal is a coin toss per card, as it is when a real deck is cut and turned. */
const REVERSED = 0.5;

export function shuffle(cards, random = Math.random) {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** Lays out one spread from a fresh shuffle. An unknown spread is one card. */
export function drawSpread(spread, { random = Math.random } = {}) {
  const name = Object.hasOwn(POSITIONS, spread) ? spread : 'single';
  const positions = POSITIONS[name];
  const deck = shuffle(DECK, random);
  return {
    spread: name,
    cards: positions.map((position, i) => ({
      position,
      card: deck[i],
      reversed: random() < REVERSED,
    })),
  };
}

/** One card as it would be said: "The Star, reversed". */
export function cardName({ card, reversed }) {
  return reversed ? `${card}, reversed` : card;
}
