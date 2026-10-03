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
 * It goes out along the underside, up the outside to the lip, and back in
 * underneath the ball, so the inside of the cup is never open to the sky.
 */
const STAND = [
  [0.0, -1.62], [0.66, -1.62], [0.72, -1.6], [0.74, -1.56], [0.7, -1.52],
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
 * The table the stand sits on: a round top under a dark velvet cloth that
 * falls away at the edge. Added after the stage frames the ball, so it does
 * not count toward the framing.
 */
export function createTable(GFX) {
  const R = RADIUS;
  const velvet = new GFX.MeshStandardMaterial({
    name: 'velvet',
    color: new GFX.Color('#26134a'),
    roughness: 0.95,
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

  const table = new GFX.Group();
  table.name = 'table';
  table.add(top, fall, fringe);
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
