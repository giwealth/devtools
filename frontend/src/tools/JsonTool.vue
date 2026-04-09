<script setup>
import { ref, watch, onMounted, onUnmounted, provide, computed } from "vue";
import { useI18n } from "vue-i18n";
import JsonTreeNode from "../components/json/JsonTreeNode.vue";
import { highlightFormattedJSON } from "../utils/jsonHighlight";
import { copyText } from "../utils/clipboard";
import { collectContainerPaths } from "../utils/jsonTreePaths";

const { t } = useI18n();

const input = ref("");
const outputHtml = ref("");
const plainOutput = ref("");
const parsedData = ref(null);
const inputError = ref(false);
const validateState = ref(""); // '' | 'ok' | 'bad'
/** @type {import('vue').Ref<'2'|'4'|'tab'>} */
const indentMode = ref("4");
/** @type {import('vue').Ref<Set<string>>} */
const jsonTreeCollapsed = ref(new Set());
const viewMode = ref("formatted"); // 'formatted' | 'tree'

const taScroll = ref(0);

const inputLineCount = computed(() => {
  const s = input.value;
  if (!s) return 1;
  return s.split("\n").length;
});

const treeActionsEnabled = computed(() => parsedData.value != null && !inputError.value);

provide("jsonTreeCollapsed", jsonTreeCollapsed);

let debounceTimer = null;

function getIndentValue() {
  if (indentMode.value === "2") return 2;
  if (indentMode.value === "tab") return "\t";
  return 4;
}

function indentHighlightOption() {
  if (indentMode.value === "2") return "2 Spaces";
  if (indentMode.value === "tab") return "Tab";
  return "4 Spaces";
}

function applyBeautify() {
  const text = input.value.trim();
  if (!text) {
    outputHtml.value = "";
    plainOutput.value = "";
    parsedData.value = null;
    inputError.value = false;
    return;
  }
  try {
    const parsed = JSON.parse(text);
    parsedData.value = parsed;
    const formatted = JSON.stringify(parsed, null, getIndentValue());
    plainOutput.value = formatted;
    outputHtml.value = highlightFormattedJSON(formatted, indentHighlightOption());
    inputError.value = false;
  } catch (e) {
    outputHtml.value = `<div class="json-hl-err">Error: ${escapeAttr(e.message)}</div>`;
    plainOutput.value = "";
    parsedData.value = null;
    inputError.value = true;
  }
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyMinify() {
  const text = input.value.trim();
  if (!text) {
    outputHtml.value = "";
    plainOutput.value = "";
    parsedData.value = null;
    inputError.value = false;
    return;
  }
  try {
    const parsed = JSON.parse(text);
    parsedData.value = parsed;
    const minified = JSON.stringify(parsed);
    plainOutput.value = minified;
    outputHtml.value = highlightFormattedJSON(minified.replace(/\n/g, ""), indentHighlightOption());
    inputError.value = false;
  } catch (e) {
    outputHtml.value = `<div class="json-hl-err">Error: ${escapeAttr(e.message)}</div>`;
    plainOutput.value = "";
    parsedData.value = null;
    inputError.value = true;
  }
}

function validate() {
  validateState.value = "";
  const text = input.value.trim();
  if (!text) return;
  try {
    JSON.parse(text);
    inputError.value = false;
    validateState.value = "ok";
    setTimeout(() => {
      if (validateState.value === "ok") validateState.value = "";
    }, 2000);
  } catch {
    inputError.value = true;
    validateState.value = "bad";
    setTimeout(() => {
      if (validateState.value === "bad") validateState.value = "";
    }, 2000);
  }
}

function clearAll() {
  input.value = "";
  outputHtml.value = "";
  plainOutput.value = "";
  parsedData.value = null;
  inputError.value = false;
  validateState.value = "";
  jsonTreeCollapsed.value = new Set();
  viewMode.value = "formatted";
}

function expandTreeAll() {
  if (!parsedData.value || inputError.value) return;
  jsonTreeCollapsed.value = new Set();
}

function collapseTreeAll() {
  if (!parsedData.value || inputError.value) return;
  const paths = collectContainerPaths(parsedData.value, "$");
  jsonTreeCollapsed.value = new Set(paths);
}

function switchToTreeExpanded() {
  if (!treeActionsEnabled.value) return;
  viewMode.value = "tree";
  expandTreeAll();
}

function switchToTreeCollapsed() {
  if (!treeActionsEnabled.value) return;
  viewMode.value = "tree";
  collapseTreeAll();
}

function showFormatted() {
  viewMode.value = "formatted";
}

async function copyOut() {
  const text = plainOutput.value || input.value;
  if (!text.trim()) return;
  await copyText(text);
}

function downloadJson() {
  const raw = plainOutput.value || input.value;
  if (!raw.trim()) return;
  try {
    JSON.parse(raw);
  } catch {
    alert(t("common.invalidJson"));
    return;
  }
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `json-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function onInputScroll(e) {
  taScroll.value = e.target.scrollTop;
}

watch(input, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    applyBeautify();
  }, 500);
});

watch(indentMode, () => {
  if (input.value.trim()) applyBeautify();
});

onMounted(() => {
  applyBeautify();
});

onUnmounted(() => clearTimeout(debounceTimer));

function validateLabel() {
  if (validateState.value === "ok") return t("tools.json.valid");
  if (validateState.value === "bad") return t("tools.json.invalid");
  return t("tools.json.validate");
}
</script>

<template>
  <section class="j-tool">
    <h1 class="j-tool__title">{{ t("tools.json.title") }}</h1>
    <p class="j-tool__desc">{{ t("tools.json.desc") }}</p>

    <div class="j-toolbar">
      <div class="j-toolbar__left">
        <button type="button" class="j-tbtn" @click="applyBeautify">
          <svg class="j-tbtn__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17h2v-7H3v7zm4 0h2V7H7v10zm4 0h2v-4h-2v4zm4 0h2v-8h-2v8zm4 0h2V3h-2v14z" />
          </svg>
          {{ t("tools.json.beautify") }}
        </button>
        <button type="button" class="j-tbtn" @click="applyMinify">
          <svg class="j-tbtn__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
          </svg>
          {{ t("tools.json.minify") }}
        </button>
        <button
          type="button"
          class="j-tbtn"
          :class="{ 'j-tbtn--ok': validateState === 'ok', 'j-tbtn--bad': validateState === 'bad' }"
          @click="validate"
        >
          <svg class="j-tbtn__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
          {{ validateLabel() }}
        </button>
        <button type="button" class="j-tbtn j-tbtn--clear" @click="clearAll">
          <svg class="j-tbtn__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          {{ t("common.clear") }}
        </button>
      </div>
      <div class="j-toolbar__right">
        <label class="j-indent">
          <span class="j-indent__lbl">{{ t("tools.json.indentColon") }}</span>
          <select v-model="indentMode" class="j-indent__sel">
            <option value="2">{{ t("tools.json.indent2") }}</option>
            <option value="4">{{ t("tools.json.indent4") }}</option>
            <option value="tab">{{ t("tools.json.indentTab") }}</option>
          </select>
        </label>
        <button
          type="button"
          class="j-ibtn"
          :title="t('tools.json.copyAria')"
          :aria-label="t('tools.json.copyAria')"
          @click="copyOut"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20">
            <path
              d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
            />
          </svg>
        </button>
        <button
          type="button"
          class="j-ibtn"
          :title="t('tools.json.downloadAria')"
          :aria-label="t('tools.json.downloadAria')"
          @click="downloadJson"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="j-panes">
      <!-- 输入 -->
      <div class="j-pane">
        <div class="j-pane__head">
          <span class="j-pane__head-title">{{ t("tools.json.inputHeader") }}</span>
          <span class="j-pane__head-meta mono">{{ t("tools.json.linesCount", { n: inputLineCount }) }}</span>
        </div>
        <div class="j-editor">
          <div class="j-gutter" aria-hidden="true">
            <div class="j-gutter__inner" :style="{ transform: `translateY(-${taScroll}px)` }">
              <div v-for="ln in inputLineCount" :key="ln" class="j-gutter__ln">{{ ln }}</div>
            </div>
          </div>
          <textarea
            v-model="input"
            class="j-ta mono"
            spellcheck="false"
            :placeholder="t('tools.json.placeholder')"
            :class="{ 'j-ta--err': inputError }"
            @scroll="onInputScroll"
          />
        </div>
      </div>

      <!-- 输出 -->
      <div class="j-pane j-pane--out">
        <div class="j-pane__head j-pane__head--split">
          <span class="j-pane__head-title">{{ t("tools.json.outputHeader") }}</span>
          <div class="j-out-actions">
            <template v-if="viewMode === 'formatted'">
              <button type="button" class="j-link" :disabled="!treeActionsEnabled" @click="switchToTreeExpanded">
                {{ t("tools.json.expandAll") }}
              </button>
              <span class="j-out-actions__sep">|</span>
              <button type="button" class="j-link" :disabled="!treeActionsEnabled" @click="switchToTreeCollapsed">
                {{ t("tools.json.collapseAll") }}
              </button>
            </template>
            <template v-else>
              <button type="button" class="j-link" :disabled="!treeActionsEnabled" @click="expandTreeAll">
                {{ t("tools.json.expandAll") }}
              </button>
              <span class="j-out-actions__sep">|</span>
              <button type="button" class="j-link" :disabled="!treeActionsEnabled" @click="collapseTreeAll">
                {{ t("tools.json.collapseAll") }}
              </button>
              <span class="j-out-actions__sep">|</span>
              <button type="button" class="j-link" @click="showFormatted">{{ t("tools.json.formattedView") }}</button>
            </template>
          </div>
        </div>
        <div v-show="viewMode === 'formatted'" class="j-out json-out j-out--numbered" v-html="outputHtml" />
        <div v-show="viewMode === 'tree'" class="j-out j-out--tree json-out json-out--tree">
          <JsonTreeNode v-if="parsedData != null && !inputError" :data="parsedData" :path="'$'" :depth="0" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
}

.j-tool__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}

.j-tool__desc {
  margin: 0 0 1rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.j-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 0.65rem 0.85rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: var(--surface-elevated);
}

.j-toolbar__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.j-toolbar__right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.65rem;
}

.j-tbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
}

.j-tbtn:hover {
  background: var(--surface-hover);
}

.j-tbtn__ico {
  width: 1.125rem;
  height: 1.125rem;
  opacity: 0.9;
}

.j-tbtn--ok {
  background: rgba(34, 197, 94, 0.2);
  border-color: #22c55e;
  color: #86efac;
}

.j-tbtn--bad {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #fca5a5;
}

.j-tbtn--clear:hover {
  color: #f87171;
}

.j-indent {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.j-indent__lbl {
  white-space: nowrap;
}

.j-indent__sel {
  min-width: 6.5rem;
  padding: 0.3rem 0.45rem;
  border-radius: 0.375rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.8125rem;
  cursor: pointer;
}

.j-ibtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
}

.j-ibtn:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.j-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-items: stretch;
  min-height: 420px;
}

@media (max-width: 900px) {
  .j-panes {
    grid-template-columns: 1fr;
  }
}

.j-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--surface-elevated);
}

.j-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.j-pane__head--split {
  flex-wrap: wrap;
}

.j-pane__head-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.j-pane__head-meta {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--text-muted);
}

.j-out-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
}

.j-out-actions__sep {
  color: var(--border);
  font-size: 0.75rem;
  user-select: none;
}

.j-link {
  border: none;
  background: none;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}

.j-link:hover:not(:disabled) {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.j-link:disabled {
  opacity: 0.35;
  cursor: not-allowed;
  text-decoration: none;
}

.j-editor {
  display: flex;
  flex: 1;
  min-height: 360px;
  overflow: hidden;
}

.j-gutter {
  flex: 0 0 2.75rem;
  overflow: hidden;
  padding: 0.75rem 0 0.75rem 0.35rem;
  background: var(--surface);
  border-right: 1px solid var(--border);
  user-select: none;
}

.j-gutter__inner {
  will-change: transform;
}

.j-gutter__ln {
  height: calc(0.8125rem * 1.5);
  font-size: 0.8125rem;
  line-height: 1.5;
  text-align: right;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.j-ta {
  flex: 1;
  box-sizing: border-box;
  min-height: 360px;
  margin: 0;
  padding: 0.75rem;
  border: none;
  resize: vertical;
  font-size: 0.8125rem;
  line-height: 1.5;
  background: var(--json-pane-bg);
  color: var(--text);
}

.j-ta:focus {
  outline: none;
}

.j-ta--err {
  box-shadow: inset 0 0 0 1px #ef4444;
}

.j-ta::placeholder {
  color: var(--text-muted);
  opacity: 0.65;
}

.j-out {
  flex: 1;
  min-height: 360px;
  padding: 0.75rem;
  overflow: auto;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.5;
  background: var(--json-pane-bg);
}

.j-out--tree {
  padding-top: 0.5rem;
}

/* 高亮行 + 行号（json-hl-line__core 承载缩进，避免多 span 破坏 grid） */
.j-out--numbered {
  counter-reset: jsonln 0;
}

.j-out--numbered :deep(.json-hl-line) {
  display: grid;
  grid-template-columns: 2.5rem 1fr;
  gap: 0.65rem;
  align-items: start;
  min-height: calc(0.8125rem * 1.5);
  color: var(--text);
  counter-increment: jsonln;
}

.j-out--numbered :deep(.json-hl-line::before) {
  content: counter(jsonln);
  text-align: right;
  color: var(--text-muted);
  font-size: 0.75rem;
  user-select: none;
  line-height: 1.5;
}

.j-out--numbered :deep(.json-hl-line__core) {
  display: block;
  min-width: 0;
  font-size: 0.8125rem;
  line-height: 1.5;
}

:deep(.json-hl__brace) {
  color: #fbbf24;
}

:deep(.json-hl__key) {
  color: #c084fc;
}

:deep(.json-hl__str) {
  color: #4ade80;
}

:deep(.json-hl__num),
:deep(.json-hl__kw) {
  color: #60a5fa;
}

:deep(.json-hl__punct) {
  color: #94a3b8;
}

:deep(.json-hl-err) {
  color: #f87171;
  padding: 0.5rem;
}

</style>
