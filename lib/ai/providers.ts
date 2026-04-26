import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { COPILOT_MODELS, resolveCopilotModel } from "./copilot";

export type ProviderId = "openai" | "anthropic" | "google" | "copilot";

export type TutorModelChoice = {
  provider: ProviderId;
  model: string;
  apiKey: string;
};

/**
 * Catalog the providers and the model ids the user can pick from. Edit
 * this file to add or remove models as the providers ship new ones — the
 * tutor route validates the chosen model id against this catalog before
 * forwarding the request.
 */
export const PROVIDER_CATALOG: Record<
  ProviderId,
  { label: string; models: { id: string; label: string }[] }
> = {
  openai: {
    label: "OpenAI",
    models: [
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 mini" },
      { id: "gpt-4.1", label: "GPT-4.1" },
      { id: "o3", label: "o3 (reasoning)" },
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
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  copilot: {
    label: "GitHub Copilot (owner-only)",
    models: COPILOT_MODELS,
  },
};

export async function resolveModel(
  choice: TutorModelChoice,
): Promise<LanguageModel> {
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
    case "copilot": {
      // For Copilot, `apiKey` is the GitHub access token from the device
      // flow. The Copilot adapter exchanges it for a session token.
      return resolveCopilotModel({
        githubAccessToken: choice.apiKey,
        model: choice.model,
      });
    }
  }
}
