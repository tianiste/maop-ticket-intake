// Worker entry: POST /validate checks a ticket against the department's rules.

import { judgeRules } from "./gemini";
import { isDepartment } from "./rules";
import { checkRequiredFields, mergeResults, normalizeFields, type Ticket } from "./validate";

export interface Env {
  GOOGLE_AI_API_KEY?: string;
  GEMINI_MODEL: string;
  GEMINI_FALLBACK_MODEL: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function readTicket(request: Request): Promise<Ticket | string> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return "Body must be JSON.";
  }
  if (typeof body !== "object" || body === null) return "Body must be a JSON object.";
  const { department, fields } = body as { department?: unknown; fields?: unknown };
  if (!isDepartment(department)) return 'department must be "it" or "engineering".';
  if (typeof fields !== "object" || fields === null || Array.isArray(fields)) return "fields must be an object.";
  return { department, fields: normalizeFields(department, fields as Record<string, unknown>) };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/validate") return json({ error: "Not found." }, 404);
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);

    const ticket = await readTicket(request);
    if (typeof ticket === "string") return json({ error: ticket }, 400);

    const code = checkRequiredFields(ticket);
    if (code.aiRules.length === 0) {
      return json(mergeResults(ticket, code, { verdicts: [], model: null }));
    }

    const ai = env.GOOGLE_AI_API_KEY
      ? await judgeRules(
          { apiKey: env.GOOGLE_AI_API_KEY, models: [env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODEL].filter(Boolean) },
          ticket,
          code.aiRules,
        )
      : { error: "GOOGLE_AI_API_KEY is not set" };

    if ("error" in ai) console.error("AI check failed:", ai.error);
    return json(mergeResults(ticket, code, ai));
  },
} satisfies ExportedHandler<Env>;
