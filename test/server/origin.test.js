import assert from 'node:assert/strict';
import { once } from 'node:events';
import { after, before, describe, it } from 'node:test';

import { WebSocket } from 'ws';

import { sameOrigin } from '../../src/server/origin.js';
import { startApp } from '../helpers/app.js';
import { startXaiStub } from '../helpers/xai-stub.js';

const ELSEWHERE = 'https://evil.example';

describe('sameOrigin', () => {
  it('lets through what named no origin at all — that is not a browser', () => {
    assert.equal(sameOrigin({ headers: { host: 'localhost:5173' } }), true);
    assert.equal(sameOrigin({ headers: {} }), true);
  });

  it('lets through a page served by this same server', () => {
    assert.equal(sameOrigin({
      headers: { origin: 'http://localhost:5173', host: 'localhost:5173' },
    }), true);
    assert.equal(sameOrigin({
      headers: { origin: 'https://192.168.1.5:5173', host: '192.168.1.5:5173' },
    }), true);
  });

  it('turns down a page served by anything else', () => {
    assert.equal(sameOrigin({
      headers: { origin: ELSEWHERE, host: 'localhost:5173' },
    }), false);
    assert.equal(sameOrigin({
      headers: { origin: 'http://localhost:5174', host: 'localhost:5173' },
    }), false);
    /** A sandboxed frame, and anything else that is not a URL. */
    assert.equal(sameOrigin({ headers: { origin: 'null', host: 'localhost:5173' } }), false);
    assert.equal(sameOrigin({ headers: { origin: 'http://localhost:5173' } }), false);
  });
});

describe('a request from another page', () => {
  let xai;
  let app;

  before(async () => {
    xai = await startXaiStub();
    app = await startApp({ XAI_REALTIME_URL: xai.address });
  });

  after(async () => {
    await app.close();
    await xai.close();
  });

  /**
   * WebSockets are outside the same-origin policy, so this handshake is the one
   * an attacker actually gets to make. Through it they would be talking on our
   * key, in the person's name.
   */
  it('cannot open the call socket', async () => {
    const ws = new WebSocket(`${app.origin.replace('http:', 'ws:')}/realtime`, {
      headers: { origin: ELSEWHERE },
    });
    const [err] = await once(ws, 'error');
    assert.match(err.message, /403/);
    assert.equal(xai.headers(), null, 'the proxy never dialled on their behalf');
  });

  it('leaves the page this server actually serves alone', async () => {
    const ws = new WebSocket(`${app.origin.replace('http:', 'ws:')}/realtime`, {
      headers: { origin: app.origin },
    });
    await once(ws, 'open');
    ws.terminate();
  });

  it('reads are left open — a browser cannot see the answer anyway', async () => {
    const res = await fetch(`${app.origin}/api/config`, { headers: { origin: ELSEWHERE } });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});
