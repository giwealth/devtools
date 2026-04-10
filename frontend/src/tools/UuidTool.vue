<script setup>
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { copyText } from "../utils/clipboard";
import { generateManyUuids } from "../utils/uuid";

const { t } = useI18n();

const count = ref(1);
const hyphen = ref(true);
const upperCase = ref(false);
const items = ref([]);
const cryptoError = ref(false);

function runGenerate() {
  cryptoError.value = false;
  try {
    items.value = generateManyUuids(count.value, {
      hyphen: hyphen.value,
      upper: upperCase.value,
    });
  } catch {
    cryptoError.value = true;
    items.value = [];
  }
}

function clearAll() {
  items.value = [];
  cryptoError.value = false;
}

async function copyAll() {
  if (!items.value.length) return;
  await copyText(items.value.join("\n"));
}

async function copyOne(line) {
  await copyText(line);
}

function downloadTxt() {
  if (!items.value.length) return;
  const blob = new Blob([items.value.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `uuid-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <section class="uuid-page">
    <h1 class="uuid-page__title">{{ t("tools.uuid.title") }}</h1>
    <p class="uuid-page__desc">{{ t("tools.uuid.desc") }}</p>

    <div class="uuid-shell">
      <div class="uuid-toolbar">
        <label class="uuid-field">
          <span class="uuid-field__lbl">{{ t("tools.uuid.count") }}</span>
          <input
            v-model.number="count"
            type="number"
            min="1"
            max="1000"
            class="uuid-field__inp mono"
          />
        </label>
        <label class="uuid-check">
          <input v-model="hyphen" type="checkbox" />
          <span>{{ t("tools.uuid.hyphen") }}</span>
        </label>
        <label class="uuid-check">
          <input v-model="upperCase" type="checkbox" />
          <span>{{ t("tools.uuid.upperCase") }}</span>
        </label>
        <div class="uuid-toolbar__actions">
          <button type="button" class="uuid-btn uuid-btn--primary" @click="runGenerate">
            {{ t("tools.uuid.generate") }}
          </button>
          <button type="button" class="uuid-btn" :disabled="!items.length" @click="copyAll">
            {{ t("tools.uuid.copyAll") }}
          </button>
          <button type="button" class="uuid-btn" :disabled="!items.length" @click="downloadTxt">
            {{ t("tools.uuid.download") }}
          </button>
          <button type="button" class="uuid-btn uuid-btn--ghost" @click="clearAll">
            {{ t("common.clear") }}
          </button>
        </div>
      </div>

      <div class="uuid-body">
        <p v-if="cryptoError" class="uuid-err">{{ t("tools.uuid.noCrypto") }}</p>

        <div v-else-if="items.length" class="uuid-result">
          <div class="uuid-result__head">
            <span class="uuid-result__title">{{ t("tools.uuid.result") }}</span>
            <span class="uuid-result__meta mono">{{ items.length }}</span>
          </div>
          <ul class="uuid-list">
            <li v-for="(line, i) in items" :key="`${i}-${line}`" class="uuid-list__item">
              <span class="uuid-list__text mono">{{ line }}</span>
              <button
                type="button"
                class="uuid-list__copy"
                :title="t('tools.uuid.copy')"
                :aria-label="t('tools.uuid.copy')"
                @click="copyOne(line)"
              >
                {{ t("tools.uuid.copy") }}
              </button>
            </li>
          </ul>
        </div>
        <p v-else class="uuid-placeholder">{{ t("tools.uuid.placeholder") }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
}

.uuid-page {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
}

.uuid-page__title {
  flex-shrink: 0;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}

.uuid-page__desc {
  flex-shrink: 0;
  margin: 0 0 1.25rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.uuid-shell {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--surface-elevated);
  overflow: hidden;
}

.uuid-toolbar {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem 1.25rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.uuid-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.uuid-field {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
}

.uuid-field__lbl {
  color: var(--text-muted);
  white-space: nowrap;
}

.uuid-field__inp {
  width: 4.5rem;
  padding: 0.35rem 0.5rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--json-pane-bg);
  color: var(--text);
  font-size: 0.8125rem;
}

.uuid-check {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--text);
  cursor: pointer;
}

.uuid-toolbar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-left: auto;
}

.uuid-btn {
  padding: 0.4rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.uuid-btn:hover:not(:disabled) {
  background: var(--surface-hover);
}

.uuid-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.uuid-btn--primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.uuid-btn--primary:hover:not(:disabled) {
  filter: brightness(1.06);
}

.uuid-btn--ghost {
  background: transparent;
}

.uuid-err {
  margin: 0;
  padding: 0.85rem 1.25rem;
  color: #ef4444;
  font-size: 0.8125rem;
}

.uuid-placeholder {
  flex: 1 1 auto;
  margin: 0;
  padding: 1.5rem 1.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
  text-align: center;
}

.uuid-result {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.uuid-result__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.uuid-result__title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.uuid-result__meta {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.uuid-list {
  flex: 1 1 auto;
  min-height: 0;
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
}

.uuid-list__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  font-size: 0.8125rem;
}

.uuid-list__item:last-child {
  border-bottom: none;
}

.uuid-list__text {
  flex: 1;
  min-width: 0;
  word-break: break-all;
  color: var(--text);
}

.uuid-list__copy {
  flex-shrink: 0;
  padding: 0.25rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--primary);
  font-size: 0.6875rem;
  font-weight: 600;
  cursor: pointer;
}

.uuid-list__copy:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
