<script setup>
import { watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";

const { t, locale } = useI18n();
const route = useRoute();

const titleKey = computed(() => {
  const hit = route.matched.find((m) => m.meta?.titleKey);
  return hit?.meta?.titleKey;
});

function syncChrome() {
  document.documentElement.lang = locale.value === "zh" ? "zh-CN" : "en";
  const key = titleKey.value;
  document.title = key ? `${t("app.title")} — ${t(key)}` : t("app.title");
}

watch(() => [route.fullPath, locale.value], syncChrome, { immediate: true });
</script>

<template>
  <RouterView />
</template>
