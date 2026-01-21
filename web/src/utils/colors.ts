// src/utils/colors.ts
// dependency-free "Turbo-like" gradient sampler (approx)
// If you already have a working turboRGBA, keep yours.

export function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

// A small hardcoded Turbo palette (11 stops) and linear interpolation
const TURBO_STOPS: Array<[number, number, number]> = [
  [48, 18, 59],
  [50, 82, 166],
  [33, 145, 140],
  [36, 187, 112],
  [111, 216, 73],
  [191, 229, 64],
  [253, 231, 37],
  [248, 170, 45],
  [239, 107, 70],
  [215, 49, 90],
  [166, 1, 104],
];

export function turboRGBA(x01: number, alpha = 235): [number, number, number, number] {
  const x = clamp01(x01);
  const n = TURBO_STOPS.length;
  const p = x * (n - 1);
  const i = Math.floor(p);
  const t = p - i;

  const a = TURBO_STOPS[Math.max(0, Math.min(n - 1, i))];
  const b = TURBO_STOPS[Math.max(0, Math.min(n - 1, i + 1))];

  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);

  return [r, g, bl, alpha];
}
