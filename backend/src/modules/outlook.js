import { HttpError, jsonResponse } from "../runtime.js";
import { repositories } from "../repositories.js";

const DEFAULT_SCOPES = "openid profile offline_access User.Read Mail.Read Mail.Send Calendars.ReadWrite";

export async function startOutlookAuth(context) {
  const clientId = context.env.OUTLOOK_CLIENT_ID || context.body.clientId || "";
  if (!clientId) throw new HttpError(400, "OUTLOOK_CLIENT_ID is required");
  const redirectUri = context.body.redirectUri || context.env.OUTLOOK_REDIRECT_URI;
  if (!redirectUri) throw new HttpError(400, "redirectUri is required");

  const state = context.body.state || `hp-outlook-${crypto.randomUUID()}`;
  const scopes = context.body.scopes || DEFAULT_SCOPES;
  const authUrl = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_mode", "query");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "select_account");

  return jsonResponse({ authUrl: authUrl.toString(), state, scopes, requestId: context.requestId });
}

export async function completeOutlookAuth(context) {
  const clientId = context.env.OUTLOOK_CLIENT_ID || context.body.clientId || "";
  const clientSecret = context.env.OUTLOOK_CLIENT_SECRET || "";
  const redirectUri = context.body.redirectUri || context.env.OUTLOOK_REDIRECT_URI;
  const code = context.body.code || "";
  if (!clientId || !clientSecret) throw new HttpError(500, "Outlook client credentials are not configured");
  if (!redirectUri || !code) throw new HttpError(400, "code and redirectUri are required");

  const tokenBody = new URLSearchParams();
  tokenBody.set("client_id", clientId);
  tokenBody.set("client_secret", clientSecret);
  tokenBody.set("grant_type", "authorization_code");
  tokenBody.set("code", code);
  tokenBody.set("redirect_uri", redirectUri);
  tokenBody.set("scope", context.body.scopes || DEFAULT_SCOPES);

  const response = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, "Microsoft token exchange failed", payload.error_description || payload.error);

  await repositories(context).outlook.saveConnection({
    staffId: context.user.id,
    accountEmail: payload.id_token ? "" : "",
    scopes: context.body.scopes || DEFAULT_SCOPES,
    tokenPayload: payload,
  });

  return jsonResponse({ ok: true, account: "Microsoft account", requestId: context.requestId });
}
