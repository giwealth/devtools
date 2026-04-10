/**
 * UUID v4（随机），使用 Web Crypto：优先 randomUUID，否则 getRandomValues。
 */

export function uuidV4Bytes() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("NO_CRYPTO");
  }
  if (typeof c.randomUUID === "function") {
    const hex = c.randomUUID().replace(/-/g, "");
    const out = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  }
  const b = new Uint8Array(16);
  c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  return b;
}

function bytesToHex(b, upper = false) {
  const map = upper ? "0123456789ABCDEF" : "0123456789abcdef";
  let s = "";
  for (let i = 0; i < b.length; i++) {
    const v = b[i];
    s += map[v >> 4] + map[v & 0xf];
  }
  return s;
}

/**
 * @param {{ hyphen?: boolean; upper?: boolean }} [opts]
 * @returns {string}
 */
export function generateUuidV4(opts = {}) {
  const { hyphen = true, upper = false } = opts;
  const b = uuidV4Bytes();
  const hex = bytesToHex(b, upper);
  if (!hyphen) return hex;
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * @param {number} count
 * @param {{ hyphen?: boolean; upper?: boolean }} [opts]
 * @returns {string[]}
 */
export function generateManyUuids(count, opts) {
  const n = Math.max(1, Math.min(1000, Math.floor(Number(count)) || 1));
  const out = [];
  for (let i = 0; i < n; i++) out.push(generateUuidV4(opts));
  return out;
}
