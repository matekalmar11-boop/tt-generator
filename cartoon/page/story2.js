// Story 2: Die Melasse-Flut von Boston (1919) — 3D-Cartoon (gleicher Look wie das Parmesan-Video)
import * as THREE from 'three';
import { toon, mesh, put, makeChar, pose, setFace, canvasTex } from './lib.js';

const TL = await (await fetch('/timeline.json')).json();
const SEG = Object.fromEntries(TL.segs.map(s => [s.id, s]));
const S = (id, f = 0) => SEG[id].start + f * (SEG[id].end - SEG[id].start);
const TOTAL = TL.total;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const bounce = (u, d = 0.35) => { const x = u / d; if (x < 0) return 0; if (x >= 1) return 1; return [0.4, 1.2, 0.93, 1.05, 1][Math.floor(x * 5)]; };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xBFD9F2);
const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.1, 500);
const hemi = new THREE.HemisphereLight(0xfff2e0, 0x9a8470, 1.3); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffeccc, 2.1); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);

const box = (p, w, h, d, c, x, y, z, o = {}) => { const m = mesh(new THREE.BoxGeometry(w, h, d), typeof c === 'number' ? toon(c) : c, o); m.position.set(x, y, z); p.add(m); return m; };
const cyl = (p, rt, rb, h, c, x, y, z, o = {}) => { const m = mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 28), typeof c === 'number' ? toon(c) : c, o); m.position.set(x, y, z); p.add(m); return m; };
function label(text, w, h, bg, fg = '#fff', o = {}) {
  const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
    if (bg) { g.fillStyle = bg; const r = o.r ?? 28; g.beginPath(); g.roundRect(6, 6, cw - 12, ch - 12, r); g.fill(); if (o.stroke) { g.lineWidth = 10; g.strokeStyle = o.stroke; g.stroke(); } }
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${o.size || ch * 0.55}px Inter Display, Arial Black, sans-serif`; g.fillText(text, cw / 2, ch / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })); return m;
}
const BROWN = 0x5B2C10, CARAMEL = 0xB5651D;

// ================= STRASSE =================
const STREET = V3(0, 0, 0);
const street = new THREE.Group(); scene.add(street);
const cobble = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9b8f84'; g.fillRect(0, 0, w, h); g.strokeStyle = '#7d7268'; g.lineWidth = 5; for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.strokeRect(x * 32 + (y % 2) * 16 - 16, y * 32, 32, 32); } }, [14, 22]);
const ground = mesh(new THREE.PlaneGeometry(100, 160), toon(0xffffff, { map: cobble }), { outline: 0 }); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, -40); street.add(ground);
for (const s of [-1, 1]) box(street, 1.6, 0.22, 70, 0xd8d0c0, s * 6.2, 0.11, -22, { outline: 0.012 });
const palette = [0xB5523B, 0xD9B98A, 0x8C5A3C, 0xC77B58, 0xA9A9B5, 0xC9A27A];
const houses = [];
let hi = 0;
for (const s of [-1, 1]) for (let z = 8; z >= -26; z -= 7.2) {
  const h = 7 + ((hi * 37) % 4), col = palette[hi % palette.length]; hi++;
  const g = new THREE.Group(); g.position.set(s * 10.6, 0, z); street.add(g);
  box(g, 7.2, h, 6.6, col, 0, h / 2, 0); box(g, 7.6, 0.5, 7.0, 0x4a3a33, 0, h + 0.25, 0, { outline: 0.02 }); box(g, 0.9, 1.8, 0.9, 0x6b4a3a, s * 1.2, h + 1.2, 0.6, { outline: 0.02 });
  for (let r = 0; r < Math.floor(h / 2.6); r++) for (let c = -1; c <= 1; c += 2) box(g, 0.1, 1.5, 1.3, 0x26405e, -s * 3.62, 2.2 + r * 2.5, c * 1.7, { outline: 0.012 });
  box(g, 0.15, 2.3, 1.3, 0x4a2f20, -s * 3.62, 1.15, 0, { outline: 0.012 });
  houses.push({ g, s, z, h });
}
// Lampen
for (const s of [-1, 1]) for (let z = 6; z > -26; z -= 9) { const L = new THREE.Group(); L.position.set(s * 5.6, 0, z); street.add(L); cyl(L, 0.09, 0.12, 4.4, 0x2a2a2e, 0, 2.2, 0, { outline: 0.02, seg: 10 }); const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffe9a8 })); b.position.y = 4.6; L.add(b); }
// Schilder an den Häusern
const distSign = label('PURITY DISTILLING CO.', 6.4, 1.3, '#1e4b3a', '#F2C84B', { stroke: '#d9b640' }); distSign.position.set(-6.95, 6.6, -19.4); distSign.rotation.y = Math.PI / 2; street.add(distSign);
const hangSign = label('BOSTON · JANUARY 1919', 7.5, 1.5, '#F5ECD6', '#3a2a1f', { stroke: '#3a2a1f' }); hangSign.position.set(0, 7.2, 5); street.add(hangSign);
const cordA = box(street, 0.06, 1.6, 0.06, 0x2a2a2e, -3.2, 8.3, 5, { outline: 0 }); const cordB = box(street, 0.06, 1.6, 0.06, 0x2a2a2e, 3.2, 8.3, 5, { outline: 0 });

// ---- Tank
const tank = new THREE.Group(); tank.position.set(0, 0, -34); street.add(tank);
const TR = 7, TH = 9;
const tankBody = mesh(new THREE.CylinderGeometry(TR, TR, TH, 40), toon(0x8A9BAA), { outline: 0.09 }); tankBody.position.y = TH / 2; tank.add(tankBody);
for (const y of [2.2, 4.5, 6.8]) { const band = mesh(new THREE.CylinderGeometry(TR + 0.06, TR + 0.06, 0.28, 40), toon(0x6c7b88), { outline: 0.02 }); band.position.y = y; tank.add(band); }
const roof = mesh(new THREE.ConeGeometry(TR + 0.3, 1.6, 40), toon(0x6c7b88), { outline: 0.06 }); roof.position.y = TH + 0.8; tank.add(roof);
{ const n = 36 * 3, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 8, 6), toon(0x56636f), n); const m = new THREE.Matrix4(); let k = 0;
  for (const y of [2.2, 4.5, 6.8]) for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; m.makeTranslation(Math.sin(a) * (TR + 0.18), y + 0.42, Math.cos(a) * (TR + 0.18)); inst.setMatrixAt(k++, m); } tank.add(inst); tank.userData.rivets = inst; }
const tankSign = label('PURITY', 6, 1.6, '#F5ECD6', '#8a1f1f', { stroke: '#8a1f1f' }); tankSign.position.set(0, 5.3, TR + 0.12); tank.add(tankSign);
const paintStrips = []; for (let i = 0; i < 10; i++) { const a0 = -Math.PI * 0.6 + i * (Math.PI * 1.2 / 10); const m = new THREE.Mesh(new THREE.CylinderGeometry(TR + 0.09, TR + 0.09, TH, 6, 1, true, a0 + Math.PI / 2 * 0 - 0 + Math.PI, Math.PI * 1.2 / 10 + 0.02), toon(0x6B3A1F, { side: THREE.DoubleSide })); m.position.y = TH / 2; m.visible = false; tank.add(m); paintStrips.push(m); }
// Wandstücke zum Zerplatzen
const pieces = []; for (let i = 0; i < 8; i++) { const a0 = i / 8 * Math.PI * 2; const m = mesh(new THREE.CylinderGeometry(TR, TR, TH, 8, 1, true, a0, Math.PI * 2 / 8), toon(0x8A9BAA, { side: THREE.DoubleSide }), { outline: 0 }); m.position.y = TH / 2; m.userData.a = a0 + Math.PI / 8; tank.add(m); pieces.push(m); m.visible = false; }
const roofPiece = mesh(new THREE.ConeGeometry(TR + 0.3, 1.6, 24), toon(0x6c7b88), { outline: 0.05 }); roofPiece.visible = false; tank.add(roofPiece);
const leaks = []; for (let i = 0; i < 6; i++) { const m = box(tank, 0.34, 3.2 - (i % 3) * 0.7, 0.06, 0x5B2C10, 0, 1.6, 0, { outline: 0 }); const a = (-0.5 + i / 5) * 1.5; m.position.set(Math.sin(a) * (TR + 0.1), 1.9 - (i % 3) * 0.2, Math.cos(a) * (TR + 0.1)); m.rotation.y = a; leaks.push(m); }
const tankPuddle = mesh(new THREE.CylinderGeometry(1, 1, 0.12, 30), toon(BROWN), { outline: 0 }); tankPuddle.position.set(0, 0.12, TR + 2); tank.add(tankPuddle);

// ---- Melasse-Welle & Pfütze
const wave = new THREE.Group(); scene.add(wave);
const wBody = mesh(new THREE.BoxGeometry(11.2, 1, 1), toon(BROWN), { outline: 0.06 }); wave.add(wBody);
const wCrest = mesh(new THREE.CylinderGeometry(1, 1, 11.2, 24), toon(BROWN), { outline: 0.06 }); wCrest.rotation.z = Math.PI / 2; wave.add(wCrest);
const wShine = new THREE.Group();
const foam = []; for (let i = 0; i < 9; i++) { const m = mesh(new THREE.SphereGeometry(0.6, 12, 10), toon(CARAMEL), { outline: 0.03 }); wave.add(m); foam.push(m); }
function setWave(zf, h, len = 14, vis = true) {
  wave.visible = vis; wave.position.set(0, 0, 0); if (!vis) return;
  const r = h * 0.5, L = Math.max(0.5, len);
  wBody.scale.set(1, h, L); wBody.position.set(0, h / 2, zf - r - L / 2);
  wCrest.scale.set(r, 1, r); wCrest.position.set(0, h / 2, zf - r);
  foam.forEach((m, i) => { const x = -5 + i * 1.25; m.position.set(x, h * 0.95 + Math.sin(i * 2.3 + zf) * 0.25, zf - r * (0.2 + 0.5 * ((i * 7) % 3) / 3)); m.scale.setScalar(Math.max(0.1, h * 0.14 + 0.1 * Math.sin(i + zf))); });
}
const pool = mesh(new THREE.BoxGeometry(12.6, 0.5, 1), toon(BROWN), { outline: 0.02 }); scene.add(pool); const poolShine = mesh(new THREE.BoxGeometry(12.0, 0.04, 1), toon(CARAMEL), { outline: 0 }); scene.add(poolShine);
function setPool(zFront, zBack, vis = true) { pool.visible = poolShine.visible = vis; if (!vis) return; const L = Math.max(0.1, zFront - zBack); pool.scale.set(1, 1, L); pool.position.set(0, 0.25, (zFront + zBack) / 2); poolShine.scale.set(1, 1, L * 0.98); poolShine.position.set(0, 0.52, (zFront + zBack) / 2); }

// ---- Personen
const mk = (o) => { const c = makeChar(o); scene.add(c); return c; };
const civ = [mk({ suit: 0x8a5a44, hair: 0x3a2a1f, skin: 0xF0A468, mustache: true, pants: 0x3a3a44 }), mk({ suit: 0xB04A5A, hair: 0x6b3a1e, skin: 0xE9A672, pants: 0x4a3a50 }), mk({ suit: 0x3f6b4f, cap: 0x4a3a2a, skin: 0xF0A468, pants: 0x3a3a44 }), mk({ suit: 0x5b5f8a, hair: 0x20202a, skin: 0xD9955f, glasses: true, pants: 0x3a3a44 })];
const kids = [mk({ suit: 0xE8C13F, hair: 0x7a4a22, skin: 0xF0A468 }), mk({ suit: 0xD05A4A, hair: 0x20202a, skin: 0xE9A672 })];
const painter = mk({ suit: 0xF2F2F2, cap: 0xFFFFFF, skin: 0xF0A468, pants: 0xF2F2F2, mustache: true });
const foreman = mk({ suit: 0x4a4f58, cap: 0x666a73, skin: 0xE9A672, mustache: true, glasses: true, pants: 0x30343a });
const fire = [mk({ suit: 0x24292e, cap: 0xC0302F, skin: 0xF0A468, pants: 0x24292e }), mk({ suit: 0x24292e, cap: 0xC0302F, skin: 0xD9955f, mustache: true, pants: 0x24292e })];
const judge = mk({ suit: 0x1b1b1f, hair: 0xDDDDDD, glasses: true, skin: 0xF0A468 });
const lawyer = mk({ suit: 0x6e4a2a, shirt: 0xffffff, tie: 0x8a1f1f, hair: 0x15110f, glasses: true, skin: 0xE9A672, pants: 0x3a2a1a });
const engineer = mk({ suit: 0x2f5f8a, shirt: 0xffffff, tie: 0xd2232a, cap: 0xF2C230, glasses: true, skin: 0xF0A468, pants: 0x2a3a50 });
kids.forEach(k => k.userData.kid = true);

// ---- Requisiten
const therm = new THREE.Group(); scene.add(therm); box(therm, 1.4, 5.2, 0.2, 0xF5ECD6, 0, 2.6, 0); box(therm, 0.36, 4.0, 0.12, 0xDDDDDD, 0, 2.7, 0.14, { outline: 0.01 });
const merc = box(therm, 0.24, 1, 0.1, 0xD2232A, 0, 0.7, 0.22, { outline: 0 }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 14, 12), toon(0xD2232A)); bulb.position.set(0, 0.55, 0.2); therm.add(bulb);
const tLo = label('2°F', 1.2, 0.5, null, '#2a2a2e'); tLo.position.set(0, 4.95, 0.16); therm.add(tLo); const tHi = label('40°F', 1.2, 0.5, null, '#8a1f1f'); tHi.position.set(0, 0.0, 0.16); tHi.visible = false;
const barrels = []; for (let i = 0; i < 15; i++) { const b = new THREE.Group(); cyl(b, 0.5, 0.5, 1.0, 0x8a5a34, 0, 0.5, 0, { outline: 0.03 }); for (const y of [0.25, 0.75]) cyl(b, 0.52, 0.52, 0.08, 0x3a2a1f, 0, y, 0, { outline: 0.01 }); scene.add(b); barrels.push(b); }
const gal = label('2,000,000 GALLONS', 6.2, 1.2, '#F5ECD6', '#5B2C10', { stroke: '#5B2C10' }); scene.add(gal);
const l25 = label('25 FT', 3.2, 1.3, '#D2232A', '#fff', { stroke: '#fff' }); scene.add(l25); const l35 = label('35 MPH', 4.0, 1.3, '#F2C84B', '#2a2a2e', { stroke: '#2a2a2e' }); scene.add(l35);
const l21 = label('21', 2.6, 1.8, '#2a2a2e', '#fff', { stroke: '#fff' }); scene.add(l21); const l150 = label('~150 HURT', 5.2, 1.3, '#F5ECD6', '#8a1f1f', { stroke: '#8a1f1f' }); scene.add(l150);
const l50 = label('50 FT', 2.8, 1.1, '#F2C84B', '#2a2a2e', { stroke: '#2a2a2e' }); scene.add(l50); const ruler = box(scene, 0.25, 9, 0.25, 0xF2C84B, 0, 4.5, 0); ruler.userData.base = true;
const bottles = []; for (let i = 0; i < 5; i++) { const b = new THREE.Group(); cyl(b, 0.3, 0.3, 0.9, 0x2f7d4f, 0, 0.45, 0, { outline: 0.025 }); cyl(b, 0.1, 0.1, 0.5, 0x2f7d4f, 0, 1.1, 0, { outline: 0.02, seg: 10 }); const lb = label('XXX', 0.5, 0.35, '#F5ECD6', '#2a2a2e', { r: 6, size: 90 }); lb.position.set(0, 0.45, 0.31); b.add(lb); scene.add(b); bottles.push(b); }
const cannon = new THREE.Group(); { const br = mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.6, 20), toon(0x4a4f58), { outline: 0.04 }); br.rotation.z = Math.PI / 2 - 0.25; br.position.y = 1.0; cannon.add(br); for (const z of [-0.6, 0.6]) { const w = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 20), toon(0x7a4a22), { outline: 0.03 }); w.rotation.x = Math.PI / 2; w.position.set(0, 0.7, z); cannon.add(w); } } scene.add(cannon);
const ball = mesh(new THREE.SphereGeometry(0.28, 14, 12), toon(0x1c1c20), { outline: 0.03 }); scene.add(ball);
const smoke = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: 0xf0f0f0, transparent: true, opacity: 0.8 })); scene.add(m); smoke.push(m); }
const bucket = new THREE.Group(); cyl(bucket, 0.5, 0.42, 0.7, 0x8a8f97, 0, 0.35, 0, { outline: 0.03 }); cyl(bucket, 0.44, 0.44, 0.04, 0x6B3A1F, 0, 0.7, 0, { outline: 0 }); scene.add(bucket);
const brush = new THREE.Group(); { const hd = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), toon(0x8a5a34), { outline: 0.012 }); hd.position.y = 0.25; brush.add(hd); const br = mesh(new THREE.BoxGeometry(0.34, 0.3, 0.12), toon(0x6B3A1F), { outline: 0.012 }); br.position.y = -0.3; brush.add(br); } scene.add(brush);
const drops = []; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0x6B3A1F })); m.scale.y = 1.4; scene.add(m); drops.push(m); }
const cans = kids.map(() => { const g = new THREE.Group(); cyl(g, 0.22, 0.2, 0.34, 0xC9CED8, 0, 0.17, 0, { outline: 0.02, seg: 14 }); scene.add(g); return g; });
// Hafen
const HARB = V3(100, 0, 0);
const harbor = new THREE.Group(); harbor.position.copy(HARB); scene.add(harbor);
const water = mesh(new THREE.PlaneGeometry(220, 220), toon(0x3F8FC4), { outline: 0 }); water.rotation.x = -Math.PI / 2; water.position.set(0, -0.1, -90); harbor.add(water);
const stain = mesh(new THREE.CylinderGeometry(1, 1, 0.06, 40), toon(0x7A4A22), { outline: 0 }); stain.position.set(0, 0.0, -26); harbor.add(stain);
const pier = box(harbor, 14, 0.7, 60, 0x8a5a34, 0, 0.0, 22, { outline: 0.03 }); for (let z = -8; z < 50; z += 4) box(harbor, 14.4, 0.15, 0.3, 0x6b4426, 0, 0.4, z, { outline: 0.01 });
for (let i = 0; i < 9; i++) box(harbor, 5 + (i % 3) * 2, 8 + (i * 37) % 9, 5, palette[i % palette.length], -34 + i * 9, 5, -70, { outline: 0.04 });
const boat = new THREE.Group(); harbor.add(boat); box(boat, 5, 1.6, 12, 0xC0302F, 0, 0.8, 0, { outline: 0.04 }); box(boat, 3.6, 1.8, 4, 0xF5ECD6, 0, 2.5, 1.6, { outline: 0.04 }); cyl(boat, 0.5, 0.5, 2.8, 0x2a2a2e, 0, 2.6, -2.8, { outline: 0.03 }); boat.position.set(-6, 0, -22);
const spray = []; for (let i = 0; i < 26; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xDDF2FF })); harbor.add(m); spray.push(m); }
const sailBrown = [];
// Gericht
const COURT = V3(200, 0, 0); const court = new THREE.Group(); court.position.copy(COURT); scene.add(court);
const wfl = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#9b6a3d'; g.fillRect(0, 0, w, h); g.fillStyle = '#7d522c'; for (let i = 0; i < 4; i++) g.fillRect(0, i * h / 4, w, 5); g.fillRect(w / 2, 0, 5, h / 2); }, [10, 10]);
const cfloor = mesh(new THREE.PlaneGeometry(40, 40), toon(0xffffff, { map: wfl }), { outline: 0 }); cfloor.rotation.x = -Math.PI / 2; cfloor.position.z = -6; court.add(cfloor);
box(court, 30, 10, 0.5, 0xE8D9B8, 0, 5, -9); box(court, 0.5, 10, 30, 0xDCCBA3, -12, 5, -4); box(court, 0.5, 10, 30, 0xDCCBA3, 12, 5, -4); box(court, 30, 0.6, 0.6, 0x6b4426, 0, 1.0, -8.6); box(court, 4, 4.5, 0.2, 0x7fb8e8, 7, 5.5, -8.7, { shadow: false });
box(court, 9, 0.8, 3.4, 0x6b4426, 0, 0.4, -6.4); box(court, 7, 1.0, 1.4, 0x5a3a22, 0, 1.3, -5.0); box(court, 7.4, 0.16, 1.7, 0x3a2414, 0, 1.88, -5.0, { outline: 0.015 }); box(court, 2.6, 1.0, 1.6, 0x5a3a22, -7, 0.5, -2); box(court, 4, 1.6, 2, 0x6e4a2a, 6, 0.8, 1.5);
const block = box(court, 0.9, 0.3, 0.9, 0x3a2414, 1.6, 2.1, -5.0, { outline: 0.015 }); const gavel = new THREE.Group(); { const h = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), toon(0x8a5a34), { outline: 0.012 }); h.position.y = -0.1; gavel.add(h); const hd = mesh(new THREE.BoxGeometry(0.5, 0.26, 0.26), toon(0x5a3a22), { outline: 0.015 }); hd.position.y = 0.35; gavel.add(hd); } scene.add(gavel);
const anSign = label('ANARCHISTS!', 4.2, 1.5, '#F5ECD6', '#8a1f1f', { stroke: '#8a1f1f' }); scene.add(anSign); const bigX = label('✕', 3.4, 3.4, null, '#D2232A', { size: 400 }); scene.add(bigX);
// Büro
const OFF = V3(300, 0, 0); const office = new THREE.Group(); office.position.copy(OFF); scene.add(office);
const ofl = mesh(new THREE.PlaneGeometry(40, 40), toon(0xD9C9A8), { outline: 0 }); ofl.rotation.x = -Math.PI / 2; ofl.position.z = -6; office.add(ofl);
box(office, 30, 10, 0.5, 0xBFD9F2, 0, 5, -9); box(office, 0.5, 10, 30, 0xCBD8E6, -12, 5, -4); box(office, 0.5, 10, 30, 0xCBD8E6, 12, 5, -4); box(office, 30, 0.6, 0.6, 0x8a98a8, 0, 1.0, -8.6);
box(office, 8, 1.2, 4, 0x8a5a34, 0, 0.6, -3); box(office, 8.4, 0.16, 4.4, 0xB07845, 0, 1.28, -3, { outline: 0.015 });
const bp = box(office, 5, 0.04, 3.2, 0xDCEBFF, 0, 1.38, -3, { outline: 0.01 }); { const lines = canvasTex(512, 320, (g, w, h) => { g.fillStyle = '#DCEBFF'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3a6ea5'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, i * 28); g.lineTo(w, i * 28); g.stroke(); g.beginPath(); g.moveTo(i * 44, 0); g.lineTo(i * 44, h); g.stroke(); } g.lineWidth = 6; g.strokeRect(120, 60, 270, 200); g.strokeRect(160, 100, 80, 80); }); const pl = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.2), new THREE.MeshBasicMaterial({ map: lines })); pl.rotation.x = -Math.PI / 2; pl.position.set(0, 1.405, -3); office.add(pl); }
const approved = label('APPROVED', 3.4, 1.0, '#1f8a4a', '#fff', { stroke: '#fff' }); approved.rotation.x = -Math.PI / 2; approved.position.set(OFF.x + 0.6, OFF.y + 1.42, OFF.z - 3); scene.add(approved);
const stamp = new THREE.Group(); { const hd = mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.9, 14), toon(0x8a5a34), { outline: 0.02 }); hd.position.y = 0.6; stamp.add(hd); const bs = mesh(new THREE.BoxGeometry(1.5, 0.3, 0.7), toon(0x1f8a4a), { outline: 0.02 }); stamp.add(bs); } scene.add(stamp);
const towerM = new THREE.Group(); scene.add(towerM); for (let i = 0; i < 6; i++) box(towerM, 3 - i * 0.2, 1.0, 3 - i * 0.2, i % 2 ? 0xD9B98A : 0xB5523B, 0, 0.5 + i * 1.0, 0, { outline: 0.03 });
const smell = []; for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 6, 14), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xE6A23C : 0xB5651D })); scene.add(m); smell.push(m); }
const sunSpr = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.35, 'rgba(255,210,100,.5)'); gr.addColorStop(1, 'rgba(255,210,100,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, depthWrite: false })); scene.add(sunSpr);
const flash = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthTest: false })); flash.renderOrder = 999; scene.add(flash);

const ACT = [...civ, ...kids, painter, foreman, ...fire, judge, lawyer, engineer];
const PROPS = [therm, ...barrels, gal, l25, l35, l21, l150, l50, ruler, ...bottles, cannon, ball, ...smoke, bucket, brush, ...drops, ...cans, gavel, anSign, bigX, approved, stamp, towerM, ...smell, sunSpr, flash, wave, pool, poolShine];
const hide = () => { [...ACT, ...PROPS].forEach(o => { o.visible = true; o.position.set(0, -300, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(o.userData.kid ? 0.66 : 1); }); wave.visible = false; pool.visible = poolShine.visible = false; };

// ---- Hilfen
const O = { street: STREET, harbor: HARB, court: COURT, office: OFF };
function camKeys(o, a, b, u, e = true) {
  const k = e ? ease(u) : u; const p = lerpV(a.p, b.p, k), l = lerpV(a.l, b.l, k), f = lerp(a.f || 50, b.f || 50, k);
  camera.position.set(o.x + p[0], o.y + p[1], o.z + p[2]); camera.lookAt(o.x + l[0], o.y + l[1], o.z + l[2]); camera.fov = f; camera.updateProjectionMatrix(); return [o.x + l[0], o.y + l[1], o.z + l[2]];
}
const at = (c, x, y, z, ry = 0) => { c.position.set(x, y, z); c.rotation.y = ry; };
const shots = []; const add = (t0, t1, set, a, b, run, ease_ = true) => shots.push({ t0, t1, set, a, b, run, ease: ease_ });
const sky = { cold: 0xBFD9F2, warm: 0xFFE3A6, dusk: 0xE9C8A0 };
let skyNow = sky.cold;
const run = (c, t, sp = 11) => t * sp;           // Lauf-Phase

// === s01: Hook – Welle rollt durch die Strassen
add(0, S('s01', 0.5), 'street', { p: [0.5, 2.6, 13], l: [0, 3.2, -24], f: 62 }, { p: [0.3, 2.3, 9], l: [0, 3.0, -22], f: 58 }, (u, lt, t) => {
  setWave(lerp(-13, -3, u), lerp(3.6, 4.4, u), 14);
  civ.forEach((c, i) => { at(c, -3 + i * 2.1, 0, lerp(-2, 4.5, u) + (i % 2) * 2.5 + 0.0, 0); pose(c, { walk: run(c, t, 12), arms: [0.9, -0.9], out: 0.3, face: 'shock', lean: 0.1 }); });
  kids.forEach((k, i) => { at(k, i ? 5.0 : -4.9, 0, lerp(1, 6, u), 0); pose(k, { walk: run(k, t, 14), arms: [1.2, 1.2], face: 'shock' }); });
  sunSpr.position.set(-6, 14, -30); skyNow = sky.dusk; });
add(S('s01', 0.5), S('s02', 0), 'street', { p: [3.5, 2.2, 6], l: [0, 2.5, -14], f: 56 }, { p: [3.0, 2.0, 3.5], l: [0, 2.4, -10], f: 50 }, (u, lt, t) => {
  setWave(lerp(-17, -1, ease(u)), lerp(4.2, 4.8, u), 18);
  civ.forEach((c, i) => { at(c, -3 + i * 2.2, 0, lerp(-1, 7, u) + (i % 2) * 2, 0); pose(c, { walk: run(c, t, 12), arms: [1.0, -1.0], out: 0.4, face: 'shock', lean: 0.12 }); });
  kids.forEach((k, i) => { at(k, i ? 5.0 : -4.9, 0, lerp(3, 9, u), 0); pose(k, { walk: run(k, t, 15), arms: [1.2, 1.2], face: 'shock' }); }); skyNow = sky.dusk; });
// === s02: 25 ft / 35 mph
add(S('s02', 0), S('s02', 0.55), 'street', { p: [-5.4, 2.4, 3], l: [0, 3, -10], f: 58 }, { p: [-5.2, 2.8, 0], l: [0, 3.2, -10], f: 52 }, (u, lt, t) => {
  setWave(lerp(-16, -2.5, u), 5.6, 16); l25.position.set(-1.2, 8.8, lerp(-18, -2.5, u) - 3.8); l25.rotation.y = 0.5; l25.scale.setScalar(bounce(u, 0.2) * 1.1); skyNow = sky.dusk; });
add(S('s02', 0.55), S('s03', 0), 'street', { p: [2.0, 3.0, 8], l: [0, 2.8, -12], f: 62 }, { p: [1.5, 2.2, 2], l: [0, 2.6, -8], f: 52 }, (u, lt, t) => {
  setWave(lerp(-18, -2.2, u), 5.2, 18); l35.position.set(2, 8.2, lerp(-18, -2.2, u) - 4.5); l35.rotation.y = -0.4; l35.scale.setScalar(bounce(u, 0.2) * 1.1);
  civ.forEach((c, i) => { at(c, -2.5 + i * 1.9, 0, 5 + i * 1.5 + u * 3, 0); pose(c, { walk: run(c, t, 12), arms: [1, -1], out: 0.4, face: 'shock', lean: 0.1 }); }); skyNow = sky.dusk; });
// === s03: Der Tank
add(S('s03', 0), S('s04', 0), 'street', { p: [0.5, 2.0, 4], l: [0, 4.5, -34], f: 60 }, { p: [0.2, 3.0, -14], l: [0, 6.5, -34], f: 62 }, (u, lt, t) => { skyNow = sky.cold; foreman.visible = true; at(foreman, 3, 0, -22, 3.1); pose(foreman, { face: 'smile', arms: [0, 0] }); });
// === s04: 50 ft, 2 Mio Gallonen
add(S('s04', 0), S('s04', 0.5), 'street', { p: [3.5, 3.2, -12], l: [-3, 4.8, -31], f: 56 }, { p: [3.0, 4.2, -10], l: [-3, 5.6, -31], f: 52 }, (u, lt, t) => {
  ruler.position.set(-4.2, 4.5 * Math.min(1, u * 2.4 + 0.02), -26); ruler.scale.y = Math.min(1, u * 2.4 + 0.02); l50.position.set(-2.4, 9.8 * Math.min(1, u * 2.4) + 1, -26); l50.scale.setScalar(bounce(u - 0.4, 0.2) * 1.2); l50.rotation.y = 0.3;
  at(foreman, -1.4, 0, -22, 0.5); pose(foreman, { face: 'happy', arms: [-1.0, 0] }); });
add(S('s04', 0.5), S('s05', 0), 'street', { p: [5.4, 3.6, -12], l: [2.6, 1.8, -24], f: 56 }, { p: [5.2, 3.0, -9], l: [2.4, 1.8, -24], f: 50 }, (u, lt, t) => {
  barrels.forEach((b, i) => { const k = clamp(u * 1.5 - i * 0.06); b.position.set(1.4 + (i % 5) * 1.15 + (Math.floor(i / 5) % 2) * 0.55, Math.floor(i / 5) * 1.0, -24 - Math.floor(i / 5) * 0.2 + 0.0); b.scale.setScalar(k > 0 ? bounce(k, 0.3) : 0.001); });
  gal.position.set(4.2, 5.2, -22.5); gal.scale.setScalar(bounce(u - 0.5, 0.25)); at(foreman, 0.2, 0, -21, -0.8); pose(foreman, { face: 'shock', arms: [0.4, 0.4], out: 0.5 }); });
// === s05: Alkohol und Sprengstoff
add(S('s05', 0), S('s05', 0.5), 'street', { p: [-1.5, 3, 3], l: [-6.8, 5.5, -19], f: 56 }, { p: [-2.5, 3, -3], l: [-6.8, 4.5, -19], f: 50 }, (u, lt, t) => {
  bottles.forEach((b, i) => { b.position.set(-3.5 + i * 0.9, 0, -19 + (i % 2) * 0.5); b.scale.setScalar(bounce(u - i * 0.1, 0.25) || 0.001); b.rotation.y = i * 0.3; });
  at(civ[0], 1.3, 0, -18.6, -0.6); pose(civ[0], { face: 'happy', arms: [-1.3, 0], bob: Math.abs(Math.sin(lt * 5)) * 0.06 }); });
add(S('s05', 0.5), S('s06', 0), 'street', { p: [5, 2.6, -2], l: [-1, 2.0, -12], f: 54 }, { p: [4.5, 2.4, -4], l: [-1, 2.2, -12], f: 48 }, (u, lt, t) => {
  at(cannon, -3, 0, -12, 0.2); const k = clamp((u - 0.35) / 0.5); ball.position.set(-3 + 2.2 + k * 14, 1.8 + k * 2.5 - k * k * 3.5, -12 - k * 6); ball.visible = u > 0.35;
  smoke.forEach((m, i) => { const q = clamp((u - 0.35) / 0.35 - i * 0.07); m.position.set(-1.2 + q * 2 + i * 0.1, 2.2 + q * 1.8, -12 + (i - 3) * 0.3); m.scale.setScalar(q > 0 ? 0.4 + q * 1.5 : 0.001); m.material.opacity = q > 0 ? 0.8 * (1 - q) : 0; });
  at(foreman, 2.2, 0, -10, -0.9); pose(foreman, { face: u > 0.4 ? 'shock' : 'smile', arms: [0.5, 0.5], out: 0.5 }); });
// === s06: Der Tank leckt
add(S('s06', 0), S('s06', 0.55), 'street', { p: [2.5, 2.2, -21], l: [0, 1.6, -27], f: 52 }, { p: [1.5, 2.0, -22], l: [0, 1.5, -27], f: 46 }, (u, lt, t) => {
  tankPuddle.scale.set(1.5 + u * 1.5, 1, 1.5 + u * 1.5);
  drops.forEach((d, i) => { const q = (lt * 1.3 + i * 0.27) % 1; d.position.set(-1.5 + i * 0.6, 2.2 - q * 2.1, -27 + 0.3 + (i % 2) * 0.1); });
  kids.forEach((k, i) => { at(k, -1.8 + i * 3.4, 0, -23.8, i ? -0.3 : 0.3); pose(k, { face: 'happy', arms: [-1.0, -0.3], lean: 0.15 }); cans[i].position.set(k.position.x + (i ? -0.5 : 0.5), 0.0, -24.7); }); });
add(S('s06', 0.55), S('s07', 0), 'street', { p: [-4.5, 2.4, -21], l: [-1, 1.8, -27], f: 50 }, { p: [-3.5, 2.6, -22], l: [0, 2.0, -27], f: 44 }, (u, lt, t) => {
  tankPuddle.scale.set(3, 1, 3); at(foreman, -1.8, 0, -24, 0.4); pose(foreman, { face: 'sad', arms: [0.3, 0.3], out: 0.6, tilt: 0.1 });
  drops.forEach((d, i) => { const q = (lt * 1.3 + i * 0.27) % 1; d.position.set(1.5 + i * 0.6, 2.2 - q * 2.1, -27 + 0.3); }); });
// === s07: Braun übermalen
add(S('s07', 0), S('s08', 0), 'street', { p: [5, 3.4, -18], l: [0, 3.8, -27], f: 54 }, { p: [3, 4.0, -19], l: [0, 4.2, -27], f: 48 }, (u, lt, t) => {
  const n = Math.floor(clamp(u * 1.15) * 10); paintStrips.forEach((m, i) => m.visible = i < n);
  const px = lerp(-4.5, 4.5, clamp(u * 1.15)); at(painter, px, 0, -26.0, Math.PI); pose(painter, { face: 'happy', arms: [-1.2 + 0.5 * Math.sin(lt * 7), -1.2], lean: 0.12, walk: null });
  bucket.position.set(px - 1.0, 0, -25.2); brush.position.set(px + 0.3, 2.5 + 0.2 * Math.sin(lt * 7), -26.7); brush.rotation.z = 0.3;
  drops.forEach((d, i) => { const q = (lt * 1.1 + i * 0.3) % 1; d.position.set(-3 + i * 1.3, 2.0 - q * 1.9, -27 + 0.3); }); });
// === s08: Es wird warm (Thermometer)
add(S('s08', 0), S('s08', 0.55), 'street', { p: [4.5, 3.4, -4], l: [3.2, 2.8, -14], f: 46 }, { p: [4.0, 3.4, -7], l: [3.2, 3.0, -14], f: 42 }, (u, lt, t) => {
  at(therm, 3.5, 0, -14, -0.25); const k = ease(u * 1.5); merc.scale.y = 0.4 + k * 3.4; merc.position.y = 0.9 + k * 1.7; tLo.visible = u < 0.4; tHi.visible = false;
  skyNow = new THREE.Color(sky.cold).lerp(new THREE.Color(sky.warm), k).getHex(); sunSpr.position.set(-4 + u * 6, 12, -34); sunSpr.scale.setScalar(0.8 + k * 0.6);
  at(civ[0], 0.3, 0, -11, 0.4); pose(civ[0], { face: u > 0.5 ? 'happy' : 'smile', arms: [-0.2, -0.2] }); }, true);
add(S('s08', 0.55), S('s09', 0), 'street', { p: [-3, 2.8, 4], l: [0, 3.0, -16], f: 58 }, { p: [-2, 2.6, 0], l: [0, 3.0, -16], f: 52 }, (u, lt, t) => {
  skyNow = sky.warm; sunSpr.position.set(0, 13, -36); sunSpr.scale.setScalar(1.3 + 0.1 * Math.sin(lt * 4));
  civ.forEach((c, i) => { at(c, -3 + i * 2.2, 0, -4 + i * 1.5, 0.2 - i * 0.1); pose(c, { face: 'happy', arms: [-0.3, 1.2 * (i % 2)], out: 0.2, bob: Math.sin(lt * 3 + i) * 0.03 }); }); });
// === s09: Der Tank ächzt
add(S('s09', 0), S('s10', 0), 'street', { p: [0.3, 1.8, -10], l: [0, 4.2, -34], f: 58 }, { p: [0.2, 1.6, -16], l: [0, 4.4, -34], f: 52 }, (u, lt, t) => {
  skyNow = sky.warm; const q = 1 + 0.012 * Math.sin(lt * 26) * (0.5 + u) + u * 0.03; tank.scale.set(q, 1, q); tank.userData.shake = 1; const n = tank.userData.rivets;
  at(foreman, 3.6, 0, -24, 3.2); pose(foreman, { face: 'shock', arms: [0.6, 0.6], out: 0.6 }); at(civ[0], -3.4, 0, -21, 0.2); pose(civ[0], { face: 'shock', arms: [0.5, 0.5], out: 0.5, tilt: 0.1 }); });
// === s10: Platzt!
add(S('s10', 0), S('s11', 0), 'street', { p: [0.3, 2.2, -7], l: [0, 4.5, -34], f: 60 }, { p: [0.3, 2.6, -4], l: [0, 3.4, -30], f: 66 }, (u, lt, t) => {
  skyNow = sky.warm; const bst = clamp((lt - 0.55) / 1.2);
  if (lt < 0.55) { const q = 1.04 + 0.02 * Math.sin(lt * 40); tank.scale.set(q, 1, q); } else { tank.scale.set(1, 1, 1); }
  tankBody.visible = lt < 0.55; roof.visible = lt < 0.55; tankSign.visible = lt < 0.55; tank.userData.rivets.visible = lt < 0.55; leaks.forEach(m => m.visible = lt < 0.55); paintStrips.forEach(m => m.visible = lt < 0.55);
  pieces.forEach(m => { m.visible = lt >= 0.55; const a = m.userData.a; const d = bst * 22; m.position.set(Math.sin(a) * d, TH / 2 + bst * 3 - bst * bst * 6, Math.cos(a) * d); m.rotation.set(bst * 2.2 * Math.cos(a), bst * 3 * Math.sin(a), bst * 1.5); });
  roofPiece.visible = lt >= 0.55; roofPiece.position.set(0, TH + 0.8 + bst * 16 - bst * bst * 18, 0); roofPiece.rotation.z = bst * 3;
  setWave(-30 + bst * 14, lt < 0.55 ? 0.01 : 2 + bst * 4.5, 8 + bst * 10, lt >= 0.55); flash.position.set(camera.position.x, camera.position.y, camera.position.z - 3); flash.quaternion.copy(camera.quaternion); flash.material.opacity = lt > 0.5 && lt < 0.7 ? 0.9 : 0;
  at(foreman, 3.6, 0, -24, 3.2 + bst * 0.5); pose(foreman, { face: 'shock', arms: [1.5, 1.5], out: 0.6 }); });
// === s11: Welle zerstört Häuser
add(S('s11', 0), S('s11', 0.6), 'street', { p: [-3.5, 3.0, 7], l: [-6.5, 3.4, -14], f: 54 }, { p: [-2.5, 3.2, 6], l: [-6, 3.2, -14], f: 50 }, (u, lt, t) => {
  const zf = lerp(-30, 2, u); setWave(zf, lerp(5, 3.4, u), 20); skyNow = sky.warm;
  houses.forEach(h => { if (h.s < 0) { const hit = clamp((zf - (h.z - 3.3)) / 2.5); h.g.userData.hit = hit; } });
  civ.forEach((c, i) => { at(c, 2.5 - i * 1.8, 0, lerp(-10, 5, u) + i * 0.6, 0); pose(c, { walk: run(c, t, 13), arms: [1, -1], out: 0.4, face: 'shock', lean: 0.15 }); }); });
add(S('s11', 0.6), S('s12', 0), 'street', { p: [5.6, 4, 16], l: [-1, 3.0, -4], f: 56 }, { p: [5.4, 4.2, 14], l: [-1, 3.0, -4], f: 52 }, (u, lt, t) => {
  const zf = lerp(2, 11, u); setWave(zf, lerp(3.4, 2.4, u), 24); skyNow = sky.warm;
  houses.forEach(h => { const hit = clamp((zf - (h.z - 3.3)) / 2.5); h.g.userData.hit = hit; }); });
// === s12: Opfer
add(S('s12', 0), S('s12', 0.5), 'street', { p: [0, 5.5, 14], l: [0, 1.5, -6], f: 56 }, { p: [0, 4.6, 8], l: [0, 1.5, -6], f: 50 }, (u, lt, t) => {
  setPool(10, -28); skyNow = sky.dusk; houses.forEach(h => { if (h.z < 2 && h.s > 0) h.g.userData.hit = 0.7; if (h.s < 0 && h.z < 4) h.g.userData.hit = 0.6; });
  l21.position.set(0, 5.4, 2); l21.scale.setScalar(bounce(u - 0.2, 0.25));
  civ.forEach((c, i) => { at(c, -3 + i * 2.3, 0, -2 + (i % 2) * 2, 0.0 + i * 0.2); pose(c, { face: 'sad', arms: [0.3, 0.3], out: 0.2, bob: 0, nod: 0.2 }); }); });
add(S('s12', 0.5), S('s13', 0), 'street', { p: [2, 3.2, 8], l: [0, 2.2, -4], f: 48 }, { p: [1.5, 3.0, 5], l: [0, 2.2, -4], f: 42 }, (u, lt, t) => {
  setPool(10, -28); skyNow = sky.dusk; houses.forEach(h => { if (h.z < 2 && h.s > 0) h.g.userData.hit = 0.7; if (h.s < 0 && h.z < 4) h.g.userData.hit = 0.6; });
  l150.position.set(0, 5.2, 0); l150.scale.setScalar(bounce(u, 0.25));
  civ.forEach((c, i) => { at(c, -3.2 + i * 2.2, 0, -2 + (i % 2) * 1.5, 0.1 * i); pose(c, { face: 'sad', arms: [0.3, 0.3], out: 0.2, nod: 0.2 }); }); });
// === s13: Retter waten
add(S('s13', 0), S('s14', 0), 'street', { p: [-5, 3.4, 8], l: [0, 1.8, -6], f: 52 }, { p: [-4, 3.2, 5], l: [0, 1.8, -6], f: 46 }, (u, lt, t) => {
  setPool(10, -28); skyNow = sky.dusk; houses.forEach(h => { if (h.z < 2 && h.s > 0) h.g.userData.hit = 0.7; if (h.s < 0 && h.z < 4) h.g.userData.hit = 0.6; });
  fire.forEach((f, i) => { at(f, -2.2 + i * 3.4, 0, lerp(4, -0.6, u) - i * 0.5, 0); pose(f, { walk: run(f, t, 3.2), arms: [-1.4, -1.4], lean: 0.15, face: 'sad' }); });
  at(civ[0], 0.6, 0, -2.4, 0.0); pose(civ[0], { face: 'sad', arms: [-2.8, -2.8], tilt: 0.2, bob: 0 }); });
// === s14: Löschboote, Hafen braun
add(S('s14', 0), S('s14', 0.55), 'harbor', { p: [10, 5, 22], l: [-5, 2, -18], f: 58 }, { p: [8, 4.5, 14], l: [-5, 2.5, -20], f: 52 }, (u, lt, t) => {
  boat.position.set(-6 + Math.sin(lt * 1.5) * 0.4, 0.0, -22);
  spray.forEach((m, i) => { const q = ((lt * 0.9 + i * 0.045) % 1); m.position.set(-6 - 0.2 + (i % 3 - 1) * 0.35, 3 + Math.sin(q * Math.PI) * 6, -22 - 2.8 + q * -16); m.scale.setScalar(1.1 + 0.9 * q); }); stain.scale.set(16, 1, 16); skyNow = sky.dusk; });
add(S('s14', 0.55), S('s15', 0), 'harbor', { p: [-12, 5.5, 18], l: [0, 1, -20], f: 56 }, { p: [-14, 6, 6], l: [0, 1, -22], f: 50 }, (u, lt, t) => {
  stain.scale.set(16 + u * 30, 1, 16 + u * 30); boat.position.set(-8, 0, -20); spray.forEach(m => m.visible = false); skyNow = sky.dusk; }, true);
// === s15: Gericht
add(S('s15', 0), S('s15', 0.55), 'court', { p: [-1.5, 3.4, 9.5], l: [-1.4, 2.6, -3], f: 54 }, { p: [-1.2, 3.3, 7.5], l: [-1.2, 2.6, -3], f: 48 }, (u, lt, t) => {
  skyNow = 0xCDB99A; at(judge, 0, 0.8, -7.3, 0); pose(judge, { face: 'smile', arms: [0, -0.5], talk: null });
  at(lawyer, -1.8, 0, 1.4, 0.3); pose(lawyer, { face: 'shock', arms: [-1.0 + Math.sin(lt * 6) * 0.2, -1.0], bob: 0 }); anSign.position.set(-1.8, 4.5, 1.4); anSign.rotation.y = 0.2; anSign.scale.setScalar(bounce(u, 0.2) * 0.8); anSign.position.x += COURT.x; judge.position.x += COURT.x; judge.position.z += 0; lawyer.position.x += COURT.x; });
add(S('s15', 0.55), S('s16', 0), 'court', { p: [-1.5, 3.6, 9], l: [-1, 2.8, -3], f: 52 }, { p: [-0.5, 3.4, 7.5], l: [-0.5, 2.8, -4], f: 46 }, (u, lt, t) => {
  skyNow = 0xCDB99A; const hit = clamp((u - 0.45) / 0.15);
  at(judge, COURT.x + 0, 0.8, -7.3, 0); pose(judge, { face: u > 0.5 ? 'sad' : 'smile', arms: [-0.2 - 1.2 * (1 - hit) * 0 - 1.3 * Math.abs(Math.sin(lt * 9)) * (u > 0.4 ? 1 : 0), -0.4], talk: null });
  gavel.position.set(COURT.x + 1.6, 2.9 + 0.7 * (u > 0.4 ? Math.abs(Math.sin(lt * 9)) : 1), -5.0); gavel.rotation.z = 0.4;
  anSign.position.set(COURT.x - 1.8, 4.5, 1.4); anSign.rotation.y = 0.2; anSign.scale.setScalar(0.8); bigX.position.set(COURT.x - 1.8, 4.5, 1.8); bigX.scale.setScalar(bounce(u - 0.15, 0.2)); bigX.rotation.y = 0.4;
  at(lawyer, COURT.x - 1.8, 0, 1.4, 0.3); pose(lawyer, { face: 'sad', arms: [-1.0, -1.0] }); });
// === s16: Gesetz ändert sich
add(S('s16', 0), S('s16', 0.55), 'office', { p: [4, 4.4, 4], l: [0, 1.6, -3], f: 46 }, { p: [3, 4.0, 2], l: [0, 1.5, -3], f: 40 }, (u, lt, t) => {
  skyNow = 0xCBD8E6; at(engineer, OFF.x - 2.4, 0, -6.2, 0.2); pose(engineer, { face: 'smile', arms: [-1.0, -1.0 + 0.2 * Math.sin(lt * 4)], lean: 0.1 });
  const k = clamp((u - 0.4) / 0.4); stamp.position.set(OFF.x + 0.6, 1.5 + 2.6 * (1 - Math.abs(Math.sin(Math.min(1, k * 1.2) * Math.PI / 2 * (k < 1 ? 1 : 0)))) * (k < 1 ? 1 : 0), -3); stamp.rotation.y = 0;
  approved.visible = k >= 1; });
add(S('s16', 0.55), S('s17', 0), 'office', { p: [-6, 4.4, 8], l: [0, 3.4, -7], f: 54 }, { p: [-4, 4.2, 6], l: [0, 3.8, -7], f: 50 }, (u, lt, t) => {
  skyNow = 0xCBD8E6; approved.visible = true; at(towerM, OFF.x + 4.8, 0, -6.4, 0); towerM.scale.set(1.2, bounce(u, 0.5) * 1.0 + 0.001, 1.2);
  at(engineer, OFF.x - 5.4, 0, -3.0, 0.5); pose(engineer, { face: 'happy', arms: [-1.2, 0.0], bob: Math.abs(Math.sin(lt * 5)) * 0.05 }); stamp.position.set(OFF.x + 0.6, 1.5, -3); });
// === s17: Finale
add(S('s17', 0), TOTAL, 'street', { p: [-5, 3.0, 12], l: [0, 2.6, -4], f: 54 }, { p: [0, 5.5, 20], l: [0, 2.8, -8], f: 56 }, (u, lt, t) => {
  skyNow = sky.warm; sunSpr.position.set(2, 13, -34); sunSpr.scale.setScalar(1.4);
  houses.forEach(h => h.g.userData.hit = 0);
  civ.forEach((c, i) => { at(c, -3.4 + i * 2.2, 0, 1 + (i % 2) * 2.2, 0.15 - i * 0.1); pose(c, { face: 'happy', arms: [-0.2, i % 2 ? 1.3 : -0.2], bob: Math.abs(Math.sin(lt * 3 + i)) * 0.05, nod: i === 1 ? -0.25 : 0 }); });
  kids.forEach((k, i) => { at(k, -1 + i * 2.6, 0, 5 + i * 0.8, 0); pose(k, { face: 'happy', arms: [1.2, 1.2], bob: Math.abs(Math.sin(lt * 5 + i)) * 0.12 }); });
  smell.forEach((m, i) => { const q = (lt * 0.45 + i * 0.09) % 1; m.position.set(-4 + (i % 7) * 1.3 + Math.sin(lt * 2 + i) * 0.4, 1.6 + q * 5, 1 + (i % 3)); m.rotation.set(0.5, lt + i, 0); m.scale.setScalar(0.7 + q * 0.8); m.material.opacity = 1; });
  l21.visible = false; });

// ---- Untertitel
const cap = document.getElementById('cap'); const words = TL.segs.flatMap(s => s.words);
function setCaption(t) {
  let w = null; for (let i = 0; i < words.length; i++) { if (t >= words[i].a - 0.02 && (i === words.length - 1 || t < words[i + 1].a - 0.02)) { w = words[i]; break; } }
  if (!w || t > w.b + 0.45) { cap.style.opacity = 0; return; }
  const k = clamp((t - w.a) / 0.09); const txt = w.w.replace(/[.,?!]+$/, '').toUpperCase() + (/[?]$/.test(w.w) ? '?' : '');
  cap.textContent = txt; cap.style.fontSize = Math.max(96, Math.min(150, 900 / (txt.length * 0.64))) + 'px'; cap.style.opacity = 1; cap.style.transform = `translate(-50%,-50%) scale(${1.18 - 0.18 * ease(k)})`;
}
function sunFollow(p) { sun.position.set(p.x + 9, p.y + 16, p.z + 9); sun.target.position.copy(p); sun.target.updateMatrixWorld(); const c = sun.shadow.camera; c.left = -22; c.right = 22; c.top = 22; c.bottom = -22; c.near = 1; c.far = 80; c.updateProjectionMatrix(); }

function resetWorld() {
  tankBody.visible = roof.visible = tankSign.visible = true; tank.userData.rivets.visible = true; leaks.forEach(m => m.visible = true); paintStrips.forEach(m => m.visible = false);
  pieces.forEach(m => m.visible = false); roofPiece.visible = false; tank.scale.set(1, 1, 1); tankPuddle.scale.set(1.2, 1, 1.2);
  houses.forEach(h => h.g.userData.hit = 0); approved.visible = false; tHi.visible = false; tLo.visible = true; l21.visible = true; sunSpr.position.set(0, -300, 0);
  spray.forEach(m => { m.visible = true; m.position.set(0, -300, 0); }); stain.scale.set(0.01, 1, 0.01); flash.material.opacity = 0; ball.visible = true;
}
function applyHouses() { houses.forEach(h => { const k = h.g.userData.hit || 0; h.g.rotation.set(0, 0, -h.s * k * 0.55); h.g.position.set(h.s * (10.6 + k * 2.4), -k * 0.9, h.z); }); }

window.renderAt = (t) => {
  hide(); resetWorld();
  const sh = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  const u = clamp((t - sh.t0) / Math.max(0.001, sh.t1 - sh.t0)), lt = t - sh.t0;
  sh.run(u, lt, t); applyHouses();
  scene.background.set(skyNow); hemi.intensity = 1.25;
  const look = camKeys(O[sh.set], sh.a, sh.b, u, sh.ease);
  if (sh.set === 'street' && t >= S('s10', 0) && t < S('s10', 0) + 0.55 + 0.5) { /* leichtes Beben */ camera.position.x += Math.sin(t * 90) * 0.06; }
  sunFollow(new THREE.Vector3(look[0], look[1], look[2]));
  sunSpr.quaternion.copy(camera.quaternion);
  if (!window.NORENDER) renderer.render(scene, camera);
  setCaption(t);
  document.getElementById('fade').style.opacity = t > TOTAL - 0.6 ? clamp((t - (TOTAL - 0.6)) / 0.5) : (t < 0.15 ? 1 - t / 0.15 : 0);
  return true;
};
window.TOTAL = TOTAL; window.READY = true;

// ============ Kollisionsprüfung (Test): Figuren gegen Figuren, Häuser, Tank, Fässer, Möbel, Laternen ============
const wpos = (o) => { o.updateWorldMatrix(true, false); return o.getWorldPosition(new THREE.Vector3()); };
window.audit = (t) => {
  window.renderAt(t); const iss = [];
  const act = [['civ0', civ[0]], ['civ1', civ[1]], ['civ2', civ[2]], ['civ3', civ[3]], ['kid0', kids[0]], ['kid1', kids[1]], ['painter', painter], ['foreman', foreman], ['fire0', fire[0]], ['fire1', fire[1]], ['judge', judge], ['lawyer', lawyer], ['eng', engineer]].filter(([n, c]) => c.position.y > -50);
  const rad = (c) => 0.5 * (c.userData.kid ? 0.66 : 1);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
    const a = act[i][1].position, b = act[j][1].position; const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < rad(act[i][1]) + rad(act[j][1]) - 0.05 && Math.abs(a.y - b.y) < 2) iss.push(`${act[i][0]} x ${act[j][0]}`);
  }
  const inStreet = (c) => c.position.x < 150;
  for (const [n, c] of act) {
    const p = c.position, r = rad(c);
    if (inStreet(c)) {
      if (Math.abs(p.x) > 6.6 - r) iss.push(`${n} in house wall`);
      const dt = Math.hypot(p.x, p.z + 34); if (dt < 7.0 + r && tankBody.visible) iss.push(`${n} in tank`);
      for (const b of barrels) if (b.position.y > -50 && Math.hypot(p.x - b.position.x, p.z - b.position.z) < 0.5 + r + 0.05 && b.scale.x > 0.5) iss.push(`${n} in barrel`);
      for (const s of [-1, 1]) for (let z = 6; z > -26; z -= 9) if (Math.hypot(p.x - s * 5.6, p.z - z) < 0.14 + r) iss.push(`${n} in lamp`);
      if (bucket.position.y > -50 && Math.hypot(p.x - bucket.position.x, p.z - bucket.position.z) < 0.5 + r) iss.push(`${n} in bucket`);
      if (cannon.position.y > -50 && Math.hypot(p.x - cannon.position.x, p.z - cannon.position.z) < 1.4 + r - 0.2) iss.push(`${n} in cannon`);
      if (therm.position.y > -50 && Math.abs(p.x - therm.position.x) < 0.8 + r && Math.abs(p.z - therm.position.z) < 0.3 + r) iss.push(`${n} in thermometer`);
      for (const bt of bottles) if (bt.position.y > -50 && bt.scale.x > .5 && Math.hypot(p.x - bt.position.x, p.z - bt.position.z) < 0.3 + r) iss.push(`${n} in bottle`);
    }
    if (p.x > 150 && p.x < 250) { // Gericht
      const lx = p.x - COURT.x; if (lx > -4.5 && lx < 4.5 && p.z < -3.3 && p.z > -6.9 && p.y < 0.5) iss.push(`${n} in bench/platform`);
    }
    if (p.x > 250) { const lx = p.x - OFF.x; if (lx > -4.1 - r && lx < 4.1 + r && p.z > -5.1 - r && p.z < -0.9 + r) iss.push(`${n} in table`); }
  }
  return iss;
};
