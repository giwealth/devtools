<script setup>
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import { copyText, readClipboardText } from "../utils/clipboard";

const { t } = useI18n();

const plain = ref("");
const b64 = ref("");
const copyOk = ref(false);

const charLine = computed(() => t("tools.base64.charCountLabel", { n: plain.value.length }));

const outSizeLabel = computed(() => {
  const text = b64.value;
  if (!text) return "0 B";
  const bytes = new Blob([text]).size;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
});

const sizeLine = computed(() => t("tools.base64.sizeLine", { size: outSizeLabel.value }));

function encode() {
  const text = plain.value;
  if (!text) {
    b64.value = "";
    return;
  }
  try {
    b64.value = btoa(unescape(encodeURIComponent(text)));
  } catch (e) {
    b64.value = `Error: ${e.message}`;
  }
}

function decode() {
  const raw = b64.value.trim();
  if (!raw) {
    plain.value = "";
    return;
  }
  try {
    plain.value = decodeURIComponent(escape(atob(raw)));
  } catch (e) {
    plain.value = `Error: Invalid Base64. ${e.message}`;
  }
}

function clear() {
  plain.value = "";
  b64.value = "";
}

async function paste() {
  const text = await readClipboardText();
  if (text != null) {
    plain.value = text;
    return;
  }
  alert(t("tools.base64.pasteManual"));
}

async function copyOut() {
  if (!b64.value) return;
  await copyText(b64.value);
  copyOk.value = true;
  setTimeout(() => (copyOk.value = false), 1200);
}

function download() {
  if (!b64.value) return;
  const blob = new Blob([b64.value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "base64-result.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function onPlainKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    encode();
  }
}
function onB64Key(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    decode();
  }
}
</script>

<template>
  <section class="b64">
    <h1 class="b64__title">{{ t("tools.base64.title") }}</h1>
    <p class="b64__desc">{{ t("tools.base64.desc") }}</p>

    <div class="b64__workspace">
      <!-- 纯文本 -->
      <div class="b64-pane">
        <div class="b64-pane__head">
          <div class="b64-pane__title">
            <span class="b64-ico b64-ico--plain" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M21 3.01H3c-1.1 0-2 .9-2 2V9h2V4.99h18v14.03H3V15H1v4.01c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98v-14c0-1.11-.9-2-2-2zm-10 12-4-4 4-4v3h8v2h-8v3z"
                />
              </svg>
            </span>
            {{ t("tools.base64.plain") }}
          </div>
          <button type="button" class="b64-head-btn" @click="clear">
            <svg class="b64-head-btn__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
              />
            </svg>
            {{ t("common.clear") }}
          </button>
        </div>
        <div class="b64-ta-wrap">
          <textarea
            v-model="plain"
            class="b64-ta"
            spellcheck="false"
            :placeholder="t('tools.base64.placeholderPlain')"
            @keydown="onPlainKey"
          />
          <button type="button" class="b64-float" @click="paste">{{ t("tools.base64.paste") }}</button>
        </div>
        <div class="b64-pane__foot">
          <span class="b64-foot-left mono">{{ charLine }}</span>
          <span class="b64-foot-right mono">{{ t("tools.base64.utf8") }}</span>
        </div>
      </div>

      <!-- 中间操作 -->
      <div class="b64-rail" aria-hidden="false">
        <div class="b64-rail__vline" />
        <div class="b64-rail__inner">
          <button type="button" class="b64-act b64-act--primary" @click="encode">{{ t("tools.base64.encodeArrow") }}</button>
          <button type="button" class="b64-act b64-act--secondary" @click="decode">{{ t("tools.base64.decodeArrow") }}</button>
        </div>
        <div class="b64-rail__vline" />
      </div>

      <!-- Base64 -->
      <div class="b64-pane">
        <div class="b64-pane__head">
          <div class="b64-pane__title">
            <span class="b64-ico b64-ico--b64" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z"
                />
              </svg>
            </span>
            {{ t("tools.base64.base64") }}
          </div>
          <button type="button" class="b64-head-btn" :disabled="!b64" @click="download">
            <svg class="b64-head-btn__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            {{ t("common.download") }}
          </button>
        </div>
        <div class="b64-ta-wrap">
          <textarea
            v-model="b64"
            class="b64-ta"
            spellcheck="false"
            :placeholder="t('tools.base64.placeholderB64')"
            @keydown="onB64Key"
          />
          <button type="button" class="b64-float b64-float--copy" :class="{ 'b64-float--ok': copyOk }" @click="copyOut">
            <svg class="b64-float__ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
              />
            </svg>
            {{ copyOk ? t("tools.base64.copied") : t("tools.base64.copy") }}
          </button>
        </div>
        <div class="b64-pane__foot b64-pane__foot--end">
          <span class="mono">{{ sizeLine }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
}

.b64__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}

.b64__desc {
  margin: 0 0 1.25rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.b64__workspace {
  display: grid;
  grid-template-columns: 1fr minmax(8.5rem, auto) 1fr;
  gap: 0;
  align-items: stretch;
  min-height: min(72vh, 640px);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  background: var(--surface-elevated);
}

@media (max-width: 900px) {
  .b64__workspace {
    grid-template-columns: 1fr;
    min-height: 0;
  }
}

.b64-pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 320px;
}

.b64-pane__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.b64-pane__title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text);
}

.b64-ico {
  display: flex;
  align-items: center;
  justify-content: center;
}

.b64-ico svg {
  width: 1.125rem;
  height: 1.125rem;
}

.b64-ico--plain {
  color: var(--primary);
}

.b64-ico--b64 {
  color: #22c55e;
}

html[data-theme="light"] .b64-ico--b64 {
  color: #16a34a;
}

.b64-head-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.45rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.b64-head-btn:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-hover);
}

.b64-head-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.b64-head-btn__ico {
  width: 0.9375rem;
  height: 0.9375rem;
}

.b64-ta-wrap {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 220px;
}

.b64-ta {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  min-height: 220px;
  padding: 0.85rem;
  padding-bottom: 2.75rem;
  border: none;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.55;
  background: var(--json-pane-bg);
  color: var(--text);
  resize: vertical;
}

.b64-ta:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--primary);
}

.b64-ta::placeholder {
  color: var(--text-muted);
  opacity: 0.7;
}

.b64-float {
  position: absolute;
  right: 0.65rem;
  bottom: 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.b64-float:hover {
  color: var(--text);
  border-color: var(--text-muted);
}

.b64-float--copy.b64-float--ok {
  color: #4ade80;
  border-color: rgba(74, 222, 128, 0.45);
}

.b64-float__ico {
  width: 1rem;
  height: 1rem;
}

.b64-pane__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  font-size: 0.6875rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.b64-pane__foot--end {
  justify-content: flex-end;
}

.b64-foot-left,
.b64-foot-right {
  font-weight: 500;
}

/* 中间栏 + 虚线分隔 */
.b64-rail {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  background: var(--surface-elevated);
}

@media (max-width: 900px) {
  .b64-rail {
    flex-direction: row;
    justify-content: center;
    padding: 0.75rem 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }
}

.b64-rail__vline {
  width: 0;
  flex: 0 0 0;
  border-left: 1px dotted var(--border);
  min-height: 100%;
  align-self: stretch;
}

@media (max-width: 900px) {
  .b64-rail__vline {
    display: none;
  }
}

.b64-rail__inner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.65rem;
  padding: 1rem 0.65rem;
  flex-shrink: 0;
}

@media (max-width: 900px) {
  .b64-rail__inner {
    flex-direction: row;
    padding: 0 0.75rem;
    width: 100%;
    max-width: 24rem;
  }
}

.b64-act {
  min-width: 7.5rem;
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition:
    filter 0.15s,
    transform 0.08s;
}

.b64-act:active {
  transform: scale(0.98);
}

.b64-act--primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 30%, transparent);
}

.b64-act--primary:hover {
  filter: brightness(1.08);
}

.b64-act--secondary {
  background: var(--border);
  color: var(--text);
}

.b64-act--secondary:hover {
  filter: brightness(1.12);
}

html[data-theme="light"] .b64-act--secondary {
  background: #c8d0db;
  color: var(--text);
}
</style>
