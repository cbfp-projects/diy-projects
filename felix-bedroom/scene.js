/**
 * Félix bedroom — whole-room 3D. 1 unit = 1 inch.
 * Y up, +Z south into the room, origin at the storage-niche face center.
 * The preexisting storage niche (trays, slab, shelves, can) is imported
 * from `../niche-storage/fitout.js`.
 */

import * as THREE from "../niche/vendor/three.module.min.js";
import { OrbitControls } from "../niche/vendor/OrbitControls.js?v=2";
import {
  DIMS,
  openingTopAff,
  returnEach,
  headerHeight,
  roomLayout,
  closetLayout,
  dresserLayout,
  cribLayout,
  chairLayout,
  trayWidth,
  binCount,
  ROADMAP,
} from "./dims.js?v=4";
import {
  PALETTE,
  FINISH,
  state,
  box,
  mat,
  makeLabel,
  makeTextures,
  addEnvironment,
  buildStorageNiche,
  handleClick,
  tickFitout,
  toggleAllTrays,
  toggleLight,
  toggleLabels,
  togglePerson,
  cycleStyle,
  toggleCurtain,
  applyStyle,
  applyLight,
  setOpacity,
} from "../niche-storage/fitout.js?v=6";

const HOME_CAM = { pos: [92, 148, 248], target: [8, 38, 48] };

let renderer, scene, camera, controls, raycaster, pointer;
let roomLights = null;
let paused = false;
const tap = { x: 0, y: 0 };

export function boot(host) {
  host.style.width = "100%";
  host.style.height = "100%";
  const ready = () => host.clientWidth >= 8 && host.clientHeight >= 8;
  if (ready()) {
    start(host);
    return;
  }
  const ro = new ResizeObserver(() => {
    if (!ready()) return;
    ro.disconnect();
    start(host);
  });
  ro.observe(host);
  setTimeout(() => {
    if (renderer) return;
    ro.disconnect();
    start(host);
  }, 250);
}

function start(host) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d2c6);

  camera = new THREE.PerspectiveCamera(40, 1, 4, 1400);
  camera.position.set(...HOME_CAM.pos);

  const mobile = window.matchMedia("(pointer: coarse)").matches;
  renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2));
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.domElement.style.touchAction = "none";
  host.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...HOME_CAM.target);
  controls.enableDamping = true;
  controls.minDistance = 40;
  controls.maxDistance = 520;
  controls.maxPolarAngle = Math.PI * 0.78;
  controls.enablePan = true;
  controls.zoomSpeed = mobile ? 0.7 : 1;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  makeTextures();
  if (!mobile) {
    try {
      addEnvironment(renderer, scene);
    } catch {
      /* PMREM is optional */
    }
  }
  addLights();
  buildAll();
  fillHud();
  bindUi();

  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", resize);
  new ResizeObserver(resize).observe(host);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    paused = true;
  });
  renderer.domElement.addEventListener("webglcontextrestored", () => {
    paused = false;
    resize();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resize();
  });
  resize();
  tick();
}

function addLights() {
  const ambient = new THREE.AmbientLight(0xfff6ea, 0.48);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a8478, 0.6);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 1.05);
  sun.position.set(110, 160, 200);
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  sun.castShadow = !mobile;
  if (!mobile) {
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -160;
    sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160;
    sun.shadow.camera.bottom = -40;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 480;
  }
  scene.add(sun);

  const east = new THREE.DirectionalLight(0xd8e8ff, 0.35);
  east.position.set(140, 90, 40);
  scene.add(east);

  roomLights = { ambient, hemi, sun, east };
}

function buildAll() {
  const room = new THREE.Group();
  room.name = "felix-bedroom";
  scene.add(room);

  buildFloor(room);
  buildNorthWall(room);
  buildEastWall(room);
  buildSouthWall(room);
  buildWestWall(room);
  buildDoor(room);
  buildStorageNiche(room);
  buildCrib(room);
  buildChair(room);
  buildClearZone(room);
}

function buildFloor(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const plank = 5.25;
  const gap = 0.08;
  const width = r.eastX - r.westX;
  const cx = (r.westX + r.eastX) / 2;
  const under = box(width, 0.2, d.roomDepth, 0x1c140e, { roughness: 0.9 });
  under.position.set(cx, 0.1, d.roomDepth / 2);
  parent.add(under);
  for (let z = 0; z < d.roomDepth - 0.05; z += plank + gap) {
    const depth = Math.min(plank, d.roomDepth - z);
    const board = box(width, 0.55, depth, 0x3a291c, { tex: "wood", roughness: 0.48 });
    board.position.set(cx, 0.45, z + depth / 2);
    parent.add(board);
  }
}

function wallBox(w, h, dpth, x, y, z, wood = false) {
  const m = wood
    ? box(w, h, dpth, 0xb68958, { tex: "wood", roughness: 0.58 })
    : box(w, h, dpth, PALETTE.wall, { tex: "paint", roughness: 0.8 });
  m.position.set(x, y, z);
  return m;
}

function buildNorthWall(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const t = d.wallThick;
  const halfOpen = d.openingWidth / 2;
  const top = openingTopAff(d);
  const headerH = headerHeight(d);
  const closet = closetLayout(d);
  const z = -t / 2;

  const leftSpan = -halfOpen - r.westX;
  parent.add(wallBox(leftSpan, d.ceiling, t, r.westX + leftSpan / 2, d.ceiling / 2, z));

  parent.add(wallBox(d.openingWidth, d.sillAff, t, 0, d.sillAff / 2, z));
  parent.add(wallBox(d.openingWidth, headerH, t, 0, top + headerH / 2, z));

  parent.add(wallBox(d.closetPierFromNiche, d.ceiling, t, halfOpen + d.closetPierFromNiche / 2, d.ceiling / 2, z));
  parent.add(wallBox(d.closetOpeningWidth, headerH, t, closet.entryCx, top + headerH / 2, z));

  const eastSpan = r.eastX - closet.entryRight;
  if (eastSpan > 0.4) {
    parent.add(wallBox(eastSpan, d.ceiling, t, closet.entryRight + eastSpan / 2, d.ceiling / 2, z));
  }
}

function pane(w, h, x, y, z, rx, ry) {
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      color: 0xc5d8ea,
      transparent: true,
      opacity: 0.38,
      roughness: 0.08,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  glass.position.set(x, y, z);
  glass.rotation.set(rx, ry, 0);
  return glass;
}

function windowTrim(parent, w, h, x, y, z, alongZ) {
  const t = 1.5;
  const jamb = alongZ
    ? [
        [t, h, t, x, y, z - w / 2 + t / 2],
        [t, h, t, x, y, z + w / 2 - t / 2],
        [t, t, w, x, y + h / 2 - t / 2, z],
        [t, t, w, x, y - h / 2 + t / 2, z],
      ]
    : [
        [t, h, t, x - w / 2 + t / 2, y, z],
        [t, h, t, x + w / 2 - t / 2, y, z],
        [w, t, t, x, y + h / 2 - t / 2, z],
        [w, t, t, x, y - h / 2 + t / 2, z],
      ];
  jamb.forEach(([bw, bh, bd, px, py, pz]) => {
    const m = box(bw, bh, bd, PALETTE.jamb, { tex: "wood", roughness: 0.45 });
    m.position.set(px, py, pz);
    parent.add(m);
  });
}

function buildEastWall(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const t = d.wallThick;
  const x = r.eastX + t / 2;
  const winZ0 = r.eastWinZ0;
  const winZ1 = winZ0 + d.windowWidth;
  const sill = d.windowSillAff;
  const head = sill + d.windowHeight;
  const midY = sill + d.windowHeight / 2;

  if (winZ0 > 0.4) {
    parent.add(wallBox(t, d.ceiling, winZ0, x, d.ceiling / 2, winZ0 / 2, true));
  }
  parent.add(wallBox(t, sill, d.windowWidth, x, sill / 2, winZ0 + d.windowWidth / 2, true));
  const aboveH = d.ceiling - head;
  if (aboveH > 0.4) {
    parent.add(wallBox(t, aboveH, d.windowWidth, x, head + aboveH / 2, winZ0 + d.windowWidth / 2, true));
  }
  const southLen = r.southZ - winZ1;
  parent.add(wallBox(t, d.ceiling, southLen, x, d.ceiling / 2, winZ1 + southLen / 2, true));

  parent.add(pane(d.windowWidth - 1, d.windowHeight - 1, r.eastX - 0.2, midY, winZ0 + d.windowWidth / 2, 0, Math.PI / 2));
  windowTrim(parent, d.windowWidth, d.windowHeight, r.eastX, midY, winZ0 + d.windowWidth / 2, true);

  const tag = makeLabel(`east window  35″ · 6″ from NE`);
  tag.scale.set(22, 5.5, 1);
  tag.position.set(r.eastX - 8, head + 6, winZ0 + d.windowWidth / 2);
  parent.add(tag);
}

function buildSouthWall(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const t = d.wallThick;
  const z = r.southZ + t / 2;
  const winX0 = r.southWinX0;
  const winX1 = winX0 + d.windowWidth;
  const sill = d.windowSillAff;
  const head = sill + d.windowHeight;
  const midY = sill + d.windowHeight / 2;

  const westLen = winX0 - r.westX;
  parent.add(wallBox(westLen, d.ceiling, t, r.westX + westLen / 2, d.ceiling / 2, z, true));
  parent.add(wallBox(d.windowWidth, sill, t, winX0 + d.windowWidth / 2, sill / 2, z, true));
  const aboveH = d.ceiling - head;
  if (aboveH > 0.4) {
    parent.add(wallBox(d.windowWidth, aboveH, t, winX0 + d.windowWidth / 2, head + aboveH / 2, z, true));
  }
  const eastLen = r.eastX - winX1;
  parent.add(wallBox(eastLen, d.ceiling, t, winX1 + eastLen / 2, d.ceiling / 2, z, true));

  parent.add(pane(d.windowWidth - 1, d.windowHeight - 1, winX0 + d.windowWidth / 2, midY, r.southZ - 0.2, 0, 0));
  windowTrim(parent, d.windowWidth, d.windowHeight, winX0 + d.windowWidth / 2, midY, r.southZ, false);

  const tag = makeLabel(`south window  35″ · 6″ from SW`);
  tag.scale.set(24, 6, 1);
  tag.position.set(winX0 + d.windowWidth / 2, head + 6, r.southZ - 8);
  parent.add(tag);
}

function buildWestWall(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const t = d.wallThick;
  const x = r.westX - t / 2;
  const southLen = r.southZ - d.doorWidth;
  parent.add(wallBox(t, d.ceiling, southLen, x, d.ceiling / 2, d.doorWidth + southLen / 2, true));
  const headerH = d.ceiling - d.doorHeight;
  if (headerH > 0.5) {
    parent.add(wallBox(t, headerH, d.doorWidth, x, d.doorHeight + headerH / 2, d.doorWidth / 2, true));
  }
}

function buildDoor(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const thick = 1.375;
  const leafW = d.doorWidth - 1.25;
  const leafH = d.doorHeight - 1.5;
  // North jamb: the left side when you enter, facing east. Swings into the room.
  const hinge = new THREE.Group();
  hinge.position.set(r.westX + thick / 2, leafH / 2 + 0.5, 0.7);
  const leaf = box(thick, leafH, leafW, 0xf7f4ee, { tex: "paint", roughness: 0.42 });
  leaf.position.set(0, 0, leafW / 2);
  hinge.add(leaf);
  hinge.rotation.y = 0.72;
  parent.add(hinge);

  const knob = box(0.7, 0.7, 0.7, FINISH.brass, { roughness: 0.3, metalness: 0.7 });
  knob.position.set(thick / 2 + 0.2, 0, leafW - 4);
  leaf.add(knob);

  const tag = makeLabel(`door  35″ · hinge left as you enter`);
  tag.scale.set(26, 6.5, 1);
  tag.position.set(r.westX + 20, d.doorHeight + 6, d.doorWidth / 2);
  parent.add(tag);
}

function waveSide(length) {
  const shape = new THREE.Shape();
  shape.moveTo(-length / 2, 1.2);
  shape.lineTo(-length / 2, 16);
  const steps = 40;
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = -length / 2 + t * length;
    const y = 22 + 7.5 * Math.sin((t - 0.2) * Math.PI * 2);
    shape.lineTo(x, Math.min(31.2, y));
  }
  shape.lineTo(length / 2, 16);
  shape.lineTo(length / 2, 1.2);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -0.35);
  const mesh = new THREE.Mesh(geo, mat(0xd4b07a, { tex: "wood", roughness: 0.52 }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.y = Math.PI / 2;
  return mesh;
}

function buildCrib(parent) {
  const d = DIMS;
  const p = cribLayout(d);
  const pine = 0xd4b07a;
  [-1, 1].forEach((sx) => {
    const side = waveSide(d.cribW - 1.4);
    side.position.set(p.x + sx * (d.cribD / 2 - 0.35), 0, p.z);
    parent.add(side);
  });
  [-1, 1].forEach((sz) => {
    const head = box(d.cribD - 1.2, 28, 0.7, pine, { tex: "wood", roughness: 0.5 });
    head.position.set(p.x, 15, p.z + sz * (d.cribW / 2 - 0.35));
    parent.add(head);
  });
  const mattress = box(d.cribD - 3, 5, d.cribW - 3, 0xf4efe4, { roughness: 0.9 });
  mattress.position.set(p.x, 13.5, p.z);
  parent.add(mattress);
  const tag = makeLabel(`Nestig Wave  54×31`);
  tag.scale.set(22, 5.5, 1);
  tag.position.set(p.x - 12, d.cribH + 6, p.z);
  parent.add(tag);
}

function buildChair(parent) {
  const d = DIMS;
  const p = chairLayout(d);
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  g.rotation.y = p.yaw;
  const fabric = 0xc8bfb4;
  const wood = 0x6a4a30;
  const seat = box(d.chairD * 0.7, 5.5, d.chairW * 0.66, fabric, { roughness: 0.88 });
  seat.position.set(0, d.chairSeat, 0);
  g.add(seat);
  const back = box(3.4, d.chairH - d.chairSeat + 2, d.chairW * 0.72, fabric, { roughness: 0.88 });
  back.position.set(d.chairD * 0.42, (d.chairH + d.chairSeat) / 2 - 1, 0);
  g.add(back);
  [-1, 1].forEach((sz) => {
    const wing = box(11, 15, 2.4, fabric, { roughness: 0.88 });
    wing.position.set(d.chairD * 0.28, d.chairH - 11, sz * (d.chairW * 0.34));
    wing.rotation.y = -sz * 0.4;
    g.add(wing);
    const arm = box(d.chairD * 0.52, 3.4, 3.2, fabric, { roughness: 0.88 });
    arm.position.set(-1, d.chairSeat + 4.5, sz * (d.chairW * 0.36));
    g.add(arm);
    [-1, 1].forEach((sx) => {
      const leg = box(1.6, d.chairSeat - 2.5, 1.6, wood, { tex: "wood", roughness: 0.5 });
      leg.position.set(sx * (d.chairD * 0.28), (d.chairSeat - 2.5) / 2, sz * (d.chairW * 0.32));
      g.add(leg);
    });
  });

  const footDist = d.chairD / 2 + 3 + d.footD / 2;
  const foot = box(d.footD, 4.2, d.footW, fabric, { roughness: 0.88 });
  foot.position.set(-footDist, d.footH - 2.1, 0);
  g.add(foot);
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      const leg = box(1.3, d.footH - 4.2, 1.3, wood, { tex: "wood", roughness: 0.5 });
      leg.position.set(-footDist + sx * (d.footD / 2 - 2), (d.footH - 4.2) / 2, sz * (d.footW / 2 - 1.6));
      g.add(leg);
    });
  });

  const tag = makeLabel(`OSKARSHAMN + footstool`);
  tag.scale.set(26, 6.5, 1);
  tag.position.set(-8, d.chairH + 6, 0);
  g.add(tag);
  parent.add(g);
}

function buildClearZone(parent) {
  const d = DIMS;
  const zone = box(d.openingWidth + 8, 0.15, 44, 0xb7c4a8, { roughness: 1, transparent: true, opacity: 0.28 });
  zone.position.set(0, 0.15, 22);
  parent.add(zone);
  const tag = makeLabel(`tray clear  ~44″`);
  tag.scale.set(16, 4, 1);
  tag.position.set(0, 2, 22);
  parent.add(tag);
}

function fillHud() {
  const d = DIMS;
  const r = roomLayout(d);
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("dim-room", `${d.roomWidth}" E–W × ${d.roomDepth}" N–S × ~${d.ceiling}"`);
  set("dim-north", `${d.northPier} · ${d.openingWidth} face · ${d.closetPierFromNiche} · ${d.closetOpeningWidth} · ${r.leftover} leftover`);
  set("dim-niche", `${d.openingWidth}" face · ${d.width}" inside · ${d.depth}" out · ${headerHeight(d)}" header · ${returnEach(d)}" returns`);
  const c = closetLayout(d);
  set("dim-closet", `${d.closetOpeningWidth}" entry · ${d.closetWidth}×${d.closetDepthInside} inside · ${c.frontWall}" front · backs align`);
  set("dim-door", `${d.doorWidth}" × ${d.doorHeight}" · hinge on the left as you enter`);
  set("dim-windows", `${d.windowWidth}" · 6" from corners · sill ~${d.windowSillAff}" / glass ~${d.windowHeight}" assumed`);
  const p = dresserLayout(d);
  set("dim-dresser", `Graco ${d.dresserWidth}×${d.dresserDepth}×${d.dresserHeight}" · west · z ${p.z0.toFixed(0)}`);
  const crib = cribLayout(d);
  const chair = chairLayout(d);
  set("dim-crib", `Nestig Wave ${d.cribW}×${d.cribD}×${d.cribH}" · z ${crib.z0.toFixed(0)}–${crib.z1.toFixed(0)}`);
  set("dim-lullaby", `OSKARSHAMN ${d.chairW}×${d.chairD}" · south window · facing the east window`);
  set("dim-trays", `${d.trays.map((t) => t.aff).join(" / ")}" AFF · ${trayWidth(d)}" wide · ${binCount(d)} bins`);
  set("roadmap-in", ROADMAP.in.join(" · "));
  set("roadmap-next", ROADMAP.next.join(" · "));
}

function bindUi() {
  document.getElementById("btn-trays")?.addEventListener("click", toggleAllTrays);
  document.getElementById("btn-light")?.addEventListener("click", toggleLight);
  document.getElementById("btn-room")?.addEventListener("click", toggleRoom);
  document.getElementById("btn-labels")?.addEventListener("click", toggleLabels);
  document.getElementById("btn-person")?.addEventListener("click", togglePerson);
  document.getElementById("btn-style")?.addEventListener("click", cycleStyle);
  document.getElementById("btn-curtain")?.addEventListener("click", toggleCurtain);
  document.getElementById("rng-opacity")?.addEventListener("input", (event) => {
    setOpacity(Number(event.target.value) / 100);
  });
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    camera.position.set(...HOME_CAM.pos);
    controls.target.set(...HOME_CAM.target);
  });
  applyRoom();
  applyStyle(state.style);
}

function applyRoom() {
  const on = state.roomOn;
  if (roomLights) {
    roomLights.ambient.intensity = on ? 0.32 : 0.03;
    roomLights.hemi.intensity = on ? 0.6 : 0;
    roomLights.sun.intensity = on ? 1.05 : 0;
    roomLights.east.intensity = on ? 0.35 : 0;
  }
  if (scene) {
    scene.background.set(on ? 0xd8d2c6 : 0x1c1a17);
    scene.environmentIntensity = on ? 0.45 : 0.03;
  }
  const btn = document.getElementById("btn-room");
  if (btn) btn.textContent = on ? "Room off" : "Room on";
  applyLight();
}

function toggleRoom() {
  state.roomOn = !state.roomOn;
  applyRoom();
}

function onPointerDown(event) {
  tap.x = event.clientX;
  tap.y = event.clientY;
}

function onPointerUp(event) {
  if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  handleClick(raycaster);
}

function resize() {
  const hostEl = renderer.domElement.parentElement;
  const w = Math.max(1, Math.round(hostEl?.clientWidth || window.innerWidth));
  const h = Math.max(1, Math.round(hostEl?.clientHeight || window.innerHeight));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = `${w}px`;
  renderer.domElement.style.height = `${h}px`;
}

function tick() {
  requestAnimationFrame(tick);
  if (paused || !renderer) return;
  tickFitout();
  controls.update();
  renderer.render(scene, camera);
}
