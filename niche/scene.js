/**
 * Félix niche massing. 1 unit = 1 inch. Y up, +Z into the room, −Z into the box.
 *
 * v2 features: niche (no door), slab, hollow drawer, pad (head left), rail, clear zone,
 * closed step behind the pad, shelves with two rows of bins, side-wall caddy, recess can.
 */

import * as THREE from "three";
import { OrbitControls } from "./vendor/OrbitControls.js";
import {
  DIMS,
  slabAff,
  openingTopAff,
  shelfHeights,
  storageFrontIn,
  storageBackIn,
  ROADMAP,
} from "./dims.js?v=12";

const HOME_CAM = { pos: [20, 54, 32], target: [0, 37, -9] };

const PALETTE = {
  wall: 0xf3eee4,
  wallSide: 0xece6da,
  floor: 0xc9cdd1,
  jamb: 0x8a6a48,
  sill: 0xd7c7a6,
  birch: 0xe4c994,
  birchEdge: 0xc9a56a,
  drawer: 0xd7b57a,
  drawerIn: 0xc9a86c,
  handle: 0x4a3a2a,
  target: 0x2f6b4f,
  trim: 0xf4efe6,
  well: 0x2a2926,
  glow: 0xfff1c4,
  pad: 0xf8f3e8,
  padRim: 0x8a7354,
  padWell: 0xe4d6bc,
  strap: 0x3d4f44,
  rail: 0x8a6236,
  pin: 0xb8b0a4,
  caddy: 0xe7efe8,
  wipe: 0xf7f4ee,
  cream: 0xd6e4d8,
  basket: 0x8f7a5c,
  basketIn: 0xc4b49a,
  bag: 0x5d7a68,
  clear: 0x4f9a74,
};

const state = {
  drawerOpen: false,
  drawerT: 0,
  lightOn: true,
  roomOn: true,
  labelsOn: true,
  opacity: 1,
};

const solidMats = [];
const labels = [];

let renderer, scene, camera, controls, drawerGroup, raycaster, pointer;
let drawerMeshes = [];
let puckMeshes = [];
let puckLights = null;
let roomLights = null;
let paused = false;
const tap = { x: 0, y: 0, moved: false };

export function boot(host) {
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
}

function start(host) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd8d2c6);

  camera = new THREE.PerspectiveCamera(42, 1, 2, 800);
  camera.position.set(...HOME_CAM.pos);

  const mobile = window.matchMedia("(pointer: coarse)").matches;
  renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
  renderer.shadowMap.enabled = true;
  renderer.domElement.style.touchAction = "none";
  host.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...HOME_CAM.target);
  controls.enableDamping = true;
  controls.minDistance = 22;
  controls.maxDistance = 220;
  controls.maxPolarAngle = Math.PI * 0.78;
  controls.enablePan = true;
  controls.zoomSpeed = mobile ? 0.7 : 1;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

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
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type !== "felix-niche") return;
    paused = event.data.visible === false;
    if (!paused) resize();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) resize();
  });
  resize();
  tick();
}

function addLights() {
  const ambient = new THREE.AmbientLight(0xfff6ea, 0.55);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a8478, 0.7);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 1.05);
  sun.position.set(40, 110, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobileShadowMap(), mobileShadowMap());
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  roomLights = { ambient, hemi, sun };
}

function mobileShadowMap() {
  return window.matchMedia("(pointer: coarse)").matches ? 1024 : 2048;
}

function mat(color, opts = {}) {
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.72,
    metalness: 0,
    ...opts,
  });
  solidMats.push(m);
  return m;
}

function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function changingBox(d = DIMS) {
  const boxFrontZ = -d.frontSetback;
  const boxBackZ = -(d.depth - d.backAir);
  return {
    boxFrontZ,
    boxBackZ,
    boxCenterZ: (boxFrontZ + boxBackZ) / 2,
    boxDepth: boxFrontZ - boxBackZ,
  };
}

function buildAll() {
  const room = new THREE.Group();
  room.name = "room";
  scene.add(room);

  buildFloor(room);
  buildWalls(room);
  buildNiche(room);
  buildChanging(room);
  buildStorage(room);
  buildSideCaddy(room);
  buildClearZone(room);
  buildHook(room);
  buildRecessLight(room);
  buildTargetLine(room);
}

function buildFloor(parent) {
  const d = DIMS;
  const floor = box(d.roomWidth, 1.2, d.roomDepth, PALETTE.floor, { roughness: 0.9 });
  floor.position.set(0, -0.6, d.roomDepth / 2 - 8);
  parent.add(floor);
}

function buildWalls(parent) {
  const d = DIMS;
  const halfW = d.width / 2;
  const top = openingTopAff(d);
  const leftSpan = d.roomWidth / 2 - halfW;
  const rightSpan = leftSpan;
  const t = d.wallThick;

  const left = box(leftSpan, d.ceiling, t, PALETTE.wall);
  left.position.set(-(halfW + leftSpan / 2), d.ceiling / 2, -t / 2);
  parent.add(left);

  const right = box(rightSpan, d.ceiling, t, PALETTE.wall);
  right.position.set(halfW + rightSpan / 2, d.ceiling / 2, -t / 2);
  parent.add(right);

  const below = box(d.width, d.sillAff, t, PALETTE.wall);
  below.position.set(0, d.sillAff / 2, -t / 2);
  parent.add(below);

  const aboveH = d.ceiling - top;
  const above = box(d.width, aboveH, t, PALETTE.wall);
  above.position.set(0, top + aboveH / 2, -t / 2);
  parent.add(above);
}

function buildNiche(parent) {
  const d = DIMS;
  const halfW = d.width / 2;
  const top = openingTopAff(d);
  const niche = new THREE.Group();
  niche.name = "niche";

  const back = box(d.width, d.openingHeight, 0.8, PALETTE.wallSide);
  back.position.set(0, d.sillAff + d.openingHeight / 2, -d.depth + 0.4);
  niche.add(back);

  const left = box(0.8, d.openingHeight, d.depth, PALETTE.wallSide);
  left.position.set(-halfW + 0.4, d.sillAff + d.openingHeight / 2, -d.depth / 2);
  niche.add(left);

  const right = box(0.8, d.openingHeight, d.depth, PALETTE.wallSide);
  right.position.set(halfW - 0.4, d.sillAff + d.openingHeight / 2, -d.depth / 2);
  niche.add(right);

  const sill = box(d.width - 0.2, 0.75, d.depth - 0.2, PALETTE.sill, { roughness: 0.85 });
  sill.position.set(0, d.sillAff + 0.4, -d.depth / 2);
  niche.add(sill);

  const jambT = 1.5;
  const jambs = [
    box(jambT, d.openingHeight, jambT, PALETTE.jamb),
    box(jambT, d.openingHeight, jambT, PALETTE.jamb),
    box(d.width, jambT, jambT, PALETTE.jamb),
    box(d.width, jambT, jambT, PALETTE.jamb),
  ];
  jambs[0].position.set(-halfW + jambT / 2, d.sillAff + d.openingHeight / 2, jambT / 2);
  jambs[1].position.set(halfW - jambT / 2, d.sillAff + d.openingHeight / 2, jambT / 2);
  jambs[2].position.set(0, top - jambT / 2, jambT / 2);
  jambs[3].position.set(0, d.sillAff + jambT / 2, jambT / 2);
  jambs.forEach((j) => niche.add(j));

  parent.add(niche);
}

function buildRecessLight(parent) {
  const d = DIMS;
  const top = openingTopAff(d);
  const z = -d.puckFromFront;
  const thick = d.puckCeil;
  const underside = top - thick;
  const group = new THREE.Group();
  group.name = "recess-light";

  const w = d.width - 0.2;
  const dep = d.depth - 0.2;
  const plate = new THREE.Shape();
  plate.moveTo(-w / 2, -dep / 2);
  plate.lineTo(w / 2, -dep / 2);
  plate.lineTo(w / 2, dep / 2);
  plate.lineTo(-w / 2, dep / 2);
  plate.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, z + d.depth / 2, d.puckDia / 2, 0, Math.PI * 2, true);
  plate.holes.push(hole);
  const ceilGeo = new THREE.ExtrudeGeometry(plate, {
    depth: thick,
    bevelEnabled: false,
    curveSegments: 36,
  });
  const ceil = new THREE.Mesh(ceilGeo, mat(PALETTE.wallSide, { roughness: 0.82 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, top, -d.depth / 2);
  ceil.castShadow = true;
  ceil.receiveShadow = true;
  group.add(ceil);

  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(d.puckDia / 2 - 0.04, d.puckDia / 2 - 0.04, d.puckWell, 32, 1, true),
    mat(PALETTE.well, { roughness: 0.95, side: THREE.DoubleSide })
  );
  well.position.set(0, underside + d.puckWell / 2, z);
  group.add(well);

  const housing = new THREE.Mesh(
    new THREE.CircleGeometry(d.puckDia / 2, 32),
    mat(PALETTE.well, { roughness: 0.9 })
  );
  housing.rotation.x = -Math.PI / 2;
  housing.position.set(0, underside + d.puckWell, z);
  group.add(housing);

  const trim = new THREE.Mesh(
    new THREE.RingGeometry(d.puckDia / 2, d.puckTrim / 2, 36),
    mat(PALETTE.trim, { roughness: 0.35, metalness: 0.18, side: THREE.DoubleSide })
  );
  trim.rotation.x = Math.PI / 2;
  trim.position.set(0, underside - 0.02, z);
  group.add(trim);

  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(d.puckDia / 2 - 0.25, 32),
    new THREE.MeshStandardMaterial({
      color: PALETTE.glow,
      emissive: 0xfff3c0,
      emissiveIntensity: 2.4,
      roughness: 0.18,
      side: THREE.DoubleSide,
    })
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, underside + d.puckWell - 0.35, z);
  group.add(lens);

  const spot = new THREE.SpotLight(0xffe8b0, 110, 78, Math.PI / 4.5, 0.45, 1.2);
  spot.position.set(0, underside + 0.4, z);
  spot.target.position.set(0, slabAff(d), z);
  group.add(spot);
  group.add(spot.target);

  const fill = new THREE.PointLight(0xffe7b8, 16, 50, 2);
  fill.position.set(0, underside + 0.6, z);
  group.add(fill);

  puckLights = { spot, fill, lens };
  puckMeshes = [lens, trim, well];
  applyLight();

  parent.add(group);
}

function buildChanging(parent) {
  const d = DIMS;
  const group = new THREE.Group();
  group.name = "changing";

  const { boxFrontZ, boxCenterZ, boxDepth } = changingBox(d);

  const sideH = d.carcassWall;
  const sideY = d.sillAff + 0.75 + sideH / 2;
  const half = d.carcassWidth / 2;
  const sideT = 0.75;

  const left = box(sideT, sideH, boxDepth, PALETTE.birchEdge);
  left.position.set(-half + sideT / 2, sideY, boxCenterZ);
  group.add(left);

  const right = box(sideT, sideH, boxDepth, PALETTE.birchEdge);
  right.position.set(half - sideT / 2, sideY, boxCenterZ);
  group.add(right);

  const bottom = box(d.carcassWidth - 0.1, 0.5, boxDepth, PALETTE.birchEdge);
  bottom.position.set(0, d.sillAff + 0.75 + 0.25, boxCenterZ);
  group.add(bottom);

  const slab = box(d.carcassWidth, d.topThick, boxDepth, PALETTE.birch, { roughness: 0.45 });
  slab.position.set(0, slabAff(d) - d.topThick / 2, boxCenterZ);
  slab.name = "slab";
  group.add(slab);

  const railW = d.carcassWidth - 2 * d.railInset;
  const rail = box(railW, d.railHeight, d.railThick, PALETTE.rail, { roughness: 0.48 });
  rail.position.set(0, slabAff(d) + d.railHeight / 2, boxFrontZ - d.railThick / 2);
  rail.name = "rail";
  group.add(rail);

  drawerGroup = new THREE.Group();
  drawerGroup.name = "drawer";
  const innerW = d.carcassWidth - 2 * sideT - 2 * d.drawerSideClear;
  const innerH = sideH - 0.5 - d.drawerBottomGap - d.drawerTopGap - d.topThick * 0;
  const drawerH = Math.max(6.5, innerH);
  const drawerD = Math.min(d.drawerSlide, boxDepth - 2);
  const drawerY = d.sillAff + 0.75 + 0.5 + d.drawerBottomGap + drawerH / 2;

  const hollow = buildHollowBox(innerW, drawerH, drawerD, d.drawerWall, PALETTE.drawerIn);
  drawerGroup.add(hollow.group);

  const front = box(innerW + 0.4, drawerH + 0.3, 0.7, PALETTE.drawer, { roughness: 0.5 });
  front.position.set(0, 0, drawerD / 2 + 0.35);
  drawerGroup.add(front);

  const handle = box(6.5, 0.45, 0.7, PALETTE.handle, { roughness: 0.35, metalness: 0.15 });
  handle.position.set(0, 0.2, drawerD / 2 + 0.85);
  drawerGroup.add(handle);

  drawerGroup.userData.closedZ = boxFrontZ - drawerD / 2 - 0.2;
  drawerGroup.userData.openZ = boxFrontZ + d.drawerSlide - drawerD / 2;
  drawerGroup.position.set(0, drawerY, drawerGroup.userData.closedZ);

  drawerMeshes = [...hollow.parts, front, handle];
  drawerMeshes.forEach((m) => {
    m.userData.drawer = true;
  });

  group.add(drawerGroup);
  buildPad(group, boxFrontZ);
  parent.add(group);
}

function buildHollowBox(w, h, dpth, t, color) {
  const group = new THREE.Group();
  const opts = { roughness: 0.62 };
  const sideH = h - t;
  const sideY = -h / 2 + t + sideH / 2;

  const bottom = box(w - 0.04, t, dpth - 0.04, color, opts);
  bottom.position.set(0, -h / 2 + t / 2, 0);
  group.add(bottom);

  const left = box(t, sideH, dpth, color, opts);
  left.position.set(-w / 2 + t / 2, sideY, 0);
  group.add(left);

  const right = box(t, sideH, dpth, color, opts);
  right.position.set(w / 2 - t / 2, sideY, 0);
  group.add(right);

  const back = box(w - 2 * t, sideH, t, color, opts);
  back.position.set(0, sideY, -dpth / 2 + t / 2);
  group.add(back);

  const innerFront = box(w - 2 * t, sideH, t, color, opts);
  innerFront.position.set(0, sideY, dpth / 2 - t / 2);
  group.add(innerFront);

  return { group, parts: [bottom, left, right, back, innerFront] };
}

function buildPad(parent, boxFrontZ) {
  const d = DIMS;
  const group = new THREE.Group();
  group.name = "pad";

  const y = slabAff(d);
  const z = boxFrontZ - d.railThick - d.padDepth / 2 - 0.2;
  const rimY = y + d.padThick + d.padRim / 2;
  const rim = d.padRimThick;

  const cushion = box(d.padWidth, d.padThick, d.padDepth, PALETTE.pad, { roughness: 0.84 });
  cushion.position.set(0, y + d.padThick / 2, z);
  group.add(cushion);

  const well = box(d.padWidth - 2 * rim, 0.14, d.padDepth - 2 * rim, PALETTE.padWell, { roughness: 0.9 });
  well.position.set(0, y + d.padThick + 0.05, z);
  group.add(well);

  const front = box(d.padWidth, d.padRim, rim, PALETTE.padRim, { roughness: 0.8 });
  front.position.set(0, rimY, z + d.padDepth / 2 - rim / 2);
  group.add(front);

  const back = box(d.padWidth, d.padRim, rim, PALETTE.padRim, { roughness: 0.8 });
  back.position.set(0, rimY, z - d.padDepth / 2 + rim / 2);
  group.add(back);

  const left = box(rim, d.padRim, d.padDepth - 2 * rim, PALETTE.padRim, { roughness: 0.8 });
  left.position.set(-d.padWidth / 2 + rim / 2, rimY, z);
  group.add(left);

  const right = box(rim, d.padRim, d.padDepth - 2 * rim, PALETTE.padRim, { roughness: 0.8 });
  right.position.set(d.padWidth / 2 - rim / 2, rimY, z);
  group.add(right);

  const strap = box(d.padWidth - 0.6, 0.14, 1.35, PALETTE.strap, { roughness: 0.5 });
  strap.position.set(0, y + d.padThick + 0.16, z + 0.8);
  group.add(strap);

  const tag = makeLabel(`pad  16×28.5 · head left`);
  tag.scale.set(12, 3, 1);
  tag.position.set(d.padWidth / 2 + 8, y + 3.2, z);
  group.add(tag);

  parent.add(group);
}

function storageZ(d = DIMS) {
  const frontZ = -storageFrontIn(d);
  const backZ = -storageBackIn(d);
  return { frontZ, backZ, depth: frontZ - backZ, centerZ: (frontZ + backZ) / 2 };
}

function buildStorage(parent) {
  const d = DIMS;
  const group = new THREE.Group();
  group.name = "storage";
  const { frontZ, depth, centerZ } = storageZ(d);
  const levels = shelfHeights(d);
  const shelfW = d.width - 2 * d.shelfSideGap;

  const stepH = d.stepTopAff - slabAff(d);
  const body = box(d.carcassWidth, stepH - d.shelfThick, depth, PALETTE.birchEdge, { roughness: 0.55 });
  body.position.set(0, slabAff(d) + (stepH - d.shelfThick) / 2, centerZ);
  group.add(body);

  const top = box(d.carcassWidth, d.shelfThick, depth, PALETTE.birch, { roughness: 0.5 });
  top.position.set(0, d.stepTopAff - d.shelfThick / 2, centerZ);
  group.add(top);

  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(d.shelfThick / 2, d.shelfThick / 2, d.carcassWidth, 16),
    mat(PALETTE.birch, { roughness: 0.5 })
  );
  nose.rotation.z = Math.PI / 2;
  nose.position.set(0, d.stepTopAff - d.shelfThick / 2, frontZ);
  group.add(nose);

  levels.slice(1).forEach((y) => {
    const plank = box(shelfW, d.shelfThick, depth, PALETTE.birch, { roughness: 0.5 });
    plank.position.set(0, y - d.shelfThick / 2, centerZ);
    group.add(plank);
    addShelfPins(group, y, frontZ, depth);
  });

  const tags = [
    `shelf 1 · ${levels[0]}" · easy`,
    `shelf 2 · ${levels[1]}" · Claire OK`,
    `shelf 3 · ${levels[2]}" · stool`,
    `shelf 4 · ${levels[3]}" · stool`,
  ];
  levels.forEach((y, i) => {
    buildBinRows(group, y, frontZ);
    const tag = makeLabel(tags[i]);
    tag.scale.set(17, 4.25, 1);
    tag.position.set(d.width / 2 + 13, y + d.basketH / 2, frontZ - 2);
    group.add(tag);
  });

  parent.add(group);
}

function addShelfPins(parent, shelfY, frontZ, depth) {
  const d = DIMS;
  const xs = [-d.width / 2 + 0.95, d.width / 2 - 0.95];
  const zs = [frontZ - 1.4, frontZ - depth + 1.4];
  xs.forEach((x) => {
    zs.forEach((z) => {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.55, 10),
        mat(PALETTE.pin, { roughness: 0.4, metalness: 0.2 })
      );
      pin.rotation.z = Math.PI / 2;
      pin.position.set(x, shelfY - d.shelfThick - 0.12, z);
      parent.add(pin);
    });
  });
}

function buildBinRows(parent, shelfY, frontZ) {
  const d = DIMS;
  const pairW = d.basketW * 2 + d.basketGap;
  const xs = [-pairW / 2 + d.basketW / 2, pairW / 2 - d.basketW / 2];
  const rows = [
    frontZ - 0.25 - d.basketD / 2,
    frontZ - 0.25 - d.basketD - d.basketGap - d.basketD / 2,
  ];

  rows.forEach((z, row) => {
    xs.forEach((x) => {
      const hollow = buildHollowBox(d.basketW, d.basketH, d.basketD, 0.35, PALETTE.basket);
      hollow.group.position.set(x, shelfY + d.basketH / 2, z);
      parent.add(hollow.group);
      const cloth = box(d.basketW - 0.9, 0.4, d.basketD - 0.9, PALETTE.basketIn, { roughness: 0.9 });
      cloth.position.set(x, shelfY + 0.65, z);
      parent.add(cloth);
      if (row === 0) {
        const grip = box(4.5, 0.9, 0.5, PALETTE.handle, { roughness: 0.4 });
        grip.position.set(x, shelfY + d.basketH - 1.6, z + d.basketD / 2 + 0.25);
        parent.add(grip);
      }
    });
  });
}

function buildSideCaddy(parent) {
  const d = DIMS;
  const group = new THREE.Group();
  group.name = "side-caddy";
  const wallX = -d.width / 2 + 0.8;
  const x = wallX + d.caddyShelfDepth / 2;
  const z = -d.caddyShelfFromFront - d.caddyShelfLength / 2;
  const y = d.caddyShelfAff;

  const shelf = box(d.caddyShelfDepth, d.shelfThick, d.caddyShelfLength, PALETTE.birch, { roughness: 0.5 });
  shelf.position.set(x, y - d.shelfThick / 2, z);
  group.add(shelf);

  const lip = box(0.5, d.caddyLip, d.caddyShelfLength, PALETTE.birchEdge, { roughness: 0.5 });
  lip.position.set(wallX + d.caddyShelfDepth - 0.25, y + d.caddyLip / 2, z);
  group.add(lip);

  [-d.caddyShelfLength / 2 + 0.25, d.caddyShelfLength / 2 - 0.25].forEach((dz) => {
    const end = box(d.caddyShelfDepth, d.caddyLip, 0.5, PALETTE.birchEdge, { roughness: 0.5 });
    end.position.set(x, y + d.caddyLip / 2, z + dz);
    group.add(end);
  });

  const wipes = box(2.6, 2.2, 6.8, PALETTE.wipe, { roughness: 0.55 });
  wipes.position.set(x - 0.2, y + 1.1, z + 1.6);
  group.add(wipes);

  const cream = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.78, 2.4, 16),
    mat(PALETTE.cream, { roughness: 0.45 })
  );
  cream.position.set(x - 0.2, y + 1.2, z - 3.4);
  group.add(cream);

  const tag = makeLabel(`wipes · head end`);
  tag.scale.set(15, 3.75, 1);
  tag.position.set(-d.width / 2 - 11, y + 2.5, z + 4);
  group.add(tag);

  parent.add(group);
}

function buildClearZone(parent) {
  const d = DIMS;
  const bottom = slabAff(d) + d.padThick + d.padRim;
  const top = openingTopAff(d) - d.puckCeil;
  const depth = storageFrontIn(d);
  const zone = new THREE.Mesh(
    new THREE.BoxGeometry(d.width - 1.6, top - bottom, depth),
    new THREE.MeshBasicMaterial({ color: PALETTE.clear, transparent: true, opacity: 0.07, depthWrite: false })
  );
  zone.position.set(0, (bottom + top) / 2, -depth / 2);
  zone.renderOrder = 1;
  parent.add(zone);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(zone.geometry),
    new THREE.LineBasicMaterial({ color: PALETTE.clear, transparent: true, opacity: 0.35 })
  );
  edges.position.copy(zone.position);
  parent.add(edges);

  const tag = makeLabel(`clear zone`);
  tag.scale.set(19, 4.75, 1);
  tag.position.set(0, top - 6, -depth / 2);
  parent.add(tag);
}

function buildHook(parent) {
  const d = DIMS;
  const group = new THREE.Group();
  group.name = "hook";
  const x = d.width / 2 - 0.15;
  const y = slabAff(d) + 14;
  const z = 1.15;

  const plate = box(0.2, 1.6, 0.9, PALETTE.handle, { roughness: 0.4, metalness: 0.25 });
  plate.position.set(x, y, z);
  group.add(plate);

  const hook = new THREE.Mesh(
    new THREE.TorusGeometry(0.55, 0.1, 8, 18, Math.PI),
    mat(PALETTE.handle, { roughness: 0.3, metalness: 0.4 })
  );
  hook.rotation.y = Math.PI / 2;
  hook.rotation.z = Math.PI;
  hook.position.set(x, y - 0.15, z + 0.7);
  group.add(hook);

  const bag = box(6.5, 8.5, 1.6, PALETTE.bag, { roughness: 0.75 });
  bag.position.set(x + 0.2, y - 5.4, z + 1.3);
  group.add(bag);

  const strap = box(0.45, 2.2, 0.2, PALETTE.strap, { roughness: 0.5 });
  strap.position.set(x, y - 1.1, z + 0.85);
  group.add(strap);

  const tag = makeLabel(`wet-bag`);
  tag.scale.set(8, 2.1, 1);
  tag.position.set(x + 6, y - 5, z + 2);
  group.add(tag);

  parent.add(group);
}

function buildTargetLine(parent) {
  const d = DIMS;
  const y = 36;
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-d.width / 2 - 8, y, 2),
    new THREE.Vector3(d.width / 2 + 8, y, 2),
  ]);
  const line = new THREE.Line(
    geo,
    new THREE.LineDashedMaterial({ color: PALETTE.target, dashSize: 2, gapSize: 1.2, linewidth: 1 })
  );
  line.computeLineDistances();
  parent.add(line);

  const sprite = makeLabel(`36" AFF  changing height`);
  sprite.position.set(d.width / 2 + 16, y + 2.2, 4);
  parent.add(sprite);

  const slabLabel = makeLabel(`slab  ${slabAff().toFixed(2)}"`);
  slabLabel.position.set(-d.width / 2 - 12, slabAff() + 1.5, -8);
  parent.add(slabLabel);
}

function makeLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = "rgba(244,247,244,0.92)";
  ctx.strokeStyle = "rgba(28,42,36,0.16)";
  roundRect(ctx, 8, 24, 496, 80, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1c2a24";
  ctx.font = "600 42px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(18, 4.5, 1);
  sprite.renderOrder = 2;
  sprite.visible = state.labelsOn;
  labels.push(sprite);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillHud() {
  const d = DIMS;
  document.getElementById("dim-opening").textContent = `${d.width}" × ${d.depth}" × ${d.openingHeight}"`;
  document.getElementById("dim-sill").textContent = `~${d.sillAff}" AFF`;
  document.getElementById("dim-slab").textContent = `${slabAff().toFixed(2)}" AFF`;
  document.getElementById("dim-drawer").textContent = `${d.drawerSlide}" slide`;
  const pad = document.getElementById("dim-pad");
  if (pad) pad.textContent = `${d.padDepth}" × ${d.padWidth}" L–R`;
  const rail = document.getElementById("dim-rail");
  if (rail) rail.textContent = `1×3 · ${d.railHeight}" above top`;
  const { depth } = storageZ(d);
  const shelves = document.getElementById("dim-shelves");
  if (shelves) {
    shelves.textContent = `${shelfHeights(d).join(" / ")}" AFF · ${depth.toFixed(1)}" deep · 2 rows of bins`;
  }
  const clear = document.getElementById("dim-clear");
  if (clear) clear.textContent = `first ${storageFrontIn(d).toFixed(1)}" from the opening, pad → ceiling`;
  const caddy = document.getElementById("dim-caddy");
  if (caddy) caddy.textContent = `left wall · ${d.caddyShelfDepth}" deep · ${d.caddyShelfAff}" AFF`;
  const puck = document.getElementById("dim-puck");
  if (puck) puck.textContent = `~${d.puckDia}" can, ${d.puckFromFront}" in from front`;
  document.getElementById("roadmap-in").textContent = ROADMAP.in.join(" · ");
  document.getElementById("roadmap-next").textContent = ROADMAP.next.join(" · ");
}

function bindUi() {
  document.getElementById("btn-drawer").addEventListener("click", toggleDrawer);
  document.getElementById("btn-light")?.addEventListener("click", toggleLight);
  document.getElementById("btn-room")?.addEventListener("click", toggleRoom);
  document.getElementById("btn-labels")?.addEventListener("click", toggleLabels);
  document.getElementById("rng-opacity")?.addEventListener("input", (event) => {
    setOpacity(Number(event.target.value) / 100);
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    camera.position.set(...HOME_CAM.pos);
    controls.target.set(...HOME_CAM.target);
  });
  applyRoom();
}

function applyLight() {
  if (!puckLights) return;
  const on = state.lightOn;
  const solo = on && !state.roomOn;
  puckLights.spot.intensity = on ? (solo ? 420 : 110) : 0;
  puckLights.spot.angle = solo ? Math.PI / 5.2 : Math.PI / 4.5;
  puckLights.fill.intensity = on ? (solo ? 72 : 16) : 0;
  puckLights.lens.material.emissiveIntensity = on ? (solo ? 5.2 : 2.4) : 0;
  puckLights.lens.material.color.set(on ? PALETTE.glow : 0x4a4844);
  puckLights.lens.material.emissive.set(on ? 0xfff3c0 : 0x000000);
  const btn = document.getElementById("btn-light");
  if (btn) btn.textContent = on ? "Can off" : "Can on";
}

function applyRoom() {
  const on = state.roomOn;
  if (roomLights) {
    roomLights.ambient.intensity = on ? 0.55 : 0.03;
    roomLights.hemi.intensity = on ? 0.7 : 0;
    roomLights.sun.intensity = on ? 1.05 : 0;
  }
  if (scene) scene.background.set(on ? 0xd8d2c6 : 0x1c1a17);
  const btn = document.getElementById("btn-room");
  if (btn) btn.textContent = on ? "Room off" : "Room on";
  applyLight();
}

function setOpacity(value) {
  const wasSolid = state.opacity >= 0.999;
  state.opacity = value;
  const solid = value >= 0.999;
  solidMats.forEach((m) => {
    m.opacity = value;
    m.transparent = !solid;
    m.depthWrite = solid;
    if (wasSolid !== solid) m.needsUpdate = true;
  });
  const out = document.getElementById("out-opacity");
  if (out) out.textContent = `${Math.round(value * 100)}%`;
}

function toggleLabels() {
  state.labelsOn = !state.labelsOn;
  labels.forEach((sprite) => {
    sprite.visible = state.labelsOn;
  });
  const btn = document.getElementById("btn-labels");
  if (btn) btn.textContent = state.labelsOn ? "Labels off" : "Labels on";
}

function toggleLight() {
  state.lightOn = !state.lightOn;
  applyLight();
}

function toggleRoom() {
  state.roomOn = !state.roomOn;
  applyRoom();
}

function toggleDrawer() {
  state.drawerOpen = !state.drawerOpen;
  const btn = document.getElementById("btn-drawer");
  btn.textContent = state.drawerOpen ? "Close drawer" : "Open drawer";
}

function onPointerDown(event) {
  tap.x = event.clientX;
  tap.y = event.clientY;
  tap.moved = false;
}

function onPointerUp(event) {
  if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 10) return;
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const drawerHit = raycaster.intersectObjects(drawerMeshes, false);
  if (drawerHit.length) {
    toggleDrawer();
    return;
  }
  const puckHit = raycaster.intersectObjects(puckMeshes, false);
  if (puckHit.length) toggleLight();
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
  const goal = state.drawerOpen ? 1 : 0;
  state.drawerT += (goal - state.drawerT) * 0.12;
  if (drawerGroup) {
    const z = THREE.MathUtils.lerp(
      drawerGroup.userData.closedZ,
      drawerGroup.userData.openZ,
      state.drawerT
    );
    drawerGroup.position.z = z;
  }
  controls.update();
  renderer.render(scene, camera);
}
