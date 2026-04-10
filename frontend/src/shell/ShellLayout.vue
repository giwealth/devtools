<script setup>
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { persistLocale } from "../i18n";
import { applyTheme, getStoredTheme } from "../theme";

const router = useRouter();
const current = useRoute();
const { t, locale } = useI18n();

const nav = [
  { path: "/image", titleKey: "tools.image.title" },
  { path: "/jwt", titleKey: "tools.jwt.title" },
  { path: "/timestamp", titleKey: "tools.timestamp.title" },
  { path: "/base64", titleKey: "tools.base64.title" },
  { path: "/uuid", titleKey: "tools.uuid.title" },
  { path: "/json", titleKey: "tools.json.title" },
];

function go(path) {
  router.push(path);
}

const currentPath = computed(() => current.path);

function isActive(path) {
  return currentPath.value === path;
}

const themeMode = ref(
  typeof document !== "undefined"
    ? document.documentElement.dataset.theme || getStoredTheme()
    : "light",
);
const themeIsLight = computed(() => themeMode.value === "light");

function setTheme(mode) {
  applyTheme(mode);
  themeMode.value = mode;
}

function setLang(code) {
  locale.value = code;
  persistLocale(code);
}
</script>

<template>
  <div class="devtools-shell">
    <aside class="devtools-shell__aside">
      <div class="devtools-shell__brand">
        <span class="devtools-shell__brand-mark">⌘</span>
        <span class="devtools-shell__brand-text">{{ t("shell.brand") }}</span>
      </div>
      <nav class="devtools-shell__nav" :aria-label="t('shell.toolsNav')">
        <button
          v-for="item in nav"
          :key="item.path"
          type="button"
          class="devtools-shell__nav-btn"
          :class="{ 'devtools-shell__nav-btn--active': isActive(item.path) }"
          @click="go(item.path)"
        >
          {{ t(item.titleKey) }}
        </button>
      </nav>

      <div class="devtools-shell__prefs">
        <div class="devtools-shell__pref-block">
          <span class="devtools-shell__pref-label">{{ t("shell.theme") }}</span>
          <div class="devtools-shell__seg">
            <button
              type="button"
              class="devtools-shell__seg-btn"
              :class="{ 'devtools-shell__seg-btn--on': themeIsLight }"
              @click="setTheme('light')"
            >
              {{ t("shell.themeLight") }}
            </button>
            <button
              type="button"
              class="devtools-shell__seg-btn"
              :class="{ 'devtools-shell__seg-btn--on': !themeIsLight }"
              @click="setTheme('dark')"
            >
              {{ t("shell.themeDark") }}
            </button>
          </div>
        </div>
        <div class="devtools-shell__pref-block">
          <span class="devtools-shell__pref-label">{{ t("shell.language") }}</span>
          <div class="devtools-shell__seg">
            <button
              type="button"
              class="devtools-shell__seg-btn"
              :class="{ 'devtools-shell__seg-btn--on': locale === 'zh' }"
              @click="setLang('zh')"
            >
              {{ t("shell.langZh") }}
            </button>
            <button
              type="button"
              class="devtools-shell__seg-btn"
              :class="{ 'devtools-shell__seg-btn--on': locale === 'en' }"
              @click="setLang('en')"
            >
              {{ t("shell.langEn") }}
            </button>
          </div>
        </div>
      </div>

      <p class="devtools-shell__hint">
        {{ t("shell.hint") }}
      </p>
    </aside>
    <main class="devtools-shell__main">
      <RouterView />
    </main>
  </div>
</template>
