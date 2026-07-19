import BpmnModeler from "bpmn-js/lib/Modeler";
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from "bpmn-js-properties-panel";
import BpmnColorPickerModule from "bpmn-js-color-picker";
import { CreateAppendAnythingModule } from "bpmn-js-create-append-anything";
import TokenSimulationModule from "bpmn-js-token-simulation";
import minimapModule from "diagram-js-minimap";
import gridModule from "diagram-js-grid";
// Drag-to-pan on the canvas. diagram-js processes pointer events, so this also
// gives one-finger panning on touch screens; the Modeler does not include it
// by default (it assumes scrollbars / trackpad).
import moveCanvasModule from "diagram-js/lib/navigation/movecanvas";

// Build a bpmn-js Modeler wired with the same feature modules the Obsidian
// plugin enables by default, plus touch navigation for mobile. Keeping this in
// one place mirrors the plugin's src/bpmnModeler.ts configuration.
//
// When `dark` is set, the renderer's *default* fill/stroke/label colors are
// switched to a light-on-dark palette so an uncoloured diagram is legible on a
// dark canvas. Elements the user has explicitly coloured (via the color picker)
// keep their own colors — the defaults are only a fallback.
export function createModeler({ canvas, propertiesPanel, dark }) {
  const config = {
    container: canvas,
    propertiesPanel: {
      parent: propertiesPanel,
    },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      BpmnColorPickerModule,
      CreateAppendAnythingModule,
      TokenSimulationModule,
      minimapModule,
      gridModule,
      moveCanvasModule,
    ],
  };

  if (dark) {
    config.bpmnRenderer = {
      defaultFillColor: "#26282c",
      defaultStrokeColor: "#e6e6e6",
      defaultLabelColor: "#e6e6e6",
    };
  }

  return new BpmnModeler(config);
}
