import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import * as GFX from '../../src/client/vendor/gfx/index.js';

import { ZOOM, createKrystal } from '../../src/client/ball/index.js';
import { cosmosColour } from '../../src/client/ball/cosmos.js';
import { RADIUS, VISION_RADIUS, createBall } from '../../src/client/ball/model.js';
import { MOODS } from '../../src/client/ball/moods.js';
import { STEPS, createVisionMaterial, paletteColour, visionUniforms } from '../../src/client/ball/vision.js';

const DT = 1 / 60;

/** Just enough of `<three-d-stage>` to build on, without a renderer. */
function fakeStage() {
  const scene = new GFX.Scene();
  const camera = new GFX.PerspectiveCamera(45, 1.6, 0.01, 500);
  camera.position.set(3, 2, 4);
  return {
    _scene: scene,
    _camera: camera,
    _controls: { target: new GFX.Vector3(), update() {} },
    setObject(object) {
      this.object = object;
      scene.add(object);
    },
  };
}

function run(krystal, seconds) {
  for (let t = 0; t < seconds; t += DT) krystal.step(DT);
}

function seeded(seed = 1) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

describe('MOODS', () => {
  const CHANNELS = ['churn', 'core', 'glow', 'hue', 'speed', 'swirl'];

  it('covers the four conversational states, with every channel', () => {
    assert.deepEqual(Object.keys(MOODS).sort(), ['idle', 'listening', 'speaking', 'thinking']);
    for (const [name, mood] of Object.entries(MOODS)) {
      assert.deepEqual(Object.keys(mood).sort(), CHANNELS, `${name} is missing a channel`);
      for (const value of Object.values(mood)) assert.ok(Number.isFinite(value));
    }
  });

  it('churns hardest while she thinks, and rests when idle', () => {
    assert.ok(MOODS.thinking.speed > MOODS.speaking.speed);
    assert.ok(MOODS.speaking.speed > MOODS.idle.speed);
    assert.ok(MOODS.thinking.swirl > MOODS.idle.swirl);
    assert.ok(MOODS.idle.glow < MOODS.listening.glow);
  });
});

describe('the visions', () => {
  it('declare their uniforms in the order the WGSL struct reads them', () => {
    assert.deepEqual(Object.keys(visionUniforms(GFX)), [
      'uFlow', 'uSwirl', 'uChurn', 'uGlow', 'uHue', 'uCore', 'uRadius', 'uCenter',
    ]);
  });

  it('are the same program in both shading languages', () => {
    const material = createVisionMaterial(GFX);
    assert.equal(material.isShaderMaterial, true);
    assert.equal(material.blending, GFX.AdditiveBlending);
    assert.equal(material.depthWrite, false);
    for (const name of Object.keys(material.uniforms)) {
      assert.match(material.glsl.fragment, new RegExp(`\\b${name}\\b`), `GLSL reads ${name}`);
      assert.match(material.wgsl, new RegExp(`material\\.${name}\\b`), `WGSL reads ${name}`);
    }
    assert.match(material.glsl.fragment, new RegExp(`STEPS = ${STEPS}`));
    assert.match(material.wgsl, new RegExp(`STEPS: i32 = ${STEPS}`));
    assert.match(material.wgsl, /fn vs\(/);
    assert.match(material.wgsl, /fn fs\(/);
  });

  it('colour the stand from the same palette the shader uses', () => {
    for (const t of [0, 0.25, 0.5, 0.75]) {
      for (const c of paletteColour(t)) assert.ok(c >= 0 && c <= 1);
    }
  });
});

describe('the ball', () => {
  it('sits on its stand, with the visions just inside the glass', () => {
    const { ball, glass, vision, visionMaterial } = createBall(GFX);
    const names = ball.children.map((o) => o.name);
    assert.deepEqual(names, ['stand', 'lip', 'collar', 'glass', 'vision']);
    assert.equal(glass.material.transmission, 1);
    assert.equal(glass.material.depthWrite, false, 'the glass hides nothing behind it');
    assert.equal(visionMaterial.uniforms.uRadius.value, RADIUS * VISION_RADIUS);
    assert.ok(vision.renderOrder > glass.renderOrder);
  });

  it('has a night to sit in even without a canvas to paint it on', () => {
    const up = cosmosColour(Math.PI / 2);
    const level = cosmosColour(0);
    assert.ok(up.reduce((a, b) => a + b) < level.reduce((a, b) => a + b), 'darker overhead');
  });
});

describe('createKrystal', () => {
  it('stays put — the visions move, the ball does not', () => {
    const stage = fakeStage();
    const krystal = createKrystal({ stage, GFX, random: seeded() });
    const before = stage.object.position.clone();
    krystal.setState('speaking');
    krystal.setLevel(0.8);
    krystal.pulse(0.6);
    run(krystal, 2);
    assert.ok(stage.object.position.equals(before));
  });

  it('swirls faster and brighter as the call warms up', () => {
    const krystal = createKrystal({ stage: fakeStage(), GFX, random: seeded() });
    run(krystal, 3);
    const idle = krystal.vision;
    const flowed = idle.flow;
    run(krystal, 1);
    const idleRate = krystal.vision.flow - flowed;

    krystal.setState('thinking');
    run(krystal, 4);
    const thinking = krystal.vision;
    run(krystal, 1);
    const thinkingRate = krystal.vision.flow - thinking.flow;

    assert.ok(thinkingRate > idleRate * 2, `${thinkingRate} vs ${idleRate}`);
    assert.ok(thinking.glow > idle.glow);
    assert.ok(thinking.swirl > idle.swirl);
  });

  it('never jumps: a change of mood eases in', () => {
    const krystal = createKrystal({ stage: fakeStage(), GFX, random: seeded() });
    run(krystal, 2);
    const before = krystal.vision;
    krystal.setState('thinking');
    krystal.step(DT);
    const after = krystal.vision;
    assert.ok(Math.abs(after.glow - before.glow) < 0.05);
    assert.ok(Math.abs(after.swirl - before.swirl) < 0.1);
  });

  it('turns the colours the short way round the palette', () => {
    const krystal = createKrystal({ stage: fakeStage(), GFX, random: seeded() });
    run(krystal, 3);
    krystal.setState('speaking');
    run(krystal, 6);
    // From violet (0.74) to rose (0.06) is forward through magenta, not back through teal.
    const hue = krystal.vision.hue;
    const distance = Math.min(Math.abs(hue - MOODS.speaking.hue), 1 - Math.abs(hue - MOODS.speaking.hue));
    assert.ok(distance < 0.12, `hue ${hue}`);
  });

  it('glows with the voice, flares when the cards come up, and churns when talked over', () => {
    const krystal = createKrystal({ stage: fakeStage(), GFX, random: seeded() });
    krystal.setState('speaking');
    run(krystal, 4);
    const quiet = krystal.vision;

    krystal.setLevel(1);
    run(krystal, 1);
    assert.ok(krystal.vision.glow > quiet.glow + 0.2);

    krystal.setLevel(0);
    run(krystal, 3);
    const settled = krystal.vision;
    krystal.reveal(1);
    krystal.step(DT);
    assert.ok(krystal.vision.glow > settled.glow + 0.3);

    run(krystal, 4);
    const calm = krystal.vision;
    krystal.disturb(1);
    krystal.step(DT);
    assert.ok(krystal.vision.swirl > calm.swirl + 1);
    assert.ok(krystal.vision.churn > calm.churn + 0.3);
  });

  it('ignores a state it has no mood for', () => {
    const krystal = createKrystal({ stage: fakeStage(), GFX, random: seeded() });
    krystal.setState('furious');
    assert.equal(krystal.state, 'idle');
  });

  it('keeps the camera out of the glass, and the ball in sight', () => {
    const stage = fakeStage();
    const krystal = createKrystal({ stage, GFX, random: seeded() });
    krystal.step(DT);
    assert.ok(stage._controls.minDistance >= RADIUS * 2);
    assert.ok(stage._controls.maxDistance > stage._camera.position.distanceTo(stage._controls.target));
    assert.ok(ZOOM.in * RADIUS > RADIUS * 1.6, 'never through the glass, even from the middle of the frame');
  });
});
