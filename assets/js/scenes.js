/* ShoePartner — scènes 3D du site.
   [data-3d="hero"]      accueil : les matières flottent puis se rassemblent en chaussure au défilement
   [data-3d="materials"] page Matières : visionneuse des huit familles, synchronisée au défilement
   [data-3d="shoe"]      page Chaussures : configurateur (modèle, coloris, vue éclatée)
   Sans WebGL, chaque bloc reçoit la classe .no3d et le CSS affiche sa version fixe. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import * as K from './three-kit.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rtl = document.documentElement.dir === 'rtl';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (t) => 1 - Math.pow(1 - t, 3);
const back = (t) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/* ------------------------------------------------------------ socle */
function renderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.05;
  return r;
}
function stage(r, scene, { warm = 2.4, rim = 1.6 } = {}) {
  const pm = new THREE.PMREMGenerator(r);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  const key = new THREE.DirectionalLight(0xfff1dc, warm); key.position.set(3, 5, 4);
  const back = new THREE.DirectionalLight(0xC59D53, rim); back.position.set(-4, 2, -3);
  scene.add(key, back, new THREE.HemisphereLight(0xF5F1E8, 0x132A46, 0.55));
}

const loops = [];
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  const vh = window.innerHeight;
  if (!document.hidden) for (const s of loops) {
    const r = s.el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) continue;         // hors écran : on ne dessine pas
    s.fit(); s.tick(now / 1000, dt);
  }
  requestAnimationFrame(frame);
}
function register(s) { loops.push(s); if (loops.length === 1) requestAnimationFrame(frame); }

function sizer(el, r, cam, after) {
  let w = 0, h = 0;
  return () => {
    const W = el.clientWidth, H = el.clientHeight;
    if (W === w && H === h) return false;
    w = W; h = H; r.setSize(W, H, false); cam.aspect = W / H; after && after(W, H); cam.updateProjectionMatrix();
    return true;
  };
}
function pointer(el) {
  const p = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    p.x = (e.clientX / window.innerWidth) * 2 - 1; p.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  return p;
}

/* ======================================================= ACCUEIL */
function hero(el) {
  const canvas = el.querySelector('canvas');
  const r = renderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 60); cam.position.set(0, 0.3, 10);
  stage(r, scene);

  const cluster = new THREE.Group(); scene.add(cluster);
  const items = [];
  const add = (o, x, y, z, s, spin = 1) => {
    const piv = new THREE.Group(); piv.add(o); cluster.add(piv);
    if (x < 0) x *= 0.72;
    piv.position.set(x, y, z);
    items.push({ piv, o, home: new THREE.Vector3(x, y, z), s: s * 1.3, ph: Math.random() * 6.28,
      sp: new THREE.Vector3(0.2 + Math.random() * 0.3, 0.3 + Math.random() * 0.4, 0.1 + Math.random() * 0.2).multiplyScalar(spin),
      r0: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6) });
  };
  add(K.hide(0x8a4a22, 1), -2.3, 1.15, -0.6, 0.85, 0.3);
  add(K.hide(0x1d1c1e, 2), 2.4, -1.3, -1.1, 0.75, 0.3);
  add(K.soleOnly(0x1c1c1c, { thick: 0.14, heel: 0.16 }), 2.5, 1.35, 0, 0.62);
  add(K.soleOnly(0xEDE7DA, { thick: 0.24 }), -2.5, -1.25, 0.4, 0.58);
  add(K.spool(0xC59D53), 0.5, 2.05, -0.8, 0.62);
  add(K.spool(0x172f50), -0.8, -2.05, 0.3, 0.55);
  add(K.buckle(0xC9A55A), 1.5, -0.35, 1.3, 0.8);
  add(K.buckle(0xD0D4DA, 0.5, 0.38), -1.55, 0.15, 1.1, 0.7);
  add(K.glueCan(), 1.05, -2.1, -0.5, 0.55);
  add(K.roll(0x5a1a24), -1.3, 2.15, -1.3, 0.55);
  add(K.shoeBox(), 3.3, 0.1, -1.6, 0.6);
  add(K.foam(), -3.3, 0.1, -1.3, 0.55);
  for (let i = 0; i < 5; i++) add(K.eyelet(i % 2 ? 0xD0D4DA : 0xC9A55A), Math.cos(i * 1.3) * 1.2, Math.sin(i * 1.7) * 1.1, 1.8, 0.9, 2);

  const dust = K.dust(220, 7); scene.add(dust);

  // la chaussure finale, au centre de l'amas
  const shoePiv = new THREE.Group(); cluster.add(shoePiv);
  const shoe = K.shoe('derby', 'cognac'); shoe.position.y = -0.55; shoePiv.add(shoe);
  shoePiv.scale.setScalar(0.0001);

  const ptr = pointer(el);
  const panels = [...el.querySelectorAll('[data-phase]')];
  const steps = [...el.querySelectorAll('.h3-steps span')];
  const fit = sizer(el.querySelector('.h3-stage'), r, cam, (W, H) => {
    const wide = W / H > 1.05;
    if (wide) cam.setViewOffset(W, H, (rtl ? 1 : -1) * W * 0.24, 0, W, H);
    else cam.setViewOffset(W, H, 0, -H * 0.2, W, H);
    cluster.scale.setScalar(wide ? Math.min(0.78, 0.5 + (W / H - 1) * 0.35) : 0.52);
  });

  let pSm = 0;
  return {
    el, fit,
    tick(t, dt) {
      const rect = el.getBoundingClientRect(), vh = window.innerHeight;
      const p = clamp(-rect.top / Math.max(1, rect.height - vh));
      pSm += (p - pSm) * Math.min(1, dt * 6);
      const e = ease(smooth(0.18, 0.72, pSm));
      el.style.setProperty('--p', pSm.toFixed(3));
      panels.forEach((pn) => {
        const op = pn.dataset.phase === 'a' ? 1 - smooth(0.3, 0.46, pSm) : smooth(0.6, 0.76, pSm);
        pn.style.opacity = op; pn.style.visibility = op < 0.02 ? 'hidden' : 'visible';
        pn.style.transform = `translateY(${(pn.dataset.phase === 'a' ? -1 : 1) * (1 - op) * 30}px)`;
      });

      steps.forEach((s, i) => s.classList.toggle('on', (pSm > 0.5) === (i === 1)));
      const T = reduced ? 0 : t;
      for (const it of items) {
        const k = 1 - e;
        it.piv.position.copy(it.home).multiplyScalar(0.15 + 0.85 * k);
        it.piv.position.y += Math.sin(T * 0.9 + it.ph) * 0.12 * k;
        it.piv.scale.setScalar(Math.max(0.0001, it.s * (k * k)));
        it.piv.visible = k > 0.02;
        it.o.rotation.set(it.r0.x + T * it.sp.x + e * 4, it.r0.y + T * it.sp.y + e * 5, it.r0.z + T * it.sp.z);
        if (it.o.userData.tick && it.piv.visible && !reduced) it.o.userData.tick(t);
      }
      const se = smooth(0.42, 0.95, pSm);
      shoePiv.scale.setScalar(Math.max(0.0001, back(se) * 1.6));
      shoePiv.rotation.set(0.32, -0.75 + T * 0.35 + (1 - se) * 2.5, 0.06);
      dust.rotation.y = T * 0.03; dust.position.y = Math.sin(T * 0.3) * 0.1;

      cam.position.x += (ptr.x * 0.7 - cam.position.x) * 0.04;
      cam.position.y += (0.3 - ptr.y * 0.45 - cam.position.y) * 0.04;
      cam.lookAt(0, 0, 0);
      r.render(scene, cam);
    },
  };
}

/* ======================================================= MATIÈRES */
function materials(el) {
  const canvas = el.querySelector('canvas');
  const r = renderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 1.4, 6.2);
  stage(r, scene, { warm: 2.6, rim: 1.4 });
  const controls = new OrbitControls(cam, canvas);
  Object.assign(controls, { enableZoom: false, enablePan: false, enableDamping: true, autoRotate: !reduced, autoRotateSpeed: 1.6, minPolarAngle: 0.6, maxPolarAngle: 1.85 });
  controls.target.set(0, 0, 0);

  const sh = K.contactShadow(3.4, 2.4, 0.35); sh.position.y = -1.25; scene.add(sh);
  const fit = sizer(el, r, cam, (W, H) => { cam.position.setLength(W / H < 0.9 ? 7.6 : 6.2); });

  const tabs = [...document.querySelectorAll('[data-fam]')];
  const secs = [...document.querySelectorAll('[data-fam-sec]')];
  const label = el.querySelector('[data-fam-label]');
  const built = {};
  let cur = null, curKey = null, next = null, tSwap = 1;

  function build(key) {
    if (built[key]) return built[key];
    const g = K.family(key);
    const box = new THREE.Box3().setFromObject(g), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    g.position.sub(c);
    const piv = new THREE.Group(); piv.add(g);
    piv.userData.fit = 2.2 / Math.max(s.x, s.y, s.z);
    return (built[key] = piv);
  }
  function show(key) {
    if (key === curKey) return;
    curKey = key; next = build(key); tSwap = cur ? 0 : 0.5;
    tabs.forEach((b) => {
      const on = b.dataset.fam === key; b.classList.toggle('on', on); b.setAttribute('aria-selected', on);
      if (on && window.innerWidth <= 940) b.scrollIntoView({ block: 'nearest', inline: 'center' });
    });
    if (label) { const b = tabs.find((x) => x.dataset.fam === key); label.textContent = b ? b.dataset.title || b.textContent : ''; }
  }
  tabs.forEach((b) => b.addEventListener('click', () => {
    show(b.dataset.fam);
    const s = secs.find((x) => x.dataset.famSec === b.dataset.fam);
    if (s) { lockUntil = performance.now() + 1100; s.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }
  }));
  let lockUntil = 0;
  show(K.FAMILIES[0]);

  return {
    el, fit,
    tick(t, dt) {
      // la section au milieu de l'écran décide de la famille affichée
      if (secs.length && performance.now() > lockUntil) {
        const vb = (el.closest('.mv-view') || el).getBoundingClientRect().bottom;
        const mid = Math.max(window.innerHeight * 0.38, Math.min(window.innerHeight - 60, vb + 60));
        for (const s of secs) { const b = s.getBoundingClientRect(); if (b.top < mid && b.bottom > mid) { show(s.dataset.famSec); break; } }
      }
      if (next) {
        tSwap += dt * 2.6;
        if (cur && cur.parent === scene && tSwap < 0.5) cur.scale.setScalar(cur.userData.fit * (1 - ease(tSwap * 2)));
        else {
          Object.values(built).forEach((b) => { if (b !== next && b.parent === scene) scene.remove(b); });
          if (next.parent !== scene) { scene.add(next); next.rotation.y = -0.6; }
          const k = clamp((tSwap - 0.5) * 2);
          next.scale.setScalar(Math.max(0.0001, next.userData.fit * back(k)));
          if (k >= 1) { cur = next; next = null; }
        }
      }
      const live = next && next.parent === scene ? next : cur;
      if (live && !reduced) {
        live.position.y = Math.sin(t * 1.2) * 0.06;
        live.traverse((o) => o.userData.tick && o.userData.tick(t));
      }
      controls.update();
      r.render(scene, cam);
    },
  };
}

/* ======================================================= CONFIGURATEUR */
function shoeCfg(el) {
  const canvas = el.querySelector('canvas');
  const r = renderer(canvas), scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(rtl ? -3.6 : 3.6, 2.1, 4.1);
  stage(r, scene, { warm: 2.7, rim: 1.8 });
  const controls = new OrbitControls(cam, canvas);
  Object.assign(controls, { enableZoom: false, enablePan: false, enableDamping: true, autoRotate: !reduced, autoRotateSpeed: 1.1, minPolarAngle: 0.5, maxPolarAngle: 1.62 });
  controls.target.set(0, 0.45, 0);

  // plateau tournant
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.9, 0.08, 96), new THREE.MeshStandardMaterial({ color: 0xEFE9DD, roughness: 0.35, metalness: 0.05 }));
  disc.position.y = -0.04; scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.87, 0.014, 8, 160), K.metal(0xC59D53, 0.25));
  ring.rotation.x = Math.PI / 2; scene.add(ring);
  const sh = K.contactShadow(3.2, 1.6, 0.55); sh.position.y = 0.002; scene.add(sh);

  const fit = sizer(el, r, cam, (W, H) => { cam.position.setLength(W / H < 0.9 ? 7.6 : 6.6); });

  let shoe = null, explode = 0, ex = 0, pop = 1, state = { model: 'derby', color: 'cognac' };
  function set(model, color) {
    if (shoe) { scene.remove(shoe); K.dispose(shoe); }
    shoe = K.shoe(model, color); scene.add(shoe); pop = 0;
    state = { model, color };
  }
  const read = () => {
    const m = document.querySelector('[data-model].on'), c = document.querySelector('[data-color].on');
    return { model: m ? m.dataset.model : 'derby', color: c ? c.dataset.color : 'cognac' };
  };
  const s0 = read(); set(s0.model, s0.color);
  document.addEventListener('sp:config', (e) => {
    const d = e.detail || {};
    if (d.model !== state.model || d.color !== state.color) set(d.model, d.color);
    explode = d.explode ? 1 : 0;
    controls.autoRotate = !reduced && !d.explode;
  });

  return {
    el, fit,
    tick(t, dt) {
      ex += (explode - ex) * Math.min(1, dt * 5);
      pop = Math.min(1, pop + dt * 2.4);
      if (shoe) {
        const P = shoe.userData.parts;
        P.upper.position.y = ex * 0.55; P.laces.position.y = ex * 1.0; P.sole.position.y = -ex * 0.05;
        shoe.scale.setScalar(Math.max(0.0001, back(pop)));
      }
      controls.update();
      r.render(scene, cam);
    },
  };
}

/* ------------------------------------------------------------ amorçage */
const kinds = { hero, materials, shoe: shoeCfg };
function boot() {
  document.querySelectorAll('[data-3d]').forEach((el) => {
    const fn = kinds[el.dataset['3d']];
    if (!fn) return;
    try {
      const s = fn(el);
      register(s);
      el.classList.add('ready');
    } catch (err) {
      console.warn('[ShoePartner 3D]', err);
      el.classList.add('no3d');
    }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
