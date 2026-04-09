import { createI18n } from "vue-i18n";
import zh from "../locales/zh.json";
import en from "../locales/en.json";

export const LOCALE_KEY = "devtools-locale";

export function getStoredLocale() {
  try {
    const s = localStorage.getItem(LOCALE_KEY);
    if (s === "zh" || s === "en") return s;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined" && (navigator.language || "").toLowerCase().startsWith("zh")) {
    return "zh";
  }
  return "en";
}

export function persistLocale(locale) {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: getStoredLocale(),
  fallbackLocale: "zh",
  messages: {
    zh,
    en,
  },
});
