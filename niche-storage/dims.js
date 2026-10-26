/**
 * Félix niche — storage-only alternative (inches).
 * Same box as the changing-station model (`../niche/dims.js`), different fit-out:
 * two 40" full-extension pull-out trays low (T2 at shoulder height is the top
 * tray), a full-depth slab on T2, two shelves above on pin strips with front
 * edges 12" in so the recess can lights a shaft in front of them.
 *
 * P-170 · felix-niche-storage.md
 */

export const DIMS = {
  // Face opening (Fred 2026-10-13). Interior `width` is the Oct 9 30″ tape.
  openingWidth: 25,
  width: 30,
  depth: 44,
  openingHeight: 70.5,
  sillAff: 25, // inferred from the Oct 9 photo; tape to confirm

  // Side-wall plywood liners carry the slides
  linerThick: 0.75,
  linerTopAff: 49.75,
  slideThick: 0.5,
  slideH: 1.75,

  // Pull-out trays (top of the tray floor, AFF). 40" full-extension slides.
  trayDepth: 40,
  trayThick: 0.75,
  trayLip: 2,
  trayFace: 4,
  trayFrontSetback: 0.5,
  trays: [
    { id: "T1", aff: 26, binH: 12, tag: "T1 · 26″ · diapers + wipes" },
    { id: "T2", aff: 40, binH: 8.5, tag: "T2 · 40″ · clothes now" },
  ],
  trayBinW: 10.75, // two-across must pass the 25" face with the tray
  trayBinD: 12.5,
  trayBinGap: 0.5,

  // S1 is a full-depth fixed slab on the liners, capping T2. Front row left open;
  // the back-row bins slide forward along it to the front edge.
  // S2 and S3 are shelves on pin strips, front 12" in.
  shelfFrontIn: 12,
  slabFrontIn: 0.25,
  backAir: 1,
  shelfThick: 0.75,
  shelves: [
    { id: "S1", aff: 50.5, binH: 11.5, slab: true, frontRow: false, tag: "S1 · 50½″ · slab · bins slide" },
    { id: "S2", aff: 64, binH: 12, tag: "S2 · 64″ · sleep + next size" },
    { id: "S3", aff: 78, binH: 14, tag: "S3 · 78″ · bulky · stool" },
  ],
  shelfBinW: 13,
  shelfBinD: 14.5,
  shelfBinGap: 0.75,

  // Room — taped 2026-10-13 (felix-bedroom.md). Niche is on the north wall.
  // roomWidth = E–W along the closet wall; roomDepth = N–S into the room.
  // Origin for 3D: niche opening center, +Z into the room (south), −Z into the box.
  roomWidth: 122,
  roomDepth: 139,
  // North wall W→E: 33 pier · 25 face · 13 pier · 28 closet entry · 23 leftover.
  northPier: 33,
  eastLeftover: 23,
  // 16" header (Fred 2026-10-13) + sill ~25 + opening 70.5 → ~111.5. Tape sill to lock.
  headerFromCeiling: 16,
  ceiling: 111.5,
  wallThick: 6,

  // Clothes closet (P-143), east of the niche. Depth is INSIDE; the back lines
  // up with this niche's 44" OUTSIDE (room face → back). Front wall = 44 − 39.
  closetOpeningWidth: 28,
  closetWidth: 40,
  closetDepthInside: 39,
  closetPierFromNiche: 13,

  // Graco changing table with pad (Wayfair GR2267), west wall, south of the door.
  doorWidth: 35,
  doorHeight: 80,
  dresserWidth: 37,
  dresserDepth: 19,
  dresserHeight: 44,
  dresserGapFromDoor: 6,
  dresserPadW: 31,
  dresserPadD: 16,
  dresserPadThick: 2,
  hamperW: 14,
  hamperD: 14,
  hamperH: 22,

  // Windows: 35″ wide, 6″ from corners (taped). Height / sill not taped.
  windowWidth: 35,
  windowFromCorner: 6,
  windowSillAff: 36,
  windowHeight: 48,

  // Nestig Wave, full crib. OSKARSHAMN wing chair + footstool (US inches).
  cribW: 54.3,
  cribD: 31,
  cribH: 31.5,
  cribRail: 6,
  chairW: 32.25,
  chairD: 33.875,
  chairH: 39,
  chairSeat: 17.375,
  footW: 15.75,
  footD: 22.44,
  footH: 16.54,

  // Recess can in the niche ceiling (as-built; position not taped)
  puckDia: 4,
  puckTrim: 6,
  puckWell: 2.4,
  puckFromFront: 9,
  puckCeil: 0.85,
};

export function openingTopAff(d = DIMS) {
  return d.sillAff + d.openingHeight;
}

/** Return / reveal each side: interior minus face, split. */
export function returnEach(d = DIMS) {
  return (d.width - d.openingWidth) / 2;
}

/** Drywall from opening head to ceiling. */
export function headerHeight(d = DIMS) {
  return d.headerFromCeiling;
}

/**
 * Room in niche-local coords: origin at the 25″ face center, +Z south into
 * the room. West wall is the 33″ north pier plus half the opening, not
 * roomWidth/2 — the niche is not on the room centerline.
 */
export function roomLayout(d = DIMS) {
  const westToNicheCx = d.northPier + d.openingWidth / 2;
  const leftover = d.roomWidth - (d.northPier + d.openingWidth + d.closetPierFromNiche + d.closetOpeningWidth);
  return {
    westToNicheCx,
    westX: -westToNicheCx,
    eastX: d.roomWidth - westToNicheCx,
    northZ: 0,
    southZ: d.roomDepth,
    doorZ0: 0,
    doorZ1: d.doorWidth,
    leftover,
    southWinX0: -westToNicheCx + d.windowFromCorner,
    eastWinZ0: d.windowFromCorner,
  };
}

/** Closet placement so its inside back matches the niche's outside back. */
export function closetLayout(d = DIMS) {
  const entryLeft = d.openingWidth / 2 + d.closetPierFromNiche;
  const ret = (d.closetWidth - d.closetOpeningWidth) / 2;
  const frontWall = d.depth - d.closetDepthInside;
  return {
    entryLeft,
    entryRight: entryLeft + d.closetOpeningWidth,
    entryCx: entryLeft + d.closetOpeningWidth / 2,
    ret,
    frontWall,
    innerFrontZ: -frontWall,
    backZ: -d.depth,
    head: d.ceiling - d.headerFromCeiling,
    cx: entryLeft + d.closetOpeningWidth / 2,
  };
}

/** Changing dresser on the west wall, south of the room door. */
export function dresserLayout(d = DIMS) {
  const room = roomLayout(d);
  const west = room.westX;
  const z0 = d.doorWidth + d.dresserGapFromDoor;
  return {
    west,
    x: west + d.dresserDepth / 2,
    z0,
    z: z0 + d.dresserWidth / 2,
    hamperZ: z0 + d.dresserWidth + 3 + d.hamperD / 2,
  };
}

/** Crib on the east wall, just south of the east window. */
export function cribLayout(d = DIMS) {
  const room = roomLayout(d);
  const z0 = d.windowFromCorner + d.windowWidth + 4;
  return {
    z0,
    z1: z0 + d.cribW,
    z: z0 + d.cribW / 2,
    x: room.eastX - d.cribD / 2,
  };
}

/**
 * OSKARSHAMN by the south window. Local +X is the back of the chair;
 * yaw -135° turns the seat toward the northeast, at the east window.
 * Seat is inset so the rotated back stays off the south and west walls.
 */
export function chairLayout(d = DIMS) {
  const room = roomLayout(d);
  const yaw = -Math.PI * 0.75;
  const x = room.westX + 28;
  const z = room.southZ - 28;
  const footDist = d.chairD / 2 + 3 + d.footD / 2;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return {
    x,
    z,
    yaw,
    z0: z - d.chairW,
    z1: z,
    footX: x + -footDist * c,
    footZ: z + footDist * s,
  };
}

/** Width of a tray between the slides. Sized to pass the 25" face. */
export function trayWidth(d = DIMS) {
  return d.openingWidth - 2 * (d.linerThick + d.slideThick);
}

/** Shelf depth from the 12" front edge to 1" off the back wall. */
export function shelfDepth(d = DIMS) {
  return d.depth - d.backAir - d.shelfFrontIn;
}

export function binCount(d = DIMS) {
  return d.trays.length * 6 + d.shelves.reduce((n, s) => n + (s.frontRow === false ? 2 : 4), 0);
}

export const ROADMAP = {
  in: [
    "niche box (no door)",
    "25\" face / 30\" interior / 16\" header",
    "closet 40×39 inside, back lined up with niche 44\" out",
    "room 122×139 · niche 33″ from NW · west door · E/S windows",
    "Graco changing table 37×19×44 on the west wall",
    "Nestig Wave east · OSKARSHAMN at the south window",
    "2 pull-out trays on 40\" slides, 6 bins each",
    "side liners + slides",
    "S1 full-depth slab over T2, front open, back bins slide forward",
    "S2 + S3 on pin strips, front 12\" in",
    "light shaft from the recess can",
  ],
  next: ["tape face + interior + sill + can", "Claire reach test", "pick bins"],
};
