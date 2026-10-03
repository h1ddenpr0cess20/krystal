# Design notes

How Krystal is put together. The [README](../README.md) covers running it;
[configuration](configuration.md) covers the knobs.

The call — the proxy, the audio path, the storage — is Rock's, from the same
author, and works the same way. The ball and the visions are new, and the glass
is Alan's.

## How the call is wired

Every frame of audio goes through the Node process:

```
browser  ──ws──▶  /realtime  ──ws──▶  wss://api.x.ai/v1/realtime
```

Unlike OpenAI's Realtime API, the browser can't dial xAI directly.
`/v1/realtime/client_secrets` takes no `session` field, so a page dialling xAI
itself would have to send its own `session.update` — putting the persona, the
tool list and any MCP `authorization` header in client code. The token also
lasts five minutes, and conversations routinely outlive that.

So the socket lives here and the page holds no credential. On connect the proxy
sends `session.update` — persona, voice, turn detection, audio format, tools —
before forwarding anything the page queued.

What the page may send upstream is an allowlist: audio frames, a typed message,
a request to respond, a cancel, and the output of a function call it ran itself.
Two things are dropped as persona overrides — a `session.update` from the
browser, and the `instructions` field on a `response.create`.
`test/server/realtime.test.js` covers that.

Two frame types never reach xAI. `session.memory` carries what the page has
stored; the proxy folds those lines into the instructions and re-sends its own
`session.update`, so the persona stays here and the memories stay in the
browser. `session.tools` names the tools the page has switched off, and the
proxy re-declares the session without them — a subtraction only, checked against
the tools this server actually has, so a page can narrow what the model may
reach for and can never widen it.

The proxy answers no tool calls itself. The searches and MCP run at xAI; the
four function tools — `remember`, `forget`, `draw_cards`, `read_the_sky` — run in
the page, and their output goes back up as a `function_call_output` followed by
a `response.create`.

## Audio

A WebSocket carrying base64 PCM leaves both directions to the client.

**Up:** an `AudioWorklet` (`public/pcm-worklet.js`) takes the mic at whatever
rate the hardware gives, resamples to 24 kHz with linear interpolation, and
posts 20 ms PCM16 frames. The `sampleRate` option on `AudioContext` is only a
hint, so the conversion is done rather than requested.

**Down:** chunks arrive faster than real time, so each is booked against a
cursor running ahead of the clock rather than played as it lands. That cursor is
also what makes barge-in work — interrupting drops everything booked but not yet
heard.

Turn-taking is server-side VAD. `input_audio_buffer.speech_started` tells the
page to drop its queue; a `response.created` arriving while audio is still
playing flushes it too, as a backstop. `Escape` cancels for the typed path.

The worklet lives in `public/` rather than being imported, because Vite inlines
small assets as `data:text/javascript` URLs and `addModule()` rejects those on
Safari and under any CSP that disallows `data:`.

## Storage

The log is one record per call under `krystal.history.v1`; memory is a list of
lines under `krystal.memory.v1`. Neither is uploaded — the proxy holds no copy of
either. A reading's cards are a third kind of turn in the log, `cards`, beside
what was said about them; they are never replayed into a call. The tool
switches are under `krystal.tools.v1`, holding the names that
are switched *off* — so a tool nobody has touched is on, and one the server
gains later arrives on rather than quietly missing.

The last 40 conversations are kept, and the oldest are shed to stay inside a
300 KB budget, since that space belongs to the whole origin. Private-mode Safari
hands back a store that throws on write, so the log falls back to memory for the
life of the page rather than failing the call.

Old turns are not replayed into a new call on their own — that would make the
log a memory rather than a record. `continue` on an entry in the log is the one
way past that, and it is asked for, once, per conversation.

What goes up then is the conversation itself, not a description of one. The page
sends `session.history` — its own frame, handled here and never forwarded — and
the proxy lays the turns back down upstream as items, one `conversation.item.create`
each: a user message carrying `input_text`, an assistant message carrying
`output_text`. That is the shape the realtime API takes for history, and it is
the only shape that works. Flattening a transcript into a single message leaves
the model with no history at all, only somebody telling it about one — it will
treat the first thing said in the new call as the first thing ever said.

Both roles carry `input_text`. xAI documents history seeding with a user text
message or an assistant text message and `input_text` as the content type for a
text message either way — it follows OpenAI's beta naming here, the same way it
does for the text events `events.js` has to handle two spellings of. OpenAI's GA
shape puts assistant text in `output_text`; that is not this API.

The turns arrive as turns rather than as items so the page never names a role:
it hands over what was said, and `realtime.js` decides what goes upstream. The
line explaining that those turns are an earlier conversation is part of the
instructions, so it stays server-side with the rest of the persona.

Both ends cap the replay at 40 turns and 6 KB, oldest shed first, and the cap is
a bill as well as a budget: xAI charges per `conversation.item.create` the client
sends, so a picked-up conversation costs its turns, once, at the moment it is
picked up. Lowering the cap lowers that; it is one constant at each end.

Memory is capped at 25 lines, each flattened to one line and cut at 600
characters; past the cap the oldest goes. `remember` and `forget` run in the
page against browser storage, and the result goes back up as a
`function_call_output`. Editing the list during a call re-sends
`session.memory`, so a memory added mid-conversation is live in it; switching
memory off empties the block on the next `session.update` without deleting
anything.

Memories are text the person typed or dictated, so they land inside the prompt.
Flattening and capping them in `persona.js` keeps a memory from opening a new
instruction paragraph, and the persona is always first in the string.

## The ball

A sphere of clear glass on a brass stand, on a velvet cloth, under the stars.
The glass is Alan's: a transmissive physical material, index 1.5, all but
perfectly smooth, so what it shows is the night behind it, refracted and upside
down. The stand is one lathe — foot, waisted stem, and a cup the ball sits down
into — with a brass ring at the lip and another round the stem.

The ball does not move. Everything that changes is inside it.

## The visions

`ball/vision.js` is a hand-written shader, in GLSL for WebGL 2 and WGSL for
WebGPU, on a sphere just inside the glass. For each pixel it intersects the
view ray with the ball and takes 36 samples through it. At each one:

- the point is turned about the upright, harder toward the middle — a vortex;
- its space is folded back on itself four times with sines, which is what makes
  the wisps curl and split instead of just rotating;
- a sine through the folded space, sharpened to its ridges, makes thin bright
  ribbons, and a softer one under them a veil;
- the colour comes from where in the folded space the sample lies, through a
  palette that runs rose, gold, teal, blue, violet, magenta.

It is all added up, faded toward the glass, and tone-mapped so the brightest
knots go white rather than clipping. Each ray starts a different fraction of a
step in, so what would be contour lines across the ribbons becomes a fine grain.

The mist is drawn additively after the glass, and the glass writes no depth, so
the glass still refracts the night behind and the visions glow in front of it.
They are light, not things: they cast no shadow and are not refracted.

Time reaches the shader already multiplied by the mood's speed — `uFlow` is
integrated a frame at a time on the CPU — so a change of pace never makes the
mist jump.

What the visions give off outside the glass is two things: a point light at the
heart of the ball, in the palette's colour, that reaches the cup and no further
(nothing casts a shadow from it, and the foot lit through the stem would show);
and a faint aura behind the ball. The lamp in the room is warm and high in
front; the stage's back light is out.

## The night

`ball/cosmos.js` paints a starfield once at startup onto a 4096 × 2048
equirectangular canvas — a different night each load: indigo going to black
overhead, drifts of nebula in violet, rose and teal gathered in a band above the
horizon, and stars, a few of them tinted. The nebula is worked out texel by
texel at a quarter size and scaled up, then the whole sky is dithered, so the
dark ramps don't band. It turns once in about forty minutes.

What the glass and the brass reflect is that night, copied small, with a couple
of warm lamps and a glow off the cloth painted into the copy only. Polished brass
under a night sky reflects night, and comes out black.

## States

`idle` · `listening` · `thinking` · `speaking` — each a set of targets for the
visions (`ball/moods.js`): how fast the mist moves, how hard it twists, how much
it curls, how bright it is, how bright its heart, and which colours it runs to.
The ball eases between them, the colours the short way round the palette, so a
change of state reads as the visions shifting rather than a cut.

- **idle** — slow, violet, dim. The palette still drifts on its own.
- **listening** — a little quicker and brighter, toward teal and blue.
- **thinking** — churning hard and fast, magenta, with a bright heart.
- **speaking** — rose and gold, glowing with her voice.

Three things happen outside the moods. Talking over her clouds the mist — it
twists and churns, the colours wheel, and it settles over a couple of seconds.
The cards coming up makes the glass flare. And whoever is talking drives the
glow and the pace through the level meter, with a kick on each burst.

The call maps onto the states directly: `listening` from `speech_started` and
between turns, `thinking` from `speech_stopped` until the first audio frame,
`speaking` while there is audio booked, `idle` when there is no call.

## Layout

```
Dockerfile              Build the client, then serve it from src/server
index.html              Markup only — Vite's entry
public/
  pcm-worklet.js        Mic → 24 kHz PCM16, on the audio thread
src/
  client/
    main.js             The wiring, and nothing else
    styles.css          The HUD around the ball
    api.js              /api/config, as a function
    history.js          Past conversations in localStorage, and picking one up
    memory.js           What she remembers between calls, in localStorage
    tools.js            Which of the server's tools this browser switched off
    ball/               Geometry, shading and animation. Knows nothing about transports
      index.js            The controller and the per-frame loop
      model.js            The glass, the visions' sphere, the stand, the table, the night
      vision.js           The visions: one shader, in GLSL and WGSL
      moods.js            Targets per conversational state
      motion.js           The ease every channel uses
      cosmos.js           The night round the table, painted once onto a canvas
      environment.js      What the glass and the brass reflect, and the lamp
    oracle/             The fortune teller's tools. Pure functions, no DOM
      tarot.js            The 78 cards, the shuffle, the spreads
      sky.js              Today's date, the moon's phase, sun signs
    session/            The call. Emits transport-agnostic events
      index.js            Lifecycle: mic, socket, meter, tear down
      socket.js           The WebSocket to our own proxy, memories and history
      audio.js            Capture and playback over Web Audio
      codec.js            PCM16 ↔ base64
      events.js           xAI server events → this vocabulary
      tools.js            remember/forget, draw_cards/read_the_sky, run in the page
      metering.js         An analyser → one 0..1 number per frame
      emitter.js
      constants.js        The wire format, shared with the server
    ui/
      hud.js              Status chip, transcript, caption, tool label
      menu.js             The corner menu, and the list of panels it drops
      history.js          The log panel behind `log` in the menu, and its `continue`
      memory.js           The memory panel behind `memory` in the menu
      tools.js            The tool switches behind `tools` in the menu
      controls.js         Mic (tap mutes, hold hangs up), field, send, pickers
      viewport.js         Keeps the composer above the on-screen keyboard
    vendor/
      gfx/                The 3D engine: <three-d-stage>, WebGPU, else WebGL 2
  server/
    index.js            Entry point
    app.js              Middleware chain + the upgrade handler
    api.js              /api/config
    origin.js           Whether a request came from the page this server serves
    realtime.js         The socket proxy, and the allowlist
    tools.js            What the page may switch off, and what that leaves
    persona.js          Who Krystal is, her tools, and the session config
    config.js           The environment, resolved once
    static.js           Hosting for dist/ — production only
docs/                   These notes, configuration, policies, screenshots
test/                   node:test, against a stub xAI socket
.github/workflows/      CI (lint, tests, build smoke test), CodeQL, Docker publish
```

`src/client/vendor/gfx/` is the 3D engine, shared with the other characters:
`<three-d-stage>` (studio lighting, ground shadow, orbit controls, framing,
resize), the scene API the rig is built from — handed over as `GFX` — and the
same shading in WGSL for WebGPU and GLSL for WebGL 2. WebGPU is tried first,
WebGL 2 takes over where it is missing or its device is lost, and
`?renderer=webgl` pins the fallback. Its maths follow three.js r186 closely;
`vendor/gfx/LICENSE` says which parts are ported. Its `ShaderMaterial` is what
the visions are drawn with: a material that brings its own vertex and fragment
bodies, in both languages, and a list of uniforms.

## The transport seam

`session/index.js` exposes `on`, `start`, `stop`, `send`, `cancel`,
`syncMemory`, `syncTools`, `messages`, `context`, `connected`, `busy`, `stale`,
`state`, `muted`, `model`, `voice` — and emits:

```
'state'        listening | thinking | speaking | idle
'caption'      the assistant transcript for this turn, in full
'user'         what the person said, in full
'level'        0..1 sustained amplitude, per frame
'pulse'        0..1 transient, one per discrete event
'interrupted'  the person talked over Krystal
'tool'         a label while a tool works, or null
'message'      a completed turn, { role, content } — what the log stores
'busy'         whether a response is in flight
'ready'        { model, voice } the proxy actually used
'memory'       the result of a remember/forget the model just called
'cards'        the spread draw_cards just laid out
'sky'          what read_the_sky just answered
'done'         { usage }
'error'        { message }
```

Both transcript events carry the whole turn rather than an increment. xAI
renames OpenAI's `input_audio_transcription.delta` to `.updated` and makes it
cumulative, so appending it gives you "hello hello there hello there krystal".
`events.js` handles the two shapes apart — `.delta` appends, `.updated`
replaces.

The ball takes audio-shaped input:

```js
krystal.setState('speaking')  // idle | listening | thinking | speaking
krystal.setLevel(0.62)        // sustained amplitude 0..1, sampled per frame
krystal.pulse(0.4)            // transient impulse 0..1, one per discrete event
krystal.disturb(0.8)          // she has been talked over: the mist clouds
krystal.reveal(1)             // the cards have come up: the glass flares
```

Swapping providers means writing a different `createVoiceSession()` with that
surface. `main.js` and the ball don't change.
