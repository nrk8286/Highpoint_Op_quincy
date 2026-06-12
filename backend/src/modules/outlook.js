import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError, jsonResponse, readJson } from "../runtime.js";
import { assertCan } from "../policy.js";
import { repositories } from "../repositories.js";

const DEFAULT_SCOPES = "openid profile offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite";
const OUTLOOK_STATE_TTL_MS = 10 * 60 * 1000;

export async function startOutlookAuth(context) {
  assertCan(context.user, "read", "outlook");

  const clientId = context.env.OUTLOOK_CLIENT_ID || context.body.clientId || "";
  if (!clientId) throw new HttpError(400, "OUTLOOK_CLIENT_ID is required");
  const redirectUri = resolveRedirectUri(context, context.body.redirectUri);
  const scopes = resolveScopes(context.body.scopes || context.env.OUTLOOK_SCOPES || DEFAULT_SCOPES);
  const state = createSignedState(context, { redirectUri, scopes, staffId: context.user.id });

  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return jsonResponse({ authUrl: authUrl.toString(), state, scopes, redirectUri, requestId: context.requestId });
}

export async function completeOutlookAuth(context) {
  assertCan(context.user, "read", "outlook");

  const clientId = context.env.OUTLOOK_CLIENT_ID || context.body.clientId || "";
  const clientSecret = context.env.OUTLOOK_CLIENT_SECRET || "";
  const redirectUri = resolveRedirectUri(context, context.body.redirectUri);
  const code = context.body.code || "";
  const state = String(context.body.state || "");
  if (!clientId || !clientSecret) throw new HttpError(500, "Outlook client credentials are not configured");
  if (!redirectUri || !code) throw new HttpError(400, "code and redirectUri are required");
  verifySignedState(context, state, { redirectUri, staffId: context.user.id });

  const scopes = resolveScopes(context.body.scopes || context.env.OUTLOOK_SCOPES || DEFAULT_SCOPES);
  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id", clientId);
  tokenBody.set("client_secret", clientSecret);
  tokenBody.set("grant_type", "authorization_code");
  tokenBody.set("code", code);
  tokenBody.set("redirect_uri", redirectUri);
  tokenBody.set("scope", scopes);

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, "Microsoft token exchange failed", payload.error_description || payload.error);

  const profile = await getMicrosoftProfile(payload.access_token);
  const jwtProfile = decodeJwtProfile(payload.id_token);
  const accountEmail = profile.mail || profile.userPrincipalName || jwtProfile.email || jwtProfile.preferred_username || "";
  const storedTokenPayload = {
    access_token: payload.access_token || "",
    refresh_token: payload.refresh_token || "",
    id_token: payload.id_token || "",
    token_type: payload.token_type || "",
    scope: payload.scope || scopes,
    expires_in: Number(payload.expires_in || 0),
    ext_expires_in: Number(payload.ext_expires_in || 0),
    acquired_at: new Date().toISOString(),
    expires_at: payload.expires_in ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString() : "",
    profile: {
      id: profile.id || jwtProfile.oid || "",
      displayName: profile.displayName || jwtProfile.name || "",
      mail: accountEmail,
      userPrincipalName: profile.userPrincipalName || jwtProfile.preferred_username || "",
    },
  };

  await repositories(context).outlook.saveConnection({
    staffId: context.user.id,
    accountEmail,
    scopes,
    tokenPayload: storedTokenPayload,
  });

  return jsonResponse({
    ok: true,
    account: accountEmail || profile.displayName || jwtProfile.name || "Microsoft account",
    mail: accountEmail || "",
    profile: storedTokenPayload.profile,
    requestId: context.requestId,
  });
}

export async function getOutlookStatus(context) {
  assertCan(context.user, "read", "outlook");
  const row = await repositories(context).outlook.getConnection(context.user.id);
  if (!row || row.status !== "active") {
    return jsonResponse({ connected: false, connection: null, requestId: context.requestId });
  }

  const tokenPayload = safeParseJson(row.token_json, {});
  const profile = tokenPayload.profile || {};
  return jsonResponse({
    connected: true,
    connection: {
      status: row.status,
      account: row.account_email || profile.mail || profile.userPrincipalName || profile.displayName || "Microsoft account",
      accountEmail: row.account_email || profile.mail || profile.userPrincipalName || "",
      displayName: profile.displayName || "",
      scopes: String(row.scopes || "").split(/\s+/).filter(Boolean),
      connectedAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: tokenPayload.expires_at || "",
      mailboxStatus: tokenPayload.refresh_token ? "server_refresh_ready" : "connected",
    },
    requestId: context.requestId,
  });
}

export async function disconnectOutlook(context) {
  assertCan(context.user, "read", "outlook");
  await repositories(context).outlook.revokeConnection(context.user.id);
  return jsonResponse({ ok: true, disconnected: true, requestId: context.requestId });
}

export async function syncOutlookInbox(context) {
  assertCan(context.user, "read", "outlook");
  const accessToken = await getRefreshedToken(context);

  const response = await fetch("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$top=20&$select=id,subject,from,receivedDateTime,bodyPreview,importance", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, "Microsoft Graph sync failed", payload.error?.message);

  return jsonResponse({
    items: payload.value || [],
    requestId: context.requestId,
  });
}

export async function sendOutlookEmail(context) {
  assertCan(context.user, "update", "outlook");
  context.body = await readJson(context.request);
  const { to, subject, body } = context.body;
  if (!to || !subject || !body) throw new HttpError(400, "to, subject, and body are required");

  const accessToken = await getRefreshedToken(context);
  const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: "Text", content: body },
        toRecipients: [{ emailAddress: { address: to } }],
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new HttpError(502, "Microsoft Graph send failed", errorPayload.error?.message);
  }

  return jsonResponse({ ok: true, requestId: context.requestId });
}

async function getRefreshedToken(context) {
  const row = await repositories(context).outlook.getConnection(context.user.id);
  if (!row || row.status !== "active") throw new HttpError(401, "Outlook not connected");

  const tokenPayload = safeParseJson(row.token_json, {});
  const expiresAt = tokenPayload.expires_at ? new Date(tokenPayload.expires_at).getTime() : 0;
  if (expiresAt && expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokenPayload.access_token;
  }

  if (!tokenPayload.refresh_token) throw new HttpError(401, "Outlook connection needs reconnection (no refresh token)");

  const clientId = context.env.OUTLOOK_CLIENT_ID || "";
  const clientSecret = context.env.OUTLOOK_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) throw new HttpError(500, "Outlook credentials not configured for refresh");

  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id", clientId);
  tokenBody.set("client_secret", clientSecret);
  tokenBody.set("grant_type", "refresh_token");
  tokenBody.set("refresh_token", tokenPayload.refresh_token);

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    await repositories(context).outlook.saveConnection({
      staffId: context.user.id,
      accountEmail: row.account_email,
      scopes: row.scopes,
      tokenPayload,
      status: "failed",
    });
    throw new HttpError(401, "Microsoft session expired; please reconnect", payload.error_description || payload.error);
  }

  const newTokenPayload = {
    ...tokenPayload,
    access_token: payload.access_token || "",
    refresh_token: payload.refresh_token || tokenPayload.refresh_token,
    expires_in: Number(payload.expires_in || 0),
    acquired_at: new Date().toISOString(),
    expires_at: payload.expires_in ? new Date(Date.now() + Number(payload.expires_in) * 1000).toISOString() : "",
  };

  await repositories(context).outlook.saveConnection({
    staffId: context.user.id,
    accountEmail: row.account_email,
    scopes: row.scopes,
    tokenPayload: newTokenPayload,
  });

  return newTokenPayload.access_token;
}

function resolveRedirectUri(context, requestedRedirectUri) {
  const configured = context.env.OUTLOOK_REDIRECT_URI || `${context.env.APP_ORIGIN || "https://highpoints.work"}/app`;
  const candidate = String(requestedRedirectUri || configured);
  const configuredUrl = new URL(configured);
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new HttpError(400, "redirectUri must be an absolute URL");
  }

  if (parsed.origin !== configuredUrl.origin || parsed.pathname !== configuredUrl.pathname) {
    throw new HttpError(400, "redirectUri must match the configured Highpoints app URL");
  }
  return parsed.toString();
}

function resolveScopes(value) {
  const requested = String(value || DEFAULT_SCOPES).trim() || DEFAULT_SCOPES;
  const allowed = new Set(DEFAULT_SCOPES.split(/\s+/));
  const normalized = requested.split(/\s+/).filter(Boolean);
  const approved = normalized.filter((scope) => allowed.has(scope));
  if (approved.length === 0) return DEFAULT_SCOPES;
  return approved.join(" ");
}

function createSignedState(context, { redirectUri, scopes, staffId }) {
  const stateSecret = String(context.env.OUTLOOK_STATE_SECRET || context.env.OUTLOOK_CLIENT_SECRET || "");
  if (!stateSecret) {
    throw new HttpError(500, "Outlook state signing secret is not configured");
  }

  const payload = {
    staffId,
    redirectUri,
    scopes,
    nonce: crypto.randomUUID(),
    issuedAt: Date.now(),
  };
  const encoded = encodeBase64Url(JSON.stringify(payload));
  const signature = signState(stateSecret, encoded);
  return `${encoded}.${signature}`;
}

function verifySignedState(context, state, { redirectUri, staffId }) {
  if (!state || !state.includes(".")) throw new HttpError(400, "Outlook state is missing or invalid");
  const [encoded, signature] = state.split(".");
  const stateSecret = String(context.env.OUTLOOK_STATE_SECRET || context.env.OUTLOOK_CLIENT_SECRET || "");
  if (!stateSecret) throw new HttpError(500, "Outlook state signing secret is not configured");

  const expected = signState(stateSecret, encoded);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new HttpError(400, "Outlook state signature is invalid");
  }

  const payload = safeParseJson(decodeBase64Url(encoded), null);
  if (!payload) throw new HttpError(400, "Outlook state payload is invalid");
  if (payload.staffId !== staffId) throw new HttpError(403, "Outlook state does not belong to this staff user");
  if (payload.redirectUri !== redirectUri) throw new HttpError(400, "Outlook redirect mismatch");
  if (Date.now() - Number(payload.issuedAt || 0) > OUTLOOK_STATE_TTL_MS) {
    throw new HttpError(400, "Outlook sign-in expired; start again");
  }
}

function signState(secret, encodedPayload) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function encodeBase64Url(text) {
  return Buffer.from(text, "utf8").toString("base64url");
}

function decodeBase64Url(text) {
  return Buffer.from(text, "base64url").toString("utf8");
}

async function getMicrosoftProfile(accessToken) {
  if (!accessToken) return {};
  const response = await fetch("https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return {};
  return response.json().catch(() => ({}));
}

function decodeJwtProfile(idToken) {
  if (!idToken || !idToken.includes(".")) return {};
  const [, payload] = idToken.split(".");
  return safeParseJson(decodeBase64Url(payload), {});
}

function safeParseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
