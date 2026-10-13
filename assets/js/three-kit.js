/* ShoePartner — kit 3D.
   Tout est procédural : aucun modèle à télécharger, aucune image externe.
   Les textures (grain du cuir, enroulement du fil, carton kraft…) sont
   dessinées dans des <canvas> au chargement.

   Repère : x = latéral, y = vers le haut, z = du talon (−) à la pointe (+). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

export const PAL = {
  marine: 0x132A46, or: 0xC59D53, creme: 0xF5F1E8, kraft: 0xC8A87C,
};

/* ---------------------------------------------------------------- outils */
function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
function cnv(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function toTex(c, { color = true, rep = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep[0], rep[1]);
  t.anisotropy = 4;
  return t;
}
const hex = (n) => '#' + new THREE.Color(n).getHexString();
function shade(n, k) {          // k > 0 éclaircit, k < 0 assombrit
  const c = new THREE.Color(n);
  return k >= 0 ? c.lerp(new THREE.Color(0xffffff), k) : c.multiplyScalar(1 + k);
}

/* Taches douces : la variation de teinte d'une vraie peau */
function mottle(g, w, h, seed, amt = 0.07) {
  const r = rng(seed);
  for (let i = 0; i < 70; i++) {
    const x = r() * w, y = r() * h, rad = 20 + r() * w * 0.18;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.5;
    gr.addColorStop(0, dark ? `rgba(0,0,0,${amt})` : `rgba(255,255,255,${amt * 0.7})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
}

/* ------------------------------------------------- textures partagées */
const cache = {};
export function grainTex() {            // grain « pleine fleur », carte de relief
  if (cache.grain) return cache.grain;
  const [c, g] = cnv(512, 512); const r = rng(7);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const x = r() * 512, y = r() * 512, rad = 1.2 + r() * 3.2, v = 95 + (r() * 70) | 0;
    g.fillStyle = `rgba(${v},${v},${v},.55)`;
    g.beginPath(); g.ellipse(x, y, rad, rad * (0.6 + r() * 0.5), r() * 3, 0, 7); g.fill();
  }
  return (cache.grain = toTex(c, { color: false, rep: [5, 5] }));
}
function threadTex() {                   // spires de fil sur la bobine
  if (cache.thread) return cache.thread;
  const [c, g] = cnv(64, 512);
  for (let y = 0; y < 512; y += 4) {
    const v = 175 + ((y / 4) % 2) * 50;
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(0, y, 64, 3);
    g.fillStyle = 'rgb(120,120,120)'; g.fillRect(0, y + 3, 64, 1);
  }
  return (cache.thread = toTex(c, { rep: [1, 1] }));
}
function weaveTex() {                    // trame de tissu (doublures)
  if (cache.weave) return cache.weave;
  const [c, g] = cnv(256, 256);
  g.fillStyle = '#d9d9d9'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(i, 0, 2, 256);
    g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, i, 256, 2);
  }
  return (cache.weave = toTex(c, { rep: [6, 3] }));
}
function poresTex() {                    // alvéoles de mousse
  if (cache.pores) return cache.pores;
  const [c, g] = cnv(256, 256); const r = rng(3);
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.16})`;
    g.beginPath(); g.arc(r() * 256, r() * 256, 0.8 + r() * 2.4, 0, 7); g.fill();
  }
  return (cache.pores = toTex(c, { rep: [3, 2] }));
}
function kraftTex() {                    // fibres du carton
  if (cache.kraft) return cache.kraft;
  const [c, g] = cnv(256, 256); const r = rng(11);
  g.fillStyle = hex(PAL.kraft); g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.strokeStyle = `rgba(${r() < .5 ? '90,60,30' : '255,240,210'},${0.06 + r() * 0.1})`;
    g.lineWidth = 0.6 + r();
    const x = r() * 256, y = r() * 256, a = r() * 6.28, l = 3 + r() * 12;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return (cache.kraft = toTex(c, { rep: [1, 1] }));
}
export function shadowTex() {            // ombre de contact, dégradé radial
  if (cache.shadow) return cache.shadow;
  const [c, g] = cnv(256, 256);
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.45, 'rgba(0,0,0,.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); return (cache.shadow = t);
}
export function contactShadow(w = 3, d = 2, opacity = 0.5) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, depthWrite: false, opacity }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = -1;
  return m;
}

const MARK_URL = new URL('../logo/shoepartner-marque-fond-fonce.svg', import.meta.url).href;
let markImg = null;
function withMark(cb) {                  // dessine la marque dès qu'elle est chargée
  if (!markImg) { markImg = new Image(); markImg.src = MARK_URL; }
  if (markImg.complete && markImg.naturalWidth) cb(markImg);
  else markImg.addEventListener('load', () => cb(markImg), { once: true });
}

/* ------------------------------------------------------- matériaux */
export const metal = (color = 0xC9A55A, rough = 0.28) =>
  new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough });

export function leatherMat(color, { rough = 0.55, sheen = 0.2 } = {}) {
  const [c, g] = cnv(512, 512);
  g.fillStyle = hex(color); g.fillRect(0, 0, 512, 512);
  mottle(g, 512, 512, color & 255, 0.09);
  return new THREE.MeshPhysicalMaterial({
    map: toTex(c, { rep: [1, 1] }), bumpMap: grainTex(), bumpScale: 1.4,
    roughness: rough, clearcoat: sheen, clearcoatRoughness: 0.55, side: THREE.DoubleSide,
  });
}

/* ================================================================
   1. LA FORME — tracé de semelle partagé par la semelle et la tige
   ================================================================ */
const PROF = [[0, 0], [0.012, 0.4], [0.04, 0.63], [0.1, 0.77], [0.22, 0.79], [0.4, 0.7],
  [0.58, 0.93], [0.7, 1], [0.82, 0.96], [0.92, 0.76], [0.97, 0.5], [0.993, 0.2], [1, 0]];

function cr(tab, u) {                    // Catmull-Rom 1D sur abscisses non uniformes
  u = Math.min(1, Math.max(0, u));
  let i = 0; while (i < tab.length - 2 && u > tab[i + 1][0]) i++;
  const p0 = tab[Math.max(0, i - 1)], p1 = tab[i], p2 = tab[i + 1], p3 = tab[Math.min(tab.length - 1, i + 2)];
  const span = p2[0] - p1[0] || 1, t = (u - p1[0]) / span;
  const m1 = (p2[1] - p0[1]) / ((p2[0] - p0[0]) || 1) * span;
  const m2 = (p3[1] - p1[1]) / ((p3[0] - p1[0]) || 1) * span;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1[1] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[1] + (t3 - t2) * m2;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function makeLast({ L = 2.6, W = 0.92, spring = 0.13, heel = 0 } = {}) {
  return {
    L, W, heel,
    half: (u) => Math.max(0, cr(PROF, u)) * W / 2,
    cx: (u) => W * 0.07 * u * u - W * 0.02,
    z: (u) => (u - 0.5) * L,
    /* cambrure : le talon est porté par le bloc talon, la pointe remonte */
    lift: (u) => heel * (1 - smooth(0.28, 0.56, u)) + (u > 0.74 ? spring * Math.pow((u - 0.74) / 0.26, 2) : 0),
  };
}

function outlinePts(last, n, u0 = 0, u1 = 1, grow = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n; pts.push([u, last.cx(u) + last.half(u) + grow]); }
  for (let i = n - (u1 < 1 ? 0 : 1); i >= (u0 > 0 ? 0 : 1); i--) { const u = u0 + (u1 - u0) * i / n; pts.push([u, last.cx(u) - last.half(u) - grow]); }
  return pts;
}

/* semelle extrudée, déformée par la cambrure */
export function soleGeo(last, thick, bevel = 0.03) {
  const pts = outlinePts(last, 150).map(([u, x]) => new THREE.Vector2(x, -last.z(u)));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: thick, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4,
  });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getZ(i) / last.L + 0.5;
    p.setY(i, p.getY(i) + bevel + last.lift(u));
  }
  g.computeVertexNormals();
  return g;
}
function heelGeo(last, h) {
  const pts = outlinePts(last, 40, 0, 0.27, -0.01).map(([u, x]) => new THREE.Vector2(x, -last.z(u)));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
    depth: h, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2,
  });
  g.rotateX(-Math.PI / 2); g.translate(0, 0.015, 0);
  return g;
}

/* ================================================================
   2. LA CHAUSSURE — tige paramétrique, doublure, col rembourré, laçage
   ================================================================ */
export const MODELS = {
  derby:    { heelH: 0.9,  instep: 0.7,  toe: 0.4,  sole: 0.1,  heel: 0.17, laces: true,  collar: [0.2, 0.2, 0.23], lace: [0.4, 0.6, 0.1], captoe: false, welt: true,  soleColor: 0x2a211c },
  mocassin: { heelH: 0.7,  instep: 0.56, toe: 0.38, sole: 0.09, heel: 0.09, laces: false, collar: [0.26, 0.26, 0.25], moc: true, strap: true, welt: true, soleColor: 0x5a3a24 },
  securite: { heelH: 1.32, instep: 0.92, toe: 0.54, sole: 0.25, heel: 0,    laces: true,  collar: [0.15, 0.15, 0.21], lace: [0.28, 0.6, 0.11], captoe: true, welt: false, soleColor: 0x1c1c1c, cleat: true },
  sabot:    { heelH: 0.66, instep: 0.6,  toe: 0.42, sole: 0.26, heel: 0.1,  laces: false, collar: [0.2, 0.2, 0.2], mask: 'sabot', welt: false, soleColor: 0xC9A577, footbed: 0xB98A55 },
  sandale:  { heelH: 0.6,  instep: 0.5,  toe: 0.34, sole: 0.11, heel: 0.07, laces: false, collar: [0.2, 0.2, 0.2], mask: 'sandale', welt: true, soleColor: 0x5a3a24, footbed: 0xC9A27A },
  confort:  { heelH: 0.88, instep: 0.74, toe: 0.46, sole: 0.22, heel: 0,    laces: false, collar: [0.2, 0.21, 0.2], straps: true, welt: false, soleColor: 0xEDE7DA },
};
export const COLORS = {
  noir:     { c: 0x1d1c1e, thread: 0xC59D53 },
  cognac:   { c: 0x8a4a22, thread: 0xF1DDB5 },
  marine:   { c: 0x172f50, thread: 0xC59D53 },
  bordeaux: { c: 0x5a1a24, thread: 0xE9D3B0 },
  blanc:    { c: 0xE9E4DA, thread: 0xB8A27A },
};

function heightFn(m) {
  const tab = [[0, m.heelH * 0.94], [0.07, m.heelH], [0.3, m.heelH * 0.92], [0.52, m.instep],
    [0.74, m.toe * 1.14], [0.88, m.toe], [0.965, m.toe * 0.72], [1, m.toe * 0.42]];
  return (u) => cr(tab, u);
}

/* surface de la tige : u le long du pied, v d'un flanc à l'autre par-dessus */
function upperFn(last, m) {
  const H = heightFn(m);
  return (u, v, out = new THREE.Vector3()) => {
    u = Math.min(1, Math.max(0, u));
    const th = v * Math.PI, s = Math.sin(th), c = Math.cos(th);
    const hw = last.half(u) * 0.965;
    return out.set(
      last.cx(u) - c * hw * (1 + 0.09 * s),
      m.sole + 0.05 + last.lift(u) + H(u) * Math.pow(s, 0.72),
      last.z(u),
    );
  };
}
function normalAt(P, u, v) {
  const e = 0.004, a = P(u, v), du = P(u + e, v).sub(P(u - e, v)), dv = P(u, v + e).sub(P(u, v - e));
  return du.cross(dv).normalize();
}

function upperGeo(P, nu = 120, nv = 60) {
  const pos = [], uv = [], idx = [], v3 = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const u = i / nu, v = j / nv; P(u, v, v3);
    pos.push(v3.x, v3.y, v3.z); uv.push(u, v);
  }
  const row = nv + 1;
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = (i + 1) * row + j, c = a + 1, d = b + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/* carte couleur de la tige : teinte, coutures, empiècements */
const TW = 1024, TH = 512;
const tx = (u) => u * TW, ty = (v) => (1 - v) * TH;
function upperMaps(m, col) {
  const [c, g] = cnv(TW, TH);
  g.fillStyle = hex(col.c); g.fillRect(0, 0, TW, TH);
  mottle(g, TW, TH, 5, 0.08);
  const thread = hex(col.thread), seam = hex(shade(col.c, -0.45));
  const stitch = (draw, w = 3) => {
    g.save(); g.lineCap = 'round';
    g.strokeStyle = seam; g.lineWidth = 2.2; g.setLineDash([]); g.beginPath(); draw(0); g.stroke();
    g.strokeStyle = thread; g.lineWidth = w; g.setLineDash([9, 8]); g.beginPath(); draw(7); g.stroke();
    g.restore();
  };
  const [cu, ru, rv] = m.collar;

  if (m.captoe) {          // embout renforcé, plus sombre
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(tx(0.79), 0, TW, TH);
    stitch((o) => { g.moveTo(tx(0.79) - o, 0); g.lineTo(tx(0.79) - o, TH); });
  }
  if (m.laces) {            // derby : quartiers cousus sur l'empeigne
    const [la, lb, lw] = m.lace;
    for (const sgn of [1, -1]) stitch((o) => {
      const p = (u, v) => [tx(u) - o, ty(0.5 + sgn * v)];
      g.moveTo(...p(la - 0.03, lw + 0.04));
      g.bezierCurveTo(...p(lb + 0.02, lw + 0.06), ...p(lb + 0.07, 0.3), ...p(lb + 0.02, 0.44));
    });
    g.fillStyle = 'rgba(0,0,0,.18)';      // ombre de la languette
    g.fillRect(tx(la - 0.02), ty(0.5 + lw * 0.6), tx(lb - la + 0.03), (lw * 1.2) * TH);
  }
  if (m.moc) {              // plateau cousu du mocassin
    for (const o of [0, 9]) {
      g.save(); g.strokeStyle = o ? thread : seam; g.lineWidth = o ? 3 : 4; g.setLineDash(o ? [9, 8] : []);
      g.beginPath(); g.ellipse(tx(0.8), ty(0.5), tx(0.21) - o, 0.27 * TH - o, 0, 0, Math.PI * 2); g.stroke(); g.restore();
    }
  }
  // couture du col
  g.save(); g.strokeStyle = thread; g.lineWidth = 3; g.setLineDash([9, 8]);
  g.beginPath(); g.ellipse(tx(cu), ty(0.5), tx(ru + 0.035), (rv + 0.05) * TH, 0, 0, Math.PI * 2); g.stroke(); g.restore();
  // contrefort
  stitch((o) => { g.moveTo(tx(0.17) + o, ty(0.06)); g.quadraticCurveTo(tx(0.2) + o, ty(0.22), tx(0.13) + o, ty(0.33)); });
  stitch((o) => { g.moveTo(tx(0.17) + o, ty(0.94)); g.quadraticCurveTo(tx(0.2) + o, ty(0.78), tx(0.13) + o, ty(0.67)); });
  // piqûre de montage, au ras de la semelle
  for (const v of [0.075, 0.925]) {
    g.save(); g.strokeStyle = thread; g.lineWidth = 3; g.setLineDash([9, 8]);
    g.beginPath(); g.moveTo(0, ty(v)); g.lineTo(TW, ty(v)); g.stroke(); g.restore();
  }
  // ouverture du col (alpha)
  const [a, ga] = cnv(TW, TH);
  ga.fillStyle = '#fff'; ga.fillRect(0, 0, TW, TH);
  if (m.mask) drawMask(m, ga);
  else { ga.fillStyle = '#000'; ga.beginPath(); ga.ellipse(tx(cu), ty(0.5), tx(ru), rv * TH, 0, 0, Math.PI * 2); ga.fill(); }
  const alpha = new THREE.CanvasTexture(a);
  return { map: toTex(c), alpha };
}

/* Modèles ouverts : la tige garde la même surface, seule la carte alpha change.
   sabot   — arrière entièrement ouvert, bord avant arrondi
   sandale — tout est découpé sauf quatre lanières */
const sabotEdge = (v) => 0.44 + 0.07 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.5) / 0.4, 2)));
const SANDAL = {
  across: [[0.66, 0.76], [0.44, 0.52]],          // lanières transversales (u0, u1), sur toute la largeur
  sides: [[0.2, 0.27], [0.73, 0.8]],             // bride arrière (v0, v1), de u = 0 à u = 0,47
  sideEnd: 0.47,
};
function drawMask(m, g) {
  if (m.mask === 'sabot') {
    g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, ty(0));
    for (let i = 0; i <= 60; i++) { const v = i / 60; g.lineTo(tx(sabotEdge(v)), ty(v)); }
    g.lineTo(0, ty(1)); g.closePath(); g.fill();
  } else if (m.mask === 'sandale') {
    g.fillStyle = '#000'; g.fillRect(0, 0, TW, TH);
    g.fillStyle = '#fff';
    for (const [u0, u1] of SANDAL.across) g.fillRect(tx(u0), 0, tx(u1 - u0), TH);
    for (const [v0, v1] of SANDAL.sides) g.fillRect(0, ty(v1), tx(SANDAL.sideEnd), (v1 - v0) * TH);
  }
}
function maskRims(m, P) {           // bords à épaissir (listes de points 3D)
  const rims = [], line = (f, n = 40) => { const pts = []; for (let i = 0; i <= n; i++) pts.push(f(i / n)); return pts; };
  if (m.mask === 'sabot') rims.push(line((t) => { const v = 0.005 + t * 0.99; return P(sabotEdge(v), v); }, 60));
  if (m.mask === 'sandale') {
    for (const [u0, u1] of SANDAL.across) for (const u of [u0, u1]) rims.push(line((t) => P(u, 0.004 + t * 0.992)));
    for (const [v0, v1] of SANDAL.sides) for (const v of [v0, v1]) rims.push(line((t) => P(0.004 + t * (SANDAL.sideEnd - 0.004), v)));
  }
  return rims;
}

function tube(points, r, mat, closed = false, seg = 64) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 10, closed), mat);
}

export function shoe(modelKey = 'derby', colorKey = 'cognac') {
  const m = MODELS[modelKey] || MODELS.derby, col = COLORS[colorKey] || COLORS.cognac;
  const last = makeLast({ heel: m.heel });
  const P = upperFn(last, m);
  const root = new THREE.Group(); root.name = 'shoe';
  const parts = { sole: new THREE.Group(), upper: new THREE.Group(), laces: new THREE.Group() };
  Object.values(parts).forEach((p) => root.add(p));

  /* semelle (+ talon, + crampons pour la sécurité) */
  const soleMat = new THREE.MeshStandardMaterial({ color: m.soleColor, roughness: m.soleColor > 0xd00000 ? 0.75 : 0.62 });
  const sole = new THREE.Mesh(soleGeo(last, m.sole, 0.035), soleMat);
  sole.position.y = m.heel > 0 ? 0 : 0; parts.sole.add(sole);
  if (m.heel > 0) parts.sole.add(new THREE.Mesh(heelGeo(last, m.heel), new THREE.MeshStandardMaterial({ color: shade(m.soleColor, -0.2), roughness: 0.7 })));
  if (m.cleat) {
    const cm = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.85 });
    for (let k = 0; k < 9; k++) {
      const u = 0.06 + k * 0.105, w = last.half(u) * 1.7;
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.07), cm);
      b.position.set(last.cx(u), last.lift(u) - 0.005, last.z(u)); parts.sole.add(b);
    }
    // bande jaune de la semelle de sécurité
    const band = new THREE.Mesh(soleGeo(makeLast({ heel: 0 }), 0.03, 0.04), new THREE.MeshStandardMaterial({ color: PAL.or, roughness: 0.5 }));
    band.position.y = m.sole - 0.01; parts.sole.add(band);
  }
  if (m.welt) {             // trépointe cousue
    const wp = [];
    for (let i = 0; i < 160; i++) {
      const t = i / 160, side = t < 0.5 ? 1 : -1, u = t < 0.5 ? t * 2 : 2 - t * 2;
      wp.push(new THREE.Vector3(last.cx(u) + side * (last.half(u) + 0.012), m.sole + 0.065 + last.lift(u), last.z(u)));
    }
    parts.sole.add(tube(wp, 0.022, new THREE.MeshStandardMaterial({ color: shade(col.c, -0.35), roughness: 0.6 }), true, 220));
  }

  /* tige : extérieur cuir + doublure claire, même géométrie */
  const geo = upperGeo(P);
  const maps = upperMaps(m, col);
  const outer = new THREE.MeshPhysicalMaterial({
    map: maps.map, alphaMap: maps.alpha, alphaTest: 0.5, bumpMap: grainTex(), bumpScale: 1.2,
    roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.45, side: THREE.FrontSide,
  });
  const inner = new THREE.MeshStandardMaterial({ color: 0xE6D6B8, roughness: 0.85, alphaMap: maps.alpha, alphaTest: 0.5, side: THREE.BackSide });
  parts.upper.add(new THREE.Mesh(geo, outer), new THREE.Mesh(geo, inner));

  /* col rembourré qui suit l'ouverture — ou bords des modèles ouverts */
  const rimMat = new THREE.MeshPhysicalMaterial({ color: shade(col.c, -0.15), roughness: 0.5, clearcoat: 0.3, bumpMap: grainTex(), bumpScale: 0.8 });
  if (m.mask) {
    for (const r of maskRims(m, P)) parts.upper.add(tube(r, m.mask === 'sabot' ? 0.03 : 0.014, rimMat, false, 80));
    if (m.mask === 'sandale') {        // petite boucle sur la bride
      const u = 0.32, v = (SANDAL.sides[1][0] + SANDAL.sides[1][1]) / 2, p = P(u, v), nn = normalAt(P, u, v);
      const b = buckle(0xC9A55A, 0.16, 0.13); b.scale.setScalar(1);
      b.position.copy(p).addScaledVector(nn, 0.02); b.lookAt(p.clone().addScaledVector(nn, 1)); parts.laces.add(b);
    }
  } else {
    const [cu, ru, rv] = m.collar, cp = [];
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2;
      cp.push(P(Math.max(0.004, cu + ru * Math.cos(a)), 0.5 + rv * Math.sin(a)));
    }
    parts.upper.add(tube(cp, 0.034, rimMat, true, 200));
  }
  // semelle de propreté visible par l'ouverture
  const insole = new THREE.Mesh(soleGeo(makeLast({ heel: m.heel, W: 0.86, L: 2.4 }), 0.02, 0.01), new THREE.MeshStandardMaterial({ color: m.footbed || 0xD9C3A0, roughness: 0.8, bumpMap: m.footbed ? grainTex() : null, bumpScale: 0.6 }));
  insole.position.y = m.sole + 0.04; parts.upper.add(insole);

  /* laçage : œillets métal + lacets croisés + nœud */
  if (m.laces) {
    const [la, lb, lw] = m.lace, n = 5, brass = metal(0xC9A55A, 0.3);
    const laceMat = new THREE.MeshStandardMaterial({ color: modelKey === 'securite' ? 0x1a1a1a : shade(col.c, -0.5), roughness: 0.75 });
    const L = [], R = [];
    for (let k = 0; k < n; k++) {
      const u = la + (lb - la) * k / (n - 1);
      for (const [arr, v] of [[L, 0.5 - lw], [R, 0.5 + lw]]) {
        const p = P(u, v), nn = normalAt(P, u, v);
        const ey = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.011, 8, 20), brass);
        ey.position.copy(p).addScaledVector(nn, 0.006); ey.lookAt(p.clone().add(nn));
        parts.laces.add(ey); arr.push({ p, nn });
      }
    }
    const lift = (a, b, h) => a.p.clone().lerp(b.p, 0.5).addScaledVector(a.nn.clone().add(b.nn).normalize(), h);
    for (let k = 0; k < n - 1; k++) {
      parts.laces.add(tube([L[k].p, lift(L[k], R[k + 1], 0.05), R[k + 1].p], 0.016, laceMat, false, 24));
      parts.laces.add(tube([R[k].p, lift(R[k], L[k + 1], 0.06), L[k + 1].p], 0.016, laceMat, false, 24));
    }
    // nœud au premier œillet (côté col)
    const knot = lift(L[0], R[0], 0.07), nn = L[0].nn.clone().add(R[0].nn).normalize();
    parts.laces.add(tube([L[0].p, knot, R[0].p], 0.016, laceMat, false, 24));
    for (const s of [-1, 1]) {
      const loop = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.015, 8, 28), laceMat);
      loop.position.copy(knot).add(new THREE.Vector3(s * 0.1, 0.01, -0.02)); loop.scale.set(1, 0.5, 1);
      loop.lookAt(loop.position.clone().add(nn)); loop.rotateZ(s * 0.3); parts.laces.add(loop);
      parts.laces.add(tube([knot, knot.clone().add(new THREE.Vector3(s * 0.06, -0.04, -0.12)), knot.clone().add(new THREE.Vector3(s * 0.1, -0.16, -0.16))], 0.014, laceMat, false, 16));
    }
  }
  if (m.strap) {            // barrette du mocassin
    const sp = []; for (let i = 0; i <= 24; i++) sp.push(P(0.47, 0.18 + 0.64 * i / 24).add(new THREE.Vector3(0, 0.012, 0)));
    const s = tube(sp, 0.03, new THREE.MeshPhysicalMaterial({ color: shade(col.c, -0.2), roughness: 0.45, clearcoat: 0.4 }), false, 40);
    s.scale.z = 1; parts.laces.add(s);
  }
  if (m.straps) {           // deux brides auto-agrippantes (gamme confort)
    const sm = new THREE.MeshPhysicalMaterial({ color: shade(col.c, -0.12), roughness: 0.5, clearcoat: 0.2 });
    for (const u of [0.42, 0.56]) {
      const sp = []; for (let i = 0; i <= 28; i++) {
        const v = 0.12 + 0.76 * i / 28;
        sp.push(P(u, v).addScaledVector(normalAt(P, u, v), 0.02));
      }
      const t = tube(sp, 0.05, sm, false, 48); t.scale.set(1, 1, 1); parts.laces.add(t);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), metal(0xD0D4DA, 0.25));
      const end = sp[sp.length - 1]; ring.position.copy(end); ring.lookAt(end.clone().add(normalAt(P, u, 0.88))); parts.laces.add(ring);
    }
  }

  // centrage : le milieu de la chaussure à l'origine, posée sur y = 0
  root.position.set(0, 0, 0);
  root.userData.parts = parts;
  root.userData.height = m.heelH + m.sole + 0.1;
  return root;
}

/* ================================================================
   3. LES MATIÈRES — une fonction par famille
   ================================================================ */

/* peau entière qui ondule (cuir naturel) */
function hideAlpha(seed) {
  const [c, g] = cnv(512, 400); const r = rng(seed);
  g.fillStyle = '#000'; g.fillRect(0, 0, 512, 400);
  g.fillStyle = '#fff'; g.beginPath();
  const legs = [0.62, 2.52, 3.76, 5.66];
  for (let i = 0; i <= 160; i++) {
    const a = (i / 160) * Math.PI * 2;
    let rad = 1 + 0.07 * Math.sin(3 * a + r()) + 0.03 * Math.sin(9 * a);
    for (const l of legs) rad += 0.26 * Math.exp(-Math.pow((((a - l + 9.42) % 6.283) - 3.14) / 0.2, 2));
    const x = 256 + Math.cos(a) * 172 * rad, y = 200 + Math.sin(a) * 132 * rad;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}
export function hide(color = 0x8a4a22, seed = 1) {
  const geo = new THREE.PlaneGeometry(2.4, 1.875, 48, 38);
  const mat = leatherMat(color, { rough: 0.5, sheen: 0.3 });
  mat.alphaMap = hideAlpha(seed); mat.alphaTest = 0.5;
  const mesh = new THREE.Mesh(geo, mat);
  const base = geo.attributes.position.array.slice();
  const ph = seed * 1.7;
  mesh.userData.tick = (t) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1];
      p.setZ(i, -0.13 * x * x + 0.09 * Math.sin(x * 1.7 + t * 1.1 + ph) + 0.06 * Math.sin(y * 2.3 + t * 0.8 + x * 0.6));
    }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  mesh.userData.tick(0);
  return mesh;
}

/* semelle seule */
export function soleOnly(color = 0x1c1c1c, { thick = 0.16, heel = 0, rough = 0.6 } = {}) {
  const last = makeLast({ heel });
  const g = new THREE.Group();
  const s = new THREE.Mesh(soleGeo(last, thick, 0.04), new THREE.MeshStandardMaterial({ color, roughness: rough }));
  g.add(s);
  if (heel) g.add(new THREE.Mesh(heelGeo(last, heel), new THREE.MeshStandardMaterial({ color: shade(color, -0.2), roughness: rough })));
  // rainures d'adhérence sur le dessous
  const gm = new THREE.MeshStandardMaterial({ color: shade(color, -0.35), roughness: 0.9 });
  for (let k = 0; k < 11; k++) {
    const u = 0.32 + k * 0.058; if (u > 0.97) break;
    const b = new THREE.Mesh(new THREE.BoxGeometry(last.half(u) * 1.75, 0.02, 0.03), gm);
    b.position.set(last.cx(u), last.lift(u) + 0.005, last.z(u)); g.add(b);
  }
  return g;
}

/* bobine de fil */
export function spool(color = 0xC59D53) {
  const g = new THREE.Group();
  const core = new THREE.MeshStandardMaterial({ color: 0xEDE6D6, roughness: 0.4 });
  const flange = new THREE.CylinderGeometry(0.36, 0.36, 0.06, 48);
  const top = new THREE.Mesh(flange, core); top.position.y = 0.42;
  const bot = new THREE.Mesh(flange, core); bot.position.y = -0.42;
  const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.78, 48, 1, true),
    new THREE.MeshStandardMaterial({ color, map: threadTex(), bumpMap: threadTex(), bumpScale: 2, roughness: 0.55 }));
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.9, 24), new THREE.MeshStandardMaterial({ color: 0x8c8474, roughness: 0.6 }));
  g.add(top, bot, thread, hole);
  // brin libre
  const end = tube([new THREE.Vector3(0.3, 0.2, 0), new THREE.Vector3(0.5, 0.05, 0.12), new THREE.Vector3(0.62, -0.25, 0.05), new THREE.Vector3(0.75, -0.4, 0.2)], 0.012,
    new THREE.MeshStandardMaterial({ color, roughness: 0.6 }), false, 30);
  g.add(end);
  return g;
}

/* boucle de ceinture/bride */
export function buckle(color = 0xC9A55A, w = 0.62, h = 0.46) {
  const g = new THREE.Group(), m = metal(color, 0.24), r = 0.12, pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI], [w / 2 - r, -h / 2 + r, Math.PI * 1.5]];
  for (const [cx, cy, a0] of corners) for (let i = 0; i <= 6; i++) {
    const a = a0 + (i / 6) * Math.PI / 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0));
  }
  g.add(tube(pts, 0.04, m, true, 120));
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, h, 16), m); bar.position.x = -0.02; g.add(bar);
  const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.016, w / 2 + 0.05, 12), m);
  prong.rotation.z = Math.PI / 2; prong.position.set(w / 4, 0, 0.035); g.add(prong);
  return g;
}
export function eyelet(color = 0xC9A55A) {
  return new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.03, 12, 28), metal(color, 0.25));
}

/* pot de colle */
function labelTex(title, sub, bg, fg) {
  const [c, g] = cnv(1024, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = hex(PAL.or); g.fillRect(0, 30, 1024, 10); g.fillRect(0, 216, 1024, 10);
  g.fillStyle = fg; g.textAlign = 'center';
  g.font = '800 64px Montserrat, Arial, sans-serif'; g.fillText(title, 256, 132); g.fillText(title, 768, 132);
  g.font = '500 30px "IBM Plex Mono", monospace'; g.fillText(sub, 256, 180); g.fillText(sub, 768, 180);
  return toTex(c);
}
export function glueCan() {
  const g = new THREE.Group(), tin = metal(0xBFC3C8, 0.3);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.66, 56, 1, true),
    new THREE.MeshStandardMaterial({ map: labelTex('NÉOPRÈNE', 'SP · COLLE 5 KG', hex(PAL.marine), '#F5F1E8'), roughness: 0.4, metalness: 0.1 }));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.05, 56), tin); lid.position.y = 0.35;
  const bottom = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 56), tin); bottom.position.y = -0.34;
  const handle = tube([new THREE.Vector3(-0.33, 0.36, 0), new THREE.Vector3(-0.25, 0.62, 0), new THREE.Vector3(0.25, 0.62, 0), new THREE.Vector3(0.33, 0.36, 0)], 0.014, tin, false, 30);
  g.add(body, lid, bottom, handle);
  return g;
}
export function bottle(color = 0xF5F1E8) {
  const prof = [[0, -0.5], [0.2, -0.5], [0.22, -0.46], [0.22, 0.12], [0.16, 0.28], [0.08, 0.34], [0.08, 0.42], [0, 0.42]].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 0.6 })));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 32), new THREE.MeshStandardMaterial({ color: PAL.or, roughness: 0.4 }));
  cap.position.y = 0.46; g.add(cap);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.223, 0.223, 0.3, 48, 1, true, -1.2, 2.4),
    new THREE.MeshStandardMaterial({ color: PAL.marine, roughness: 0.5 }));
  label.position.y = -0.15; g.add(label);
  return g;
}

/* rouleau (simili ou doublure) */
function spiralTex(color) {
  const [c, g] = cnv(256, 256);
  g.fillStyle = hex(shade(color, -0.25)); g.fillRect(0, 0, 256, 256);
  g.strokeStyle = hex(shade(color, 0.15)); g.lineWidth = 3; g.beginPath();
  for (let a = 0; a < 40; a += 0.05) { const r = 18 + a * 2.6; g.lineTo(128 + Math.cos(a) * r, 128 + Math.sin(a) * r); }
  g.stroke();
  g.fillStyle = '#6b5e48'; g.beginPath(); g.arc(128, 128, 18, 0, 7); g.fill();
  return toTex(c);
}
export function roll(color = 0x5a1a24, { glossy = true, r = 0.26, len = 1.2 } = {}) {
  const side = glossy
    ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.15, bumpMap: grainTex(), bumpScale: 0.5 })
    : new THREE.MeshStandardMaterial({ color, map: weaveTex(), roughness: 0.85 });
  const cap = new THREE.MeshStandardMaterial({ map: spiralTex(color), roughness: 0.7 });
  const g = new THREE.Group();
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 56), [side, cap, cap]);
  cyl.rotation.z = Math.PI / 2; g.add(cyl);
  // pan déroulé
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.7, 1, 12), side.clone());
  flap.material.side = THREE.DoubleSide;
  const p = flap.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, 0.12 * Math.sin((y + 0.35) * 3)); }
  flap.geometry.computeVertexNormals();
  flap.rotation.x = -Math.PI / 2 + 0.25; flap.position.set(0, -r + 0.02, r + 0.33);
  g.add(flap);
  return g;
}

/* plaque de mousse */
export function foam(color = 0xE8D9A8) {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color, map: poresTex(), bumpMap: poresTex(), bumpScale: 1.5, roughness: 0.95 });
  const a = new THREE.Mesh(new RoundedBoxGeometry(1.1, 0.18, 0.75, 3, 0.04), m);
  const b = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.12, 0.7, 3, 0.03), new THREE.MeshStandardMaterial({ color: 0xBFD6CF, map: poresTex(), roughness: 0.95 }));
  b.position.set(0.08, 0.16, -0.04); b.rotation.y = 0.18;
  g.add(a, b);
  return g;
}

/* boîte à chaussures kraft avec étiquette de marque */
function boxLabel() {
  const [c, g] = cnv(512, 256); const t = toTex(c);
  const paint = (img) => {
    g.fillStyle = hex(PAL.marine); g.fillRect(0, 0, 512, 256);
    g.strokeStyle = hex(PAL.or); g.lineWidth = 4; g.setLineDash([12, 9]); g.strokeRect(14, 14, 484, 228);
    if (img) g.drawImage(img, 40, 58, 140, 140);
    g.fillStyle = '#F5F1E8'; g.font = '800 46px Montserrat, Arial, sans-serif'; g.textAlign = 'left';
    g.fillText('SHOE', 205, 122); g.fillText('PARTNER', 205, 172);
    g.fillStyle = hex(PAL.or); g.font = '500 18px "IBM Plex Mono", monospace'; g.fillText('MAROC · B2B', 207, 206);
    t.needsUpdate = true;
  };
  paint(null); withMark(paint);
  return t;
}
export function shoeBox(w = 1.3, h = 0.5, d = 0.8) {
  const g = new THREE.Group();
  const km = new THREE.MeshStandardMaterial({ color: 0xffffff, map: kraftTex(), roughness: 0.85 });
  const base = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, 0.02), km);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(w + 0.04, 0.16, d + 0.04, 3, 0.025), km);
  lid.position.y = h / 2 - 0.05;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.31), new THREE.MeshStandardMaterial({ map: boxLabel(), roughness: 0.6 }));
  lab.rotation.x = -Math.PI / 2; lab.position.set(-w * 0.12, h / 2 + 0.036, 0);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.08), new THREE.MeshBasicMaterial({ color: PAL.marine }));
  side.position.set(w * 0.22, 0, d / 2 + 0.003);
  g.add(base, lid, lab, side);
  g.userData.lid = lid;
  return g;
}

/* poussière d'or */
export function dust(n = 260, spread = 7) {
  const r = rng(21), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (r() - 0.5) * spread * 1.6; pos[i * 3 + 1] = (r() - 0.5) * spread; pos[i * 3 + 2] = (r() - 0.5) * spread * 0.6; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const [c, x] = cnv(64, 64); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,230,170,1)'); gr.addColorStop(1, 'rgba(255,230,170,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return new THREE.Points(g, new THREE.PointsMaterial({ size: 0.06, map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, color: PAL.or, opacity: 0.85 }));
}

/* ================================================================
   4. LES HUIT FAMILLES DU CATALOGUE (visionneuse de la page Matières)
   ================================================================ */
export const FAMILIES = ['cuir', 'simili', 'semelles', 'metal', 'colles', 'fils', 'mousses', 'emballages'];
export function family(key) {
  const g = new THREE.Group();
  const put = (o, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.scale.setScalar(s); g.add(o); return o; };
  switch (key) {
    case 'cuir':
      put(hide(0x8a4a22, 1), 0, 0.2, 0, -1.25, 0, 0.15);
      put(hide(0x1d1c1e, 2), 0.15, -0.15, 0.1, -1.4, 0, -0.25, 0.92);
      put(hide(0xB98A55, 3), -0.1, 0.55, -0.1, -1.1, 0.1, 0.5, 0.8);
      break;
    case 'simili':
      put(roll(0x5a1a24), 0, 0.35, -0.2, 0, 0.3, 0);
      put(roll(0x172f50), 0.1, -0.2, 0.25, 0, -0.25, 0, 0.92);
      put(roll(0xC59D53, { glossy: true, r: 0.2, len: 1 }), -0.2, 0.85, -0.35, 0, 0.6, 0, 0.8);
      break;
    case 'semelles':
      put(soleOnly(0x1c1c1c, { thick: 0.14, heel: 0.16 }), -0.25, -0.3, 0, 0.25, 0.7, 0.1, 0.8);
      put(soleOnly(0xEDE7DA, { thick: 0.24 }), 0.25, 0.05, 0.1, 0.35, -0.5, -0.15, 0.8);
      put(soleOnly(0xB07A45, { thick: 0.12, rough: 0.5 }), 0, 0.45, -0.3, 0.6, 0.2, 0.3, 0.75);
      break;
    case 'metal':
      put(buckle(0xC9A55A), -0.35, 0.25, 0, 0.3, 0.5, 0.2);
      put(buckle(0xD0D4DA, 0.5, 0.38), 0.4, -0.2, 0.15, -0.4, -0.4, -0.3);
      for (let i = 0; i < 9; i++) {
        const a = i * 0.7;
        put(eyelet(i % 2 ? 0xD0D4DA : 0xC9A55A), Math.cos(a) * (0.35 + i * 0.05), -0.35 + Math.sin(a) * 0.3 + i * 0.08, 0.3 + Math.sin(i) * 0.3, a, a * 1.3, 0);
      }
      break;
    case 'colles':
      put(glueCan(), -0.35, 0, 0, 0.1, 0.5, 0.05);
      put(bottle(0xF5F1E8), 0.45, -0.05, 0.2, 0, -0.3, -0.12);
      put(bottle(0xC59D53), 0.2, 0.05, -0.45, 0, 0.6, 0.15, 0.8);
      break;
    case 'fils':
      put(spool(0xC59D53), -0.5, 0, 0, 0.15, 0, 0.12, 0.9);
      put(spool(0x172f50), 0.1, 0.05, 0.25, -0.1, 0.5, -0.1, 0.9);
      put(spool(0x8a2b25), 0.6, 0, -0.2, 0.05, 1, 0.15, 0.9);
      break;
    case 'mousses':
      put(foam(), -0.1, -0.25, 0, 0.25, 0.4, 0);
      put(roll(0xEDE3CF, { glossy: false, r: 0.22, len: 1.1 }), 0.1, 0.45, -0.1, 0.1, -0.4, 0.05);
      break;
    case 'emballages': {
      put(shoeBox(), 0, -0.45, 0, 0, 0.35, 0);
      put(shoeBox(), 0.05, 0.08, 0, 0, 0.2, 0, 1);
      const top = put(shoeBox(), -0.05, 0.62, 0.02, 0, 0.5, 0, 1);
      top.userData.lid.position.y += 0.12; top.userData.lid.rotation.z = 0.12;
      break;
    }
  }
  return g;
}

/* tout dispose(), récursivement — à l'échange de modèle */
export function dispose(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach((m) => {
      ['map', 'alphaMap'].forEach((k) => { if (m[k] && !Object.values(cache).includes(m[k])) m[k].dispose(); });
      m.dispose();
    });
  });
}
