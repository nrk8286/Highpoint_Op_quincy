import { appShellHtml, iconWebpBase64, manifestJson, serviceWorkerJs } from "./static-assets.js";

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

function bytesFromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function staticResponseFor(url) {
  if (url.pathname === "/app" || url.pathname === "/signup") {
    return textResponse(appShellHtml, "text/html;charset=UTF-8");
  }
  if (url.pathname === "/app/") {
    return Response.redirect(`${url.origin}/app`, 308);
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
