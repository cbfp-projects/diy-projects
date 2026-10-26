/**
 * Félix niche — taped + inferred dimensions (inches).
 * Single source of truth for the 3D model. Add fields here as we build on it.
 *
 * Tape 2026-10-09 · P-170 · felix-changing-alcove.md
 */

export const DIMS = {
  // Face opening (Fred 2026-10-13). Interior `width` is the Oct 9 30″ tape.
  openingWidth: 25,
  width: 30,
  depth: 44,
  openingHeight: 70.5,

  // Sill above finished floor (photo × 70.5" scale; tape to confirm)
  sillAff: 25,

  // Changing station — slab + one drawer. No door on this niche.
  carcassWidth: 29,
  carcassDepth: 42,
  carcassWall: 9.5, // sides under the slab
  topThick: 0.75,
  backAir: 1, // leave the box off the back wall
  frontSetback: 0.25,

  // Drawer (one full-height hollow box; later: three)
  drawerSlide: 28,
  drawerSideClear: 0.5,
  drawerBottomGap: 0.35,
  drawerTopGap: 0.35,
  drawerWall: 0.5,

  // Changing pad — must pass the 25" face. 16×28–29" will not.
  padWidth: 22.5,
  padDepth: 16,
  padThick: 1.35,
  padRim: 2.15,
  padRimThick: 1.7,

  // Front rail (1×3 hardwood, short of the corners)
  railHeight: 2.75,
  railThick: 0.75,
  railInset: 1.5,

  // Clear zone: nothing hangs over the pad, from the slab to the opening top.
  // Storage starts this far behind the pad's back edge.
  padStepGap: 0.5,

  // Closed stepped block behind the pad. Its top is shelf 1. Not a standing step.
  stepTopAff: 45,

  // Shelves 2–4 above the step, same footprint (step face → 1" off the back)
  shelfThick: 0.75,
  shelfStep: 12,
  shelfCount: 3,
  shelfSideGap: 1.05,

  // Bins: two rows per shelf, front row = in use, back row = overflow
  basketW: 13,
  basketH: 8,
  basketD: 11.75,
  basketGap: 0.75,

  // Side-wall caddy at the head end (left), wipes + cream. Shallow so it barely
  // reaches past the end of the pad; ~12" above it.
  caddyShelfDepth: 3.5,
  caddyShelfLength: 11,
  caddyShelfFromFront: 2,
  caddyShelfAff: 51,
  caddyLip: 1.5,

  // Room — taped 2026-10-13 (felix-bedroom.md). Niche is on the north wall.
  // roomWidth = E–W along the closet wall; roomDepth = N–S into the room.
  roomWidth: 122,
  roomDepth: 139,
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

  // Room changing dresser (decided 2026-10-13). Niche is storage.
  doorWidth: 35,
  doorHeight: 80,
  dresserWidth: 56,
  dresserDepth: 19,
  dresserHeight: 36,
  dresserGapFromDoor: 6,
  dresserPadW: 32,
  dresserPadD: 16,
  dresserPadThick: 1.35,
  hamperW: 14,
  hamperD: 14,
  hamperH: 22,

  // Recessed can in the niche ceiling, over the front changing pad (as-built;
  // 4" can is typical, not taped). Measured from the front opening, inches in.
  puckDia: 4,
  puckTrim: 6,
  puckWell: 2.4,
  puckFromFront: 9,
  puckCeil: 0.85,
};

export function slabAff(d = DIMS) {
  return d.sillAff + d.carcassWall + d.topThick;
}

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
  const west = -d.roomWidth / 2;
  const z0 = d.doorWidth + d.dresserGapFromDoor;
  return {
    west,
    x: west + d.dresserDepth / 2,
    z0,
    z: z0 + d.dresserWidth / 2,
    hamperZ: z0 + d.dresserWidth + 3 + d.hamperD / 2,
  };
}

/** Pad back edge, inches in from the opening. */
export function padBackIn(d = DIMS) {
  return d.frontSetback + d.railThick + 0.2 + d.padDepth;
}

/** Step face / front edge of all storage, inches in from the opening. */
export function storageFrontIn(d = DIMS) {
  return padBackIn(d) + d.padStepGap;
}

/** Back edge of the step and shelves, inches in from the opening. */
export function storageBackIn(d = DIMS) {
  return d.depth - d.backAir;
}

/** Top surface of each storage level, inches AFF. Index 0 is the step top. */
export function shelfHeights(d = DIMS) {
  const levels = [d.stepTopAff];
  for (let i = 1; i <= d.shelfCount; i += 1) levels.push(d.stepTopAff + d.shelfStep * i);
  return levels;
}

/** Features in / next — keep this current as we grow the model. */
export const ROADMAP = {
  in: [
    "niche box (no door)",
    "25\" face / 30\" interior / 2.5\" returns",
    "16\" header to ceiling",
    "closet 40×39 inside, back lined up with niche 44\" out",
    "room changing dresser 56×19 on the west wall",
    "sill + closed wall below",
    "changing slab @ ~36 AFF",
    "hollow drawer",
    "recess can over pad",
    "16×22.5 pad L–R (passes 25\" face), head left",
    "front rail",
    "clear zone over the pad",
    "closed step behind the pad = shelf 1 @ 45\"",
    "shelves 57 / 69 / 81, 2 rows of bins",
    "side-wall wipes caddy (head end)",
  ],
  next: ["tape face + interior + sill", "Claire reach test @ shelf 2", "three drawers"],
};
