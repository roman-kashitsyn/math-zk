// The drawer's layout rules are plain functions; interaction is checked in a
// browser. Strip `export` so the module also loads on Node versions without
// ES module syntax detection.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const source = fs
  .readFileSync(path.join(__dirname, "../lib/drawer.js"), "utf8")
  .replace(/^export /gm, "");
const { GAP, A6, lensAt, deskGeometry, outlineDepths, freeSpot, insertionIndex } = new Function(
  `${source}; return { GAP, A6, lensAt, deskGeometry, outlineDepths, freeSpot, insertionIndex };`,
)();
const M = 1.26;

test("the lens magnifies the focus and leaves distant cards in place", () => {
  assert.deepEqual(lensAt(3, null, M), { scale: 1, y: 0 });
  const focus = lensAt(5, 5, M);
  assert.equal(focus.scale, M, "the focus reaches, and never exceeds, full magnification");
  assert.equal(focus.y, 0);
  assert.ok(lensAt(4, 5, M).y < 0, "the card behind moves back");
  assert.ok(lensAt(6, 5, M).y > 0, "the card in front moves forward");
  assert.ok(Math.abs(lensAt(20, 5, M).y) < 0.01);
  assert.ok(Math.abs(lensAt(20, 5, M).scale - 1) < 1e-4);
  // Symmetric, so the drawer neither grows nor shrinks around the focus.
  assert.ok(Math.abs(lensAt(3, 5, M).y + lensAt(7, 5, M).y) < 1e-9);
  for (let i = 0; i < 12; i++) assert.ok(lensAt(i, 4.3, M).scale <= M);
});

test("the lens moves continuously between filing slots", () => {
  for (let index = 0; index < 8; index++) {
    const a = lensAt(index, 3.49, M), b = lensAt(index, 3.51, M);
    assert.ok(Math.abs(a.y - b.y) < 0.5 && Math.abs(a.scale - b.scale) < 0.01);
  }
});

test("the desk holds a whole number of A6 cards exactly", () => {
  for (const room of [397, 500, 813, 814, 815, 1200, 1700]) {
    const { columns, width, height, pitch } = deskGeometry(room);
    assert.equal(width, A6.width);
    assert.ok(Math.abs(height / width - 148 / 105) < 1e-12);
    assert.equal(pitch, width + GAP);
    const desk = columns * width + (columns - 1) * GAP;
    assert.ok(desk <= room + 1e-9, `${columns} columns fit in ${room}px`);
    assert.ok(desk + pitch > room, `a further column would not fit in ${room}px`);
  }
  assert.equal(deskGeometry(2 * A6.width + GAP).columns, 2);
});

test("a narrow desk shrinks a single A6 card to fit", () => {
  const { columns, width, height } = deskGeometry(300);
  assert.equal(columns, 1);
  assert.equal(width, 300);
  assert.ok(Math.abs(height - (300 * 148) / 105) < 1e-9);
});

test("outline depth follows Folgezettel IDs and skips missing ancestors", () => {
  const notes = ["1", "1a", "1a1", "1a1a", "2", "2a1", "10", "10a"].map((id) => ({ id, path: `notes/${id}.html` }));
  notes.push({ id: "munkres2000", path: "sources/munkres2000.html" });
  const depths = outlineDepths(notes);
  assert.deepEqual(Object.fromEntries(depths), {
    1: 0, "1a": 1, "1a1": 2, "1a1a": 3, 2: 0, "2a1": 1, 10: 0, "10a": 1, munkres2000: 0,
  });
});

const geometry = { columns: 2, height: 500, pitch: 400 };
const apart = (a, b) =>
  a.column !== b.column || a.top + geometry.height + GAP <= b.top || b.top + geometry.height + GAP <= a.top;

test("a free spot snaps to a column and stays close to the drop point", () => {
  const placed = [{ column: 0, top: 0 }];
  assert.deepEqual(freeSpot({ left: 330, top: 40 }, placed, geometry), { column: 1, top: 40, left: 400 });
  assert.deepEqual(freeSpot({ left: 10, top: 300 }, [], geometry), { column: 0, top: 300, left: 0 });
  // Column 0 is taken at the top; the nearest free spot is beside it.
  assert.deepEqual(freeSpot({ left: 20, top: 30 }, placed, geometry), { column: 1, top: 30, left: 400 });
  // With the row full, the card goes below, in the nearer column.
  placed.push({ column: 1, top: 0 });
  assert.deepEqual(freeSpot({ left: 20, top: 30 }, placed, geometry), { column: 0, top: 520, left: 0 });
});

test("successive free spots never overlap", () => {
  const placed = [];
  for (let i = 0; i < 14; i++) {
    const spot = freeSpot({ left: (i * 131) % 700, top: (i * 89) % 900 }, placed, geometry);
    assert.ok(spot.column >= 0 && spot.column < geometry.columns && spot.top >= 0);
    assert.equal(spot.left, spot.column * geometry.pitch);
    for (const other of placed) assert.ok(apart(spot, other));
    placed.push(spot);
  }
});

test("a single column inserts before the first card below the drop point", () => {
  const rects = [{ top: 0, height: 300 }, { top: 320, height: 300 }];
  assert.equal(insertionIndex(-10, rects), 0);
  assert.equal(insertionIndex(200, rects), 1);
  assert.equal(insertionIndex(500, rects), 2);
  assert.equal(insertionIndex(0, []), 0);
});
