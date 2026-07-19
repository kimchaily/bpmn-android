// bpmn-js + diagram-js stylesheets and the icon font.
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css";
// Feature-module stylesheets.
import "@bpmn-io/properties-panel/dist/assets/properties-panel.css";
import "bpmn-js-color-picker/colors/color-picker.css";
import "bpmn-js-token-simulation/assets/css/bpmn-js-token-simulation.css";
import "diagram-js-minimap/assets/diagram-js-minimap.css";
// App styles.
import "./style.css";

import { createModeler } from "./modeler.js";
import { EMPTY_DIAGRAM } from "./diagram.js";
import { openFile, saveFile } from "./files.js";
import { enableTouchDragging } from "./touch.js";
import { initTheme } from "./theme.js";

const STORAGE_KEY = "bpmn-mobile:last-diagram";
const NAME_KEY = "bpmn-mobile:last-name";
const MODE_KEY = "bpmn-mobile:pan-mode";

const canvasEl = document.getElementById("canvas");
const propertiesEl = document.getElementById("properties");
const toastEl = document.getElementById("toast");

let currentName = localStorage.getItem(NAME_KEY) || "diagram.bpmn";

// The modeler is (re)created whenever the effective theme flips, so the dark /
// light default colors bake in correctly. Everything else references it through
// the `modeler` binding or `getCanvas()`, so it keeps working across rebuilds.
let modeler;
const getCanvas = () => modeler.get("canvas");

let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2400);
}

// Persist the working diagram to localStorage after every change so the app
// restores it on next launch.
let persistTimer = null;
async function persist() {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    localStorage.setItem(STORAGE_KEY, xml);
  } catch (err) {
    // Ignore transient serialization errors during rapid edits.
  }
}

// (Re)build the modeler for the given darkness, optionally importing existing
// XML and restoring a viewbox so a theme switch is seamless.
async function buildModeler(dark, { xml, viewbox } = {}) {
  if (modeler) {
    try {
      modeler.destroy();
    } catch (err) {
      /* ignore */
    }
    propertiesEl.replaceChildren();
  }

  modeler = createModeler({
    canvas: canvasEl,
    propertiesPanel: propertiesEl,
    dark,
  });

  modeler.on("commandStack.changed", () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, 400);
  });

  if (xml !== undefined) {
    try {
      await modeler.importXML(xml);
      const canvas = modeler.get("canvas");
      if (viewbox) {
        canvas.viewbox({
          x: viewbox.x,
          y: viewbox.y,
          width: viewbox.width,
          height: viewbox.height,
        });
      } else {
        canvas.zoom("fit-viewport");
      }
    } catch (err) {
      console.error("Failed to import BPMN", err);
      toast("Could not open diagram — invalid BPMN");
    }
  }
}

// Load a new diagram into the current modeler (open / new).
async function loadDiagram(xml, name) {
  try {
    await modeler.importXML(xml);
    getCanvas().zoom("fit-viewport");
    if (name) {
      currentName = name;
      localStorage.setItem(NAME_KEY, name);
    }
  } catch (err) {
    console.error("Failed to import BPMN", err);
    toast("Could not open diagram — invalid BPMN");
  }
}

// Rebuild the modeler for a new theme, preserving the current diagram + view.
async function rebuildForTheme(dark) {
  let xml;
  let viewbox;
  try {
    xml = (await modeler.saveXML({ format: true })).xml;
    viewbox = getCanvas().viewbox();
  } catch (err) {
    xml = localStorage.getItem(STORAGE_KEY) || EMPTY_DIAGRAM;
  }
  await buildModeler(dark, { xml, viewbox });
}

// --- Toolbar wiring -------------------------------------------------------

function on(id, handler) {
  document.getElementById(id).addEventListener("click", (e) => {
    e.preventDefault();
    handler();
  });
}

on("btn-new", async () => {
  await loadDiagram(EMPTY_DIAGRAM, "diagram.bpmn");
  persist();
  toast("New diagram");
});

on("btn-open", async () => {
  const file = await openFile();
  if (!file) return;
  await loadDiagram(file.xml, file.name);
  persist();
  toast(`Opened ${file.name}`);
});

on("btn-save", async () => {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    await saveFile(currentName, xml, "application/xml");
    toast(`Saved ${currentName}`);
  } catch (err) {
    console.error(err);
    toast("Save failed");
  }
});

on("btn-undo", () => modeler.get("commandStack").undo());
on("btn-redo", () => modeler.get("commandStack").redo());
on("btn-fit", () => getCanvas().zoom("fit-viewport"));

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const clampZoom = (z) => Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);

on("btn-zoom-in", () => {
  const canvas = getCanvas();
  canvas.zoom(clampZoom(canvas.zoom() * 1.2));
});
on("btn-zoom-out", () => {
  const canvas = getCanvas();
  canvas.zoom(clampZoom(canvas.zoom() / 1.2));
});

// Pinch-to-zoom. The canvas has `touch-action: none` so the browser never
// intercepts the gesture; we drive diagram-js's zoom directly, keeping the
// pinch midpoint fixed on screen (center is in container-pixel coordinates,
// matching Canvas#zoom).
function setupPinchZoom(el) {
  let startDist = 0;
  let startScale = 1;
  const distance = (t) =>
    Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        startDist = distance(e.touches);
        startScale = getCanvas().zoom();
      }
    },
    { passive: false }
  );
  el.addEventListener(
    "touchmove",
    (e) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const midX =
          (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY =
          (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        const next = clampZoom(startScale * (distance(e.touches) / startDist));
        getCanvas().zoom(next, { x: midX, y: midY });
      }
    },
    { passive: false }
  );
  const endPinch = (e) => {
    if (e.touches.length < 2) startDist = 0;
  };
  el.addEventListener("touchend", endPinch);
  el.addEventListener("touchcancel", endPinch);
}

// Pan vs. edit mode. Pan mode (default) makes one-finger drags scroll the
// canvas so elements are never moved by accident; edit mode lets drags move
// elements. Persisted across launches.
let panMode = localStorage.getItem(MODE_KEY) !== "edit";
const modeBtn = document.getElementById("btn-mode");
function refreshMode() {
  modeBtn.classList.toggle("active", panMode);
  const icon = modeBtn.querySelector(".tool-icon");
  if (icon) icon.textContent = panMode ? "🖐" : "✥";
  modeBtn.title = panMode
    ? "Pan mode (drag pans; tap selects)"
    : "Edit mode (drag moves elements)";
  modeBtn.setAttribute("aria-label", modeBtn.title);
}
refreshMode();
on("btn-mode", () => {
  panMode = !panMode;
  localStorage.setItem(MODE_KEY, panMode ? "pan" : "edit");
  refreshMode();
  toast(panMode ? "Pan mode" : "Edit mode");
});

on("btn-properties", () => {
  const shown = propertiesEl.classList.toggle("open");
  propertiesEl.classList.toggle("hidden", !shown);
  document.getElementById("btn-properties").classList.toggle("active", shown);
});

on("btn-export", async () => {
  try {
    const { svg } = await modeler.saveSVG();
    const svgName = currentName.replace(/\.(bpmn|xml)$/i, "") + ".svg";
    await saveFile(svgName, svg, "image/svg+xml");
    toast(`Exported ${svgName}`);
  } catch (err) {
    console.error(err);
    toast("Export failed");
  }
});

// --- Boot -----------------------------------------------------------------

// Theme first, so the initial modeler is built with the right colors; a later
// flip rebuilds it preserving the diagram.
const theme = initTheme(document.getElementById("btn-theme"), (dark) =>
  rebuildForTheme(dark)
);

const saved = localStorage.getItem(STORAGE_KEY);
buildModeler(theme.isDark(), { xml: saved || EMPTY_DIAGRAM });

// These attach DOM listeners once and resolve the live canvas via getCanvas(),
// so they survive modeler rebuilds.
setupPinchZoom(canvasEl);
enableTouchDragging(canvasEl, {
  getCanvas,
  isPanMode: () => panMode,
});
