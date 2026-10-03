/**
 * The night Krystal sits in, painted once onto an equirectangular canvas — a
 * different one each load. Deep indigo going to black overhead, a few drifts
 * of nebula in violet, rose and teal, and stars: many faint, some bright,
 * a handful with a glint of colour.
 *
 * The nebula is worked out texel by texel on a small scratch canvas and
 * scaled up, rather than stacked out of canvas gradients: the browser dithers
 * every gradient with the same fixed pattern, and enough of them on top of one
 * another add up to a visible grid.
 */
export const COSMOS = Object.freeze({
  zenith: [6, 4, 16],
  horizon: [26, 14, 44],
  nadir: [10, 6, 22],
});

/** The colours the nebula drifts between. */
const NEBULA = [
  [120, 52, 170],
  [190, 60, 140],
  [40, 110, 150],
  [90, 40, 120],
];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mix(a, b, t) {
  return a.map((v, i) => lerp(v, b[i], t));
}

/** The plain ramp, by elevation in radians — also what a canvasless backdrop is coloured with. */
export function cosmosColour(elevation) {
  const up = Math.sin(elevation);
  if (up >= 0) return mix(COSMOS.horizon, COSMOS.zenith, Math.pow(up, 0.6));
  return mix(COSMOS.horizon, COSMOS.nadir, Math.pow(-up, 0.5));
}

/** Smooth value noise on a lattice that wraps round in x, so the seam never shows. */
function createNoise(random, period) {
  const size = 256;
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = random();
  const at = (x, y) => table[(((y % size) + size) % size) * size + (((x % period) + period) % period)];
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const u = fade(x - xi);
    const v = fade(y - yi);
    return lerp(lerp(at(xi, yi), at(xi + 1, yi), u), lerp(at(xi, yi + 1), at(xi + 1, yi + 1), u), v);
  };
}

/**
 * A dark ramp over a whole sky bands in eight bits, so a texel or two of noise
 * goes on top of the scaled-up nebula: the steps break up into grain too fine
 * to see.
 */
function dither(ctx, width, height, random) {
  const rows = 128;
  let seed = (random() * 0xffffffff) >>> 0 || 1;
  for (let y = 0; y < height; y += rows) {
    const h = Math.min(rows, height - y);
    const img = ctx.getImageData(0, y, width, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      const k = ((seed >>> 0) / 0xffffffff - 0.5) * 2.2;
      d[i] += k;
      d[i + 1] += k;
      d[i + 2] += k;
    }
    ctx.putImageData(img, 0, y);
  }
}

export function paintCosmos(ctx, width, height, { random = Math.random } = {}) {
  const w = Math.max(64, width >> 2);
  const h = Math.max(32, height >> 2);
  const scratch = ctx.canvas.ownerDocument?.createElement('canvas') ?? document.createElement('canvas');
  scratch.width = w;
  scratch.height = h;
  const sctx = scratch.getContext('2d');
  const img = sctx.createImageData(w, h);

  const base = 6;
  const noise = createNoise(random, base * 16);
  const fbm = (x, y) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < 5; o++) {
      sum += noise(x * f, y * f) * amp;
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  };
  const tint = noise;

  for (let y = 0; y < h; y++) {
    const elevation = (0.5 - (y + 0.5) / h) * Math.PI;
    const sky = cosmosColour(elevation);
    /** The drifts gather in a band a little above the horizon, like a galaxy seen edge on. */
    const band = Math.exp(-Math.pow((elevation - 0.25) / 0.55, 2));
    for (let x = 0; x < w; x++) {
      const u = (x / w) * base;
      const v = (y / h) * base * 0.5;
      const cloud = Math.max(0, fbm(u + fbm(u + 3.1, v) * 1.5, v + fbm(u, v + 7.7)) - 0.42) * 2.6;
      /** Round the colours continuously, so two drifts never meet at a seam. */
      const along = tint(u * 0.5 + 11, v * 0.5) * NEBULA.length * 1.5;
      const k = Math.floor(along);
      const colour = mix(NEBULA[k % NEBULA.length], NEBULA[(k + 1) % NEBULA.length], along - k);
      const amount = Math.min(1, cloud * cloud * (0.25 + band * 0.9));
      const i = (y * w + x) * 4;
      img.data[i] = lerp(sky[0], colour[0], amount * 0.75);
      img.data[i + 1] = lerp(sky[1], colour[1], amount * 0.75);
      img.data[i + 2] = lerp(sky[2], colour[2], amount * 0.75);
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scratch, 0, 0, width, height);
  dither(ctx, width, height, random);

  /** Stars: thicker toward the band, thinning toward the poles of the sphere they sit on. */
  const count = Math.round((width * height) / 1100);
  for (let i = 0; i < count; i++) {
    const x = random() * width;
    const y = Math.acos(1 - 2 * random()) / Math.PI * height;
    const elevation = (0.5 - y / height) * Math.PI;
    if (elevation < -0.15 && random() < 0.6) continue;
    const bright = Math.pow(random(), 7);
    const size = 0.35 + bright * 1.1;
    const alpha = 0.2 + bright * 0.8;
    const hue = random();
    const colour = hue < 0.08 ? '255, 214, 170' : hue < 0.16 ? '190, 210, 255' : hue < 0.2 ? '255, 190, 240' : '255, 250, 245';
    ctx.fillStyle = `rgba(${colour}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The painted night as a texture, or null where there is no canvas (tests under Node). */
export function createCosmosTexture(GFX, { width = 4096, height = 2048, random } = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  /** Read back once, to dither: a canvas that says so up front keeps that cheap. */
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  paintCosmos(ctx, width, height, { random });
  const texture = new GFX.CanvasTexture(canvas);
  texture.colorSpace = GFX.SRGBColorSpace;
  return texture;
}
