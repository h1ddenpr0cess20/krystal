import { buildEnvironment, candlelight } from './environment.js';
import { createBackdrop, createBall, createTable, RADIUS } from './model.js';
import { ENERGY_GAIN, MOODS } from './moods.js';
import { approach } from './motion.js';
import { paletteColour } from './vision.js';

/**
 * How far the view may be zoomed. In, to this many radii from the middle of
 * the frame: up close to the glass, never through it. Out, to this many times
 * as far as it is framed — small on the table, never lost on it.
 */
export const ZOOM = Object.freeze({ in: 2.1, out: 4 });

/** How fast the night turns round the table, in radians a second: once in about forty minutes. */
export const SKY_DRIFT = 0.0026;

/**
 * How far back the camera sits, in radii over the tangent of the narrower half
 * field of view. The stage frames by the vertical one, which would fill a
 * phone held upright edge to edge, so the camera refits whenever the shape of
 * the view changes.
 */
const FRAMING = 2.6;

/** How far below the middle of the ball and stand the camera aims, in radii. */
const LIFT = 0.45;

/** How far the light from the visions reaches, in radii from the middle of the ball. */
const REACH = 1.25;

/** How bright the light the visions throw on the stand and the cloth is, at a glow of one. */
const LAMP = 1.25;

function radialTexture(GFX, stops) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  if (!g) return null;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, alpha] of stops) grd.addColorStop(at, `rgba(255,255,255,${alpha})`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const t = new GFX.CanvasTexture(c);
  t.colorSpace = GFX.SRGBColorSpace;
  return t;
}

/** The shortest way round the palette from one hue to another, eased. */
function approachHue(value, target, rate, dt) {
  let delta = ((target - value) % 1 + 1.5) % 1 - 0.5;
  delta *= Math.min(1, dt * rate);
  return ((value + delta) % 1 + 1) % 1;
}

/**
 * Krystal: a crystal ball on a brass stand, on a velvet cloth, under the
 * stars. She does not move. The visions inside her do — the conversational
 * state (`setState`) and the level of whoever is talking (`setLevel`, `pulse`)
 * set how fast the mist swirls, how hard it twists, how bright it burns and
 * which colours it runs to.
 */
export function createKrystal({ stage, GFX, random = Math.random }) {
  const R = RADIUS;
  const { ball, glass, vision, visionMaterial } = createBall(GFX);
  const uniforms = visionMaterial.uniforms;
  const backdrop = createBackdrop(GFX, { random });
  buildEnvironment({ stage, GFX, sky: backdrop.material.map?.image });
  candlelight(stage);

  let state = 'idle';
  let mood = MOODS.idle;
  const m = { ...MOODS.idle };

  let sustain = 0;
  let impulse = 0;
  let energy = 0;
  let flare = 0;
  let stir = 0;
  /** Where the visions start: a different place in them each load. */
  let flow = random() * 100;
  let t = 0;
  let fitted = null;
  let halo = null;
  let lamp = null;
  const timer = new GFX.Timer();

  /** Back the camera off, along the way it already faces, until the ball fits across as well as up. */
  function refit(camera) {
    const target = stage._controls?.target ?? new GFX.Vector3();
    const half = (camera.fov * Math.PI) / 360;
    const narrower = Math.min(half, Math.atan(Math.tan(half) * camera.aspect));
    const distance = (FRAMING * R) / Math.tan(narrower);
    const away = camera.position.clone().sub(target);
    if (away.lengthSq() === 0) away.set(0, 0, 1);
    camera.position.copy(target).add(away.normalize().multiplyScalar(distance));
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    if (stage._controls) {
      stage._controls.minDistance = ZOOM.in * R;
      stage._controls.maxDistance = ZOOM.out * distance;
    }
  }

  function frame(dt) {
    t += dt;

    impulse = Math.max(0, impulse - impulse * Math.min(1, dt * 3.4) - dt * 0.05);
    energy = approach(energy, Math.min(1, sustain + impulse), 6, dt);
    flare = approach(flare, 0, 2.2, dt);
    stir = approach(stir, 0, 1.4, dt);
    for (const k in m) {
      if (k === 'hue') m.hue = approachHue(m.hue, mood.hue, 1.2, dt);
      else m[k] = approach(m[k], mood[k], 2.4, dt);
    }

    const camera = stage._camera;
    if (camera && camera.aspect !== fitted) {
      fitted = camera.aspect;
      refit(camera);
    }

    flow += dt * (m.speed + energy * ENERGY_GAIN.speed + flare * 1.2 + stir * 2.5);
    const glow = m.glow + energy * ENERGY_GAIN.glow + flare;
    const core = m.core + energy * ENERGY_GAIN.core + flare * 0.8;
    // The palette breathes a little on its own, so even an idle ball is never one colour for long.
    const hue = m.hue + Math.sin(t * 0.11) * 0.06 + stir * 0.3;

    uniforms.uFlow.value = flow;
    uniforms.uSwirl.value = m.swirl + stir * 2;
    uniforms.uChurn.value = m.churn + stir * 0.6;
    uniforms.uGlow.value = glow;
    uniforms.uCore.value = core;
    uniforms.uHue.value = hue;
    vision.updateWorldMatrix?.(true, false);
    uniforms.uCenter.value.setFromMatrixPosition(vision.matrixWorld);

    // What the visions throw on the brass and the cloth: the colour at the heart of them.
    const [r, g, b] = paletteColour(hue + 0.5);
    if (lamp) {
      lamp.color.setRGB(r, g, b);
      lamp.intensity = LAMP * (0.35 + glow * 0.6 + core * 0.5);
    }
    if (halo) {
      halo.material.color.setRGB(r, g, b);
      halo.material.opacity = Math.min(0.55, 0.05 + glow * 0.16 + core * 0.12);
    }

    backdrop.rotation.y = t * SKY_DRIFT;
    if (stage._scene?.environmentRotation) stage._scene.environmentRotation.y = backdrop.rotation.y;
  }

  glass.onBeforeRender = () => {
    timer.update();
    frame(Math.min(timer.getDelta(), 0.05));
  };

  stage.setObject(ball);
  // The stage looks at the middle of the ball and its stand; looking a little
  // lower than that lifts them up the screen, clear of the caption and the
  // composer that sit along the bottom.
  if (stage._controls?.target) {
    stage._controls.target.y -= LIFT * R;
    stage._camera?.position && (stage._camera.position.y -= LIFT * R);
    stage._controls.update?.();
  }
  // Clear glass lets the lamp through, and the visions are light, not things.
  glass.castShadow = false;
  vision.castShadow = false;
  vision.receiveShadow = false;

  // Added after the stage has framed the ball, so none of it counts toward
  // the framing: the night, the table, the light from inside the glass and
  // the aura round it. The table catches the shadow, so the stage's own
  // shadow plane goes.
  if (stage._ground) stage._ground.visible = false;
  if (stage._scene?.add) {
    stage._scene.add(backdrop);
    stage._scene.add(createTable(GFX));

    // It reaches the cup the ball sits in and no further: nothing here casts a
    // shadow from it, and lighting the foot through the stem would show.
    lamp = new GFX.PointLight(0xb070ff, LAMP, REACH * R, 1);
    lamp.name = 'vision-light';
    ball.add(lamp);

    const map = radialTexture(GFX, [[0, 0], [0.36, 0], [0.42, 0.55], [0.56, 0.18], [0.8, 0.04], [1, 0]]);
    if (map) {
      halo = new GFX.Sprite(new GFX.SpriteMaterial({
        map, color: new GFX.Color('#b070ff'), transparent: true, blending: GFX.AdditiveBlending,
        depthWrite: false, opacity: 0.1,
      }));
      halo.name = 'aura';
      halo.scale.setScalar(R * 3.4);
      ball.add(halo);
    }
  }

  return {
    get state() { return state; },

    setState(next) {
      if (!Object.hasOwn(MOODS, next) || next === state) return;
      state = next;
      mood = MOODS[next];
      if (next === 'idle' || next === 'thinking') sustain = 0;
    },

    setLevel(level) {
      sustain = Math.min(1, Math.max(0, level));
    },

    pulse(weight = 0.3) {
      const w = Math.min(1, Math.max(0, weight));
      impulse = Math.min(1, impulse + w);
      flare = Math.min(0.5, flare + w * 0.25);
    },

    /** Talked over: the mist clouds and churns, and settles back. */
    disturb(weight = 0.8) {
      stir = Math.min(1, stir + Math.max(0, weight));
    },

    /** The cards have come up: the glass flares, and the colours wheel round. */
    reveal(weight = 1) {
      flare = Math.min(0.9, flare + 0.6 * weight);
      stir = Math.min(1, stir + 0.5 * weight);
    },

    /** Run the rig forward without a renderer: for tests, and nothing else. */
    step(dt) { frame(dt); },

    /** The visions' settings as they stand: for tests. */
    get vision() {
      return {
        flow: uniforms.uFlow.value,
        swirl: uniforms.uSwirl.value,
        churn: uniforms.uChurn.value,
        glow: uniforms.uGlow.value,
        core: uniforms.uCore.value,
        hue: uniforms.uHue.value,
      };
    },

    dispose() {
      glass.onBeforeRender = () => {};
    },
  };
}
