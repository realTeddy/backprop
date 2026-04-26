"use client";

import type { ProviderId } from "@/lib/ai/providers";

export type StoredProvider = { apiKey: string; model: string };
export type StoredKeys = Partial<Record<ProviderId, StoredProvider>> & {
  default?: ProviderId;
};

const STORAGE_KEY = "backprop.tutor.v1";
const CHANGE_EVENT = "backprop:keys-changed";

export function loadKeys(): StoredKeys {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as StoredKeys;
  } catch {
    return {};
  }
}

export function saveKeys(keys: StoredKeys): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function clearKeys(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Subscribe to in-tab keys-store changes (e.g. CopilotConnect updating the
 * default while the parent SettingsPage is mounted). Cross-tab updates are
 * also delivered via the native `storage` event.
 */
export function onKeysChange(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onCustom = () => handler();
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener(CHANGE_EVENT, onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

export function activeChoice(keys: StoredKeys): {
  provider: ProviderId;
  model: string;
  apiKey: string;
} | null {
  const provider = keys.default;
  if (!provider) return null;
  const stored = keys[provider];
  if (!stored?.apiKey || !stored?.model) return null;
  return { provider, model: stored.model, apiKey: stored.apiKey };
}
