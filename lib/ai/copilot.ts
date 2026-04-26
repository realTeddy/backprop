/**
 * Owner-only GitHub Copilot adapter.
 *
 * GitHub Copilot does not have a publicly supported chat-completions API.
 * The flow used here is the same one VS Code, Neovim copilot.lua, and
 * tools like OpenCode use:
 *
 *   1. GitHub OAuth device-code flow with a Copilot-capable client id
 *      yields a long-lived `access_token` ("github access token" below).
 *   2. That token is exchanged at
 *      https://api.github.com/copilot_internal/v2/token for a short-lived
 *      ("session") token used to call the chat endpoint. Session tokens
 *      expire after ~30 minutes; we re-exchange whenever the cached one
 *      is within 60 seconds of `expires_at`.
 *   3. Chat completion requests go to https://api.githubcopilot.com with
 *      the session token plus a small set of "editor" headers Copilot
 *      requires.
 *
 * This is gated server-side to a single owner email (OWNER_EMAIL env var)
 * because using Copilot outside of GitHub's officially supported clients
 * is at the operator's discretion.
 *
 * The CLIENT_ID below is the public VS Code Copilot client id documented
 * in multiple open-source Copilot adapters. Verify against the latest
 * VS Code source if the device flow ever returns "incorrect_client".
 */

import { createOpenAI } from "@ai-sdk/openai";

export const COPILOT_CLIENT_ID = "Iv1.b507a08c87ecfe98";

const DEVICE_CODE_URL = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const SESSION_TOKEN_URL = "https://api.github.com/copilot_internal/v2/token";
const COPILOT_BASE_URL = "https://api.githubcopilot.com";

const EDITOR_HEADERS = {
  "Editor-Version": "vscode/1.99.0",
  "Editor-Plugin-Version": "copilot-chat/0.21.0",
  "User-Agent": "GitHubCopilotChat/0.21.0",
  "Copilot-Integration-Id": "vscode-chat",
};

export type DeviceStartResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

export async function startDeviceFlow(): Promise<DeviceStartResponse> {
  const res = await fetch(DEVICE_CODE_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: COPILOT_CLIENT_ID,
      scope: "read:user",
    }),
  });
  if (!res.ok) throw new Error(`device-code failed: ${res.status}`);
  return res.json();
}

export type DevicePollResponse =
  | { kind: "pending" }
  | { kind: "slow_down"; interval: number }
  | { kind: "ok"; access_token: string }
  | { kind: "error"; error: string };

export async function pollDeviceFlow(
  device_code: string,
): Promise<DevicePollResponse> {
  const res = await fetch(ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: COPILOT_CLIENT_ID,
      device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    }),
  });
  const json = (await res.json()) as Record<string, string>;
  if (json.access_token) return { kind: "ok", access_token: json.access_token };
  if (json.error === "authorization_pending") return { kind: "pending" };
  if (json.error === "slow_down") {
    return { kind: "slow_down", interval: Number(json.interval ?? 5) };
  }
  return { kind: "error", error: json.error ?? "unknown" };
}

export type SessionToken = {
  token: string;
  expires_at: number; // unix seconds
};

const sessionCache = new Map<string, SessionToken>();

export async function getSessionToken(
  githubAccessToken: string,
): Promise<SessionToken> {
  const cached = sessionCache.get(githubAccessToken);
  const nowSec = Math.floor(Date.now() / 1000);
  if (cached && cached.expires_at - nowSec > 60) return cached;

  const res = await fetch(SESSION_TOKEN_URL, {
    headers: {
      Authorization: `token ${githubAccessToken}`,
      Accept: "application/json",
      ...EDITOR_HEADERS,
    },
  });
  if (!res.ok) {
    throw new Error(`copilot session-token exchange failed: ${res.status}`);
  }
  const json = (await res.json()) as { token: string; expires_at: number };
  const session: SessionToken = {
    token: json.token,
    expires_at: json.expires_at,
  };
  sessionCache.set(githubAccessToken, session);
  return session;
}

/**
 * Build a Vercel-AI-SDK-compatible LanguageModel that talks to Copilot's
 * OpenAI-shaped chat endpoint.
 */
export async function resolveCopilotModel(args: {
  githubAccessToken: string;
  model: string;
}) {
  const session = await getSessionToken(args.githubAccessToken);
  const provider = createOpenAI({
    apiKey: session.token,
    baseURL: COPILOT_BASE_URL,
    headers: EDITOR_HEADERS,
  });
  return provider.chat(args.model);
}

/**
 * Static fallback list. Copilot's set of available models changes on
 * GitHub's schedule; the live list is fetched via listCopilotModels().
 * The catalog only matters as a fallback if that fetch fails.
 */
export const COPILOT_MODELS: { id: string; label: string }[] = [
  { id: "gpt-5", label: "GPT-5 (via Copilot)" },
  { id: "claude-sonnet-4.5", label: "Claude Sonnet 4.5 (via Copilot)" },
];

type CopilotModelInfo = {
  id: string;
  name?: string;
  vendor?: string;
  capabilities?: { type?: string };
  model_picker_enabled?: boolean;
};

/**
 * Live model list from `https://api.githubcopilot.com/models`. Filters to
 * chat-capable models that Copilot's own picker exposes, so the dropdown
 * matches what you'd see in VS Code.
 */
export async function listCopilotModels(
  githubAccessToken: string,
): Promise<{ id: string; label: string }[]> {
  const session = await getSessionToken(githubAccessToken);
  const res = await fetch(`${COPILOT_BASE_URL}/models`, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      Accept: "application/json",
      ...EDITOR_HEADERS,
    },
  });
  if (!res.ok) {
    throw new Error(`copilot /models failed: ${res.status}`);
  }
  const json = (await res.json()) as { data?: CopilotModelInfo[] };
  const data = json.data ?? [];
  return data
    .filter((m) => m.capabilities?.type !== "embeddings")
    .filter((m) => m.model_picker_enabled !== false)
    .map((m) => ({
      id: m.id,
      label: m.name
        ? `${m.name}${m.vendor ? ` (${m.vendor})` : ""}`
        : m.id,
    }));
}
