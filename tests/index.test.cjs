// Exercise the view controller without a browser or external dependencies.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs
  .readFileSync(path.join(__dirname, "../lib/index.js"), "utf8")
  .replace('import("./drawer.js")', "loadDrawer()");
const settle = () => new Promise((resolve) => setImmediate(resolve));

function page({ mobile = false, search = "", hash = "", response } = {}) {
  function element(hidden) {
    return {
      hidden,
      events: {},
      addEventListener(name, listener) {
        this.events[name] = listener;
      },
    };
  }
  const staticIndex = element(false);
  const drawer = element(true);
  const viewSwitch = element(true);
  const events = {};
  const classes = new Set();
  const media = {
    matches: mobile,
    addEventListener(name, listener) {
      this.change = listener;
    },
  };
  const location = { search, hash };
  let loads = 0;
  let initializations = 0;
  const context = {
    URLSearchParams,
    Event,
    location,
    console: { error() {} },
    document: {
      getElementById(id) {
        return {
          "static-index": staticIndex,
          "slip-workbench": drawer,
          "index-view-switch": viewSwitch,
        }[id];
      },
      body: {
        classList: {
          toggle(name, enabled) {
            enabled ? classes.add(name) : classes.delete(name);
          },
        },
      },
    },
    window: {
      matchMedia: () => media,
      addEventListener: (name, listener) => {
        events[name] = listener;
      },
      dispatchEvent() {},
    },
    history: {
      pushState(state, unused, url) {
        const target = new URL(url, "https://example.com/math-zk/");
        location.search = target.search;
        location.hash = target.hash;
      },
    },
    loadDrawer: async () => ({
      initializeDrawer(root, notes) {
        assert.equal(root, drawer);
        assert.equal(notes[0].id, "1");
        initializations++;
      },
    }),
    fetch() {
      loads++;
      return (
        response ||
        Promise.resolve({ ok: true, json: async () => [{ id: "1" }] })
      );
    },
  };
  vm.runInNewContext(source, context);
  return {
    staticIndex,
    drawer,
    viewSwitch,
    location,
    media,
    events,
    classes,
    get loads() {
      return loads;
    },
    get initializations() {
      return initializations;
    },
    async click(modifiers = {}) {
      let prevented = false;
      viewSwitch.events.click({
        button: 0,
        ...modifiers,
        preventDefault() {
          prevented = true;
        },
      });
      await settle();
      return prevented;
    },
  };
}

test("desktop opens the drawer after its data loads", async () => {
  const site = page();
  assert.equal(site.staticIndex.hidden, false);
  await settle();
  assert.equal(site.drawer.hidden, false);
  assert.equal(site.staticIndex.hidden, true);
  assert.equal(site.viewSwitch.textContent, "Static index");
  assert.equal(site.initializations, 1);
});

test("mobile and existing tag links keep the static index without loading cards", async () => {
  for (const options of [{ mobile: true }, { hash: "#zk-tag-lie-theory" }]) {
    const site = page(options);
    await settle();
    assert.equal(site.drawer.hidden, true);
    assert.equal(site.staticIndex.hidden, false);
    assert.equal(site.loads, 0);
    assert.equal(site.viewSwitch.textContent, "Card drawer");
  }
});

test("explicit links override the device default", async () => {
  const desktop = page({ search: "?view=static" });
  const mobile = page({ mobile: true, search: "?view=drawer" });
  await settle();
  assert.equal(desktop.drawer.hidden, true);
  assert.equal(mobile.drawer.hidden, false);
});

test("switching and back navigation preserve the initialized desk", async () => {
  const site = page();
  await settle();
  assert.equal(await site.click(), true);
  assert.equal(site.location.search, "?view=static");
  assert.equal(site.drawer.hidden, true);
  await site.click();
  assert.equal(site.drawer.hidden, false);
  assert.equal(site.initializations, 1);
  site.location.search = "?view=static";
  site.events.popstate();
  assert.equal(site.drawer.hidden, true);
  const before = site.location.search;
  assert.equal(await site.click({ ctrlKey: true }), false);
  assert.equal(site.location.search, before);
});

test("a failed card request leaves the static links usable", async () => {
  const site = page({ response: Promise.resolve({ ok: false }) });
  await settle();
  assert.equal(site.staticIndex.hidden, false);
  assert.equal(site.drawer.hidden, true);
  assert.equal(site.viewSwitch.textContent, "Retry card drawer");
});

test("a late card request cannot override a newer mobile view", async () => {
  let finish;
  const response = new Promise((resolve) => {
    finish = resolve;
  });
  const site = page({ response });
  site.media.matches = true;
  site.media.change();
  finish({ ok: true, json: async () => [{ id: "1" }] });
  await settle();
  assert.equal(site.drawer.hidden, true);
  assert.equal(site.staticIndex.hidden, false);
});
