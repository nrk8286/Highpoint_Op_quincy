const NEXT_APP_ORIGIN = "https://highpoint-next.pages.dev";

// The deployed Next app combines the profile read and the best-effort
// lastLoginAt write in one try/catch. Hardened Firestore rules may correctly
// reject that metadata write; the unpatched bundle then treats the existing
// profile as missing and signs the user straight back out.
const LAST_LOGIN_WRITE = /return await \(0,([A-Za-z_$][\w$]*)\.BN\)\(([A-Za-z_$][\w$]*),\{lastLoginAt:\(0,\1\.O5\)\(\)\},\{merge:!0\}\),\{uid:/g;

export function isNextAppAsset(url) {
  return url.pathname.startsWith("/_next/");
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
