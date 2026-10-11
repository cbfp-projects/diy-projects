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
  // Opening (taped 2026-10-09). No door.
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
  trayBinW: 13,
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

  // Room (not taped — framing only)
  roomWidth: 120,
  roomDepth: 90,
  ceiling: 108,
  wallThick: 6,

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

/** Width of a tray between the slides. */
export function trayWidth(d = DIMS) {
  return d.width - 2 * (d.linerThick + d.slideThick);
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
    "2 pull-out trays on 40\" slides, 6 bins each",
    "side liners + slides",
    "S1 full-depth slab over T2, front open, back bins slide forward",
    "S2 + S3 on pin strips, front 12\" in",
    "light shaft from the recess can",
  ],
  next: ["tape sill + can position", "Claire reach test", "pick bins"],
};
