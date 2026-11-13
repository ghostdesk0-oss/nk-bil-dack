import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Vector2, Vector3, LatheGeometry, MeshStandardMaterial, MeshPhysicalMaterial,
  MeshBasicMaterial, Mesh, CanvasTexture, CylinderGeometry, Shape, Path, ExtrudeGeometry, PMREMGenerator, PlaneGeometry,
  DirectionalLight, PointLight, Color, SRGBColorSpace, ACESFilmicToneMapping, BoxGeometry, TorusGeometry, InstancedMesh,
  DoubleSide, BackSide, RepeatWrapping, SphereGeometry, AdditiveBlending, Matrix4, Quaternion, Points, BufferGeometry,
  BufferAttribute, PointsMaterial
} from 'three';

const FINISH = {
  silver: { color: 0xd4d8dd, metalness: 1, roughness: 0.2, clearcoat: 0 },
  black: { color: 0x0b0a0b, metalness: 0.9, roughness: 0.34, clearcoat: 0.9 },
  red: { color: 0xb30a20, metalness: 0.78, roughness: 0.3, clearcoat: 1 },
  orange: { color: 0xff5412, metalness: 0.45, roughness: 0.36, clearcoat: 1 }
};
export const STUD_ROWS = [0.1, 0.27, 0.73, 0.9], STUD_M = 42;
export const studU = (row, i) => ((i + row * 0.37) % STUD_M) / STUD_M;

/* Tread and sidewall, drawn per season. Returns a height map and a colour map. */
export function tyreTextures(size, text, season, K) {
  const W = Math.round(2048 * K), H = Math.round(512 * K);
  const h = document.createElement('canvas'); h.width = W; h.height = H;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const a = h.getContext('2d'), b = c.getContext('2d');
  a.fillStyle = '#8c8c8c'; a.fillRect(0, 0, W, H);
  b.fillStyle = '#121212'; b.fillRect(0, 0, W, H);
  const t0 = H * 0.3, t1 = H * 0.7, mid = H / 2, th = t1 - t0;
  a.fillStyle = '#d6d6d6'; a.fillRect(0, t0, W, th);
  b.fillStyle = '#181818'; b.fillRect(0, t0, W, th);
  for (const ctx of [a, b]) {
    const groove = ctx === a ? '#000' : '#020202', sipe = ctx === a ? '#3c3c3c' : '#0a0a0a';
    ctx.lineCap = 'butt'; ctx.strokeStyle = groove;
    const ring = (f, w) => { const y = t0 + th * f; ctx.lineWidth = w * K; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); };
    if (season === 'sommar') {
      [0.2, 0.4, 0.6, 0.8].forEach(f => ring(f, 17));
      const N = 46, step = W / N; ctx.lineWidth = 6 * K;
      for (let i = -1; i <= N; i++) {
        const x = i * step;
        ctx.beginPath(); ctx.moveTo(x + step * 0.5, t0 - 8 * K); ctx.lineTo(x, t0 + th * 0.17); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + step * 0.5, t1 + 8 * K); ctx.lineTo(x, t1 - th * 0.17); ctx.stroke();
      }
      ctx.strokeStyle = sipe; ctx.lineWidth = 2 * K;
      for (let i = 0; i < N * 2; i++) { const x = i * step / 2; for (const f of [0.3, 0.5, 0.7]) { const y = t0 + th * f; ctx.beginPath(); ctx.moveTo(x, y - 12 * K); ctx.lineTo(x + 10 * K, y + 12 * K); ctx.stroke(); } }
    } else {
      const N = season === 'dubb' ? 52 : 64, step = W / N;
      ctx.lineWidth = (season === 'dubb' ? 11 : 9) * K;
      for (let i = -1; i <= N; i++) { const x = i * step; ctx.beginPath(); ctx.moveTo(x + step * 0.95, t0 - 6 * K); ctx.lineTo(x, mid); ctx.lineTo(x + step * 0.95, t1 + 6 * K); ctx.stroke(); }
      (season === 'dubb' ? [0.5] : [0.27, 0.5, 0.73]).forEach(f => ring(f, 12));
      // sipes: the fine zigzag cuts that give winter tyres their grip
      ctx.strokeStyle = sipe; ctx.lineWidth = 1.6 * K;
      const rows = season === 'dubb' ? 3 : 5;
      for (let i = -1; i <= N; i++) for (let r = 1; r <= rows; r++) {
        const x = i * step + (r / (rows + 1)) * step * 0.95;
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          for (let s = 0; s <= 8; s++) { const yy = mid + dir * (th * 0.06 + (th * 0.4) * (s / 8)); const xx = x + (th * 0.4 * (s / 8)) * (step * 0.95 / (th * 0.5)) + (s % 2 ? 3 : -3) * K; s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
          ctx.stroke();
        }
      }
      if (season === 'dubb') {
        STUD_ROWS.forEach((f, row) => { for (let i = 0; i < STUD_M; i++) { const x = studU(row, i) * W, y = t1 - th * f; ctx.fillStyle = ctx === a ? '#ffffff' : '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y, 9 * K, 0, 7); ctx.fill(); ctx.fillStyle = ctx === a ? '#000' : '#050505'; ctx.beginPath(); ctx.arc(x, y, 5 * K, 0, 7); ctx.fill(); } });
      }
    }
    ctx.lineWidth = 2 * K; ctx.strokeStyle = ctx === a ? '#5a5a5a' : '#0c0c0c';
    for (const y of [t0 - 16 * K, t0 - 24 * K, t1 + 16 * K, t1 + 24 * K, 18 * K, H - 18 * K]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }
  // roughness map: white rubber, slightly glossier letters so the text reads as molded in
  const r = document.createElement('canvas'); r.width = W; r.height = H;
  const rc = r.getContext('2d'); rc.fillStyle = '#ffffff'; rc.fillRect(0, 0, W, H);
  // letters follow a gentle circular arc, like lettering molded around the sidewall
  const letter = (txt, u, font, hCol, cCol) => {
    const chars = [...txt]; if (!chars.length) return;
    a.save(); a.font = font;
    let ws = chars.map(ch => a.measureText(ch).width);
    a.restore();
    const fit = Math.min(1, (2048 * 0.44) / ws.reduce((x, y) => x + y, 0));
    ws = ws.map(w => w * fit * 0.8 * K);
    const R = H * 1.15, total = ws.reduce((x, y) => x + y, 0) / R;
    let ang = -total / 2;
    const cx = u * W, cy = t0 * 0.5;
    chars.forEach((ch, i) => {
      const mid = ang + ws[i] / R / 2; ang += ws[i] / R;
      const px = cx + Math.sin(mid) * R, py = cy - R * (1 - Math.cos(mid));
      for (const [ctx, col] of [[a, hCol], [b, cCol], [rc, '#c9c9c9']]) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI + mid); ctx.scale(0.8 * K * fit, 1.05 * K * fit);
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(ch, 0, 0); ctx.restore();
      }
    });
  };
  const big = 'italic 900 64px Archivo, Arial Black, sans-serif', small = '700 40px Archivo, Arial, sans-serif';
  letter(text, 0.25, big, '#ffffff', '#ecebe7'); letter(text, 0.75, big, '#ffffff', '#ecebe7');
  for (const u of [0, 0.5, 1]) letter(size, u, small, '#f0f0f0', '#2c2c2c');
  const bump = new CanvasTexture(h), map = new CanvasTexture(c), rough = new CanvasTexture(r);
  map.colorSpace = SRGBColorSpace;
  for (const t of [bump, map, rough]) { t.wrapS = RepeatWrapping; t.anisotropy = 8; }
  return { bump, map, rough };
}

export function softDisc(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

export function concrete() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#5a5a5a'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const v = 60 + Math.random() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v},${0.18 + Math.random() * 0.3})`; const s = 1 + Math.random() * 5; g.fillRect(Math.random() * 512, Math.random() * 512, s, s * (0.4 + Math.random())); }
  for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(150,150,150,${0.05 + Math.random() * 0.1})`; g.lineWidth = 6 + Math.random() * 30; g.beginPath(); const y = Math.random() * 512; g.moveTo(-20, y); g.bezierCurveTo(150, y + 40 * (Math.random() - 0.5), 350, y + 40 * (Math.random() - 0.5), 540, y + 30 * (Math.random() - 0.5)); g.stroke(); }
  g.strokeStyle = 'rgba(20,20,20,.9)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 256); g.lineTo(512, 256); g.moveTo(256, 0); g.lineTo(256, 512); g.stroke();
  const t = new CanvasTexture(c); t.wrapS = t.wrapT = RepeatWrapping; t.repeat.set(3, 3); t.anisotropy = 8; return t;
}

export const tyreProfile = t => {
  if (t < 0.3) { const s = t / 0.3; return [0.665 + 0.3 * Math.pow(s, 0.85), -(0.285 + 0.06 * Math.sin(Math.PI * Math.pow(s, 0.8)))]; }
  if (t <= 0.7) { const u = (t - 0.3) / 0.4; return [0.965 + 0.035 * Math.pow(Math.sin(Math.PI * u), 0.3), -0.285 + 0.57 * u]; }
  const s = (1 - t) / 0.3; return [0.665 + 0.3 * Math.pow(s, 0.85), 0.285 + 0.06 * Math.sin(Math.PI * Math.pow(s, 0.8))];
};
const prof = tyreProfile;

function buildWheel(size, text, season, K) {
  const spin = new Group(), rimG = new Group(), brakeG = new Group(), tyreG = new Group();
  spin.name = 'spin'; tyreG.name = 'tyreG'; spin.add(tyreG); spin.add(rimG); spin.add(brakeG);
  const pts = [], n = 60;
  for (let i = 0; i <= n; i++) { const p = prof(i / n); pts.push(new Vector2(p[0], p[1])); }
  const tex = tyreTextures(size, text, season, K);
  const tyreMat = new MeshStandardMaterial({ color: 0xffffff, map: tex.map, bumpMap: tex.bump, bumpScale: 1.6, roughnessMap: tex.rough, roughness: 0.86, metalness: 0 });
  const tyre = new Mesh(new LatheGeometry(pts, 160), tyreMat); tyre.rotation.x = Math.PI / 2; tyreG.add(tyre);

  // studs: one instanced mesh, popped out with a wave around the tread
  const studMat = new MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.25 });
  const studs = new InstancedMesh(new CylinderGeometry(0.007, 0.01, 0.022, 6), studMat, STUD_ROWS.length * STUD_M);
  studs.name = 'studs'; studs.visible = false; tyreG.add(studs);
  const studBase = [], up = new Vector3(0, 1, 0);
  STUD_ROWS.forEach((f, row) => { for (let i = 0; i < STUD_M; i++) {
    const phi = studU(row, i) * Math.PI * 2, p = prof(0.3 + 0.4 * f), dir = new Vector3(Math.sin(phi), -Math.cos(phi), 0);
    studBase.push({ pos: dir.clone().multiplyScalar(p[0] + 0.002).setZ(p[1]), q: new Quaternion().setFromUnitVectors(up, dir), delay: (i / STUD_M) * 0.55 + row * 0.04 });
  } });

  const rimMat = new MeshPhysicalMaterial({ ...FINISH.silver, clearcoatRoughness: 0.06, side: DoubleSide, envMapIntensity: 1.2 });
  const bp = [[0.665, -0.3], [0.695, -0.325], [0.665, -0.34], [0.64, -0.3], [0.62, -0.12], [0.55, 0.0], [0.615, 0.14], [0.632, 0.27], [0.64, 0.33], [0.668, 0.352], [0.7, 0.335], [0.668, 0.3]].map(p => new Vector2(p[0], p[1]));
  const barrel = new Mesh(new LatheGeometry(bp, 96), rimMat); barrel.rotation.x = Math.PI / 2; rimG.add(barrel);
  const face = new Shape(); face.absarc(0, 0, 0.642, 0, Math.PI * 2, false);
  const half = 0.058, ri = 0.215, ro = 0.565, sect = (Math.PI * 2) / 5;
  for (let k = 0; k < 5; k++) {
    const a0 = k * sect + Math.PI / 2, a1 = a0 + sect, di = Math.asin(half / ri), dO = Math.asin(half / ro), hole = new Path();
    hole.absarc(0, 0, ro, a0 + dO, a1 - dO, false); hole.absarc(0, 0, ri, a1 - di, a0 + di, true); hole.closePath(); face.holes.push(hole);
  }
  const faceGeo = new ExtrudeGeometry(face, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.028, bevelSize: 0.018, bevelSegments: 4, curveSegments: 40 });
  { const p = faceGeo.attributes.position; for (let i = 0; i < p.count; i++) { const r = Math.min(1, Math.hypot(p.getX(i), p.getY(i)) / 0.642); p.setZ(i, p.getZ(i) - 0.13 * Math.pow(1 - r, 1.3)); } faceGeo.computeVertexNormals(); }
  const spokes = new Mesh(faceGeo, rimMat); spokes.position.z = 0.225; rimG.add(spokes);
  const hub = new Mesh(new CylinderGeometry(0.19, 0.21, 0.09, 48), rimMat); hub.rotation.x = Math.PI / 2; hub.position.z = 0.215; rimG.add(hub);
  const dark = new MeshStandardMaterial({ color: 0x1a1a1a, metalness: 1, roughness: 0.3 });
  for (let k = 0; k < 5; k++) { const a = k * sect + Math.PI / 2 + sect / 2, nut = new Mesh(new CylinderGeometry(0.03, 0.034, 0.06, 6), dark); nut.rotation.x = Math.PI / 2; nut.position.set(Math.cos(a) * 0.128, Math.sin(a) * 0.128, 0.262); rimG.add(nut); }
  const cap = new Mesh(new SphereGeometry(0.075, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new MeshStandardMaterial({ color: 0xe4102a, metalness: 0.3, roughness: 0.35 }));
  cap.rotation.x = Math.PI / 2; cap.scale.y = 0.35; cap.position.z = 0.258; rimG.add(cap);
  const valve = new Mesh(new CylinderGeometry(0.012, 0.012, 0.08, 8), dark); valve.position.set(0.61, 0, 0.3); valve.rotation.x = Math.PI / 2; rimG.add(valve);

  const discMat = new MeshStandardMaterial({ color: 0x77797c, metalness: 1, roughness: 0.42 });
  const dc = document.createElement('canvas'); dc.width = dc.height = 512; { const g = dc.getContext('2d'); g.fillStyle = '#b9bbbe'; g.fillRect(0, 0, 512, 512);
    g.strokeStyle = 'rgba(0,0,0,.10)'; for (let r = 96; r < 250; r += 5) { g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
    g.fillStyle = '#0a0a0a'; for (let k = 0; k < 30; k++) for (let j = 0; j < 3; j++) { const a = k / 30 * Math.PI * 2 + j * 0.07, r = 138 + j * 38; g.beginPath(); g.arc(256 + Math.cos(a) * r, 256 + Math.sin(a) * r, 6, 0, 7); g.fill(); } }
  const dTex = new CanvasTexture(dc); dTex.colorSpace = SRGBColorSpace; dTex.anisotropy = 8;
  const discFace = new MeshStandardMaterial({ color: 0xffffff, map: dTex, metalness: 1, roughness: 0.34 });
  const disc = new Mesh(new CylinderGeometry(0.52, 0.52, 0.045, 72), [discMat, discFace, discFace]); disc.rotation.x = Math.PI / 2; disc.position.z = 0.08; brakeG.add(disc);
  for (let k = 0; k < 5; k++) { const a = k * sect + Math.PI / 2 + sect / 2, stud = new Mesh(new CylinderGeometry(0.018, 0.018, 0.17, 10), discMat); stud.rotation.x = Math.PI / 2; stud.position.set(Math.cos(a) * 0.128, Math.sin(a) * 0.128, 0.2); brakeG.add(stud); }
  const bell = new Mesh(new CylinderGeometry(0.19, 0.23, 0.1, 40), new MeshStandardMaterial({ color: 0x4a4c50, metalness: 1, roughness: 0.38 })); bell.rotation.x = Math.PI / 2; bell.position.z = 0.12; brakeG.add(bell);

  const fixed = new Group();
  const cs = new Shape(); cs.absarc(0, 0, 0.56, -0.15, 0.75, false); cs.absarc(0, 0, 0.33, 0.75, -0.15, true); cs.closePath();
  const cal = new Mesh(new ExtrudeGeometry(cs, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 16 }), new MeshPhysicalMaterial({ color: 0xe4102a, metalness: 0.3, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.1 }));
  cal.position.z = 0.03; fixed.add(cal);
  return { spin, fixed, rimMat, tyreG, tyreMat, rimG, brakeG, cal, studs, studBase, discMats: [discMat, discFace] };
}

export function studioEnv(renderer) {
  const sc = new Scene();
  const box = (w, h, d, x, y, z, r, g, b) => { const m = new MeshBasicMaterial({ side: DoubleSide }); m.color.setRGB(r, g, b); m.toneMapped = false; const o = new Mesh(new BoxGeometry(w, h, d), m); o.position.set(x, y, z); sc.add(o); };
  sc.add(new Mesh(new SphereGeometry(30, 16, 12), new MeshBasicMaterial({ color: 0x0a0a0b, side: BackSide })));
  box(14, 0.2, 5, 0, 9, 2, 9, 9, 9); box(0.3, 10, 1.6, -9, 2, 4, 14, 14, 14); box(0.3, 10, 1.2, 9, 1, 6, 10, 10, 10);
  box(8, 0.5, 0.2, 0, -1, 11, 5, 5, 5); box(0.3, 8, 1.4, 7, 0, -8, 10, 0.3, 0.5); box(0.3, 6, 1.2, -8, 3, -7, 6, 0.2, 0.3);
  box(40, 0.1, 40, 0, -6, 0, 0.12, 0.12, 0.13);
  const pm = new PMREMGenerator(renderer), t = pm.fromScene(sc, 0.03).texture; pm.dispose(); return t;
}

export function mount(canvas, opts = {}) {
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  const coarse = window.matchMedia('(pointer: coarse)').matches, K = coarse ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, 2); renderer.setPixelRatio(dpr);
  const scene = new Scene(); scene.environment = studioEnv(renderer);
  const FOV = 26, DIST = 9, cam = new PerspectiveCamera(FOV, 1, 0.1, 80); cam.position.set(0, 0, DIST);

  // lights follow the wheel; their colour temperature is driven by the page
  const lights = new Group(); scene.add(lights);
  const key = new DirectionalLight(0xffffff, 1.0); key.position.set(-2, 3, 4); lights.add(key); lights.add(key.target);
  const kick = new PointLight(0xff2238, 52, 14); kick.position.set(3, -0.4, -2); lights.add(kick);
  const mood = new PointLight(0xffa24a, 46, 16); mood.position.set(-3.2, 1.6, 2.6); lights.add(mood);
  const back = new PointLight(0xffa24a, 34, 14); back.position.set(-2.6, 2.2, -2.4); lights.add(back);
  const WARM = new Color(0xffa040), ICE = new Color(0x86cdff), tempC = new Color();

  let size = opts.size || '205/55 R16 91V', text = opts.text || 'NK BIL & DÄCK', season = opts.season || 'friktion';
  const w = buildWheel(size, text, season, K);
  for (const m of w.discMats) { m.emissive.set(0xff3800); m.emissiveIntensity = 0; }
  const axle = new Group(), yawG = new Group(), tiltG = new Group(), root = new Group();
  axle.add(w.spin); axle.add(w.fixed); yawG.add(axle); tiltG.add(yawG); root.add(tiltG); scene.add(root);
  const calZ = w.cal.position.z;

  // mirrored twin under the floor: the reflection in the polished concrete
  const mRoot = new Group(), mTilt = new Group(), mYaw = yawG.clone(true);
  mRoot.scale.y = -1; mRoot.position.y = -2; mTilt.add(mYaw); mRoot.add(mTilt); root.add(mRoot);
  const mSpin = mYaw.getObjectByName('spin'); { const ms = mYaw.getObjectByName('studs'); if (ms) ms.visible = false; }

  // floor, contact shadow, fog banks
  const floorMat = new MeshStandardMaterial({ color: 0x191415, roughness: 0.3, metalness: 0.35, roughnessMap: concrete(), alphaMap: softDisc(256, [[0, '#fff'], [0.55, '#fff'], [1, '#000']]), transparent: true, opacity: 0.84, depthWrite: false, envMapIntensity: 0.9 });
  const floor = new Mesh(new PlaneGeometry(22, 22), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.y = -1; floor.renderOrder = 1; root.add(floor);
  const shadowMat = new MeshBasicMaterial({ map: softDisc(128, [[0, 'rgba(0,0,0,.95)'], [0.5, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false });
  const shadow = new Mesh(new PlaneGeometry(2.4, 1.3), shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.995; shadow.renderOrder = 2; root.add(shadow);
  const fogTex = softDisc(128, [[0, 'rgba(255,255,255,.55)'], [0.4, 'rgba(255,255,255,.2)'], [1, 'rgba(255,255,255,0)']]);
  const fogs = [[-1.9, -0.55, -1.4, 3.6], [2.0, -0.5, -1.8, 4.0], [0.3, -0.8, 1.3, 2.8], [-2.8, -0.1, -2.6, 4.6]].map((f, i) => {
    const m = new Mesh(new PlaneGeometry(f[3], f[3] * 0.6), new MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.1 }));
    m.position.set(f[0], f[1], f[2]); m.userData = { x: f[0], ph: i * 1.7 }; m.renderOrder = 3; root.add(m); return m;
  });

  // snow
  const SN = coarse ? 150 : 240, snowPos = new Float32Array(SN * 3), snowV = new Float32Array(SN);
  for (let i = 0; i < SN; i++) { snowPos[i * 3] = (Math.random() - 0.5) * 7; snowPos[i * 3 + 1] = -2.6 + Math.random() * 5.2; snowPos[i * 3 + 2] = -2 + Math.random() * 5.5; snowV[i] = 0.35 + Math.random() * 0.6; }
  const snowGeo = new BufferGeometry(); snowGeo.setAttribute('position', new BufferAttribute(snowPos, 3));
  const snowMat = new PointsMaterial({ map: softDisc(64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,.5)'], [1, 'rgba(255,255,255,0)']]), size: 0.075, transparent: true, depthWrite: false, opacity: 0, sizeAttenuation: true });
  const snow = new Points(snowGeo, snowMat); snow.renderOrder = 4; snow.visible = false; scene.add(snow);

  // laser scan ring
  const laserMat = new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false }); laserMat.color.setRGB(3, 0.5, 0.35); laserMat.toneMapped = false;
  const laser = new Mesh(new TorusGeometry(1.035, 0.012, 8, 96), laserMat);
  const bandMat = new MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
  const band = new Mesh(new CylinderGeometry(1.03, 1.03, 0.14, 64, 1, true), bandMat); band.rotation.x = Math.PI / 2;
  const laserG = new Group(); laserG.add(laser); laserG.add(band); laserG.visible = false; axle.add(laserG);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, pose = opts.pose;
  const C = { x: 0, y: 0, d: 0, yaw: -0.62, pitch: 0, e: 0, f: 1, temp: 0, snow: 0, floor: 1, cam: 0.15, init: false };
  const S = { ang: 0, vel: 0, entry: reduce ? 0 : 1, t0: 0, user: 0, drag: null, rev: false, heat: 0, px: 0, py: 0, sx: 0, sy: 0, vx: 0, vy: 0,
    from: new Color(FINISH.silver.color), to: new Color(FINISH.silver.color), mix: 1, fFrom: FINISH.silver, fTo: FINISH.silver,
    stud: season === 'dubb' ? 2 : 0, studT: season === 'dubb' ? 1 : 0, studDirty: true, scan: null };
  let vw = 1, vh = 1; const P = { x: 0, y: 0, d: 0 };
  function resize(force) {
    const nw = canvas.clientWidth || window.innerWidth, nh = canvas.clientHeight || window.innerHeight;
    if (force !== true && nw === vw && nh === vh) return;
    vw = nw; vh = nh; renderer.setSize(vw, vh, false); cam.aspect = vw / vh; cam.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize); resize();
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => { const dy = window.scrollY - lastY; lastY = window.scrollY; if (!reduce) S.vel += Math.max(-2.5, Math.min(2.5, dy * 0.012)); }, { passive: true });
  window.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { S.px = e.clientX / vw - 0.5; S.py = e.clientY / vh - 0.5; } }, { passive: true });

  const M4 = new Matrix4(), V3 = new Vector3(), SC = new Vector3(), backOut = t => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  function writeStuds() {
    let any = false;
    for (let i = 0; i < w.studBase.length; i++) {
      const sb = w.studBase[i], t = Math.max(0, Math.min(1, (S.stud - sb.delay) / 0.4)), s = t <= 0 ? 0.0001 : backOut(t); if (t > 0) any = true;
      SC.set(1, s, 1); V3.copy(sb.pos); M4.compose(V3, sb.q, SC); w.studs.setMatrixAt(i, M4);
    }
    w.studs.instanceMatrix.needsUpdate = true; w.studs.visible = any;
  }
  writeStuds();

  let prev = performance.now(), started = false, wasActive = true, slow = 0, count = 0, clock = 0, extVis = true;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now; clock += dt;
    const T = pose();
    if (!extVis || !T || !T.active || document.hidden) { if (wasActive) { renderer.clear(); wasActive = false; } return; }
    wasActive = true;
    if (!started) { started = true; S.t0 = now; }
    const k = C.init ? Math.min(1, dt * (T.snap || 6)) : 1; C.init = true;
    for (const key of ['x', 'y', 'd', 'yaw', 'pitch', 'e', 'f', 'temp', 'snow', 'floor', 'cam']) { const tv = T[key] == null ? (key === 'floor' ? 0 : key === 'f' ? 1 : 0) : T[key]; C[key] += (tv - C[key]) * k; }
    const wpp = 2 * DIST * Math.tan(FOV * Math.PI / 360) / vh;
    let ex = 0;
    if (S.entry > 0) { const p = Math.min(1, (now - S.t0) / 1700), ease = 1 - Math.pow(2, -9 * p), n = p < 1 ? 1 - ease : 0; S.ang += (S.entry - n) * 4.2; S.entry = n; ex = n * 4.2; }
    const scanning = S.scan && clock - S.scan.t < 1.9;
    if ((S.rev || scanning) && !reduce) S.vel += ((scanning ? 26 : 48) - S.vel) * Math.min(1, dt * (scanning ? 4 : 1.1));
    else {
      const tgt = reduce ? 0 : T.spin || 0;
      // released from a burnout: spin down with exponential inertia instead of a linear pull
      if (S.vel > tgt + 0.6) S.vel = Math.max(tgt, S.vel * Math.exp(-1.8 * dt));
      else S.vel += (tgt - S.vel) * Math.min(1, dt * 1.5);
    }
    S.ang += S.vel * dt;
    // brake rotor heat: builds while the tyre is lit up, glows orange-red, cools gradually
    if (!reduce && (S.rev || S.vel > 26)) S.heat = Math.min(1, S.heat + dt * 0.7);
    S.heat *= Math.exp(-0.5 * dt);
    for (const m of w.discMats) m.emissiveIntensity = S.heat * 1.8;
    if (!S.drag) S.user += (0 - S.user) * Math.min(1, dt * (T.e > 0.05 || T.lock ? 6 : 0.6));
    // cursor spring: slightly under-damped so the wheel settles with a little weight
    const stiff = 70, damp = 10;
    S.vx += (stiff * (S.px - S.sx) - damp * S.vx) * dt; S.sx += S.vx * dt;
    S.vy += (stiff * (S.py - S.sy) - damp * S.vy) * dt; S.sy += S.vy * dt;
    if (S.mix < 1) {
      S.mix = Math.min(1, S.mix + dt / 0.5); const q = S.mix * S.mix * (3 - 2 * S.mix);
      w.rimMat.color.copy(S.from).lerp(S.to, q);
      for (const p of ['metalness', 'roughness', 'clearcoat']) w.rimMat[p] = S.fFrom[p] + (S.fTo[p] - S.fFrom[p]) * q;
    }
    // studs
    if (S.stud !== S.studT * 2 || S.studDirty) { S.stud += Math.sign(S.studT * 2 - S.stud) * dt * 1.6; if (Math.abs(S.stud - S.studT * 2) < 0.03) S.stud = S.studT * 2; S.studDirty = false; writeStuds(); }

    const sc = (C.d * wpp) / 2, free = (1 - C.e) * (T.lock ? 0 : 1);
    const shake = Math.max(0, Math.abs(S.vel) - 30) * 0.0009 * sc * (1 + S.heat * 0.8); // rpm-scaled micro shake
    root.position.set((C.x - vw / 2) * wpp + ex * sc + (Math.random() - 0.5) * shake, -(C.y - vh / 2) * wpp + (Math.random() - 0.5) * shake, 0);
    P.x = C.x + ex * sc / wpp; P.y = C.y; P.d = C.d;
    root.scale.setScalar(sc); root.rotation.x = C.cam + S.sy * 0.16 * free;
    tiltG.rotation.x = C.pitch; yawG.rotation.y = C.yaw + S.user + S.sx * 0.5 * free;
    w.spin.rotation.z = S.ang;
    const TZ = 1.2, BZ = -0.85, e = C.e, gap = Math.max(0, C.f - 1) * 0.8;
    w.tyreG.position.z = (TZ + gap) * e; w.rimG.position.z = gap * e; w.brakeG.position.z = BZ * e; w.cal.position.z = calZ + BZ * e;
    axle.position.z = -(C.f <= 1 ? TZ * (1 - C.f) : BZ * (C.f - 1)) * e;
    lights.position.copy(root.position);

    // colour temperature: warm garage amber to icy Nordic blue
    tempC.copy(WARM).lerp(ICE, C.temp); mood.color.copy(tempC); back.color.copy(tempC); key.color.setRGB(1, 0.96 - 0.02 * C.temp + 0.04, 0.9 + 0.1 * C.temp);
    mood.intensity = 46 + 20 * C.temp; back.intensity = 34 + 22 * C.temp; kick.intensity = 52 - 26 * C.temp;

    // floor, reflection, fog
    const fl = C.floor; floor.visible = shadow.visible = mRoot.visible = fl > 0.02;
    floorMat.opacity = 0.84 * fl; shadowMat.opacity = fl;
    if (mRoot.visible) { mTilt.rotation.x = C.pitch; mYaw.rotation.y = yawG.rotation.y; mSpin.rotation.z = S.ang; }
    for (const f of fogs) { f.visible = fl > 0.02; f.material.opacity = (0.07 + 0.05 * C.temp) * fl; f.material.color.copy(tempC).lerp(new Color(0xffffff), 0.35); f.position.x = f.userData.x + Math.sin(clock * 0.12 + f.userData.ph) * 0.5; }

    // snow
    snow.visible = C.snow > 0.02; snowMat.opacity = Math.min(0.9, C.snow);
    if (snow.visible) { for (let i = 0; i < SN; i++) { let y = snowPos[i * 3 + 1] - snowV[i] * dt; snowPos[i * 3] += Math.sin(clock * 0.7 + i) * 0.12 * dt - 0.1 * dt; if (y < -2.6) { y = 2.6; snowPos[i * 3] = (Math.random() - 0.5) * 7; } snowPos[i * 3 + 1] = y; } snowGeo.attributes.position.needsUpdate = true; }

    // laser sweep
    if (S.scan) {
      const p = (clock - S.scan.t) / 1.9;
      if (p >= 1) { laserG.visible = false; const cb = S.scan.cb; S.scan = null; if (cb) cb(); }
      else { laserG.visible = true; laserG.position.z = Math.cos(p * Math.PI * 3) * 0.4; const fade = Math.sin(Math.min(1, p * 6) * Math.PI / 2) * (p > 0.85 ? (1 - p) / 0.15 : 1); laserMat.opacity = fade; bandMat.opacity = 0.22 * fade; }
    }
    renderer.render(scene, cam);
    if (dpr > 1.25) { count++; if (dt > 0.03) slow++; if (count >= 90) { if (slow > 45) { dpr = Math.max(1.25, dpr - 0.5); renderer.setPixelRatio(dpr); resize(true); } count = 0; slow = 0; } }
  }
  requestAnimationFrame(frame);

  const ANCH = { tread: new Vector3(-0.96, 0.28, 0.02), sidewall: new Vector3(0.05, 0.84, 0.34), rim: new Vector3(0.3, -0.3, 0.3) };
  function retex() { const t = tyreTextures(size, text, season, K); for (const k of ['map', 'bumpMap', 'roughnessMap']) { if (w.tyreMat[k]) w.tyreMat[k].dispose(); } w.tyreMat.map = t.map; w.tyreMat.bumpMap = t.bump; w.tyreMat.roughnessMap = t.rough; w.tyreMat.needsUpdate = true; }
  return {
    setFinish(name) { const f = FINISH[name]; if (!f) return; S.from.copy(w.rimMat.color); S.to.set(f.color); S.fFrom = { metalness: w.rimMat.metalness, roughness: w.rimMat.roughness, clearcoat: w.rimMat.clearcoat }; S.fTo = f; S.mix = 0; if (!reduce) S.vel += 8; },
    setText(t) { text = t || ' '; retex(); },
    setSeason(s) { if (s === season) return; season = s; retex(); S.studT = s === 'dubb' ? 1 : 0; if (reduce) S.stud = S.studT * 2; S.studDirty = true; if (!reduce) S.vel += 5; },
    scan(cb) { S.scan = { t: clock, cb }; },
    project(name) { const a = ANCH[name]; if (!a) return null; V3.copy(a); yawG.localToWorld(V3); const z = V3.z; V3.project(cam); return { x: (V3.x * 0.5 + 0.5) * vw, y: (-V3.y * 0.5 + 0.5) * vh, z }; },
    kick(v) { if (!reduce) S.vel += v; }, rev(on) { S.rev = !!on; }, speed() { return S.vel; }, where() { return P; },
    setVisible(v) { extVis = !!v; },
    bindDrag(el) {
      el.addEventListener('pointerdown', e => { S.drag = { x: e.clientX, u: S.user }; el.setPointerCapture(e.pointerId); el.classList.add('grabbing'); });
      el.addEventListener('pointermove', e => { if (!S.drag) return; S.user = Math.max(-1.3, Math.min(1.3, S.drag.u + (e.clientX - S.drag.x) * 0.008)); S.vel += (e.movementX || 0) * 0.012; });
      const up = () => { S.drag = null; el.classList.remove('grabbing'); };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    }
  };
}
