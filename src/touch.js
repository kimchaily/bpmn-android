// diagram-js 15 starts canvas panning and element dragging from delegated
// *mouse* events (element.mousedown → mousemove → mouseup). Mobile browsers do
// not emit those during a moving touch — they fire touch events and, for a
// stationary tap, a compatibility `click`. So taps (selection, palette,
// context pad) already work, but drags and panning never start.
//
// This bridges the gap. There are two modes:
//
//  - Pan mode (default): a one-finger drag scrolls the canvas viewport directly
//    (canvas.scroll), which can never grab or move an element — so panning
//    around a busy diagram is safe. Taps still fall through to the native
//    click, so selecting elements and using the palette/context pad keep
//    working.
//
//  - Edit mode: a one-finger drag synthesizes the mousedown → mousemove →
//    mouseup sequence diagram-js expects, so dragging an element moves it and
//    dragging empty canvas pans.
//
// In both modes a touch that never crosses the movement threshold is left
// untouched, so it registers as a tap. Two-finger gestures are ignored here and
// handled by the pinch-zoom logic instead.
export function enableTouchDragging(el, { getCanvas, isPanMode }) {
  const THRESHOLD = 6; // px of movement before a touch counts as a drag
  let active = false; // a single-finger touch is in progress
  let dragging = false; // movement threshold crossed; we are panning/dragging
  let panning = false; // this drag is a pan-mode canvas scroll
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let startTarget = null;

  function mouseEvent(type, x, y, down) {
    return new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x,
      screenY: y,
      button: 0,
      buttons: down ? 1 : 0,
    });
  }

  function targetAt(x, y) {
    return document.elementFromPoint(x, y) || startTarget || el;
  }

  function endMouseDrag(x, y) {
    if (dragging && !panning) {
      targetAt(x, y).dispatchEvent(mouseEvent("mouseup", x, y, false));
    }
  }

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) {
        // A second finger arrived (pinch): abandon any in-progress drag.
        endMouseDrag(lastX, lastY);
        active = false;
        dragging = false;
        panning = false;
        return;
      }
      const t = e.touches[0];
      active = true;
      dragging = false;
      panning = false;
      startX = lastX = t.clientX;
      startY = lastY = t.clientY;
      startTarget = e.target;
    },
    { passive: false }
  );

  el.addEventListener(
    "touchmove",
    (e) => {
      if (!active || e.touches.length !== 1) return;
      const t = e.touches[0];

      if (!dragging) {
        const moved = Math.hypot(t.clientX - startX, t.clientY - startY);
        if (moved < THRESHOLD) return;
        dragging = true;
        panning = isPanMode();
        if (!panning) {
          // Begin the drag from the original touch point so diagram-js computes
          // the correct start position and delta.
          startTarget.dispatchEvent(
            mouseEvent("mousedown", startX, startY, true)
          );
        }
      }

      e.preventDefault();
      if (panning) {
        // Move the viewport so the diagram follows the finger.
        getCanvas().scroll({ dx: t.clientX - lastX, dy: t.clientY - lastY });
      } else {
        targetAt(t.clientX, t.clientY).dispatchEvent(
          mouseEvent("mousemove", t.clientX, t.clientY, true)
        );
      }
      lastX = t.clientX;
      lastY = t.clientY;
    },
    { passive: false }
  );

  function onEnd(e) {
    if (!active) return;
    const t = e.changedTouches && e.changedTouches[0];
    const x = t ? t.clientX : lastX;
    const y = t ? t.clientY : lastY;
    if (dragging) {
      // Suppress the trailing compatibility click so ending a drag does not
      // also register as a tap.
      e.preventDefault();
      endMouseDrag(x, y);
    }
    active = false;
    dragging = false;
    panning = false;
  }

  el.addEventListener("touchend", onEnd, { passive: false });
  el.addEventListener("touchcancel", onEnd, { passive: false });
}
