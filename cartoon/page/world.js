// Kulissen: Bank, Käserei, Tresor-Gang, Requisiten
import * as THREE from 'three';
import { toon, mesh, put, canvasTex, makeCheese, makeChar, cheeseTextures } from './lib.js';

const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
export const BANK = V3(0, 0, 0), DAIRY = V3(60, 0, 0), VAULT = V3(0, 0, -120), ALC = V3(0, 0, -22);

function box(parent, w, h, d, color, x, y, z, o = {}) {
  const m = mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'number' ? toon(color) : color, o);
  m.position.set(x, y, z); parent.add(m); return m;
}
function cyl(parent, rt, rb, h, color, x, y, z, o = {}) {
  const m = mesh(new THREE.CylinderGeometry(rt, rb, h, o.seg || 32), typeof color === 'number' ? toon(color) : color, o);
  m.position.set(x, y, z); parent.add(m); return m;
}
function text3(parent, str, w, h, x, y, z, o = {}) {
  const t = canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
    if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, cw, ch); }
    g.fillStyle = o.fg || '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${o.size || ch * 0.6}px Inter Display, Arial Black, sans-serif`; g.fillText(str, cw / 2, ch / 2 + 4);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: !o.bg }));
  m.position.set(x, y, z); parent.add(m); return m;
}

export function checkerTex() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#BFE6D6' : '#F7EDD6'; g.fillRect(i * w / 2, j * h / 2, w / 2, h / 2); }
  }, [14, 14]);
}

// ----------------------------------------------------------------------------- Bank
export function buildBank(scene) {
  const g = new THREE.Group(); g.position.copy(BANK); scene.add(g);
  const refs = {};
  const floor = mesh(new THREE.PlaneGeometry(40, 40), toon(0xffffff, { map: checkerTex() }), { outline: 0 });
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -6); g.add(floor);
  const wall = 0xF3C08C, wains = 0xD98A44;
  // Rückwand mit Tresor-Öffnung (x -5.8..-0.6, y 0..4.8)
  box(g, 9.6, 8, 0.6, wall, -10.6, 4, -8.3); box(g, 12.6, 8, 0.6, wall, 5.7, 4, -8.3); box(g, 5.2, 3.2, 0.6, wall, -3.2, 6.4, -8.3);
  box(g, 30, 0.18, 0.7, wains, 0, 1.6, -7.95, { outline: 0.012 });
  box(g, 0.6, 8, 30, wall, -13, 4, -4); box(g, 0.6, 8, 30, wall, 13, 4, -4);
  box(g, 30, 0.18, 0.2, wains, 0, 7.6, -7.95, { outline: 0.012 });
  // Säulen
  for (const x of [-8.2, 8.2, -8.2, 8.2]) { }
  for (const x of [-8.6, 8.6]) {
    cyl(g, 0.55, 0.62, 7.4, 0xC9CED8, x, 3.7, -6.6); cyl(g, 0.95, 0.95, 0.35, 0xE6E9EF, x, 7.4, -6.6); cyl(g, 0.9, 0.9, 0.3, 0xE6E9EF, x, 0.15, -6.6);
  }
  // Tresortür
  const door = new THREE.Group(); door.position.set(-5.8, 0, -7.9); g.add(door); refs.door = door;
  const disc = new THREE.Group(); disc.position.set(2.6, 2.6, 0); door.add(disc);
  cyl(disc, 2.62, 2.62, 0.55, 0xB9BEC8, 0, 0, 0).rotation.x = Math.PI / 2;
  cyl(disc, 2.1, 2.1, 0.62, 0xD3D7DF, 0, 0, 0.02).rotation.x = Math.PI / 2;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; const b = mesh(new THREE.SphereGeometry(0.1, 10, 8), toon(0x8d939f), { outline: 0.02 }); put(b, Math.cos(a) * 2.35, Math.sin(a) * 2.35, 0.34, disc); }
  const hub = new THREE.Group(); hub.position.set(0, 0, 0.5); disc.add(hub); refs.hub = hub;
  const ring = mesh(new THREE.TorusGeometry(0.95, 0.09, 10, 36), toon(0xC9962A), { outline: 0.02 }); hub.add(ring);
  for (let i = 0; i < 6; i++) { const sp = mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0, 8), toon(0xC9962A), { outline: 0.02 }); sp.rotation.z = i / 6 * Math.PI; hub.add(sp); }
  const core = mesh(new THREE.SphereGeometry(0.28, 14, 12), toon(0xE2B13C), { outline: 0.02 }); hub.add(core);
  // Alkoven hinter der Tür
  refs.alcove = buildAlcove(scene);
  // Schild
  box(g, 5.6, 1.3, 0.2, 0x1f6b4a, 3, 5.6, -7.85); box(g, 5.3, 1.0, 0.1, 0x2f8b63, 3, 5.6, -7.72, { outline: 0.008 });
  text3(g, 'BANCA', 4.6, 0.9, 3, 5.6, -7.6, { fg: '#F2C84B', size: 150 });
  // Schreibtisch
  const desk = box(g, 5.2, 1.05, 1.7, 0x2f5f4a, 3, 0.52, -5.2); box(g, 5.4, 0.12, 1.9, 0x1d4435, 3, 1.08, -5.2, { outline: 0.015 });
  box(g, 5.0, 0.8, 0.1, 0x244e3b, 3, 0.5, -4.34, { outline: 0.01 });
  // Lampe
  cyl(g, 0.4, 0.4, 0.08, 0x2a2a2a, 5, 1.16, -5.2); cyl(g, 0.05, 0.05, 0.8, 0x333333, 5, 1.55, -5.2);
  const lamp = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 20, 1, false, 0, Math.PI), toon(0x37c486), { outline: 0.02 }); lamp.rotation.z = Math.PI / 2; lamp.rotation.y = Math.PI / 2; put(lamp, 5, 2.0, -5.2, g);
  const glowM = new THREE.MeshBasicMaterial({ color: 0xffe38a }); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), glowM); put(bulb, 5, 1.82, -5.2, g);
  // Fenster rechts
  box(g, 0.2, 3.6, 3.0, 0x7fb8e8, 12.6, 4.2, -2, { outline: 0.02, shadow: false }); box(g, 0.3, 0.2, 3.3, 0xB9772f, 12.5, 6.1, -2, { outline: 0.01 }); box(g, 0.3, 0.2, 3.3, 0xB9772f, 12.5, 2.3, -2, { outline: 0.01 });
  refs.root = g; return refs;
}

// ----------------------------------------------------------------------------- Alkoven + Regale
export function shelfBlock(parent, x0, z0, nx, nz, levels, o = {}) {
  const geo = new THREE.CylinderGeometry(0.85, 0.85, 0.7, 28); const n = nx * nz * levels;
  const side = toon(0xffffff, { map: cheeseTextures() }); const cap = toon(0xF2B552);
  const inst = new THREE.InstancedMesh(geo, [side, cap, cap], n); inst.castShadow = true; inst.receiveShadow = true;
  const olm = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: 0x14110f, side: THREE.BackSide }), n);
  olm.material.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * 0.05;'); };
  const m = new THREE.Matrix4(); let k = 0;
  for (let l = 0; l < levels; l++) for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const ry = ((i * 7 + j * 13 + l * 5) % 10) / 10 * Math.PI * 2;
    m.compose(V3(x0 + i * 1.95, 0.55 + l * (o.dy || 1.7), z0 + j * 1.95), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1));
    inst.setMatrixAt(k, m); olm.setMatrixAt(k, m); k++;
  }
  parent.add(inst); parent.add(olm);
  for (let l = 0; l < levels; l++) { const pl = box(parent, nx * 1.95 + 0.4, 0.14, nz * 1.95 + 0.2, 0x8a5a34, x0 + (nx - 1) * 0.975, 0.14 + l * (o.dy || 1.7), z0 + (nz - 1) * 0.975, { outline: 0.012 }); }
  return inst;
}

export function buildAlcove(scene) {
  const g = new THREE.Group(); g.position.copy(ALC); scene.add(g);
  // Raum hinter der Tür (liegt hinter der Bankwand, z -9..-22): wird um ALC verschoben platziert
  g.position.set(-3.2, 0, -8.3);
  box(g, 14, 0.2, 14, 0xC9A06C, 0, -0.1, -7); box(g, 14, 9, 0.4, 0xE0A860, 0, 4.5, -14); box(g, 0.4, 9, 14, 0xE0A860, -6.8, 4.5, -7); box(g, 0.4, 9, 14, 0xE0A860, 6.8, 4.5, -7); box(g, 14, 0.4, 14, 0xD79048, 0, 9, -7);
  shelfBlock(g, -5.6, -13, 6, 1, 5, { dy: 1.75 }); shelfBlock(g, -5.6, -9.2, 1, 2, 5); shelfBlock(g, 4.4, -9.2, 1, 2, 5);
  for (let i = 0; i < 3; i++) { const lm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.5), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); put(lm, 0, 8.8, -3 - i * 4, g); }
  return g;
}

// ----------------------------------------------------------------------------- Käserei
export function buildDairy(scene) {
  const g = new THREE.Group(); g.position.copy(DAIRY); scene.add(g);
  const refs = {};
  const floorT = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#9b6a3d'; c.fillRect(0, 0, w, h); c.fillStyle = '#7d522c'; for (let i = 0; i < 4; i++) c.fillRect(0, i * h / 4, w, 5); c.fillRect(w / 2, 0, 5, h / 2); c.fillRect(w / 4, h / 2, 5, h / 2); }, [10, 10]);
  const floor = mesh(new THREE.PlaneGeometry(40, 40), toon(0xffffff, { map: floorT }), { outline: 0 }); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -6); g.add(floor);
  box(g, 30, 9, 0.5, 0xE8C79A, 0, 4.5, -8.3); box(g, 0.5, 9, 30, 0xDDB787, -12, 4.5, -4); box(g, 0.5, 9, 30, 0xDDB787, 12, 4.5, -4);
  for (const x of [-9, -3, 3, 9]) box(g, 0.45, 9, 0.5, 0x6b4426, x, 4.5, -7.9, { outline: 0.012 });
  box(g, 30, 0.45, 0.6, 0x6b4426, 0, 8.6, -7.9, { outline: 0.012 }); box(g, 30, 0.35, 0.6, 0x6b4426, 0, 1.0, -7.9, { outline: 0.012 });
  // Kupferkessel
  const vat = cyl(g, 1.9, 1.5, 2.0, 0xC8743A, -3, 1.0, -4.5, { seg: 40 }); refs.vat = vat;
  cyl(g, 1.7, 1.7, 0.08, 0xF4EBD2, -3, 1.9, -4.5, { outline: 0.01, seg: 40 });
  const rim = mesh(new THREE.TorusGeometry(1.88, 0.1, 10, 40), toon(0xE08A4A), { outline: 0.02 }); rim.rotation.x = Math.PI / 2; put(rim, -3, 2.0, -4.5, g);
  // Rührstab
  const stick = new THREE.Group(); put(stick, -3, 2.0, -4.5, g); const st = mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.2, 8), toon(0x8a5a34), { outline: 0.02 }); st.position.y = 0.4; st.rotation.z = 0.5; stick.add(st); refs.stick = stick;
  // Regal mit reifenden Laiben
  shelfBlock(g, 3.5, -7.2, 4, 1, 3, { dy: 2.1 });
  // Kalender
  const cal = new THREE.Group(); put(cal, 0.5, 4.8, -7.6, g); box(cal, 2.4, 3.0, 0.1, 0xF7F2E6, 0, 0, 0); box(cal, 2.4, 0.6, 0.14, 0xC83232, 0, 1.2, 0.02, { outline: 0.01 });
  refs.pages = []; for (let i = 0; i < 6; i++) { const p = new THREE.Group(); p.position.set(0, 1.5, 0.1 + i * 0.02); const pm = mesh(new THREE.BoxGeometry(2.3, 2.3, 0.03), toon(0xFFFFFF), { outline: 0.006 }); pm.position.y = -1.15; p.add(pm); text3(p, String(i + 1), 1.2, 1.0, 0, -1.2, 0.03, { fg: '#222', size: 220 }); cal.add(p); refs.pages.push(p); }
  // Uhr
  const clock = new THREE.Group(); put(clock, 7.5, 5.2, -7.6, g); cyl(clock, 1.4, 1.4, 0.25, 0x5b3a22, 0, 0, 0).rotation.x = Math.PI / 2; cyl(clock, 1.2, 1.2, 0.3, 0xF7F2E6, 0, 0, 0.02).rotation.x = Math.PI / 2;
  const hH = box(clock, 0.12, 0.7, 0.06, 0x14110f, 0, 0.3, 0.22, { outline: 0 }); hH.geometry.translate(0, 0.0, 0); const hM = box(clock, 0.08, 1.0, 0.06, 0x14110f, 0, 0.45, 0.28, { outline: 0 });
  const piH = new THREE.Group(); piH.position.set(0, 0, 0); clock.add(piH); piH.add(hH); hH.position.set(0, 0.3, 0.22);
  const piM = new THREE.Group(); clock.add(piM); piM.add(hM); hM.position.set(0, 0.45, 0.28); refs.hH = piH; refs.hM = piM;
  // Tisch mit Rechnungen
  box(g, 4.6, 1.0, 2.2, 0x8a5a34, 5, 0.5, 0); box(g, 4.8, 0.12, 2.4, 0xB07845, 5, 1.05, 0, { outline: 0.012 });
  refs.bills = []; for (let i = 0; i < 9; i++) { const bm = box(g, 1.0, 0.07, 1.35, 0xFFFFFF, 4 + (i % 3) * 0.95, 1.14 + Math.floor(i / 3) * 0.1, -0.3 + (i % 2) * 0.5, { outline: 0.01 }); bm.rotation.y = (i * 0.9) % 1.2 - 0.6; bm.scale.setScalar(0.001); refs.bills.push(bm); const st2 = box(bm, 0.4, 0.02, 0.22, 0xD2232A, 0.15, 0.05, 0.1, { outline: 0 }); }
  text3(g, 'BILLS', 3, 0.9, 5, 3.4, 1.2, { fg: '#D2232A', size: 200 }).visible = false;
  box(g, 0.2, 3.2, 3.2, 0x7fb8e8, -11.8, 4.5, -3, { outline: 0.02, shadow: false });
  refs.root = g; return refs;
}

// ----------------------------------------------------------------------------- Tresor-Gang
export function buildVault(scene) {
  const g = new THREE.Group(); g.position.copy(VAULT); scene.add(g);
  const refs = {};
  box(g, 16, 0.3, 120, 0xD6B48A, 0, -0.15, -40); box(g, 16, 0.3, 120, 0xE59A4B, 0, 8.15, -40); box(g, 0.5, 9, 120, 0xCFA06A, -8.2, 4, -40); box(g, 0.5, 9, 120, 0xCFA06A, 8.2, 4, -40);
  box(g, 16, 9, 0.5, 0xE59A4B, 0, 4, -100);
  for (let i = 0; i < 22; i++) { const lm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 0.7), new THREE.MeshBasicMaterial({ color: 0xFFD79A })); put(lm, 0, 7.85, 4 - i * 5, g); }
  shelfBlock(g, -6.7, -58, 3, 31, 4, { dy: 1.9 }); shelfBlock(g, 3.0, -58, 3, 31, 4, { dy: 1.9 });
  for (let i = 0; i < 9; i++) { for (const x of [-7.15, -0.55 - 0.15, 2.75, 7.7]) { } }
  refs.root = g; return refs;
}

// ----------------------------------------------------------------------------- Requisiten
export function moneyBag() {
  const g = new THREE.Group();
  const b = mesh(new THREE.SphereGeometry(0.5, 20, 16), toon(0xC9A15A), { outline: 0.03 }); b.scale.set(1, 1.1, 1); b.position.y = 0.5; g.add(b);
  const neck = mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.3, 14), toon(0xC9A15A), { outline: 0.02 }); put(neck, 0, 1.05, 0, g);
  const tie = mesh(new THREE.TorusGeometry(0.18, 0.045, 8, 16), toon(0x7a1f1f), { outline: 0.01 }); tie.rotation.x = Math.PI / 2; put(tie, 0, 0.98, 0, g);
  const t = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#1f6b3a'; c.beginPath(); c.arc(w / 2, h / 2, 100, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '900 140px Inter Display, Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('€', w / 2, h / 2 + 8); });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: t, transparent: true })); put(lab, 0, 0.5, 0.52, g);
  return g;
}
export function coin() {
  const m = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 20), toon(0xF2C230), { outline: 0.02 }); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(m); return g;
}
export function soldSign() {
  const g = new THREE.Group(); box(g, 1.7, 0.7, 0.1, 0xD2232A, 0, 0, 0, { outline: 0.02 }); text3(g, 'SOLD', 1.5, 0.55, 0, 0, 0.07, { fg: '#fff', size: 200 }); return g;
}
export function hammer() {
  const g = new THREE.Group(); const h = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 10), toon(0x8a5a34), { outline: 0.015 }); h.position.y = -0.2; g.add(h);
  const hd = mesh(new THREE.BoxGeometry(0.55, 0.28, 0.28), toon(0x8b929c), { outline: 0.02 }); hd.position.y = 0.3; g.add(hd); return g;
}
export function robot() {
  const g = new THREE.Group();
  const bd = mesh(new THREE.BoxGeometry(1.5, 0.9, 1.9), toon(0x5E8FC2), { outline: 0.04 }); bd.position.y = 0.95; g.add(bd);
  box(g, 1.2, 0.5, 1.2, 0xE8EEF5, 0, 1.6, -0.1);
  const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshBasicMaterial({ color: 0x66ffcc })); put(e, 0.3 * s, 1.65, 0.52, g); eyes.push(e); }
  const wheels = []; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(g, 0.4, 0.4, 0.3, 0x2b2b30, 0.8 * sx, 0.4, 0.65 * sz); w.rotation.z = Math.PI / 2; wheels.push(w); }
  const brush = new THREE.Group(); put(brush, 0, 0.9, 1.3, g); const br = mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.4, 14), toon(0xF2C230), { outline: 0.03 }); br.rotation.z = Math.PI / 2; brush.add(br);
  for (let i = 0; i < 10; i++) { const bs = box(brush, 0.06, 0.2, 0.06, 0x333333, (i - 4.5) * 0.14, 0.32, 0, { outline: 0 }); }
  g.userData = { brush, eyes, wheels }; return g;
}
export function scale() {
  const g = new THREE.Group(); cyl(g, 1.8, 2.0, 0.5, 0x5b6b7a, 0, 0.25, 0); cyl(g, 1.6, 1.6, 0.14, 0xD9DEE6, 0, 0.56, 0);
  const dial = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(128, 128, 120, 0, 7); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 6; c.stroke(); c.fillStyle = '#222'; c.font = '900 52px Inter Display, Arial'; c.textAlign = 'center'; c.fillText('40 kg', 128, 190); for (let i = 0; i < 12; i++) { const a = Math.PI * 1.15 + i / 11 * Math.PI * 0.7; c.beginPath(); c.moveTo(128 + Math.cos(a) * 95, 128 + Math.sin(a) * 95); c.lineTo(128 + Math.cos(a) * 112, 128 + Math.sin(a) * 112); c.stroke(); } });
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.9, 32), new THREE.MeshBasicMaterial({ map: dial })); put(d, 0, 1.3, -1.3, g); d.rotation.x = -0.4;
  const needle = new THREE.Group(); put(needle, 0, 1.4, -1.28, g); const nd = box(needle, 0.06, 0.62, 0.03, 0xD2232A, 0, 0.3, 0.03, { outline: 0 }); needle.rotation.x = -0.4; g.userData = { needle }; return g;
}
export function inspectorChar() { return makeChar({ suit: 0xf2f2f4, coat: 0xf2f2f4, shirt: 0x9ab, hair: 0x39465a, glasses: true, pants: 0x39465a, skin: 0xE9A672 }); }
