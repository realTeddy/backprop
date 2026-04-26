"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PROVIDER_CATALOG,
  type ProviderId,
} from "@/lib/ai/providers";
import {
  clearKeys,
  loadKeys,
  onKeysChange,
  saveKeys,
  type StoredKeys,
} from "@/lib/ai/keys";
import { CopilotConnect } from "@/components/copilot-connect";

const PROVIDERS: ProviderId[] = ["openai", "anthropic", "google"];

export default function SettingsPage() {
  const [keys, setKeys] = useState<StoredKeys>({});
  const [hydrated, setHydrated] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    setKeys(loadKeys());
    setHydrated(true);
    void fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { isOwner?: boolean } | null) => {
        if (j?.isOwner) setIsOwner(true);
      });
    return onKeysChange(() => setKeys(loadKeys()));
  }, []);

  // Re-read localStorage and merge before each write so changes from sibling
  // components (e.g. CopilotConnect) aren't clobbered. Then write through
  // immediately — no batched Save button.
  function mutate(fn: (current: StoredKeys) => StoredKeys) {
    setKeys((prev) => {
      const fresh = loadKeys();
      const next = fn({ ...fresh, ...prev });
      saveKeys(next);
      return next;
    });
  }

  function update(
    provider: ProviderId,
    patch: Partial<{ apiKey: string; model: string }>,
  ) {
    mutate((current) => {
      const existing = current[provider] ?? {
        apiKey: "",
        model: PROVIDER_CATALOG[provider].models[0]!.id,
      };
      return { ...current, [provider]: { ...existing, ...patch } };
    });
  }

  function setDefault(provider: ProviderId) {
    mutate((current) => ({ ...current, default: provider }));
  }

  function clearAll() {
    if (!confirm("Clear all stored API keys from this device?")) return;
    clearKeys();
    setKeys({});
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          API keys live in this browser&apos;s <code>localStorage</code> only.
          Changes save automatically. Keys are sent with each tutor request
          to a thin proxy and never stored on the server.
        </p>
        <p className="text-sm">
          <Link href="/settings/data" className="underline">
            Export or delete your data →
          </Link>
        </p>
      </header>

      {!hydrated ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          {PROVIDERS.map((p) => (
            <ProviderCard
              key={p}
              provider={p}
              value={keys[p]}
              isDefault={keys.default === p}
              onChange={(patch) => update(p, patch)}
              onSetDefault={() => setDefault(p)}
            />
          ))}

          {isOwner && <CopilotConnect />}

          <div className="pt-4">
            <button
              type="button"
              onClick={clearAll}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProviderCard(props: {
  provider: ProviderId;
  value: { apiKey: string; model: string } | undefined;
  isDefault: boolean;
  onChange: (patch: Partial<{ apiKey: string; model: string }>) => void;
  onSetDefault: () => void;
}) {
  const { provider, value, isDefault, onChange, onSetDefault } = props;
  const catalog = PROVIDER_CATALOG[provider];
  const apiKey = value?.apiKey ?? "";
  const model = value?.model ?? catalog.models[0]!.id;

  return (
    <section className="rounded-lg border border-neutral-300 p-5 dark:border-neutral-700">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{catalog.label}</h2>
        <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
          <input
            type="radio"
            name="default-provider"
            checked={isDefault}
            onChange={onSetDefault}
          />
          Default
        </label>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
          API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            placeholder={`${provider} API key`}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm font-mono dark:border-neutral-700 dark:bg-neutral-900"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-neutral-600 dark:text-neutral-400">
          Model
          <select
            value={model}
            onChange={(e) => onChange({ model: e.target.value })}
            className="rounded border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {catalog.models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
