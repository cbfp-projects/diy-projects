/**
 * Félix niche — storage close-up. 1 unit = 1 inch. Y up, +Z into the room.
 * Fit-out lives in `fitout.js` so the whole-room model can import the same niche.
 */

import * as THREE from "../niche/vendor/three.module.min.js";
import { OrbitControls } from "../niche/vendor/OrbitControls.js";
import {
  DIMS,
  openingTopAff,
  returnEach,
  headerHeight,
  closetLayout,
  dresserLayout,
  trayWidth,
  shelfDepth,
  binCount,
  ROADMAP,
  roomLayout,
} from "./dims.js?v=10";
import {
  PALETTE,
  state,
  box,
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
} from "./fitout.js?v=4";

const HOME_CAM = { pos: [36, 92, 158], target: [-16, 30, 28] };

let renderer, scene, camera, controls, raycaster, pointer;
let roomLights = null;
let paused = false;
const tap = { x: 0, y: 0 };

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
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.touchAction = "none";
  host.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...HOME_CAM.target);
  controls.enableDamping = true;
  controls.minDistance = 22;
  controls.maxDistance = 280;
  controls.maxPolarAngle = Math.PI * 0.78;
  controls.enablePan = true;
  controls.zoomSpeed = mobile ? 0.7 : 1;

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  makeTextures();
  addEnvironment(renderer, scene);
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
  const ambient = new THREE.AmbientLight(0xfff6ea, 0.5);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xfff4e0, 0x8a8478, 0.65);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2dc, 1.0);
  sun.position.set(40, 120, 90);
  sun.castShadow = true;
  const size = window.matchMedia("(pointer: coarse)").matches ? 1024 : 2048;
  sun.shadow.mapSize.set(size, size);
  sun.shadow.camera.left = -90;
  sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 110;
  sun.shadow.camera.bottom = -20;
  scene.add(sun);

  roomLights = { ambient, hemi, sun };
}

function buildAll() {
  const room = new THREE.Group();
  room.name = "room";
  scene.add(room);

  buildFloor(room);
  buildWalls(room);
  buildWestWall(room);
  buildStorageNiche(room);
}

function buildFloor(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const floor = box(d.roomWidth, 1.2, d.roomDepth, PALETTE.floor, { roughness: 0.9 });
  floor.position.set((r.westX + r.eastX) / 2, -0.6, d.roomDepth / 2);
  parent.add(floor);
}

function buildWalls(parent) {
  const d = DIMS;
  const halfOpen = d.openingWidth / 2;
  const top = openingTopAff(d);
  const t = d.wallThick;
  const headerH = headerHeight(d);
  const r = roomLayout(d);

  const leftSpan = halfOpen - r.westX;
  const left = box(leftSpan, d.ceiling, t, PALETTE.wall, { tex: "paint", roughness: 0.8 });
  left.position.set(r.westX + leftSpan / 2, d.ceiling / 2, -t / 2);
  parent.add(left);

  const closet = closetLayout(d);
  const pierW = d.closetPierFromNiche;
  const pier = box(pierW, d.ceiling, t, PALETTE.wall, { tex: "paint", roughness: 0.8 });
  pier.position.set(halfOpen + pierW / 2, d.ceiling / 2, -t / 2);
  parent.add(pier);

  const closetHeader = box(d.closetOpeningWidth, headerH, t, PALETTE.header, { tex: "paint", roughness: 0.8 });
  closetHeader.position.set(closet.entryCx, top + headerH / 2, -t / 2);
  parent.add(closetHeader);

  const eastSpan = r.eastX - closet.entryRight;
  if (eastSpan > 0.4) {
    const east = box(eastSpan, d.ceiling, t, PALETTE.wall, { tex: "paint", roughness: 0.8 });
    east.position.set(closet.entryRight + eastSpan / 2, d.ceiling / 2, -t / 2);
    parent.add(east);
  }

  const below = box(d.openingWidth, d.sillAff, t, PALETTE.wall, { tex: "paint", roughness: 0.8 });
  below.position.set(0, d.sillAff / 2, -t / 2);
  parent.add(below);

  const header = box(d.openingWidth, headerH, t, PALETTE.header, { tex: "paint", roughness: 0.8 });
  header.name = "header";
  header.position.set(0, top + headerH / 2, -t / 2);
  parent.add(header);
}

function buildWestWall(parent) {
  const d = DIMS;
  const r = roomLayout(d);
  const t = d.wallThick;
  const x = r.westX - t / 2;
  const southLen = d.roomDepth - d.doorWidth;
  const south = box(t, d.ceiling, southLen, PALETTE.wall, { tex: "paint", roughness: 0.8 });
  south.position.set(x, d.ceiling / 2, d.doorWidth + southLen / 2);
  parent.add(south);
  const headerH = d.ceiling - d.doorHeight;
  if (headerH > 0.5) {
    const header = box(t, headerH, d.doorWidth, PALETTE.header, { tex: "paint", roughness: 0.8 });
    header.position.set(x, d.doorHeight + headerH / 2, d.doorWidth / 2);
    parent.add(header);
  }
}

function fillHud() {
  const d = DIMS;
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("dim-opening", `${d.openingWidth}" face × ${d.depth}" × ${d.openingHeight}"`);
  set("dim-interior", `${d.width}" · ${returnEach(d)}" returns`);
  set("dim-header", `${headerHeight(d)}" to ceiling`);
  const c = closetLayout(d);
  set(
    "dim-closet",
    `${d.closetOpeningWidth}" entry · ${d.closetWidth}" × ${d.closetDepthInside}" inside · ${c.frontWall}" front · backs at ${d.depth}"`
  );
  const p = dresserLayout(d);
  set("dim-dresser", `${d.dresserWidth}" × ${d.dresserDepth}" × ${d.dresserHeight}" · west wall @ z ${p.z0}" · pad 16×32`);
  set("dim-sill", `~${d.sillAff}" AFF`);
  set("dim-trays", d.trays.map((t) => `${t.aff}`).join(" / ") + `" AFF · ${trayWidth(d)}" wide`);
  set("dim-slides", `${d.trayDepth}" full-extension · pull out ${d.trayDepth}"`);
  set("dim-shelves", `S1 slab ${d.shelves[0].aff}" full depth, front open · ${d.shelves.slice(1).map((s) => `${s.id} ${s.aff}"`).join(" · ")} on pins, ${shelfDepth(d)}" deep`);
  set("dim-light", `~${d.puckDia}" can, ${d.puckFromFront}" in · shelves from ${d.shelfFrontIn}"`);
  set("dim-bins", `${binCount(d)} (${d.trays.length * 6} on trays, ${binCount(d) - d.trays.length * 6} on shelves)`);
  set("roadmap-in", ROADMAP.in.join(" · "));
  set("roadmap-next", ROADMAP.next.join(" · "));
}

function bindUi() {
  document.getElementById("btn-trays").addEventListener("click", toggleAllTrays);
  document.getElementById("btn-light")?.addEventListener("click", toggleLight);
  document.getElementById("btn-room")?.addEventListener("click", toggleRoom);
  document.getElementById("btn-labels")?.addEventListener("click", toggleLabels);
  document.getElementById("btn-person")?.addEventListener("click", togglePerson);
  document.getElementById("btn-style")?.addEventListener("click", cycleStyle);
  document.getElementById("btn-curtain")?.addEventListener("click", toggleCurtain);
  document.getElementById("rng-opacity")?.addEventListener("input", (event) => {
    setOpacity(Number(event.target.value) / 100);
  });
  document.getElementById("btn-reset").addEventListener("click", () => {
    camera.position.set(...HOME_CAM.pos);
    controls.target.set(...HOME_CAM.target);
  });
  applyRoom();
  applyStyle(state.style);
}

function applyRoom() {
  const on = state.roomOn;
  if (roomLights) {
    roomLights.ambient.intensity = on ? 0.3 : 0.03;
    roomLights.hemi.intensity = on ? 0.65 : 0;
    roomLights.sun.intensity = on ? 1.0 : 0;
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
