<script setup>
import { computed, inject } from "vue";
import JsonTreeNode from "./JsonTreeNode.vue";

const props = defineProps({
  data: { required: true },
  entryKey: { default: null },
  path: { type: String, required: true },
  depth: { type: Number, default: 0 },
  isArrayItem: { type: Boolean, default: false },
});

const collapsedSet = inject("jsonTreeCollapsed");

function isContainer(v) {
  return v !== null && typeof v === "object";
}

const container = computed(() => isContainer(props.data));
const isArr = computed(() => Array.isArray(props.data));

const childCount = computed(() => {
  if (!container.value) return 0;
  return isArr.value ? props.data.length : Object.keys(props.data).length;
});

const collapsed = computed(() => collapsedSet.value.has(props.path));

function toggle(e) {
  e?.stopPropagation?.();
  const s = new Set(collapsedSet.value);
  if (s.has(props.path)) s.delete(props.path);
  else s.add(props.path);
  collapsedSet.value = s;
}

function childPathSegment(k) {
  if (typeof k === "number") return `[${k}]`;
  return `.${k}`;
}

const pad = computed(() => ({ paddingLeft: pr(props.depth) }));

function pr(d) {
  return `${d * 16}px`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtPrimitive(v) {
  if (v === null) return '<span class="jt-kw">null</span>';
  const t = typeof v;
  if (t === "string") return `<span class="jt-str">"${esc(v)}"</span>`;
  if (t === "number") return `<span class="jt-num">${esc(String(v))}</span>`;
  if (t === "boolean") return `<span class="jt-kw">${v}</span>`;
  return `<span class="jt-plain">${esc(String(v))}</span>`;
}

const objectEntries = computed(() => {
  if (!container.value || isArr.value) return [];
  return Object.keys(props.data).map((k) => ({ k, v: props.data[k] }));
});

const arrayItems = computed(() => {
  if (!container.value || !isArr.value) return [];
  return props.data.map((v, i) => ({ i, v }));
});
</script>

<template>
  <div class="jt-node">
    <template v-if="!container">
      <div class="jt-row" :style="pad">
        <span v-if="entryKey !== null && !isArrayItem" class="jt-key">"{{ entryKey }}"</span>
        <span v-if="entryKey !== null && !isArrayItem" class="jt-punct">: </span>
        <span v-if="entryKey !== null && isArrayItem" class="jt-idx">{{ entryKey }}: </span>
        <span v-html="fmtPrimitive(data)" />
      </div>
    </template>

    <template v-else>
      <div class="jt-row jt-row--hdr" :style="pad" @click="toggle">
        <span class="jt-chevron">{{ collapsed ? "▶" : "▼" }}</span>
        <span v-if="entryKey !== null && !isArrayItem" class="jt-key">"{{ entryKey }}"</span>
        <span v-if="entryKey !== null && !isArrayItem" class="jt-punct">: </span>
        <span v-if="entryKey !== null && isArrayItem" class="jt-idx">{{ entryKey }}: </span>

        <template v-if="collapsed">
          <span class="jt-br">{{ isArr ? "Array" : "Object" }}</span>
          <span class="jt-br">{{ "{" + childCount + "}" }}</span>
        </template>
        <template v-else>
          <span class="jt-br">{{ isArr ? "[" : "{" }}</span>
        </template>
      </div>

      <template v-if="!collapsed">
        <JsonTreeNode
          v-for="item in objectEntries"
          :key="'o-' + item.k"
          :data="item.v"
          :entry-key="item.k"
          :path="path + childPathSegment(item.k)"
          :depth="depth + 1"
          :is-array-item="false"
        />
        <JsonTreeNode
          v-for="item in arrayItems"
          :key="'a-' + item.i"
          :data="item.v"
          :entry-key="item.i"
          :path="path + childPathSegment(item.i)"
          :depth="depth + 1"
          :is-array-item="true"
        />
        <div class="jt-row" :style="pad">
          <span class="jt-br">{{ isArr ? "]" : "}" }}</span>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped>
.jt-node {
  font-family: var(--font-mono, monospace);
  font-size: 0.8125rem;
  line-height: 1.55;
}
.jt-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.15rem;
  cursor: default;
  min-height: 1.45em;
}
.jt-row--hdr {
  cursor: pointer;
  border-radius: 0.25rem;
}
.jt-row--hdr:hover {
  background: var(--surface-hover);
}
.jt-chevron {
  display: inline-block;
  width: 1em;
  color: #94a3b8;
  user-select: none;
  flex-shrink: 0;
}
.jt-key {
  color: #c084fc;
}
.jt-punct,
.jt-idx {
  color: #94a3b8;
}
.jt-br {
  color: #fbbf24;
}
:deep(.jt-str) {
  color: #4ade80;
}
:deep(.jt-num) {
  color: #60a5fa;
}
:deep(.jt-kw) {
  color: #60a5fa;
}
:deep(.jt-plain) {
  color: #e2e8f0;
}
</style>
