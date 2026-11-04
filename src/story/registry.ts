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

export type RigDef = {status: Status; doc: string; poses: string[]; faces: string[]; props: string[]; params: Params; tracks: string[]};
export type SetDef = {status: Status; doc: string; params: Params; tracks: string[]};
export type ObjectDef = {status: Status; doc: string; params: Params; tracks: string[]; usesPath?: boolean};

export const RIGS: Record<string, RigDef> = {
  finn: {
    status: 'ready', doc: 'Blockfigur mit Gelenken, Gesicht, Schal, Umhang (src/world/Finn.tsx).',
    poses: ['idle', 'walk', 'sneak', 'run', 'lantern', 'sword', 'swing', 'shock', 'fall', 'power', 'point'],
    faces: ['neutral', 'smile', 'grin', 'worry', 'shock', 'determined', 'glow'],
    props: ['none', 'lantern', 'sword'],
    params: {}, tracks: ['glow'],
  },
  dragon: {
    status: 'ready', doc: 'Lichtdrache aus Blöcken mit Flügeln, Kiefer, Mondsplitter (src/world/Dragon.tsx).',
    poses: [], faces: [], props: [],
    params: {coil: 'number', flap: 'number', shard: 'boolean', lights: 'boolean', roar: 'number', talk: 'number'},
    tracks: ['coil', 'roar'],
  },
  person: {
    status: 'planned', doc: 'Allgemeine Blockperson mit konfigurierbarem Aussehen (look) für Alltag-, Krimi-, Sci-Fi-Geschichten.',
    poses: ['idle', 'walk', 'run', 'sit', 'wave', 'point', 'shock'],
    faces: ['neutral', 'smile', 'worry', 'shock', 'angry'], props: ['none', 'phone', 'cup'],
    params: {}, tracks: [],
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
  room: {status: 'planned', doc: 'Innenraum (Küche, Büro, Wohnung) aus Blöcken.', params: {}, tracks: []},
  city_street: {status: 'planned', doc: 'Straße mit Häusern, Laternen, Autos.', params: {}, tracks: []},
  empty_stage: {status: 'planned', doc: 'Neutrale Bühne mit Farbverlauf-Hintergrund für Erklär-/Fakten-Videos.', params: {}, tracks: []},
};

export const ENVIRONMENTS: Record<string, {status: Status; doc: string}> = {
  night_sky: {status: 'ready', doc: 'Nachthimmel, Sterne, Mond, Wolken, schwebende Inseln.'},
  starry_sky: {status: 'ready', doc: 'Himmel mit Sternen; Mond optional (für Innen-/Waldszenen).'},
  none: {status: 'ready', doc: 'Kein Himmel (nur Hintergrundfarbe aus dem Nebel).'},
};

export const OBJECTS: Record<string, ObjectDef> = {
  glow_shard: {
    status: 'ready', doc: 'Leuchtender Splitter (Octaeder) mit Halo, optional Punktlicht; bewegt sich über "path".',
    params: {size: 'vec3', halo: 'vec3', light: 'any', spin: 'any'}, tracks: [], usesPath: true,
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
