import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { moonPhase, parseDay, readSky, sunSign } from '../../src/client/oracle/sky.js';
import { DECK, MAJOR, POSITIONS, cardName, drawSpread, shuffle } from '../../src/client/oracle/tarot.js';
import { createTools, toolLabel } from '../../src/client/session/tools.js';
import { SPREADS } from '../../src/server/persona.js';

/** A seeded generator, so a draw comes out the same way every time. */
function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const day = (y, m, d) => new Date(y, m - 1, d);

describe('the deck', () => {
  it('is the seventy-eight, each card once', () => {
    assert.equal(DECK.length, 78);
    assert.equal(new Set(DECK).size, 78);
    assert.equal(MAJOR.length, 22);
    assert.ok(DECK.includes('The High Priestess'));
    assert.ok(DECK.includes('Queen of Cups'));
    assert.ok(DECK.includes('Ace of Pentacles'));
  });

  it('shuffles into a reordering of itself, and leaves the original alone', () => {
    const shuffled = shuffle(DECK, seeded(7));
    assert.deepEqual([...shuffled].sort(), [...DECK].sort());
    assert.notDeepEqual(shuffled, DECK);
    assert.equal(DECK[0], 'The Fool');
  });

  it('turns up every card somewhere, given enough shuffles', () => {
    const random = seeded(3);
    const seen = new Set();
    for (let i = 0; i < 2000; i++) seen.add(shuffle(DECK, random)[0]);
    assert.equal(seen.size, 78);
  });
});

describe('a spread', () => {
  it('lays down as many cards as it has places, never the same card twice', () => {
    for (const [spread, places] of Object.entries(POSITIONS)) {
      const { cards } = drawSpread(spread, { random: seeded(11) });
      assert.equal(cards.length, places.length, spread);
      assert.equal(new Set(cards.map((c) => c.card)).size, cards.length, spread);
      assert.deepEqual(cards.map((c) => c.position), places);
    }
  });

  it('is the same shape the server tells the model about', () => {
    assert.deepEqual(Object.keys(SPREADS).sort(), Object.keys(POSITIONS).sort());
    for (const [spread, count] of Object.entries(SPREADS)) assert.equal(POSITIONS[spread].length, count);
  });

  it('turns roughly half the cards upside down', () => {
    const random = seeded(5);
    let reversed = 0;
    let total = 0;
    for (let i = 0; i < 300; i++) {
      for (const card of drawSpread('celtic_cross', { random }).cards) {
        total++;
        if (card.reversed) reversed++;
      }
    }
    assert.ok(reversed / total > 0.4 && reversed / total < 0.6, `${reversed} of ${total}`);
  });

  it('falls back to one card for a spread it does not know', () => {
    const drawn = drawSpread('tea leaves', { random: seeded(2) });
    assert.equal(drawn.spread, 'single');
    assert.equal(drawn.cards.length, 1);
  });

  it('says a reversed card the way a reader would', () => {
    assert.equal(cardName({ card: 'The Star', reversed: true }), 'The Star, reversed');
    assert.equal(cardName({ card: 'The Star', reversed: false }), 'The Star');
  });
});

describe('the sky', () => {
  it('knows the signs, cusps and all', () => {
    assert.equal(sunSign(3, 20).sign, 'Pisces');
    assert.equal(sunSign(3, 21).sign, 'Aries');
    assert.equal(sunSign(12, 21).sign, 'Sagittarius');
    assert.equal(sunSign(12, 22).sign, 'Capricorn');
    assert.equal(sunSign(1, 19).sign, 'Capricorn');
    assert.equal(sunSign(1, 20).sign, 'Aquarius');
    assert.equal(sunSign(11, 3).sign, 'Scorpio');
    assert.equal(sunSign(11, 3).element, 'water');
  });

  it('finds new and full moons where the almanac has them', () => {
    // The total eclipse of 8 April 2024 was a new moon; 5 November 2025 a full one.
    assert.equal(moonPhase(day(2024, 4, 8)).phase, 'new moon');
    assert.equal(moonPhase(day(2024, 4, 23)).phase, 'full moon');
    assert.equal(moonPhase(day(2025, 10, 21)).phase, 'new moon');
    assert.equal(moonPhase(day(2025, 11, 5)).phase, 'full moon');
    assert.equal(moonPhase(day(2025, 11, 5)).illuminated_percent, 100);
    assert.equal(moonPhase(day(2024, 4, 8)).illuminated_percent, 0);
  });

  it('reads a date, a birthday, or today, and turns down anything else', () => {
    const today = day(2026, 10, 3);
    assert.equal(parseDay('', today).date, today);
    assert.equal(parseDay('1990-11-03', today).year, true);
    assert.equal(parseDay('11-03', today).year, false);
    assert.equal(parseDay('2026-02-30', today), null);
    assert.equal(parseDay('next tuesday', today), null);
  });

  it('gives the moon for a whole date, and only the sign for a birthday', () => {
    const now = () => day(2026, 10, 3);
    const today = readSky(undefined, { now });
    assert.equal(today.ok, true);
    assert.match(today.today, /Saturday,? 3 October 2026/);
    assert.equal(today.sun_sign.sign, 'Libra');
    assert.ok(today.moon.phase);

    const birthday = readSky('07-23', { now });
    assert.equal(birthday.sun_sign.sign, 'Leo');
    assert.equal(birthday.moon, undefined);

    assert.equal(readSky('soon', { now }).ok, false);
  });
});

describe('the oracle tools the model calls', () => {
  it('draws the spread it is asked for, with each card said aloud', () => {
    const tools = createTools({ random: seeded(9) });
    const drawn = tools.draw_cards({ spread: 'three', question: 'the new job' });
    assert.equal(drawn.ok, true);
    assert.equal(drawn.spread, 'three');
    assert.equal(drawn.question, 'the new job');
    assert.deepEqual(drawn.cards.map((c) => c.position), ['past', 'present', 'future']);
    for (const card of drawn.cards) assert.equal(card.said, cardName(card));
  });

  it('reads the sky from the page clock', () => {
    const tools = createTools({ now: () => day(2026, 3, 21) });
    assert.equal(tools.read_the_sky({}).sun_sign.sign, 'Aries');
  });

  it('runs without a memory, and only then without the memory tools', () => {
    const tools = createTools({});
    assert.equal(typeof tools.draw_cards, 'function');
    assert.equal(tools.remember, undefined);
  });

  it('puts a label up while they work', () => {
    assert.equal(toolLabel('draw_cards'), 'shuffling the cards');
    assert.equal(toolLabel('read_the_sky'), 'reading the sky');
  });
});
