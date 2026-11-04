/** Prozedurale Bewegungsebenen und Gehzyklus für Person2 (reine Funktionen von Zeit/Phase, ohne Zustand → deterministisch pro Bild). */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const smoother = (k: number) => { const x = clamp01(k); return x * x * x * (x * (x * 6 - 15) + 10); };
/** deterministische Pseudo-Zufallszahl 0..1 aus Ganzzahl-Schlüsseln */
export const rnd = (...n: number[]) => { let h = 2166136261; for (const x of n) { h ^= Math.floor(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((h >>> 0) % 100000) / 100000; };

/** Lidschluss 0..1: etwa alle 2–5 s, Dauer 0,16 s, gelegentlich Doppelblinzeln; je Figur versetzt (seed). */
export const blinkAmount = (t: number, seed: number): number => {
  const P = 3.3, T = t + seed * 1.7, n = Math.floor(T / P), u = T - n * P;
  const t1 = 0.4 + rnd(n, seed) * 2.2, dbl = rnd(n, seed, 7) < 0.22;
  const lid = (s: number) => { const x = (u - s) / 0.16; return x > 0 && x < 1 ? Math.sin(x * Math.PI) : 0; };
  return Math.max(lid(t1), dbl ? lid(t1 + 0.3) : 0);
};

export type Idle = {torsoX: number; torsoZ: number; headX: number; headY: number; headZ: number; hipsX: number; hipsYaw: number; shoulder: number; chest: number};
/** Atmen (≈ 16/min), Gewichtsverlagerung und minimale Kopfbewegung. `e` = Lebendigkeit (0 aus, 1 normal). */
export const idleLayer = (t: number, seed: number, e: number): Idle => {
  const s = seed * 2.3, br = Math.sin(t * 2 * Math.PI * 0.27 + s);
  return {
    torsoX: br * 0.012 * e, torsoZ: Math.sin(t * 2 * Math.PI * 0.09 + s) * 0.018 * e, shoulder: br * 0.014 * e, chest: br * 0.016 * e,
    headX: (Math.sin(t * 0.7 + s) * 0.02 - br * 0.008) * e, headY: (Math.sin(t * 0.43 + s * 1.3) * 0.05 + Math.sin(t * 1.1 + s) * 0.012) * e, headZ: Math.sin(t * 0.37 + s * 0.7) * 0.025 * e,
    hipsX: Math.sin(t * 2 * Math.PI * 0.09 + s) * 0.035 * e, hipsYaw: Math.sin(t * 0.31 + s) * 0.02 * e,
  };
};

/* ───────────── Gehzyklus mit Fußkontakt (Zwei-Knochen-IK in der Beinebene) ───────────── */
export const L1 = 0.55, L2 = 0.54, ANKLE = 0.15, PIVOT = 0.1;      // Oberschenkel, Schienbein, Knöchelhöhe über der Sohle, Hüftgelenk unter dem Hüftursprung
export const STAND_HIPS = PIVOT + L1 + L2 + ANKLE;                  // Hüftursprung-Höhe bei gestrecktem Bein: Sohle auf y = 0
export type Gait = {D: number; beta: number; lift: number; Lm: number; arm: number; lean: number; elbow: number};
export const WALK: Gait = {D: 1.5, beta: 0.62, lift: 0.14, Lm: 0.985, arm: 0.5, lean: 0.05, elbow: 0.35};
export const RUN: Gait = {D: 2.8, beta: 0.4, lift: 0.32, Lm: 0.97, arm: 0.9, lean: 0.2, elbow: 1.2};

/** Fußposition relativ zur Hüfte (vorwärts +) in Phase p (0..1): Standphase linear rückwärts (= Bodengeschwindigkeit, kein Rutschen), Schwungphase mit Anheben. */
export const footAt = (p: number, g: Gait) => {
  const half = (g.beta * g.D) / 2;
  if (p < g.beta) return {x: half - 2 * half * (p / g.beta), lift: 0, stance: true};
  const u = (p - g.beta) / (1 - g.beta), e = u * u * (3 - 2 * u);
  return {x: -half + 2 * half * e, lift: g.lift * Math.sin(Math.PI * u), stance: false};
};

/** Beinwinkel (Drehung um x) für Knöchelziel (z vorwärts, y relativ zum Hüftgelenk). */
export const solveLeg = (dz: number, dy: number) => {
  const reach = L1 + L2, d = Math.min(reach * 0.9995, Math.max(Math.abs(L1 - L2) + 1e-3, Math.hypot(dz, dy)));
  const knee = Math.PI - Math.acos((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2));
  const b1 = Math.acos(Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d)));
  const alpha = Math.atan2(dz, -dy);
  return {th: -(alpha + b1), kn: knee};
};

export type GaitPose = {pivotH: number; legs: [{th: number; kn: number}, {th: number; kn: number}]; armL: number; armR: number; elbow: number; torsoY: number; torsoX: number; hipsYaw: number; hipsX: number};
/** phase in Zyklen (Strecke / D). Linkes Bein Phase p, rechtes p + 0,5. */
export const gaitPose = (phase: number, g: Gait): GaitPose => {
  const pL = ((phase % 1) + 1) % 1, pR = (pL + 0.5) % 1;
  const fL = footAt(pL, g), fR = footAt(pR, g);
  const reach = g.Lm * (L1 + L2);
  let H = reach + ANKLE;
  for (const f of [fL, fR]) if (f.stance) H = Math.min(H, Math.sqrt(Math.max(0.01, reach * reach - f.x * f.x)) + ANKLE);
  const leg = (f: ReturnType<typeof footAt>) => solveLeg(f.x, -H + ANKLE + f.lift);
  const c = Math.cos(2 * Math.PI * pL);
  return {
    pivotH: H, legs: [leg(fL), leg(fR)], armL: g.arm * c, armR: -g.arm * c, elbow: g.elbow,
    torsoY: 0.12 * Math.sin(2 * Math.PI * pL) * (g.arm / 0.5), torsoX: g.lean, hipsYaw: -0.08 * Math.sin(2 * Math.PI * pL) * (g.arm / 0.5), hipsX: 0.03 * Math.sin(2 * Math.PI * pL),
  };
};
