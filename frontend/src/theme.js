export const THEME_KEY = "devtools-theme";

/** 与 style.css 中 html / html[data-theme] 的 --bg 一致，供 Wails 窗口底色透出区域使用 */
const WAILS_BG = {
  dark: { r: 16, g: 25, b: 34, a: 255 },
  light: { r: 240, g: 244, b: 248, a: 255 },
};

/**
 * Wails WebView 在菜单栏下缘、圆角等处会露出 BackgroundColour；仅改 CSS 无法消除深色条。
 */
function syncWailsChrome(mode) {
  try {
    const rt = typeof window !== "undefined" ? window.runtime : undefined;
    if (!rt) return;
    const { r, g, b, a } = mode === "light" ? WAILS_BG.light : WAILS_BG.dark;
    if (typeof rt.WindowSetBackgroundColour === "function") {
      rt.WindowSetBackgroundColour(r, g, b, a);
    }
    if (mode === "light" && typeof rt.WindowSetLightTheme === "function") {
      rt.WindowSetLightTheme();
    }
    if (mode === "dark" && typeof rt.WindowSetDarkTheme === "function") {
      rt.WindowSetDarkTheme();
    }
  } catch {
    /* 浏览器 dev / 无 Wails 绑定 */
  }
}

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {
    /* ignore */
  }
  return "light";
}

export function applyTheme(mode) {
  document.documentElement.dataset.theme = mode;
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    /* ignore */
  }
  /* 推迟一帧：确保 Wails 已注入 window.runtime */
  queueMicrotask(() => syncWailsChrome(mode));
}

export function initTheme() {
  applyTheme(getStoredTheme());
}

export function toggleTheme() {
  const cur = document.documentElement.dataset.theme || "light";
  applyTheme(cur === "light" ? "dark" : "light");
}

export function isLightTheme() {
  return document.documentElement.dataset.theme === "light";
}
