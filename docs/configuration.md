# Configuration

Both `npm run dev` and `npm start` read `.env`.

| Variable | Default | Role |
|---|---|---|
| `XAI_API_KEY` | — | Required. Stays in the Node process. |
| `XAI_VOICE` | `eve` | The women's voices in xAI's roster: `eve`, `ara`, `celeste`, `luna`, `carina`, `iris`, `lumen`, `lux`. Any other voice id is honoured and added to the picker. |
| `XAI_MODEL` | `grok-voice-latest` | Also `grok-voice-think-fast-1.0` |
| `XAI_REALTIME_URL` | xAI | Points the proxy at a gateway or a stub |
| `XAI_WEB_SEARCH` | `true` | |
| `XAI_X_SEARCH` | `true` | |
| `ORACLE` | `true` | The `draw_cards` and `read_the_sky` tools — a real tarot shuffle, and the calendar |
| `MEMORY` | `true` | The `remember` and `forget` tools, and the memory block in the prompt |
| `XAI_MCP_SERVERS` | — | JSON array of remote MCP servers, or put it in `mcp.json` |
| `PORT` | `5173` | |
| `HOST` | `127.0.0.1` | Which interface to bind. This machine only unless you say otherwise, or `npm start` is serving TLS. |
| `SSL_KEY`, `SSL_CERT` | — | Paths to a real certificate; `npm start` then serves HTTPS |

## On a phone

```sh
npm run dev:lan           # → https://192.168.x.x:5173, printed on start
```

Microphone access needs a secure context. `localhost` is one; a LAN address over
plain HTTP is not — `navigator.mediaDevices` doesn't exist there, so the page
can't even raise the mic prompt. The `:lan` scripts serve HTTPS with a
self-signed certificate, cached in `node_modules/.vite/`, and the realtime
socket follows the page onto `wss:`.

No browser trusts that certificate, so the phone shows a warning the first time
("Advanced" → proceed on Chrome, "Show details" → "visit this website" on
Safari). Tap through it once per device. To skip it, point `SSL_KEY` and
`SSL_CERT` at a certificate the device already trusts —
[mkcert](https://github.com/FiloSottile/mkcert) issues one for a LAN IP.

## Docker

```sh
docker run --rm -p 5173:5173 -e XAI_API_KEY=xai-... h1ddenpr0cess20/krystal
```

Images go to Docker Hub on every push to `main` (`latest`) and on `v*` tags
(`1.2.3`, `1.2`), for `linux/amd64` and `linux/arm64`. Configuration is the same
set of variables as `.env` — pass them with `-e` or `--env-file .env`.

The container serves HTTP on `PORT` and expects TLS to be terminated in front of
it; to serve TLS from the container, mount a certificate and set `SSL_KEY` and
`SSL_CERT`. Build it yourself with `docker build -t krystal .`. Publishing from a
fork needs a `DOCKERHUB_TOKEN` secret, plus a `DOCKERHUB_USERNAME` variable if
your Docker Hub account isn't `h1ddenpr0cess20`.

## Tools

`web_search` and `x_search` are on by default. Both execute inside xAI, so
there's nothing to implement here and no second credential to hold. Krystal is
told not to narrate a search — ask for today's horoscope and she just has it;
the only sign one is running is the label under the status chip.

Remote MCP servers go in `XAI_MCP_SERVERS` as a JSON array, or in `mcp.json`
(gitignored), and are also executed by xAI:

```json
[
  {
    "server_label": "orders",
    "server_url": "https://mcp.example.com/mcp",
    "server_description": "Order lookup",
    "allowed_tools": ["lookup_order"],
    "authorization": "Bearer ..."
  }
]
```

Credentials there never leave the Node process — `/api/config` reports tool
labels only.

Four tools run in the page rather than at xAI. `remember` and `forget` are
memory, below. `draw_cards` and `read_the_sky` are the fortune teller's own:

- **`draw_cards`** shuffles the full Rider–Waite–Smith deck — 22 major arcana,
  56 minor — with a Fisher–Yates shuffle and lays out a spread: `single`,
  `three` (past, present, future) or `celtic_cross` (ten cards). Each card is
  upright or reversed on a coin toss. The model is told to read what comes
  back and never to choose cards itself, because left to itself it draws the
  same famous handful every time. The cards drawn go into the log, under the
  reading.
- **`read_the_sky`** answers from the browser's clock: today's date, the moon's
  phase and how much of her is lit, and the sun sign — for today, a whole date,
  or a birthday given as `MM-DD`. The phase is the mean synodic month counted
  from a known new moon; it lands within a day of the almanac.

The glass flares when the cards come up. `ORACLE=false` takes both tools away
for everyone the server serves.

### Switching one off for a call

`tools` opens a switch for each tool this server offers — web search, X search,
the tarot deck and the sky together, and one per MCP server. Switching one off takes it out of the call that is up
right now: the proxy re-declares the tools with `session.update`, so there is no
redial and nothing to reconnect. The switches live in `localStorage`, so they
hold across calls and reloads in that browser.

The page can only take away. What exists is the environment's to say, and a tool
`XAI_WEB_SEARCH=false` never enabled has no switch to find — a browser asking
for one gets nothing, because the proxy checks every name against its own list
before it drops anything. Memory is the exception, and only because it already
had a switch of its own, in the `memory` panel.

## The log and the memory

`log` opens past conversations, newest first. `new` closes the record and, if a
call is up, dials again — the model's memory of what was said is the call
itself, so a new call is the only thing that clears it. `clear` asks once, then
removes the log.

`memory` opens the short list of details Krystal carries between calls — your
sign, your birthday, the question you keep coming back to. Ask her to remember
something and she calls `remember`; ask her to forget it and she calls
`forget`, which drops every stored line matching the keyword. You can also add a
line by hand, drop one, switch the whole thing off, or clear it. `MEMORY=false`
removes the tools and the prompt block for everyone the server serves.

Both live in `localStorage`, in the browser that made the call. Nothing is
uploaded, and the proxy keeps no copy of either — see the
[design notes](design.md#storage) for the caps and the wire format.
