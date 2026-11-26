// Layout rules shared by the drawer and its tests. They take plain numbers and
// never touch the DOM.
export const GAP = 20;
// An A6 card (105 × 148 mm) in CSS pixels, as on the note pages.
export const A6 = { width: (105 * 96) / 25.4, height: (148 * 96) / 25.4 };
const FALLOFF = 1.8, SPREAD = 28;
const SECTIONS = { notes: "Notes", sources: "Sources", inbox: "Inbox" };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Scale and vertical shift of drawer item `index` when the lens is centered at
// `position` (a fractional item index). The shift is the derivative of the
// magnification: neighbors part around the focus and distant cards stay put.
export function lensAt(index, position, magnify) {
  if (position === null) return { scale: 1, y: 0 };
  const d = (index - position) / FALLOFF,
    weight = Math.exp(-0.5 * d * d);
  return { scale: 1 + (magnify - 1) * weight, y: SPREAD * d * weight };
}

// The desk is a grid of card slots, a whole number of A6 columns wide. Cards shrink below A6 only when
// a single column does not fit.
export function deskGeometry(room) {
  const columns = Math.max(1, Math.floor((room + GAP) / (A6.width + GAP)));
  const width = Math.min(A6.width, room);
  const height = (width * A6.height) / A6.width;
  return { columns, width, height, pitch: width + GAP, rowPitch: height + GAP };
}

// Outline depth from Folgezettel IDs. Like the static index, a card attaches to
// its nearest filed ancestor, so a missing 2a still leaves 2a1 under 2.
export function outlineDepths(notes) {
  const depths = new Map();
  for (const note of notes) {
    let parts = note.path.startsWith("notes/") ? (note.id.match(/\d+|[a-z]+/g) ?? []) : [];
    let depth = 0;
    while (parts.length > 1) {
      parts = parts.slice(0, -1);
      const parent = parts.join("");
      if (depths.has(parent)) {
        depth = depths.get(parent) + 1;
        break;
      }
    }
    depths.set(note.id, depth);
  }
  return depths;
}

// The slot nearest to `point` (desk pixels): the slot whose top-left corner is
// closest to the card's top-left corner.
export function slotAt(point, { columns, pitch, rowPitch }) {
  return {
    column: clamp(Math.round(point.left / pitch), 0, columns - 1),
    row: Math.max(0, Math.round(point.top / rowPitch)),
  };
}

const slotKey = ({ column, row }) => `${column},${row}`;

// The free slot nearest to `want` in a desk of `geometry`, measured in pixels so
// that the wider spacing of rows counts. `taken` holds slotKey strings. Ties go
// to the upper row, then the left column. The row below everything is free, so
// a slot is always found.
export function nearestFree(want, taken, { columns, pitch, rowPitch }) {
  const column = clamp(want.column, 0, columns - 1), row = Math.max(0, want.row);
  let last = row;
  for (const key of taken) last = Math.max(last, Number(key.split(",")[1]));
  let best = null, bestDistance = Infinity;
  for (let r = 0; r <= last + 1; r++)
    for (let c = 0; c < columns; c++) {
      const distance = Math.hypot((c - column) * pitch, (r - row) * rowPitch);
      if (distance < bestDistance && !taken.has(slotKey({ column: c, row: r })))
        [best, bestDistance] = [{ column: c, row: r }, distance];
    }
  return best;
}

// Assign each card its wanted slot, or the nearest free one when the slot is
// taken or lies beyond the desk. Earlier cards win.
export function gridLayout(cards, geometry) {
  const taken = new Set(), slots = new Map();
  for (const { id, want } of cards) {
    const slot = nearestFree(want ?? { column: 0, row: 0 }, taken, geometry);
    taken.add(slotKey(slot));
    slots.set(id, slot);
  }
  return slots;
}

// Dropping a card on `slot`. A free slot is simply taken. An occupied slot is
// taken too, and its card moves: into the slot the dropped card left, or, for a
// card that was not on the desk, to the free slot nearest to it.
export function dropOnGrid(id, slot, slots, geometry) {
  const occupant = [...slots].find(([other, s]) => other !== id && slotKey(s) === slotKey(slot))?.[0];
  if (!occupant) return { slot };
  const taken = new Set([...slots].filter(([other]) => other !== id && other !== occupant).map(([, s]) => slotKey(s)));
  taken.add(slotKey(slot));
  return { slot, displaced: { id: occupant, slot: slots.get(id) ?? nearestFree(slot, taken, geometry) } };
}

// In a single column, a card dropped at `top` goes before the first card whose
// middle lies below it.
export function insertionIndex(top, rects) {
  const index = rects.findIndex((r) => top < r.top + r.height / 2);
  return index < 0 ? rects.length : index;
}

export function initializeDrawer(root, notes) {
  const XLINK = "http://www.w3.org/1999/xlink";
  const storageKey = "math-slip-box-desk";
  const notesById = new Map(notes.map((note) => [note.id, note]));
  const noteByUrl = new Map(notes.map((note) => [new URL(note.path, location.href).href, note.id]));
  const depths = outlineDepths(notes);
  const normalize = (text) => String(text).normalize("NFKC").toLocaleLowerCase();
  const searchText = new Map(
    notes.map((note) => [note.id, normalize([note.id, note.title, note.text].join(" "))]),
  );
  const list = root.querySelector(".bench-spines"),
    desk = root.querySelector(".bench-desk-grid"),
    search = root.querySelector(".bench-search"),
    drawer = root.querySelector(".bench-drawer"),
    deskSurface = root.querySelector(".bench-blotter"),
    benchLayout = root.querySelector(".bench-layout"),
    status = root.querySelector("[role=status]");
  const stacked = matchMedia("(max-width: 650px)"),
    still = matchMedia("(prefers-reduced-motion: reduce)");
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const state = { desk: [], positions: {}, query: "" };
  const deskCards = new Map(), // id → desk card element
    spines = new Map(), // id → drawer card button
    layout = new Map(), // id → desk rectangle, in desk coordinates
    templates = new Map(); // id → parsed card, links resolved
  const lens = { items: [], pointerY: null, focusId: null, focused: null, frame: 0, time: 0 };
  let drag = null, instances = 0, layoutFrame = 0;
  let geometry = deskGeometry(A6.width);

  const empty = element("div", "bench-desk-empty", "Drag a card here.");
  const preview = element("div", "bench-drop-preview");
  // Where the card in the target slot would go to make room.
  const makeWay = element("div", "bench-drop-preview bench-make-way");
  preview.hidden = makeWay.hidden = true;
  desk.append(empty, preview, makeWay);

  function restore() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      // Version 1 saved free positions; its cards come back in reading order.
      if (![1, 2].includes(saved?.version) || !Array.isArray(saved.desk)) return;
      state.desk = [...new Set(saved.desk.filter((id) => notesById.has(id)))];
      state.query = typeof saved.query === "string" ? saved.query.slice(0, 200) : "";
      for (const id of saved.version === 2 ? state.desk : []) {
        const slot = saved.positions?.[id];
        if (Number.isInteger(slot?.column) && Number.isInteger(slot?.row))
          state.positions[id] = { column: clamp(slot.column, 0, 50), row: clamp(slot.row, 0, 1000) };
      }
    } catch {
      // Private browsing, unavailable storage, or stale data: start with a clean desk.
    }
  }
  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ version: 2, ...state }));
    } catch {
      // The drawer still works when browser storage is unavailable or full.
    }
  }

  // ----- Cards -------------------------------------------------------------

  function rewriteReferences(node, rewrite) {
    for (const target of node.querySelectorAll("[href], [src], [*|href]"))
      for (const [namespace, name] of [[null, "href"], [null, "src"], [XLINK, "href"]]) {
        const value = target.getAttributeNS(namespace, name);
        if (value) target.setAttributeNS(namespace, namespace ? "xlink:href" : name, rewrite(value));
      }
  }
  // Reuse the published card once parsed, with links resolved against its own
  // page. The article keeps its printed A6 layout and is scaled as a whole; its
  // header becomes the handle for moving the card.
  function template(id) {
    if (templates.has(id)) return templates.get(id);
    const note = notesById.get(id);
    const article = new DOMParser().parseFromString(note.html, "text/html").querySelector("article");
    const page = new URL(note.path, location.href);
    const local = new Set([...article.querySelectorAll("[id]")].map((node) => node.id));
    rewriteReferences(article, (value) =>
      value.startsWith("#") && local.has(value.slice(1)) ? value : new URL(value, page).href,
    );
    const header = article.querySelector(".eyebrow");
    const grip = element("button", "bench-grip");
    grip.type = "button";
    grip.dataset.grip = id;
    grip.setAttribute("aria-label", `Move card ${id}`);
    grip.setAttribute("aria-describedby", "bench-keyboard-help");
    grip.append(element("span", "bench-grip-mark", "⠿ "), header.firstElementChild);
    grip.firstChild.setAttribute("aria-hidden", "true");
    const open = element("a", "bench-open-note", "↗");
    open.href = page.href;
    open.title = "Open note";
    open.setAttribute("aria-label", `Open note ${id} on its own page`);
    header.prepend(grip);
    header.append(open);
    const card = element("div", "bench-note");
    card.dataset.open = id;
    card.setAttribute("role", "group");
    card.setAttribute("aria-label", `Card ${id}: ${note.title}`);
    card.append(article);
    templates.set(id, card);
    return card;
  }
  // Each copy needs its own SVG definitions and anchors.
  function instantiate(id) {
    const card = document.importNode(template(id), true);
    const prefix = `desk-${++instances}-`;
    for (const node of card.querySelectorAll("[id]")) node.id = prefix + node.id;
    rewriteReferences(card, (value) => (value.startsWith("#") ? "#" + prefix + value.slice(1) : value));
    return card;
  }

  // ----- Animation helpers -------------------------------------------------

  // Animate an element from `from` (a viewport rectangle) to where it is now.
  function fly(card, from, { grow = false } = {}) {
    if (still.matches || !from) return;
    const to = card.getBoundingClientRect();
    const scale = grow ? 0.25 : Math.min(1, from.width / to.width);
    card.animate(
      [
        {
          transformOrigin: "0 0",
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${scale})`,
          opacity: grow ? 0 : 1,
        },
        { transformOrigin: "0 0", transform: "none", opacity: 1 },
      ],
      { duration: grow ? 260 : 200, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
    );
  }
  // Shrink a floating ghost into `to` and remove it.
  function settle(ghost, to) {
    if (!ghost) return;
    if (still.matches || !to) return ghost.remove();
    const { offsetWidth: width, offsetHeight: height } = ghost;
    const sx = to.width / width, sy = to.height / height;
    ghost.classList.remove("bench-lifted");
    ghost
      .animate(
        {
          translate: `${to.left - (width * (1 - sx)) / 2}px ${to.top - (height * (1 - sy)) / 2}px`,
          scale: `${sx} ${sy}`,
          opacity: 0.4,
        },
        { duration: 200, easing: "cubic-bezier(0.3, 0, 0.4, 1)", fill: "forwards" },
      )
      .finished.then(() => ghost.remove(), () => ghost.remove());
  }
  // Clip a drawer card's rectangle to the visible part of the drawer.
  function spineRect(id) {
    const spine = spines.get(id);
    if (!spine) return null;
    const rect = spine.getBoundingClientRect(), bounds = list.getBoundingClientRect();
    const height = Math.min(rect.height, 40);
    return { left: rect.left, width: rect.width, height, top: clamp(rect.top, bounds.top, bounds.bottom - height) };
  }

  // ----- Drawer and lens ---------------------------------------------------

  function setOut(id, out) {
    const spine = spines.get(id);
    if (!spine) return;
    spine.dataset.out = String(out);
    spine.setAttribute("aria-label", `${id} ${notesById.get(id).title}${out ? ", on the desk" : ""}`);
  }
  function renderDrawer() {
    const term = normalize(state.query.trim());
    const visible = notes.filter((note) => searchText.get(note.id).includes(term));
    const slots = [];
    spines.clear();
    for (const [folder, label] of Object.entries(SECTIONS)) {
      const group = visible.filter((note) => note.path.startsWith(folder + "/"));
      if (!group.length) continue;
      const guide = element("div", "bench-slot"), face = element("div", "bench-guide");
      face.dataset.section = folder;
      face.append(element("span", "bench-guide-title", label));
      guide.append(face);
      slots.push(guide);
      for (const note of group) {
        const slot = element("div", "bench-slot"), spine = element("button", "bench-spine");
        spine.type = "button";
        spine.dataset.filed = note.id;
        spine.style.setProperty("--depth", depths.get(note.id));
        spine.setAttribute("aria-describedby", "bench-keyboard-help");
        spine.append(element("span", "bench-spine-id", note.id), element("span", "bench-spine-title", note.title));
        slot.append(spine);
        slots.push(slot);
        spines.set(note.id, spine);
        setOut(note.id, deskCards.has(note.id));
      }
    }
    slots.forEach((slot, index) => (slot.style.zIndex = String(index + 1)));
    list.replaceChildren(...slots);
    if (!slots.length) list.append(element("p", "bench-no-results", "No matching cards."));
    lens.items = slots.map((slot) => ({ face: slot.firstChild, scale: 1, y: 0 }));
    lens.focused = null;
    updateLens();
    return visible.length;
  }
  // The lens follows the fixed filing slots, never the moving card faces.
  function lensPosition() {
    const count = lens.items.length;
    if (drag?.active || !count) return null;
    if (lens.pointerY !== null) {
      const style = getComputedStyle(list), slot = parseFloat(style.getPropertyValue("--slot"));
      const y = lens.pointerY - list.getBoundingClientRect().top + list.scrollTop - parseFloat(style.paddingTop);
      return clamp((y - slot / 2) / slot, 0, count - 1);
    }
    const index = lens.items.findIndex((item) => item.face.dataset.filed === lens.focusId);
    return index < 0 ? null : index;
  }
  // Each card eases toward its target, so motion stays continuous however the
  // target moves. Only cards that are still moving are written.
  function lensFrame(time) {
    lens.frame = 0;
    const position = lensPosition();
    // The stylesheet sizes drawer cards so they fit the drawer at this scale.
    const magnify = parseFloat(getComputedStyle(list).getPropertyValue("--magnify"));
    const ease = still.matches ? 1 : 1 - Math.exp(-Math.min(64, lens.time ? time - lens.time : 16) / 60);
    let moving = false;
    lens.items.forEach((item, index) => {
      const target = lensAt(index, still.matches ? null : position, magnify);
      const scale = item.scale + (target.scale - item.scale) * ease, y = item.y + (target.y - item.y) * ease;
      const settled = Math.abs(target.scale - scale) < 1e-4 && Math.abs(target.y - y) < 0.05;
      moving ||= !settled;
      if (scale === item.scale && y === item.y) return;
      [item.scale, item.y] = settled ? [target.scale, target.y] : [scale, y];
      item.face.style.scale = `${item.scale} 1`;
      item.face.style.translate = `0 ${item.y}px`;
    });
    const focused = position === null ? null : lens.items[Math.round(position)].face;
    if (focused !== lens.focused) {
      if (lens.focused) delete lens.focused.dataset.focused;
      if (focused) focused.dataset.focused = "true";
      lens.focused = focused;
    }
    lens.time = moving ? time : 0;
    if (moving) lens.frame = requestAnimationFrame(lensFrame);
  }
  function updateLens() {
    lens.frame ||= requestAnimationFrame(lensFrame);
  }

  list.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || drag) return;
    lens.pointerY = event.clientY;
    updateLens();
  });
  list.addEventListener("pointerleave", () => {
    lens.pointerY = null;
    updateLens();
  });
  list.addEventListener("scroll", updateLens, { passive: true });
  list.addEventListener("focusin", (event) => {
    if (!event.target.matches("[data-filed]:focus-visible")) return;
    lens.focusId = event.target.dataset.filed;
    updateLens();
  });
  list.addEventListener("focusout", (event) => {
    if (list.contains(event.relatedTarget)) return;
    lens.focusId = null;
    updateLens();
  });
  still.addEventListener("change", updateLens);
  search.addEventListener("input", () => {
    if (drag) cancel();
    state.query = search.value.slice(0, 200);
    lens.pointerY = lens.focusId = null;
    list.scrollTop = 0;
    const count = renderDrawer();
    status.textContent = state.query.trim()
      ? `${count} matching ${count === 1 ? "card" : "cards"}.`
      : `All ${count} cards shown.`;
    save();
  });

  // ----- Desk --------------------------------------------------------------

  const single = () => geometry.columns === 1;
  // Size the desk to a whole number of card columns; the drawer takes the rest.
  function fitDesk() {
    const style = getComputedStyle(root), width = benchLayout.clientWidth;
    if (!width) return;
    const room = stacked.matches
      ? width
      : width - parseFloat(style.getPropertyValue("--drawer-min")) - parseFloat(getComputedStyle(benchLayout).columnGap);
    geometry = deskGeometry(room);
    root.style.setProperty("--columns", geometry.columns);
    root.style.setProperty("--card-w", `${geometry.width}px`);
    root.style.setProperty("--card-scale", geometry.width / A6.width);
  }
  // Cards keep their saved grid slots across a resize; a slot beyond the desk
  // falls back to the nearest free one. A single column stacks cards in desk
  // order instead.
  function layoutDesk({ animate = false, skip } = {}) {
    const before = new Map(layout), { width, height, pitch, rowPitch } = geometry;
    const cards = state.desk.map((id) => [id, deskCards.get(id)]);
    const slots = gridLayout(state.desk.map((id) => ({ id, want: state.positions[id] })), geometry);
    layout.clear();
    let bottom = 0;
    cards.forEach(([id], index) => {
      const { column, row } = slots.get(id);
      const spot = single()
        ? { column: 0, row: index, left: 0, top: index * rowPitch }
        : { column, row, left: column * pitch, top: row * rowPitch };
      layout.set(id, { id, ...spot, width, height });
      bottom = Math.max(bottom, spot.top + height);
    });
    cards.forEach(([id, card], index) => {
      const rect = layout.get(id), old = before.get(id);
      card.style.left = `${rect.left}px`;
      card.style.top = `${rect.top}px`;
      card.style.zIndex = String(index + 1);
      if (animate && !still.matches && old && id !== skip && (old.left !== rect.left || old.top !== rect.top))
        card.animate(
          [{ transform: `translate(${old.left - rect.left}px, ${old.top - rect.top}px)` }, { transform: "none" }],
          { duration: 220, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
        );
    });
    // Leave an empty row below the cards to drop into.
    const room = single() ? bottom + 24 : bottom + rowPitch;
    desk.style.setProperty("--desk-height", `${Math.max(700, room)}px`);
    empty.hidden = cards.length > 0;
  }
  new ResizeObserver(() => {
    layoutFrame ||= requestAnimationFrame(() => {
      layoutFrame = 0;
      fitDesk();
      layoutDesk();
    });
  }).observe(benchLayout);

  const slotsOf = (except) =>
    new Map([...layout].filter(([id]) => id !== except).map(([id, r]) => [id, { column: r.column, row: r.row }]));
  // Where a card picked up from the drawer starts: the first free slot, or the
  // end of a single column.
  const firstFree = () =>
    single()
      ? { column: 0, row: state.desk.length }
      : nearestFree({ column: 0, row: 0 }, new Set([...slotsOf().values()].map(slotKey)), geometry);
  const pixels = ({ column, row }) => ({ left: column * geometry.pitch, top: row * geometry.rowPitch });
  // The slot a pointer drop at `point` (desk pixels) aims for. In a single
  // column the row is the insertion index.
  function slotFor(id, point) {
    if (!single()) return slotAt(point, geometry);
    const others = state.desk.filter((other) => other !== id).map((other) => layout.get(other));
    return { column: 0, row: insertionIndex(point.top, others) };
  }
  // Where a card would land, and which card makes way for it. Dropping onto an
  // occupied slot swaps; a card brought out by a link takes the nearest free
  // slot instead.
  function resolve(id, slot, { after, swap = true } = {}) {
    if (single()) {
      const others = state.desk.filter((other) => other !== id).map((other) => layout.get(other));
      const index = after ? others.findIndex((r) => r.id === after) + 1 : clamp(slot.row, 0, others.length);
      const top = index < others.length ? others[index].top - GAP / 2 : others.length ? others.at(-1).top + geometry.height + GAP / 2 : 0;
      return { index, left: 0, top };
    }
    const slots = slotsOf();
    if (!swap) slot = nearestFree(slot, new Set([...slotsOf(id).values()].map(slotKey)), geometry);
    const { displaced } = swap ? dropOnGrid(id, slot, slots, geometry) : {};
    return { slot, displaced, ...pixels(slot), moved: displaced && { id: displaced.id, ...pixels(displaced.slot) } };
  }
  function place(id, slot, { from, grow, after, keyboard, swap } = {}) {
    const wasOpen = deskCards.has(id);
    const spot = resolve(id, slot, { after, swap });
    let card = deskCards.get(id);
    if (!card) {
      card = instantiate(id);
      deskCards.set(id, card);
      desk.append(card);
    }
    state.desk = state.desk.filter((other) => other !== id);
    state.desk.splice(spot.index ?? state.desk.length, 0, id);
    if (!single()) {
      // Pin every card where it is now, so the desk stays as the reader sees it.
      for (const [other, s] of slotsOf(id)) state.positions[other] = s;
      state.positions[id] = spot.slot;
      if (spot.displaced) state.positions[spot.displaced.id] = spot.displaced.slot;
    }
    layoutDesk({ animate: true, skip: id });
    setOut(id, true);
    save();
    fly(card, from, { grow });
    if (keyboard) card.querySelector("[data-grip]").focus({ preventScroll: true });
    if (keyboard || grow) card.scrollIntoView({ block: "nearest", behavior: still.matches ? "auto" : "smooth" });
    const swapped = spot.displaced ? ` Card ${spot.displaced.id} moved to make room.` : "";
    status.textContent = `Card ${id} ${wasOpen ? "repositioned" : "placed"} on the desk.${swapped} ${state.desk.length} cards open.`;
  }
  function returnCard(id, { ghost, keyboard } = {}) {
    const card = deskCards.get(id);
    card.remove();
    deskCards.delete(id);
    state.desk = state.desk.filter((other) => other !== id);
    delete state.positions[id];
    layoutDesk({ animate: true });
    setOut(id, false);
    save();
    settle(ghost, spineRect(id));
    if (keyboard) spines.get(id)?.focus({ preventScroll: true });
    status.textContent = `Card ${id} returned to the drawer. ${state.desk.length} cards remain on the desk.`;
  }
  // Following a link between cards brings the linked card onto the desk next
  // to the card that cites it.
  root.addEventListener("click", (event) => {
    const link = event.target.closest(".bench-note a:not(.bench-open-note)");
    if (!link || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = noteByUrl.get((link.getAttribute("href") ?? link.getAttributeNS(XLINK, "href") ?? "").split("#")[0]);
    const source = link.closest("[data-open]").dataset.open;
    if (!id) return;
    event.preventDefault();
    if (deskCards.has(id)) {
      const card = deskCards.get(id);
      card.scrollIntoView({ block: "nearest", behavior: still.matches ? "auto" : "smooth" });
      card.animate(
        [{ outline: "3px solid var(--bench-brasslight)", outlineOffset: "4px" }, { outline: "3px solid transparent", outlineOffset: "4px" }],
        { duration: 900, easing: "ease-out" },
      );
      if (event.detail === 0) card.querySelector("[data-grip]").focus();
      status.textContent = `Card ${id} is already on the desk.`;
      return;
    }
    const near = layout.get(source);
    place(
      id,
      { column: near.column + 1, row: near.row },
      { from: link.getBoundingClientRect(), grow: true, after: source, swap: false, keyboard: event.detail === 0 },
    );
  });

  // ----- Moving cards ------------------------------------------------------
  // Pointer and keyboard moves share pickup, targeting, and dropping.

  function zoneAt(x, y) {
    const inside = (node) => {
      const r = node.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    return inside(drawer) ? "drawer" : inside(deskSurface) ? "desk" : null;
  }
  function showTarget() {
    drawer.classList.toggle("bench-drop-target", drag.zone === "drawer");
    deskSurface.classList.toggle("bench-drop-target", drag.zone === "desk");
    preview.hidden = makeWay.hidden = drag.zone !== "desk";
    if (preview.hidden) return;
    const spot = resolve(drag.id, drag.slot);
    preview.classList.toggle("bench-insert", single());
    preview.style.translate = `${spot.left}px ${spot.top}px`;
    makeWay.hidden = !spot.moved;
    if (spot.moved) makeWay.style.translate = `${spot.moved.left}px ${spot.moved.top}px`;
    if (drag.keyboard) preview.scrollIntoView({ block: "nearest" });
  }
  function pickUp() {
    drag.active = true;
    clearTimeout(drag.timer);
    lens.pointerY = null;
    if (!drag.keyboard) {
      lens.focusId = null;
      if (root.contains(document.activeElement)) document.activeElement.blur();
      const ghost = instantiate(drag.id);
      ghost.classList.add("bench-drag-ghost");
      ghost.removeAttribute("data-open");
      ghost.setAttribute("aria-hidden", "true");
      ghost.inert = true;
      root.append(ghost);
      drag.ghost = ghost;
      drag.offsetX = clamp(drag.start.x - drag.rect.left, 16, geometry.width - 16);
      drag.offsetY = clamp(drag.start.y - drag.rect.top, 12, 60);
      requestAnimationFrame(() => ghost.classList.add("bench-lifted"));
      moveFrame();
    }
    root.dataset.dragging = "true";
    drag.source.dataset.dragSource = "true";
    updateLens();
    showTarget();
    status.textContent = drag.keyboard
      ? `Picked up card ${drag.id}. D for desk, R for drawer, arrow keys to position, Enter to drop, Escape to cancel.`
      : `Picked up card ${drag.id}. Drop on the desk to place it, or in the drawer to file it.`;
  }
  // Pointer moves are applied once per frame, moving the ghost by transform.
  function moveFrame() {
    drag.frame = 0;
    const { x, y } = drag.pointer, left = x - drag.offsetX, top = y - drag.offsetY;
    drag.ghost.style.translate = `${left}px ${top}px`;
    drag.at = { left, top, width: geometry.width };
    const bounds = desk.getBoundingClientRect();
    drag.zone = zoneAt(x, y);
    drag.slot = slotFor(drag.id, { left: left - bounds.left, top: top - bounds.top });
    showTarget();
  }
  function endDrag() {
    const ended = drag;
    drag = null;
    clearTimeout(ended.timer);
    cancelAnimationFrame(ended.frame);
    delete ended.source.dataset.dragSource;
    delete root.dataset.dragging;
    if (ended.pointerId !== undefined && root.hasPointerCapture(ended.pointerId))
      root.releasePointerCapture(ended.pointerId);
    drawer.classList.remove("bench-drop-target");
    deskSurface.classList.remove("bench-drop-target");
    preview.hidden = makeWay.hidden = true;
    updateLens();
    return ended;
  }
  function drop() {
    const { id, zone, slot, ghost, at, keyboard } = endDrag();
    if (zone === "desk") {
      ghost?.remove();
      place(id, slot, { from: at, keyboard });
    } else if (zone === "drawer" && deskCards.has(id)) {
      returnCard(id, { ghost, keyboard });
    } else {
      settle(ghost, deskCards.has(id) ? deskCards.get(id).getBoundingClientRect() : spineRect(id));
      status.textContent = zone === "drawer" ? "Card remains in the drawer." : "Card returned to its previous position.";
    }
  }
  function cancel() {
    if (!drag?.active) return drag && endDrag();
    const { id, ghost } = endDrag();
    settle(ghost, deskCards.has(id) ? deskCards.get(id).getBoundingClientRect() : spineRect(id));
    status.textContent = "Move cancelled.";
  }

  root.addEventListener("pointerdown", (event) => {
    if (drag || event.button !== 0 || !event.isPrimary || event.target.closest("a")) return;
    const source = event.target.closest("[data-filed],[data-open]");
    const touch = event.pointerType === "touch";
    if (!source || (touch && source.dataset.open && !event.target.closest(".eyebrow"))) return;
    const point = { x: event.clientX, y: event.clientY };
    drag = {
      id: source.dataset.filed ?? source.dataset.open,
      source,
      rect: source.getBoundingClientRect(),
      start: point,
      pointer: point,
      pointerId: event.pointerId,
      active: false,
    };
    // On touch, the drawer scrolls; holding a card still picks it up.
    if (touch && source.dataset.filed) drag.timer = setTimeout(pickUp, 350);
    root.setPointerCapture(event.pointerId);
    if (!touch) event.preventDefault();
  });
  root.addEventListener("pointermove", (event) => {
    if (!drag || drag.keyboard || event.pointerId !== drag.pointerId) return;
    drag.pointer = { x: event.clientX, y: event.clientY };
    if (!drag.active) {
      const moved = Math.hypot(event.clientX - drag.start.x, event.clientY - drag.start.y) > 6;
      if (moved && drag.timer) endDrag();
      else if (moved) pickUp();
      return;
    }
    event.preventDefault();
    drag.frame ||= requestAnimationFrame(moveFrame);
  });
  root.addEventListener("pointerup", (event) => {
    if (!drag || drag.keyboard || event.pointerId !== drag.pointerId) return;
    if (!drag.active) return void endDrag();
    drag.pointer = { x: event.clientX, y: event.clientY };
    moveFrame();
    drop();
  });
  for (const type of ["pointercancel", "lostpointercapture"])
    root.addEventListener(type, () => {
      if (drag && !drag.keyboard) cancel();
    });
  // Once a touch drag starts, keep the browser from scrolling instead.
  root.addEventListener("touchmove", (event) => drag?.active && event.preventDefault(), { passive: false });
  root.addEventListener("contextmenu", (event) => drag && event.preventDefault());
  root.addEventListener("dragstart", (event) => event.preventDefault());
  window.addEventListener("blur", () => drag && cancel());

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drag) {
      event.preventDefault();
      return cancel();
    }
    if (drag && !drag.keyboard) return;
    const key = event.key.toLowerCase(), activate = event.code === "Space" || key === "enter";
    if (!drag) {
      const control = activate && event.target.closest("[data-filed],[data-grip]");
      if (!control) return;
      event.preventDefault();
      const id = control.dataset.filed ?? control.dataset.grip, rect = layout.get(id);
      drag = {
        id,
        source: control,
        keyboard: true,
        zone: rect ? "desk" : "drawer",
        slot: rect ? { column: rect.column, row: rect.row } : firstFree(),
      };
      return pickUp();
    }
    const arrow = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key];
    if (activate) {
      event.preventDefault();
      return drop();
    } else if (key === "d" || key === "r") {
      drag.zone = key === "d" ? "desk" : "drawer";
      status.textContent = key === "d"
        ? "Desk selected. Use arrow keys to position, then Enter to drop."
        : "Drawer selected. Press Enter to file the card.";
    } else if (arrow) {
      // Arrow keys step one slot. A single column moves the insertion point.
      const { columns } = geometry, others = [...slotsOf(drag.id).values()];
      const last = single() ? others.length : Math.max(-1, ...others.map((s) => s.row)) + 1;
      drag.zone = "desk";
      drag.slot = {
        column: clamp(drag.slot.column + arrow[0], 0, columns - 1),
        row: clamp(drag.slot.row + arrow[1], 0, last),
      };
      const { moved } = resolve(drag.id, drag.slot);
      status.textContent = single()
        ? `Position ${drag.slot.row + 1} of ${last + 1}. Enter to drop.`
        : `Column ${drag.slot.column + 1} of ${columns}, row ${drag.slot.row + 1}.` +
          (moved ? ` Card ${moved.id} will make way.` : "") + " Enter to drop.";
    } else return;
    event.preventDefault();
    showTarget();
  });

  restore();
  search.value = state.query;
  for (const id of state.desk) deskCards.set(id, instantiate(id));
  desk.append(...deskCards.values());
  renderDrawer();
  fitDesk();
  layoutDesk();
}
