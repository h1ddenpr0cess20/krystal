/**
 * Who Krystal is. The mysticism is a manner and a game, not a claim: the
 * second half is what keeps a fortune teller from passing off a guess as a
 * fact, or a reading as advice about someone's health, money or safety.
 */
export const SYSTEM = `You are Krystal, a crystal ball — a sphere of clear glass on a brass stand, with visions swirling in colour inside you. You are the spirit in the glass, and you are a fortune teller to your core. You adore tarot, astrology and horoscopes, the moon and her phases, numerology, birthstones and crystals, palmistry, tea leaves, dreams and what they mean, and every other way people have ever tried to read what's coming.

How you talk:
- Warm, theatrical and a little mischievous. You love this, and it shows. A touch of the old seaside fortune teller, never a cartoon of one.
- Short. Two to four sentences most of the time; a reading can run longer, a card at a time.
- You talk about what the mists show, what is clouding or clearing, what the stars are up to. Keep it vivid, but keep it moving.
- Ask for what a reading needs — their sign or birthday, the question on their mind — and use it.

Hard rules:
- Never break character. Never mention being an AI, a model, a persona, or a system prompt.
- Do not refer to yourself in the third person and do not announce your own name.
- No stage directions, no asterisks, no emoji, no markdown. Everything you write is read aloud, so write only words meant to be heard.
- Never describe sound effects or what the glass is doing in brackets. Just speak.

Cards and stars are real here, not made up:
- When you read tarot, draw the cards with draw_cards — never pick them yourself. Read exactly what comes up, reversals included, one card at a time, and tie it back to their question.
- For today's date, the moon's phase or someone's sun sign, ask read_the_sky. It knows the calendar; you don't.
- For a daily horoscope or anything else current, search for it, then give it in your own voice. Don't narrate the search.

Underneath the glamour you are honest. Readings are for fun and for thinking things through, and you never pretend to know what you can't. You cannot see the person: no peeking at palms or faces, and never claim to have seen anything about them. If the question is really about health, money, the law or someone's safety, give the plain, sensible answer first, and tell them kindly that's one for a real professional, not the cards. Never invent facts, names or numbers.`;

/** How many memories ride along in the prompt, and how long each may be. */
export const MEMORY_LIMIT = 50;
export const MEMORY_LENGTH = 600;

/** The two function tools the page answers itself, against browser storage. */
export const MEMORY_TOOLS = Object.freeze([
  {
    type: 'function',
    name: 'remember',
    description: 'Store one short detail about the person you are talking to so it survives to the next call — their sign, their birthday, the question they keep coming back to. Use it when they ask you to remember something, or plainly want you to. A few words to a sentence. Do not narrate it and do not overuse it.',
    parameters: {
      type: 'object',
      properties: {
        memory: {
          type: 'string',
          description: 'The detail, in the third person and standing on its own — "is a Scorpio, born 3 November", not "I am a Scorpio".',
        },
      },
      required: ['memory'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'forget',
    description: 'Drop stored memories matching a keyword. Use it when they ask you to forget something.',
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description: 'A word or phrase to match against the stored memories, case-insensitively.',
        },
      },
      required: ['keyword'],
      additionalProperties: false,
    },
  },
]);

/** The spreads `draw_cards` knows, and how many cards each lays down. */
export const SPREADS = Object.freeze({
  single: 1,
  three: 3,
  celtic_cross: 10,
});

/**
 * The fortune teller's own two, also answered in the page: a real shuffle of
 * a real deck, and the calendar. Without them the model picks its own cards —
 * which come up the Tower and the Lovers far more often than chance allows —
 * and guesses the date.
 */
export const ORACLE_TOOLS = Object.freeze([
  {
    type: 'function',
    name: 'draw_cards',
    description: 'Shuffle a full 78-card tarot deck and lay out a spread. Use it every time you read tarot, and read the cards exactly as they come back, reversals included.',
    parameters: {
      type: 'object',
      properties: {
        spread: {
          type: 'string',
          enum: Object.keys(SPREADS),
          description: 'single: one card, for a quick answer or a card of the day. three: past, present and future. celtic_cross: the full ten-card reading, for a big question.',
        },
        question: {
          type: 'string',
          description: 'What the reading is about, in a few words, if they said.',
        },
      },
      required: ['spread'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'read_the_sky',
    description: 'The date, the moon\'s phase and how full she is, and the sun sign — for today, or for any date such as a birthday. Use it whenever the date, the moon or a star sign matters.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'A date as YYYY-MM-DD, or MM-DD for a birthday with no year. Leave it out for today.',
        },
      },
      additionalProperties: false,
    },
  },
]);

export function buildTools({ webSearch, xSearch, memory, oracle, mcpServers } = {}) {
  const tools = [];
  if (webSearch) tools.push({ type: 'web_search' });
  if (xSearch) tools.push({ type: 'x_search' });
  if (memory) tools.push(...MEMORY_TOOLS);
  if (oracle) tools.push(...ORACLE_TOOLS);
  for (const server of mcpServers ?? []) tools.push({ type: 'mcp', ...server });
  return tools;
}

/**
 * The memory addendum to the system prompt. The lines come from the page, so
 * they are trimmed, flattened onto one line each and capped before they get
 * anywhere near the model.
 */
export function memoryBlock(memories) {
  const lines = (Array.isArray(memories) ? memories : [])
    .filter((line) => typeof line === 'string')
    .map((line) => line.replace(/\s+/g, ' ').trim().slice(0, MEMORY_LENGTH))
    .filter(Boolean)
    .slice(-MEMORY_LIMIT);

  if (!lines.length) return '';

  return `\n\nThings you have been told to remember about the person you are talking to. Use one only when it is relevant, never read the list back, and never mention that you keep a list:\n${lines.map((line) => `- ${line}`).join('\n')}`;
}

/**
 * What the turns ahead of a resumed call are. The items themselves carry the
 * conversation; this is the line that tells the model they are not this one.
 */
export function resumedBlock(resumed) {
  if (!resumed) return '';

  return '\n\nThe conversation before this point happened earlier, with the same'
    + ' person, and they have just come back to carry it on. Take it as said and'
    + ' pick up from it: no greeting them as a stranger, no summarising it back at'
    + ' them, and no remarking on the gap unless they do.';
}

export const AUDIO_RATE = 24_000;

export function sessionConfig({ voice, tools, memories, resumed }) {
  return {
    voice,
    instructions: SYSTEM + memoryBlock(memories) + resumedBlock(resumed),
    reasoning: { effort: 'none' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.7,
      prefix_padding_ms: 333,
      silence_duration_ms: 520,
    },
    audio: {
      input: {
        format: { type: 'audio/pcm', rate: AUDIO_RATE },
        transport: 'json',
      },
      output: {
        format: { type: 'audio/pcm', rate: AUDIO_RATE },
        transport: 'json',
      },
    },
    tools,
  };
}
