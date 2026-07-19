// Light / dark / system theme control. "system" follows the OS preference; the
// resolved (effective) darkness is reflected as a `theme-dark` / `theme-light`
// class on <html>, which the stylesheet keys off. The choice is persisted, and
// callers are notified when the effective darkness flips so they can re-theme
// things CSS can't reach (the bpmn-js diagram colors).
const KEY = "bpmn-mobile:theme";
const ORDER = ["system", "light", "dark"];
const ICON = { system: "🖥", light: "☀️", dark: "🌙" };

const mq = window.matchMedia("(prefers-color-scheme: dark)");

function read() {
  const v = localStorage.getItem(KEY);
  return ORDER.includes(v) ? v : "system";
}

function effectiveDark(theme) {
  return theme === "dark" || (theme === "system" && mq.matches);
}

function applyClasses(dark) {
  const root = document.documentElement;
  root.classList.toggle("theme-dark", dark);
  root.classList.toggle("theme-light", !dark);
}

// Wire up the theme toggle button (cycles system → light → dark). `onDarkChange`
// is called with the new boolean whenever the effective theme flips. Returns an
// object exposing the current effective darkness.
export function initTheme(button, onDarkChange) {
  let theme = read();
  let dark = effectiveDark(theme);
  applyClasses(dark);

  const refresh = () => {
    const icon = button.querySelector(".tool-icon");
    if (icon) icon.textContent = ICON[theme];
    button.title = "Theme: " + theme;
    button.setAttribute("aria-label", "Theme: " + theme);
  };
  refresh();

  const update = () => {
    const next = effectiveDark(theme);
    applyClasses(next);
    if (next !== dark) {
      dark = next;
      if (onDarkChange) onDarkChange(dark);
    }
  };

  button.addEventListener("click", (e) => {
    e.preventDefault();
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    localStorage.setItem(KEY, theme);
    refresh();
    update();
  });

  // React to OS theme changes while on "system".
  mq.addEventListener("change", () => {
    if (theme === "system") update();
  });

  return { isDark: () => dark };
}
