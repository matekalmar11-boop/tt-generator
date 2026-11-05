import * as THREE from 'three';
import { toon, mesh, put, makeChar, pose, setFace, makeCheese } from './lib.js';
import * as W from './world.js';

const TL = await (await fetch('/timeline.json')).json();
const SEG = Object.fromEntries(TL.segs.map(s => [s.id, s]));
const S = (id, f = 0) => SEG[id].start + f * (SEG[id].end - SEG[id].start);
const TOTAL = TL.total;

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(1080, 1920, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0xF0C493);
const camera = new THREE.PerspectiveCamera(50, 1080 / 1920, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xfff2e0, 0xa8794a, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe6c4, 2.2); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun); scene.add(sun.target);
const warm = new THREE.PointLight(0xffa24a, 0, 40, 1.5); scene.add(warm);

const bank = W.buildBank(scene), dairy = W.buildDairy(scene), vault = W.buildVault(scene);

// ---- Figuren & Requisiten
const banker = makeChar({ suit: 0x1d3a78, shirt: 0xffffff, tie: 0xd2232a, hair: 0x15110f, glasses: true, skin: 0xF0A468 }); scene.add(banker);
const maker = makeChar({ suit: 0x6aa6d8, coat: 0x6aa6d8, pants: 0x6b4a2b, apron: true, cap: 0x2c7a4b, mustache: true, beard: true, skin: 0xF0A468 }); scene.add(maker);
const insp = [W.inspectorChar(), W.inspectorChar()]; insp.forEach(i => scene.add(i));
const robots = [W.robot(), W.robot()]; robots.forEach(r => scene.add(r));
const wheelA = makeCheese(1.5, 1.0); scene.add(wheelA);         // Haupt-Laib (steht/rollt)
const wheelB = makeCheese(1.3, 0.9); scene.add(wheelB);
const bag = W.moneyBag(); scene.add(bag); const bag2 = W.moneyBag(); scene.add(bag2);
const coins = []; for (let i = 0; i < 28; i++) { const c = W.coin(); scene.add(c); coins.push(c); }
const sold = W.soldSign(); scene.add(sold);
const hammer = W.hammer(); scene.add(hammer);
const scaleP = W.scale(); scene.add(scaleP);
const pedestal = new THREE.Group(); { const p1 = mesh(new THREE.CylinderGeometry(1.9, 2.1, 0.9, 32), toon(0xD8D2C2)); p1.position.y = 0.45; pedestal.add(p1); const p2 = mesh(new THREE.CylinderGeometry(1.6, 1.8, 0.2, 32), toon(0xC9962A)); p2.position.y = 0.95; pedestal.add(p2); } scene.add(pedestal);
const sparks = []; for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xffe27a : 0xfff4c2 })); scene.add(m); sparks.push(m); }
const drops = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0x8fd0ff })); m.scale.y = 1.4; scene.add(m); drops.push(m); }
const glowSprite = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,226,120,0.95)'); gr.addColorStop(0.45, 'rgba(255,200,80,0.35)'); gr.addColorStop(1, 'rgba(255,200,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true, depthWrite: false })); scene.add(glowSprite);

const ALL = [banker, maker, ...insp, ...robots, wheelA, wheelB, bag, bag2, ...coins, sold, hammer, scaleP, pedestal, ...sparks, ...drops, glowSprite];
const hide = () => ALL.forEach(o => { o.position.set(0, -300, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.visible = true; });

// ---- Helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const lerpV = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
const bounce = (u, d = 0.35) => { const x = u / d; if (x < 0) return 0; if (x >= 1) return 1; return [0.4, 1.2, 0.93, 1.05, 1][Math.floor(x * 5)]; };
const O = { bank: W.BANK, dairy: W.DAIRY, vault: W.VAULT };
const at = (o, x, y, z) => new THREE.Vector3(o.x + x, o.y + y, o.z + z);
const roll = (w, r, dist) => { w.rotation.x = -dist / r; };   // Laib rollt um X-Achse (Achse horizontal in X)
function upright(w) { w.rotation.set(0, 0, Math.PI / 2); }  // Achse = X

// Kamera: keys [{t,p,l,f}] relativ zu Set-Ursprung o (0..1 u)
function camKeys(o, a, b, u, e = true) {
  const k = e ? ease(u) : u;
  const p = lerpV(a.p, b.p, k), l = lerpV(a.l, b.l, k), f = lerp(a.f || 50, b.f || 50, k);
  camera.position.set(o.x + p[0], o.y + p[1], o.z + p[2]); camera.lookAt(o.x + l[0], o.y + l[1], o.z + l[2]); camera.fov = f; camera.updateProjectionMatrix();
  return [o.x + l[0], o.y + l[1], o.z + l[2]];
}

// ---- Szenen-Hilfen
function talkBanker(t, extra = {}) { pose(banker, { talk: t, bob: Math.sin(t * 3) * 0.02, look: Math.sin(t * 1.3) * 0.15, ...extra }); }
function placeBanker(x = 3, z = -5.8, ry = 0) { banker.position.set(x, 0, z); banker.rotation.y = ry; }

// Shots: { t0, t1, set, a(cam start), b(cam end), run(u, lt, t) }
const shots = [];
const add = (t0, t1, set, a, b, run) => shots.push({ t0, t1, set, a, b, run: run || (() => { }) });

// === s01  Bank
add(0, S('s01', 0.62), 'bank', { p: [4.2, 3.2, 6.5], l: [2.9, 1.5, -6], f: 48 }, { p: [3.5, 2.9, 2.8], l: [3.1, 1.5, -5.6], f: 42 }, (u, lt) => { placeBanker(); talkBanker(lt, { face: 'smile' }); });
add(S('s01', 0.62), S('s02', 0), 'bank', { p: [6.8, 2.7, -0.6], l: [3.2, 2.5, -5.8], f: 34 }, { p: [6.0, 2.65, -1.4], l: [3.0, 2.5, -5.8], f: 31 }, (u, lt) => { placeBanker(); talkBanker(lt, { face: 'happy', arms: [0, -0.3 * Math.sin(lt * 2)] }); });
// === s02  Laib rollt herein
add(S('s02', 0), S('s03', 0), 'bank', { p: [0.5, 2.0, 9], l: [0.5, 1.4, -5], f: 56 }, { p: [0.5, 1.8, 6.5], l: [0.5, 1.4, -5], f: 54 }, (u, lt) => {
  const d = lerp(5, -3.6, ease(u)); wheelA.position.set(-3.2, 1.5, d); upright(wheelA); wheelA.rotation.x = (d - 5) / 1.5; wheelA.rotation.z = Math.PI / 2; wheelA.rotation.order = 'XYZ';
  placeBanker(3, -5.8); pose(banker, { face: u > 0.35 ? 'shock' : 'smile', nod: -0.1, out: 0.4 * clamp(u * 3), arms: [-0.6 * clamp(u * 3), -0.6 * clamp(u * 3)] }); });
// === s03  Held-Shot
add(S('s03', 0), S('s04', 0), 'bank', { p: [9, 4.2, 7], l: [-3, 1.0, -1], f: 48 }, { p: [-3, 3.6, 11.5], l: [-3, 1.0, -1], f: 48 }, (u, lt, t) => {
  pedestal.position.set(-3, 0, -1); wheelA.position.set(-3, 1.55, -1); wheelA.rotation.set(0, lt * 1.4, 0);
  sparks.forEach((s, i) => { const a = lt * 1.5 + i * 0.52, r = 2.4 + (i % 3) * 0.5; s.position.set(-3 + Math.cos(a) * r, 1.4 + (i % 5) * 0.55 + Math.sin(lt * 3 + i) * 0.2, -1 + Math.sin(a) * r); s.rotation.y = lt * 3; s.scale.setScalar(0.7 + 0.5 * Math.sin(lt * 5 + i)); });
});
// === s04  Waage + Geld
add(S('s04', 0), S('s04', 0.5), 'bank', { p: [-6.5, 3.6, 10], l: [-4, 1.0, 0.5], f: 42 }, { p: [-4.5, 3.0, 9], l: [-4, 1.0, 0.5], f: 40 }, (u, lt) => {
  scaleP.position.set(-4, 0, 0.5); scaleP.rotation.y = 0.2; wheelA.position.set(-4, 1.85 - 0.06 * Math.sin(lt * 18) * (1 - ease(u * 2)), 0.5); wheelA.rotation.set(0, 0.3, 0);
  scaleP.userData.needle.rotation.z = lerp(0.9, -0.55, ease(u * 1.6)) + Math.sin(lt * 20) * 0.05 * (1 - ease(u * 2)); });
add(S('s04', 0.5), S('s05', 0), 'bank', { p: [-0.5, 4.0, 11], l: [-3.5, 0.8, 0.5], f: 50 }, { p: [-1.5, 3.4, 10], l: [-3.5, 0.8, 0.5], f: 46 }, (u, lt) => {
  wheelA.position.set(-5.2, 0.8, 0.5); wheelA.scale.setScalar(0.9);
  coins.forEach((c, i) => { const t0 = i * 0.05; const k = clamp((u * 1.3 - t0) / 0.35); const y = lerp(6, 0.2 + Math.floor(i / 7) * 0.09, ease(k)); c.position.set(-2.2 + (i % 7) * 0.12 - 0.4, y, 0.8 + ((i * 3) % 5) * 0.1 - 0.2); c.rotation.set(k < 1 ? lt * 8 : 0, k < 1 ? lt * 5 : 0, 0); c.scale.setScalar(k > 0 ? 1.25 : 0.001); });
  bag.position.set(-1.6, 0, 1.2); bag.scale.setScalar(bounce(u, 0.4) * 1.1); });
// === s05  Käserei: Käser rührt
add(S('s05', 0), S('s06', 0), 'dairy', { p: [4.5, 3.4, 6.5], l: [-2, 1.4, -4.5], f: 54 }, { p: [2.5, 3.2, 3.5], l: [-2, 1.6, -4.5], f: 48 }, (u, lt) => {
  maker.position.set(-0.4, 0, -4.4).add(new THREE.Vector3(0, 0, 0)); maker.position.set(O.dairy.x - 0.6, 0, -2.6); maker.rotation.y = -0.9;
  pose(maker, { arms: [-0.7 + 0.3 * Math.sin(lt * 5), -0.9 + 0.3 * Math.cos(lt * 5)], lean: 0.12, face: 'smile', look: 0.3 });
  dairy.stick.rotation.y = lt * 5; dairy.stick.rotation.z = Math.sin(lt * 5) * 0.15; });
// === s06  Reifen (Kalender, Uhr, Bart)
add(S('s06', 0), S('s06', 0.5), 'dairy', { p: [3.5, 3.6, 7], l: [3.5, 3.6, -7], f: 50 }, { p: [2.5, 3.8, 3.5], l: [2.5, 4.0, -7], f: 42 }, (u, lt) => {
  maker.position.set(O.dairy.x + 2.6, 0, -3.5); maker.rotation.y = 0.0; pose(maker, { arms: [0.9, 0.9], out: 0.2, nod: 0.1, face: 'smile' });
  dairy.pages.forEach((p, i) => { const k = clamp(u * 7 - i * 0.9); p.rotation.x = -ease(k) * 3.0; });
  dairy.hM.rotation.z = -lt * 12; dairy.hH.rotation.z = -lt * 1.0; });
add(S('s06', 0.5), S('s07', 0), 'dairy', { p: [2.0, 3.4, 4.0], l: [2.6, 2.2, -3.5], f: 36 }, { p: [2.6, 3.4, 3.0], l: [2.6, 2.4, -3.5], f: 31 }, (u, lt) => {
  maker.position.set(O.dairy.x + 2.6, 0, -3.5); maker.rotation.y = 0; pose(maker, { arms: [0.9, 0.9], face: 'sad', nod: 0.15 });
  const bd = maker.userData; const bm = maker.userData; maker.userData.beard && 0;
  maker.userData.beard.scale.set(1.1, 0.1 + u * 2.2, 0.5 + u * 0.9); maker.userData.beard.position.set(0, -0.34 - u * 0.4, 0.45); dairy.hM.rotation.z = -lt * 22; dairy.hH.rotation.z = -lt * 2; });
// === s07  Rechnungen
add(S('s07', 0), S('s08', 0), 'dairy', { p: [8.5, 4.6, 7], l: [5, 1.5, -1.0], f: 50 }, { p: [7.5, 4.2, 5.6], l: [5, 1.6, -1.0], f: 46 }, (u, lt) => {
  maker.position.set(O.dairy.x + 5, 0, -2.2); maker.rotation.y = 0.0; pose(maker, { arms: [1.4, 1.4], face: 'shock', nod: 0.2, tilt: Math.sin(lt * 12) * 0.06 });
  dairy.bills.forEach((b, i) => { b.scale.setScalar(bounce(u - i * 0.07, 0.3) || 0.001); });
  drops.forEach((d, i) => { const k = (lt * 1.6 + i * 0.33) % 1; d.position.set(O.dairy.x + 4.4 + i * 0.5, 4.0 - k * 1.6, -2.0 + 0.9); }); });
// === s08  Laib rollt zur Bank
add(S('s08', 0), S('s09', 0), 'bank', { p: [-7, 2.4, 11], l: [0, 1.2, 0], f: 58 }, { p: [4.5, 2.6, 6], l: [3, 1.2, -3.5], f: 54 }, (u, lt) => {
  const z = lerp(8, -2.6, ease(u)), x = lerp(-3, 3, ease(u));
  wheelA.position.set(x, 1.5, z); upright(wheelA); wheelA.rotation.x = (z - 8) / 1.5;
  maker.position.set(x - 0.4, 0, z + 1.9); maker.rotation.y = 0.15; pose(maker, { walk: lt * 9, arms: [-1.4, -1.4], lean: 0.2, face: 'smile' });
  placeBanker(3, -5.8); pose(banker, { face: 'shock' }); });
// === s09  Banker prüft + Bargeld
add(S('s09', 0), S('s09', 0.55), 'bank', { p: [7.5, 3.4, 1.5], l: [2.6, 1.3, -5], f: 42 }, { p: [6.0, 3.1, 0.5], l: [2.6, 1.3, -5], f: 38 }, (u, lt) => {
  wheelA.position.set(1.4, 2.1, -4.7); wheelA.scale.setScalar(0.8); upright(wheelA); wheelA.rotation.x = 0;
  placeBanker(3.6, -5.8); pose(banker, { arms: [-0.3 - 0.8 * Math.abs(Math.sin(lt * 9)), 0.1], face: 'smile', look: -0.4, talk: null });
  hammer.position.set(2.5, 2.2, -4.2); });
add(S('s09', 0.55), S('s10', 0), 'bank', { p: [0.5, 3.2, 3.2], l: [2.4, 1.4, -4.5], f: 44 }, { p: [1.8, 3.0, 2.2], l: [2.6, 1.4, -4.5], f: 40 }, (u, lt) => {
  placeBanker(4.2, -5.8); pose(banker, { arms: [-1.3, -0.1], face: 'happy' });
  maker.position.set(0.8, 0, -3.2); maker.rotation.y = 0.5; pose(maker, { arms: [-1.3, -1.3 + 0.3 * Math.sin(lt * 6)], face: 'happy', bob: Math.abs(Math.sin(lt * 7)) * 0.1 });
  bag.position.set(1.9, 1.15, -3.9); bag.scale.setScalar(bounce(u, 0.3) * 0.9);
  sparks.forEach((s, i) => { const a = i / sparks.length * 6.28 + lt * 2; const r = 0.9 + 0.5 * Math.sin(lt * 4 + i); s.position.set(1.9 + Math.cos(a) * r, 1.8 + Math.sin(a) * r * 0.7, -3.9); s.scale.setScalar(0.8); }); });
// === s10  Tresortür öffnet
add(S('s10', 0), S('s11', 0), 'bank', { p: [-2, 2.6, 6], l: [-3, 2.4, -7], f: 52 }, { p: [-3.2, 2.7, -2.5], l: [-3.2, 2.6, -12], f: 62 }, (u, lt) => {
  const o = ease(clamp((u - 0.2) / 0.5));
  bank.hub.rotation.z = -clamp(u / 0.35) * 6.0; bank.door.rotation.y = -o * 1.75;
  wheelA.position.set(-3.2, 1.0, 2 - 3 * clamp(u)); wheelA.scale.setScalar(0.7); upright(wheelA); wheelA.rotation.x = u * 6; });
// === s11 Regale (Flug durch den Gang)
add(S('s11', 0), S('s12', 0), 'vault', { p: [0, 3.2, 6], l: [0, 3.4, -30], f: 62 }, { p: [0, 3.0, -38], l: [0, 3.4, -70], f: 62 }, (u, lt) => { warm.position.set(O.vault.x, 6, O.vault.z + lerp(0, -38, u)); warm.intensity = 40; }, 0);
// === s12  Stapel bis zur Decke
add(S('s12', 0), S('s13', 0), 'vault', { p: [0.2, 1.4, -18], l: [0, 4.6, -34], f: 62 }, { p: [0.2, 1.6, -18], l: [0, 6.6, -36], f: 66 }, (u, lt) => { warm.position.set(O.vault.x, 6, O.vault.z - 22); warm.intensity = 40;
  insp[0].position.set(O.vault.x + 0.2, 0, O.vault.z - 24.5); insp[0].rotation.y = Math.PI; pose(insp[0], { arms: [-0.4, -0.4], face: 'shock', look: -0.2, nod: -0.5 }); });
// === s13  Roboter
add(S('s13', 0), S('s14', 0), 'vault', { p: [-1.2, 3.2, -4], l: [0.3, 1.0, -14], f: 50 }, { p: [-1.2, 3.0, -11], l: [0.3, 1.0, -21], f: 48 }, (u, lt) => { warm.position.set(O.vault.x, 6, O.vault.z - 14); warm.intensity = 40;
  robots.forEach((r, i) => { const z = O.vault.z - 12 - i * 7 - u * 6; r.position.set(O.vault.x - 1.6 + (i % 2) * 0.3, 0, z); r.rotation.y = -1.57 + 3.14 * 0; r.userData.brush.rotation.x = -lt * 14; r.userData.wheels.forEach(w => w.rotation.x = lt * 8); r.userData.eyes.forEach((e, j) => e.visible = (Math.floor(lt * 4 + i) % 3) !== j + 3); r.rotation.y = Math.PI; }); });
// === s14  Brandzeichen
add(S('s14', 0), S('s14', 0.5), 'vault', { p: [0.6, 2.6, -2.5], l: [0.2, 1.2, -9.6], f: 46 }, { p: [0.5, 2.4, -3.6], l: [0.2, 1.2, -9.6], f: 42 }, (u, lt) => { warm.position.set(O.vault.x - 1, 6, O.vault.z - 8); warm.intensity = 40;
  wheelA.position.set(O.vault.x - 0.5, 1.0, O.vault.z - 9.6); wheelA.scale.setScalar(0.68); wheelA.rotation.set(0, 0, 0);
  insp[0].position.set(O.vault.x + 0.9, 0, O.vault.z - 9.6); insp[0].rotation.y = -1.57; pose(insp[0], { arms: [-1.2 + 0.7 * Math.abs(Math.sin(lt * 5)), 0], face: 'happy' });
  sparks.forEach((s, i) => { const k = (lt * 2 + i * 0.1) % 1; s.position.set(O.vault.x + 0.7 + k * 0.6 * Math.cos(i), 1.8 + k * 1.3 * Math.sin(i * 1.7 + 1), O.vault.z - 9.6 + Math.cos(i * 2.3) * 0.7); s.scale.setScalar(Math.sin(k * Math.PI) * 0.9); }); });
add(S('s14', 0.5), S('s15', 0), 'vault', { p: [0.6, 2.4, -3.4], l: [0.2, 1.3, -9.6], f: 40 }, { p: [0.4, 2.0, -4.6], l: [0.2, 1.3, -9.6], f: 34 }, (u, lt) => { warm.position.set(O.vault.x - 1, 6, O.vault.z - 8); warm.intensity = 40;
  wheelA.position.set(O.vault.x - 0.5, 1.0, O.vault.z - 9.6); wheelA.scale.setScalar(0.68); wheelA.rotation.set(0, 0.5 + 0.2 * Math.sin(lt), 0);
  insp[0].position.set(O.vault.x + 0.9, 0, O.vault.z - 9.6); insp[0].rotation.y = -0.9; pose(insp[0], { arms: [-1.3, 0], face: 'smile' }); });
// === s15  Prüfer klopfen
add(S('s15', 0), S('s15', 0.55), 'vault', { p: [0.6, 2.5, -2.8], l: [0.2, 1.2, -9.6], f: 46 }, { p: [0.5, 2.3, -3.8], l: [0.2, 1.2, -9.6], f: 42 }, (u, lt) => { warm.position.set(O.vault.x - 1, 6, O.vault.z - 8); warm.intensity = 40;
  wheelA.position.set(O.vault.x - 0.5, 1.0, O.vault.z - 9.6); wheelA.scale.setScalar(0.68);
  const hit = Math.abs(Math.sin(lt * 7));
  insp[0].position.set(O.vault.x + 0.9, 0, O.vault.z - 9.6); insp[0].rotation.y = -1.5; pose(insp[0], { arms: [-0.2, -1.5 + hit * 0.9], face: 'smile', look: 0.4 });
  hammer.position.set(O.vault.x + 0.2, 2.2 - hit * 0.3, O.vault.z - 9.6); hammer.rotation.z = 0.9; });
add(S('s15', 0.55), S('s16', 0), 'vault', { p: [0.8, 2.4, -3.8], l: [0.2, 1.4, -9.6], f: 40 }, { p: [0.6, 2.2, -4.8], l: [0.2, 1.4, -9.6], f: 34 }, (u, lt) => { warm.position.set(O.vault.x - 1, 6, O.vault.z - 8); warm.intensity = 40;
  wheelA.position.set(O.vault.x - 0.5, 1.0, O.vault.z - 9.6); wheelA.scale.setScalar(0.68);
  insp[0].position.set(O.vault.x + 0.9, 0, O.vault.z - 9.6); insp[0].rotation.y = -1.57; pose(insp[0], { arms: [-1.5, 0], face: 'shock', nod: 0.3, look: 0.5, tilt: 0.25 }); });
// === s16  Wert steigt mit der Zeit
add(S('s16', 0), S('s17', 0), 'bank', { p: [-6, 3.0, 6.5], l: [-3, 1.8, 0], f: 48 }, { p: [-1.5, 3.2, 6], l: [-3, 2.0, 0], f: 44 }, (u, lt) => {
  pedestal.position.set(-3, 0, 0); wheelA.position.set(-3, 1.55, 0); wheelA.rotation.set(0, lt * 1.0, 0); wheelA.scale.setScalar(1 + 0.18 * u);
  coins.forEach((c, i) => { const k = clamp((u * 1.4 - i * 0.03) / 0.4); c.position.set(-3 + (i % 4 - 1.5) * 0.55, 3.2 + Math.floor(i / 4) * 0.35 * k, 0.5); c.scale.setScalar(k > 0 ? 0.9 : 0.001); c.rotation.set(0, lt * 3 + i, 0); });
  glowSprite.position.set(-3, 2.0, -1.2); glowSprite.scale.setScalar(0.6 + 0.6 * u); });
// === s17  Verkauf, Rückzahlung, Gewinn
add(S('s17', 0), S('s17', 0.36), 'bank', { p: [-2, 2.6, 2.5], l: [-3, 1.8, -3.5], f: 42 }, { p: [-1.2, 2.5, 1.5], l: [-3, 1.8, -3.5], f: 38 }, (u, lt) => {
  maker.position.set(-2.4, 0, -3); maker.rotation.y = 0.35; pose(maker, { arms: [-1.0, -1.0], face: 'happy', bob: Math.abs(Math.sin(lt * 6)) * 0.08 });
  sold.position.set(-1.8, 3.7, -3.6); sold.scale.setScalar(bounce(u, 0.3) * 1.1); sold.rotation.z = -0.15;
  wheelA.position.set(-4.3, 1.1, -3.2); wheelA.scale.setScalar(0.7); });
add(S('s17', 0.36), S('s17', 0.7), 'bank', { p: [1.8, 2.7, 0.5], l: [3, 2.0, -5], f: 42 }, { p: [2.4, 2.7, -0.6], l: [3, 2.0, -5], f: 36 }, (u, lt) => {
  placeBanker(4.2, -5.8); pose(banker, { arms: [-1.3, -1.3], face: 'happy' }); maker.position.set(1.4, 0, -3.3); maker.rotation.y = 0.6; pose(maker, { arms: [-1.3, -1.3], face: 'smile' });
  const bx = lerp(1.4, 3.0, ease(u)); bag.position.set(bx, 1.3, lerp(-3.4, -4.1, ease(u))); bag.scale.setScalar(1.0); });
add(S('s17', 0.7), S('s18', 0), 'bank', { p: [-3, 3.0, 4.5], l: [-3, 2.0, -1], f: 46 }, { p: [-3, 2.8, 3.2], l: [-3, 2.2, -1], f: 42 }, (u, lt) => {
  maker.position.set(-3, 0, -1); maker.rotation.y = 0.0; pose(maker, { arms: [-2.6 + Math.abs(Math.sin(lt * 7)) * 0.5, -2.6 + Math.abs(Math.cos(lt * 7)) * 0.5], face: 'happy', bob: Math.abs(Math.sin(lt * 7)) * 0.35 });
  coins.forEach((c, i) => { const k = ((lt * 0.9 + i * 0.07) % 1); c.position.set(-3 + Math.sin(i * 2.1) * 2.2, 5.5 - k * 5, -1 + Math.cos(i * 1.3) * 1.2); c.rotation.set(k * 9, k * 6, 0); c.scale.setScalar(0.85); }); });
// === s18  Er kann nicht zahlen -> Bank verkauft
add(S('s18', 0), S('s18', 0.5), 'bank', { p: [-1.5, 2.6, 3.5], l: [-2, 2, -3.5], f: 44 }, { p: [-1.5, 2.5, 2.5], l: [-2, 2, -3.5], f: 38 }, (u, lt) => {
  maker.position.set(-2, 0, -3.5); maker.rotation.y = 0.2; pose(maker, { arms: [0.2, 0.2], out: 0.55, face: 'sad', nod: 0.2 });
  drops.forEach((d, i) => { const k = (lt * 1.5 + i * 0.33) % 1; d.position.set(-2.6 + i * 0.4, 4.0 - k * 1.5, -2.6); }); });
add(S('s18', 0.5), S('s19', 0), 'bank', { p: [5.8, 2.9, -0.8], l: [3.5, 2.0, -5], f: 40 }, { p: [4.8, 2.8, -1.8], l: [3.5, 2.0, -5], f: 34 }, (u, lt) => {
  placeBanker(4.0, -5.8); const hit = clamp((u - 0.35) / 0.15); pose(banker, { arms: [-1.0 - 0.6 * (1 - hit) , 0], face: u > 0.5 ? 'happy' : 'smile' });
  wheelA.position.set(1.8, 2.0, -4.6); wheelA.scale.setScalar(0.8);
  sold.position.set(1.8, 2.0 + 0.0 + (1 - hit) * 1.3, -3.7); sold.scale.setScalar(u > 0.35 ? 1.2 : 0.001); });
// === s19  Finale
add(S('s19', 0), TOTAL, 'bank', { p: [-6, 3.0, 7], l: [-3, 2.2, 0], f: 46 }, { p: [-3, 3.6, 12], l: [-3, 2.4, 0], f: 52 }, (u, lt) => {
  pedestal.position.set(-3, 0, 0); wheelA.position.set(-3, 1.6, 0); wheelA.rotation.set(0, lt * 0.9, 0); wheelA.scale.setScalar(1.25);
  glowSprite.position.set(-3, 2.2, -1.2); glowSprite.scale.setScalar(1.3 + 0.2 * Math.sin(lt * 3));
  placeBanker(-1.0, 0.2, -0.5); pose(banker, { arms: [-1.4, -1.4], face: 'happy', bob: Math.sin(lt * 3) * 0.04 });
  maker.position.set(-5.3, 0, 0.2); maker.rotation.y = 0.55; pose(maker, { arms: [-1.4, -1.4], face: 'happy', bob: Math.sin(lt * 3 + 1) * 0.04 });
  sparks.forEach((s, i) => { const a = lt * 1.2 + i * 0.52, r = 3 + (i % 3) * 0.5; s.position.set(-3 + Math.cos(a) * r, 1.0 + (i % 6) * 0.7 + Math.sin(lt * 3 + i) * 0.2, Math.sin(a) * r); s.scale.setScalar(0.8 + 0.5 * Math.sin(lt * 5 + i)); }); });

// ---- Untertitel (ein Wort pro Bild)
const cap = document.getElementById('cap');
const words = TL.segs.flatMap(s => s.words);
function setCaption(t) {
  let w = null;
  for (let i = 0; i < words.length; i++) { if (t >= words[i].a - 0.02 && (i === words.length - 1 || t < words[i + 1].a - 0.02)) { w = words[i]; break; } }
  if (!w || t > w.b + 0.45) { cap.style.opacity = 0; return; }
  const k = clamp((t - w.a) / 0.09);
  const txt = w.w.replace(/[.,?!]+$/, '').toUpperCase() + (/[?]$/.test(w.w) ? '?' : ''); cap.textContent = txt; cap.style.fontSize = Math.max(96, Math.min(150, 900 / (txt.length * 0.64))) + 'px';
  cap.style.opacity = 1; cap.style.transform = `translate(-50%,-50%) scale(${1.18 - 0.18 * ease(k)})`;
}

function sunFollow(p) {
  sun.position.set(p.x + 9, p.y + 14, p.z + 8); sun.target.position.copy(p); sun.target.updateMatrixWorld();
  const c = sun.shadow.camera; c.left = -16; c.right = 16; c.top = 16; c.bottom = -16; c.near = 1; c.far = 60; c.updateProjectionMatrix();
}

window.renderAt = (t) => {
  hide(); warm.intensity = 0; hemi.intensity = 1.35;
  bank.door.rotation.y = 0; bank.hub.rotation.z = 0; dairy.pages.forEach(p => p.rotation.x = 0); dairy.bills.forEach(b => b.scale.setScalar(0.001));
  dairy.hM.rotation.z = 0; dairy.hH.rotation.z = 0; dairy.stick.rotation.set(0, 0, 0); maker.userData.beard.scale.set(0.001, 0.001, 0.001); maker.userData.beard.position.set(0, -0.34, 0.45);
  const sh = shots.find(s => t >= s.t0 && t < s.t1) || shots[shots.length - 1];
  const u = clamp((t - sh.t0) / Math.max(0.001, sh.t1 - sh.t0)), lt = t - sh.t0;
  sh.run(u, lt + sh.t0 * 0, t);
  // Hintergrundfarbe pro Set
  scene.background.set(sh.set === 'vault' ? 0xE99A4A : sh.set === 'dairy' ? 0xE8C79A : 0xF0C493);
  hemi.color.set(sh.set === 'vault' ? 0xffd9a8 : 0xfff2e0); hemi.intensity = sh.set === 'vault' ? 1.1 : 1.35;
  const look = camKeys(O[sh.set], sh.a, sh.b, u, sh.set === 'vault' && sh.t1 - sh.t0 > 1 ? false : true);
  sunFollow(new THREE.Vector3(look[0], look[1], look[2]));
  glowSprite.quaternion.copy(camera.quaternion);
  renderer.render(scene, camera);
  setCaption(t);
  document.getElementById('fade').style.opacity = t > TOTAL - 0.6 ? clamp((t - (TOTAL - 0.6)) / 0.5) : (t < 0.15 ? 1 - t / 0.15 : 0);
  return true;
};
window.TOTAL = TOTAL; window.READY = true;
