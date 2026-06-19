import { iconWebpBase64, manifestJson, serviceWorkerJs } from "./static-assets.js";

const appLoaderHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>High Point Ops</title>
    <link
      rel="icon"
      href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏢</text></svg>"
    />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      html,
      body,
      #root {
        min-height: 100vh;
        background: #0b0a12;
        color: #eae8f0;
        font-family: "DM Sans", sans-serif;
      }
    </style>
    <script src="/vendor/react.production.min.js?v=18.3.1"></script>
    <script src="/vendor/react-dom.production.min.js?v=18.3.1"></script>
  </head>
  <body>
    <div id="root"></div>
    <script src="/app.bundle.js?v=20260515-session"></script>
  </body>
</html>`;

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
  if (url.pathname === "/app") {
    return textResponse(appLoaderHtml, "text/html;charset=UTF-8");
  }
  if (url.pathname === "/signup") {
    return Response.redirect(`${url.origin}/app`, 307);
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
