// Light / dark / system theme control. "system" follows the OS preference via
// the CSS `prefers-color-scheme` media query; "light"/"dark" force a theme by
// stamping `data-theme` on <html>, which the stylesheet lets win over the
// media query. The choice is persisted across launches.
const KEY = "bpmn-mobile:theme";
const ORDER = ["system", "light", "dark"];
const ICON = { system: "🖥", light: "☀️", dark: "🌙" };

function read() {
  const v = localStorage.getItem(KEY);
  return ORDER.includes(v) ? v : "system";
}

function apply(theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

// Wire up the theme toggle button; it cycles system → light → dark. Returns the
// applied theme.
export function initTheme(button) {
  let theme = read();
  apply(theme);

  const refresh = () => {
    const icon = button.querySelector(".tool-icon");
    if (icon) icon.textContent = ICON[theme];
    button.title = "Theme: " + theme;
    button.setAttribute("aria-label", "Theme: " + theme);
  };
  refresh();

  button.addEventListener("click", (e) => {
    e.preventDefault();
    theme = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    localStorage.setItem(KEY, theme);
    apply(theme);
    refresh();
  });

  return theme;
}
