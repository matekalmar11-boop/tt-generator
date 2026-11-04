/**
 * Mundformen aus Piper-Phonemen (IPA, mit echten Dauern aus der Modell-Ausrichtung).
 * Zuordnung deutsch (Thorsten): Vokale → Öffnung/Rundung, Lippenlaute → geschlossen, f/v → Zähne-Unterlippe, übrige Konsonanten → leicht offen.
 * Unbekannte Zeichen werden NICHT geraten: sie ergeben die neutrale Konsonantenform und werden von tools/test (Abdeckung) gemeldet.
 */
export type Mouth = {open: number; wide: number; round: number; teeth: number; fv: number};
export type Phone = [number, number, string];   // [Start, Ende] in Autoren-Frames (absolut), IPA-Zeichen

const M = (open: number, wide = 0, round = 0, teeth = 0, fv = 0): Mouth => ({open, wide, round, teeth, fv});
export const SHAPES = {
  rest: M(0.04), closed: M(0.0), a: M(0.95, 0.15, 0, 0.5), e: M(0.58, 0.45, 0, 0.5), i: M(0.28, 0.95, 0, 0.7), o: M(0.6, 0, 0.85, 0), u: M(0.26, 0, 1, 0), fv: M(0.16, 0.2, 0, 0.8, 1), cons: M(0.22, 0.3, 0, 0.6),
} satisfies Record<string, Mouth>;
export type ShapeId = keyof typeof SHAPES;

const A = 'aɑɐæ', E = 'eɛəɜœ', I = 'iɪjɨ', O = 'oɔøɒ', U = 'uʊwyʏ';
const CLOSED = 'mbpʔ', FV = 'fv', CONS = 'tdszʃʒkgŋxçchrɾʁlnɡθðɹ';
const COMBINING = '̯̩̃͡ʰ̧̥̬̆';   // Kombinierzeichen (z. B. ç als c + Cedille): kein eigener Laut, verlängern den vorigen
const LEN = 'ː', STRESS = 'ˈˌ', PAUSE = ' .,!?;:—-…"“”«»()';

export const KNOWN = new Set([...A, ...E, ...I, ...O, ...U, ...CLOSED, ...FV, ...CONS, ...LEN, ...STRESS, ...PAUSE, '^', '$', ...COMBINING]);

export const shapeOf = (sym: string): ShapeId => {
  if (A.includes(sym)) return 'a';
  if (E.includes(sym)) return 'e';
  if (I.includes(sym)) return 'i';
  if (O.includes(sym)) return 'o';
  if (U.includes(sym)) return 'u';
  if (CLOSED.includes(sym)) return 'closed';
  if (FV.includes(sym)) return 'fv';
  if (PAUSE.includes(sym)) return 'rest';
  return 'cons';
};

export type Seg = {start: number; end: number; shape: ShapeId};
/** Stress-Zeichen entfernen, Längenzeichen verlängern den vorigen Laut, Zeichen ohne Mundwirkung (^ $ Kombizeichen) überspringen. */
export const prepare = (ph: Phone[]): Seg[] => {
  const out: Seg[] = [];
  for (const [s, e, sym] of ph) {
    if (sym === '^' || sym === '$' || STRESS.includes(sym)) continue;
    if (LEN.includes(sym) || '̯̩̃͡ʰ'.includes(sym)) { if (out.length) out[out.length - 1].end = e; continue; }
    out.push({start: s, end: e, shape: shapeOf(sym)});
  }
  return out;
};

const smooth = (x: number) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const mix = (a: Mouth, b: Mouth, k: number): Mouth => ({open: a.open + (b.open - a.open) * k, wide: a.wide + (b.wide - a.wide) * k, round: a.round + (b.round - a.round) * k, teeth: a.teeth + (b.teeth - a.teeth) * k, fv: a.fv + (b.fv - a.fv) * k});

/** Mundform zum Autoren-Frame f (fraktional). Übergänge zu den Nachbarlauten über `blend` Frames (Koartikulation). */
export const mouthAt = (segs: Seg[], f: number, blend = 1.6): Mouth | undefined => {
  if (!segs.length || f < segs[0].start - 3 || f > segs[segs.length - 1].end + 3) return undefined;
  let i = segs.findIndex((s) => f >= s.start && f < s.end);
  if (i < 0) { // Lücke zwischen zwei Lauten oder kurz vor/nach der Zeile → Ruheform
    return SHAPES.rest;
  }
  let m = SHAPES[segs[i].shape];
  const prev = segs[i - 1], next = segs[i + 1];
  if (prev && f - segs[i].start < blend) m = mix(SHAPES[prev.shape], m, smooth((f - segs[i].start) / blend * 0.5 + 0.5));
  if (next && segs[i].end - f < blend) m = mix(m, SHAPES[next.shape], smooth((blend - (segs[i].end - f)) / blend * 0.5));
  return m;
};
