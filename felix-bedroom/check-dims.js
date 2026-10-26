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
} from "../niche-storage/dims.js";

const errors = [];
const check = (ok, msg) => {
  if (!ok) errors.push(msg);
};

const d = DIMS;
const r = roomLayout(d);
const c = closetLayout(d);
const dress = dresserLayout(d);
const crib = cribLayout(d);
const chair = chairLayout(d);

check(d.northPier + d.openingWidth + d.closetPierFromNiche + d.closetOpeningWidth + r.leftover === d.roomWidth, `north segs should sum to ${d.roomWidth}, leftover=${r.leftover}`);
check(r.eastX - r.westX === d.roomWidth, `east-west span ${r.eastX - r.westX} != ${d.roomWidth}`);
check(r.westX === -(d.northPier + d.openingWidth / 2), `west wall should be 33+12.5 from niche center, got ${r.westX}`);
check(r.leftover === d.eastLeftover, `leftover ${r.leftover} != eastLeftover ${d.eastLeftover}`);
check(returnEach(d) === 2.5, `returns should be 2.5, got ${returnEach(d)}`);
check(c.frontWall === d.depth - d.closetDepthInside, "closet front wall is outside minus inside");
check(c.frontWall === 5, `closet front should be 5", got ${c.frontWall}`);
check(c.backZ === -d.depth, "closet back should match niche outside back");
check(headerHeight(d) === 16, "header 16 to ceiling");
check(dress.z0 === d.doorWidth + d.dresserGapFromDoor, "dresser starts 6\" south of door");
check(dress.west === r.westX, "dresser sits on the real west wall, not roomWidth/2");
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
check(c.ret <= d.closetPierFromNiche, "closet west return must fit in the 13\" pier");
check(c.ret <= r.leftover, "closet east return must fit in the leftover");

if (errors.length) {
  console.error("FAIL");
  errors.forEach((e) => console.error(" -", e));
  process.exit(1);
}

console.log("ok");
console.log(`  room ${d.roomWidth}×${d.roomDepth}  westX=${r.westX} eastX=${r.eastX}`);
console.log(`  north ${d.northPier}/${d.openingWidth}/${d.closetPierFromNiche}/${d.closetOpeningWidth}/${r.leftover}`);
console.log(`  closet front ${c.frontWall}"  backs at ${-c.backZ}"`);
console.log(`  dresser z ${dress.z0}–${dress.z0 + d.dresserWidth}  crib ${crib.z0}–${crib.z1}  chair ${chair.z0}–${chair.z1}`);
