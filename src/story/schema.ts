/**
 * Story-Schema (Schritt 1): beschreibt eine komplette Geschichte als YAML/JSON.
 * Reine Datenbeschreibung – keine Abhängigkeit zu Remotion/three, damit CLI und Renderer sie teilen können.
 * Welche Rigs/Kulissen/Objekte es gibt, steht NICHT hier, sondern in registry.ts (erweiterbar ohne Schemaänderung).
 */
import {z} from 'zod';

/* ───────────── Hilfen: Zeit, Winkel, Vektoren ───────────── */

export type ParsedTime =
  | {kind: 'abs'; value: number; unit: 's' | 'f'}
  | {kind: 'anchor'; ref: string; point: 'start' | 'end' | {word: number}; offset: {value: number; unit: 's' | 'f'}};

const T_ABS = /^(-?\d+(?:\.\d+)?)(f|s)$/;
const T_ANCHOR = /^(scene|[A-Za-z][\w-]*)\.(start|end|word(\d+))\s*(?:([+-])\s*(\d+(?:\.\d+)?)(f|s))?$/;
export const TIME_HELP =
  'erlaubt: Sekunden (1.5), Frames ("40f"), Sekunden mit Einheit ("1.5s") oder Anker wie "l03.start+12f", "l05.end-2f", "l06.word2+0.1s", "scene.end"';

export const parseTime = (v: unknown): ParsedTime | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return {kind: 'abs', value: v, unit: 's'};
  if (typeof v !== 'string') return null;
  const s = v.trim();
  let m = T_ABS.exec(s);
  if (m) return {kind: 'abs', value: Number(m[1]), unit: m[2] as 's' | 'f'};
  m = T_ANCHOR.exec(s);
  if (m) {
    const sign = m[4] === '-' ? -1 : 1;
    return {
      kind: 'anchor', ref: m[1],
      point: m[3] !== undefined ? {word: Number(m[3])} : (m[2] as 'start' | 'end'),
      offset: m[5] ? {value: sign * Number(m[5]), unit: m[6] as 's' | 'f'} : {value: 0, unit: 's'},
    };
  }
  return null;
};

/** Winkel in Radiant: Zahl, "pi", "0.85pi", "pi-0.15", "90deg". */
export const parseAngle = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  let m = /^\s*([+-]?\d*\.?\d+)\s*deg\s*$/.exec(v);
  if (m) return (Number(m[1]) * Math.PI) / 180;
  m = /^\s*([+-]?\d*\.?\d*)\s*pi\s*(?:([+-])\s*(\d*\.?\d+))?\s*$/.exec(v);
  if (m) {
    const k = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1]);
    return k * Math.PI + (m[2] ? (m[2] === '-' ? -1 : 1) * Number(m[3]) : 0);
  }
  return null;
};

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isVec3 = (v: unknown): v is [number, number, number] => Array.isArray(v) && v.length === 3 && v.every(isNum);

/** Eigener Typ mit deutscher Fehlermeldung statt zod-Standardtext. */
const checked = <T>(test: (v: unknown) => string | null) =>
  z.custom<T>((v) => test(v) === null, {error: (iss: {input?: unknown}) => test(iss.input) ?? 'ungültiger Wert'});

export type Vec3 = [number, number, number];
export type VecRef = Vec3 | {rel: string; off?: Vec3} | {obj: string; off?: Vec3};

export const Time = checked<number | string>((v) =>
  parseTime(v) ? null : `Ungültige Zeitangabe ${JSON.stringify(v)} – ${TIME_HELP}`);
export const Angle = checked<number | string>((v) =>
  parseAngle(v) !== null ? null : `Ungültiger Winkel ${JSON.stringify(v)} – erlaubt: Radiant (3.14), "pi", "0.85pi", "pi-0.15" oder "90deg"`);
export const Vec3S = checked<Vec3>((v) => (isVec3(v) ? null : `Erwartet [x, y, z] mit drei Zahlen, gefunden: ${JSON.stringify(v)}`));
export const VecRefS = checked<VecRef>((v) => {
  if (isVec3(v)) return null;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    const base = keys.filter((k) => k === 'rel' || k === 'obj');
    if (base.length === 1 && keys.every((k) => k === 'rel' || k === 'obj' || k === 'off')
      && typeof o[base[0]] === 'string' && (o.off === undefined || isVec3(o.off))) return null;
  }
  return `Erwartet [x, y, z] oder {rel: <Figur-ID oder "id.head">, off: [x,y,z]} oder {obj: <Objekt-ID>, off: [x,y,z]}, gefunden: ${JSON.stringify(v)}`;
});

const Color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe als Hex-Code mit 6 Stellen, z. B. "#ffd23d"');
const Id = z.string().regex(/^[A-Za-z][\w-]*$/, 'ID: Buchstaben, Zahlen, "_" oder "-", beginnt mit Buchstabe');
const num = z.number();
const Pair = z.tuple([num, num]);

export const EASES = ['lin', 'io', 'in', 'out', 'snap', 'cut'] as const;
export const Ease = z.enum(EASES);

/* ───────────── Stimmen ───────────── */

export const VoiceProfile = z.strictObject({
  engine: z.literal('piper').default('piper').describe('TTS-Engine (offline, kostenlos). Aktuell nur Piper.'),
  model: z.string().default('de_DE-thorsten-medium').describe('Piper-Modellname (Sprache steckt im Modell).'),
  lengthScale: num.min(0.5).max(2).default(1.08).describe('Sprechtempo: >1 = langsamer.'),
  noiseScale: num.min(0).max(1).default(0.6),
  noiseW: num.min(0).max(1).default(0.7),
  sentenceGap: num.min(0).max(2).default(0.24).describe('Pause zwischen Sätzen einer Zeile (Sekunden).'),
  loudness: num.min(-30).max(-6).default(-16).describe('Ziel-Lautheit in LUFS.'),
  effect: z.strictObject({
    pitch: num.min(0.5).max(1.5).default(1).describe('Tonhöhe, 1 = unverändert, <1 = tiefer.'),
    lowpassHz: num.min(1000).max(20000).optional(),
    eq: z.strictObject({freqHz: num, gainDb: num}).optional(),
    echo: z.strictObject({delayMs: num.min(1), decay: num.min(0).max(1)}).optional(),
  }).optional().describe('Klangeffekt, z. B. tiefe Drachenstimme. Zeilenlänge bleibt gleich.'),
  subtitle: z.strictObject({
    accent: Color.default('#ffd23d').describe('Farbe des gerade gesprochenen Wortes.'),
    label: z.string().optional().describe('Sprecher-Schild über dem Untertitel.'),
  }).default({accent: '#ffd23d'}),
});

/* ───────────── Besetzung ───────────── */

export const CastMember = z.strictObject({
  rig: Id.describe('Figurentyp aus der Registry (src/story/registry.ts), z. B. "finn", "dragon".'),
  name: z.string().optional(),
  role: z.string().optional(),
  voice: Id.optional().describe('Stimmenprofil aus "voices". Ohne Stimme: stumme Figur.'),
  look: z.record(z.string(), z.union([Color, num, z.string(), z.boolean()])).optional()
    .describe('Aussehen, z. B. {skin, hair, shirt}. Erlaubte Felder je Figurenart: siehe RIGS[...].looks in src/story/registry.ts.'),
});

/* ───────────── Keyframes ───────────── */

const TrackKey = z.strictObject({t: Time, v: num, ease: Ease.optional()});
const PathKey = z.strictObject({t: Time, pos: Vec3S, ease: Ease.optional()});
const PoseKey = z.strictObject({t: Time, pose: z.string(), mix: num.min(0).max(1).optional(), ease: Ease.optional()});
const FaceKey = z.strictObject({t: Time, face: z.string(), mix: num.min(0).max(1).optional(), ease: Ease.optional()});
const PropKey = z.strictObject({t: Time, prop: z.string()});
const Visible = z.strictObject({from: Time.optional(), to: Time.optional()});
const Tracks = z.record(z.string(), z.array(TrackKey).min(1));

const Rotate = z.strictObject({
  base: Vec3S.default([0, 0, 0]), amp: Vec3S.default([0, 0, 0]), freq: Vec3S.default([0, 0, 0]), rate: Vec3S.default([0, 0, 0]),
}).describe('Dauerhafte Drehung/Taumeln: rot = base + amp·sin(freq·t) + rate·t (Radiant, t in Sekunden).');

export const Actor = z.strictObject({
  id: Id,
  cast: Id.describe('Verweis auf eine Figur in "cast". Dieselbe Figur kann mehrfach auftreten (z. B. Rückblick-Geist).'),
  at: Vec3S.optional().describe('Feste Position. Alternativ "path".'),
  path: z.array(PathKey).min(1).optional().describe('Bewegung der Figur über Keyframes.'),
  yaw: Angle.default(0).describe('Blickrichtung um die Hochachse. 0 = +z (zur Kamera), "pi" = -z (weg von der Kamera).'),
  scale: num.positive().default(1),
  ghost: z.boolean().default(false).describe('Durchscheinende Silhouette (Rückblick).'),
  visible: Visible.optional(),
  pose: z.union([z.string(), z.array(PoseKey).min(1)]).optional().describe('Pose konstant oder als Keyframes (Überblendung von Key zu Key).'),
  face: z.union([z.string(), z.array(FaceKey).min(1)]).optional(),
  prop: z.union([z.string(), z.array(PropKey).min(1)]).optional().describe('Gehaltener Gegenstand; wechselt hart.'),
  params: z.record(z.string(), z.union([num, z.boolean(), z.string(), Vec3S])).optional().describe('Konstante Rig-Parameter, z. B. coil, flap.'),
  tracks: Tracks.optional().describe('Zeitverläufe numerischer Rig-Parameter, z. B. glow, coil, roar.'),
  rotate: Rotate.optional(),
});

export const SceneObject = z.strictObject({
  id: Id.optional(),
  type: z.string().describe('Objekttyp aus der Registry (src/story/registry.ts).'),
  at: VecRefS.optional(),
  path: z.array(PathKey).min(1).optional(),
  visible: Visible.optional(),
  params: z.record(z.string(), z.any()).optional(),
  tracks: Tracks.optional(),
});

/* ───────────── Kamera ───────────── */

export const CamKey = z.strictObject({
  t: Time,
  pos: VecRefS,
  look: VecRefS,
  fov: num.min(10).max(120).default(50),
  roll: Angle.default(0),
  ease: Ease.optional().describe('Kurve des Segments, das bei DIESEM Key ankommt (Standard: io).'),
  cut: z.boolean().optional().describe('Harter Schnitt: springt zu diesem Key, ohne vom vorigen zu überblenden.'),
});

export const Orbit = z.strictObject({
  from: Time, to: Time,
  center: VecRefS.describe('Mittelpunkt: [x,y,z] oder {rel: <Figur>, off: [..]} (folgt der Figur).'),
  radius: Pair, angle: z.tuple([Angle, Angle]), height: Pair,
  look: z.tuple([VecRefS, VecRefS]).describe('Blickziel am Anfang und am Ende.'),
  fov: Pair,
  steps: z.number().int().min(1).max(40).default(6).describe('Anzahl Zwischenkeys.'),
  ease: Ease.default('lin'),
}).describe('Kreisfahrt um einen Punkt; wird zu Keyframes ausgerollt und mit "keys" nach Zeit gemischt. center und look dürfen Verweise sein.');

export const Shake = z.strictObject({
  from: Time.optional(), to: Time.optional(),
  amp: num.min(0).max(2), speed: num.min(0.1).max(6).default(1),
});

export const PRESET_NAMES = ['push_in', 'orbit_in', 'whip_to', 'over_shoulder', 'crane_down', 'track_behind', 'dolly_zoom', 'handheld'] as const;
const FovS = z.union([num.min(10).max(120), z.tuple([num.min(10).max(120), num.min(10).max(120)])]);
export const Shot = z.strictObject({
  preset: z.enum(PRESET_NAMES).describe('Kamera-Preset, siehe CAMERA_PRESETS in src/story/registry.ts.'),
  from: Time.default(0), to: Time.default('scene.end'),
  target: VecRefS.optional().describe('Ziel des Blicks, z. B. {rel: finn, off: [0,1.6,0]}.'),
  subject: Id.optional().describe('Figur (Actor-ID), an der sich over_shoulder/track_behind ausrichten.'),
  offset: Vec3S.optional(), to_offset: Vec3S.optional(), look_offset: Vec3S.optional(),
  fov: FovS.optional(), distance: Pair.optional(), angle: z.tuple([Angle, Angle]).optional(), height: Pair.optional(),
  push: num.min(0).max(0.95).optional(),
  look_from: VecRefS.optional(), at: Time.optional(), duration: Time.optional(),
  amp: num.min(0).max(2).optional(), speed: num.min(0.1).max(6).optional(),
  transition: z.enum(['cut', 'blend']).default('cut').describe('Übergang vom vorigen Shot: harter Schnitt oder Überblendung.'),
  ease: Ease.optional(),
});

export const Camera = z.strictObject({
  keys: z.array(CamKey).default([]),
  orbits: z.array(Orbit).default([]),
  shots: z.array(Shot).default([]).describe('Kamera-Presets (push_in, orbit_in, whip_to, over_shoulder, crane_down, track_behind, dolly_zoom, handheld).'),
  shake: z.array(Shake).default([]).describe('Handkamera-Wackeln in Zeitabschnitten.'),
}).refine((c) => c.keys.length + c.orbits.length + c.shots.length > 0, {message: 'Kamera braucht mindestens einen Key, eine Kreisfahrt (orbits) oder ein Preset (shots).'});

/* ───────────── Kulisse, Himmel, Licht ───────────── */

export const SetSpec = z.strictObject({
  type: z.string().describe('Kulissentyp aus der Registry, z. B. "plateau", "forest", "cave", "abyss".'),
  params: z.record(z.string(), z.any()).optional(),
  tracks: Tracks.optional(),
});

export const Environment = z.strictObject({
  type: z.string().describe('"night_sky" (Himmel+Mond+Wolken+Inseln), "starry_sky" (Himmel+Sterne, optional Mond), "gradient" (nur Farbverlauf) oder "none".'),
  colors: z.strictObject({top: Color, mid: Color, bottom: Color}).optional(),
  stars: z.strictObject({rotation: num.default(0)}).optional(),
  moon: z.strictObject({pos: Vec3S, radius: num.positive().default(26), crack: num.min(0).max(1).default(0)}).optional(),
  islands: z.boolean().optional(),
  clouds: z.boolean().optional(),
  tracks: Tracks.optional().describe('z. B. crack (Mondrisse).'),
});

export const Light = z.strictObject({
  fog: z.strictObject({color: Color.default('#2a2250'), near: num.default(30), far: num.default(140)}).default({color: '#2a2250', near: 30, far: 140}),
  hemi: z.strictObject({sky: Color.default('#8aa0ff'), ground: Color.default('#2a1f4a'), intensity: num.default(0.8)}).default({sky: '#8aa0ff', ground: '#2a1f4a', intensity: 0.8}),
  ambient: num.default(0.15),
  key: z.strictObject({color: Color.default('#cdd8ff'), intensity: num.default(2.4), pos: Vec3S.default([-8, 22, 12]), shadowAt: VecRefS.default([0, 0, 0])})
    .default({color: '#cdd8ff', intensity: 2.4, pos: [-8, 22, 12], shadowAt: [0, 0, 0]}),
});

/* ───────────── Dialog, Ton, Blenden ───────────── */

export const Line = z.strictObject({
  id: Id,
  who: Id.describe('Sprecher (Figur aus "cast"). Seine Stimme und sein Mund werden verwendet.'),
  text: z.string().min(1).describe('Gesprochener Text (Deutsch). Gleichzeitig der Untertitel.'),
});

export const Sfx = z.strictObject({
  sound: z.string().describe('Name einer Datei in public/audio (ohne .wav), z. B. "whoosh_fast".'),
  at: Time,
  volume: num.min(0).max(2).default(1),
  loop: z.enum(['scene']).optional().describe('"scene": läuft bis zum Szenenende.'),
});

export const Caption = z.discriminatedUnion('type', [
  z.strictObject({type: z.literal('lower_third'), from: Time, to: Time, title: z.string(), subtitle: z.string().optional(),
    color: Color.optional().describe('Hintergrund des Titels (Vorgabe #ffd23d).'), bg: Color.optional().describe('Hintergrund der Unterzeile (Vorgabe #1a0f3a).')}),
  z.strictObject({type: z.literal('end_card'), from: Time, title: z.string(), subtitle: z.string().optional(),
    glow: Color.optional().describe('Leuchtfarbe des Titels (Vorgabe #ff7ad9).'), accent: Color.optional().describe('Farbe der Unterzeile (Vorgabe #ffd23d).')}),
  z.strictObject({type: z.literal('message'), from: Time, to: Time,
    style: z.enum(['chat', 'photo', 'lock']).default('chat').describe('chat = Smartphone-Chatkarte (Absender, Nachricht, Zeit) · photo = Foto-Rahmen mit Zeitstempel (+ optional Kamerablitz) · lock = Sperrbildschirm mit Uhrzeit und Datum.'),
    sender: z.string().optional().describe('chat: Absendername (Avatar-Initiale wird automatisch gezeichnet); photo: kleines Etikett oben.'),
    text: z.string().optional().describe('chat: Nachrichtentext · lock: Datumszeile (z. B. "Dienstag").'),
    time: z.string().optional().describe('chat: kleine Zeitangabe · photo: Zeitstempel unten · lock: große Uhrzeit.'),
    status: z.string().optional().describe('chat: Zeile unter der Nachricht (z. B. "Zugestellt").'),
    flash: z.boolean().optional().describe('photo: Kamerablitz (weißes Aufblitzen) zu Beginn.'),
    accent: Color.optional().describe('chat: Farbe der Nachrichtenblase (Vorgabe #2f6bff).')}),
  z.strictObject({type: z.literal('title'), from: Time, to: Time, text: z.string(), subtitle: z.string().optional(),
    position: z.enum(['top', 'center', 'bottom']).default('center'), color: Color.optional()}),
]);

/* ───────────── Szene ───────────── */

export const Scene = z.strictObject({
  id: Id,
  title: z.string().optional(),
  notes: z.string().optional(),
  set: SetSpec,
  environment: Environment.optional(),
  light: Light.default({
    fog: {color: '#2a2250', near: 30, far: 140}, hemi: {sky: '#8aa0ff', ground: '#2a1f4a', intensity: 0.8}, ambient: 0.15,
    key: {color: '#cdd8ff', intensity: 2.4, pos: [-8, 22, 12], shadowAt: [0, 0, 0]},
  }),
  timing: z.strictObject({pre: num.min(0).max(10).default(0.3), post: num.min(0).max(10).default(0.5)}).default({pre: 0.3, post: 0.5})
    .describe('Stille vor der ersten und nach der letzten Zeile (Sekunden). Die Szenenlänge ergibt sich aus der Sprache.'),
  actors: z.array(Actor).default([]),
  objects: z.array(SceneObject).default([]),
  camera: Camera,
  lines: z.array(Line).default([]),
  sfx: z.array(Sfx).default([]),
  captions: z.array(Caption).default([]),
});

/* ───────────── Gesamtgeschichte ───────────── */

export const Story = z.strictObject({
  schema: z.literal(1).describe('Schema-Version.'),
  meta: z.strictObject({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'ID in Kleinbuchstaben, Zahlen und "-"'),
    title: z.string().min(1),
    language: z.literal('de').default('de'),
    genre: z.string().optional(),
    description: z.string().optional(),
    targetDuration: z.strictObject({min: num.positive(), max: num.positive()}).optional().describe('Soll-Länge in Sekunden; check warnt bei Abweichung.'),
  }),
  format: z.strictObject({
    fps: z.number().int().min(15).max(60).default(30),
    width: z.number().int().min(270).default(1080),
    height: z.number().int().min(480).default(1920),
  }).default({fps: 30, width: 1080, height: 1920}),
  voices: z.record(Id, VoiceProfile).refine((v) => Object.keys(v).length > 0, {message: 'Mindestens ein Stimmenprofil nötig.'}),
  pronunciations: z.record(z.string(), z.string()).optional().describe('Aussprachehilfe: Wort → Schreibweise für die TTS (Schritt 3).'),
  timing: z.strictObject({lineGap: num.min(0).max(3).default(0.28)}).default({lineGap: 0.28}).describe('Pause zwischen Sprechzeilen einer Szene.'),
  cast: z.record(Id, CastMember).refine((v) => Object.keys(v).length > 0, {message: 'Mindestens eine Figur in "cast" nötig.'}),
  audio: z.strictObject({
    music: z.strictObject({
      file: z.string().describe('Datei in public/audio (ohne .wav).'),
      volume: num.min(0).max(1).default(0.5),
      duck: z.strictObject({
        depth: num.min(0).max(1).default(0.3).describe('Absenkung unter Sprache (Lautstärke − depth).'),
        attack: Time.default('6f'), release: Time.default('12f'),
      }).default({depth: 0.3, attack: '6f', release: '12f'}),
      fadeOut: Time.default('45f'),
    }).optional(),
  }).default({}),
  subtitles: z.strictObject({
    maxWords: z.number().int().min(1).max(6).default(3),
    maxChars: z.number().int().min(8).max(60).default(24),
    font: z.string().default('Inter'),
    maxFontSize: z.number().int().default(104),
    bottomPadding: z.number().int().default(560).describe('Abstand der Untertitel zum unteren Bildrand (px bei 1920 hoch; TikTok-UI beachten).'),
  }).default({maxWords: 3, maxChars: 24, font: 'Inter', maxFontSize: 104, bottomPadding: 560}),
  transitions: z.strictObject({
    cutFlash: z.strictObject({color: Color.default('#e9efff'), peak: num.default(0.9), lead: Time.default('3f'), tail: Time.default('9f')}).optional(),
  }).default({}),
  overlays: z.strictObject({
    seriesTag: z.strictObject({text: z.string(), accent: z.string().optional().describe('Zusatztext in Akzentfarbe, z. B. "· TEIL 1".'), accentColor: Color.optional()}).optional().describe('Kleiner Titel oben links.'),
    vignette: z.boolean().optional().describe('Dunkle Ränder (Vorgabe: an).'),
  }).default({}),
  scenes: z.array(Scene).min(1, 'Mindestens eine Szene nötig.'),
});

export type StoryInput = z.input<typeof Story>;
export type StoryData = z.output<typeof Story>;
export type SceneData = z.output<typeof Scene>;
