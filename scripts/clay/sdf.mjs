// Signed distance primitives and a tiny scene evaluator for rendering clay art.
// Stand-in for the Blender pipeline in the spec: every mascot and prop is built
// from smoothly blended SDF primitives and lit from the top-left, matching the
// CSS clay shadow recipe (light inner shadow top-left, dark bottom-right).
// Formulas follow Inigo Quilez's reference distance functions.

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const len2 = (x, y) => Math.sqrt(x * x + y * y);
const len3 = (x, y, z) => Math.sqrt(x * x + y * y + z * z);

// ---------- 3D primitives, all in local space ----------

const prim = {
  sphere: (x, y, z, s) => len3(x, y, z) - s.r,
  ellipsoid: (x, y, z, s) => {
    const [a, b, c] = s.r;
    const k0 = len3(x / a, y / b, z / c);
    const k1 = len3(x / (a * a), y / (b * b), z / (c * c));
    return (k0 * (k0 - 1)) / k1;
  },
  capsule: (x, y, z, s) => {
    const [ax, ay, az] = s.a, [bx, by, bz] = s.b;
    const pax = x - ax, pay = y - ay, paz = z - az;
    const bax = bx - ax, bay = by - ay, baz = bz - az;
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    return len3(pax - bax * h, pay - bay * h, paz - baz * h) - s.r;
  },
  roundBox: (x, y, z, s) => {
    const qx = Math.abs(x) - s.b[0], qy = Math.abs(y) - s.b[1], qz = Math.abs(z) - s.b[2];
    return len3(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - s.r;
  },
  // Arc of a torus in the XY plane, centred on +Y. Flip with rotation for smiles.
  arc: (x, y, z, s) => {
    const sc0 = Math.sin(s.angle), sc1 = Math.cos(s.angle);
    x = Math.abs(x);
    const k = sc1 * x > sc0 * y ? x * sc0 + y * sc1 : len2(x, y);
    return Math.sqrt(Math.max(x * x + y * y + z * z + s.ra * s.ra - 2 * s.ra * k, 0)) - s.rb;
  },
  roundCylinder: (x, y, z, s) => {
    const dx = len2(x, z) - s.ra + s.rb, dy = Math.abs(y) - s.h;
    return Math.min(Math.max(dx, dy), 0) + len2(Math.max(dx, 0), Math.max(dy, 0)) - s.rb;
  },
  // Rounded cone along Y from radius r1 at y=0 to r2 at y=h.
  roundCone: (x, y, z, s) => {
    const { r1, r2, h } = s;
    const qx = len2(x, z), qy = y;
    const b = (r1 - r2) / h, a = Math.sqrt(1 - b * b);
    const k = qx * -b + qy * a;
    if (k < 0) return len2(qx, qy) - r1;
    if (k > a * h) return len2(qx, qy - h) - r2;
    return qx * a + qy * b - r1;
  },
  // Cone frustum along Y: radius r1 at y=-h, r2 at y=+h, edges rounded by rr.
  cappedCone: (x, y, z, s) => {
    const { h, r1, r2, rr = 0 } = s;
    const qx = len2(x, z), qy = y;
    const k1x = r2, k1y = h, k2x = r2 - r1, k2y = 2 * h;
    const cax = qx - Math.min(qx, qy < 0 ? r1 : r2), cay = Math.abs(qy) - h;
    const t = clamp(((k1x - qx) * k2x + (k1y - qy) * k2y) / (k2x * k2x + k2y * k2y), 0, 1);
    const cbx = qx - k1x + k2x * t, cby = qy - k1y + k2y * t;
    const sgn = cbx < 0 && cay < 0 ? -1 : 1;
    return sgn * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby)) - rr;
  },
};

// Euler rotation (radians, applied X then Y then Z). We store the inverse (transpose).
function rotation([rx = 0, ry = 0, rz = 0] = []) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx
  const m = [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
  // transpose for inverse
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function hexToLinear(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return c;
}

/**
 * A scene is a list of groups. Primitives inside a group blend smoothly
 * (radius `k`) and blend their colours at the seams, like pressed clay.
 * Groups combine with a hard union.
 *
 * prim: { type, pos:[x,y,z], rot:[rx,ry,rz], color:'#hex', gloss?:0..1, ...params }
 */
export function compileScene(groups) {
  return groups.map((g) => {
    const prims = g.prims.map((p) => ({
      fn: prim[p.type],
      s: p,
      px: p.pos?.[0] ?? 0, py: p.pos?.[1] ?? 0, pz: p.pos?.[2] ?? 0,
      m: p.rot ? rotation(p.rot) : null,
      sz: p.squashZ ?? 1,
      col: hexToLinear(p.color),
      gloss: p.gloss ?? 0,
      mirror: !!p.mirrorX,
    }));
    return { k: g.k ?? 0, prims, bound: g.bound ?? null };
  });
}

function evalPrim(pr, x, y, z) {
  x -= pr.px; y -= pr.py; z -= pr.pz;
  if (pr.m) {
    const m = pr.m;
    const nx = m[0] * x + m[1] * y + m[2] * z;
    const ny = m[3] * x + m[4] * y + m[5] * z;
    const nz = m[6] * x + m[7] * y + m[8] * z;
    x = nx; y = ny; z = nz;
  }
  if (pr.sz !== 1) return pr.fn(x, y, z * pr.sz, pr.s) / pr.sz;
  return pr.fn(x, y, z, pr.s);
}

// Distance only: the hot path for marching.
export function sceneDist(scene, x, y, z) {
  let best = 1e9;
  for (let gi = 0; gi < scene.length; gi++) {
    const g = scene[gi];
    if (g.bound) {
      const bd = len3(x - g.bound[0], y - g.bound[1], z - g.bound[2]) - g.bound[3];
      if (bd > best || bd > 0.25) { if (bd < best) best = bd; continue; }
    }
    let d = 1e9;
    const k = g.k;
    for (let i = 0; i < g.prims.length; i++) {
      const pr = g.prims[i];
      let di = evalPrim(pr, pr.mirror ? Math.abs(x) : x, y, z);
      if (k > 0) {
        const s = clamp(0.5 + (0.5 * (di - d)) / k, 0, 1);
        d = di + (d - di) * s - k * s * (1 - s);
      } else if (di < d) d = di;
    }
    if (d < best) best = d;
  }
  return best;
}

// Distance plus blended colour and gloss at a surface point.
export function sceneMaterial(scene, x, y, z) {
  let best = 1e9, col = [1, 0, 1], gloss = 0;
  for (const g of scene) {
    let d = 1e9, c = null, gl = 0;
    for (const pr of g.prims) {
      const di = evalPrim(pr, pr.mirror ? Math.abs(x) : x, y, z);
      const pc = typeof pr.s.colorAt === "function" ? pr.s.colorAt(x, y, z) ?? pr.col : pr.col;
      if (c === null) { d = di; c = pc.slice(); gl = pr.gloss; continue; }
      if (g.k > 0) {
        const s = clamp(0.5 + (0.5 * (di - d)) / g.k, 0, 1);
        // s = weight of the existing blend; (1 - s) = weight of the new primitive
        d = di + (d - di) * s - g.k * s * (1 - s);
        for (let j = 0; j < 3; j++) c[j] = pc[j] + (c[j] - pc[j]) * s;
        gl = pr.gloss + (gl - pr.gloss) * s;
      } else if (di < d) { d = di; c = pc.slice(); gl = pr.gloss; }
    }
    if (d < best) { best = d; col = c; gloss = gl; }
  }
  return { d: best, col, gloss };
}
