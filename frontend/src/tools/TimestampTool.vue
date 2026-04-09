<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { getAllTimezones, formatTimeByTimezone, unixToFormatted, dateStringToUnix } from "../utils/timestampCore";
import { copyText } from "../utils/clipboard";

const { t } = useI18n();

const timeUnit = ref("seconds");
const timezone = ref("UTC+8");
const tzOptions = computed(() => getAllTimezones());

const timezoneLabel = computed(() => {
  const o = tzOptions.value.find((x) => x.value === timezone.value);
  return o?.label ?? timezone.value;
});

/** 与 web 一致：UTC+8 (北京时间) →「北京时间」，用作输入框浮动标签 */
const timezoneShortLabel = computed(() => {
  const full = timezoneLabel.value;
  const m = full.match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : full;
});

const dateOutputLabel = computed(() =>
  t("tools.timestamp.dateTimeFormattedLabel", { zone: timezoneShortLabel.value })
);

const tsOutLabel = computed(() =>
  timeUnit.value === "milliseconds" ? t("tools.timestamp.unixTimestampOutMs") : t("tools.timestamp.unixTimestampOutSec")
);

const clockRunning = ref(true);
const nowTs = ref("");
const nowFormatted = ref("");
let timer = null;

const tsIn = ref("");
const dateOut = ref("");
const dateIn = ref("");
const tsOut = ref("");

function tick() {
  const now = new Date();
  nowTs.value = timeUnit.value === "milliseconds" ? String(now.getTime()) : String(Math.floor(now.getTime() / 1000));
  nowFormatted.value = formatTimeByTimezone(now, timezone.value);
}

function toggleClock() {
  clockRunning.value = !clockRunning.value;
}

function applyTsToDate() {
  const r = unixToFormatted(tsIn.value, timeUnit.value, timezone.value);
  if (!r.ok) {
    dateOut.value = r.value;
    return;
  }
  dateOut.value = r.value;
}

function applyDateToTs() {
  const normalizedInput = normalizeDateInput(dateIn.value);
  const r = dateStringToUnix(normalizedInput, timezone.value, timeUnit.value);
  if (!r.ok) {
    tsOut.value = r.value;
    return;
  }
  tsOut.value = r.value;
}

function useNow() {
  dateIn.value = formatTimeByTimezone(new Date(), timezone.value).replace(" ", "T");
  applyDateToTs();
}

function clearAll() {
  tsIn.value = "";
  dateOut.value = "";
  dateIn.value = "";
  tsOut.value = "";
}

watch([timeUnit, timezone, clockRunning], () => {
  tick();
  if (tsIn.value.trim()) applyTsToDate();
  if (dateIn.value.trim()) applyDateToTs();
});

watch(tsIn, () => applyTsToDate());
watch(dateIn, () => applyDateToTs());

onMounted(() => {
  tick();
  timer = setInterval(() => {
    if (clockRunning.value) tick();
  }, 1000);
});

onUnmounted(() => clearInterval(timer));

function normalizeDateInput(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return "";
  // datetime-local emits "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  const s = trimmed.replace("T", " ");
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

async function copyField(val) {
  if (!val) return;
  await copyText(val);
}
</script>

<template>
  <section class="ts-page">
    <div class="ts-hero">
      <div class="ts-hero__text">
        <h1 class="ts-page__title">{{ t("tools.timestamp.title") }}</h1>
        <p class="ts-page__desc">{{ t("tools.timestamp.desc") }}</p>
      </div>
      <div class="ts-clock-card">
        <div class="ts-clock-card__icon" aria-hidden="true">
          <svg class="ts-ico" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
            />
          </svg>
        </div>
        <div class="ts-clock-card__body">
          <span class="ts-clock-card__label">{{ t("tools.timestamp.currentTime") }}</span>
          <button
            type="button"
            class="ts-clock-card__ts ts-clock-card__ts--copy mono"
            :title="t('tools.timestamp.copyOutput')"
            :aria-label="t('tools.timestamp.copyOutput')"
            @click="copyField(nowTs)"
          >
            {{ nowTs }}
          </button>
          <div class="ts-clock-card__human mono">{{ nowFormatted }}</div>
        </div>
        <button
          type="button"
          class="ts-clock-card__pause"
          :title="clockRunning ? t('tools.timestamp.pause') : t('tools.timestamp.resume')"
          :aria-label="clockRunning ? t('tools.timestamp.pause') : t('tools.timestamp.resume')"
          @click="toggleClock"
        >
          <svg v-if="clockRunning" class="ts-ico ts-ico--lg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
          <svg v-else class="ts-ico ts-ico--lg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>

    <div class="ts-shell">
      <div class="ts-shell__inner">
        <!-- 单位 + 时区 -->
        <div class="ts-toolbar">
          <div class="ts-toolbar__group">
            <span class="ts-toolbar__hint">
              <svg class="ts-ico ts-ico--sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
                />
              </svg>
              {{ t("tools.timestamp.unit") }}
            </span>
            <div class="ts-seg">
              <button
                type="button"
                class="ts-seg__btn"
                :class="{ 'ts-seg__btn--on': timeUnit === 'seconds' }"
                @click="timeUnit = 'seconds'"
              >
                {{ t("tools.timestamp.seconds") }}
              </button>
              <button
                type="button"
                class="ts-seg__btn"
                :class="{ 'ts-seg__btn--on': timeUnit === 'milliseconds' }"
                @click="timeUnit = 'milliseconds'"
              >
                {{ t("tools.timestamp.milliseconds") }}
              </button>
            </div>
          </div>
          <div class="ts-toolbar__group ts-toolbar__group--tz">
            <span class="ts-toolbar__hint">
              <svg class="ts-ico ts-ico--sm" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                />
              </svg>
              {{ t("tools.timestamp.timezone") }}
            </span>
            <select v-model="timezone" class="ts-select" :aria-label="t('tools.timestamp.timezone')">
              <option v-for="o in tzOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
        </div>

        <!-- 时间戳 → 日期 -->
        <div class="ts-section">
          <div class="ts-section__head">
            <svg class="ts-section__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.86 3.14-7 7-7s7 3.14 7 7-3.14 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
              />
            </svg>
            <h2 class="ts-section__title">{{ t("tools.timestamp.tsToDate") }}</h2>
          </div>
          <div class="ts-row">
            <div class="ts-field">
              <label class="ts-float ts-float--primary">{{ t("tools.timestamp.unixTimestamp") }}</label>
              <input
                v-model="tsIn"
                class="ts-input mono"
                type="text"
                :placeholder="t('tools.timestamp.placeholderTs')"
                @keyup.enter="applyTsToDate"
              />
            </div>
            <button type="button" class="ts-btn ts-btn--primary" @click="applyTsToDate">
              {{ t("tools.timestamp.convert") }}
              <svg class="ts-ico ts-ico--md" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </button>
            <div class="ts-field ts-field--out">
              <label class="ts-float">{{ dateOutputLabel }}</label>
              <input :value="dateOut" readonly class="ts-input ts-input--ro mono" type="text" />
              <button
                type="button"
                class="ts-copy"
                :title="t('tools.timestamp.copyOutput')"
                :aria-label="t('tools.timestamp.copyOutput')"
                @click="copyField(dateOut)"
              >
                <svg class="ts-ico ts-ico--copy" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="ts-divider" />

        <!-- 日期 → 时间戳 -->
        <div class="ts-section">
          <div class="ts-section__head">
            <svg class="ts-section__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"
              />
            </svg>
            <h2 class="ts-section__title">{{ t("tools.timestamp.dateToTs") }}</h2>
          </div>
          <div class="ts-row">
            <div class="ts-field">
              <label class="ts-float">{{ timezoneShortLabel }}</label>
              <input
                v-model="dateIn"
                class="ts-input mono"
                type="datetime-local"
                step="1"
                @keyup.enter="applyDateToTs"
              />
            </div>
            <button type="button" class="ts-btn ts-btn--secondary" @click="applyDateToTs">
              {{ t("tools.timestamp.convert") }}
              <svg class="ts-ico ts-ico--md" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
              </svg>
            </button>
            <div class="ts-field ts-field--out">
              <label class="ts-float ts-float--primary">{{ tsOutLabel }}</label>
              <input :value="tsOut" readonly class="ts-input ts-input--ro ts-input--tsout mono" type="text" />
              <button
                type="button"
                class="ts-copy"
                :title="t('tools.timestamp.copyOutput')"
                :aria-label="t('tools.timestamp.copyOutput')"
                @click="copyField(tsOut)"
              >
                <svg class="ts-ico ts-ico--copy" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="ts-foot-actions">
            <button type="button" class="ts-link ts-link--primary" @click="useNow">{{ t("tools.timestamp.useNow") }}</button>
            <span class="ts-foot-actions__sep" aria-hidden="true">|</span>
            <button type="button" class="ts-link" @click="clearAll">{{ t("tools.timestamp.clearAll") }}</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mono {
  font-family: var(--font-mono);
}

.ts-page {
  max-width: 1000px;
  margin: 0 auto;
}

.ts-page__title {
  font-size: 1.75rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 0.35rem;
}

.ts-page__desc {
  margin: 0;
  color: var(--text-muted);
  font-size: 1rem;
  line-height: 1.5;
  max-width: 32rem;
}

.ts-hero {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
}

@media (min-width: 768px) {
  .ts-hero {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

.ts-clock-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  min-width: 0;
}

@media (min-width: 768px) {
  .ts-clock-card {
    min-width: 18rem;
    flex-shrink: 0;
  }
}

.ts-clock-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.ts-clock-card__body {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.ts-clock-card__label {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.ts-clock-card__ts {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  word-break: break-all;
}

.ts-clock-card__ts--copy {
  border: none;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.ts-clock-card__ts--copy:hover {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.ts-clock-card__human {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.ts-clock-card__pause {
  margin-left: auto;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ts-clock-card__pause:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.ts-ico {
  width: 1.25rem;
  height: 1.25rem;
}

.ts-ico--sm {
  width: 1rem;
  height: 1rem;
}

.ts-ico--md {
  width: 1.125rem;
  height: 1.125rem;
}

.ts-ico--lg {
  width: 1.25rem;
  height: 1.25rem;
}

.ts-ico--copy {
  width: 1.25rem;
  height: 1.25rem;
}

.ts-shell {
  border-radius: 1rem;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  overflow: hidden;
}

.ts-shell__inner {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

@media (min-width: 768px) {
  .ts-shell__inner {
    padding: 2rem;
  }
}

.ts-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border);
}

.ts-toolbar__group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.ts-toolbar__group--tz {
  flex: 1;
  min-width: min(100%, 14rem);
}

.ts-toolbar__hint {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.ts-seg {
  display: flex;
  gap: 0.25rem;
}

.ts-seg__btn {
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  background: var(--surface-hover);
  color: var(--text-muted);
  transition:
    background 0.15s,
    color 0.15s;
}

.ts-seg__btn:hover {
  background: var(--border);
  color: var(--text);
}

.ts-seg__btn--on {
  background: var(--primary);
  color: #fff;
}

.ts-seg__btn--on:hover {
  background: var(--primary);
  color: #fff;
  filter: brightness(1.06);
}

.ts-select {
  flex: 1;
  min-width: 12rem;
  max-width: 22rem;
  padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--json-pane-bg);
  color: var(--text);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%239dabb9' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.5rem center;
  background-size: 1rem;
}

html[data-theme="light"] .ts-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
}

.ts-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ts-section__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ts-section__icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--primary);
  flex-shrink: 0;
}

.ts-section__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
}

.ts-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
}

@media (min-width: 768px) {
  .ts-row {
    flex-direction: row;
    align-items: stretch;
  }
}

.ts-field {
  position: relative;
  flex: 1;
  min-width: 0;
}

.ts-float {
  position: absolute;
  top: 0;
  left: 0.75rem;
  transform: translateY(-50%);
  z-index: 1;
  padding: 0 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--surface-elevated);
  max-width: calc(100% - 3rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
}

.ts-float--primary {
  color: var(--primary);
}

.ts-input {
  width: 100%;
  box-sizing: border-box;
  height: 3.5rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--json-pane-bg);
  color: var(--text);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s;
}

.ts-input:focus:not(.ts-input--ro) {
  border-color: var(--primary);
}

.ts-input::placeholder {
  color: var(--text-muted);
  opacity: 0.65;
}

.ts-input--ro {
  padding-right: 3rem;
  cursor: default;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--json-pane-bg) 85%, var(--surface-elevated));
}

.ts-input--tsout {
  color: #34d399;
}

html[data-theme="light"] .ts-input--tsout {
  color: #059669;
}

.ts-field--out .ts-input--ro {
  padding-right: 3rem;
}

.ts-copy {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ts-copy:hover {
  color: var(--text);
  background: var(--surface-hover);
}

.ts-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 3.5rem;
  padding: 0 2rem;
  border: none;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  font-weight: 700;
  cursor: pointer;
  flex-shrink: 0;
  transition:
    transform 0.1s,
    filter 0.15s;
}

@media (max-width: 767px) {
  .ts-btn {
    width: 100%;
  }
}

.ts-btn:active {
  transform: scale(0.98);
}

.ts-btn--primary {
  background: var(--primary);
  color: #fff;
}

.ts-btn--primary:hover {
  filter: brightness(1.08);
}

.ts-btn--secondary {
  background: var(--border);
  color: var(--text);
}

.ts-btn--secondary:hover {
  filter: brightness(1.12);
}

html[data-theme="light"] .ts-btn--secondary {
  background: #d1d9e3;
  color: var(--text);
}

.ts-divider {
  height: 1px;
  background: var(--border);
  opacity: 0.65;
}

.ts-foot-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-left: 0.125rem;
  margin-top: -0.25rem;
}

.ts-foot-actions__sep {
  color: var(--border);
  font-size: 0.75rem;
  user-select: none;
}

.ts-link {
  border: none;
  background: none;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
}

.ts-link:hover {
  color: var(--text);
}

.ts-link--primary {
  color: var(--primary);
  text-decoration: none;
}

.ts-link--primary:hover {
  color: var(--primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
