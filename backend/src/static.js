import { iconWebpBase64, manifestJson, serviceWorkerJs } from "./static-assets.js";

const APP_ENTRY_URL = "https://highpoints.work/next/login";
const APPLE_TOUCH_ICON_URL = "https://highpoints.work/icons/icon-192.webp";

const baseHeaders = {
  "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "x-xss-protection": "1; mode=block",
};

function textResponse(body, contentType, cacheControl = "no-store") {
  return new Response(body, {
    headers: {
      ...baseHeaders,
      "content-type": contentType,
      "cache-control": cacheControl,
    },
  });
}

function appEntryLocation(url) {
  const target = new URL(APP_ENTRY_URL);
  target.search = url.search;
  return target.toString();
}

function appEntryRedirect(url, status) {
  return new Response(null, {
    status,
    headers: {
      ...baseHeaders,
      "cache-control": "no-store, max-age=0",
      location: appEntryLocation(url),
    },
  });
}

function retiredAssetResponse() {
  return new Response("Retired HighPoints app loader asset. Use https://highpoints.work/next/login.\n", {
    status: 410,
    headers: {
      ...baseHeaders,
      "cache-control": "no-store, max-age=0",
      "content-type": "text/plain;charset=UTF-8",
    },
  });
}

function iconRedirect() {
  return new Response(null, {
    status: 302,
    headers: {
      ...baseHeaders,
      "cache-control": "public, max-age=3600",
      location: APPLE_TOUCH_ICON_URL,
    },
  });
}

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function staticResponseFor(url) {
  if (url.pathname === "/app") {
    return appEntryRedirect(url, 307);
  }
  if (url.pathname === "/signup") {
    return appEntryRedirect(url, 307);
  }
  if (url.pathname === "/app/") {
    return appEntryRedirect(url, 308);
  }
  if (url.pathname === "/app.bundle.js" || url.pathname.startsWith("/vendor/")) {
    return retiredAssetResponse();
  }
  if (url.pathname === "/apple-touch-icon.png") {
    return iconRedirect();
  }
  if (url.pathname === "/sw.js") {
    return textResponse(serviceWorkerJs, "application/javascript;charset=UTF-8");
  }
  if (url.pathname === "/manifest.json") {
    return textResponse(manifestJson, "application/manifest+json;charset=UTF-8", "public, max-age=3600");
  }
  if (url.pathname.startsWith("/icons/")) {
    const name = url.pathname.split("/").pop();
    const encoded = iconWebpBase64[name];
    if (!encoded) return null;
    return new Response(bytesFromBase64(encoded), {
      headers: {
        ...baseHeaders,
        "content-type": "image/webp",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  }
  return null;
}
