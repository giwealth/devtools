<script setup>
import { ref, shallowRef, watch, onMounted, onUnmounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import { copyText } from "../utils/clipboard";
import { buildIcoFromOutputCanvas } from "../utils/icoEncode";

const { t } = useI18n();

const fileInput = ref(null);
const canvasEl = ref(null);
const dropZone = ref(null);

const sourceImage = shallowRef(null);
/** @type {import('vue').Ref<File|null>} */
const originalBlob = ref(null);
const originalW = ref(0);
const originalH = ref(0);
const modified = ref(false);

const rotation = ref(0);
const previewScale = ref(1);
const ow = ref(0);
const oh = ref(0);
const lockRatio = ref(true);
const aspect = ref(1);

const quality = ref(80);
/** @type {import('vue').Ref<'jpg'|'png'|'webp'|'avif'|'ico'>} */
const format = ref("jpg");

const cropMode = ref(false);
const isDraggingCrop = ref(false);
const cropStart = ref({ x: 0, y: 0 });
const cropEnd = ref({ x: 0, y: 0 });

const qualityPresets = [30, 60, 80, 100];
const formatOptions = [
  { id: "jpg", label: "JPG" },
  { id: "png", label: "PNG" },
  { id: "webp", label: "WEBP" },
  { id: "avif", label: "AVIF" },
  { id: "ico", label: "ICO" },
];

const zoomLabel = computed(() => `${Math.round(previewScale.value * 100)}%`);

const CROP_LAYOUT = { canvasW: 0, canvasH: 0, f: 1, ps: 1, imW: 0, imH: 0 };
function setPreviewLayout(patch) {
  Object.assign(CROP_LAYOUT, patch);
}

let objectUrl = null;

function pickFile() {
  fileInput.value?.click();
}

function revoke() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

function syncFormatByMimeType(mime) {
  const m = String(mime || "").toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg" || m === "image/pjpeg") {
    format.value = "jpg";
    return;
  }
  if (m === "image/png") {
    format.value = "png";
    return;
  }
  if (m === "image/webp") {
    format.value = "webp";
    return;
  }
  if (m === "image/avif") {
    format.value = "avif";
    return;
  }
  if (m === "image/x-icon" || m === "image/vnd.microsoft.icon") {
    format.value = "ico";
    return;
  }
  // GIF/BMP/TIFF 等未直接提供同格式导出，默认回落到 PNG。
  if (m.startsWith("image/")) {
    format.value = "png";
  }
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 10 * 1024 * 1024) {
    alert(t("tools.image.sizeLimit"));
    return;
  }
  revoke();
  syncFormatByMimeType(file.type);
  originalBlob.value = file;
  objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    sourceImage.value = img;
    originalW.value = img.width;
    originalH.value = img.height;
    ow.value = img.width;
    oh.value = img.height;
    aspect.value = img.width / Math.max(img.height, 1);
    rotation.value = 0;
    previewScale.value = 1;
    modified.value = false;
    drawPreview();
  };
  img.src = objectUrl;
}

function onFileChange(e) {
  const f = e.target.files?.[0];
  if (f) loadFile(f);
}

function onDrop(e) {
  e.preventDefault();
  dropZone.value?.classList.remove("img-tool__canvas-wrap--drag");
  const f = e.dataTransfer.files?.[0];
  if (f) loadFile(f);
}
function onDragOver(e) {
  e.preventDefault();
  dropZone.value?.classList.add("img-tool__canvas-wrap--drag");
}
function onDragLeave() {
  dropZone.value?.classList.remove("img-tool__canvas-wrap--drag");
}

function onCanvasWrapClick() {
  if (!sourceImage.value) pickFile();
}

function setQualityPreset(n) {
  quality.value = n;
}

function drawPreview() {
  const canvas = canvasEl.value;
  const im = sourceImage.value;
  if (!canvas || !im) return;
  const ctx = canvas.getContext("2d");
  const maxW = 920;
  const maxH = 620;
  let imgW = im.width * previewScale.value;
  let imgH = im.height * previewScale.value;
  let cw = imgW;
  let ch = imgH;
  if (rotation.value !== 0) {
    const rad = (rotation.value * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    cw = imgW * cos + imgH * sin;
    ch = imgW * sin + imgH * cos;
  }
  const f = Math.min(maxW / cw, maxH / ch, 1);
  canvas.width = cw * f;
  canvas.height = ch * f;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.scale(f * previewScale.value, f * previewScale.value);
  ctx.drawImage(im, -im.width / 2, -im.height / 2);
  ctx.restore();

  setPreviewLayout({
    canvasW: canvas.width,
    canvasH: canvas.height,
    f,
    ps: previewScale.value,
    imW: im.width,
    imH: im.height,
  });

  if (rotation.value === 0 && cropMode.value && isDraggingCrop.value) {
    const x0 = Math.min(cropStart.value.x, cropEnd.value.x);
    const y0 = Math.min(cropStart.value.y, cropEnd.value.y);
    const rw = Math.abs(cropEnd.value.x - cropStart.value.x);
    const rh = Math.abs(cropEnd.value.y - cropStart.value.y);
    if (rw > 1 && rh > 1) {
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x0, y0, rw, rh);
      ctx.setLineDash([]);
    }
  }
}

function eventToCanvas(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / Math.max(rect.width, 1);
  const sy = canvas.height / Math.max(rect.height, 1);
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy,
  };
}

function canvasToImage(canvasX, canvasY) {
  const im = sourceImage.value;
  if (!im || CROP_LAYOUT.canvasW < 1) return { x: 0, y: 0 };
  const fac = CROP_LAYOUT.f * CROP_LAYOUT.ps;
  return {
    x: (canvasX - CROP_LAYOUT.canvasW / 2) / fac + CROP_LAYOUT.imW / 2,
    y: (canvasY - CROP_LAYOUT.canvasH / 2) / fac + CROP_LAYOUT.imH / 2,
  };
}

function onCanvasMouseDown(e) {
  if (!cropMode.value || rotation.value !== 0 || !sourceImage.value) return;
  e.stopPropagation();
  const c = canvasEl.value;
  if (!c) return;
  const p = eventToCanvas(e, c);
  isDraggingCrop.value = true;
  cropStart.value = { ...p };
  cropEnd.value = { ...p };
  drawPreview();
}

function onCanvasClick(e) {
  if (cropMode.value) e.stopPropagation();
}

function onWindowCropMove(e) {
  if (!isDraggingCrop.value) return;
  const c = canvasEl.value;
  if (!c) return;
  const p = eventToCanvas(e, c);
  cropEnd.value = { ...p };
  drawPreview();
}

function onWindowCropUp() {
  if (!isDraggingCrop.value) return;
  isDraggingCrop.value = false;
  const rw = Math.abs(cropEnd.value.x - cropStart.value.x);
  const rh = Math.abs(cropEnd.value.y - cropStart.value.y);
  drawPreview();
  if (rw > 2 && rh > 2 && sourceImage.value && rotation.value === 0) {
    applyCropFromCanvas();
  }
}

function applyCropFromCanvas() {
  const im = sourceImage.value;
  if (!im) return;
  const c1 = canvasToImage(cropStart.value.x, cropStart.value.y);
  const c2 = canvasToImage(cropEnd.value.x, cropEnd.value.y);
  let x = Math.floor(Math.min(c1.x, c2.x));
  let y = Math.floor(Math.min(c1.y, c2.y));
  let w = Math.ceil(Math.abs(c2.x - c1.x));
  let h = Math.ceil(Math.abs(c2.y - c1.y));
  x = Math.max(0, Math.min(x, im.width - 1));
  y = Math.max(0, Math.min(y, im.height - 1));
  w = Math.max(1, Math.min(w, im.width - x));
  h = Math.max(1, Math.min(h, im.height - y));

  const oc = document.createElement("canvas");
  oc.width = w;
  oc.height = h;
  const octx = oc.getContext("2d");
  octx.imageSmoothingEnabled = true;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(im, x, y, w, h, 0, 0, w, h);

  const img = new Image();
  img.onload = () => {
    sourceImage.value = img;
    originalBlob.value = null;
    originalW.value = w;
    originalH.value = h;
    ow.value = w;
    oh.value = h;
    aspect.value = w / Math.max(h, 1);
    previewScale.value = 1;
    modified.value = true;
    cropMode.value = false;
    drawPreview();
  };
  img.src = oc.toDataURL();
}

function toggleCropMode() {
  if (!sourceImage.value) return;
  if (rotation.value !== 0) {
    alert(t("tools.image.rotateFirst"));
    return;
  }
  cropMode.value = !cropMode.value;
  isDraggingCrop.value = false;
  drawPreview();
}

function rotL() {
  rotation.value -= 90;
  modified.value = true;
  drawPreview();
}
function rotR() {
  rotation.value += 90;
  modified.value = true;
  drawPreview();
}
/** 预览缩放：按比例更新 W/H，与导出尺寸一致（导出仅使用 ow×oh，不再乘 previewScale） */
function applyZoomStep(nextZ) {
  const im = sourceImage.value;
  if (!im) return;
  const prevZ = previewScale.value;
  if (prevZ <= 0 || nextZ <= 0) return;
  const r = nextZ / prevZ;
  if (Math.abs(r - 1) < 1e-6) return;
  const w = parseInt(String(ow.value), 10) || im.width;
  const h = parseInt(String(oh.value), 10) || im.height;
  ow.value = Math.max(1, Math.round(w * r));
  if (lockRatio.value) {
    oh.value = Math.max(1, Math.round(ow.value / aspect.value));
  } else {
    oh.value = Math.max(1, Math.round(h * r));
  }
  previewScale.value = nextZ;
  modified.value = true;
  drawPreview();
}

function zoomIn() {
  applyZoomStep(Math.min(3, previewScale.value + 0.1));
}
function zoomOut() {
  applyZoomStep(Math.max(0.1, previewScale.value - 0.1));
}

function onOwInput() {
  previewScale.value = 1;
  if (lockRatio.value && ow.value > 0) {
    oh.value = Math.round(ow.value / aspect.value);
  }
  modified.value = true;
  drawPreview();
}
function onOhInput() {
  previewScale.value = 1;
  if (lockRatio.value && oh.value > 0) {
    ow.value = Math.round(oh.value * aspect.value);
  }
  modified.value = true;
  drawPreview();
}

function toggleLock() {
  lockRatio.value = !lockRatio.value;
  if (lockRatio.value && sourceImage.value) {
    aspect.value = ow.value / Math.max(oh.value, 1);
  }
}

function resetAll() {
  revoke();
  sourceImage.value = null;
  originalBlob.value = null;
  originalW.value = 0;
  originalH.value = 0;
  modified.value = false;
  rotation.value = 0;
  previewScale.value = 1;
  ow.value = 0;
  oh.value = 0;
  cropMode.value = false;
  isDraggingCrop.value = false;
  quality.value = 80;
  format.value = "jpg";
  if (fileInput.value) fileInput.value.value = "";
  const c = canvasEl.value;
  if (c) {
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
  }
}

function buildOutputCanvas() {
  const im = sourceImage.value;
  if (!im) return null;
  let W = parseInt(String(ow.value), 10) || im.width;
  let H = parseInt(String(oh.value), 10) || im.height;
  if (W < 1) W = im.width;
  if (H < 1) H = im.height;
  const oc = document.createElement("canvas");
  oc.width = W;
  oc.height = H;
  const ctx = oc.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (rotation.value !== 0) {
    ctx.translate(W / 2, H / 2);
    ctx.rotate((rotation.value * Math.PI) / 180);
    ctx.drawImage(im, -im.width / 2, -im.height / 2);
  } else if (W !== im.width || H !== im.height) {
    ctx.drawImage(im, 0, 0, W, H);
  } else {
    ctx.drawImage(im, 0, 0);
  }
  return oc;
}

function dataUrlFromCanvas(oc, mime, q) {
  if (mime === "image/png") return oc.toDataURL(mime);
  return oc.toDataURL(mime, q);
}

async function download() {
  const im = sourceImage.value;
  if (!im) {
    alert(t("tools.image.pickFirst"));
    return;
  }
  const fmt = format.value;

  if (fmt === "ico") {
    const oc = buildOutputCanvas();
    if (!oc) return;
    try {
      const icoBytes = await buildIcoFromOutputCanvas(oc);
      const blob = new Blob([icoBytes], { type: "image/x-icon" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `image_${Date.now()}.ico`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch {
      alert(t("tools.image.icoEncodeFailed"));
    }
    return;
  }

  const W = parseInt(String(ow.value), 10) || im.width;
  const H = parseInt(String(oh.value), 10) || im.height;

  if (
    fmt === "png" &&
    originalBlob.value &&
    W === originalW.value &&
    H === originalH.value &&
    rotation.value === 0 &&
    !modified.value &&
    previewScale.value === 1
  ) {
    const url = URL.createObjectURL(originalBlob.value);
    const a = document.createElement("a");
    const name = originalBlob.value.name || "image.png";
    a.download = name.replace(/(\.[^.]+)?$/, `_export.png`);
    a.href = url;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    return;
  }

  const oc = buildOutputCanvas();
  if (!oc) return;
  const q = Math.max(0, Math.min(1, quality.value / 100));
  let mime = "image/png";
  let ext = "png";
  if (fmt === "jpg" || fmt === "jpeg") {
    mime = "image/jpeg";
    ext = "jpg";
  } else if (fmt === "webp") {
    mime = "image/webp";
    ext = "webp";
  } else if (fmt === "avif") {
    mime = "image/avif";
    ext = "avif";
  }

  let dataUrl;
  try {
    dataUrl = dataUrlFromCanvas(oc, mime, q);
    if (fmt === "avif" && (!dataUrl || dataUrl.length < 32 || dataUrl === "data:,")) {
      throw new Error("avif");
    }
  } catch {
    if (fmt === "avif") {
      alert(t("tools.image.avifUnsupported"));
      return;
    }
    dataUrl = oc.toDataURL("image/png");
    ext = "png";
  }

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `image_${Date.now()}.${ext}`;
  a.click();
}

async function copyDataUrl() {
  const oc = buildOutputCanvas();
  if (!oc) return;
  const fmt = format.value;
  if (fmt === "ico") {
    try {
      const icoBytes = await buildIcoFromOutputCanvas(oc);
      const blob = new Blob([icoBytes], { type: "image/x-icon" });
      if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        return;
      }
    } catch {
      /* fallthrough */
    }
    alert(t("common.copyFailed"));
    return;
  }
  const q = Math.max(0, Math.min(1, quality.value / 100));
  let mime = "image/png";
  if (fmt === "jpg" || fmt === "jpeg") mime = "image/jpeg";
  else if (fmt === "webp") mime = "image/webp";
  else if (fmt === "avif") mime = "image/avif";

  let dataUrl;
  try {
    dataUrl = dataUrlFromCanvas(oc, mime, q);
    if (fmt === "avif" && (!dataUrl || dataUrl.length < 32)) throw new Error("avif");
  } catch {
    if (fmt === "avif") {
      alert(t("tools.image.avifUnsupported"));
      return;
    }
    dataUrl = oc.toDataURL("image/png");
  }
  const ok = await copyText(dataUrl);
  if (!ok) alert(t("common.copyFailed"));
}

watch([sourceImage, previewScale, rotation, ow, oh], () => {
  if (sourceImage.value) drawPreview();
});

watch(rotation, (r) => {
  if (r !== 0 && cropMode.value) {
    cropMode.value = false;
    isDraggingCrop.value = false;
    if (sourceImage.value) drawPreview();
  }
});

onMounted(() => {
  window.addEventListener("mousemove", onWindowCropMove);
  window.addEventListener("mouseup", onWindowCropUp);
});

onUnmounted(() => {
  window.removeEventListener("mousemove", onWindowCropMove);
  window.removeEventListener("mouseup", onWindowCropUp);
});
</script>

<template>
  <section class="img-tool">
    <header class="img-tool__head">
      <h1 class="img-tool__title">{{ t("tools.image.title") }}</h1>
      <p class="img-tool__desc">{{ t("tools.image.desc") }}</p>
    </header>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif,image/x-icon,image/vnd.microsoft.icon,.ico"
      class="img-tool__file"
      @change="onFileChange"
    />

    <div class="img-tool__grid">
      <div class="img-tool__left">
        <!-- 工具条（与 web/image.html 一致） -->
        <div class="img-tool__toolbar">
          <div class="img-tool__tb-left">
            <button
              type="button"
              class="img-tb-btn"
              :class="{ 'img-tb-btn--on': cropMode }"
              :title="t('tools.image.crop')"
              @click.stop="toggleCropMode"
            >
              <svg class="img-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z"
                />
              </svg>
            </button>
            <button type="button" class="img-tb-btn" :title="t('tools.image.rotateL')" @click.stop="rotL">
              <span class="material-symbols-outlined img-tb-ms" aria-hidden="true">rotate_left</span>
            </button>
            <button type="button" class="img-tb-btn" :title="t('tools.image.rotateR')" @click.stop="rotR">
              <span class="material-symbols-outlined img-tb-ms" aria-hidden="true">rotate_right</span>
            </button>
            <span class="img-tb-divider" aria-hidden="true" />
            <button type="button" class="img-tb-btn" :title="t('tools.image.zoomOut')" @click.stop="zoomOut">
              <svg class="img-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M19 13H5v-2h14v2z" />
              </svg>
            </button>
            <span class="img-tb-zoom" aria-live="polite">{{ zoomLabel }}</span>
            <button type="button" class="img-tb-btn" :title="t('tools.image.zoomIn')" @click.stop="zoomIn">
              <svg class="img-ico" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
            </button>
            <span class="img-tb-divider" aria-hidden="true" />
            <div class="img-tb-dims">
              <span class="img-tb-dim-lbl">{{ t("tools.image.w") }}:</span>
              <input
                v-model.number="ow"
                type="number"
                min="1"
                class="img-tb-num"
                :disabled="!sourceImage"
                @input="onOwInput"
              />
              <button
                type="button"
                class="img-lock"
                :class="{ 'img-lock--on': lockRatio }"
                :title="t('tools.image.lockRatio')"
                @click.stop="toggleLock"
              >
                <svg class="img-ico img-ico--sm" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-8 9H5c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H5c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2z"
                  />
                </svg>
              </button>
              <span class="img-tb-dim-lbl">{{ t("tools.image.h") }}:</span>
              <input
                v-model.number="oh"
                type="number"
                min="1"
                class="img-tb-num"
                :disabled="!sourceImage"
                @input="onOhInput"
              />
            </div>
          </div>
          <div class="img-tool__tb-right">
            <button type="button" class="img-reset-all" @click.stop="resetAll">
              {{ t("tools.image.resetAll") }}
            </button>
          </div>
        </div>

        <!-- 画布 / 空状态 -->
        <div
          ref="dropZone"
          class="img-tool__canvas-wrap"
          @click="onCanvasWrapClick"
          @drop="onDrop"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
        >
          <div v-if="!sourceImage" class="img-tool__empty">
            <div class="img-tool__empty-icon" aria-hidden="true">
              <svg class="img-tool__empty-svg" viewBox="0 0 24 24" fill="currentColor">
                <path
                  d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z"
                />
              </svg>
            </div>
            <h3 class="img-tool__empty-title">{{ t("tools.image.uploadTitle") }}</h3>
            <p class="img-tool__empty-desc">{{ t("tools.image.uploadDesc") }}</p>
            <button type="button" class="img-tool__empty-btn" @click.stop="pickFile">
              <svg class="img-ico img-ico--btn" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"
                />
              </svg>
              {{ t("tools.image.selectFile") }}
            </button>
          </div>
          <canvas
            v-show="sourceImage"
            ref="canvasEl"
            class="img-tool__cv"
            :class="{ 'img-tool__cv--crop': cropMode && rotation === 0 }"
            @mousedown="onCanvasMouseDown"
            @click="onCanvasClick"
          />
        </div>
      </div>

      <!-- 右侧侧栏 -->
      <aside class="img-tool__sidebar">
        <div class="img-card">
          <div class="img-card__head">
            <div class="img-card__title-row">
              <span class="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">compress</span>
              <span class="img-card__title">{{ t("tools.image.compress") }}</span>
            </div>
            <span class="img-card__badge font-mono">{{ t("tools.image.qualityBadge", { n: quality }) }}</span>
          </div>
          <input v-model.number="quality" type="range" min="1" max="100" class="img-range" />
          <div class="img-range-lbls">
            <span>{{ t("tools.image.qualityLow") }}</span>
            <span>{{ t("tools.image.qualityHigh") }}</span>
          </div>
          <div class="img-presets">
            <button
              v-for="p in qualityPresets"
              :key="p"
              type="button"
              class="img-preset"
              :class="{ 'img-preset--on': quality === p }"
              @click="setQualityPreset(p)"
            >
              {{ p }}%
            </button>
          </div>
        </div>

        <div class="img-card">
          <div class="img-card__head img-card__head--simple">
            <div class="img-card__title-row">
              <span class="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">swap_horiz</span>
              <span class="img-card__title">{{ t("tools.image.convert") }}</span>
            </div>
          </div>
          <div class="img-format-grid">
            <label v-for="opt in formatOptions" :key="opt.id" class="img-format-lbl">
              <input v-model="format" type="radio" class="sr-only" :value="opt.id" name="img-fmt" />
              <span class="img-format-tile">{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <div class="img-card img-card--actions">
          <button type="button" class="img-btn img-btn--primary" @click="download">
            <svg class="img-ico img-ico--btn" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
            </svg>
            {{ t("tools.image.downloadImage") }}
          </button>
          <button type="button" class="img-btn img-btn--outline" @click="copyDataUrl">
            <svg class="img-ico img-ico--btn" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
              />
            </svg>
            {{ t("tools.image.copyBase64Btn") }}
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono);
}

.img-tool {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 100%;
  min-height: 0;
}

.img-tool__head {
  flex-shrink: 0;
}

.img-tool__title {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
}

.img-tool__desc {
  margin: 0;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.img-tool__file {
  display: none;
}

.img-tool__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
  gap: 1.25rem;
  align-items: stretch;
  min-height: clamp(400px, calc(100vh - 11rem), 720px);
}

@media (max-width: 900px) {
  .img-tool__grid {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}

.img-tool__left {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  min-height: 0;
}

.img-tool__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  padding: 0.5rem 0.75rem;
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.img-tool__tb-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem;
}

.img-tool__tb-right {
  display: flex;
  align-items: center;
  padding: 0 0.25rem;
}

.img-tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 0;
}

.img-tb-btn:hover {
  color: var(--primary);
  background: rgba(19, 127, 236, 0.12);
}

.img-tb-btn--on {
  color: var(--primary);
  background: rgba(19, 127, 236, 0.18);
}

.img-tb-divider {
  width: 1px;
  height: 1.5rem;
  margin: 0 0.2rem;
  background: var(--border);
  flex-shrink: 0;
}

.img-tb-zoom {
  min-width: 3rem;
  text-align: center;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.img-tb-dims {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem;
}

.img-tb-dim-lbl {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.img-tb-num {
  width: 4rem;
  padding: 0.15rem 0.35rem;
  border-radius: 0.25rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 0.75rem;
  font-family: var(--font-mono);
}

.img-tb-num:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}

.img-tb-num:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.img-lock {
  display: inline-flex;
  padding: 0.2rem;
  border: none;
  border-radius: 0.25rem;
  background: rgba(19, 127, 236, 0.12);
  color: var(--primary);
  cursor: pointer;
  line-height: 0;
}

.img-lock--on {
  background: rgba(19, 127, 236, 0.22);
}

.img-reset-all {
  border: none;
  background: transparent;
  padding: 0.35rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
  cursor: pointer;
}

.img-reset-all:hover {
  text-decoration: underline;
}

.img-ico {
  width: 1.25rem;
  height: 1.25rem;
  display: block;
}

.img-tb-ms.material-symbols-outlined {
  font-size: 1.25rem;
  width: 1.25rem;
  height: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.img-ico--sm {
  width: 1rem;
  height: 1rem;
}

.img-ico--primary {
  color: var(--primary);
}

.img-ico--btn {
  width: 1.125rem;
  height: 1.125rem;
}

.img-tool__canvas-wrap {
  position: relative;
  flex: 1;
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface);
  border: 2px dashed var(--border);
  border-radius: 0.75rem;
  overflow: hidden;
  cursor: default;
}

.img-tool__canvas-wrap--drag {
  border-color: var(--primary);
  background: rgba(19, 127, 236, 0.06);
}

.img-tool__empty {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  text-align: center;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  backdrop-filter: blur(8px);
}

@supports not (background: color-mix(in srgb, black 50%, white)) {
  .img-tool__empty {
    background: rgba(17, 20, 24, 0.92);
  }
}

html[data-theme="light"] .img-tool__empty {
  background: color-mix(in srgb, var(--surface) 90%, transparent);
}

@supports not (background: color-mix(in srgb, black 50%, white)) {
  html[data-theme="light"] .img-tool__empty {
    background: rgba(255, 255, 255, 0.94);
  }
}

.img-tool__empty-icon {
  width: 4rem;
  height: 4rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgba(19, 127, 236, 0.15);
  color: var(--primary);
}

.img-tool__empty-svg {
  width: 2rem;
  height: 2rem;
}

.img-tool__empty-title {
  margin: 0 0 0.35rem;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text);
}

.img-tool__empty-desc {
  margin: 0 0 1.25rem;
  max-width: 20rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.img-tool__empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.35rem;
  border: none;
  border-radius: 0.5rem;
  background: var(--primary);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
                            box-shadow: 0 4px 14px rgba(19, 127, 236, 0.35);
}

.img-tool__empty-btn:hover {
  filter: brightness(1.06);
}

.img-tool__cv {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: min(62vh, 620px);
  width: auto;
  height: auto;
  display: block;
  border-radius: 0.5rem;
}

.img-tool__cv--crop {
  cursor: crosshair;
}

.img-tool__sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.15rem;
}

.img-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  padding: 1.15rem;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.img-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.img-card__head--simple {
  margin-bottom: 0.75rem;
}

.img-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--text);
}

.img-card__badge {
  flex-shrink: 0;
  padding: 0.2rem 0.45rem;
  border-radius: 0.25rem;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--surface-hover);
}

.img-range {
  width: 100%;
  height: 0.35rem;
  margin: 0 0 0.35rem;
  accent-color: var(--primary);
  cursor: pointer;
}

.img-range-lbls {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  font-family: var(--font-mono);
  color: var(--text-muted);
  margin-bottom: 0.85rem;
}

.img-presets {
  display: flex;
  gap: 0.4rem;
}

.img-preset {
  flex: 1;
  padding: 0.35rem 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  color: var(--text-muted);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
}

.img-preset:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(19, 127, 236, 0.1);
}

.img-preset--on {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(19, 127, 236, 0.14);
}

.img-format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.img-format-lbl {
  cursor: pointer;
  margin: 0;
}

.img-format-tile {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.25rem;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: var(--surface-hover);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s;
}

.img-format-lbl:hover .img-format-tile {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(19, 127, 236, 0.08);
}

.img-format-lbl input:checked + .img-format-tile {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(19, 127, 236, 0.14);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.img-card--actions {
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.img-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.85rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition:
    transform 0.08s ease,
    filter 0.15s;
}

.img-btn:active {
  transform: scale(0.98);
}

.img-btn--primary {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 4px 14px rgba(19, 127, 236, 0.3);
}

.img-btn--primary:hover {
  filter: brightness(1.05);
}

.img-btn--outline {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
  font-weight: 600;
}

.img-btn--outline:hover {
  background: var(--surface-hover);
}
</style>
