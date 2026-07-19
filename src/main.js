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

const STORAGE_KEY = "bpmn-mobile:last-diagram";
const NAME_KEY = "bpmn-mobile:last-name";

const canvasEl = document.getElementById("canvas");
const propertiesEl = document.getElementById("properties");
const toastEl = document.getElementById("toast");

let currentName = localStorage.getItem(NAME_KEY) || "diagram.bpmn";

const modeler = createModeler({
  canvas: canvasEl,
  propertiesPanel: propertiesEl,
});

let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 2400);
}

async function loadDiagram(xml, name) {
  try {
    await modeler.importXML(xml);
    modeler.get("canvas").zoom("fit-viewport");
    if (name) {
      currentName = name;
      localStorage.setItem(NAME_KEY, name);
    }
  } catch (err) {
    console.error("Failed to import BPMN", err);
    toast("Could not open diagram — invalid BPMN");
  }
}

// Persist the working diagram to localStorage after every change so the app
// restores it on next launch.
async function persist() {
  try {
    const { xml } = await modeler.saveXML({ format: true });
    localStorage.setItem(STORAGE_KEY, xml);
  } catch (err) {
    // Ignore transient serialization errors during rapid edits.
  }
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
on("btn-fit", () => modeler.get("canvas").zoom("fit-viewport"));

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const clampZoom = (z) => Math.min(Math.max(z, MIN_ZOOM), MAX_ZOOM);

on("btn-zoom-in", () => {
  const canvas = modeler.get("canvas");
  canvas.zoom(clampZoom(canvas.zoom() * 1.2));
});
on("btn-zoom-out", () => {
  const canvas = modeler.get("canvas");
  canvas.zoom(clampZoom(canvas.zoom() / 1.2));
});

// Pinch-to-zoom. The canvas has `touch-action: none` so the browser never
// intercepts the gesture; we drive diagram-js's zoom directly, keeping the
// pinch midpoint fixed on screen (center is in container-pixel coordinates,
// matching Canvas#zoom).
function setupPinchZoom(el) {
  const canvas = modeler.get("canvas");
  let startDist = 0;
  let startScale = 1;
  const distance = (t) =>
    Math.hypot(
      t[0].clientX - t[1].clientX,
      t[0].clientY - t[1].clientY
    );

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length === 2) {
        startDist = distance(e.touches);
        startScale = canvas.zoom();
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
        canvas.zoom(next, { x: midX, y: midY });
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

setupPinchZoom(canvasEl);
// Translate single-finger touch drags into the mouse events diagram-js needs
// for panning and moving elements (see touch.js).
enableTouchDragging(canvasEl);

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

// Autosave on every model change (debounced).
let persistTimer = null;
modeler.on("commandStack.changed", () => {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 400);
});

// --- Boot -----------------------------------------------------------------

const saved = localStorage.getItem(STORAGE_KEY);
loadDiagram(saved || EMPTY_DIAGRAM, currentName);
