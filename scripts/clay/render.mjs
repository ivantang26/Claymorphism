// Raymarches one compiled clay scene into a straight-alpha RGBA buffer.
// Lighting is set up to match the CSS clay recipe: key light from the
// top-left-front, cool fill from below-right, soft rim, low clay sheen.

import { sceneDist, sceneMaterial } from "./sdf.mjs";

const norm = (x, y, z) => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

// Cheap 3D value noise for a hand-pressed surface.
function hash(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), l(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    l(l(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), l(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}

export function renderScene(scene, opts) {
  const { width, height = width, ss = 2, frame, bump = 0.0045, camZ = 9, rot } = opts;
  // Optional whole-scene rotation, applied to sample points (inverse transform).
  let M = null;
  if (rot) {
    const [rx, ry, rz] = rot;
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    const m = [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx, sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx, -sy, cy * sx, cy * cx];
    M = [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
  }
  const xf = M
    ? (x, y, z) => [M[0] * x + M[1] * y + M[2] * z, M[3] * x + M[4] * y + M[5] * z, M[6] * x + M[7] * y + M[8] * z]
    : (x, y, z) => [x, y, z];
  const W = width * ss, H = height * ss, aspect = height / width;
  const dist = (wx, wy, wz) => {
    const [x, y, z] = xf(wx, wy, wz);
    const d = sceneDist(scene, x, y, z);
    if (d < 0.04 && bump > 0) return d + bump * (vnoise(x * 7, y * 7, z * 7) - 0.5) + bump * 0.5 * (vnoise(x * 19, y * 19, z * 19) - 0.5);
    return d;
  };

  const eye = [frame.cx, frame.cy, camZ];
  const focal = camZ / frame.half; // maps frame.half at z=0 to the image edge

  const L = norm(-0.55, 0.75, 0.62); // key light (top-left, toward viewer)
  const F = norm(0.6, -0.5, 0.4); // fill (bottom-right)
  const keyCol = [1.0, 0.97, 0.92];
  const skyCol = [0.62, 0.64, 0.75];
  const groundCol = [0.55, 0.45, 0.42];

  const acc = new Float64Array(width * height * 4);

  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const u = ((i + 0.5) / W) * 2 - 1;
      const v = (1 - ((j + 0.5) / H) * 2) * aspect;
      const [dx, dy, dz] = norm(u, v, -focal);
      // march
      let t = camZ - frame.half * 2.2, hit = false;
      let px = 0, py = 0, pz = 0;
      for (let s = 0; s < 160; s++) {
        px = eye[0] + dx * t; py = eye[1] + dy * t; pz = eye[2] + dz * t;
        const d = dist(px, py, pz);
        if (d < 0.0006 * t * 0.15) { hit = true; break; }
        t += d * 0.9;
        if (t > camZ + frame.half * 3) break;
      }
      const oi = ((j / ss | 0) * width + (i / ss | 0)) * 4;
      if (!hit) continue;

      // normal (tetrahedron)
      const e = 0.0015;
      const n = norm(
        dist(px + e, py - e, pz - e) - dist(px - e, py - e, pz + e) - dist(px - e, py + e, pz - e) + dist(px + e, py + e, pz + e),
        -dist(px + e, py - e, pz - e) - dist(px - e, py - e, pz + e) + dist(px - e, py + e, pz - e) + dist(px + e, py + e, pz + e),
        -dist(px + e, py - e, pz - e) + dist(px - e, py - e, pz + e) - dist(px - e, py + e, pz - e) + dist(px + e, py + e, pz + e),
      );
      const { col, gloss } = sceneMaterial(scene, ...xf(px, py, pz));

      // ambient occlusion
      let occ = 0, sca = 1;
      for (let k = 1; k <= 5; k++) {
        const h = 0.02 + 0.07 * k;
        occ += (h - dist(px + n[0] * h, py + n[1] * h, pz + n[2] * h)) * sca;
        sca *= 0.7;
      }
      const ao = Math.max(0, Math.min(1, 1 - 1.6 * occ));

      // soft shadow toward key light
      let sh = 1, st = 0.04;
      const ox = px + n[0] * 0.01, oy = py + n[1] * 0.01, oz = pz + n[2] * 0.01;
      for (let k = 0; k < 40 && st < 3; k++) {
        const h = dist(ox + L[0] * st, oy + L[1] * st, oz + L[2] * st);
        sh = Math.min(sh, (10 * h) / st);
        if (sh < 0.02) break;
        st += Math.max(0.015, h);
      }
      sh = Math.max(0, Math.min(1, sh));
      sh = sh * sh * (3 - 2 * sh);

      const ndl = n[0] * L[0] + n[1] * L[1] + n[2] * L[2];
      const wrap = Math.max(0, (ndl + 0.35) / 1.35);
      const diff = wrap * (0.35 + 0.65 * sh);
      const hemi = 0.5 + 0.5 * n[1];
      const ndf = Math.max(0, n[0] * F[0] + n[1] * F[1] + n[2] * F[2]);
      const vx = -dx, vy = -dy, vz = -dz;
      const ndv = Math.max(0, n[0] * vx + n[1] * vy + n[2] * vz);
      const rim = Math.pow(1 - ndv, 3);
      const [hx, hy, hz] = norm(L[0] + vx, L[1] + vy, L[2] + vz);
      const ndh = Math.max(0, n[0] * hx + n[1] * hy + n[2] * hz);
      const specPow = 18 + gloss * 160;
      const spec = Math.pow(ndh, specPow) * (0.1 + gloss * 1.4) * sh;

      const out = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const amb = (skyCol[c] * hemi + groundCol[c] * (1 - hemi)) * 0.62 * ao;
        // subsurface-ish: shadowed clay stays saturated rather than going grey
        const sss = col[c] * col[c] * (1 - wrap) * 0.35 * ao;
        let v2 = col[c] * (keyCol[c] * diff * 0.78 + amb + ndf * 0.1 * ao) + sss;
        v2 += rim * 0.16 * ao * (0.6 + 0.4 * col[c]);
        v2 += spec * keyCol[c];
        // gentle filmic shoulder
        v2 = v2 / (1 + v2 * 0.18) * 1.18;
        out[c] = v2;
      }
      acc[oi] += out[0]; acc[oi + 1] += out[1]; acc[oi + 2] += out[2]; acc[oi + 3] += 1;
    }
  }

  const buf = Buffer.alloc(width * height * 4);
  const samples = ss * ss;
  const toSrgb = (v) => {
    v = Math.max(0, Math.min(1, v));
    return Math.round((v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255);
  };
  for (let p = 0; p < width * height; p++) {
    const a = acc[p * 4 + 3];
    if (a === 0) continue;
    buf[p * 4] = toSrgb(acc[p * 4] / a);
    buf[p * 4 + 1] = toSrgb(acc[p * 4 + 1] / a);
    buf[p * 4 + 2] = toSrgb(acc[p * 4 + 2] / a);
    buf[p * 4 + 3] = Math.round((a / samples) * 255);
  }
  return buf;
}
