import { cosmosColour, createCosmosTexture } from './cosmos.js';
import { createVisionMaterial } from './vision.js';

/** The ball, in metres of nothing in particular: the stage frames whatever size it is. */
export const RADIUS = 0.8;

/** How far inside the glass the visions stop, as a fraction of the radius. */
export const VISION_RADIUS = 0.95;

/** The night round the scene: far enough off that nothing on the table moves it. */
const BACKDROP_RADIUS = 60;

/**
 * The stand's outline, turned about the upright, in radii from the centre of
 * the ball: a round foot, a waisted stem, and a cup the ball sits down into.
 * The foot is flat right out to a small round at its edge, so it sits down on
 * the cloth rather than lifting off it on a bevel.
 * It goes out along the underside, up the outside to the lip, and back in
 * underneath the ball, so the inside of the cup is never open to the sky.
 */
const STAND = [
  [0.0, -1.62], [0.72, -1.62], [0.745, -1.6], [0.745, -1.565], [0.7, -1.52],
  [0.56, -1.48], [0.42, -1.43], [0.3, -1.33], [0.22, -1.21], [0.19, -1.12],
  [0.22, -1.05], [0.3, -0.99], [0.42, -0.93], [0.54, -0.86], [0.63, -0.8],
  [0.6, -0.79], [0.5, -0.88], [0.3, -0.97], [0.0, -1.02],
];

/** Where the stand meets the table, in radii below the centre of the ball. */
export const FOOT = 1.62;

/** The brass: old, a little worn, still catching the light. */
function brass(GFX, name) {
  return new GFX.MeshStandardMaterial({
    name,
    color: new GFX.Color('#d8a95a'),
    metalness: 1,
    roughness: 0.36,
  });
}

/**
 * The crystal ball on its stand, centred on the ball.
 *
 * The glass is a transmissive physical material, as Alan's is, so it shows the
 * night behind refracted. The visions (`vision.js`) are their own sphere just
 * inside it, drawn additively after the glass — and because the glass writes
 * no depth, nothing stops them showing through it.
 */
export function createBall(GFX) {
  const R = RADIUS;

  const glass = new GFX.Mesh(
    new GFX.SphereGeometry(R, 128, 96),
    new GFX.MeshPhysicalMaterial({
      name: 'glass',
      color: new GFX.Color('#ffffff'),
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      thickness: 0.6,
      ior: 1.5,
      attenuationColor: new GFX.Color('#efe6ff'),
      attenuationDistance: 4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.02,
      specularIntensity: 1,
      depthWrite: false,
    }),
  );
  glass.name = 'glass';

  const visionMaterial = createVisionMaterial(GFX);
  visionMaterial.uniforms.uRadius.value = R * VISION_RADIUS;
  const vision = new GFX.Mesh(new GFX.SphereGeometry(R * VISION_RADIUS, 64, 48), visionMaterial);
  vision.name = 'vision';
  vision.renderOrder = 1;

  const stand = new GFX.Mesh(
    new GFX.LatheGeometry(STAND.map(([r, y]) => new GFX.Vector2(r * R, y * R)), 96),
    brass(GFX, 'stand'),
  );
  stand.name = 'stand';

  const lip = new GFX.Mesh(new GFX.TorusGeometry(R * 0.625, R * 0.03, 16, 96), brass(GFX, 'lip'));
  lip.name = 'lip';
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.795 * R;

  const collar = new GFX.Mesh(new GFX.TorusGeometry(R * 0.205, R * 0.035, 16, 64), brass(GFX, 'collar'));
  collar.name = 'collar';
  collar.rotation.x = Math.PI / 2;
  collar.position.y = -1.12 * R;

  const ball = new GFX.Group();
  ball.name = 'ball';
  ball.add(stand, lip, collar, glass, vision);

  return { ball, glass, vision, visionMaterial, stand };
}

/**
 * The table's pedestal, turned about the upright, in radii below the top of
 * the cloth: a broad round foot on the floor, a column with a swell partway
 * up, and a block that flares out under the board. It goes out along the
 * underside and up the outside, as the stand does, so it faces outward.
 */
const PEDESTAL = [
  [0.0, -4.0], [1.4, -4.0], [1.42, -3.94], [1.3, -3.86], [0.9, -3.74],
  [0.55, -3.56], [0.34, -3.32], [0.26, -3.02], [0.3, -2.62], [0.4, -2.24],
  [0.32, -1.86], [0.26, -1.3], [0.3, -0.62], [0.46, -0.36], [0.72, -0.2],
  [0.72, -0.1], [0.0, -0.1],
];

/** How far the board's top sits under the cloth, in radii: just enough that the two never fight. */
const UNDER_CLOTH = 0.004;

/**
 * The table the stand sits on: a round wooden board on a turned pedestal,
 * under a dark velvet cloth that falls away at the edge. The cloth shows on
 * both sides, so seen from low down the inside of its fall is velvet and the
 * board and the pedestal are under it, not the sky. Added after the stage
 * frames the ball, so it does not count toward the framing.
 */
export function createTable(GFX) {
  const R = RADIUS;
  const velvet = new GFX.MeshStandardMaterial({
    name: 'velvet',
    color: new GFX.Color('#26134a'),
    roughness: 0.95,
    metalness: 0,
    side: GFX.DoubleSide,
  });
  const wood = new GFX.MeshStandardMaterial({
    name: 'wood',
    color: new GFX.Color('#3b2416'),
    roughness: 0.55,
    metalness: 0,
  });
  const top = new GFX.Mesh(new GFX.CircleGeometry(R * 3.2, 96), velvet);
  top.name = 'cloth';
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;

  const fall = new GFX.Mesh(new GFX.CylinderGeometry(R * 3.2, R * 3.45, R * 2.4, 96, 1, true), velvet);
  fall.name = 'fall';
  fall.position.y = -R * 1.2;

  const fringe = new GFX.Mesh(new GFX.TorusGeometry(R * 3.2, R * 0.025, 12, 160), brass(GFX, 'fringe'));
  fringe.name = 'fringe';
  fringe.rotation.x = Math.PI / 2;

  const board = new GFX.Mesh(new GFX.CylinderGeometry(R * 3.15, R * 3.15, R * 0.1, 96), wood);
  board.name = 'board';
  board.position.y = -R * (0.05 + UNDER_CLOTH);

  const pedestal = new GFX.Mesh(
    new GFX.LatheGeometry(PEDESTAL.map(([r, y]) => new GFX.Vector2(r * R, y * R)), 64),
    wood,
  );
  pedestal.name = 'pedestal';

  const table = new GFX.Group();
  table.name = 'table';
  table.add(top, fall, fringe, board, pedestal);
  table.position.y = -FOOT * R;
  return table;
}

/**
 * What the glass has to refract, and what is round the whole scene: the
 * night (`cosmos.js`). Without it a transmissive surface shows the renderer's
 * flat half-white stand-in for "nothing behind", and clear glass comes out
 * milky. Where there is no canvas to paint on, just its plain ramp.
 */
export function createBackdrop(GFX, { random } = {}) {
  const geometry = new GFX.SphereGeometry(BACKDROP_RADIUS, 128, 64);
  const map = createCosmosTexture(GFX, { random });
  if (!map) {
    const position = geometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const c = new GFX.Color();
    for (let i = 0; i < position.count; i++) {
      const up = Math.max(-1, Math.min(1, position.getY(i) / BACKDROP_RADIUS));
      const [r, g, b] = cosmosColour(Math.asin(up)).map(Math.round);
      c.setHex((r << 16) | (g << 8) | b);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.setAttribute('color', new GFX.BufferAttribute(colors, 3));
  }
  const mesh = new GFX.Mesh(geometry, new GFX.MeshBasicMaterial({
    name: 'backdrop', map, vertexColors: !map, side: GFX.BackSide, depthWrite: false,
  }));
  mesh.name = 'backdrop';
  mesh.renderOrder = -1;
  // As good as infinitely far off: wherever the camera is, the sky is round it.
  mesh.onBeforeRender = (renderer, scene, camera) => {
    mesh.position.copy(camera.position);
    mesh.updateMatrixWorld();
  };
  return mesh;
}
