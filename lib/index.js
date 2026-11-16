// The HTML index remains usable without JavaScript. Only replace it once the
// drawer's data and code have loaded, so failures leave ordinary links intact.
const staticIndex = document.getElementById("static-index");
const workbench = document.getElementById("slip-workbench");
const viewSwitch = document.getElementById("index-view-switch");
const mobileScreen = window.matchMedia("(max-width: 800px), (pointer: coarse)");
let drawerReady;
let viewRequest = 0;

function preferredView(search, hash, mobile) {
  const requested = new URLSearchParams(search).get("view");
  if (requested === "static" || requested === "drawer") return requested;
  // Existing tag links target sections of the static index.
  return mobile || hash ? "static" : "drawer";
}

function showView(view) {
  const drawerVisible = view === "drawer";
  staticIndex.hidden = drawerVisible;
  workbench.hidden = !drawerVisible;
  document.body.classList.toggle("drawer-view", drawerVisible);
  viewSwitch.hidden = false;
  viewSwitch.textContent = drawerVisible ? "Static index" : "Card drawer";
  viewSwitch.href = drawerVisible ? "?view=static" : "?view=drawer";
}

async function updateView() {
  const request = ++viewRequest;
  const view = preferredView(
    location.search,
    location.hash,
    mobileScreen.matches,
  );
  if (view === "static") {
    showView("static");
    return;
  }

  try {
    drawerReady ??= Promise.all([
      import("./drawer.js"),
      fetch("cards.json").then((response) => {
        if (!response.ok) throw new Error("Could not load cards");
        return response.json();
      }),
    ]).then(([module, notes]) => module.initializeDrawer(workbench, notes));
    await drawerReady;
    if (request === viewRequest) showView("drawer");
  } catch (error) {
    drawerReady = undefined;
    if (request === viewRequest) {
      showView("static");
      viewSwitch.textContent = "Retry card drawer";
    }
    console.error("The card drawer could not be opened.", error);
  }
}

viewSwitch.addEventListener("click", (event) => {
  // Preserve opening the link in a new tab with the usual browser gestures.
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  )
    return;
  event.preventDefault();
  history.pushState(null, "", viewSwitch.href);
  updateView();
});
window.addEventListener("popstate", updateView);
window.addEventListener("hashchange", updateView);
mobileScreen.addEventListener("change", updateView);
updateView();
