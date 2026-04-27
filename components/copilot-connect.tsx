"use client";

import { useEffect, useRef, useState } from "react";
import { COPILOT_MODELS } from "@/lib/ai/copilot";
import { beginPollingLifecycle } from "@/lib/ai/copilot-polling";
import { loadKeys, onKeysChange, saveKeys } from "@/lib/ai/keys";

type DeviceFlow = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  interval: number;
};

type Status =
  | "idle"
  | "starting"
  | "awaiting"
  | "polling"
  | "connected"
  | "error";

type Model = { id: string; label: string };

export function CopilotConnect() {
  const [status, setStatus] = useState<Status>("idle");
  const [flow, setFlow] = useState<DeviceFlow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [model, setModel] = useState(COPILOT_MODELS[0]!.id);
  const [models, setModels] = useState<Model[]>(COPILOT_MODELS);
  const [isDefault, setIsDefault] = useState(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    const stopPolling = beginPollingLifecycle(cancelRef);
    const sync = () => {
      const keys = loadKeys();
      setHasToken(!!keys.copilot?.apiKey);
      setToken(keys.copilot?.apiKey ?? null);
      if (keys.copilot?.model) setModel(keys.copilot.model);
      setIsDefault(keys.default === "copilot");
    };
    sync();
    const unsubscribe = onKeysChange(sync);
    return () => {
      stopPolling();
      unsubscribe();
    };
  }, []);

  // Refresh the model list whenever we have a token. Falls back to the
  // hardcoded COPILOT_MODELS if the API call fails.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetch("/api/copilot/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ githubAccessToken: token }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json: { models?: Model[] }) => {
        if (cancelled || !json.models?.length) return;
        setModels(json.models);
        // If the saved model isn't in the live list, snap to the first one.
        if (!json.models.find((m) => m.id === model)) {
          const next = json.models[0]!.id;
          setModel(next);
          const keys = loadKeys();
          if (keys.copilot) {
            keys.copilot.model = next;
            saveKeys(keys);
          }
        }
      })
      .catch(() => {
        // Stick with the hardcoded fallback list; not fatal.
      });
    return () => {
      cancelled = true;
    };
  }, [token, model]);

  async function start() {
    setStatus("starting");
    setError(null);
    const res = await fetch("/api/copilot/device-start", { method: "POST" });
    if (!res.ok) {
      setStatus("error");
      setError(`Could not start device flow: HTTP ${res.status}`);
      return;
    }
    const f = (await res.json()) as DeviceFlow;
    setFlow(f);
    setStatus("awaiting");
    void poll(f);
  }

  async function poll(f: DeviceFlow) {
    setStatus("polling");
    let interval = Math.max(2, f.interval);
    while (!cancelRef.current) {
      await new Promise((r) => setTimeout(r, interval * 1000));
      const res = await fetch("/api/copilot/device-poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: f.device_code }),
      });
      const body = (await res.json()) as
        | { kind: "pending" }
        | { kind: "slow_down"; interval: number }
        | { kind: "ok"; access_token: string }
        | { kind: "error"; error: string };
      if (body.kind === "ok") {
        const keys = loadKeys();
        keys.copilot = { apiKey: body.access_token, model };
        // Auto-set Copilot as the default if no provider is currently the
        // default — otherwise the /learn page would show "no API key
        // configured" even though Copilot is connected.
        if (!keys.default) {
          keys.default = "copilot";
          setIsDefault(true);
        }
        saveKeys(keys);
        setToken(body.access_token);
        setHasToken(true);
        setStatus("connected");
        setFlow(null);
        return;
      }
      if (body.kind === "slow_down") interval = body.interval;
      if (body.kind === "error") {
        setStatus("error");
        setError(body.error);
        return;
      }
    }
  }

  function disconnect() {
    const keys = loadKeys();
    delete keys.copilot;
    if (keys.default === "copilot") delete keys.default;
    saveKeys(keys);
    setHasToken(false);
    setToken(null);
    setIsDefault(false);
    setStatus("idle");
  }

  function setModelAndPersist(next: string) {
    setModel(next);
    const keys = loadKeys();
    if (keys.copilot) {
      keys.copilot.model = next;
      saveKeys(keys);
    }
  }

  function setDefault() {
    const keys = loadKeys();
    keys.default = "copilot";
    saveKeys(keys);
    setIsDefault(true);
  }

  return (
    <section className="rounded-lg border border-neutral-300 p-5 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">GitHub Copilot</h2>
        <div className="flex items-center gap-3">
          {hasToken && (
            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
              <input
                type="radio"
                name="default-provider"
                checked={isDefault}
                onChange={setDefault}
              />
              Default
            </label>
          )}
          <span className="text-xs text-neutral-500">Owner-only</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
        Connects via GitHub&apos;s OAuth device flow. The access token is
        stored in this browser&apos;s <code>localStorage</code>; the server
        exchanges it for a short-lived Copilot session token on each request.
      </p>

      {hasToken ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
            Model
            <select
              value={model}
              onChange={(e) => setModelAndPersist(e.target.value)}
              className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={disconnect}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {flow && (
            <div className="rounded-md bg-neutral-100 p-3 text-sm dark:bg-neutral-900">
              <p>
                Open{" "}
                <a
                  href={flow.verification_uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {flow.verification_uri}
                </a>{" "}
                and enter:
              </p>
              <p className="mt-1 font-mono text-lg tracking-widest">
                {flow.user_code}
              </p>
            </div>
          )}
          {error && (
            <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={start}
            disabled={
              status === "starting" ||
              status === "awaiting" ||
              status === "polling"
            }
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {status === "polling" || status === "awaiting"
              ? "Waiting for authorization…"
              : status === "starting"
                ? "Starting…"
                : "Connect Copilot"}
          </button>
        </div>
      )}
    </section>
  );
}
