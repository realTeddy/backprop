import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ProviderId = "openai" | "anthropic" | "google";

export type TutorModelChoice = {
  provider: ProviderId;
  model: string;
  apiKey: string;
};

/**
 * Catalog the providers and the model ids the user can pick from. Kept
 * intentionally short — the goal is the cheapest and the most-capable
 * option for each provider, not exhaustive coverage.
 */
export const PROVIDER_CATALOG: Record<
  ProviderId,
  { label: string; models: { id: string; label: string }[] }
> = {
  openai: {
    label: "OpenAI",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "gpt-4o-mini", label: "GPT-4o mini" },
    ],
  },
  anthropic: {
    label: "Anthropic",
    models: [
      { id: "claude-opus-4-7", label: "Claude Opus 4.7" },
      { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
      { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
    ],
  },
  google: {
    label: "Google",
    models: [
      { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
    ],
  },
};

export function resolveModel(choice: TutorModelChoice): LanguageModel {
  switch (choice.provider) {
    case "openai": {
      const openai = createOpenAI({ apiKey: choice.apiKey });
      return openai.chat(choice.model);
    }
    case "anthropic": {
      const anthropic = createAnthropic({ apiKey: choice.apiKey });
      return anthropic(choice.model);
    }
    case "google": {
      const google = createGoogleGenerativeAI({ apiKey: choice.apiKey });
      return google(choice.model);
    }
  }
}
