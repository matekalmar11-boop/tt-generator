// Toon-Material, Konturen, Texturen und Figuren-Baukasten (three.js)
import * as THREE from 'three';

export const OUT = 0x14110f;
const grad = (() => {
  const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 215, 215, 215, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();

export function toon(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: grad, ...opts });
}

const outlineCache = new Map();
function outlineMat(th) {
  const k = th.toFixed(4);
  if (!outlineCache.has(k)) {
    const m = new THREE.MeshBasicMaterial({ color: OUT, side: THREE.BackSide });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.th = { value: th };
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'uniform float th;\nvoid main() {')
        .replace('#include <begin_vertex>', 'vec3 transformed = position + normalize(normal) * th;');
    };
    m.customProgramCacheKey = () => 'outline' + k;
    outlineCache.set(k, m);
  }
  return outlineCache.get(k);
}

export function mesh(geo, mat, o = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = o.shadow !== false; m.receiveShadow = o.receive !== false;
  const th = o.outline === undefined ? 0.03 : o.outline;
  if (th > 0) { const ol = new THREE.Mesh(geo, outlineMat(th)); ol.userData.outline = true; m.add(ol); }
  return m;
}

export function put(m, x = 0, y = 0, z = 0, parent) { m.position.set(x, y, z); if (parent) parent.add(m); return m; }

export function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// ---- Parmesan-Laib ----
let cheeseSide = null;
export function cheeseTextures() {
  if (cheeseSide) return cheeseSide;
  const side = canvasTex(1024, 256, (g, w, h) => {
    g.fillStyle = '#E39A32'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#F0B04A'; g.fillRect(0, 0, w, 36); g.fillRect(0, h - 36, w, 36);
    g.fillStyle = '#7A4210'; g.font = '900 46px Inter Display, Arial Black, sans-serif'; g.textAlign = 'left';
    g.fillText('PARMIGIANO REGGIANO', 20, 100); g.fillText('PARMIGIANO REGGIANO', 380, 176);
    g.fillStyle = '#A55F1C';
    for (let x = 0; x < w; x += 14) { g.beginPath(); g.arc(x, 18, 3.5, 0, 7); g.arc(x, h - 18, 3.5, 0, 7); g.fill(); }
  });
  side.wrapS = THREE.RepeatWrapping; side.repeat.set(2, 1); cheeseSide = side; return side;
}

export function makeCheese(r = 1, h = 0.75, o = {}) {
  const g = new THREE.Group();
  const side = toon(0xffffff, { map: cheeseTextures() });
  const cap = toon(0xF2B552);
  const body = mesh(new THREE.CylinderGeometry(r, r, h, 48, 1), [side, cap, cap], { outline: 0.03 * r + 0.012 });
  g.add(body); g.userData.body = body;
  return g;
}

// ---- Gesichter ----
const faceCache = {};
export function faceTex(kind, glasses) {
  const k = kind + glasses;
  if (faceCache[k]) return faceCache[k];
  const t = canvasTex(512, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.lineCap = 'round'; g.strokeStyle = '#17120f'; g.fillStyle = '#17120f';
    const ey = 150, ex = 88;
    const eye = (x) => {
      if (kind === 'happy') { g.lineWidth = 9; g.beginPath(); g.arc(x, ey + 8, 20, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (kind === 'shock') { g.beginPath(); g.arc(x, ey, 19, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 5, ey - 6, 6, 0, 7); g.fill(); g.fillStyle = '#17120f'; }
      else if (kind === 'sad') { g.beginPath(); g.ellipse(x, ey + 4, 10, 15, 0, 0, 7); g.fill(); }
      else { g.beginPath(); g.ellipse(x, ey, 10, 15, 0, 0, 7); g.fill(); }
    };
    eye(w / 2 - ex); eye(w / 2 + ex);
    if (glasses) {
      g.lineWidth = 10; g.beginPath(); g.arc(w / 2 - ex, ey, 56, 0, 7); g.stroke(); g.beginPath(); g.arc(w / 2 + ex, ey, 56, 0, 7); g.stroke();
      g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2 - ex + 56, ey - 6); g.lineTo(w / 2 + ex - 56, ey - 6); g.stroke();
    }
    if (kind !== 'shock') { g.lineWidth = 8; g.beginPath(); g.moveTo(w / 2 - ex - 20, ey - 78); g.lineTo(w / 2 - ex + 20, ey - 86 - (kind === 'sad' ? -12 : 0)); g.stroke(); g.beginPath(); g.moveTo(w / 2 + ex - 20, ey - 86 - (kind === 'sad' ? -12 : 0)); g.lineTo(w / 2 + ex + 20, ey - 78); g.stroke(); }
    g.lineWidth = 9;
    const my = 262;
    if (kind === 'smile' || kind === 'happy') { g.beginPath(); g.arc(w / 2, my - 18, 36, 0.25, Math.PI - 0.25); g.stroke(); }
    else if (kind === 'open') { g.fillStyle = '#5b1e12'; g.beginPath(); g.ellipse(w / 2, my, 34, 28, 0, 0, 7); g.fill(); g.fillStyle = '#e57a6a'; g.beginPath(); g.ellipse(w / 2, my + 14, 20, 10, 0, 0, 7); g.fill(); }
    else if (kind === 'shock') { g.fillStyle = '#5b1e12'; g.beginPath(); g.ellipse(w / 2, my + 4, 20, 28, 0, 0, 7); g.fill(); }
    else if (kind === 'sad') { g.beginPath(); g.arc(w / 2, my + 40, 34, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); }
    else { g.beginPath(); g.moveTo(w / 2 - 28, my); g.lineTo(w / 2 + 28, my); g.stroke(); }
  });
  faceCache[k] = t; return t;
}

// ---- Figur ----
export function makeChar(o) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const skin = toon(o.skin || 0xF0A468);
  const suit = toon(o.suit || 0x1d3a78);
  const shoeM = toon(0x1c1612);
  const torso = mesh(new THREE.CapsuleGeometry(0.38, 0.5, 8, 20), suit);
  put(torso, 0, 1.0, 0, body); torso.scale.set(1, 1, 0.82);
  if (o.shirt) { const sh = mesh(new THREE.BoxGeometry(0.34, 0.62, 0.04), toon(o.shirt), { outline: 0.012 }); put(sh, 0, 1.08, 0.33, body); }
  if (o.tie) { const t1 = mesh(new THREE.BoxGeometry(0.11, 0.42, 0.04), toon(o.tie), { outline: 0.012 }); put(t1, 0, 1.0, 0.355, body);
    const t2 = mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), toon(o.tie), { outline: 0.012 }); put(t2, 0, 1.28, 0.355, body); }
  if (o.apron) { const ap = mesh(new THREE.BoxGeometry(0.64, 0.72, 0.05), toon(0xf4f0e6), { outline: 0.015 }); put(ap, 0, 0.95, 0.33, body); }
  // Kopf
  const head = new THREE.Group(); put(head, 0, 1.72, 0, body);
  const skull = mesh(new THREE.SphereGeometry(0.55, 32, 24), skin, { outline: 0.035 }); skull.scale.set(1, 0.96, 0.96); head.add(skull);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.75), new THREE.MeshBasicMaterial({ map: faceTex('smile', !!o.glasses), transparent: true, depthWrite: false }));
  face.position.set(0, -0.02, 0.527); face.scale.set(1, 1, 1); head.add(face);
  for (const s of [-1, 1]) { const ear = mesh(new THREE.SphereGeometry(0.1, 12, 10), skin, { outline: 0.02 }); put(ear, 0.55 * s, 0, 0, head); }
  if (o.hair) { const hair = mesh(new THREE.SphereGeometry(0.575, 28, 16, 0, Math.PI * 2, 0, 1.18), toon(o.hair), { outline: 0.03 }); hair.rotation.x = -0.35; head.add(hair); }
  if (o.cap) {
    const dome = mesh(new THREE.SphereGeometry(0.58, 28, 14, 0, Math.PI * 2, 0, 1.12), toon(o.cap), { outline: 0.03 }); dome.rotation.x = -0.12; dome.position.y = 0.04; head.add(dome);
    const brim = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.05, 24), toon(o.cap), { outline: 0.02 }); brim.scale.set(1.1, 1, 0.9); put(brim, 0, 0.3, 0.52, head);
  }
  if (o.beard) { const bd = mesh(new THREE.SphereGeometry(0.4, 20, 14), toon(0xf1efe8), { outline: 0.025 }); bd.scale.set(1, 0.1, 0.5); put(bd, 0, -0.34, 0.45, head); root.userData.beard = bd; }
  if (o.mustache) { const mu = mesh(new THREE.CapsuleGeometry(0.06, 0.34, 6, 10), toon(0x35281d), { outline: 0.015 }); mu.rotation.z = Math.PI / 2; put(mu, 0, -0.2, 0.55, head); }
  // Arme
  const arms = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); put(piv, 0.46 * s, 1.35, 0, body);
    const up = mesh(new THREE.CapsuleGeometry(0.105, 0.42, 6, 12), o.coat ? toon(o.coat) : suit, { outline: 0.022 }); put(up, 0, -0.3, 0, piv);
    const hand = mesh(new THREE.SphereGeometry(0.135, 14, 12), skin, { outline: 0.025 }); put(hand, 0, -0.68, 0, piv);
    piv.userData.hand = hand; arms.push(piv);
  }
  // Beine
  const legs = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group(); put(piv, 0.19 * s, 0.55, 0, body);
    const leg = mesh(new THREE.CapsuleGeometry(0.12, 0.22, 6, 12), o.pants ? toon(o.pants) : suit, { outline: 0.022 }); put(leg, 0, -0.22, 0, piv);
    const shoe = mesh(new THREE.SphereGeometry(0.17, 14, 10), shoeM, { outline: 0.022 }); shoe.scale.set(1, 0.6, 1.5); put(shoe, 0, -0.47, 0.08, piv);
    legs.push(piv);
  }
  root.userData = { ...root.userData, body, head, face, arms, legs, glasses: !!o.glasses, kind: 'smile' };
  return root;
}

export function setFace(ch, kind) {
  const u = ch.userData; if (u.kind === kind) return; u.kind = kind;
  u.face.material.map = faceTex(kind, u.glasses); u.face.material.needsUpdate = true;
}

// Animationen: walk = Phase (oder null), talk = Zeit (oder null), arms = [Winkel links, rechts] (rad nach vorn)
export function pose(ch, p = {}) {
  const u = ch.userData;
  const w = p.walk;
  const sw = w == null ? 0 : Math.sin(w) * 0.7;
  u.legs[0].rotation.x = sw; u.legs[1].rotation.x = -sw;
  const a0 = p.arms ? p.arms[0] : 0, a1 = p.arms ? p.arms[1] : 0;
  u.arms[0].rotation.x = (w == null ? 0 : -sw * 0.8) + a0; u.arms[1].rotation.x = (w == null ? 0 : sw * 0.8) + a1;
  u.arms[0].rotation.z = -0.12 - (p.out || 0); u.arms[1].rotation.z = 0.12 + (p.out || 0);
  u.body.position.y = w == null ? (p.bob || 0) : Math.abs(Math.sin(w)) * 0.07 + (p.bob || 0);
  u.body.rotation.x = p.lean || 0;
  u.head.rotation.y = p.look || 0; u.head.rotation.z = p.tilt || 0; u.head.rotation.x = p.nod || 0;
  if (p.talk != null) setFace(ch, (Math.floor(p.talk * 7) % 2 === 0) ? 'open' : (p.face || 'smile'));
  else setFace(ch, p.face || 'smile');
}
