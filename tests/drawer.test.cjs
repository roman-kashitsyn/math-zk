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
const { GAP, A6, lensAt, deskGeometry, outlineDepths, slotAt, nearestFree, gridLayout, dropOnGrid, insertionIndex } =
  new Function(
    `${source}; return { GAP, A6, lensAt, deskGeometry, outlineDepths, slotAt, nearestFree, gridLayout, dropOnGrid, insertionIndex };`,
  
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
    assert.equal(deskGeometry(room).rowPitch, height + GAP);
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

const geometry = { columns: 3, pitch: 400, rowPitch: 540 };
const keys = (slots) => new Set([...slots.values()].map(({ column, row }) => `${column},${row}`));

test("a drop point snaps to the nearest slot on the desk", () => {
  assert.deepEqual(slotAt({ left: 190, top: 260 }, geometry), { column: 0, row: 0 });
  assert.deepEqual(slotAt({ left: 210, top: 280 }, geometry), { column: 1, row: 1 });
  assert.deepEqual(slotAt({ left: -300, top: -90 }, geometry), { column: 0, row: 0 });
  assert.deepEqual(slotAt({ left: 5000, top: 1700 }, geometry), { column: 2, row: 3 });
});

test("the nearest free slot prefers the same row, then upper rows and left columns", () => {
  assert.deepEqual(nearestFree({ column: 1, row: 0 }, new Set(), geometry), { column: 1, row: 0 });
  assert.deepEqual(nearestFree({ column: 1, row: 0 }, new Set(["1,0"]), geometry), { column: 0, row: 0 });
  assert.deepEqual(nearestFree({ column: 7, row: 0 }, new Set(), geometry), { column: 2, row: 0 });
  // With the first row full, the card goes below.
  assert.deepEqual(nearestFree({ column: 2, row: 0 }, new Set(["0,0", "1,0", "2,0"]), geometry), { column: 2, row: 1 });
});

test("a grid layout keeps wanted slots and never stacks two cards", () => {
  const cards = [
    { id: "a", want: { column: 1, row: 2 } },
    { id: "b", want: { column: 1, row: 2 } },
    { id: "c", want: { column: 5, row: 0 } },
    { id: "d" },
  ];
  const slots = gridLayout(cards, geometry);
  assert.deepEqual(slots.get("a"), { column: 1, row: 2 }, "the first card wins its slot");
  assert.deepEqual(slots.get("c"), { column: 2, row: 0 }, "a slot beyond the desk moves inward");
  assert.deepEqual(slots.get("d"), { column: 0, row: 0 });
  assert.equal(keys(slots).size, cards.length);
  for (let n = 0; n < 20; n++) {
    const many = Array.from({ length: n }, (_, i) => ({ id: i, want: { column: (i * 7) % 4, row: (i * 3) % 5 } }));
    assert.equal(keys(gridLayout(many, geometry)).size, n);
  }
});

test("dropping on an occupied slot swaps, or moves a new card's way", () => {
  const slots = new Map([["a", { column: 0, row: 0 }], ["b", { column: 1, row: 0 }]]);
  assert.deepEqual(dropOnGrid("a", { column: 2, row: 0 }, slots, geometry), { slot: { column: 2, row: 0 } });
  assert.deepEqual(dropOnGrid("a", { column: 0, row: 0 }, slots, geometry), { slot: { column: 0, row: 0 } });
  assert.deepEqual(dropOnGrid("a", { column: 1, row: 0 }, slots, geometry), {
    slot: { column: 1, row: 0 },
    displaced: { id: "b", slot: { column: 0, row: 0 } },
  });
  assert.deepEqual(dropOnGrid("new", { column: 1, row: 0 }, slots, geometry), {
    slot: { column: 1, row: 0 },
    displaced: { id: "b", slot: { column: 2, row: 0 } },
  });
});

test("a single column inserts before the first card below the drop point", () => {
  const rects = [{ top: 0, height: 300 }, { top: 320, height: 300 }];
  assert.equal(insertionIndex(-10, rects), 0);
  assert.equal(insertionIndex(200, rects), 1);
  assert.equal(insertionIndex(500, rects), 2);
  assert.equal(insertionIndex(0, []), 0);
});
