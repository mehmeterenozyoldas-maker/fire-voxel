import * as THREE from 'three';

// --- SDF Primitives ---

/**
 * Signed distance to a Sphere
 * @param p Point position
 * @param r Radius
 */
export const sdSphere = (p: THREE.Vector3, r: number): number => {
  return p.length() - r;
};

/**
 * Signed distance to a Vertical Capsule
 * @param p Point position
 * @param h Height (length of the straight part)
 * @param r Radius
 */
export const sdCapsule = (p: THREE.Vector3, h: number, r: number): number => {
  const pY = p.y;
  // clamp p.y between -h/2 and h/2 to find closest point on segment
  const y = THREE.MathUtils.clamp(pY, -h / 2, h / 2);
  
  // Distance from p to that point on the axis (0, y, 0)
  const distToAxis = Math.sqrt(p.x * p.x + (pY - y) * (pY - y) + p.z * p.z);
  
  return distToAxis - r;
};

// --- SDF Operations ---

/**
 * Polynomial Smooth Union (kinda like a blend)
 * @param d1 Distance 1
 * @param d2 Distance 2
 * @param k Smoothing factor
 */
export const opSmoothUnion = (d1: number, d2: number, k: number): number => {
  const h = Math.max(k - Math.abs(d1 - d2), 0.0) / k;
  return Math.min(d1, d2) - h * h * k * (1.0 / 4.0);
};

// --- Noise Implementation ---
// A simple, fast 3D noise implementation for the flickering effect without heavy dependencies.
// Based on a permutation table.

const PERM = new Uint8Array(512);
const P = new Uint8Array(256);
for (let i = 0; i < 256; i++) P[i] = i;
// Shuffle
let seed = 42;
const random = () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};
for (let i = 255; i > 0; i--) {
  const r = Math.floor(random() * (i + 1));
  const t = P[i];
  P[i] = P[r];
  P[r] = t;
}
for (let i = 0; i < 512; i++) PERM[i] = P[i & 255];

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (t: number, a: number, b: number) => a + t * (b - a);
const grad = (hash: number, x: number, y: number, z: number) => {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
};

export const noise3D = (x: number, y: number, z: number): number => {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;

  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);

  const u = fade(x);
  const v = fade(y);
  const w = fade(z);

  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  return lerp(
    w,
    lerp(
      v,
      lerp(u, grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z)),
      lerp(u, grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z))
    ),
    lerp(
      v,
      lerp(u, grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1)),
      lerp(u, grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1))
    )
  );
};
