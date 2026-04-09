export function base64UrlEncode(str) {
  const base64 = btoa(unescape(encodeURIComponent(str)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return decodeURIComponent(escape(atob(base64)));
}

/**
 * @param {string} data
 * @param {string} secret
 */
export async function signHS256(data, secret) {
  if (!window.crypto?.subtle) {
    throw new Error("Web Crypto API is not available.");
  }
  const encoder = new TextEncoder();
  const key = await window.crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const signature = await window.crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifyHS256(data, signature, secret) {
  try {
    const expected = await signHS256(data, secret);
    return expected === signature;
  } catch {
    return false;
  }
}

export async function encodeJWT(header, payload, secret) {
  const headerStr = JSON.stringify(header);
  const payloadStr = JSON.stringify(payload);
  const encodedHeader = base64UrlEncode(headerStr);
  const encodedPayload = base64UrlEncode(payloadStr);
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const sig = await signHS256(unsigned, secret);
  return { jwt: `${unsigned}.${sig}`, encodedHeader, encodedPayload, signature: sig };
}

export async function decodeJWT(token, secretForVerify) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format. Expected 3 parts separated by dots.");
  }
  const [encodedHeader, encodedPayload, signature] = parts;
  const header = JSON.parse(base64UrlDecode(encodedHeader));
  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  let verify = null;
  if (secretForVerify?.trim()) {
    if (!window.crypto?.subtle) {
      throw new Error("Web Crypto API is not available for signature verification.");
    }
    verify = await verifyHS256(`${encodedHeader}.${encodedPayload}`, signature, secretForVerify.trim());
  }
  return { header, payload, encodedHeader, encodedPayload, signature, verify };
}
