/**
 * Sanity-check Félix bedroom + storage-niche layout numbers.
 * Run: node diy-projects/felix-bedroom/check-dims.js
 */
import {
  DIMS,
  roomLayout,
  closetLayout,
  dresserLayout,
  cribLayout,
  chairLayout,
  returnEach,
  headerHeight,
  openingTopAff,
  nicheCeilingAff,
} from "../niche-storage/dims.js";

const errors = [];
const check = (ok, msg) => {
  if (!ok) errors.push(msg);
};
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

const d = DIMS;
const r = roomLayout(d);
const c = closetLayout(d);
const dress = dresserLayout(d);
const crib = cribLayout(d);
const chair = chairLayout(d);

check(
  near(d.northPier + d.openingWidth + d.closetPierFromNiche + d.closetOpeningWidth + r.leftover, d.roomWidth),
  `north segs should sum to ${d.roomWidth}, leftover=${r.leftover}`
);
check(near(r.eastX - r.westX, d.roomWidth), `east-west span ${r.eastX - r.westX} != ${d.roomWidth}`);
check(near(r.westX, -(d.northPier + d.openingWidth / 2)), `west wall from niche center, got ${r.westX}`);
check(near(r.leftover, d.eastLeftover), `leftover ${r.leftover} != eastLeftover ${d.eastLeftover}`);
check(near(d.northPier, d.westToNicheTrim + d.trimWidth), "north pier = west→trim + trim");
check(near(d.closetPierFromNiche, d.trimWidth + d.nicheToClosetTrim + d.trimWidth), "closet pier includes both trims + gap");
check(near(d.eastLeftover, d.trimWidth + d.closetTrimToEast), "east leftover = trim + closet→east");
check(near(returnEach(d), 2.875), `returns should be 2.875, got ${returnEach(d)}`);
check(c.frontWall === d.depth - d.closetDepthInside, "closet front wall is outside minus inside");
check(c.frontWall === 5, `closet front should be 5", got ${c.frontWall}`);
check(c.backZ === -d.depth, "closet back should match niche outside back");
check(near(headerHeight(d), 15.75), `header 15.75 to ceiling, got ${headerHeight(d)}`);
check(near(openingTopAff(d) + headerHeight(d), d.ceiling), "sill + opening + header = ceiling");
check(near(d.trimToCeiling + d.trimWidth + d.openingHeight + d.sillAff, d.ceiling), "trim top to ceiling tape");
check(near(nicheCeilingAff(d), d.sillAff + d.nicheInsideHeight), "niche ceiling AFF");
check(near(d.doorFromNorth + d.doorWidth + d.doorSouthOfDoor, d.roomDepth), "west wall 3 + door + 104 = depth");
check(near(r.doorZ0, d.doorFromNorth), "door starts 3″ from north");
check(near(r.doorZ1, d.doorFromNorth + d.doorWidth), "door ends after 31.75″");
check(near(dress.z0, r.doorZ1 + d.dresserGapFromDoor), "dresser starts 6″ south of door");
check(dress.west === r.westX, "dresser sits on the real west wall, not roomWidth/2");
check(near(d.puckFromFront, d.puckFromInnerSouth + d.wallThick), "niche can 9″ from inner south = 15″ from face");
check(near(d.closetPuckFromFront, d.closetPuckFromInnerSouth + d.wallThick), "closet can 15.5″ from inner south = 21.5″ from face");
const yaw = chair.yaw;
const cos = Math.cos(yaw);
const sin = Math.sin(yaw);
const inside = (x, z, name) => {
  check(x > r.westX + 1 && x < r.eastX - 1 && z > 1 && z < r.southZ - 1, `${name} (${x.toFixed(1)}, ${z.toFixed(1)}) leaves the room`);
};
[[d.chairD / 2, d.chairW / 2], [d.chairD / 2, -d.chairW / 2], [-d.chairD / 2, d.chairW / 2], [-d.chairD / 2, -d.chairW / 2]].forEach(([lx, lz]) => {
  inside(chair.x + lx * cos + lz * sin, chair.z - lx * sin + lz * cos, "chair");
});
inside(chair.footX, chair.footZ, "footstool");
check(chair.x < crib.x - d.cribD / 2 - 6, "chair stays clear of the crib");
check(c.ret === (d.closetWidth - d.closetOpeningWidth) / 2, "closet returns");
check(c.ret <= d.closetPierFromNiche, "closet west return must fit in the pier");
check(c.ret <= r.leftover, "closet east return must fit in the leftover");
check(near(c.head, openingTopAff(d)), "closet opening head matches niche opening head");
check(c.insideHeight === d.ceiling, "closet inside height is the room ceiling");

if (errors.length) {
  console.error("FAIL");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log("ok");
console.log(`  room ${d.roomWidth}×${d.roomDepth}  westX=${r.westX} eastX=${r.eastX}  ceiling ${d.ceiling}`);
console.log(`  north ${d.northPier}/${d.openingWidth}/${d.closetPierFromNiche}/${d.closetOpeningWidth}/${r.leftover}`);
console.log(`  niche face ${d.openingWidth} · inside ${d.width} · sill ${d.sillAff} · open ${d.openingHeight} · box ${d.nicheInsideHeight}`);
console.log(`  door z ${r.doorZ0}–${r.doorZ1} (${d.doorWidth}") · dresser z ${dress.z0}`);
console.log(`  closet front ${c.frontWall}"  backs at ${-c.backZ}" · can ${d.closetPuckFromFront}" in`);
console.log(`  crib ${crib.z0}–${crib.z1}  chair @ (${chair.x.toFixed(1)}, ${chair.z.toFixed(1)})`);
