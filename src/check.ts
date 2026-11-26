// Runs a full check: code checks, then the AI for the remaining rules.

import type { Env } from "./env";
import { judgeRules } from "./gemini";
import { checkRequiredFields, mergeResults, type Ticket, type ValidationResult } from "./validate";

export async function runValidation(env: Env, ticket: Ticket): Promise<ValidationResult> {
  const code = checkRequiredFields(ticket);
  if (code.aiRules.length === 0) {
    return mergeResults(ticket, code, { verdicts: [], model: null });
  }

  const ai = env.GOOGLE_AI_API_KEY
    ? await judgeRules(
        { apiKey: env.GOOGLE_AI_API_KEY, models: [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean) },
        ticket,
        code.aiRules,
      )
    : { error: "GOOGLE_AI_API_KEY is not set" };

  if ("error" in ai) console.error("AI check failed:", ai.error);
  return mergeResults(ticket, code, ai);
}
