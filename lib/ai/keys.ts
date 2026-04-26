"use client";

import type { ProviderId } from "@/lib/ai/providers";

export type StoredProvider = { apiKey: string; model: string };
export type StoredKeys = Partial<Record<ProviderId, StoredProvider>> & {
  default?: ProviderId;
};

const STORAGE_KEY = "backprop.tutor.v1";

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
}

export function clearKeys(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
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
