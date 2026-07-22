const NEXT_APP_ORIGIN = "https://highpoint-next.pages.dev";
const AUTH_PATCH_VERSION = "20260719-1";
const LOGIN_POLISH_VERSION = "20260722-1";

// The deployed Next app combines the profile read and the best-effort
// lastLoginAt write in one try/catch. Hardened Firestore rules may correctly
// reject that metadata write; the unpatched bundle then treats the existing
// profile as missing and signs the user straight back out.
const LAST_LOGIN_WRITE = /return await \(0,([A-Za-z_$][\w$]*)\.BN\)\(([A-Za-z_$][\w$]*),\{lastLoginAt:\(0,\1\.O5\)\(\)\},\{merge:!0\}\),\{uid:/g;
const NEXT_JAVASCRIPT_URL = /((?:src|href)=")(\/_next\/[^"?]+\.js)(?:\?[^"#]*)?(#[^"]*)?(")/g;
const LOGIN_POLISH_MARKER = `data-highpoints-login-polish="${LOGIN_POLISH_VERSION}"`;
const LOGIN_POLISH_STYLE = `<style ${LOGIN_POLISH_MARKER}>
html {
  color-scheme: dark;
  background: #070708;
}
body > div[class~="min-h-screen"] {
  isolation: isolate;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(circle at 18% 16%, rgba(245, 158, 11, 0.15), transparent 32rem),
    radial-gradient(circle at 82% 82%, rgba(180, 83, 9, 0.1), transparent 30rem),
    linear-gradient(145deg, #111114 0%, #08080a 52%, #030304 100%);
}
body > div[class~="min-h-screen"]::before,
body > div[class~="min-h-screen"]::after {
  content: "";
  pointer-events: none;
  position: absolute;
}
body > div[class~="min-h-screen"]::before {
  inset: -45%;
  background: conic-gradient(from 215deg at 50% 50%, transparent 0 38%, rgba(251, 191, 36, 0.08) 46%, transparent 55% 100%);
  filter: blur(24px);
}
body > div[class~="min-h-screen"]::after {
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at center, black, transparent 78%);
}
body > div[class~="min-h-screen"] > div[class~="max-w-md"] {
  position: relative;
  z-index: 1;
}
body div[class~="bg-neutral-900"] {
  background: linear-gradient(145deg, rgba(31, 31, 35, 0.94), rgba(15, 15, 18, 0.9));
  border-color: rgba(245, 158, 11, 0.2);
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.56), 0 0 0 1px rgba(255, 255, 255, 0.025) inset;
  backdrop-filter: blur(18px) saturate(120%);
}
body form input,
body form button {
  transition-duration: 180ms;
}
body form input:focus-visible,
body form button:focus-visible {
  outline: 2px solid rgba(251, 191, 36, 0.75);
  outline-offset: 3px;
}
@media (prefers-reduced-motion: no-preference) {
  body > div[class~="min-h-screen"]::before {
    animation: hp-login-aura 18s ease-in-out infinite alternate;
  }
  body > div[class~="min-h-screen"] > div[class~="max-w-md"] {
    animation: hp-login-arrive 640ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}
@media (forced-colors: active) {
  body > div[class~="min-h-screen"]::before,
  body > div[class~="min-h-screen"]::after {
    display: none;
  }
}
@keyframes hp-login-aura {
  from { opacity: 0.62; transform: translate3d(-2%, -1%, 0) rotate(-3deg) scale(0.98); }
  to { opacity: 1; transform: translate3d(2%, 1%, 0) rotate(3deg) scale(1.04); }
}
@keyframes hp-login-arrive {
  from { opacity: 0; transform: translate3d(0, 18px, 0) scale(0.985); }
  to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
}
</style>`;

export function isNextAppAsset(url) {
  return url.pathname.startsWith("/_next/");
}

export function isNextAppLoginPage(url) {
  return url.pathname === "/login" || url.pathname === "/next/login";
}

export function patchNextLoginPage(source) {
  let patches = 0;
  const cacheBustedBody = source.replace(NEXT_JAVASCRIPT_URL, (_, prefix, assetPath, hash = "", suffix) => {
    patches += 1;
    return `${prefix}${assetPath}?hp_auth_patch=${AUTH_PATCH_VERSION}${hash}${suffix}`;
  });
  const hasPolish = cacheBustedBody.includes(LOGIN_POLISH_MARKER);
  const canInjectPolish = cacheBustedBody.includes("</head>");
  const body = hasPolish || !canInjectPolish
    ? cacheBustedBody
    : cacheBustedBody.replace("</head>", `${LOGIN_POLISH_STYLE}</head>`);
  return { body, patches, polished: hasPolish || canInjectPolish };
}

export function patchNextAuthBundle(source) {
  let patches = 0;
  const body = source.replace(LAST_LOGIN_WRITE, (_, firestoreModule, profileRef) => {
    patches += 1;
    return `return await (0,${firestoreModule}.BN)(${profileRef},{lastLoginAt:(0,${firestoreModule}.O5)()},{merge:!0}).catch(error=>console.warn("Last-login timestamp update skipped:",error?.code||"denied")),{uid:`;
  });
  return { body, patches };
}

export async function proxyNextAppAsset(context) {
  const targetUrl = new URL(context.request.url);
  targetUrl.hostname = new URL(NEXT_APP_ORIGIN).hostname;
  targetUrl.protocol = "https:";

  const upstream = await fetch(new Request(targetUrl.toString(), context.request));
  const contentType = upstream.headers.get("content-type") || "";
  if (context.method === "HEAD" || !contentType.includes("javascript")) {
    return upstream;
  }

  const source = await upstream.text();
  const patched = patchNextAuthBundle(source);
  if (patched.patches === 0) {
    return new Response(source, upstream);
  }

  const headers = new Headers(upstream.headers);
  headers.delete("content-length");
  headers.delete("etag");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("x-highpoints-auth-fix", "last-login-write-best-effort");
  return new Response(patched.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

export async function proxyNextAppLoginPage(context) {
  if (context.url.pathname === "/next/login") {
    const loginUrl = new URL(context.request.url);
    loginUrl.pathname = "/login";
    return new Response(null, {
      status: 307,
      headers: {
        "cache-control": "no-store, max-age=0",
        location: loginUrl.toString(),
        "x-highpoints-auth-fix": `legacy-login-redirect-${AUTH_PATCH_VERSION}`,
      },
    });
  }

  const targetUrl = new URL(context.request.url);
  targetUrl.hostname = new URL(NEXT_APP_ORIGIN).hostname;
  targetUrl.protocol = "https:";

  const upstream = await fetch(new Request(targetUrl.toString(), context.request));
  const contentType = upstream.headers.get("content-type") || "";
  const headers = new Headers(upstream.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("etag");
  headers.set("cache-control", "no-store, max-age=0");
  headers.set("clear-site-data", '"cache"');
  headers.set("x-highpoints-auth-fix", `fresh-login-bundle-${AUTH_PATCH_VERSION}`);

  if (context.method === "HEAD" || !contentType.includes("text/html")) {
    return new Response(context.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  }

  const source = await upstream.text();
  const patched = patchNextLoginPage(source);
  if (patched.polished) {
    headers.set("x-highpoints-login-polish", LOGIN_POLISH_VERSION);
  }
  return new Response(patched.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
