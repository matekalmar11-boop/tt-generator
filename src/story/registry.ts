/**
 * Registry: was der Generator kennt. Das Schema bleibt generisch – neue Figuren, Kulissen und Objekte
 * (auch für ganz andere Genres) werden hier EINMAL eingetragen und dann in jeder Geschichte benutzt.
 *
 * status:
 *   'ready'   = Baustein existiert bereits im Referenzcode (src/world, src/scenes) – die YAML-Anbindung folgt in Schritt 2.
 *   'planned' = Name ist reserviert und wird vom Schema akzeptiert, aber noch nicht gebaut (check gibt eine Warnung).
 */
export type Status = 'ready' | 'planned';
type ParamType = 'number' | 'boolean' | 'vec3' | 'color' | 'string' | 'any';
type Params = Record<string, ParamType>;

/** Aussehen (cast.<id>.look): Name → 'color' oder Liste erlaubter Werte oder 'boolean'. */
export type LookSpec = Record<string, 'color' | 'boolean' | string[]>;
export type RigDef = {status: Status; doc: string; poses: string[]; faces: string[]; props: string[]; params: Params; tracks: string[]; looks: LookSpec};
export type SetDef = {status: Status; doc: string; params: Params; tracks: string[]};
export type ObjectDef = {status: Status; doc: string; params: Params; tracks: string[]; usesPath?: boolean};

export const RIGS: Record<string, RigDef> = {
  finn: {
    status: 'ready', doc: 'Blockfigur mit Gelenken, Gesicht, Schal, Umhang (src/world/Finn.tsx).',
    poses: ['idle', 'walk', 'sneak', 'run', 'lantern', 'sword', 'swing', 'shock', 'fall', 'power', 'point'],
    faces: ['neutral', 'smile', 'grin', 'worry', 'shock', 'determined', 'glow'],
    props: ['none', 'lantern', 'sword'],
    params: {}, tracks: ['glow'],
    looks: {skin: 'color', hair: 'color', tunic: 'color', scarf: 'color', pants: 'color', boots: 'color'},
  },
  dragon: {
    status: 'ready', doc: 'Lichtdrache aus Blöcken mit Flügeln, Kiefer, Mondsplitter (src/world/Dragon.tsx).',
    poses: [], faces: [], props: [],
    params: {coil: 'number', flap: 'number', shard: 'boolean', lights: 'boolean', roar: 'number', talk: 'number'},
    tracks: ['coil', 'roar'],
    looks: {},
  },
  person: {
    status: 'ready', doc: 'Allgemeine Blockperson (src/world/Person.tsx) mit gleichem Posen-/Gesichtssystem wie Finn; Aussehen über look. Pose "sit" für Stühle der Kulisse "room".',
    poses: ['idle', 'walk', 'sneak', 'run', 'sit', 'wave', 'point', 'shock'],
    faces: ['neutral', 'smile', 'grin', 'worry', 'shock', 'angry', 'determined'],
    props: ['none', 'phone', 'cup'],
    params: {}, tracks: [],
    looks: {skin: 'color', hair: 'color', hairStyle: ['short', 'long', 'bald'], eyes: 'color', shirt: 'color', pants: 'color', shoes: 'color', coat: 'color', apron: 'color', hat: 'color', glasses: 'boolean'},
  },
  person2: {
    status: 'ready', doc: 'Moderne Blockfigur (src/world/Person2.tsx): abgerundet, Kunststoff-Look mit Kontur, Gesicht als Decal, Mundformen aus Phonemen, prozedurale Bewegung (Atmen, Blinzeln, Blickführung zum Sprecher, Gesten beim Sprechen, weiche Posenübergänge, Gehzyklus mit Fußkontakt). Gleiche Posen/Gesichter/Gegenstände/look wie "person". params: gaze ("auto" | "off" | "camera" | Figuren-ID), gestures (true/false), energy (Idle-Lebendigkeit, 1), speed (Gehtempo bei Pose walk ohne path, Einheiten/s).',
    poses: ['idle', 'walk', 'sneak', 'run', 'sit', 'wave', 'point', 'shock'],
    faces: ['neutral', 'smile', 'grin', 'worry', 'shock', 'angry', 'determined'],
    props: ['none', 'phone', 'cup'],
    params: {gaze: 'string', gestures: 'boolean', energy: 'number', speed: 'number'}, tracks: [],
    looks: {skin: 'color', hair: 'color', hairStyle: ['short', 'long', 'bald'], eyes: 'color', shirt: 'color', pants: 'color', shoes: 'color', coat: 'color', apron: 'color', hat: 'color', glasses: 'boolean'},
  },
};

export const SETS: Record<string, SetDef> = {
  plateau: {status: 'ready', doc: 'Klippen-Plateau mit Ruinenbogen, Laterne, Brücke.', params: {lantern: 'boolean'}, tracks: []},
  forest: {status: 'ready', doc: 'Kristallwald mit Pilzen, Kiefern, Silberstaub.', params: {}, tracks: []},
  cave: {
    status: 'ready', doc: 'Höhle mit Kristallen, Teich, Mondlichtstrahl und Runenkreis.',
    params: {center: 'vec3', ground: 'boolean'}, tracks: ['beam', 'runes'],
  },
  abyss: {status: 'ready', doc: 'Abgrund mit Lichtringen und aufsteigendem Licht (Fallszene).', params: {}, tracks: []},
  room: {
    status: 'ready', doc: 'Innenraum (Küche/Wohnraum) aus Blöcken (src/world/Interiors.tsx): Rückwand + Seitenwände, Vorderseite offen. Boden x ±7, z −4…16. Tisch bei (0,0,−1.8), Stühle bei (±1,0,−0.4): sitzende Person at [±1, 0, −0.45], yaw pi, pose sit.',
    params: {wall: 'color', floor: 'color', trim: 'color', accent: 'color', window: 'boolean', furniture: 'boolean'}, tracks: [],
  },
  city_street: {
    status: 'ready', doc: 'Straße entlang z (src/world/City.tsx): Fahrbahn x ±4, Gehwege |x| 4…7 (Figuren dort mit y = 0), Häuser ab |x| = 7 mit Fenstern/Schaufenstern/Markisen, Laternen, Bäume, Autos, Zebrastreifen bei z = 6, Skyline bei z ≈ −100. Länge z +30…−90. Tiefenwirkung über light.fog (z. B. near 20, far 90).',
    params: {building: 'color', road: 'color', sidewalk: 'color', accent: 'color', lamps: 'boolean', cars: 'boolean', trees: 'boolean', windows: 'number', seed: 'string'}, tracks: [],
  },
  empty_stage: {
    status: 'ready', doc: 'Neutrale Bühne (src/world/Interiors.tsx): Bodenplatte 30×30 mit Raster und leuchtendem Rand. Hintergrund über environment {type: starry_sky|none, colors}.',
    params: {floor: 'color', grid: 'boolean', accent: 'color'}, tracks: [],
  },
};

export const ENVIRONMENTS: Record<string, {status: Status; doc: string}> = {
  night_sky: {status: 'ready', doc: 'Nachthimmel, Sterne, Mond, Wolken, schwebende Inseln.'},
  starry_sky: {status: 'ready', doc: 'Himmel mit Sternen; Mond optional (für Innen-/Waldszenen).'},
  none: {status: 'ready', doc: 'Kein Himmel (nur Hintergrundfarbe aus dem Nebel).'},
  gradient: {status: 'ready', doc: 'Nur Farbverlauf (colors top/mid/bottom), ohne Sterne und Mond – für Bühne/Erklärvideos.'},
};

export const OBJECTS: Record<string, ObjectDef> = {
  glow_shard: {
    status: 'ready', doc: 'Leuchtender Splitter (Octaeder) mit Halo, optional Punktlicht; bewegt sich über "path".',
    params: {size: 'vec3', halo: 'vec3', haloColor: 'color', light: 'any', spin: 'any'}, tracks: [], usesPath: true,
  },
  floating_shards: {status: 'ready', doc: 'Schwebende Bruchstücke an festen Positionen.', params: {positions: 'any', color: 'color'}, tracks: []},
  eyes_in_dark: {status: 'ready', doc: 'Leuchtende Augen vor dunkler Silhouette (mit Blinzeln und Licht).', params: {color: 'color', blinkEvery: 'number'}, tracks: []},
  orbiting_shards: {status: 'ready', doc: 'Splitter kreisen um einen Punkt.', params: {count: 'number', radius: 'number', speed: 'number', center: 'any'}, tracks: ['scale']},
  dust: {
    status: 'ready', doc: 'Partikelwolke (Glühwürmchen, Staub, Funken).',
    params: {count: 'number', center: 'any', spread: 'vec3', color: 'color', size: 'number', speed: 'number', seed: 'string', rise: 'number'}, tracks: ['rise'],
  },
  point_light: {status: 'ready', doc: 'Zusätzliches Punktlicht.', params: {color: 'color', distance: 'number'}, tracks: ['intensity']},
  cracking_ground: {status: 'ready', doc: 'Boden, dessen Platten ab einem Zeitpunkt aufbrechen und fallen.', params: {size: 'number', start: 'any'}, tracks: []},
  spotlight_text: {status: 'planned', doc: '3D-Schriftzug im Raum (für Erklärvideos).', params: {text: 'string'}, tracks: []},
};

export const CAMERA_EASES = ['lin', 'io', 'in', 'out', 'snap', 'cut'];

/**
 * Kamera-Presets (camera.shots[]). Jedes Preset erzeugt Kamera-Keys für den Zeitraum from…to (Standard 0…scene.end).
 * `required`/`optional`: erlaubte Felder des Shots; Vorgaben stehen im Doc-Text und in src/story/presets.ts.
 */
export type PresetDef = {doc: string; required: string[]; optional: string[]};
const COMMON = ['from', 'to', 'transition', 'ease', 'look_offset'];
export const CAMERA_PRESETS: Record<string, PresetDef> = {
  push_in: {doc: 'Kamera fährt langsam auf das Ziel zu. offset = Kameraposition relativ zum Ziel (Vorgabe [0.9,0.4,6]), push = Anteil der Strecke (0.45), fov [von,bis] (46→34).', required: ['target'], optional: [...COMMON, 'offset', 'push', 'fov']},
  orbit_in: {doc: 'Kreisfahrt um das Ziel, folgt bewegten Figuren. distance [7,4.5], angle [-0.9,0.5] (Radiant), height [1.2,0.3] relativ zum Ziel, fov [56,42].', required: ['target'], optional: [...COMMON, 'distance', 'angle', 'height', 'fov']},
  whip_to: {doc: 'Hält den Blick auf look_from, reißt bei "at" (Vorgabe: Mitte) in "duration" (8f) zum Ziel und drückt danach leicht nach. offset [2.5,0.5,6], fov [52,38].', required: ['target', 'look_from'], optional: [...COMMON, 'at', 'duration', 'offset', 'fov']},
  over_shoulder: {doc: 'Über-die-Schulter: Kamera hinter/über "subject", Blick auf "target" (Figur). offset in den Achsen der Figur (x + = links der Figur, z + = vorn) Vorgabe [-0.8,2.15,-2.7] (Gegenschuss: x-Vorzeichen umdrehen), look_offset [0,1.55,0], fov [40,36].', required: ['subject', 'target'], optional: [...COMMON, 'offset', 'fov']},
  crane_down: {doc: 'Kranfahrt von oben herab aufs Ziel. offset [3,16,9] → to_offset [1.5,1.8,6], fov [58,42].', required: ['target'], optional: [...COMMON, 'offset', 'to_offset', 'fov']},
  track_behind: {doc: 'Verfolgungsfahrt hinter "subject" (folgt Position und Blickrichtung). offset [0.6,1.7,-4.2], look_offset in Figurenachsen [0,1.5,1.5], fov 50.', required: ['subject'], optional: [...COMMON, 'offset', 'fov']},
  dolly_zoom: {doc: 'Dolly-Zoom (Vertigo): Kamera fährt von Entfernung distance[0] nach distance[1] (Vorgabe [8,3]) entlang offset-Richtung, fov startet bei fov (30) und wird so geführt, dass das Ziel gleich groß bleibt.', required: ['target'], optional: [...COMMON, 'offset', 'distance', 'fov']},
  handheld: {doc: 'Feste Einstellung mit Handkamera-Wackeln: offset [1.2,1.4,5], optional to_offset (langsames Wandern), fov 46, amp 0.06, speed 1.6.', required: ['target'], optional: [...COMMON, 'offset', 'to_offset', 'fov', 'amp', 'speed']},
};
