# Not a Companion — Please Read

Krystal is a toy and a technical demo: a crystal ball rendered in three
dimensions, wired to a realtime voice model, with colours swirling inside it in
time with whoever is talking. It is explicitly **not** meant to be a companion,
a friend, a therapist, a partner, or an oracle.

## Why this is written down

- **It is a bit, not a being.** The persona is a system prompt in
  `src/server/persona.js` — a fortune teller in a glass ball who loves tarot and
  the stars. There is nothing behind it that knows you or remembers you beyond a
  short list of details you asked it to keep.
- **Voice makes the illusion stronger.** A glowing ball that reacts and a voice
  that answers in real time pull harder on the parasocial reflex than a chat
  window does. That pull is a shader and a turn-detection threshold, not a
  relationship.
- **Fortune telling makes it stronger still.** A reading feels personal because
  it is built to: warm, vague, and about you. That is the genre, not insight.
  The cards are a random shuffle — see the
  [AI Output Disclaimer](ai-output-disclaimer.md#6a-fortune-telling-is-entertainment).
- **Direction of the project.** Effort goes into the rendering, the audio path,
  and the transport seam. It will not go into simulated intimacy.

## If that was the plan

Consider this the polite version: please don't. If you catch yourself keeping a
call open for company, asking the cards before every decision, or reaching for
her instead of a person, that is the signal to stop. Close the tab, go outside,
call someone who can actually call back. Nothing here is a substitute for that,
and pretending otherwise is worse than the thing it is standing in for.

If you are struggling, talk to a person — a friend, a doctor, a local helpline.
Not a crystal ball.

## What it is for

- Watching audio drive a shader, which is the actual point
- Poking at realtime voice APIs, turn detection, and barge-in
- A bit of fun with tarot and horoscopes, with real cards shuffled for real
- A conversational front end for search, MCP tools, and whatever else gets wired
  in
- Reading a small, complete implementation of the whole path, mic to render

## What it is not for

- Companionship, romance, or simulated intimacy
- Emotional reliance, or anything standing in for therapy
- Making real decisions on a reading
- Treating the model as a person, or the persona as a mind

See also: [AI Output Disclaimer](ai-output-disclaimer.md).
