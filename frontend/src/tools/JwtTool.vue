<script setup>
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { encodeJWT, decodeJWT } from "../utils/jwtCrypto";
import { copyText } from "../utils/clipboard";

const { t } = useI18n();

const tab = ref("decode");

const headerJson = ref(JSON.stringify({ alg: "HS256", typ: "JWT" }, null, 2));
const payloadJson = ref(JSON.stringify({ sub: "1234567890", name: "John Doe", iat: Math.floor(Date.now() / 1000) }, null, 2));
const secretEnc = ref("your-256-bit-secret");
const tokenDisplay = ref("");
const tokenParts = ref({ h: "", p: "", s: "" });
const encError = ref("");

const tokenIn = ref("");
const headerOut = ref("");
const payloadOut = ref("");
const secretDec = ref("");
const verifyMsg = ref(""); // '' | valid | invalid | nosecret | error
const decError = ref("");
const copyOk = ref(false);

let encTimer = null;
let decTimer = null;

async function runEncode() {
  encError.value = "";
  tokenParts.value = { h: "", p: "", s: "" };
  try {
    if (!window.crypto?.subtle) {
      encError.value = t("tools.jwt.errNoCrypto");
      tokenDisplay.value = "";
      return;
    }
    const header = JSON.parse(headerJson.value.trim());
    const payload = JSON.parse(payloadJson.value.trim());
    const secret = secretEnc.value.trim();
    if (!secret) {
      encError.value = t("tools.jwt.errNeedSecret");
      tokenDisplay.value = "";
      return;
    }
    const { jwt, encodedHeader, encodedPayload, signature } = await encodeJWT(header, payload, secret);
    tokenDisplay.value = jwt;
    tokenParts.value = { h: encodedHeader, p: encodedPayload, s: signature };
  } catch (e) {
    encError.value = e.message || String(e);
    tokenDisplay.value = "";
  }
}

async function runDecode() {
  decError.value = "";
  verifyMsg.value = "";
  headerOut.value = "";
  payloadOut.value = "";
  const token = tokenIn.value.trim();
  if (!token) {
    headerOut.value = "";
    payloadOut.value = "";
    verifyMsg.value = "";
    decError.value = "";
    return;
  }
  try {
    const secret = secretDec.value.trim();
    if (secret && !window.crypto?.subtle) {
      decError.value = t("tools.jwt.errVerifyNoCrypto");
      return;
    }
    const { header, payload, verify } = await decodeJWT(token, secret);
    headerOut.value = JSON.stringify(header, null, 2);
    payloadOut.value = JSON.stringify(payload, null, 2);
    if (secret) {
      verifyMsg.value = verify ? "valid" : "invalid";
    } else {
      verifyMsg.value = "nosecret";
    }
  } catch (e) {
    decError.value = e.message || String(e);
    verifyMsg.value = "";
  }
}

function scheduleEnc() {
  clearTimeout(encTimer);
  encTimer = setTimeout(runEncode, 300);
}
function scheduleDec() {
  clearTimeout(decTimer);
  decTimer = setTimeout(runDecode, 300);
}

watch([headerJson, payloadJson, secretEnc, tab], () => {
  if (tab.value === "encode") scheduleEnc();
});
watch([tokenIn, secretDec, tab], () => {
  if (tab.value === "decode") scheduleDec();
});

watch(tab, (t) => {
  if (t === "encode") runEncode();
  else runDecode();
});

function switchTab(t) {
  tab.value = t;
}

async function copyToken() {
  if (!tokenDisplay.value) return;
  await copyText(tokenDisplay.value);
  copyOk.value = true;
  setTimeout(() => (copyOk.value = false), 1000);
}
</script>

<template>
  <section class="jwt-tool">
    <h1 class="jwt-tool__title">{{ t("tools.jwt.title") }}</h1>
    <p class="jwt-tool__desc">{{ t("tools.jwt.desc") }}</p>

    <div class="jwt-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="jwt-tab"
        :class="{ 'jwt-tab--on': tab === 'decode' }"
        :aria-selected="tab === 'decode'"
        @click="switchTab('decode')"
      >
        <svg class="jwt-tab__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"
          />
        </svg>
        {{ t("tools.jwt.decode") }}
      </button>
      <button
        type="button"
        role="tab"
        class="jwt-tab"
        :class="{ 'jwt-tab--on': tab === 'encode' }"
        :aria-selected="tab === 'encode'"
        @click="switchTab('encode')"
      >
        <svg class="jwt-tab__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path
            d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
          />
        </svg>
        {{ t("tools.jwt.encode") }}
      </button>
    </div>

    <!-- Decode -->
    <div v-show="tab === 'decode'" class="jwt-grid">
      <div class="jwt-col jwt-col--stack">
        <div class="jwt-card jwt-card--flush">
          <div class="jwt-card__bar">
            <span class="jwt-card__bar-title">{{ t("tools.jwt.jwtTokenCard") }}</span>
          </div>
          <textarea
            v-model="tokenIn"
            class="jwt-card__ta jwt-card__ta--in"
            spellcheck="false"
            :placeholder="t('tools.jwt.pasteJwtPlaceholder')"
            rows="8"
          />
        </div>
        <div class="jwt-card jwt-card--secret">
          <div class="jwt-secret-head">
            <span class="jwt-secret-label">
              <svg class="jwt-key-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
                />
              </svg>
              {{ t("tools.jwt.verifySignature") }}
            </span>
            <span class="jwt-alg">{{ t("tools.jwt.hmacAlg") }}</span>
          </div>
          <input
            v-model="secretDec"
            type="text"
            class="jwt-secret-input"
            autocomplete="off"
            :placeholder="t('tools.jwt.secretPlaceholder')"
          />
          <div v-if="verifyMsg === 'valid'" class="jwt-verify jwt-verify--ok">✓ {{ t("tools.jwt.sigValid") }}</div>
          <div v-else-if="verifyMsg === 'invalid'" class="jwt-verify jwt-verify--bad">✗ {{ t("tools.jwt.sigInvalid") }}</div>
          <div v-else-if="verifyMsg === 'nosecret'" class="jwt-verify jwt-verify--warn">⚠ {{ t("tools.jwt.sigNeedSecret") }}</div>
          <div v-if="decError" class="jwt-err">{{ decError }}</div>
        </div>
      </div>
      <div class="jwt-col jwt-col--stack jwt-col--out">
        <div class="jwt-card jwt-card--flush jwt-card--flex">
          <div class="jwt-card__bar jwt-card__bar--split">
            <span class="jwt-card__bar-title">{{ t("tools.jwt.headerLabel") }}</span>
            <span class="jwt-json-badge">{{ t("tools.jwt.jsonBadge") }}</span>
          </div>
          <textarea :value="headerOut" readonly class="jwt-card__ta jwt-card__ta--ro" rows="6" spellcheck="false" />
        </div>
        <div class="jwt-card jwt-card--flush jwt-card--flex jwt-card--grow">
          <div class="jwt-card__bar jwt-card__bar--split">
            <span class="jwt-card__bar-title">{{ t("tools.jwt.payloadLabel") }}</span>
            <span class="jwt-json-badge">{{ t("tools.jwt.jsonBadge") }}</span>
          </div>
          <textarea :value="payloadOut" readonly class="jwt-card__ta jwt-card__ta--ro jwt-card__ta--grow" rows="10" spellcheck="false" />
        </div>
      </div>
    </div>

    <!-- Encode -->
    <div v-show="tab === 'encode'" class="jwt-grid">
      <div class="jwt-col jwt-col--stack">
        <div v-if="encError" class="jwt-err jwt-err--block">{{ encError }}</div>
        <div class="jwt-card jwt-card--flush">
          <div class="jwt-card__bar jwt-card__bar--split">
            <span class="jwt-card__bar-title">{{ t("tools.jwt.headerLabel") }}</span>
            <span class="jwt-json-badge">{{ t("tools.jwt.jsonBadge") }}</span>
          </div>
          <textarea v-model="headerJson" class="jwt-card__ta jwt-card__ta--in" spellcheck="false" rows="6" />
        </div>
        <div class="jwt-card jwt-card--flush jwt-card--flex jwt-card--grow">
          <div class="jwt-card__bar jwt-card__bar--split">
            <span class="jwt-card__bar-title">{{ t("tools.jwt.payloadLabel") }}</span>
            <span class="jwt-json-badge">{{ t("tools.jwt.jsonBadge") }}</span>
          </div>
          <textarea v-model="payloadJson" class="jwt-card__ta jwt-card__ta--in jwt-card__ta--grow" spellcheck="false" rows="10" />
        </div>
        <div class="jwt-card jwt-card--secret">
          <div class="jwt-secret-head">
            <span class="jwt-secret-label">
              <svg class="jwt-key-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path
                  d="M12.65 10A5.99 5.99 0 0 0 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6a5.99 5.99 0 0 0 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
                />
              </svg>
              {{ t("tools.jwt.signingSecret") }}
            </span>
            <span class="jwt-alg">{{ t("tools.jwt.hmacAlg") }}</span>
          </div>
          <input
            v-model="secretEnc"
            type="password"
            class="jwt-secret-input"
            autocomplete="off"
            :placeholder="t('tools.jwt.secretPlaceholder')"
          />
          <div class="jwt-secret-hint">
            <svg class="jwt-hint-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
              />
            </svg>
            <p>{{ t("tools.jwt.secretInfo") }}</p>
          </div>
        </div>
      </div>
      <div class="jwt-col jwt-col--stack">
        <div class="jwt-card jwt-card--token">
          <div class="jwt-card__bar jwt-card__bar--split">
            <span class="jwt-card__bar-title">{{ t("tools.jwt.encodedToken") }}</span>
            <button
              type="button"
              class="jwt-copy-btn"
              :disabled="!tokenDisplay"
              :title="t('tools.jwt.copyToken')"
              :aria-label="t('tools.jwt.copyToken')"
              @click="copyToken"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18">
                <path
                  d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                />
              </svg>
            </button>
          </div>
          <div class="jwt-token-body">
            <template v-if="tokenDisplay">
              <span class="tok tok-h">{{ tokenParts.h }}</span>
              <span class="tok tok-dot">.</span>
              <span class="tok tok-p">{{ tokenParts.p }}</span>
              <span class="tok tok-dot">.</span>
              <span class="tok tok-s">{{ tokenParts.s }}</span>
            </template>
          </div>
          <div class="jwt-token-legend">
            <div class="jwt-legend-item">
              <span class="jwt-legend-dot jwt-legend-dot--h" />
              {{ t("tools.jwt.header") }}
            </div>
            <div class="jwt-legend-item">
              <span class="jwt-legend-dot jwt-legend-dot--p" />
              {{ t("tools.jwt.payload") }}
            </div>
            <div class="jwt-legend-item">
              <span class="jwt-legend-dot jwt-legend-dot--s" />
              {{ t("tools.jwt.signature") }}
            </div>
          </div>
        </div>
        <p class="jwt-token-footnote">{{ t("tools.jwt.tokenInfo") }}</p>
        <p v-if="copyOk" class="jwt-copy-toast">{{ t("tools.jwt.copyJwt") }} ✓</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.jwt-tool {
  max-width: 100%;
  min-width: 0;
}

.jwt-tool__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.35rem;
}

.jwt-tool__desc {
  margin: 0 0 1.25rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.jwt-tabs {
  display: flex;
  gap: 2rem;
  margin-bottom: 0;
  border-bottom: 1px solid var(--border);
}

.jwt-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.65rem 0 0.75rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
}

.jwt-tab--on {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.jwt-tab__icon {
  width: 1.125rem;
  height: 1.125rem;
  opacity: 0.9;
}

.jwt-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  padding-top: 1.25rem;
}

@media (min-width: 1024px) {
  .jwt-grid {
    grid-template-columns: 1fr 1fr;
    gap: 2.5rem;
    align-items: stretch;
  }
}

.jwt-col--stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.jwt-col--out {
  min-height: 0;
}

.jwt-card {
  border-radius: 0.75rem;
  border: 1px solid var(--border);
  background: var(--surface-elevated);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.jwt-card--flush {
  padding: 0;
}

.jwt-card--flex {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.jwt-card--grow {
  flex: 1;
}

.jwt-card__bar {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--json-pane-bg);
}

.jwt-card__bar--split {
  justify-content: space-between;
}

.jwt-card__bar-title {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.jwt-json-badge {
  font-family: var(--font-mono);
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: var(--surface-hover);
  color: var(--text-muted);
}

.jwt-card__ta {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  border: none;
  resize: vertical;
  background: transparent;
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.6;
  padding: 1rem;
}

.jwt-card__ta:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--primary);
}

.jwt-card__ta--in {
  min-height: 8rem;
  background: var(--surface-elevated);
}

.jwt-card__ta--ro {
  min-height: 7rem;
  background: var(--surface-elevated);
  cursor: default;
}

.jwt-card__ta--grow {
  flex: 1;
  min-height: 11rem;
  resize: none;
}

.jwt-card--secret {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.jwt-secret-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.jwt-secret-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.jwt-key-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: var(--primary);
  flex-shrink: 0;
}

.jwt-alg {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.jwt-secret-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.625rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--json-pane-bg);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
}

.jwt-secret-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.jwt-secret-input::placeholder {
  color: var(--text-muted);
  opacity: 0.75;
}

.jwt-secret-hint {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.25rem;
  padding: 0.5rem 0.5rem;
  border-radius: 0.375rem;
  background: rgba(19, 127, 236, 0.12);
  color: var(--primary);
  font-size: 0.75rem;
  line-height: 1.45;
}

html[data-theme="light"] .jwt-secret-hint {
  background: rgba(19, 127, 236, 0.08);
}

.jwt-hint-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  margin-top: 0.05rem;
  opacity: 0.9;
}

.jwt-secret-hint p {
  margin: 0;
}

.jwt-verify {
  font-size: 0.8125rem;
  padding: 0.45rem 0.5rem;
  border-radius: 0.375rem;
}

.jwt-verify--ok {
  background: rgba(34, 197, 94, 0.15);
  color: #86efac;
}

.jwt-verify--bad {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
}

.jwt-verify--warn {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
}

.jwt-err {
  color: #f87171;
  font-size: 0.8125rem;
}

.jwt-err--block {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
}

.jwt-card--token {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 24rem;
}

.jwt-copy-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  border: none;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.jwt-copy-btn:hover:not(:disabled) {
  color: var(--primary);
  background: var(--surface-hover);
}

.jwt-copy-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.jwt-token-body {
  flex: 1;
  padding: 1.5rem;
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  line-height: 1.65;
  word-break: break-all;
  min-height: 12rem;
}

.tok-dot {
  color: var(--text-muted);
}

.tok-h {
  color: #f87171;
}

.tok-p {
  color: #c084fc;
}

.tok-s {
  color: #60a5fa;
}

.jwt-token-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
  background: var(--json-pane-bg);
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.jwt-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.jwt-legend-dot {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
}

.jwt-legend-dot--h {
  background: #f87171;
}

.jwt-legend-dot--p {
  background: #a855f7;
}

.jwt-legend-dot--s {
  background: #60a5fa;
}

.jwt-token-footnote {
  margin: 0;
  padding: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.5;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: transparent;
}

.jwt-copy-toast {
  margin: 0.25rem 0 0;
  font-size: 0.8125rem;
  color: #4ade80;
}
</style>
