/** How wide the copy of the night the glass reflects is, in texels: plenty for a ball this size. */
const WIDTH = 512;

/**
 * The parlour round the table, as the brass sees it: a couple of warm lamps
 * low in the dark and a glow off the cloth. They are only in what is
 * reflected, never in the backdrop — without them polished brass under a
 * night sky reflects night, and comes out black.
 */
function lamps(ctx, width, height) {
  const glow = (x, y, r, colour, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${colour}, ${alpha})`);
    g.addColorStop(1, `rgba(${colour}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(width * 0.18, height * 0.42, height * 0.22, '255, 196, 120', 0.9);
  glow(width * 0.62, height * 0.38, height * 0.18, '255, 180, 110', 0.75);
  glow(width * 0.88, height * 0.46, height * 0.14, '230, 150, 255', 0.5);
  const floor = ctx.createLinearGradient(0, height * 0.55, 0, height);
  floor.addColorStop(0, 'rgba(120, 50, 140, 0.35)');
  floor.addColorStop(1, 'rgba(40, 14, 50, 0.2)');
  ctx.fillStyle = floor;
  ctx.fillRect(0, height * 0.55, width, height * 0.45);
}

/**
 * What the glass and the brass reflect: the night round them (`cosmos.js`),
 * shrunk to a size the prefilter takes in its stride. A sphere wraps a map
 * round the other way to the way a reflection reads one, so the copy is
 * turned over to put everything where the backdrop has it.
 */
export function buildEnvironment({ stage, GFX, sky }) {
  if (!sky) return;
  try {
    const c = document.createElement('canvas');
    c.width = WIDTH; c.height = WIDTH / 2;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(sky, 0, 0, c.width, c.height);
    lamps(ctx, c.width, c.height);
    const tex = new GFX.Texture(c);
    tex.mapping = GFX.EquirectangularReflectionMapping;
    tex.colorSpace = GFX.SRGBColorSpace;
    tex.needsUpdate = true;
    const pmrem = new GFX.PMREMGenerator(stage._renderer);
    stage._scene.environment = pmrem.fromEquirectangular(tex).texture;
    pmrem.dispose(); tex.dispose();
  } catch {
  }
}

/**
 * Light it like a fortune teller's table: one warm lamp high in front, the
 * stage's back fill put out, and the soft wash turned down and toward violet
 * so the visions are the brightest thing there. The light from the glass
 * itself is `index.js`'s — it changes colour with the mist.
 */
export function candlelight(stage) {
  if (stage._key) {
    stage._key.color.set('#ffd9a8');
    stage._key.intensity = 1.1;
  }
  if (stage._fill) stage._fill.visible = false;
  stage._scene?.traverse?.((o) => {
    if (o.isHemisphereLight) {
      o.color.set('#6a5a9a');
      o.groundColor.set('#1a1024');
      o.intensity = 0.55;
    }
  });
}
