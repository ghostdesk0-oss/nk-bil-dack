// 3D car and rim configurator.
// A low-poly extruded body is the backdrop; the four wheels carry the detail.
// The scene renders only while its section is on screen, and lowers its own
// resolution if the device cannot keep up.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Vector2, Vector3, Shape, Path, ExtrudeGeometry, LatheGeometry,
  CylinderGeometry, SphereGeometry, BoxGeometry, PlaneGeometry, CircleGeometry, TorusGeometry, InstancedMesh, Mesh,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, DirectionalLight, PointLight, Color, Matrix4, Quaternion,
  DoubleSide, AdditiveBlending, ACESFilmicToneMapping, CanvasTexture, SRGBColorSpace, Points, BufferGeometry,
  BufferAttribute, PointsMaterial, RepeatWrapping
} from 'three';
import { TessellateModifier } from 'three/examples/jsm/modifiers/TessellateModifier.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { tyreTextures, softDisc, concrete, studioEnv, tyreProfile, STUD_ROWS, STUD_M, studU } from '../wheel/wheel.js';

export const PAINTS = {
  obsidian: { color: 0x0a0a0c, metalness: 0.55, roughness: 0.32 },
  silver: { color: 0x9ea4ab, metalness: 0.8, roughness: 0.3 },
  white: { color: 0xe6eaee, metalness: 0.15, roughness: 0.28 },
  midnight: { color: 0x0d1a3c, metalness: 0.65, roughness: 0.3 }
};
export const RIMS = {
  sport: { n: 5, half: 0.058, ri: 0.215, ro: 0.565, dish: 0.13, mat: { color: 0xd4d8dd, metalness: 1, roughness: 0.2, clearcoat: 0 } },
  classic: { n: 10, half: 0.026, ri: 0.2, ro: 0.578, dish: 0.05, mat: { color: 0xc7cace, metalness: 1, roughness: 0.27, clearcoat: 0 } },
  black: { n: 7, half: 0.045, ri: 0.215, ro: 0.565, dish: 0.17, lip: true, mat: { color: 0x0b0b0d, metalness: 0.85, roughness: 0.3, clearcoat: 1 } }
};
const WR = 0.34;                                   // wheel radius in metres
const AXLES = [[1.42, 0.8], [1.42, -0.8], [-1.42, 0.8], [-1.42, -0.8]];
const HUB_Y = 0.34;

/* ---------- shared geometry ---------- */
function rimFace(r) {
  const face = new Shape(); face.absarc(0, 0, 0.642, 0, Math.PI * 2, false);
  const sect = (Math.PI * 2) / r.n;
  for (let k = 0; k < r.n; k++) {
    const a0 = k * sect + Math.PI / 2, a1 = a0 + sect, di = Math.asin(r.half / r.ri), dO = Math.asin(r.half / r.ro), hole = new Path();
    hole.absarc(0, 0, r.ro, a0 + dO, a1 - dO, false); hole.absarc(0, 0, r.ri, a1 - di, a0 + di, true); hole.closePath(); face.holes.push(hole);
  }
  const g = new ExtrudeGeometry(face, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.026, bevelSize: 0.016, bevelSegments: 3, curveSegments: 28 });
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const rr = Math.min(1, Math.hypot(p.getX(i), p.getY(i)) / 0.642); p.setZ(i, p.getZ(i) - r.dish * Math.pow(1 - rr, 1.3)); }
  g.computeVertexNormals(); return g;
}

function bodyOutline(lift) {
  // side profile of a low fastback; x forward, y up, metres. lift raises the upper curves (for the glass)
  const L = lift || 0, s = new Shape();
  if (!lift) {
    s.moveTo(2.16, 0.27); s.lineTo(1.83, 0.27);
    s.absarc(1.42, HUB_Y, 0.41, -0.17, Math.PI + 0.17, false);
    s.lineTo(-1.016, 0.271);
    s.absarc(-1.42, HUB_Y, 0.41, -0.17, Math.PI + 0.17, false);
    s.lineTo(-2.12, 0.28);
    s.quadraticCurveTo(-2.29, 0.3, -2.29, 0.5);
    s.lineTo(-2.26, 0.8);
    s.quadraticCurveTo(-2.22, 0.96, -1.98, 0.99);
  } else {
    s.moveTo(1.14, 0.95); s.lineTo(-1.62, 0.95); s.lineTo(-1.62, 1.0 + L);
  }
  s.lineTo(-1.62, 1.0 + L);
  s.quadraticCurveTo(-1.22, 1.35 + L, -0.55, 1.375 + L);
  s.quadraticCurveTo(0.22, 1.395 + L, 0.58, 1.23 + L);
  s.quadraticCurveTo(0.86, 1.04 + L, 1.14, 0.98 + L * 0.5);
  if (!lift) {
    s.quadraticCurveTo(1.9, 0.92, 2.2, 0.78);
    s.quadraticCurveTo(2.35, 0.72, 2.33, 0.5);
    s.quadraticCurveTo(2.32, 0.3, 2.16, 0.27);
  } else s.lineTo(1.14, 0.95);
  return s;
}

function shapeBody(g0, depth) {
  // split into small triangles so the curved deformation stays smooth, then weld for soft normals
  let g = new TessellateModifier(0.16, 8).modify(g0); g0.dispose();
  g.translate(0, 0, -depth / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i); let z = p.getZ(i);
    if (y > 0.92) z *= 1 - 0.2 * Math.min(1, (y - 0.92) / 0.48);      // tumblehome: narrower at the roof
    const ax = Math.abs(x); if (ax > 1.75) z *= 1 - 0.13 * Math.pow((ax - 1.75) / 0.6, 2);  // rounded nose and tail in plan view
    p.setZ(i, z);
  }
  g.deleteAttribute('normal'); g.deleteAttribute('uv'); g.clearGroups();
  g = mergeVertices(g, 1e-4); g.computeVertexNormals(); return g;
}

function blurTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), m = 128;
  const gr = g.createRadialGradient(m, m, 0, m, m, m);
  gr.addColorStop(0, 'rgba(200,0,20,.95)'); gr.addColorStop(0.1, 'rgba(70,70,74,.95)'); gr.addColorStop(0.2, 'rgba(190,194,200,.75)');
  gr.addColorStop(0.55, 'rgba(160,164,170,.7)'); gr.addColorStop(0.64, 'rgba(210,212,216,.85)'); gr.addColorStop(0.68, 'rgba(25,25,26,.95)');
  gr.addColorStop(0.83, 'rgba(18,18,19,.97)'); gr.addColorStop(0.86, 'rgba(70,70,72,.9)'); gr.addColorStop(0.9, 'rgba(18,18,19,.97)'); gr.addColorStop(1, 'rgba(18,18,19,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

export function mount(canvas, opts = {}) {
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
  const coarse = window.matchMedia('(pointer: coarse)').matches, reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2); renderer.setPixelRatio(dpr);
  const scene = new Scene(); scene.environment = studioEnv(renderer);
  const cam = new PerspectiveCamera(30, 1, 0.05, 120);

  const st = { season: opts.season || 'friktion', rim: 'sport', paint: 'obsidian', leds: true, glow: true, highway: false };

  /* ---------- materials, shared by the car and its reflection ---------- */
  const M = {
    paint: new MeshPhysicalMaterial({ ...PAINTS.obsidian, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.25 }),
    glass: new MeshPhysicalMaterial({ color: 0x050607, metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 }),
    trim: new MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.4, roughness: 0.55 }),
    liner: new MeshStandardMaterial({ color: 0x060606, roughness: 0.9, side: DoubleSide }),
    head: new MeshStandardMaterial({ color: 0x111111, emissive: 0xeaf4ff, emissiveIntensity: 3.2 }),
    tail: new MeshStandardMaterial({ color: 0x220004, emissive: 0xff1428, emissiveIntensity: 3 }),
    tyre: new MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0, bumpScale: 1.4 }),
    stud: new MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.25 }),
    disc: new MeshStandardMaterial({ color: 0x77797c, metalness: 1, roughness: 0.42 }),
    caliper: new MeshPhysicalMaterial({ color: 0xe4102a, metalness: 0.3, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1 }),
    nut: new MeshStandardMaterial({ color: 0x1a1a1a, metalness: 1, roughness: 0.3 }),
    cap: new MeshStandardMaterial({ color: 0xe4102a, metalness: 0.3, roughness: 0.35 }),
    lip: new MeshPhysicalMaterial({ color: 0xe4102a, metalness: 0.5, roughness: 0.3, clearcoat: 1 }),
    blur: new MeshBasicMaterial({ map: blurTexture(), transparent: true, opacity: 0, depthWrite: false }),
    rim: {}
  };
  for (const k in RIMS) M.rim[k] = new MeshPhysicalMaterial({ ...RIMS[k].mat, clearcoatRoughness: 0.06, side: DoubleSide, envMapIntensity: 1.2 });
  { const dc = document.createElement('canvas'); dc.width = dc.height = 256; const g = dc.getContext('2d'); g.fillStyle = '#b9bbbe'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#0a0a0a'; for (let k = 0; k < 24; k++) for (let j = 0; j < 3; j++) { const a = k / 24 * Math.PI * 2 + j * 0.08, r = 70 + j * 19; g.beginPath(); g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3.2, 0, 7); g.fill(); }
    const t = new CanvasTexture(dc); t.colorSpace = SRGBColorSpace; M.discFace = new MeshStandardMaterial({ color: 0xffffff, map: t, metalness: 1, roughness: 0.34 }); }
  function retexTyre() {
    const t = tyreTextures('225/40 R18', 'NK BIL & DÄCK', st.season, 1);
    for (const k of ['map', 'bumpMap', 'roughnessMap']) { if (M.tyre[k]) M.tyre[k].dispose(); }
    M.tyre.map = t.map; M.tyre.bumpMap = t.bump; M.tyre.roughnessMap = t.rough; M.tyre.needsUpdate = true;
  }
  retexTyre();

  /* ---------- geometry ---------- */
  const pts = []; for (let i = 0; i <= 48; i++) { const p = tyreProfile(i / 48); pts.push(new Vector2(p[0], p[1])); }
  const G = {
    tyre: new LatheGeometry(pts, 96),
    barrel: new LatheGeometry([[0.665, -0.3], [0.695, -0.325], [0.665, -0.34], [0.64, -0.3], [0.62, -0.12], [0.55, 0], [0.615, 0.14], [0.632, 0.27], [0.64, 0.33], [0.668, 0.352], [0.7, 0.335], [0.668, 0.3]].map(p => new Vector2(p[0], p[1])), 64),
    hub: new CylinderGeometry(0.19, 0.21, 0.09, 32),
    nut: new CylinderGeometry(0.03, 0.034, 0.06, 6),
    cap: new SphereGeometry(0.075, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    lip: new TorusGeometry(0.672, 0.014, 6, 64),
    disc: new CylinderGeometry(0.52, 0.52, 0.045, 48),
    stud: new CylinderGeometry(0.007, 0.01, 0.022, 6),
    blur: new CircleGeometry(0.99, 48),
    face: {}
  };
  for (const k in RIMS) G.face[k] = rimFace(RIMS[k]);
  { const cs = new Shape(); cs.absarc(0, 0, 0.56, -0.15, 0.75, false); cs.absarc(0, 0, 0.33, 0.75, -0.15, true); cs.closePath();
    G.caliper = new ExtrudeGeometry(cs, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 12 }); }
  const studBase = [], up = new Vector3(0, 1, 0);
  STUD_ROWS.forEach((f, row) => { for (let i = 0; i < STUD_M; i++) {
    const phi = studU(row, i) * Math.PI * 2, p = tyreProfile(0.3 + 0.4 * f), dir = new Vector3(Math.sin(phi), -Math.cos(phi), 0);
    studBase.push({ pos: dir.clone().multiplyScalar(p[0] + 0.002).setZ(p[1]), q: new Quaternion().setFromUnitVectors(up, dir), delay: (i / STUD_M) * 0.55 + row * 0.04 });
  } });
  const BD = 1.7, bevel = { depth: BD, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 4, curveSegments: 18 };
  G.body = shapeBody(new ExtrudeGeometry(bodyOutline(0), bevel), BD);
  G.glass = shapeBody(new ExtrudeGeometry(bodyOutline(0.014), { ...bevel, depth: BD + 0.026 }), BD + 0.026);

  /* ---------- builders ---------- */
  function fillRim(rimG, style) {
    while (rimG.children.length) rimG.remove(rimG.children[0]);
    const mat = M.rim[style], r = RIMS[style];
    const barrel = new Mesh(G.barrel, mat); barrel.rotation.x = Math.PI / 2; rimG.add(barrel);
    const face = new Mesh(G.face[style], mat); face.position.z = 0.225; rimG.add(face);
    const hub = new Mesh(G.hub, mat); hub.rotation.x = Math.PI / 2; hub.position.z = 0.215; rimG.add(hub);
    const nuts = new InstancedMesh(G.nut, M.nut, 5), m4 = new Matrix4(), q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
    for (let k = 0; k < 5; k++) { const a = k * Math.PI * 2 / 5 + 0.3; m4.compose(new Vector3(Math.cos(a) * 0.128, Math.sin(a) * 0.128, 0.262), q, new Vector3(1, 1, 1)); nuts.setMatrixAt(k, m4); }
    rimG.add(nuts);
    const cap = new Mesh(G.cap, M.cap); cap.rotation.x = Math.PI / 2; cap.scale.y = 0.35; cap.position.z = 0.258; rimG.add(cap);
    if (r.lip) { const lip = new Mesh(G.lip, M.lip); lip.position.z = 0.33; rimG.add(lip); }
  }
  function makeWheel() {
    const root = new Group(), spin = new Group(), tyreG = new Group(), rimG = new Group();
    root.add(spin); spin.add(tyreG); spin.add(rimG);
    const tyre = new Mesh(G.tyre, M.tyre); tyre.rotation.x = Math.PI / 2; tyreG.add(tyre);
    const studs = new InstancedMesh(G.stud, M.stud, studBase.length); studs.visible = false; tyreG.add(studs);
    fillRim(rimG, st.rim);
    const disc = new Mesh(G.disc, [M.disc, M.discFace, M.discFace]); disc.rotation.x = Math.PI / 2; disc.position.z = 0.08; spin.add(disc);
    const cal = new Mesh(G.caliper, M.caliper); cal.position.z = 0.03; cal.rotation.z = 0.15; root.add(cal);
    const blur = new Mesh(G.blur, M.blur); blur.position.z = 0.36; blur.renderOrder = 5; root.add(blur);
    root.scale.setScalar(WR);
    return { root, spin, tyreG, rimG, studs };
  }
  function makeCar() {
    const car = new Group(), body = new Group(); car.add(body);
    body.add(new Mesh(G.body, M.paint));
    body.add(new Mesh(G.glass, M.glass));
    const box = (w, h, d, x, y, z, mat, rz) => { const b = new Mesh(new BoxGeometry(w, h, d), mat); b.position.set(x, y, z); if (rz) b.rotation.z = rz; body.add(b); return b; };
    box(0.03, 0.022, 1.34, 2.375, 0.72, 0, M.head, -0.5);            // front light bar
    for (const z of [0.58, -0.58]) box(0.05, 0.04, 0.3, 2.37, 0.7, z, M.head, -0.5);
    box(0.03, 0.04, 1.46, -2.345, 0.84, 0, M.tail);                  // full-width tail light
    box(0.04, 0.16, 1.0, 2.385, 0.42, 0, M.trim);                     // grille
    box(0.04, 0.12, 1.2, -2.35, 0.42, 0, M.trim);                    // diffuser
    for (const ax of [1.42, -1.42]) for (const z of [0.66, -0.66]) {
      const l = new Mesh(new CylinderGeometry(0.405, 0.405, 0.36, 20, 1, true, Math.PI / 2, Math.PI), M.liner); l.rotation.x = Math.PI / 2; l.position.set(ax, HUB_Y, z); body.add(l);
    }
    const wheels = AXLES.map(([x, z]) => { const w = makeWheel(); w.root.position.set(x, HUB_Y, z); if (z < 0) w.root.rotation.y = Math.PI; car.add(w.root); return w; });
    return { car, body, wheels };
  }

  const real = makeCar(), mirror = makeCar();
  const stage = new Group(); scene.add(stage);
  stage.add(real.car);
  mirror.car.scale.y = -1; stage.add(mirror.car);
  const both = [real, mirror], allWheels = real.wheels.concat(mirror.wheels);

  /* ---------- studio: floor, shadow, glow, tunnel, streaks, snow ---------- */
  const rough = concrete(); rough.repeat.set(7, 7);
  const floorMat = new MeshStandardMaterial({ color: 0x151113, roughness: 0.26, metalness: 0.4, roughnessMap: rough, alphaMap: softDisc(256, [[0, '#fff'], [0.5, '#fff'], [1, '#000']]), transparent: true, opacity: 0.8, depthWrite: false, envMapIntensity: 0.9 });
  const floor = new Mesh(new PlaneGeometry(26, 26), floorMat); floor.rotation.x = -Math.PI / 2; floor.renderOrder = 1; stage.add(floor);
  const shadow = new Mesh(new PlaneGeometry(5.4, 2.6), new MeshBasicMaterial({ map: softDisc(128, [[0, 'rgba(0,0,0,.95)'], [0.55, 'rgba(0,0,0,.6)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; shadow.scale.set(1, 1.15, 1); shadow.renderOrder = 2; stage.add(shadow);
  // soft radial contact shadow beneath each tyre
  const tyreShadow = new MeshBasicMaterial({ map: softDisc(128, [[0, 'rgba(0,0,0,.92)'], [0.55, 'rgba(0,0,0,.5)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false });
  for (const [ax, az] of AXLES) { const s = new Mesh(new PlaneGeometry(1.06, 0.8), tyreShadow); s.rotation.x = -Math.PI / 2; s.position.set(ax, 0.003, az * 0.98); s.renderOrder = 2; stage.add(s); }
  const glowMat = new MeshBasicMaterial({ map: softDisc(128, [[0, 'rgba(255,30,50,1)'], [0.45, 'rgba(255,20,40,.45)'], [1, 'rgba(255,20,40,0)']]), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.9 });
  const glow = new Mesh(new PlaneGeometry(6.2, 3.2), glowMat); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.006; glow.renderOrder = 3; stage.add(glow);
  const beamMat = new MeshBasicMaterial({ map: softDisc(128, [[0, 'rgba(235,245,255,.9)'], [0.5, 'rgba(235,245,255,.25)'], [1, 'rgba(235,245,255,0)']]), transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.55 });
  const beams = new Group(); for (const z of [0.6, -0.6]) { const b = new Mesh(new PlaneGeometry(3.4, 1.2), beamMat); b.rotation.x = -Math.PI / 2; b.position.set(3.9, 0.007, z * 1.4); beams.add(b); } beams.renderOrder = 3; stage.add(beams);

  const ribMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }); ribMat.toneMapped = false;
  const tunnel = new Group(), RIBS = 18, ribGeo = new BoxGeometry(0.035, 3.6, 0.035);
  for (let i = 0; i < RIBS; i++) { const r = new Mesh(ribGeo, ribMat); r.position.set(-14 + i * 1.6, 1.8, -6.5); tunnel.add(r); }
  const lineMat = ribMat.clone(); lineMat.opacity = 0.75;
  for (const y of [0.02, 3.6]) { const l = new Mesh(new BoxGeometry(30, 0.03, 0.03), lineMat); l.position.set(0, y, -6.5); tunnel.add(l); }
  stage.add(tunnel);

  const SK = 34, streakMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }); streakMat.toneMapped = false;
  const streaks = new InstancedMesh(new BoxGeometry(1, 0.008, 0.008), streakMat, SK), sk = [];
  for (let i = 0; i < SK; i++) { const z = (Math.random() < 0.5 ? -1 : 1) * (1.4 + Math.random() * 2.6); sk.push({ x: (Math.random() - 0.5) * 22, y: 0.15 + Math.random() * 2.4, z, len: 0.8 + Math.random() * 2.2, v: 26 + Math.random() * 20 }); }
  streaks.renderOrder = 6; stage.add(streaks);

  const SN = coarse ? 140 : 220, snowPos = new Float32Array(SN * 3), snowV = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { snowPos[i * 3] = (Math.random() - 0.5) * 12; snowPos[i * 3 + 1] = Math.random() * 4; snowPos[i * 3 + 2] = (Math.random() - 0.5) * 8; snowV[i] = 0.25 + Math.random() * 0.5; }
  const snowGeo = new BufferGeometry(); snowGeo.setAttribute('position', new BufferAttribute(snowPos, 3));
  const snowMat = new PointsMaterial({ map: softDisc(64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]), size: 0.06, transparent: true, depthWrite: false, opacity: 0 });
  const snow = new Points(snowGeo, snowMat); snow.renderOrder = 4; stage.add(snow);

  const key = new DirectionalLight(0xffffff, 1.1); key.position.set(-3, 6, 5); scene.add(key);
  const kick = new PointLight(0xff2238, 60, 18); kick.position.set(-4, 1.2, -3); scene.add(kick);
  const mood = new PointLight(0xffa24a, 70, 20); mood.position.set(3.5, 2.6, 3.5); scene.add(mood);
  // cool rear rim light: peels the dark silhouette off the dark studio, Polestar-style
  const rim = new PointLight(0x9fc8ff, 55, 22); rim.position.set(2.4, 2.6, -4.6); scene.add(rim);
  const WARM = new Color(0xffa040), ICE = new Color(0x86cdff), FLOOR_DRY = new Color(0x151113), FLOOR_FROST = new Color(0x26303a), tmp = new Color();

  /* ---------- state ---------- */
  const S = {
    winter: st.season === 'sommar' ? 0 : 1, stud: st.season === 'dubb' ? 2 : 0, studT: st.season === 'dubb' ? 1 : 0, studDirty: true,
    bounce: 0, bv: 0, swap: null, ang: 0, vel: 0.6, speedT: 0, kmh: 0,
    paintFrom: new Color(PAINTS.obsidian.color), paintTo: new Color(PAINTS.obsidian.color), paintMix: 1, pFrom: PAINTS.obsidian, pTo: PAINTS.obsidian,
    led: 1, ledT: 1, glowV: 1, glowT: 1
  };
  const O = { az: 0.62, el: 0.16, dist: 9, tx: 0.1, ty: 0.6, tz: 0, // current
    T: { az: 0.62, el: 0.16, dist: 9, tx: 0.1, ty: 0.6, tz: 0, fit: true }, user: 0, scrollAz: 0, zoom: 1 };
  const PRESETS = {
    front: { az: 0.62, el: 0.15, dist: 9.4, tx: 0.15, ty: 0.62, tz: 0, fit: true },
    side: { az: 0.0, el: 0.05, dist: 9.2, tx: 0, ty: 0.62, tz: 0, fit: true },
    close: { az: 0.42, el: 0.09, dist: 2.25, tx: 1.42, ty: 0.36, tz: 0.86, fit: false }
  };
  let vw = 1, vh = 1, padT = 0, padB = 0;
  // the UI covers the top and bottom of the canvas: centre the car in the free band between them
  function applyView() {
    const free = Math.max(120, vh - padT - padB), shift = (padB - padT) / 2;
    cam.aspect = vw / free; cam.fov = 30;
    cam.setViewOffset(vw, free, 0, 0, vw, free); cam.clearViewOffset();
    cam.aspect = vw / vh;
    // widen the vertical field so the free band, not the whole canvas, gets the 30 degree view
    cam.fov = 2 * Math.atan(Math.tan(15 * Math.PI / 180) * vh / free) * 180 / Math.PI;
    cam.setViewOffset(vw, vh + 2 * Math.abs(shift), 0, shift > 0 ? 2 * shift : 0, vw, vh);
    cam.updateProjectionMatrix();
  }
  function resize(force) {
    const nw = canvas.clientWidth, nh = canvas.clientHeight; if (!nw || !nh) return;
    if (force !== true && nw === vw && nh === vh) return;
    vw = nw; vh = nh; renderer.setSize(vw, vh, false); applyView();
  }
  new ResizeObserver(() => resize()).observe(canvas); resize(true);

  /* orbit: drag rotates, wheel or pinch zooms; vertical touch drags still scroll the page */
  const ptrs = new Map(); let pinch0 = 0, zoom0 = 1, dragged = false;
  canvas.addEventListener('pointerdown', e => { ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); canvas.setPointerCapture(e.pointerId); dragged = false;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = O.zoom; } canvas.classList.add('grabbing'); });
  canvas.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) O.zoom = Math.max(0.45, Math.min(1.6, zoom0 * pinch0 / d)); return; }
    if (Math.abs(dx) > 1) dragged = true;
    O.T.az -= dx * 0.0085; O.user = 1;
    if (e.pointerType === 'mouse') O.T.el = Math.max(-0.02, Math.min(0.7, O.T.el + dy * 0.005));
  });
  const end = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch0 = 0; if (!ptrs.size) canvas.classList.remove('grabbing'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('wheel', e => { if (!e.ctrlKey && Math.abs(e.deltaY) < 40 && !e.altKey) return; e.preventDefault(); O.zoom = Math.max(0.45, Math.min(1.6, O.zoom * (1 + e.deltaY * 0.0015))); }, { passive: false });

  let visible = true;
  new IntersectionObserver(e => { visible = e[0].isIntersecting; }, { rootMargin: '150px 0px' }).observe(canvas);

  const m4 = new Matrix4(), v3 = new Vector3(), sc = new Vector3(), q4 = new Quaternion();
  const backOut = t => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function writeStuds() {
    for (const w of allWheels) {
      let any = false;
      for (let i = 0; i < studBase.length; i++) {
        const sb = studBase[i], t = Math.max(0, Math.min(1, (S.stud - sb.delay) / 0.4)), s = t <= 0 ? 0.0001 : backOut(t); if (t > 0) any = true;
        sc.set(1, s, 1); m4.compose(sb.pos, sb.q, sc); w.studs.setMatrixAt(i, m4);
      }
      w.studs.instanceMatrix.needsUpdate = true; w.studs.visible = any;
    }
  }
  const kickBounce = (v) => { if (!reduce) S.bv -= v; };

  let prev = performance.now(), clock = 0, slow = 0, count = 0, pending = null;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!visible || document.hidden) return;
    clock += dt;
    const ext = opts.extra ? opts.extra() : { az: 0, dim: 0 };

    // highway speed: 100 km/h is 82 rad/s at this wheel size. Show the number, blur the wheel, cap the drawn spin.
    S.kmh += ((st.highway ? 100 : 0) - S.kmh) * Math.min(1, dt * (st.highway ? 0.9 : 1.6));
    const sp = S.kmh / 100;
    const target = reduce ? 0 : (0.6 + sp * 24) * (S.swap ? 1 : 1);
    S.vel += (target - S.vel) * Math.min(1, dt * 3);
    S.ang -= S.vel * dt;
    M.blur.opacity = Math.min(0.92, Math.max(0, (sp - 0.12) * 1.25));

    // rim swap: shrink and spin out, rebuild, spring back in
    if (S.swap) {
      const p = (now / 1000 - S.swap.t) / 0.7;
      for (const [i, w] of allWheels.entries()) {
        const lp = Math.max(0, Math.min(1, p - (i % 4) * 0.06));
        const s = lp < 0.5 ? 1 - lp * 2 * 0.9 : 0.1 + backOut((lp - 0.5) * 2) * 0.9;
        w.rimG.scale.setScalar(s); w.rimG.rotation.z = -lp * Math.PI * 3;
        if (lp >= 0.5 && w.rimStyle !== st.rim) { fillRim(w.rimG, st.rim); w.rimStyle = st.rim; }
      }
      if (p >= 1.2) { for (const w of allWheels) { w.rimG.scale.setScalar(1); w.rimG.rotation.z = 0; } S.swap = null; }
    }
    // studs
    if (S.stud !== S.studT * 2 || S.studDirty) { S.stud += Math.sign(S.studT * 2 - S.stud) * dt * 1.6; if (Math.abs(S.stud - S.studT * 2) < 0.03) S.stud = S.studT * 2; S.studDirty = false; writeStuds(); }

    // suspension: damped spring on the body (stiffness 180, damping 16)
    S.bv += (-180 * S.bounce - 16 * S.bv) * dt; S.bounce += S.bv * dt;
    const rumble = sp > 0.3 && !reduce ? Math.sin(clock * 47) * 0.0025 * sp : 0;
    for (const c of both) { c.body.position.y = S.bounce + rumble; c.body.rotation.z = S.bv * 0.004; for (const w of c.wheels) w.spin.rotation.z = S.ang; }

    // paint
    if (S.paintMix < 1) { S.paintMix = Math.min(1, S.paintMix + dt / 0.6); const k = S.paintMix * S.paintMix * (3 - 2 * S.paintMix);
      M.paint.color.copy(S.paintFrom).lerp(S.paintTo, k); M.paint.metalness = S.pFrom.metalness + (S.pTo.metalness - S.pFrom.metalness) * k; M.paint.roughness = S.pFrom.roughness + (S.pTo.roughness - S.pFrom.roughness) * k; }
    // lights
    S.led += (S.ledT - S.led) * Math.min(1, dt * 8); S.glowV += (S.glowT - S.glowV) * Math.min(1, dt * 5);
    M.head.emissiveIntensity = 0.15 + 3.2 * S.led; M.tail.emissiveIntensity = 0.3 + 2.8 * S.led; beamMat.opacity = 0.5 * S.led; beams.visible = S.led > 0.02;
    glowMat.opacity = 0.85 * S.glowV * (0.85 + 0.15 * Math.sin(clock * 2.2)); glow.visible = S.glowV > 0.02;

    // season mood: dry warm asphalt or frosted cold floor
    const wt = S.winter += ((st.season === 'sommar' ? 0 : 1) - S.winter) * Math.min(1, dt * 2.2);
    tmp.copy(WARM).lerp(ICE, wt); mood.color.copy(tmp); ribMat.color.copy(tmp).lerp(new Color(0xffffff), 0.5); lineMat.color.copy(ribMat.color);
    floorMat.color.copy(FLOOR_DRY).lerp(FLOOR_FROST, wt); floorMat.roughness = 0.26 + 0.3 * wt; floorMat.opacity = 0.8 + 0.1 * wt;
    kick.intensity = 60 - 20 * wt; mood.intensity = 70 + 25 * wt;
    snowMat.opacity = Math.min(0.85, wt * 0.85);
    if (wt > 0.02) { for (let i = 0; i < SN; i++) { let y = snowPos[i * 3 + 1] - snowV[i] * dt; snowPos[i * 3] -= (0.08 + sp * 9) * dt; if (snowPos[i * 3] < -6) snowPos[i * 3] += 12; if (y < 0) y = 4; snowPos[i * 3 + 1] = y; } snowGeo.attributes.position.needsUpdate = true; }
    snow.visible = wt > 0.02;

    // wind tunnel: ribs and floor slide past, streaks fly
    const flow = sp * 26 * dt;
    for (const r of tunnel.children) if (r.geometry === ribGeo) { r.position.x -= flow; if (r.position.x < -14.4) r.position.x += RIBS * 1.6; }
    rough.offset.x += flow * 7 / 26;
    streakMat.opacity = Math.max(0, sp - 0.25) * 0.9; streaks.visible = streakMat.opacity > 0.01;
    if (streaks.visible) { for (let i = 0; i < SK; i++) { const s = sk[i]; s.x -= s.v * sp * dt; if (s.x < -11) s.x += 22; q4.identity(); v3.set(s.x, s.y, s.z); sc.set(s.len * (0.3 + sp), 1, 1); m4.compose(v3, q4, sc); streaks.setMatrixAt(i, m4); } streaks.instanceMatrix.needsUpdate = true; }

    // camera: preset target, user orbit, scroll parallax
    if (O.T.fit) { // keep the whole car in frame on narrow screens
      const free = Math.max(120, vh - padT - padB), hf = Math.atan(Math.tan(15 * Math.PI / 180) * vw / free); O.T.distFit = Math.max(O.T.dist, 3.35 / Math.tan(hf));
    } else O.T.distFit = O.T.dist;
    const k = Math.min(1, dt * 4.2);
    const az = O.T.az + ext.az * (1 - O.user);
    O.az += (az - O.az) * k; O.el += (O.T.el - O.el) * k; O.dist += (O.T.distFit * O.zoom - O.dist) * k;
    O.tx += (O.T.tx - O.tx) * k; O.ty += (O.T.ty - O.ty) * k; O.tz += (O.T.tz - O.tz) * k;
    cam.position.set(O.tx + Math.sin(O.az) * Math.cos(O.el) * O.dist, O.ty + Math.sin(O.el) * O.dist, O.tz + Math.cos(O.az) * Math.cos(O.el) * O.dist);
    if (cam.position.y < 0.12) cam.position.y = 0.12;
    cam.lookAt(O.tx, O.ty, O.tz);
    renderer.toneMappingExposure = 1.02 * (1 - 0.45 * ext.dim);

    renderer.render(scene, cam);
    if (opts.onFrame) opts.onFrame();
    if (dpr > 1) { count++; if (dt > 0.024) slow++; if (count >= 90) { if (slow > 40) { dpr = Math.max(1, dpr - 0.35); renderer.setPixelRatio(dpr); resize(true); } count = 0; slow = 0; } }
  }
  requestAnimationFrame(frame);

  const PINS = { wheel: new Vector3(1.42 + 0.1, HUB_Y + 0.12, 0.97), brake: new Vector3(1.42 - 0.13, HUB_Y + 0.19, 0.86) };
  return {
    setSeason(s) { if (s === st.season) return; st.season = s; retexTyre(); S.studT = s === 'dubb' ? 1 : 0; if (reduce) S.stud = S.studT * 2; S.studDirty = true; kickBounce(0.55); S.vel += 10; },
    setRim(r) { if (!RIMS[r] || r === st.rim) return; st.rim = r; if (reduce) { for (const w of allWheels) { fillRim(w.rimG, r); w.rimStyle = r; } } else S.swap = { t: performance.now() / 1000 }; kickBounce(0.7); },
    setPaint(p) { const f = PAINTS[p]; if (!f) return; st.paint = p; S.paintFrom.copy(M.paint.color); S.paintTo.set(f.color); S.pFrom = { metalness: M.paint.metalness, roughness: M.paint.roughness }; S.pTo = f; S.paintMix = reduce ? 1 : 0; if (reduce) { M.paint.color.set(f.color); } },
    setLights(on) { st.leds = !!on; S.ledT = on ? 1 : 0; },
    setGlow(on) { st.glow = !!on; S.glowT = on ? 1 : 0; },
    setHighway(on) { st.highway = !!on; },
    kmh() { return S.kmh; },
    setPad(t, b) { if (t === padT && b === padB) return; padT = t; padB = b; applyView(); },
    view(name) { const p = PRESETS[name]; if (!p) return; Object.assign(O.T, p); O.user = 0; O.zoom = 1; },
    dragged() { return dragged; },
    _rims() { return allWheels.map(w => [w.rimStyle, w.rimG.children.length, +w.rimG.scale.x.toFixed(2), w.rimG.visible]); },
    project(name) {
      const v = PINS[name]; if (!v) return null;
      const n = new Vector3(0, 0, 1), camDir = new Vector3().subVectors(cam.position, v).normalize();
      const facing = camDir.dot(n);
      const p = v.clone().project(cam);
      return { x: (p.x * 0.5 + 0.5) * vw, y: (-p.y * 0.5 + 0.5) * vh, ok: p.z < 1 && facing > 0.15 };
    }
  };
}
