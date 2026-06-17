import { HttpError } from "./runtime.js";

export async function createSessionToken(user, secret) {
  const payload = {
    id: user.id,
    role: user.role,
    dept: user.department,
    exp: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
  };
  const data = JSON.stringify(payload);
  const signature = await signHmac(data, secret);
  return btoa(data) + "." + signature;
}

export async function verifySessionToken(token, secret) {
  try {
    if (!token || !token.includes(".")) return null;
    const [encoded, signature] = token.split(".");
    const data = atob(encoded);
    const expectedSignature = await signHmac(data, secret);

    if (signature !== expectedSignature) return null;

    const payload = JSON.parse(data);
    if (payload.exp < Date.now()) throw new HttpError(401, "Session expired");

    return payload;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Invalid session token");
  }
}

async function signHmac(data, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
