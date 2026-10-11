/**
 * Félix niche — taped + inferred dimensions (inches).
 * Single source of truth for the 3D model. Add fields here as we build on it.
 *
 * Tape 2026-10-09 · P-170 · felix-changing-alcove.md
 */

export const DIMS = {
  // Opening (taped)
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

  // Changing pad — 16×28–29" contour, L–R at the front of the slab
  padWidth: 28.5,
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

  // Room (not taped — framing only)
  roomWidth: 120,
  roomDepth: 90,
  ceiling: 108,
  wallThick: 6,

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
    "sill + closed wall below",
    "changing slab @ ~36 AFF",
    "hollow drawer",
    "recess can over pad",
    "16×28.5 pad L–R, head left",
    "front rail",
    "clear zone over the pad",
    "closed step behind the pad = shelf 1 @ 45\"",
    "shelves 57 / 69 / 81, 2 rows of bins",
    "side-wall wipes caddy (head end)",
  ],
  next: ["Claire reach test @ shelf 2", "three drawers", "tape sill"],
};
