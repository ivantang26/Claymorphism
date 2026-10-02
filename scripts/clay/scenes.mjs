// Scene definitions for every clay render on the site. Each export returns
// { groups, frame, width, height } ready for compileScene + renderScene.

import { hexToLinear } from "./sdf.mjs";

const INK = "#2D2A3E";
const CHEEK = "#FF9AAE";
const WHITE = "#FFFDF8";

// z of an ellipsoid surface at (x, y), for sitting face parts on the body.
function surfaceZ([a, b, c], x, y) {
  const t = 1 - (x / a) ** 2 - (y / b) ** 2;
  return c * Math.sqrt(Math.max(t, 0));
}

// Eyes, cheeks and mouth for a body ellipsoid centred on the origin.
function face(body, { mood = "idle", eyeX = 0.3, eyeY = 0.2, mouthY = -0.1 } = {}) {
  const facePrims = []; // hard-unioned: eyes and mouth
  const cheeks = []; // blended into the body
  const eyeZ = surfaceZ(body, eyeX, eyeY);
  const tilt = -Math.asin(Math.min(0.9, eyeY / body[1]) * 0.7);

  if (mood === "happy") {
    // closed, smiling eyes ^ ^
    facePrims.push({ type: "arc", pos: [eyeX, eyeY - 0.03, eyeZ + 0.005], rot: [tilt, 0, 0], angle: 1.15, ra: 0.1, rb: 0.03, color: INK, mirrorX: true, gloss: 0.3 });
  } else {
    facePrims.push({ type: "ellipsoid", pos: [eyeX, eyeY, eyeZ - 0.035], r: [0.105, 0.135, 0.08], color: INK, gloss: 0.9, mirrorX: true });
    facePrims.push({ type: "sphere", pos: [eyeX - 0.035, eyeY + 0.055, eyeZ + 0.035], r: 0.032, color: WHITE, gloss: 0.2, mirrorX: true });
  }

  const cheekX = eyeX + 0.24, cheekY = eyeY - 0.26;
  cheeks.push({ type: "ellipsoid", pos: [cheekX, cheekY, surfaceZ(body, cheekX, cheekY) - 0.035], r: [0.13, 0.085, 0.06], color: CHEEK, mirrorX: true });

  const mz = surfaceZ(body, 0, mouthY);
  const mtilt = -Math.asin(Math.max(-0.9, Math.min(0.9, mouthY / body[1])) * 0.8);
  if (mood === "happy") {
    facePrims.push({ type: "ellipsoid", pos: [0, mouthY - 0.05, mz - 0.03], rot: [mtilt, 0, 0], r: [0.16, 0.12, 0.06], color: "#5B2A3C", gloss: 0.5 });
    facePrims.push({ type: "ellipsoid", pos: [0, mouthY - 0.11, mz + 0.0], rot: [mtilt, 0, 0], r: [0.08, 0.04, 0.035], color: "#FF7C93", gloss: 0.4 });
  } else {
    facePrims.push({ type: "arc", pos: [0, mouthY + 0.06, mz + 0.0], rot: [mtilt, 0, Math.PI], angle: 0.95, ra: 0.13, rb: 0.03, color: "#5B2A3C", gloss: 0.3 });
  }
  return { facePrims, cheeks };
}

function limbs(color, footColor, { mood, shoulder, footX = 0.38, footY = -0.88, bodyH = 1 }) {
  const [sx, sy] = shoulder;
  const hand = mood === "happy" ? [sx + 0.36, sy + 0.62, 0.18] : [sx + 0.3, sy - 0.3, 0.26];
  return [
    { type: "capsule", a: [sx, sy, 0.1], b: hand, r: 0.155, color, mirrorX: true },
    { type: "ellipsoid", pos: [footX, footY * bodyH, 0.2], r: [0.26, 0.14, 0.3], color: footColor, mirrorX: true },
  ];
}

function character({ body, color, footColor, extra = [], mood, eyeX, eyeY, mouthY, shoulder, footY, bodyColorAt }) {
  const { facePrims, cheeks } = face(body, { mood, eyeX, eyeY, mouthY });
  const bodyPrim = { type: "ellipsoid", pos: [0, 0, 0], r: body, color };
  if (bodyColorAt) bodyPrim.colorAt = bodyColorAt;
  return {
    groups: [
      { k: 0.09, prims: [bodyPrim, ...cheeks, ...extra, ...limbs(color, footColor, { mood, shoulder, footY: footY ?? -body[1] + 0.06 })] },
      { k: 0, prims: facePrims },
    ],
    frame: { cx: 0, cy: 0.18, half: 1.72 },
    width: 640,
  };
}

export const mascots = {
  pip: (mood) =>
    character({
      body: [1.0, 0.94, 0.88],
      color: "#FFB38A",
      footColor: "#F7A077",
      mood,
      shoulder: [0.82, -0.05],
      extra: [
        { type: "roundBox", pos: [0, 1.2, -0.05], b: [0.25, 0.05, 0.05], r: 0.07, color: "#FF9565" },
        { type: "roundBox", pos: [0, 1.2, -0.05], b: [0.05, 0.25, 0.05], r: 0.07, color: "#FF9565" },
      ],
    }),

  minty: (mood) =>
    character({
      body: [1.12, 0.84, 0.9],
      color: "#8FE3C3",
      footColor: "#7AD7B3",
      mood,
      eyeX: 0.34,
      eyeY: 0.16,
      mouthY: -0.12,
      shoulder: [0.95, -0.12],
      extra: [{ type: "roundBox", pos: [0, 0.99, -0.05], b: [0.32, 0.04, 0.06], r: 0.08, color: "#5CCBA2" }],
    }),

  lulu: (mood) =>
    character({
      body: [0.9, 1.02, 0.86],
      color: "#C7B3FF",
      footColor: "#B9A2FA",
      mood,
      eyeX: 0.28,
      eyeY: 0.24,
      mouthY: -0.08,
      shoulder: [0.74, -0.08],
      extra: [
        { type: "capsule", a: [-0.46, 0.78, -0.08], b: [0.36, 1.66, -0.08], r: 0.12, color: "#A68BFF" },
        { type: "capsule", a: [0.46, 0.78, -0.08], b: [-0.36, 1.66, -0.08], r: 0.12, color: "#A68BFF" },
      ],
    }),

  skye: (mood) => {
    const top = hexToLinear("#9ED4FF"), bottom = hexToLinear("#D4EDFF");
    return character({
      body: [0.98, 0.98, 0.9],
      color: "#9ED4FF",
      footColor: "#8CC8F7",
      mood,
      shoulder: [0.8, -0.06],
      // Skye wears a fraction bar: a lighter belly below a soft line
      bodyColorAt: (_x, y) => {
        const t = Math.min(1, Math.max(0, (-y - 0.265) / 0.07));
        return [0, 1, 2].map((c) => top[c] + (bottom[c] - top[c]) * t);
      },
      extra: [
        { type: "sphere", pos: [-0.2, 0.98, -0.02], r: 0.2, color: "#F5FAFF" },
        { type: "sphere", pos: [0.04, 1.08, 0.0], r: 0.23, color: "#F5FAFF" },
        { type: "sphere", pos: [0.28, 0.96, -0.04], r: 0.18, color: "#F5FAFF" },
      ],
    });
  },
};

// Floating island: grassy clay top, a rounded frustum underneath, a few pebbles.
export function island(top, under, pebble) {
  return {
    groups: [
      {
        k: 0.18,
        prims: [
          { type: "roundCylinder", pos: [0, 0, 0], ra: 1.42, rb: 0.16, h: 0.1, color: top },
          { type: "ellipsoid", pos: [0.15, 0.2, -0.2], r: [0.95, 0.2, 0.75], color: top },
          { type: "cappedCone", pos: [0, -0.62, 0], h: 0.5, r1: 0.34, r2: 1.26, rr: 0.1, color: under },
          { type: "sphere", pos: [0.12, -1.16, 0.08], r: 0.24, color: under },
          { type: "sphere", pos: [-0.62, -0.62, 0.62], r: 0.3, color: under },
          { type: "sphere", pos: [0.7, -0.5, 0.6], r: 0.26, color: under },
        ],
      },
      {
        k: 0.06,
        prims: [
          { type: "sphere", pos: [-0.98, 0.3, 0.5], r: 0.17, color: pebble },
          { type: "sphere", pos: [-0.7, 0.28, 0.8], r: 0.11, color: pebble },
          { type: "sphere", pos: [1.02, 0.29, 0.42], r: 0.13, color: pebble },
        ],
      },
    ],
    rot: [0.42, 0, 0],
    frame: { cx: 0, cy: -0.42, half: 1.62 },
    width: 640,
    height: 480,
  };
}

// Rolled clay "sausage" from a to b, flattened a little toward the viewer.
const roll = (a, b, r, color, squashZ = 1.35) => ({ type: "capsule", a, b, r, color, squashZ });
const ball = (pos, r, color, squashZ = 1.35) => ({ type: "sphere", pos, r, color, squashZ });

// A puffy reward star with a little face: five tapered arms pressed into a middle ball.
export function star(withFace = true) {
  const prims = [ball([0, 0, 0], 0.5, "#FFE27A", 1.5)];
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5;
    prims.push({ type: "cappedCone", rot: [0, 0, -a], pos: [Math.sin(a) * 0.62, Math.cos(a) * 0.62, 0], h: 0.42, r1: 0.3, r2: 0.08, rr: 0.1, color: "#FFE27A", squashZ: 1.5 });
  }
  const groups = [{ k: 0.14, prims }];
  if (withFace) {
    groups.push({
      k: 0,
      prims: [
        { type: "ellipsoid", pos: [-0.16, 0.08, 0.31], r: [0.065, 0.085, 0.05], color: INK, gloss: 0.9 },
        { type: "ellipsoid", pos: [0.16, 0.08, 0.31], r: [0.065, 0.085, 0.05], color: INK, gloss: 0.9 },
        { type: "arc", pos: [0, -0.06, 0.335], rot: [0, 0, Math.PI], angle: 0.9, ra: 0.1, rb: 0.026, color: "#6A3A2A" },
      ],
    });
  }
  return { groups, rot: [0.12, 0.38, 0], frame: { cx: 0, cy: 0.03, half: 1.3 }, width: 256, bump: 0.003 };
}

function sculpt(prims, { k = 0.1, rot = [-0.15, 0.4, 0], half = 1.1 } = {}) {
  return { groups: [{ k, prims }], rot, frame: { cx: 0, cy: 0, half }, width: 256, bump: 0.003 };
}

export const symbols = {
  plus: () => sculpt([roll([-0.62, 0, 0], [0.62, 0, 0], 0.2, "#FFB38A"), roll([0, -0.62, 0], [0, 0.62, 0], 0.2, "#FFB38A")]),
  minus: () => sculpt([roll([-0.62, 0, 0], [0.62, 0, 0], 0.21, "#8FE3C3")]),
  times: () => sculpt([roll([-0.48, -0.48, 0], [0.48, 0.48, 0], 0.2, "#C7B3FF"), roll([-0.48, 0.48, 0], [0.48, -0.48, 0], 0.2, "#C7B3FF")]),
  divide: () =>
    sculpt(
      [roll([-0.6, 0, 0], [0.6, 0, 0], 0.17, "#9ED4FF"), ball([0, 0.52, 0], 0.2, "#9ED4FF"), ball([0, -0.52, 0], 0.2, "#9ED4FF")],
      { k: 0 },
    ),
  // a chunky "play" triangle: three rolls round the edge, filled with a pressed slab
  play: () => {
    const P = [[-0.42, 0.62, 0], [-0.42, -0.62, 0], [0.66, 0, 0]];
    const c = "#FFB38A";
    return sculpt(
      [
        roll(P[0], P[1], 0.2, c), roll(P[1], P[2], 0.2, c), roll(P[2], P[0], 0.2, c),
        { type: "ellipsoid", pos: [-0.06, 0, 0], r: [0.42, 0.44, 0.16], color: c },
      ],
      { k: 0.14 },
    );
  },
  levelup: () => {
    const c = "#8FE3C3";
    return sculpt(
      [
        roll([0, -0.68, 0], [0, 0.3, 0], 0.2, c),
        roll([0, 0.64, 0], [-0.52, 0.12, 0], 0.2, c),
        roll([0, 0.64, 0], [0.52, 0.12, 0], 0.2, c),
      ],
      { k: 0.08 },
    );
  },
};

// Logo mark: a lemon coin with a peach plus pressed into it.
export function mark() {
  return {
    groups: [
      { k: 0, prims: [{ type: "roundCylinder", pos: [0, 0, 0], rot: [Math.PI / 2, 0, 0], ra: 0.95, rb: 0.22, h: 0.16, color: "#FFE27A" }] },
      {
        k: 0.06,
        prims: [roll([-0.44, 0, 0.36], [0.44, 0, 0.36], 0.16, "#FF9565", 1), roll([0, -0.44, 0.36], [0, 0.44, 0.36], 0.16, "#FF9565", 1)],
      },
    ],
    rot: [0.18, 0.3, 0],
    frame: { cx: 0, cy: 0, half: 1.2 },
    width: 256,
    bump: 0.003,
  };
}
