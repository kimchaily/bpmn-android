// diagram-js 15 starts canvas panning and element dragging from delegated
// *mouse* events (element.mousedown → mousemove → mouseup). Mobile browsers do
// not emit those during a moving touch — they fire touch events and, for a
// stationary tap, a compatibility `click`. So taps (selection, palette,
// context pad) already work, but drags and panning never start.
//
// This bridges the gap: on a single-finger touch it watches for real movement
// and, only then, synthesizes the mousedown → mousemove → mouseup sequence
// diagram-js expects. A touch that never moves is left untouched so the native
// `click` still drives selection. Two-finger gestures are ignored here and
// handled by the pinch-zoom logic instead.
export function enableTouchDragging(el) {
  const THRESHOLD = 6; // px of movement before we treat it as a drag
  let active = false; // a single-finger touch is in progress
  let dragging = false; // we have synthesized a mousedown and are dragging
  let startX = 0;
  let startY = 0;
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

  function endDrag(x, y) {
    if (!dragging) return;
    targetAt(x, y).dispatchEvent(mouseEvent("mouseup", x, y, false));
    dragging = false;
  }

  el.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) {
        // A second finger arrived (pinch): abandon any in-progress drag.
        endDrag(startX, startY);
        active = false;
        return;
      }
      const t = e.touches[0];
      active = true;
      dragging = false;
      startX = t.clientX;
      startY = t.clientY;
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
        // Begin the drag from the original touch point so diagram-js computes
        // the correct start position and delta.
        dragging = true;
        startTarget.dispatchEvent(mouseEvent("mousedown", startX, startY, true));
      }

      // Stop the browser from scrolling/refreshing now that we own the gesture.
      e.preventDefault();
      targetAt(t.clientX, t.clientY).dispatchEvent(
        mouseEvent("mousemove", t.clientX, t.clientY, true)
      );
    },
    { passive: false }
  );

  function onEnd(e) {
    if (!active) return;
    const t = e.changedTouches && e.changedTouches[0];
    const x = t ? t.clientX : startX;
    const y = t ? t.clientY : startY;
    if (dragging) {
      // Suppress the trailing compatibility click so ending a drag does not
      // also register as a tap.
      e.preventDefault();
      endDrag(x, y);
    }
    active = false;
  }

  el.addEventListener("touchend", onEnd, { passive: false });
  el.addEventListener("touchcancel", onEnd, { passive: false });
}
