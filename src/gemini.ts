// Gemini API access. Model choice and timeouts: see FINDINGS.md (2026-11-26).

import type { Rule } from "./rules";
import { buildSystemPrompt, buildUserPrompt, parseVerdicts, responseSchema, type AiVerdict, type Ticket } from "./validate";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const TIMEOUT_MS = 10_000;

export interface GeminiConfig {
  apiKey: string;
  models: string[];
}

async function callModel(model: string, apiKey: string, ticket: Ticket, rules: Rule[]): Promise<AiVerdict[]> {
  const response = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
      contents: [{ role: "user", parts: [{ text: buildUserPrompt(ticket, rules) }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: responseSchema(rules),
      },
    }),
  });

  if (!response.ok) {
    // Only the status goes into the error; the body could echo request details.
    throw new Error(`${model}: HTTP ${response.status}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
  if (!text) throw new Error(`${model}: empty response`);
  try {
    return parseVerdicts(text, rules);
  } catch (err) {
    throw new Error(`${model}: ${(err as Error).message}`);
  }
}

/** Tries each model in order; returns the first valid answer. */
export async function judgeRules(
  config: GeminiConfig,
  ticket: Ticket,
  rules: Rule[],
): Promise<{ verdicts: AiVerdict[]; model: string } | { error: string }> {
  const errors: string[] = [];
  for (const model of config.models) {
    try {
      return { verdicts: await callModel(model, config.apiKey, ticket, rules), model };
    } catch (err) {
      const message = err instanceof Error && err.name === "TimeoutError" ? `${model}: timeout` : (err as Error).message;
      errors.push(message);
    }
  }
  return { error: errors.join("; ") || "no model configured" };
}
