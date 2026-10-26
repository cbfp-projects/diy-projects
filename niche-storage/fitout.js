/**
 * Shared storage-niche builders. 1 unit = 1 inch. Y up, +Z into the room,
 * −Z into the box. Opening plane at z = 0 (niche face center).
 *
 * Imported by the niche close-up (`scene.js`) and the whole-room model
 * (`../felix-bedroom/scene.js`). Keep fit-out changes here so both stay in sync.
 */

import * as THREE from "../niche/vendor/three.module.min.js";
import {
  DIMS,
  openingTopAff,
  returnEach,
  headerHeight,
  closetLayout,
  dresserLayout,
  trayWidth,
  shelfDepth,
} from "./dims.js?v=10";

export const JAMB = 1.5;
const SHERWOOD = 0x8c967a;

export const PALETTE = {
  wall: SHERWOOD,
  header: 0x7a8468,
  wallSide: SHERWOOD,
  floor: 0xc4bcae,
  jamb: 0x94672e,
  sill: 0xd7c7a6,
  birch: 0xe4c994,
  birchEdge: 0xc9a56a,
  liner: 0xdcc69c,
  slide: 0x9a9a9a,
  handle: 0x4a3a2a,
  trim: 0xf4efe6,
  well: 0x2a2926,
  glow: 0xfff1c4,
  pad: 0xf8f3e8,
  padRim: 0x8a7354,
  bag: 0x5d7a68,
  bin: 0xeee7d8,
  binIn: 0xd9cfbb,
  binTag: 0x2f6b4f,
  pin: 0xb8b0a4,
};

export const FINISH = {
  oak: 0xd9b98a,
  oakEdge: 0xc6a26e,
  felt: 0xd3cab8,
  feltIn: 0xbdb3a0,
  brass: 0xc9a44c,
  linen: 0xeee8da,
  pull: 0x3a2e22,
  frame: 0xf4efe6,
  pot: 0xdcc9ad,
  leaf: 0x7f9a6e,
};

export const STYLES = [
  { id: "raw", name: "Raw" },
  { id: "finished", name: "Finished" },
];

export const state = {
  traysOpen: [false, false, false],
  trayT: [0, 0, 0],
  lightOn: true,
  roomOn: true,
  labelsOn: true,
  personOn: true,
  opacity: 1,
  style: "finished",
  curtainClosed: false,
  curtainT: 0,
};

const solidMats = [];
const labels = [];
const styleOnly = {};
const styleTints = [];
const displayItems = [];
let curtain = null;
const trayPulls = [];
let person = null;

function only(styleId, obj) {
  (styleOnly[styleId] ||= []).push(obj);
  return obj;
}

function tint(mesh, colors) {
  styleTints.push({ m: mesh.material, colors });
  return mesh;
}


export const trayGroups = [];
export const trayMeshes = [];
export const slabColumns = [];
export const slabMeshes = [];
export const puckMeshes = [];
export let puckLights = null;


const TEX = {};
const TEX_INCHES = 24;

function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function vnoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const e = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + e) * u * v;
}

function fbm(x, y, oct = 4) {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i += 1) {
    sum += amp * vnoise(x * f, y * f);
    f *= 2;
    amp *= 0.5;
  }
  return sum;
}

// Tileable grayscale detail map; shade(u, v) returns 0..1 brightness on a torus.
function detailTexture(size, shade) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const g = Math.max(0, Math.min(255, Math.round(255 * shade(x / size, y / size))));
      const i = (y * size + x) * 4;
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const make = (srgb) => {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: make(true), bump: make(false) };
}

// Periodic noise: sample fbm on a circle so the texture tiles along u.
function tiled(u, v, scaleU, scaleV, oct) {
  const a = u * Math.PI * 2;
  const r = scaleU / (Math.PI * 2);
  return fbm(Math.cos(a) * r + v * scaleV * 0.37, Math.sin(a) * r + v * scaleV, oct);
}

function makeTextures() {
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  const big = mobile ? 256 : 512;

  TEX.wood = detailTexture(big, (u, v) => {
    const warp = tiled(u, v, 2, 1.5, 3) * 0.45;
    const ring = Math.sin((v * 18 + warp * 2.5) * Math.PI * 2);
    const streak = tiled(u, v, 5, 150, 3);
    const fleck = hash(Math.floor(u * big * 0.5), Math.floor(v * big * 2)) > 0.985 ? -0.06 : 0;
    return 0.9 + 0.035 * ring + 0.14 * (streak - 0.5) + fleck;
  });

  TEX.linen = detailTexture(256, (u, v) => {
    const threads = 96;
    const wx = Math.sin(u * threads * Math.PI * 2);
    const wy = Math.sin(v * threads * Math.PI * 2);
    const over = (Math.floor(u * threads) + Math.floor(v * threads)) % 2 ? wx : wy;
    const slubU = hash(Math.floor(v * threads), 7) > 0.85 ? 0.05 : 0;
    const slubV = hash(Math.floor(u * threads), 3) > 0.85 ? 0.05 : 0;
    return 0.93 + 0.02 * over + 0.6 * (slubU + slubV) - 0.03 * hash(u * 999, v * 777);
  });

  TEX.felt = detailTexture(256, (u, v) => 0.9 + 0.12 * (tiled(u, v, 24, 24, 3) - 0.5) + 0.06 * (hash(u * 4096, v * 4096) - 0.5));

  TEX.paint = detailTexture(256, (u, v) => 0.95 + 0.06 * (tiled(u, v, 10, 10, 4) - 0.5));
}

const TEX_SETTINGS = {
  wood: { bumpScale: 0.6 },
  linen: { bumpScale: 0.8 },
  felt: { bumpScale: 0.5 },
  paint: { bumpScale: 0.25 },
};

export function addEnvironment(renderer, scene) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(40, 20, 40), new THREE.MeshBasicMaterial({ color: 0x8a8578, side: THREE.BackSide }));
  env.add(room);
  const panel = (w, h, color, x, y, z, rx, ry) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, 0);
    env.add(m);
  };
  panel(14, 10, 0xfff4e2, 0, 9.9, 0, Math.PI / 2, 0);
  panel(10, 8, 0xe8f0ff, 0, 3, 19.9, 0, Math.PI);
  panel(8, 6, 0xc8c0b0, -19.9, 2, 0, 0, Math.PI / 2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
}

function mat(color, opts = {}) {
  const { tex, ...rest } = opts;
  const detail = tex ? TEX[tex] : null;
  const m = new THREE.MeshStandardMaterial({
    color,
    roughness: rest.roughness ?? 0.72,
    metalness: 0,
    ...(detail ? { map: detail.map, bumpMap: detail.bump, bumpScale: TEX_SETTINGS[tex].bumpScale } : {}),
    ...rest,
  });
  solidMats.push(m);
  return m;
}

// Box UVs in inches / TEX_INCHES with the texture's u axis along each face's
// longer side, so wood grain follows the board.
function worldUV(geo) {
  const { width: w, height: h, depth: d } = geo.parameters;
  const uv = geo.attributes.uv;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  const off = Math.random();
  faces.forEach(([a, b], f) => {
    for (let i = 0; i < 4; i += 1) {
      const k = f * 4 + i;
      let u = (uv.getX(k) * a) / TEX_INCHES;
      let v = (uv.getY(k) * b) / TEX_INCHES;
      if (b > a) [u, v] = [v, u];
      uv.setXY(k, u + off, v + off * 0.5);
    }
  });
  return geo;
}

function box(w, h, d, color, opts = {}) {
  const mesh = new THREE.Mesh(worldUV(new THREE.BoxGeometry(w, h, d)), mat(color, opts));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildHeaderDim(parent) {
  const d = DIMS;
  const top = openingTopAff(d);
  const h = headerHeight(d);
  const x = d.openingWidth / 2 + 6;
  const z = 3;
  const stroke = new THREE.LineBasicMaterial({ color: 0x3a2e22 });
  const ticks = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(x - 1.6, top, z),
    new THREE.Vector3(x + 1.6, top, z),
    new THREE.Vector3(x, top, z),
    new THREE.Vector3(x, top + h, z),
    new THREE.Vector3(x - 1.6, top + h, z),
    new THREE.Vector3(x + 1.6, top + h, z),
  ]);
  parent.add(new THREE.LineSegments(ticks, stroke));

  const tag = makeLabel(`16″ to ceiling`);
  tag.scale.set(16, 4, 1);
  tag.position.set(x + 11, top + h / 2, z + 2);
  parent.add(tag);

  const face = makeLabel(`25″ face · 30″ inside`);
  face.scale.set(18, 4.5, 1);
  face.position.set(0, d.sillAff - 4, 6);
  parent.add(face);
}

function buildNiche(parent) {
  const d = DIMS;
  const halfW = d.width / 2;
  const halfOpen = d.openingWidth / 2;
  const ret = returnEach(d);
  const top = openingTopAff(d);
  const midY = d.sillAff + d.openingHeight / 2;
  const t = d.wallThick;

  const back = box(d.width + 1.6, d.openingHeight, 0.8, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
  back.position.set(0, midY, -d.depth - 0.4);
  parent.add(back);

  [-1, 1].forEach((side) => {
    const wall = box(0.8, d.openingHeight, d.depth, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
    wall.position.set(side * (halfW + 0.4), midY, -d.depth / 2);
    parent.add(wall);
  });

  [-1, 1].forEach((side) => {
    const reveal = box(ret, d.openingHeight, 0.8, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
    reveal.position.set(side * (halfOpen + ret / 2), midY, -t + 0.4);
    parent.add(reveal);
  });

  const sill = box(d.width, 0.75, d.depth, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
  sill.position.set(0, d.sillAff - 0.375, -d.depth / 2);
  parent.add(sill);

  const jambT = JAMB;
  const jambs = [
    [jambT, d.openingHeight, -halfOpen + jambT / 2, midY],
    [jambT, d.openingHeight, halfOpen - jambT / 2, midY],
    [d.openingWidth, jambT, 0, top - jambT / 2],
  ];
  jambs.forEach(([w, h, x, y]) => {
    const j = box(w, h, jambT, PALETTE.jamb, { tex: "wood", roughness: 0.45 });
    j.position.set(x, y, jambT / 2);
    parent.add(j);
  });
}

function buildCloset(parent) {
  const d = DIMS;
  const c = closetLayout(d);
  const midY = c.head / 2;
  const boxCenterZ = (c.innerFrontZ + c.backZ) / 2;

  const back = box(d.closetWidth, c.head, 0.8, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
  back.position.set(c.cx, midY, c.backZ + 0.4);
  parent.add(back);

  [-1, 1].forEach((side) => {
    const wall = box(0.8, c.head, d.closetDepthInside, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
    wall.position.set(c.cx + side * (d.closetWidth / 2 - 0.4), midY, boxCenterZ);
    parent.add(wall);
  });

  const floor = box(d.closetWidth, 0.75, d.closetDepthInside, PALETTE.floor, { roughness: 0.9 });
  floor.position.set(c.cx, 0.4, boxCenterZ);
  parent.add(floor);

  [-1, 1].forEach((side) => {
    const reveal = box(c.ret, c.head, 0.8, PALETTE.wallSide, { tex: "paint", roughness: 0.8 });
    reveal.position.set(c.cx + side * (d.closetOpeningWidth / 2 + c.ret / 2), midY, c.innerFrontZ + 0.4);
    parent.add(reveal);
  });

  const jambT = JAMB;
  const jambs = [
    [jambT, c.head, c.entryLeft + jambT / 2, midY],
    [jambT, c.head, c.entryRight - jambT / 2, midY],
    [d.closetOpeningWidth, jambT, c.entryCx, c.head - jambT / 2],
  ];
  jambs.forEach(([w, h, x, y]) => {
    const j = box(w, h, jambT, PALETTE.jamb, { tex: "wood", roughness: 0.45 });
    j.position.set(x, y, jambT / 2);
    parent.add(j);
  });

  // Hinge on the east jamb: the left side when you step out of the closet, facing south.
  const leafW = d.closetOpeningWidth - 1.25;
  const leafH = c.head - 2;
  const thick = 1.25;
  const hinge = new THREE.Group();
  hinge.position.set(c.entryRight - 0.7, midY, 0.8);
  const door = box(leafW, leafH, thick, 0xf7f4ee, { tex: "paint", roughness: 0.42 });
  door.position.set(-leafW / 2, 0, 0);
  hinge.add(door);
  hinge.rotation.y = 0.7;
  parent.add(hinge);
  const knob = box(0.55, 0.55, 0.55, FINISH.brass, { roughness: 0.3, metalness: 0.75 });
  knob.position.set(-leafW + 4, 0, thick / 2 + 0.2);
  door.add(knob);

  const tag = makeLabel(`closet  39″ inside`);
  tag.scale.set(16, 4, 1);
  tag.position.set(c.cx, 14, c.innerFrontZ - 8);
  parent.add(tag);

  const align = makeLabel(`backs align · niche 44″ out`);
  align.scale.set(20, 5, 1);
  align.position.set(c.cx, 20, c.backZ - 4);
  parent.add(align);
}

function buildDresser(parent) {
  const d = DIMS;
  const p = dresserLayout(d);
  const wood = 0x6b4630;
  const post = 1.35;
  const depth = d.dresserDepth;
  const width = d.dresserWidth;
  const height = d.dresserHeight;
  const x0 = p.x - depth / 2;
  const add = (w, h, dp, color, x, y, z, opts = {}) => {
    const mesh = box(w, h, dp, color, { tex: opts.tex, roughness: opts.roughness ?? 0.55 });
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      add(post, height, post, wood, p.x + sx * (depth / 2 - post / 2), height / 2, p.z + sz * (width / 2 - post / 2), { tex: "wood" });
    });
  });
  add(0.5, height - 4, width - post * 2, 0x5c3c28, x0 + 0.4, height / 2, p.z, { tex: "wood", roughness: 0.7 });
  [8, 22, 36].forEach((y) => {
    add(depth - post, 0.75, width - post * 2, wood, p.x + 0.2, y, p.z, { tex: "wood" });
  });
  add(depth, 1.1, width, wood, p.x, height - 0.55, p.z, { tex: "wood", roughness: 0.48 });

  const padY = height;
  add(d.dresserPadD, d.dresserPadThick, d.dresserPadW, 0xf3efe6, p.x + 1.2, padY + d.dresserPadThick / 2, p.z, { roughness: 0.9 });
  add(1.1, 3.2, width - 1, wood, x0 + 0.7, padY + 2.2, p.z, { tex: "wood" });
  [-1, 1].forEach((sz) => {
    add(depth - 2, 2.4, 0.7, wood, p.x + 0.4, padY + 1.6, p.z + sz * (d.dresserPadW / 2 + 0.2), { tex: "wood" });
  });

  const hamper = box(d.hamperD - 1, d.hamperH - 2, d.hamperW - 1, PALETTE.bag, { tex: "linen", roughness: 0.9 });
  hamper.position.set(p.west + d.hamperD / 2, (d.hamperH - 2) / 2, p.hamperZ);
  parent.add(hamper);
  const rim = box(d.hamperD, 1.4, d.hamperW, 0x6d8a78, { roughness: 0.8 });
  rim.position.set(p.west + d.hamperD / 2, d.hamperH - 1.2, p.hamperZ);
  parent.add(rim);
  const hamperTag = makeLabel(`hamper`);
  hamperTag.scale.set(12, 3, 1);
  hamperTag.position.set(p.west + d.hamperD + 8, d.hamperH + 4, p.hamperZ);
  parent.add(hamperTag);

  const tag = makeLabel(`Graco  37×19×44`);
  tag.scale.set(22, 5.5, 1);
  tag.position.set(p.x + 16, height + 8, p.z);
  parent.add(tag);
}

function buildLiners(parent) {
  const d = DIMS;
  const h = d.linerTopAff - d.sillAff;
  const len = d.depth - d.backAir;
  [-1, 1].forEach((side) => {
    const liner = tint(box(d.linerThick, h, len, PALETTE.liner, { tex: "wood", roughness: 0.6 }), { raw: PALETTE.liner, finished: SHERWOOD });
    liner.position.set(side * (d.openingWidth / 2 - d.linerThick / 2), d.sillAff + h / 2, -len / 2);
    parent.add(liner);
  });
}

function buildTrays(parent) {
  const d = DIMS;
  const w = trayWidth(d);
  const slideX = w / 2 + d.slideThick / 2;
  const closedCenterZ = -(d.trayFrontSetback + d.trayDepth / 2);

  d.trays.forEach((tray, index) => {
    const floorY = tray.aff - d.trayThick / 2;
    const slideY = tray.aff + 0.6;

    [-1, 1].forEach((side) => {
      const fixed = box(d.slideThick, d.slideH, d.trayDepth, PALETTE.slide, { roughness: 0.35, metalness: 0.5 });
      fixed.position.set(side * slideX, slideY, closedCenterZ);
      parent.add(fixed);
    });

    const group = new THREE.Group();
    group.name = tray.id;
    const meshes = [];
    const add = (mesh) => {
      group.add(mesh);
      meshes.push(mesh);
      return mesh;
    };

    add(tint(box(w, d.trayThick, d.trayDepth, PALETTE.birch, { tex: "wood", roughness: 0.5 }), { raw: PALETTE.birch, finished: FINISH.oak }));

    [-1, 1].forEach((side) => {
      add(tint(box(0.5, d.trayLip, d.trayDepth, PALETTE.birchEdge, { tex: "wood", roughness: 0.5 }), { raw: PALETTE.birchEdge, finished: FINISH.oakEdge })).position.set(
        side * (w / 2 - 0.25),
        d.trayThick / 2 + d.trayLip / 2,
        0
      );
    });
    add(tint(box(w, d.trayLip, 0.5, PALETTE.birchEdge, { tex: "wood", roughness: 0.5 }), { raw: PALETTE.birchEdge, finished: FINISH.oakEdge })).position.set(
      0,
      d.trayThick / 2 + d.trayLip / 2,
      -d.trayDepth / 2 + 0.25
    );

    const face = only("raw", add(box(w + 1, d.trayFace, 0.75, PALETTE.birch, { tex: "wood", roughness: 0.45 })));
    face.position.set(0, -d.trayThick / 2 + d.trayFace / 2, d.trayDepth / 2 + 0.375);
    const handle = only("raw", add(box(9, 0.6, 0.7, PALETTE.handle, { roughness: 0.35, metalness: 0.15 })));
    trayPulls[index] = { raw: handle };
    handle.position.set(0, -d.trayThick / 2 + d.trayFace - 1.2, d.trayDepth / 2 + 1);

    // Finished: full-height inset oak face, flush with the frame, ⅛" reveals, finger pull.
    const reveal = 0.125;
    const bottom = tray.aff - d.trayThick;
    const next = d.trays[index + 1];
    const ceiling = next ? next.aff - d.trayThick : d.shelves[0].aff - d.shelfThick;
    const faceH = ceiling - reveal - bottom;
    const faceW = d.openingWidth - 2 * JAMB - 2 * reveal;
    const faceFrontZ = JAMB - closedCenterZ;
    const faceDepth = JAMB + d.trayFrontSetback;
    const oakFace = only("finished", add(box(faceW, faceH, faceDepth, FINISH.oak, { tex: "wood", roughness: 0.48 })));
    oakFace.position.set(0, bottom + faceH / 2 - floorY, faceFrontZ - faceDepth / 2);
    const pull = only("finished", add(box(8, 0.5, 0.3, FINISH.pull, { roughness: 0.6 })));
    trayPulls[index].finished = pull;
    pull.position.set(0, bottom + faceH - 0.6 - floorY, faceFrontZ - 0.1);

    const pairW = d.trayBinW * 2 + d.trayBinGap;
    const xs = [-pairW / 2 + d.trayBinW / 2, pairW / 2 - d.trayBinW / 2];
    for (let row = 0; row < 3; row += 1) {
      const z = d.trayDepth / 2 - 0.75 - d.trayBinD / 2 - row * (d.trayBinD + d.trayBinGap);
      xs.forEach((x) => {
        const bin = buildBin(d.trayBinW, tray.binH, d.trayBinD);
        bin.group.position.set(x, d.trayThick / 2 + tray.binH / 2, z);
        group.add(bin.group);
        meshes.push(...bin.parts);
      });
    }

    [-1, 1].forEach((side) => {
      const inner = box(d.slideThick * 0.6, d.slideH * 0.7, d.trayDepth, PALETTE.slide, {
        roughness: 0.3,
        metalness: 0.55,
      });
      inner.position.set(side * (w / 2 + d.slideThick * 0.3), slideY - tray.aff + d.trayThick / 2, 0);
      group.add(inner);
    });

    group.position.set(0, floorY, closedCenterZ);
    group.userData = { closedZ: closedCenterZ, openZ: closedCenterZ + d.trayDepth, index };
    meshes.forEach((m) => {
      m.userData.trayIndex = index;
    });
    trayMeshes.push(...meshes);
    trayGroups.push(group);
    parent.add(group);

    const tag = makeLabel(tray.tag);
    tag.scale.set(19, 4.75, 1);
    tag.position.set(d.width / 2 + 15, tray.aff + tray.binH / 2, -4);
    parent.add(tag);
  });
}

function buildBin(w, h, dpth) {
  const group = new THREE.Group();
  const t = 0.3;
  const parts = [];
  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    group.add(mesh);
    parts.push(mesh);
  };
  const shell = { raw: PALETTE.bin, finished: FINISH.felt };
  add(tint(box(w, t, dpth, PALETTE.bin, { tex: "felt", roughness: 0.95 }), shell), 0, -h / 2 + t / 2, 0);
  add(tint(box(t, h, dpth, PALETTE.bin, { tex: "felt", roughness: 0.95 }), shell), -w / 2 + t / 2, 0, 0);
  add(tint(box(t, h, dpth, PALETTE.bin, { tex: "felt", roughness: 0.95 }), shell), w / 2 - t / 2, 0, 0);
  add(tint(box(w - 2 * t, h, t, PALETTE.bin, { tex: "felt", roughness: 0.95 }), shell), 0, 0, -dpth / 2 + t / 2);
  add(tint(box(w - 2 * t, h, t, PALETTE.bin, { tex: "felt", roughness: 0.95 }), shell), 0, 0, dpth / 2 - t / 2);
  add(tint(box(w - 1, 0.35, dpth - 1, PALETTE.binIn, { tex: "felt", roughness: 0.9 }), { raw: PALETTE.binIn, finished: FINISH.feltIn }), 0, -h / 2 + 0.9, 0);
  add(tint(box(4.5, 1.6, 0.12, PALETTE.binTag, { roughness: 0.4, metalness: 0.35 }), { raw: PALETTE.binTag, finished: FINISH.brass }), 0, h / 2 - 2, dpth / 2 + 0.06);
  return { group, parts };
}

function buildShelves(parent) {
  const d = DIMS;
  const depth = shelfDepth(d);
  const frontZ = -d.shelfFrontIn;
  const centerZ = frontZ - depth / 2;
  const top = openingTopAff(d);
  const stripBottom = d.shelves.find((s) => s.slab)?.aff ?? d.linerTopAff;

  [-1, 1].forEach((side) => {
    [frontZ - 1.5, frontZ - depth + 1.5].forEach((z) => {
      const strip = box(0.25, top - stripBottom - 1, 0.6, PALETTE.pin, { roughness: 0.4, metalness: 0.3 });
      strip.position.set(side * (d.width / 2 - 0.125), stripBottom + (top - stripBottom - 1) / 2, z);
      parent.add(strip);
    });
  });

  d.shelves.forEach((shelf) => {
    if (shelf.slab) {
      const slabDepth = d.depth - d.backAir - d.slabFrontIn;
      const slab = tint(box(d.width, d.shelfThick, slabDepth, PALETTE.birch, { tex: "wood", roughness: 0.45 }), { raw: PALETTE.birch, finished: FINISH.oak });
      slab.position.set(0, shelf.aff - d.shelfThick / 2, -d.slabFrontIn - slabDepth / 2);
      parent.add(slab);
      const edge = tint(box(d.width, d.shelfThick + 0.1, 0.25, PALETTE.birchEdge, { tex: "wood", roughness: 0.45 }), { raw: PALETTE.birchEdge, finished: FINISH.oakEdge });
      edge.position.set(0, shelf.aff - d.shelfThick / 2, -d.slabFrontIn + 0.125);
      parent.add(edge);
    } else {
      const plank = tint(box(d.width - 0.6, d.shelfThick, depth, PALETTE.birch, { tex: "wood", roughness: 0.5 }), { raw: PALETTE.birch, finished: FINISH.oak });
      plank.position.set(0, shelf.aff - d.shelfThick / 2, centerZ);
      parent.add(plank);
    }

    const pairW = d.shelfBinW * 2 + 1;
    const xs = [-pairW / 2 + d.shelfBinW / 2, pairW / 2 - d.shelfBinW / 2];
    xs.forEach((x) => {
      const firstRow = shelf.frontRow === false ? 1 : 0;
      const travel = d.shelfFrontIn - d.slabFrontIn - 0.25 + firstRow * (d.shelfBinD + d.shelfBinGap);
      const column = { bins: [], open: false, t: 0, travel };
      for (let row = firstRow; row < 2; row += 1) {
        const z = frontZ - 0.5 - d.shelfBinD / 2 - row * (d.shelfBinD + d.shelfBinGap);
        const bin = buildBin(d.shelfBinW, shelf.binH, d.shelfBinD);
        bin.group.position.set(x, shelf.aff + shelf.binH / 2, z);
        parent.add(bin.group);
        if (shelf.slab) {
          column.bins.push({ group: bin.group, baseZ: z });
          bin.parts.forEach((m) => {
            m.userData.slabColumn = slabColumns.length;
          });
          slabMeshes.push(...bin.parts);
        }
      }
      if (shelf.slab) slabColumns.push(column);
    });

    const tag = makeLabel(shelf.tag);
    tag.scale.set(19, 4.75, 1);
    tag.position.set(d.width / 2 + 15, shelf.aff + shelf.binH / 2, -8);
    parent.add(tag);
  });
}

function buildRecessLight(parent) {
  const d = DIMS;
  const top = openingTopAff(d);
  const z = -d.puckFromFront;
  const thick = d.puckCeil;
  const underside = top - thick;
  const group = new THREE.Group();
  group.name = "recess-light";

  const w = d.width;
  const dep = d.depth;
  const plate = new THREE.Shape();
  plate.moveTo(-w / 2, -dep / 2);
  plate.lineTo(w / 2, -dep / 2);
  plate.lineTo(w / 2, dep / 2);
  plate.lineTo(-w / 2, dep / 2);
  plate.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, z + dep / 2, d.puckDia / 2, 0, Math.PI * 2, true);
  plate.holes.push(hole);
  const ceil = new THREE.Mesh(
    new THREE.ExtrudeGeometry(plate, { depth: thick, bevelEnabled: false, curveSegments: 36 }),
    mat(PALETTE.wallSide, { roughness: 0.82 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, top, -dep / 2);
  ceil.receiveShadow = true;
  group.add(ceil);

  const well = new THREE.Mesh(
    new THREE.CylinderGeometry(d.puckDia / 2 - 0.04, d.puckDia / 2 - 0.04, d.puckWell, 32, 1, true),
    mat(PALETTE.well, { roughness: 0.95, side: THREE.DoubleSide })
  );
  well.position.set(0, underside + d.puckWell / 2, z);
  group.add(well);

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

  const spot = new THREE.SpotLight(0xffe8b0, 140, 90, Math.PI / 3.6, 0.5, 1.2);
  spot.position.set(0, underside + 0.4, z);
  spot.target.position.set(0, d.sillAff + 10, z - 6);
  const mobile = window.matchMedia("(pointer: coarse)").matches;
  spot.castShadow = !mobile;
  if (!mobile) {
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.camera.near = 1;
    spot.shadow.camera.far = 90;
    spot.shadow.bias = -0.002;
  }
  group.add(spot);
  group.add(spot.target);

  puckLights = { spot, lens };
  puckMeshes.length = 0;
  puckMeshes.push(lens, trim, well);
  applyLight();
  parent.add(group);
}

function buildDisplay(parent) {
  const d = DIMS;
  const y = d.shelves[0].aff;
  const half = (d.shelfBinW + 1) / 2;

  const frame = new THREE.Group();
  const outer = box(5, 6.5, 0.6, FINISH.oak, { tex: "wood", roughness: 0.5 });
  const inner = box(3.8, 5.3, 0.64, FINISH.frame, { roughness: 0.8 });
  frame.add(outer, inner);
  frame.rotation.x = -0.14;
  frame.position.set(-half, y + 3.25, -8);
  parent.add(only("finished", frame));
  displayItems.push({ obj: frame, column: 0 });

  const plant = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.4, 3.2, 24), mat(FINISH.pot, { roughness: 0.7 }));
  pot.position.y = 1.6;
  const leaves = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 14), mat(FINISH.leaf, { roughness: 0.85 }));
  leaves.position.y = 5;
  leaves.scale.set(1, 0.9, 1);
  [pot, leaves].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });
  plant.add(pot, leaves);
  plant.position.set(half, y, -6);
  parent.add(only("finished", plant));
  displayItems.push({ obj: plant, column: 1 });
}

// Linen panel on a slim rod tucked behind the header trim, inside the opening.
// Covers the shelves only (rod → just above the S1 slab); gathers to the right.
function buildCurtain(parent) {
  const d = DIMS;
  const inner = d.openingWidth - 2 * JAMB;
  const rodY = openingTopAff(d) - 1.2;
  const rodZ = -0.7;
  const bottom = d.shelves[0].aff + 0.4;
  const h = rodY - bottom;
  const segs = 180;
  const geo = new THREE.PlaneGeometry(1, h, segs, 6);
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, (uv.getX(i) * inner * 1.6) / 8, (uv.getY(i) * h) / 8);
  const baseU = Float32Array.from({ length: geo.attributes.position.count }, (_, i) => geo.attributes.position.getX(i) + 0.5);
  const baseY = Float32Array.from({ length: geo.attributes.position.count }, (_, i) => geo.attributes.position.getY(i));
  const cloth = new THREE.Mesh(geo, mat(FINISH.linen, { tex: "linen", roughness: 0.92, side: THREE.DoubleSide }));
  cloth.castShadow = true;
  cloth.receiveShadow = true;
  cloth.position.set(0, bottom + h / 2, rodZ);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, inner, 16),
    mat(FINISH.brass, { roughness: 0.35, metalness: 0.85 })
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, rodY + 0.25, rodZ);

  parent.add(only("finished", cloth));
  parent.add(only("finished", rod));
  curtain = { cloth, baseU, baseY, inner, h, last: -1 };
  layCurtain(0);
}

function layCurtain(t) {
  if (!curtain || Math.abs(curtain.last - t) < 1e-3) return;
  curtain.last = t;
  const { cloth, baseU, baseY, inner, h } = curtain;
  const pleats = 10;
  const right = inner / 2 - 0.15;
  const width = THREE.MathUtils.lerp(4, inner - 0.3, t);
  const amp = THREE.MathUtils.lerp(0.62, 0.32, t);
  const pos = cloth.geometry.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const u = baseU[i];
    const sag = 1 + 0.25 * (0.5 - baseY[i] / h);
    pos.setX(i, right - (1 - u) * width);
    pos.setZ(i, amp * sag * Math.sin(u * pleats * Math.PI * 2) + 0.06 * Math.sin(u * 37 + baseY[i] * 0.4));
  }
  pos.needsUpdate = true;
  cloth.geometry.computeVertexNormals();
}

// 5'1" (61") scale figure beside the opening, out of the tray path, near hand on
// the T2 pull. The reaching arm is a two-bone IK that follows the tray.
const PERSON = { height: 61, shoulderY: 50, shoulderHalf: 7, upperArm: 11, forearm: 11.5, tray: 1 };

function limb(radius, color) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, 1, 6, 14), mat(color, { roughness: 0.75 }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function setLimb(mesh, a, b, radius) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.geometry.dispose();
  mesh.geometry = new THREE.CapsuleGeometry(radius, Math.max(0.01, len), 6, 14);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function pullTarget() {
  const pulls = trayPulls[PERSON.tray];
  const pull = state.style === "finished" ? pulls.finished : pulls.raw;
  const p = new THREE.Vector3();
  pull.getWorldPosition(p);
  return p.add(new THREE.Vector3(-2.5, -0.2, 0.9));
}

function buildPerson(parent) {
  const d = DIMS;
  const skin = 0xd8c3a8;
  const top = 0x9fb0b8;
  const pants = 0x4f5660;
  const body = new THREE.Group();

  const add = (mesh, x, y, z) => {
    mesh.position.set(x, y, z);
    body.add(mesh);
    return mesh;
  };
  [-1, 1].forEach((side) => {
    const leg = limb(2.6, pants);
    setLimb(leg, new THREE.Vector3(side * 3.4, 3.2, 0), new THREE.Vector3(side * 3.6, 30, 0), 2.6);
    body.add(leg);
    add(box(3.6, 2.2, 9, 0x3b3530, { roughness: 0.6 }), side * 3.4, 1.1, 2);
  });
  const hips = add(new THREE.Mesh(new THREE.SphereGeometry(6.4, 24, 16), mat(pants, { roughness: 0.75 })), 0, 31.5, 0);
  hips.scale.set(1.05, 0.6, 0.72);
  const torso = add(new THREE.Mesh(new THREE.CapsuleGeometry(6.2, 11, 8, 20), mat(top, { roughness: 0.85 })), 0, 41.5, 0);
  torso.scale.set(1.12, 1, 0.68);
  add(new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, 3.4, 16), mat(skin)), 0, 51.6, 0);
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(4, 24, 18), mat(skin, { roughness: 0.6 })), 0, PERSON.height - 4, 0.3);
  head.scale.set(0.9, 1, 1);
  const hair = add(new THREE.Mesh(new THREE.SphereGeometry(4.25, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(0x4a3526, { roughness: 0.8 })), 0, PERSON.height - 3.8, -0.4);
  hair.scale.set(0.93, 1, 1.02);
  body.children.forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
  });

  const target = pullTarget();
  const pos = new THREE.Vector3(-(d.openingWidth / 2 + 9.5), 0, 12);
  const reach = 0.93 * (PERSON.upperArm + PERSON.forearm);
  let shoulder = null;
  for (let i = 0; i < 6; i += 1) {
    const f = new THREE.Vector3(target.x - pos.x, 0, target.z - pos.z).normalize();
    const left = new THREE.Vector3(f.z, 0, -f.x);
    body.rotation.y = Math.atan2(f.x, f.z);
    shoulder = pos.clone().addScaledVector(left, PERSON.shoulderHalf).setY(PERSON.shoulderY);
    const gap = shoulder.distanceTo(target) - reach;
    if (Math.abs(gap) < 0.2) break;
    pos.addScaledVector(f, gap);
  }
  body.position.copy(pos);
  parent.add(body);

  const reachUpper = limb(1.6, top);
  const reachFore = limb(1.35, skin);
  const reachHand = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), mat(skin, { roughness: 0.6 }));
  const restUpper = limb(1.6, top);
  const restFore = limb(1.35, skin);
  const restHand = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), mat(skin, { roughness: 0.6 }));
  const arms = [reachUpper, reachFore, reachHand, restUpper, restFore, restHand];
  arms.forEach((m) => {
    m.castShadow = true;
    parent.add(m);
  });

  const toWorld = (x, y, z) => body.localToWorld(new THREE.Vector3(x, y, z));
  body.updateMatrixWorld(true);
  const restShoulder = toWorld(-PERSON.shoulderHalf, PERSON.shoulderY, 0);
  const restElbow = toWorld(-PERSON.shoulderHalf - 1.2, PERSON.shoulderY - PERSON.upperArm, 0.4);
  const restWrist = toWorld(-PERSON.shoulderHalf - 1.4, PERSON.shoulderY - PERSON.upperArm - PERSON.forearm + 1.5, 1.6);
  setLimb(restUpper, restShoulder, restElbow, 1.6);
  setLimb(restFore, restElbow, restWrist, 1.35);
  restHand.position.copy(restWrist);

  const tag = makeLabel(`5′1″ · reaching T2`);
  tag.scale.set(16, 4, 1);
  tag.position.set(pos.x - 4, PERSON.height + 5, pos.z);
  parent.add(tag);

  person = { body, arms, tag, shoulder, reachUpper, reachFore, reachHand, lastKey: "" };
  posePerson();
}

function posePerson() {
  if (!person) return;
  const vis = state.personOn;
  person.body.visible = vis;
  person.arms.forEach((m) => {
    m.visible = vis;
  });
  if (!vis) return;
  const target = pullTarget();
  const key = `${target.x.toFixed(2)},${target.y.toFixed(2)},${target.z.toFixed(2)}`;
  if (key === person.lastKey) return;
  person.lastKey = key;
  const { shoulder } = person;
  const L1 = PERSON.upperArm;
  const L2 = PERSON.forearm;
  const toT = new THREE.Vector3().subVectors(target, shoulder);
  const dist = Math.min(toT.length(), L1 + L2 - 0.01);
  const dir = toT.clone().normalize();
  const hand = shoulder.clone().addScaledVector(dir, dist);
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const down = new THREE.Vector3(0, -1, 0);
  const bend = down.addScaledVector(dir, -down.dot(dir)).normalize();
  const elbow = shoulder.clone().addScaledVector(dir, a).addScaledVector(bend, h);
  setLimb(person.reachUpper, shoulder, elbow, 1.6);
  setLimb(person.reachFore, elbow, hand, 1.35);
  person.reachHand.position.copy(hand);
}

function togglePerson() {
  state.personOn = !state.personOn;
  person.lastKey = "";
  person.tag.visible = state.personOn && state.labelsOn;
  const btn = document.getElementById("btn-person");
  if (btn) btn.textContent = state.personOn ? "Hide person" : "Show person";
}

function applyStyle(id) {
  state.style = id;
  Object.entries(styleOnly).forEach(([sid, objs]) => {
    objs.forEach((o) => {
      o.visible = sid === id;
    });
  });
  styleTints.forEach(({ m, colors }) => m.color.set(colors[id] ?? colors.raw));
  const btn = document.getElementById("btn-style");
  if (btn) btn.textContent = `Style: ${STYLES.find((s) => s.id === id).name}`;
  const cb = document.getElementById("btn-curtain");
  if (cb) cb.style.display = id === "finished" ? "" : "none";
}

function cycleStyle() {
  const i = STYLES.findIndex((s) => s.id === state.style);
  applyStyle(STYLES[(i + 1) % STYLES.length].id);
}

function toggleCurtain() {
  state.curtainClosed = !state.curtainClosed;
  const btn = document.getElementById("btn-curtain");
  if (btn) btn.textContent = state.curtainClosed ? "Open curtain" : "Close curtain";
}

function firstVisible(hits) {
  return hits.find((h) => {
    for (let o = h.object; o; o = o.parent) if (!o.visible) return false;
    return true;
  });
}

function buildShaftTag(parent) {
  const d = DIMS;
  const tag = makeLabel(`light shaft · 12″`);
  tag.scale.set(14, 3.5, 1);
  tag.position.set(-d.width / 2 - 12, openingTopAff(d) - 8, -d.shelfFrontIn / 2);
  parent.add(tag);
}

function makeLabel(text) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(244,247,244,0.92)";
  ctx.strokeStyle = "rgba(28,42,36,0.16)";
  roundRect(ctx, 8, 24, 496, 80, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1c2a24";
  ctx.font = "600 40px Outfit, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
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

function syncTrayButton() {
  const btn = document.getElementById("btn-trays");
  if (btn) btn.textContent = state.traysOpen.some(Boolean) ? "Close trays" : "Pull trays";
}

function toggleTray(index) {
  state.traysOpen[index] = !state.traysOpen[index];
  syncTrayButton();
}

function toggleAllTrays() {
  const anyOpen = state.traysOpen.some(Boolean);
  state.traysOpen = state.traysOpen.map(() => !anyOpen);
  syncTrayButton();
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
  if (person) person.tag.visible = state.labelsOn && state.personOn;
  const btn = document.getElementById("btn-labels");
  if (btn) btn.textContent = state.labelsOn ? "Labels off" : "Labels on";
}

function applyLight() {
  if (!puckLights) return;
  const on = state.lightOn;
  const solo = on && !state.roomOn;
  puckLights.spot.intensity = on ? (solo ? 520 : 140) : 0;
  puckLights.lens.material.emissiveIntensity = on ? (solo ? 5.2 : 2.4) : 0;
  puckLights.lens.material.color.set(on ? PALETTE.glow : 0x4a4844);
  puckLights.lens.material.emissive.set(on ? 0xfff3c0 : 0x000000);
  const btn = document.getElementById("btn-light");
  if (btn) btn.textContent = on ? "Can off" : "Can on";
}

function toggleLight() {
  state.lightOn = !state.lightOn;
  applyLight();
}


export function handleClick(raycaster) {
  const slabHit = firstVisible(raycaster.intersectObjects(slabMeshes, false));
  if (slabHit) {
    const column = slabColumns[slabHit.object.userData.slabColumn];
    column.open = !column.open;
    return true;
  }
  const trayHit = firstVisible(raycaster.intersectObjects(trayMeshes, false));
  if (trayHit) {
    toggleTray(trayHit.object.userData.trayIndex);
    return true;
  }
  const puckHit = raycaster.intersectObjects(puckMeshes, false);
  if (puckHit.length) {
    toggleLight();
    return true;
  }
  return false;
}

export function tickFitout() {
  trayGroups.forEach((group, i) => {
    const goal = state.traysOpen[i] ? 1 : 0;
    state.trayT[i] += (goal - state.trayT[i]) * 0.12;
    group.position.z = THREE.MathUtils.lerp(group.userData.closedZ, group.userData.openZ, state.trayT[i]);
  });
  slabColumns.forEach((column) => {
    column.t += ((column.open ? 1 : 0) - column.t) * 0.12;
    column.bins.forEach((bin) => {
      bin.group.position.z = bin.baseZ + column.travel * column.t;
    });
  });
  const finished = state.style === "finished";
  displayItems.forEach(({ obj, column }) => {
    obj.visible = finished && slabColumns[column].t < 0.05;
  });
  if (curtain) {
    state.curtainT += ((state.curtainClosed ? 1 : 0) - state.curtainT) * 0.1;
    layCurtain(state.curtainT);
  }
  posePerson();
}

/** Storage fit-out + closet + dresser, all in niche-local coords. */
export function buildStorageNiche(parent) {
  buildNiche(parent);
  buildHeaderDim(parent);
  buildCloset(parent);
  buildDresser(parent);
  buildLiners(parent);
  buildTrays(parent);
  buildShelves(parent);
  buildRecessLight(parent);
  buildDisplay(parent);
  buildCurtain(parent);
  buildShaftTag(parent);
  buildPerson(parent);
}



export {
  only,
  tint,
  makeTextures,
  mat,
  box,
  makeLabel,
  buildHeaderDim,
  buildNiche,
  buildCloset,
  buildDresser,
  buildLiners,
  buildTrays,
  buildShelves,
  buildRecessLight,
  buildDisplay,
  buildCurtain,
  buildShaftTag,
  buildPerson,
  posePerson,
  togglePerson,
  applyStyle,
  cycleStyle,
  toggleCurtain,
  toggleAllTrays,
  toggleTray,
  setOpacity,
  toggleLabels,
  applyLight,
  toggleLight,
  solidMats,
  labels,
};

