/** PNG 嵌入的 ICO（Windows Vista+）。 */

/**
 * @param {Uint8Array} png
 * @returns {{ w: number; h: number }}
 */
export function readPngIHDR(png) {
  if (png.length < 24) return { w: 16, h: 16 };
  const w = (png[16] << 24) | (png[17] << 16) | (png[18] << 8) | png[19];
  const h = (png[20] << 24) | (png[21] << 16) | (png[22] << 8) | png[23];
  return { w, h };
}

/**
 * @param {Uint8Array[]} pngUint8Arrays PNG 文件字节（每帧一幅）
 * @returns {Uint8Array} 完整 .ico 文件
 */
export function encodeIcoFromPngs(pngUint8Arrays) {
  const count = pngUint8Arrays.length;
  if (count < 1) throw new Error("ICO needs at least one image");
  const headerSize = 6 + 16 * count;
  let total = headerSize;
  for (const png of pngUint8Arrays) total += png.length;

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let pos = 0;
  view.setUint16(pos, 0, true);
  pos += 2;
  view.setUint16(pos, 1, true);
  pos += 2;
  view.setUint16(pos, count, true);
  pos += 2;

  let dataOffset = headerSize;
  for (let i = 0; i < count; i++) {
    const png = pngUint8Arrays[i];
    const { w, h } = readPngIHDR(png);
    const bw = w >= 256 ? 0 : w;
    const bh = h >= 256 ? 0 : h;
    out[pos++] = bw;
    out[pos++] = bh;
    out[pos++] = 0;
    out[pos++] = 0;
    view.setUint16(pos, 1, true);
    pos += 2;
    view.setUint16(pos, 32, true);
    pos += 2;
    view.setUint32(pos, png.length, true);
    pos += 4;
    view.setUint32(pos, dataOffset, true);
    pos += 4;
    dataOffset += png.length;
  }

  pos = headerSize;
  for (const png of pngUint8Arrays) {
    out.set(png, pos);
    pos += png.length;
  }

  return out;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {Promise<Uint8Array>}
 */
function canvasToPngUint8(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("toBlob failed"));
          return;
        }
        void blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      },
      "image/png",
    );
  });
}

/**
 * 默认只生成 **单帧** ICO：体积接近一张同级 PNG（多帧会把多张 PNG 叠进一个 .ico，原图是单 PNG 时必然会大很多）。
 * 需要多档时使用 buildIcoFromOutputCanvas(canvas, ICO_MULTISIZE_LADDER)。
 */
export const ICO_MULTISIZE_LADDER = [16, 32, 48, 64, 128, 256];

/**
 * 单帧边长：与输出画布最大边一致，限制在 16～256（ICO 常见上限）。
 * @param {number} sw
 * @param {number} sh
 * @returns {number[]}
 */
export function pickIcoFrameSizes(sw, sh) {
  const maxEdge = Math.max(sw, sh, 1);
  const s = Math.min(256, Math.max(16, Math.round(maxEdge)));
  return [s];
}

/**
 * 按「包含」方式缩放绘入正方形画布后导出 PNG，再封装为 ICO。
 * @param {HTMLCanvasElement} sourceCanvas
 * @param {number[]} [sizes] 不传为单帧；可传入 ICO_MULTISIZE_LADDER 生成多尺寸
 * @returns {Promise<Uint8Array>}
 */
export async function buildIcoFromOutputCanvas(sourceCanvas, sizes) {
  const pngs = [];
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;
  const frameSizes = sizes ?? pickIcoFrameSizes(sw, sh);
  for (const s of frameSizes) {
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    ctx.clearRect(0, 0, s, s);
    const scale = Math.min(s / sw, s / sh);
    const dw = Math.max(1, Math.round(sw * scale));
    const dh = Math.max(1, Math.round(sh * scale));
    const dx = Math.floor((s - dw) / 2);
    const dy = Math.floor((s - dh) / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sourceCanvas, 0, 0, sw, sh, dx, dy, dw, dh);
    pngs.push(await canvasToPngUint8(c));
  }
  return encodeIcoFromPngs(pngs);
}
